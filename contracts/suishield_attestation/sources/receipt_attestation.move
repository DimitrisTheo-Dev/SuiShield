module suishield_attestation::receipt_attestation {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct ReceiptAttestation has key, store {
        id: UID,
        receipt_hash: vector<u8>,
        ruleset_hash: vector<u8>,
        receipt_url: String,
        created_at_ms: u64,
        issuer: address,
    }

    public fun new_attestation(
        receipt_hash: vector<u8>,
        ruleset_hash: vector<u8>,
        receipt_url: String,
        ctx: &mut TxContext,
    ): ReceiptAttestation {
        ReceiptAttestation {
            id: object::new(ctx),
            receipt_hash,
            ruleset_hash,
            receipt_url,
            created_at_ms: tx_context::epoch_timestamp_ms(ctx),
            issuer: tx_context::sender(ctx),
        }
    }

    public entry fun publish_attestation(
        receipt_hash: vector<u8>,
        ruleset_hash: vector<u8>,
        receipt_url: String,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let attestation = new_attestation(receipt_hash, ruleset_hash, receipt_url, ctx);
        transfer::transfer(attestation, sender);
    }

    #[test]
    fun test_publish_attestation() {
        let mut ctx = tx_context::dummy();
        let receipt_hash = b"receipt_hash";
        let ruleset_hash = b"ruleset_hash";
        let receipt_url = string::utf8(b"https://example.com/receipt.json");

        publish_attestation(receipt_hash, ruleset_hash, receipt_url, &mut ctx);
    }
}
