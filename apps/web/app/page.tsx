import Link from 'next/link';
import { ArrowRight, Shield, ShieldAlert, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Shield,
    title: 'Deterministic Scan Receipts',
    description: 'Stable canonical JSON receipts with SHA256 hashes and reproducible verdicts.',
  },
  {
    icon: ShieldAlert,
    title: 'Move-Focused Rule Engine',
    description: '25 deterministic rules for common review-worthy Move patterns and metadata issues.',
  },
  {
    icon: Stamp,
    title: 'Optional Sui Attestation',
    description: 'Publish receipt hash and ruleset hash to Sui for transparent verification flows.',
  },
];

export default function HomePage() {
  return (
    <div className="container py-10 md:py-16">
      <section className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Sui Track Hackathon Submission
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">
            SuiShield scans Move packages and issues tamper-evident receipts.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            Scan a public GitHub repository or run deterministic demo mode, then verify receipt integrity and optional
            on-chain attestation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/scan">
                Start Scan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/verify">Verify a Receipt</Link>
            </Button>
          </div>
        </div>

        <Card className="border-primary/20 bg-card/95">
          <CardHeader>
            <CardTitle>Live Demo Flow</CardTitle>
            <CardDescription>1) Scan 2) Review 3) Verify 4) Optional Attest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Use the deterministic fixture for guaranteed demo reliability.</p>
            <p>Ruleset and receipts are hashed with canonical stable serialization.</p>
            <p>Verification supports schema checks and optional Sui object comparison.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="animate-fade-in-up">
            <CardHeader>
              <feature.icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
