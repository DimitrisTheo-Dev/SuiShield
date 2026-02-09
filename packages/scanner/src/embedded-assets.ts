export const EMBEDDED_RULESET_RAW = `{
  "version": "suishield-ruleset-2026-01-27",
  "rules": [
    {
      "id": "SS001",
      "severity": "high",
      "title": "Public transfer call in module",
      "description": "Direct public transfer patterns should be reviewed for authorization checks.",
      "kind": "substring",
      "pattern": "transfer::public_transfer",
      "applies_to": "move",
      "remediation": "Gate transfer paths with explicit capability or role checks."
    },
    {
      "id": "SS002",
      "severity": "medium",
      "title": "Shared object publication",
      "description": "Sharing objects expands write surface and needs access control review.",
      "kind": "substring",
      "pattern": "transfer::share_object",
      "applies_to": "move",
      "remediation": "Validate ownership and lifecycle constraints before sharing."
    },
    {
      "id": "SS003",
      "severity": "high",
      "title": "Treasury capability usage",
      "description": "Treasury capability operations can mint or manage supply-sensitive assets.",
      "kind": "substring",
      "pattern": "coin::TreasuryCap",
      "applies_to": "move",
      "remediation": "Restrict treasury operations to tightly controlled flows."
    },
    {
      "id": "SS004",
      "severity": "medium",
      "title": "Admin capability struct detected",
      "description": "Capability structs should have careful creation and transfer paths.",
      "kind": "regex",
      "pattern": "struct\\\\s+\\\\w*(Admin|Cap)\\\\w*\\\\s+has",
      "flags": "i",
      "applies_to": "move",
      "remediation": "Document capability ownership and non-forgeability assumptions."
    },
    {
      "id": "SS005",
      "severity": "medium",
      "title": "Public entry function with signer context",
      "description": "Public entry functions should validate caller expectations and side effects.",
      "kind": "regex",
      "pattern": "public\\\\s+entry\\\\s+fun\\\\s+",
      "applies_to": "move",
      "remediation": "Add guard conditions and invariants for each public entry path."
    },
    {
      "id": "SS006",
      "severity": "low",
      "title": "Event emission in entry flow",
      "description": "Event payloads may leak sensitive state if not curated.",
      "kind": "substring",
      "pattern": "event::emit",
      "applies_to": "move",
      "remediation": "Ensure emitted data is intentional and non-sensitive."
    },
    {
      "id": "SS007",
      "severity": "high",
      "title": "Clock usage for access timing",
      "description": "Time-based logic can be bypassed if assumptions around timestamp drift are weak.",
      "kind": "substring",
      "pattern": "clock::timestamp_ms",
      "applies_to": "move",
      "remediation": "Define acceptable timing windows and fallback paths."
    },
    {
      "id": "SS008",
      "severity": "medium",
      "title": "Dynamic field write detected",
      "description": "Dynamic fields can hide object graph complexity and authorization gaps.",
      "kind": "substring",
      "pattern": "dynamic_field::add",
      "applies_to": "move",
      "remediation": "Constrain dynamic keys and ensure full access checks on reads/writes."
    },
    {
      "id": "SS009",
      "severity": "medium",
      "title": "Dynamic field read detected",
      "description": "Dynamic field reads should validate ownership and expected key domains.",
      "kind": "substring",
      "pattern": "dynamic_field::borrow",
      "applies_to": "move",
      "remediation": "Validate key provenance and object ownership before reads."
    },
    {
      "id": "SS010",
      "severity": "high",
      "title": "Object delete usage",
      "description": "Deleting objects can invalidate invariants if not tightly controlled.",
      "kind": "substring",
      "pattern": "object::delete",
      "applies_to": "move",
      "remediation": "Restrict delete paths and prove lifecycle invariants."
    },
    {
      "id": "SS011",
      "severity": "medium",
      "title": "Assert usage in critical logic",
      "description": "Asserts should return meaningful abort codes and preserve state safety.",
      "kind": "substring",
      "pattern": "assert!",
      "applies_to": "move",
      "remediation": "Review abort code taxonomy and edge case coverage."
    },
    {
      "id": "SS012",
      "severity": "low",
      "title": "TODO marker in source",
      "description": "TODO markers may indicate unfinished security-relevant work.",
      "kind": "substring",
      "pattern": "TODO",
      "applies_to": "move",
      "remediation": "Resolve TODO items or document risk acceptance before release."
    },
    {
      "id": "SS013",
      "severity": "low",
      "title": "FIXME marker in source",
      "description": "FIXME markers may indicate known defects in logic.",
      "kind": "substring",
      "pattern": "FIXME",
      "applies_to": "move",
      "remediation": "Address FIXMEs prior to production usage."
    },
    {
      "id": "SS014",
      "severity": "medium",
      "title": "Potential friend declaration",
      "description": "Friend visibility widens trusted boundary and should be minimal.",
      "kind": "regex",
      "pattern": "^\\\\s*friend\\\\s+",
      "flags": "im",
      "applies_to": "move",
      "remediation": "Minimize friend relationships and document trust assumptions."
    },
    {
      "id": "SS015",
      "severity": "medium",
      "title": "Potential package dependency mismatch",
      "description": "Move manifest dependencies should pin expected sources.",
      "kind": "regex",
      "pattern": "^\\\\s*\\\\[dependencies\\\\]",
      "flags": "im",
      "applies_to": "manifest",
      "remediation": "Review dependency provenance and versioning strategy."
    },
    {
      "id": "SS016",
      "severity": "low",
      "title": "Manifest edition not explicit",
      "description": "Move edition should be explicit for reproducible builds.",
      "kind": "regex",
      "pattern": "edition\\\\s*=\\\\s*\\\"2024\\\"",
      "applies_to": "manifest",
      "negate": true,
      "remediation": "Set edition = \\\"2024\\\" in Move.toml."
    },
    {
      "id": "SS017",
      "severity": "high",
      "title": "Direct sender usage",
      "description": "tx_context::sender-based authorization should be reviewed for spoof assumptions.",
      "kind": "substring",
      "pattern": "tx_context::sender",
      "applies_to": "move",
      "remediation": "Pair sender checks with capability/object ownership checks."
    },
    {
      "id": "SS018",
      "severity": "medium",
      "title": "Receive API usage",
      "description": "Receive flows may introduce object ownership complexity.",
      "kind": "substring",
      "pattern": "transfer::receive",
      "applies_to": "move",
      "remediation": "Validate ownership transitions and object authenticity."
    },
    {
      "id": "SS019",
      "severity": "medium",
      "title": "Public freeze object usage",
      "description": "Object freezing is irreversible and should be policy-driven.",
      "kind": "substring",
      "pattern": "transfer::public_freeze_object",
      "applies_to": "move",
      "remediation": "Restrict freeze operations behind clear governance checks."
    },
    {
      "id": "SS020",
      "severity": "high",
      "title": "Mint call detected",
      "description": "Mint operations affect supply and must be gated.",
      "kind": "substring",
      "pattern": "coin::mint",
      "applies_to": "move",
      "remediation": "Restrict mint permissions and enforce supply controls."
    },
    {
      "id": "SS021",
      "severity": "medium",
      "title": "Burn call detected",
      "description": "Burn operations should track accounting and authorization.",
      "kind": "substring",
      "pattern": "coin::burn",
      "applies_to": "move",
      "remediation": "Ensure burn permissions and accounting invariants are documented."
    },
    {
      "id": "SS022",
      "severity": "low",
      "title": "Any unsafe keyword marker",
      "description": "Use of unsafe-like naming may indicate bypass behavior.",
      "kind": "regex",
      "pattern": "\\\\bunsafe\\\\b",
      "flags": "i",
      "applies_to": "any",
      "remediation": "Review unsafe-marked code paths for explicit safeguards."
    },
    {
      "id": "SS023",
      "severity": "medium",
      "title": "Broad public function surface",
      "description": "Large public API surfaces increase review burden.",
      "kind": "regex",
      "pattern": "^\\\\s*public\\\\s+fun\\\\s+",
      "flags": "im",
      "applies_to": "move",
      "remediation": "Minimize public entry points and isolate sensitive internals."
    },
    {
      "id": "SS024",
      "severity": "low",
      "title": "Capability keyword usage",
      "description": "Capability-oriented design should prevent accidental transfer.",
      "kind": "regex",
      "pattern": "\\\\bCap\\\\b|\\\\bCapability\\\\b",
      "flags": "i",
      "applies_to": "move",
      "remediation": "Audit capability minting, storage, and transfer controls."
    },
    {
      "id": "SS025",
      "severity": "high",
      "title": "Shared object + public transfer pattern",
      "description": "Combined shared object and public transfer behavior deserves immediate review.",
      "kind": "regex",
      "pattern": "share_object|public_transfer",
      "flags": "i",
      "applies_to": "move",
      "remediation": "Review interaction of shared state and unrestricted transfers."
    }
  ]
}
`;

export const EMBEDDED_DEMO_FIXTURE = {
  moveToml: `[package]
name = "DemoRiskyPackage"
edition = "2024"
version = "0.0.1"

[addresses]
demo = "0x0"

[dependencies]
Sui = { local = "../../../../contracts/suishield_attestation/sources" }
`,
  riskDemoMove: `module demo::risk_demo {
    use sui::coin::{Self, TreasuryCap};
    use sui::dynamic_field;
    use sui::event;
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct State has key, store {
        id: UID,
        counter: u64,
    }

    public entry fun risky_transfer(cap: &mut TreasuryCap<SUI>, state: &mut State, amount: u64, ctx: &mut TxContext) {
        let recipient = tx_context::sender(ctx);
        let coin = coin::mint(cap, amount, ctx);
        transfer::public_transfer(coin, recipient);

        state.counter = state.counter + amount;
        event::emit(amount);
        dynamic_field::add(&mut state.id, b"key", amount);
        assert!(amount > 0, 1);
        object::delete(state.id);
        // TODO tighten checks
    }

    public fun unsafe_share(state: State) {
        transfer::share_object(state);
    }
}
`,
  safeHelpersMove: `module demo::safe_helpers {
    public fun sum(a: u64, b: u64): u64 {
        a + b
    }
}
`,
} as const;
