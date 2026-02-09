module demo::risk_demo {
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
