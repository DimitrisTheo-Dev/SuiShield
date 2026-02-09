import { VerifyForm } from '@/components/verify/verify-form';

export default function VerifyPage() {
  return (
    <div className="container py-10">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold">Verify</h1>
        <p className="text-sm text-muted-foreground">
          Validate receipt schema and hashes. If attestation data exists, compare with on-chain object fields.
        </p>
      </div>
      <VerifyForm />
    </div>
  );
}
