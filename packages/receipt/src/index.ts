import stableStringify from 'fast-json-stable-stringify';
import { z } from 'zod';

export const SeveritySchema = z.enum(['high', 'medium', 'low']);

export const FindingSchema = z.object({
  id: z.string().min(1),
  severity: SeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  file: z.string().min(1),
  line_start: z.number().int().min(1),
  line_end: z.number().int().min(1),
  evidence_snippet: z.string(),
  remediation: z.string().min(1),
});

export const ReceiptV1Schema = z.object({
  version: z.literal('1'),
  input: z.object({
    repo_url: z.string().min(1),
    commit_sha: z.string().min(1),
    package_path: z.string().min(1),
    file_count: z.number().int().min(0),
  }),
  generated_at_ms: z.number().int().nonnegative(),
  ruleset: z.object({
    ruleset_hash: z.string().regex(/^[a-f0-9]{64}$/),
    ruleset_version_string: z.string().min(1),
  }),
  findings: z.array(FindingSchema),
  scoring: z.object({
    score: z.number().int().min(0).max(100),
    verdict: z.enum(['ALLOW', 'REVIEW', 'BLOCK']),
    severity_counts: z.object({
      high: z.number().int().min(0),
      medium: z.number().int().min(0),
      low: z.number().int().min(0),
    }),
  }),
  hashes: z.object({
    receipt_hash: z.string().regex(/^[a-f0-9]{64}$/),
    content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  attestation: z
    .object({
      network: z.string().min(1),
      object_id: z.string().min(1),
      tx_digest: z.string().min(1),
      issuer: z.string().min(1),
    })
    .optional(),
});

export type ReceiptV1 = z.infer<typeof ReceiptV1Schema>;
export type Finding = z.infer<typeof FindingSchema>;

const FINDING_SORT_FIELDS: Array<keyof Finding> = ['severity', 'file', 'line_start', 'line_end', 'id', 'title'];

function severityRank(severity: Finding['severity']): number {
  if (severity === 'high') return 0;
  if (severity === 'medium') return 1;
  return 2;
}

function compareFindings(a: Finding, b: Finding): number {
  for (const field of FINDING_SORT_FIELDS) {
    const av = a[field];
    const bv = b[field];

    if (field === 'severity') {
      const diff = severityRank(av as Finding['severity']) - severityRank(bv as Finding['severity']);
      if (diff !== 0) return diff;
      continue;
    }

    if (typeof av === 'number' && typeof bv === 'number') {
      if (av !== bv) return av - bv;
      continue;
    }

    const textDiff = String(av).localeCompare(String(bv));
    if (textDiff !== 0) return textDiff;
  }

  return 0;
}

function normalizeValue(value: unknown, path: string[]): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => normalizeValue(entry, path));

    if (path.length === 1 && path[0] === 'findings') {
      return [...(normalized as Finding[])].sort(compareFindings);
    }

    return normalized;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(record).sort()) {
      output[key] = normalizeValue(record[key], [...path, key]);
    }

    return output;
  }

  return value;
}

export function canonicalize<T>(value: T): T {
  return normalizeValue(value, []) as T;
}

export function canonicalJsonString(value: unknown): string {
  return stableStringify(canonicalize(value));
}

export type ReceiptHashPayload = Omit<ReceiptV1, 'hashes' | 'attestation'>;

export function payloadWithoutHashes(receipt: ReceiptV1 | ReceiptHashPayload): ReceiptHashPayload {
  const parsed = ReceiptV1Schema.omit({ hashes: true, attestation: true }).parse(receipt);
  return parsed;
}

async function sha256Browser(input: Uint8Array): Promise<string> {
  const normalized = new Uint8Array(input.byteLength);
  normalized.set(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', normalized);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return sha256Browser(bytes);
  }

  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(bytes).digest('hex');
}

export async function computeRulesetHash(rawRulesetJson: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(rawRulesetJson));
}

export async function computeReceiptHashes(receipt: ReceiptHashPayload): Promise<{
  receipt_hash: string;
  content_hash: string;
}> {
  const canonicalPayload = canonicalJsonString(receipt);
  const receipt_hash = await sha256Hex(canonicalPayload);

  const contentPayload = {
    input: receipt.input,
    ruleset: receipt.ruleset,
    findings: receipt.findings,
    scoring: receipt.scoring,
  };
  const content_hash = await sha256Hex(canonicalJsonString(contentPayload));

  return {
    receipt_hash,
    content_hash,
  };
}

export async function withComputedHashes(receipt: ReceiptHashPayload): Promise<ReceiptV1> {
  const hashes = await computeReceiptHashes(receipt);
  return ReceiptV1Schema.parse({
    ...receipt,
    hashes,
  });
}

export async function verifyReceipt(receipt: ReceiptV1): Promise<{
  validSchema: boolean;
  computedHash: string;
  computedContentHash: string;
  matches: boolean;
}> {
  const parsed = ReceiptV1Schema.parse(receipt);
  const payload = payloadWithoutHashes(parsed);
  const { receipt_hash, content_hash } = await computeReceiptHashes(payload);

  return {
    validSchema: true,
    computedHash: receipt_hash,
    computedContentHash: content_hash,
    matches:
      parsed.hashes.receipt_hash === receipt_hash && parsed.hashes.content_hash === content_hash,
  };
}
