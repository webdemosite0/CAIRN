"use server";

import { redirect } from "next/navigation";
import {
  createUser,
  endSession,
  findByEmail,
  startSession,
  verifyPassword,
} from "@/lib/auth";

export interface AuthState {
  error?: string;
}

function readForm(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
    name: String(form.get("name") ?? "").trim(),
  };
}

export async function signUp(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const { email, password, name } = readForm(form);

  if (!name) return { error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (await findByEmail(email)) {
    return { error: "An account with that email already exists." };
  }

  const user = await createUser(email, name, password);
  await startSession(user.id);
  redirect("/");
}

export async function logIn(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const { email, password } = readForm(form);

  const row = await findByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "That email and password do not match." };
  }

  await startSession(row.id);
  redirect("/");
}

export async function logOut() {
  await endSession();
  redirect("/login");
}
