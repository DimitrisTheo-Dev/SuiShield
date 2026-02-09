'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type PublishAttestationProps = {
  receiptId: string;
  receiptHash: string;
  rulesetHash: string;
};

export function PublishAttestation({ receiptId, receiptHash, rulesetHash }: PublishAttestationProps) {
  const [network, setNetwork] = useState<'testnet' | 'devnet' | 'mainnet'>('testnet');
  const [issuer, setIssuer] = useState('');
  const [txDigest, setTxDigest] = useState('');
  const [objectId, setObjectId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveAttestationRef = async () => {
    setError(null);
    setStatus(null);

    try {
      const response = await fetch('/api/attest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receipt_id: receiptId,
          network,
          tx_digest: txDigest,
          object_id: objectId,
          issuer,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Unable to save attestation reference');
      }

      setStatus('Saved attestation reference.');
      setTxDigest('');
      setObjectId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attestation reference');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optional Sui Attestation</CardTitle>
        <CardDescription>
          Connect a wallet and call the Move contract, then store tx digest and object id for verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            MVP mode: paste transaction details after wallet publish.
          </p>
          <p className="mt-1 font-mono">receipt_hash: {receiptHash}</p>
          <p className="font-mono">ruleset_hash: {rulesetHash}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Network</span>
            <select
              value={network}
              onChange={(event) => setNetwork(event.target.value as 'testnet' | 'devnet' | 'mainnet')}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="testnet">testnet</option>
              <option value="devnet">devnet</option>
              <option value="mainnet">mainnet</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Issuer Address</span>
            <Input value={issuer} onChange={(event) => setIssuer(event.target.value)} placeholder="0x..." />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Tx Digest</span>
          <Input value={txDigest} onChange={(event) => setTxDigest(event.target.value)} placeholder="transaction digest" />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Attestation Object ID</span>
          <Input value={objectId} onChange={(event) => setObjectId(event.target.value)} placeholder="0x..." />
        </label>

        {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          onClick={saveAttestationRef}
          disabled={!issuer.trim() || !txDigest.trim() || !objectId.trim()}
          className="w-full"
        >
          Save Attestation Reference
        </Button>
      </CardContent>
    </Card>
  );
}
