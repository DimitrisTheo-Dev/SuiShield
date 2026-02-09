import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scanDemoFixture, scanGitHubMovePackage } from '@suishield/scanner';
import { insertReceipt } from '@/lib/storage';

export const runtime = 'nodejs';
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const scanRateLimit = new Map<string, { count: number; resetAt: number }>();

const scanInputSchema = z.object({
  repo_url: z.string().url().max(300).optional(),
  package_path: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9._/-]+$/)
    .optional(),
  commit_sha: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{7,40}$/)
    .optional(),
  demo_mode: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (!value.demo_mode) {
    if (!value.repo_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repo_url'],
        message: 'repo_url is required when demo_mode is false',
      });
    }

    if (!value.package_path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['package_path'],
        message: 'package_path is required when demo_mode is false',
      });
    }
  }
});

function toStatusCode(message: string): number {
  const lower = message.toLowerCase();
  if (message.includes('timed out')) return 408;
  if (message.includes('exceeds')) return 413;
  if (lower.includes('rate limit')) return 429;
  if (lower.includes('temporarily unavailable')) return 503;
  return 400;
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(request: Request): string | null {
  const now = Date.now();
  const key = getClientKey(request);
  const current = scanRateLimit.get(key);

  if (!current || now > current.resetAt) {
    scanRateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return `Rate limit exceeded. Try again in ${Math.ceil((current.resetAt - now) / 1000)}s`;
  }

  current.count += 1;
  scanRateLimit.set(key, current);
  return null;
}

export async function POST(request: Request) {
  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) {
    return NextResponse.json({ error: rateLimitError }, { status: 429 });
  }

  try {
    const body = scanInputSchema.parse(await request.json());

    const output = body.demo_mode
      ? await scanDemoFixture()
      : await scanGitHubMovePackage({
          repo_url: body.repo_url ?? '',
          package_path: body.package_path ?? '',
          commit_sha: body.commit_sha,
        });

    const stored = await insertReceipt(output.receipt);

    return NextResponse.json({
      id: stored.id,
      receipt_hash: output.receipt.hashes.receipt_hash,
      verdict: output.receipt.scoring.verdict,
      score: output.receipt.scoring.score,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}
