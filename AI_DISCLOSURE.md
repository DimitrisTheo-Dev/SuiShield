# AI Disclosure

## Tool name

Codex (OpenAI coding agent)

## Model version

GPT-5 (5.3) (Codex runtime)

## Key prompts

- Structure repository based on Sui Track for hackathon submission (named SuiShield).
- Enforce Move 2024 compatibility and latest official Sui SDK package names.
- Implement deterministic scanner, canonical receipt hashing, verify flow, Supabase migrations, CI, and deployment docs.

## Human review

- Humans reviewed all smart contract logic (`contracts/suishield_attestation`) and deployment configuration before release.
- Humans reviewed scanner rules and determinism behavior (`packages/scanner`, `packages/receipt`) and validated stable hashes with tests.
- Humans reviewed production configuration and secrets handling for Next.js + Supabase + Vercel before deployment.
- Humans validated end-to-end demo flow (scan, receipt view, verify, attestation publish/reference save) before submission.
