"use server";

import { revalidatePath } from "next/cache";
import {
  connectService,
  disconnectService,
} from "@/lib/connections";

export interface ConnectState {
  ok?: boolean;
  error?: string;
  account?: string;
}

/**
 * Connects a service by verifying the pasted credential against the real API
 * before storing it. A rejected credential is never saved.
 */
export async function connect(
  _prev: ConnectState,
  form: FormData,
): Promise<ConnectState> {
  const service = String(form.get("service") ?? "");
  const secret = String(form.get("secret") ?? "");

  const result = await connectService(service, secret);
  if (!result.ok) return { error: result.error };

  revalidatePath("/integrations");
  return { ok: true, account: result.account };
}

export async function disconnect(service: string) {
  await disconnectService(service);
  revalidatePath("/integrations");
}
