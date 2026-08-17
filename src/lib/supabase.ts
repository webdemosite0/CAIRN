import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client.
 *
 * The anon key is public by design — it is safe in the browser and is the key
 * Supabase expects client code to use. Everything it can reach must be guarded
 * by Row Level Security policies on your tables.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function supabase() {
  if (!supabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export interface SupabaseStatus {
  configured: boolean;
  reachable: boolean;
  projectRef: string | null;
  emailAuth: boolean;
  /** OAuth providers actually switched on in the Supabase dashboard. */
  enabledProviders: string[];
  error?: string;
}

/** Asks the live project what it supports. Used by the integrations page. */
export async function supabaseStatus(): Promise<SupabaseStatus> {
  const projectRef =
    SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? null;

  if (!supabaseConfigured) {
    return {
      configured: false,
      reachable: false,
      projectRef: null,
      emailAuth: false,
      enabledProviders: [],
    };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        configured: true,
        reachable: false,
        projectRef,
        emailAuth: false,
        enabledProviders: [],
        error: `Project responded ${res.status}`,
      };
    }

    const json = (await res.json()) as {
      external?: Record<string, boolean>;
    };
    const external = json.external ?? {};

    return {
      configured: true,
      reachable: true,
      projectRef,
      emailAuth: external.email === true,
      enabledProviders: Object.entries(external)
        .filter(([k, v]) => v === true && k !== "email" && k !== "phone")
        .map(([k]) => k),
    };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      projectRef,
      emailAuth: false,
      enabledProviders: [],
      error: e instanceof Error ? e.message : "Could not reach the project",
    };
  }
}
