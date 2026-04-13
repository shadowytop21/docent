import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }

  return browserClient;
}

export async function ensureSupabaseUser() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      client: null,
      user: null,
      error: new Error("Supabase client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."),
    };
  }

  const current = await client.auth.getUser();
  if (current.error) {
    return { client, user: null, error: current.error };
  }

  if (current.data.user) {
    return { client, user: current.data.user, error: null };
  }

  const anonymous = await client.auth.signInAnonymously();
  if (anonymous.error) {
    return { client, user: null, error: anonymous.error };
  }

  if (!anonymous.data.user) {
    return {
      client,
      user: null,
      error: new Error("Unable to create a Supabase auth session."),
    };
  }

  return {
    client,
    user: anonymous.data.user,
    error: null,
  };
}
