create extension if not exists pgcrypto;

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  repo_url text not null,
  commit_sha text not null,
  package_path text not null,
  created_at timestamptz not null default now(),
  receipt_hash text not null unique,
  ruleset_hash text not null,
  score int not null,
  verdict text not null,
  receipt_json jsonb not null
);

create table if not exists public.attestation_refs (
  receipt_id uuid references public.receipts(id) on delete cascade,
  network text not null,
  tx_digest text not null,
  object_id text not null,
  issuer text not null,
  published_at timestamptz not null default now(),
  primary key (receipt_id, object_id)
);

create index if not exists idx_receipts_receipt_hash on public.receipts(receipt_hash);
create index if not exists idx_receipts_created_at on public.receipts(created_at desc);

alter table public.receipts enable row level security;
alter table public.attestation_refs enable row level security;

create policy "receipts_public_read"
  on public.receipts
  for select
  using (true);

create policy "receipts_service_insert"
  on public.receipts
  for insert
  to service_role
  with check (true);

create policy "attestation_refs_public_read"
  on public.attestation_refs
  for select
  using (true);

create policy "attestation_refs_service_insert"
  on public.attestation_refs
  for insert
  to service_role
  with check (true);
