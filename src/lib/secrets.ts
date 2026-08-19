import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Encryption for third-party credentials at rest.
 *
 * Connecting an integration means the user hands over a GitHub token or a
 * Slack webhook — credentials to THEIR accounts, which can push code or post
 * messages. Those must not sit in the database as plaintext, where any backup,
 * log dump or read-only leak exposes them.
 *
 * AES-256-GCM: authenticated, so a tampered ciphertext fails to decrypt rather
 * than silently returning wrong bytes.
 */

const ALGO = "aes-256-gcm";

/** Missing secret is fatal by design — see encrypt(). */
function keyFor(): Buffer | null {
  // CAIRN_SECRET is still honoured so an existing deployment keeps working
  // through the rename; set TROVE_SECRET and the old name can go.
  const raw = (process.env.TROVE_SECRET ?? process.env.CAIRN_SECRET)?.trim();
  if (!raw || raw.length < 16) return null;
  // Fixed salt: the secret is already high-entropy and the salt only needs to
  // be stable so the same secret always derives the same key.
  //
  // It keeps the old product name deliberately. The salt is an input to the
  // key, so renaming it would derive a different key and every credential
  // already stored would decrypt to nothing — a silent, unrecoverable loss.
  return scryptSync(raw, "cairn.connections.v1", 32);
}

export function canStoreSecrets(): boolean {
  return keyFor() !== null;
}

/**
 * Returns `iv:tag:ciphertext`, all base64.
 *
 * Throws when TROVE_SECRET is unset rather than falling back to plaintext.
 * Refusing to store a credential is recoverable; storing it unprotected is
 * not, and the user would never know it happened.
 */
export function encrypt(plain: string): string {
  const key = keyFor();
  if (!key) {
    throw new Error(
      "TROVE_SECRET is not set, so credentials cannot be stored safely. " +
        "Generate one with: openssl rand -base64 32",
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const out = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), out.toString("base64")].join(":");
}

/** Returns null for anything that does not decrypt cleanly. */
export function decrypt(stored: string): string | null {
  const key = keyFor();
  if (!key) return null;

  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;

  try {
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key, or the ciphertext was tampered with.
    return null;
  }
}

/** Last four characters, for showing which credential is stored. */
export function hint(secret: string): string {
  const t = secret.trim();
  return t.length <= 4 ? "••••" : `••••${t.slice(-4)}`;
}
