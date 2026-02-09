import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocsPage() {
  return (
    <div className="container py-10">
      <h1 className="mb-6 text-3xl font-semibold">In-App Docs</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scan Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. `repo_url`: public https GitHub repository URL.</p>
            <p>2. `package_path`: path containing `Move.toml` and `sources/*.move`.</p>
            <p>3. `commit_sha` optional. If omitted, default branch HEAD commit is resolved.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Determinism Guarantees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Stable key ordering and deterministic finding sorting are applied before hashing.</p>
            <p>Ruleset hash is SHA256 over raw `ruleset.json` bytes.</p>
            <p>Receipt hash is SHA256 over canonical receipt payload excluding hash and attestation fields.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Abuse Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Zipball max: 20MB, files max: 500, filtered package bytes max: 10MB.</p>
          <p>Total scanned lines max: 50,000.</p>
          <p>Fetch timeout: 15s per network call, scan timeout: 45s total.</p>
          <p>When a limit is exceeded, scan is stopped and an explicit error is returned.</p>
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground">
        Extended docs: <Link href="/" className="text-primary underline">README and architecture files in repo root</Link>.
      </p>
    </div>
  );
}
