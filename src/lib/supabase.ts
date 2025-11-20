import { createClient } from '@supabase/supabase-js';

export async function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  // Use a fresh client for server-side operations to avoid session pollution
  return createClient(url, key, { auth: { persistSession: false } });
}

