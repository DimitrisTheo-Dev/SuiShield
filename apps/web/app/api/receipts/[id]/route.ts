import { NextResponse } from 'next/server';
import { getAttestationRefsForReceipt, getReceiptById } from '@/lib/storage';

export const runtime = 'nodejs';

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const record = await getReceiptById(id);

    if (!record) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const attestations = await getAttestationRefsForReceipt(id);

    return NextResponse.json({
      id,
      receipt: record.receipt_json,
      attestations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch receipt';
    const status = message.toLowerCase().includes('storage misconfigured') ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
