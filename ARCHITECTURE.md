# SuiShield Architecture

## System Overview

SuiShield is a pnpm monorepo with four core parts:
- `packages/scanner`: deterministic scanner engine and ruleset
- `packages/receipt`: receipt schema, canonical serialization, hash logic
- `apps/web`: Next.js app routes + API handlers + verification UI
- `contracts/suishield_attestation`: Move 2024 attestation contract

## Scanner Pipeline

1. Input validation (`repo_url`, `package_path`, optional `commit_sha`).
2. GitHub snapshot resolution:
   - Resolve commit SHA (explicit or default branch HEAD).
   - Fetch zipball for exact commit.
   - Enforce limits: zip <= 20MB, files <= 500, fetch timeout <= 15s.
3. Package selection:
   - Scope to `package_path` only.
   - Require `Move.toml`.
   - Scan `.move` files under `package_path/sources`.
   - Enforce filtered bytes <= 10MB and total scanned lines <= 50,000.
4. Normalization:
   - CRLF -> LF
   - trailing whitespace trimmed
5. Rules engine:
   - Load `packages/scanner/ruleset.json`.
   - Deterministic substring + safe regex checks.
   - Emit stable findings with line references and remediation.
6. Scoring:
   - weights: high=10, medium=5, low=2
   - `score = max(0, 100 - weighted_sum)`
   - verdict map: 90-100 ALLOW, 70-89 REVIEW, 0-69 BLOCK

Global scanner timeout: 45 seconds. If any limit is exceeded, scan aborts with an actionable error.

## Deterministic Receipt and Hashing

Receipt schema is versioned (`version: "1"`) and validated via Zod.

Determinism controls:
- Canonical key ordering for objects (recursive).
- Stable ordering for findings arrays.
- Fixed field naming and deterministic score mapping.

Hashing:
- `ruleset_hash = sha256(raw ruleset.json bytes)`
- `receipt_hash = sha256(canonical_json(receipt_payload_without_hash_fields))`
- `content_hash = sha256(canonical_json(content_subset))`

`receipt_payload_without_hash_fields` excludes:
- `hashes`
- `attestation`

This keeps core scan identity stable even if attestation metadata is added later.

## Optional On-Chain Attestation

Move package defines `ReceiptAttestation` object with:
- `receipt_hash: vector<u8>`
- `ruleset_hash: vector<u8>`
- `receipt_url: string`
- `created_at_ms: u64`
- `issuer: address`

`publish_attestation` entry function creates and transfers attestation to sender.

Web verify flow can fetch an attestation object and compare on-chain hash fields to receipt values.
