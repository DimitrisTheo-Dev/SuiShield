import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/scan', label: 'Scan' },
  { href: '/verify', label: 'Verify' },
  { href: '/docs', label: 'Docs' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>SuiShield</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
