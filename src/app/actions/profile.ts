"use server";

import { revalidatePath } from "next/cache";

import { currentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";

export interface Profile {
  name: string;
  email: string;
  bio: string;
  plan: string;
  createdAt: number;
  emailVerified: boolean;
  provider: string;
}

export interface ProfileState {
  error?: string;
  ok?: boolean;
}

/** Everything the profile and account screens read, in one query. */
export async function getProfile(): Promise<Profile | null> {
  const user = await currentUser();
  if (!user) return null;

  const row = await one<{
    name: string;
    email: string;
    bio: string;
    plan: string;
    created_at: number;
    email_verified: number;
    provider: string;
  }>(
    `SELECT name, email, bio, plan, created_at, email_verified, provider
       FROM users WHERE id = ?`,
    [user.id],
  );
  if (!row) return null;

  return {
    name: String(row.name),
    email: String(row.email),
    bio: String(row.bio ?? ""),
    plan: String(row.plan),
    createdAt: Number(row.created_at),
    emailVerified: Number(row.email_verified) === 1,
    provider: String(row.provider ?? "password"),
  };
}

const MAX_BIO = 280;

/**
 * Saves the two fields a person actually owns.
 *
 * The email is deliberately not editable here. Changing it means proving the
 * new address, which is the verification flow — offering a field that silently
 * moved the account to an unproven address would be worse than not offering
 * one at all.
 */
export async function updateProfile(
  _prev: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const user = await currentUser();
  if (!user) return { error: "Log in to edit your profile." };

  const name = String(form.get("name") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim();

  if (name.length < 2) return { error: "Names need at least two characters." };
  if (name.length > 60) return { error: "That name is too long." };
  if (bio.length > MAX_BIO) {
    return { error: `Keep the bio under ${MAX_BIO} characters.` };
  }

  await run(`UPDATE users SET name = ?, bio = ? WHERE id = ?`, [
    name,
    bio,
    user.id,
  ]);

  // The name is in the rail and the top bar on every page, not just this one.
  revalidatePath("/", "layout");
  return { ok: true };
}
