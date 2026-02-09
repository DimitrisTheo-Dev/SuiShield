import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container py-16">
      <h1 className="text-2xl font-semibold">Receipt not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The receipt id is missing or unavailable.</p>
      <Link href="/scan" className="mt-4 inline-block text-sm text-primary underline">
        Run a new scan
      </Link>
    </div>
  );
}
