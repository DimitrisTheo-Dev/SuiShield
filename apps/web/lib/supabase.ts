import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, hasSupabaseAdminCredentials } from './env';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!hasSupabaseAdminCredentials()) {
    throw new Error('Supabase admin credentials are missing');
  }

  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }

  return adminClient;
}

export function getSupabasePublicClient(): SupabaseClient | null {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
