import { describe, expect, it } from 'vitest';
import { SCANNER_LIMITS, scanDemoFixture, summarizeFindings } from '../src/index';

describe('scanner determinism', () => {
  it('returns stable receipt hash for demo fixture', async () => {
    const first = await scanDemoFixture();
    const second = await scanDemoFixture();

    expect(first.receipt.hashes.receipt_hash).toBe(second.receipt.hashes.receipt_hash);
    expect(first.receipt.hashes.content_hash).toBe(second.receipt.hashes.content_hash);
    expect(first.receipt.hashes.receipt_hash).toBe(
      '58728ca454fbfba5a45681e9ac990fb3e245c5db0476ed2d1e3b6740eec36443',
    );
  });

  it('summarizes findings', async () => {
    const result = await scanDemoFixture();
    expect(summarizeFindings(result.receipt.findings)).toContain('total:');
  });

  it('publishes scanner hard limits', () => {
    expect(SCANNER_LIMITS.max_zip_bytes).toBe(20 * 1024 * 1024);
    expect(SCANNER_LIMITS.max_files).toBe(500);
    expect(SCANNER_LIMITS.max_total_lines_scanned).toBe(50_000);
    expect(SCANNER_LIMITS.scan_timeout_ms).toBe(45_000);
  });
});
