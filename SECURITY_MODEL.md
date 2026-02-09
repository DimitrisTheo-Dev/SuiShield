# SuiShield Security Model

## What SuiShield Covers

SuiShield is a deterministic, rule-based scanner for Move package triage. It is designed for:
- fast pre-review signal generation
- reproducible receipts and evidence
- transparent scoring and policy gates (ALLOW/REVIEW/BLOCK)

Current rules detect review-worthy patterns such as:
- transfer/capability-sensitive calls
- shared object exposure patterns
- metadata and manifest consistency issues
- generic risky string/regex patterns

## What SuiShield Does Not Claim

SuiShield is **not**:
- a complete formal verification framework
- a full smart contract audit
- proof of exploitability

A low-risk score does not imply absence of vulnerabilities.

## Threat/Abuse Controls

Scanner applies abuse limits:
- zipball size cap
- total file cap
- filtered package byte cap
- total scanned line cap
- network fetch timeout
- end-to-end scan timeout
- API scan rate limit (20 requests / 5 minutes per IP key)
- package path scoping
- safe-regex constraints

If a repository exceeds limits or times out, scanning stops immediately and an actionable error is returned.

These controls reduce denial-of-service and non-deterministic behavior risk.

## Trust Boundaries

- GitHub snapshot data is treated as untrusted input.
- Receipt hashes protect integrity of canonicalized scanner output.
- Optional Sui attestation extends integrity checks on-chain but does not replace code review.

## Intended Usage

Use SuiShield as an early-stage security signal and compliance artifact generator before manual review and deeper testing.
