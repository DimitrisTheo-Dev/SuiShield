import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, hasSupabaseAdminCredentials, SUPABASE_ADMIN_KEY, SUPABASE_PUBLIC_KEY } from './env';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!hasSupabaseAdminCredentials()) {
    throw new Error('Supabase admin credentials are missing');
  }

  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_ADMIN_KEY!, {
      auth: { persistSession: false },
    });
  }

  return adminClient;
}

export function getSupabasePublicClient(): SupabaseClient | null {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    return null;
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false },
  });
}
