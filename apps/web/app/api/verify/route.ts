import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ReceiptV1Schema, verifyReceipt } from '@suishield/receipt';
import { fetchAttestationObject } from '@/lib/sui';

export const runtime = 'nodejs';

const verifySchema = z.object({
  receipt: z.unknown(),
});

function toHexFromUnknown(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.startsWith('0x') ? value.slice(2) : value;
    if (/^[a-f0-9]+$/i.test(normalized)) {
      return normalized.toLowerCase();
    }

    if (/^[A-Za-z0-9+/=]+$/.test(value)) {
      try {
        return Buffer.from(value, 'base64').toString('hex');
      } catch {
        return null;
      }
    }

    return null;
  }

  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return Buffer.from(value as number[]).toString('hex');
  }

  if (value && typeof value === 'object') {
    const maybeBytes = value as { bytes?: unknown };
    if (typeof maybeBytes.bytes === 'string') {
      return toHexFromUnknown(maybeBytes.bytes);
    }
  }

  return null;
}

function readOnChainField(data: unknown, key: string): unknown {
  if (!data || typeof data !== 'object') return undefined;
  const object = data as { json?: unknown };
  if (object.json && typeof object.json === 'object') {
    const json = object.json as Record<string, unknown>;
    if (key in json) {
      return json[key];
    }

    if (json.fields && typeof json.fields === 'object') {
      return (json.fields as Record<string, unknown>)[key];
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = verifySchema.parse(await request.json());
    const receipt = ReceiptV1Schema.parse(body.receipt);
    const verification = await verifyReceipt(receipt);

    const reasons: string[] = [];
    if (!verification.matches) {
      reasons.push('Receipt hash or content hash mismatch');
    }

    let chainCheck:
      | {
          network: string;
          object_id: string;
          status: 'VERIFIED' | 'MISMATCH' | 'SKIPPED';
          reason?: string;
        }
      | undefined;

    if (receipt.attestation?.object_id && receipt.attestation.network) {
      try {
        if (
          receipt.attestation.network !== 'testnet' &&
          receipt.attestation.network !== 'devnet' &&
          receipt.attestation.network !== 'mainnet'
        ) {
          throw new Error(`Unsupported attestation network '${receipt.attestation.network}'`);
        }

        const network = receipt.attestation.network;
        const object = await fetchAttestationObject(receipt.attestation.object_id, network);
        const onChainReceiptHash = toHexFromUnknown(readOnChainField(object, 'receipt_hash'));
        const onChainRulesetHash = toHexFromUnknown(readOnChainField(object, 'ruleset_hash'));

        if (!onChainReceiptHash || !onChainRulesetHash) {
          chainCheck = {
            network,
            object_id: receipt.attestation.object_id,
            status: 'MISMATCH',
            reason: 'Unable to parse on-chain attestation fields',
          };
          reasons.push('On-chain attestation fields could not be parsed');
        } else if (
          onChainReceiptHash !== receipt.hashes.receipt_hash ||
          onChainRulesetHash !== receipt.ruleset.ruleset_hash
        ) {
          chainCheck = {
            network,
            object_id: receipt.attestation.object_id,
            status: 'MISMATCH',
            reason: 'On-chain hash values differ from receipt',
          };
          reasons.push('On-chain hash mismatch');
        } else {
          chainCheck = {
            network,
            object_id: receipt.attestation.object_id,
            status: 'VERIFIED',
          };
        }
      } catch (error) {
        chainCheck = {
          network: receipt.attestation.network,
          object_id: receipt.attestation.object_id,
          status: 'MISMATCH',
          reason: error instanceof Error ? error.message : 'Unable to query attestation object',
        };
        reasons.push('On-chain attestation check failed');
      }
    }

    const status: 'VERIFIED' | 'MISMATCH' =
      verification.matches && (chainCheck?.status === 'VERIFIED' || chainCheck?.status === undefined)
        ? 'VERIFIED'
        : 'MISMATCH';

    if (status === 'VERIFIED') {
      reasons.push('Receipt hash and content hash verified');
      if (chainCheck?.status === 'VERIFIED') {
        reasons.push('On-chain attestation hashes match');
      }
    }

    return NextResponse.json({
      valid_schema: true,
      computed_hash: verification.computedHash,
      computed_content_hash: verification.computedContentHash,
      stored_hash: receipt.hashes.receipt_hash,
      status,
      reasons,
      chain_check: chainCheck,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
