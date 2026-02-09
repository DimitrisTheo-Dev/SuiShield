'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const DEMO_VALUES = {
  repo_url: 'https://github.com/MystenLabs/sui',
  package_path: 'crates/sui-framework/packages/sui-framework',
  commit_sha: '',
};

export function ScanForm() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState(DEMO_VALUES.repo_url);
  const [packagePath, setPackagePath] = useState(DEMO_VALUES.package_path);
  const [commitSha, setCommitSha] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          package_path: packagePath,
          commit_sha: commitSha || undefined,
          demo_mode: demoMode,
        }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? 'Scan failed');
      }

      router.push(`/r/${payload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected scan error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="animate-fade-in-up border-primary/20">
      <CardHeader>
        <CardTitle>Scan Move Package</CardTitle>
        <CardDescription>
          Scan a public GitHub Move package at a specific commit or run deterministic demo mode.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="repo-url">
              Repo URL
            </label>
            <Input
              id="repo-url"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              disabled={demoMode || isSubmitting}
              placeholder="https://github.com/owner/repo"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="package-path">
              Package Path
            </label>
            <Input
              id="package-path"
              value={packagePath}
              onChange={(event) => setPackagePath(event.target.value)}
              disabled={demoMode || isSubmitting}
              placeholder="contracts/my_move_package"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="commit-sha">
              Commit SHA (optional)
            </label>
            <Input
              id="commit-sha"
              value={commitSha}
              onChange={(event) => setCommitSha(event.target.value)}
              disabled={demoMode || isSubmitting}
              placeholder="HEAD of default branch if omitted"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => {
                setRepoUrl(DEMO_VALUES.repo_url);
                setPackagePath(DEMO_VALUES.package_path);
                setCommitSha('');
                setDemoMode(false);
              }}
            >
              Use GitHub Demo Repo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setDemoMode(true);
                setRepoUrl('demo://suishield/fixture');
                setPackagePath('demo_move_package');
                setCommitSha('fixture-demo-commit');
              }}
            >
              Deterministic Demo Scan
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
            <Rocket className="h-4 w-4" />
            {demoMode
              ? 'Demo mode scans a local fixture package so judges can always reproduce the flow.'
              : 'GitHub mode fetches an exact snapshot zipball and scans only your package_path.'}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              'Run Scan'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
