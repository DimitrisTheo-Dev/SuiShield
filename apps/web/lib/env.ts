import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_SUI_NETWORK: z.enum(['testnet', 'devnet', 'mainnet']).default('testnet'),
  NEXT_PUBLIC_SUI_PACKAGE_ID: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
  NEXT_PUBLIC_SUI_PACKAGE_ID: process.env.NEXT_PUBLIC_SUI_PACKAGE_ID,
});

export const SUPABASE_PUBLIC_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const SUPABASE_ADMIN_KEY = env.SUPABASE_SECRET_KEY;

export function hasSupabaseAdminCredentials(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && SUPABASE_ADMIN_KEY);
}
