import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { PublishAttestation } from '@/components/attest/publish-attestation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAttestationRefsForReceipt, getReceiptById } from '@/lib/storage';

type ReceiptPageProps = {
  params: Promise<{ id: string }>;
};

function verdictVariant(verdict: string): 'success' | 'warning' | 'danger' {
  if (verdict === 'ALLOW') return 'success';
  if (verdict === 'REVIEW') return 'warning';
  return 'danger';
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const record = await getReceiptById(id);

  if (!record) {
    notFound();
  }

  const receipt = record.receipt_json;
  const grouped = {
    high: receipt.findings.filter((finding) => finding.severity === 'high'),
    medium: receipt.findings.filter((finding) => finding.severity === 'medium'),
    low: receipt.findings.filter((finding) => finding.severity === 'low'),
  };

  const attestationRefs = await getAttestationRefsForReceipt(id);

  return (
    <div className="container space-y-6 py-10">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            Receipt {id}
            <Badge variant={verdictVariant(receipt.scoring.verdict)}>{receipt.scoring.verdict}</Badge>
            <Badge variant="outline">Score {receipt.scoring.score}</Badge>
          </CardTitle>
          <CardDescription className="break-words">
            commit: {receipt.input.commit_sha} | file_count: {receipt.input.file_count} | package_path:{' '}
            {receipt.input.package_path}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-mono text-xs break-all">receipt_hash: {receipt.hashes.receipt_hash}</p>
          <p className="font-mono text-xs break-all">ruleset_hash: {receipt.ruleset.ruleset_hash}</p>
          <p className="font-mono text-xs break-all">repo_url: {receipt.input.repo_url}</p>

          <Button asChild variant="outline" className="mt-2">
            <a
              href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(receipt, null, 2))}`}
              download={`suishield-receipt-${id}.json`}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Receipt JSON
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {(['high', 'medium', 'low'] as const).map((severity) => (
          <Card key={severity} className="min-w-0">
            <CardHeader>
              <CardTitle className="capitalize">{severity} Findings</CardTitle>
              <CardDescription>{grouped[severity].length} findings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[severity].length === 0 ? (
                <p className="text-sm text-muted-foreground">No findings.</p>
              ) : (
                grouped[severity].map((finding, index) => (
                  <div
                    key={`${finding.id}-${finding.file}-${finding.line_start}-${index}`}
                    className="min-w-0 rounded-md border p-3"
                  >
                    <p className="text-sm font-medium break-words">{finding.title}</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {finding.file}:{finding.line_start}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground break-words">{finding.description}</p>
                    <p className="mt-2 rounded bg-muted p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
                      {finding.evidence_snippet}
                    </p>
                    <p className="mt-2 text-xs break-words">Remediation: {finding.remediation}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <PublishAttestation
        receiptId={id}
        receiptHash={receipt.hashes.receipt_hash}
        rulesetHash={receipt.ruleset.ruleset_hash}
      />

      {attestationRefs.length > 0 ? (
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Saved Attestation References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs font-mono">
            {attestationRefs.map((ref) => (
              <div key={`${ref.receipt_id}-${ref.object_id}`} className="min-w-0 rounded border p-2">
                <p className="break-all">network: {ref.network}</p>
                <p className="break-all">issuer: {ref.issuer}</p>
                <p className="break-all">tx_digest: {ref.tx_digest}</p>
                <p className="break-all">object_id: {ref.object_id}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Need to validate quickly? Use <Link href="/verify" className="text-primary underline">Verify page</Link>.
      </p>
    </div>
  );
}
