import { describe, expect, it } from 'vitest';
import { scanDemoFixture, summarizeFindings } from '../src/index';

describe('scanner determinism', () => {
  it('returns stable receipt hash for demo fixture', async () => {
    const first = await scanDemoFixture();
    const second = await scanDemoFixture();

    expect(first.receipt.hashes.receipt_hash).toBe(second.receipt.hashes.receipt_hash);
    expect(first.receipt.hashes.content_hash).toBe(second.receipt.hashes.content_hash);
    expect(first.receipt.hashes.receipt_hash).toBe('TO_BE_FILLED');
  });

  it('summarizes findings', async () => {
    const result = await scanDemoFixture();
    expect(summarizeFindings(result.receipt.findings)).toContain('total:');
  });
});
