import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertAttestationRef } from '@/lib/storage';

export const runtime = 'nodejs';

const attestSchema = z.object({
  receipt_id: z.string().uuid(),
  network: z.enum(['testnet', 'devnet', 'mainnet']),
  tx_digest: z.string().min(1),
  object_id: z.string().min(1),
  issuer: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = attestSchema.parse(await request.json());
    await insertAttestationRef(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save attestation reference';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
