import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------
export type BadgeMintedEvent = {
    readonly tokenId: bigint;
    readonly streak: bigint;
};

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the setMinter function call.
 */
export type SetMinter = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the mintBadge function call.
 */
export type MintBadge = CallResult<
    {
        tokenId: bigint;
    },
    OPNetEvent<BadgeMintedEvent>[]
>;

// ------------------------------------------------------------------
// IStreakBadge
// ------------------------------------------------------------------
export interface IStreakBadge extends IOP_NETContract {
    setMinter(minterAddress: Address): Promise<SetMinter>;
    mintBadge(recipient: Address, habitId: bigint, streak: bigint): Promise<MintBadge>;
}
