'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type VerifyResponse = {
  valid_schema: boolean;
  computed_hash: string;
  computed_content_hash: string;
  stored_hash?: string;
  status: 'VERIFIED' | 'MISMATCH';
  reasons: string[];
  chain_check?: {
    network: string;
    object_id: string;
    status: 'VERIFIED' | 'MISMATCH' | 'SKIPPED';
    reason?: string;
  };
};

export function VerifyForm() {
  const [receiptId, setReceiptId] = useState('');
  const [receiptJson, setReceiptJson] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const loadById = async () => {
    if (!receiptId.trim()) return;

    setError(null);
    try {
      const response = await fetch(`/api/receipts/${receiptId.trim()}`);
      const payload = (await response.json()) as { receipt?: unknown; error?: string };
      if (!response.ok || !payload.receipt) {
        throw new Error(payload.error ?? 'Receipt not found');
      }

      setReceiptJson(JSON.stringify(payload.receipt, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    }
  };

  const verify = async () => {
    setError(null);
    setResult(null);
    setIsVerifying(true);

    try {
      const parsed = JSON.parse(receiptJson);
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receipt: parsed }),
      });

      const payload = (await response.json()) as VerifyResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Verification failed');
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="animate-fade-in-up border-primary/20">
      <CardHeader>
        <CardTitle>Verify Receipt Integrity</CardTitle>
        <CardDescription>
          Verify schema, recompute deterministic hashes, and optionally check Sui on-chain attestation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            value={receiptId}
            onChange={(event) => setReceiptId(event.target.value)}
            placeholder="Paste receipt id then load"
          />
          <Button type="button" variant="secondary" onClick={loadById}>
            Load by ID
          </Button>
        </div>

        <Textarea
          value={receiptJson}
          onChange={(event) => setReceiptJson(event.target.value)}
          placeholder="Paste receipt JSON"
          className="min-h-[260px] font-mono text-xs"
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button onClick={verify} disabled={isVerifying || !receiptJson.trim()}>
          {isVerifying ? 'Verifying...' : 'Verify Receipt'}
        </Button>

        {result ? (
          <div
            className={`rounded-md border p-4 text-sm ${
              result.status === 'VERIFIED' ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'
            }`}
          >
            <div className="mb-2 flex items-center gap-2 font-medium">
              {result.status === 'VERIFIED' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verified
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Mismatch
                </>
              )}
            </div>

            <p className="font-mono text-xs">computed_hash: {result.computed_hash}</p>
            {result.stored_hash ? <p className="font-mono text-xs">stored_hash: {result.stored_hash}</p> : null}
            <p className="font-mono text-xs">computed_content_hash: {result.computed_content_hash}</p>

            {result.reasons.length > 0 ? (
              <ul className="mt-2 list-disc pl-5">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}

            {result.chain_check ? (
              <div className="mt-3 rounded border border-border bg-background p-3 text-xs">
                <p>
                  chain check: {result.chain_check.status} ({result.chain_check.network})
                </p>
                <p className="font-mono">object_id: {result.chain_check.object_id}</p>
                {result.chain_check.reason ? <p>{result.chain_check.reason}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
