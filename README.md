# SuiShield

SuiShield is a deterministic Move package scanner for Sui Track: it scans a GitHub Move package snapshot at a specific commit, produces a stable JSON receipt with reproducible hashes, and optionally anchors the receipt hash on Sui via a Move 2024 attestation object.

Live URL: `https://YOUR-VERCEL-DEPLOYMENT.vercel.app`

Demo Video URL: `https://YOUR-DEMO-VIDEO-URL`

## Quickstart Checklist

Install prerequisites:
- Node.js 20 LTS
- pnpm (latest)
- Sui CLI (latest)

Note: latest `@mysten/sui` currently declares Node `>=22` in package engines. If your environment enforces engines strictly, use Node 22 for install/build while keeping hackathon docs aligned to Node 20 LTS baseline.

Version checks:

```bash
node --version
pnpm --version
sui --version
```

### Sui CLI install commands

macOS (Homebrew):

```bash
brew tap MystenLabs/tap
brew install sui
```

Rust/Cargo option (macOS/Linux):

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

## New Repo Requirement (Hackathon)

Create a brand new GitHub repository on or after **January 27, 2026**, then make your first commit with this exact message.

```bash
mkdir suishield && cd suishield
git init
git add .
git commit -m "chore: initial SuiShield hackathon scaffold (post-2026-01-27)"
git branch -M main
git remote add origin https://github.com/<your-org-or-user>/suishield.git
git push -u origin main
```

## Monorepo Layout

```text
suishield/
  apps/web
  packages/scanner
  packages/receipt
  packages/ui
  contracts/suishield_attestation
  supabase/migrations
  .github/workflows
  docs/demo_script.md
  AI_DISCLOSURE.md
  ARCHITECTURE.md
  SECURITY_MODEL.md
```

## One-Command Local Setup

```bash
pnpm install && pnpm sdk:versions && pnpm dev
```

Open `http://localhost:3000`.

## Local Run Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm contract:build
```

## Supabase Setup

1. Create a Supabase project.
2. Run SQL migrations from `supabase/migrations`.
3. Set env vars in `apps/web/.env.local` (or root `.env` for deployment):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_PACKAGE_ID=0x...
```

## Contract Deploy (Testnet)

```bash
cd contracts/suishield_attestation
sui client switch --env testnet
sui client publish --gas-budget 100000000
```

Copy the deployed package id into `NEXT_PUBLIC_SUI_PACKAGE_ID`.

## App Flows

### Scan
1. Visit `/scan`.
2. Enter `repo_url`, `package_path`, and optional `commit_sha`.
3. Submit scan. App calls `POST /api/scan` and redirects to `/r/[id]`.
4. Hard limits (fail-fast): zip <= 20MB, files <= 500, filtered bytes <= 10MB, scanned lines <= 50,000, scan timeout 45s.

### Receipt Viewer
- `/r/[id]` shows score, verdict, grouped findings, hashes, and receipt download.
- Includes optional attestation reference save flow.

### Verify
1. Visit `/verify`.
2. Load a receipt by ID or paste receipt JSON.
3. Verify recomputed hashes and optional on-chain attestation check.

## Vercel Deployment

1. Push repo to GitHub.
2. Import project in Vercel.
3. Set build command: `pnpm build`.
4. Set install command: `pnpm install`.
5. Set output defaults for Next.js app.
6. Add required env vars listed above.
7. Deploy and test these routes:
   - `/`
   - `/scan`
   - `/r/[id]`
   - `/verify`
   - `/docs`
   - `/api/health`

## Hackathon Compliance Checklist

- [x] New repo requirement documented with post-2026-01-27 first commit command.
- [x] Move contract uses Move 2024 syntax (`contracts/suishield_attestation/Move.toml`).
- [x] Uses latest official Sui SDK package names (`@mysten/sui`, `@mysten/dapp-kit-react`, `@mysten/dapp-kit-core`).
- [x] Functional web routes and demo-capable scan flow.
- [x] Open-source code includes smart contract, scanner, frontend, backend routes, deployment instructions.
- [x] AI tool disclosure included (`AI_DISCLOSURE.md`).

## Useful Scripts

```bash
pnpm sdk:versions
pnpm submission:check
```

## AI Disclosure

See `AI_DISCLOSURE.md`.
