import "server-only";

import { one, all, run, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { encrypt, decrypt, hint, canStoreSecrets } from "@/lib/secrets";
import { providerFor } from "@/lib/providers";

export interface Connection {
  service: string;
  kind: string;
  account: string;
  hint: string;
  verifiedAt: number;
}

/**
 * Saves a credential only after proving it works.
 *
 * Verification is not decoration: a token that is wrong, expired or missing a
 * scope would otherwise sit there looking connected until the first real
 * request failed, somewhere far from the point of the mistake.
 */
export async function connectService(
  service: string,
  secret: string,
): Promise<{ ok: boolean; account?: string; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No identity." };

  const value = secret.trim();
  if (!value) return { ok: false, error: "Paste the credential first." };

  const provider = providerFor(service);
  if (provider.kind === "oauth" || !provider.verify) {
    return {
      ok: false,
      error:
        "This service needs an OAuth app registered with the provider. Only its account owner can create those credentials.",
    };
  }

  if (!canStoreSecrets()) {
    return {
      ok: false,
      error:
        "TROVE_SECRET is not set, so credentials cannot be encrypted. Generate one with: openssl rand -base64 32",
    };
  }

  let result;
  try {
    result = await provider.verify(value);
  } catch {
    return { ok: false, error: "Could not reach that service. Try again." };
  }
  if (!result.ok) return { ok: false, error: result.error ?? "That credential was rejected." };

  await run(
    `INSERT INTO connections (user_id, service, kind, secret, account, hint, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, service) DO UPDATE SET
       kind = excluded.kind,
       secret = excluded.secret,
       account = excluded.account,
       hint = excluded.hint,
       verified_at = excluded.verified_at`,
    [
      user.id,
      service,
      provider.kind,
      encrypt(value),
      result.account ?? "",
      hint(value),
      Date.now(),
    ],
  );

  return { ok: true, account: result.account };
}

export async function disconnectService(service: string): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  await run(`DELETE FROM connections WHERE user_id = ? AND service = ?`, [
    user.id,
    service,
  ]);
}

/** What the UI shows. Never includes the secret itself. */
export async function listConnections(): Promise<Connection[]> {
  const user = await currentUser();
  if (!user) return [];

  const rows = await all(
    `SELECT service, kind, account, hint, verified_at FROM connections WHERE user_id = ?`,
    [user.id],
  );

  return rows.map((r) => ({
    service: str(r.service),
    kind: str(r.kind),
    account: str(r.account),
    hint: str(r.hint),
    verifiedAt: num(r.verified_at),
  }));
}

/**
 * The decrypted credential, for code that is about to call the third party.
 *
 * Server-only and never returned to a component — the moment a token reaches
 * the browser it is effectively public.
 */
export async function secretFor(service: string): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const row = await one(
    `SELECT secret FROM connections WHERE user_id = ? AND service = ?`,
    [user.id, service],
  );
  if (!row) return null;

  return decrypt(str(row.secret));
}
