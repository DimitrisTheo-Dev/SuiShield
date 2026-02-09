module suishield_attestation::receipt_attestation {
    public struct ReceiptAttestation has key, store {
        id: sui::object::UID,
        receipt_hash: vector<u8>,
        ruleset_hash: vector<u8>,
        receipt_url: std::string::String,
        created_at_ms: u64,
        issuer: address,
    }

    public fun new_attestation(
        receipt_hash: vector<u8>,
        ruleset_hash: vector<u8>,
        receipt_url: std::string::String,
        ctx: &mut sui::tx_context::TxContext,
    ): ReceiptAttestation {
        ReceiptAttestation {
            id: sui::object::new(ctx),
            receipt_hash,
            ruleset_hash,
            receipt_url,
            created_at_ms: sui::tx_context::epoch_timestamp_ms(ctx),
            issuer: sui::tx_context::sender(ctx),
        }
    }

    public entry fun publish_attestation(
        receipt_hash: vector<u8>,
        ruleset_hash: vector<u8>,
        receipt_url: std::string::String,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let sender = sui::tx_context::sender(ctx);
        let attestation = new_attestation(receipt_hash, ruleset_hash, receipt_url, ctx);
        sui::transfer::transfer(attestation, sender);
    }

    #[test]
    fun test_publish_attestation() {
        let mut ctx = sui::tx_context::dummy();
        let receipt_hash = b"receipt_hash";
        let ruleset_hash = b"ruleset_hash";
        let receipt_url = std::string::utf8(b"https://example.com/receipt.json");

        publish_attestation(receipt_hash, ruleset_hash, receipt_url, &mut ctx);
    }
}
