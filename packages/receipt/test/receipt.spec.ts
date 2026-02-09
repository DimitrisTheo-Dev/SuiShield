import { describe, expect, it } from 'vitest';
import { computeReceiptHashes, ReceiptV1Schema, verifyReceipt } from '../src/index';

describe('receipt hashing', () => {
  it('is deterministic regardless of findings order', async () => {
    const basePayload = {
      version: '1' as const,
      input: {
        repo_url: 'https://github.com/example/demo',
        commit_sha: 'abc123',
        package_path: 'contracts/demo',
        file_count: 1,
      },
      generated_at_ms: 1700000000000,
      ruleset: {
        ruleset_hash: 'a'.repeat(64),
        ruleset_version_string: 'ruleset-v1',
      },
      findings: [
        {
          id: 'R2',
          severity: 'medium' as const,
          title: 'Second',
          description: 'desc',
          file: 'sources/main.move',
          line_start: 20,
          line_end: 20,
          evidence_snippet: 'public_transfer',
          remediation: 'review',
        },
        {
          id: 'R1',
          severity: 'high' as const,
          title: 'First',
          description: 'desc',
          file: 'sources/main.move',
          line_start: 10,
          line_end: 10,
          evidence_snippet: 'transfer::public_transfer',
          remediation: 'gate access',
        },
      ],
      scoring: {
        score: 85,
        verdict: 'REVIEW' as const,
        severity_counts: {
          high: 1,
          medium: 1,
          low: 0,
        },
      },
    };

    const [hashes1, hashes2] = await Promise.all([
      computeReceiptHashes(basePayload),
      computeReceiptHashes({ ...basePayload, findings: [...basePayload.findings].reverse() }),
    ]);

    expect(hashes1).toEqual(hashes2);

    const receipt = ReceiptV1Schema.parse({ ...basePayload, hashes: hashes1 });
    const verification = await verifyReceipt(receipt);
    expect(verification.matches).toBe(true);
  });
});
