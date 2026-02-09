import { randomUUID } from 'node:crypto';
import { type ReceiptV1 } from '@suishield/receipt';
import { hasSupabaseAdminCredentials } from './env';
import { getSupabaseAdminClient } from './supabase';

export type StoredReceipt = {
  id: string;
  repo_url: string;
  commit_sha: string;
  package_path: string;
  created_at: string;
  receipt_hash: string;
  ruleset_hash: string;
  score: number;
  verdict: string;
  receipt_json: ReceiptV1;
};

export type AttestationRefInput = {
  receipt_id: string;
  network: string;
  tx_digest: string;
  object_id: string;
  issuer: string;
};

const memoryReceipts = new Map<string, StoredReceipt>();
const memoryAttestations = new Map<string, AttestationRefInput>();

function memoryInsertReceipt(receipt: ReceiptV1): StoredReceipt {
  const id = randomUUID();
  const row: StoredReceipt = {
    id,
    repo_url: receipt.input.repo_url,
    commit_sha: receipt.input.commit_sha,
    package_path: receipt.input.package_path,
    created_at: new Date().toISOString(),
    receipt_hash: receipt.hashes.receipt_hash,
    ruleset_hash: receipt.ruleset.ruleset_hash,
    score: receipt.scoring.score,
    verdict: receipt.scoring.verdict,
    receipt_json: receipt,
  };

  memoryReceipts.set(id, row);
  return row;
}

export async function insertReceipt(receipt: ReceiptV1): Promise<StoredReceipt> {
  if (!hasSupabaseAdminCredentials()) {
    return memoryInsertReceipt(receipt);
  }

  const supabase = getSupabaseAdminClient();
  const payload = {
    repo_url: receipt.input.repo_url,
    commit_sha: receipt.input.commit_sha,
    package_path: receipt.input.package_path,
    receipt_hash: receipt.hashes.receipt_hash,
    ruleset_hash: receipt.ruleset.ruleset_hash,
    score: receipt.scoring.score,
    verdict: receipt.scoring.verdict,
    receipt_json: receipt,
  };

  const { data, error } = await supabase
    .from('receipts')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to insert receipt: ${error.message}`);
  }

  return data as StoredReceipt;
}

export async function getReceiptById(id: string): Promise<StoredReceipt | null> {
  if (!hasSupabaseAdminCredentials()) {
    return memoryReceipts.get(id) ?? null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('receipts').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch receipt: ${error.message}`);
  }

  return (data as StoredReceipt | null) ?? null;
}

export async function insertAttestationRef(input: AttestationRefInput): Promise<void> {
  if (!hasSupabaseAdminCredentials()) {
    memoryAttestations.set(`${input.receipt_id}:${input.object_id}`, input);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('attestation_refs').insert(input);

  if (error) {
    throw new Error(`Failed to insert attestation reference: ${error.message}`);
  }
}

export async function getAttestationRefsForReceipt(receiptId: string): Promise<AttestationRefInput[]> {
  if (!hasSupabaseAdminCredentials()) {
    const refs = Array.from(memoryAttestations.values()).filter((entry) => entry.receipt_id === receiptId);
    return refs;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('attestation_refs')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('published_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch attestation references: ${error.message}`);
  }

  return (data ?? []) as AttestationRefInput[];
}
