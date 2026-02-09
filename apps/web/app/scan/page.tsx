import { ScanForm } from '@/components/scan/scan-form';

export default function ScanPage() {
  return (
    <div className="container py-10">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold">Scan</h1>
        <p className="text-sm text-muted-foreground">
          Provide repo URL, package path, and optional commit SHA. Scanner fetches deterministic snapshot and rules.
        </p>
      </div>
      <ScanForm />
    </div>
  );
}
