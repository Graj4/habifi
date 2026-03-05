import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    NetEvent,
    OP721,
    OP721InitParameters,
    Revert,
    SafeMath,
    StoredU256,
} from '@btc-vision/btc-runtime/runtime';

// ─── EVENT ───────────────────────────────────────────────────────────────────
@final
class BadgeMintedEvent extends NetEvent {
    constructor(tokenId: u256, streak: u256) {
        const data = new BytesWriter(64);
        data.writeU256(tokenId);
        data.writeU256(streak);
        super('BadgeMinted', data);
    }
}

// ─── Helper: encode u64 as 30-byte sub-pointer ───────────────────────────────
function u64ToSub(id: u64): Uint8Array {
    const buf = new Uint8Array(30);
    buf[22] = u8((id >> 56) & 0xff);
    buf[23] = u8((id >> 48) & 0xff);
    buf[24] = u8((id >> 40) & 0xff);
    buf[25] = u8((id >> 32) & 0xff);
    buf[26] = u8((id >> 24) & 0xff);
    buf[27] = u8((id >> 16) & 0xff);
    buf[28] = u8((id >>  8) & 0xff);
    buf[29] = u8( id        & 0xff);
    return buf;
}

function emptySubPointer(): Uint8Array {
    return new Uint8Array(30);
}

// ─── Storage pointers ─────────────────────────────────────────────────────────
const PTR_MINTER: u16 = Blockchain.nextPointer; // authorized minter (StreakSats contract)

// ─── CONTRACT ─────────────────────────────────────────────────────────────────
@final
export class StreakBadge extends OP721 {

    private readonly minter: StoredU256;

    public constructor() {
        super();
        this.minter = new StoredU256(PTR_MINTER, emptySubPointer());
    }

    public override onDeployment(_calldata: Calldata): void {
        this.instantiate(new OP721InitParameters(
            'StreakBadge',
            'SBADGE',
            '',
            u256.fromU32(10000),
        ));
    }

    // ── Set authorized minter (only deployer) ────────────────────────────────
    @method(
        { name: 'minterAddress', type: ABIDataTypes.ADDRESS },
    )
    @returns()
    public setMinter(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        const addr: Address = calldata.readAddress();
        this.minter.value = u256.fromUint8ArrayBE(addr);
        return new BytesWriter(0);
    }

    // ── Mint badge (only callable by authorized minter = StreakSats contract) ─
    @method(
        { name: 'recipient', type: ABIDataTypes.ADDRESS  },
        { name: 'habitId',   type: ABIDataTypes.UINT256  },
        { name: 'streak',    type: ABIDataTypes.UINT256  },
    )
    @returns({ name: 'tokenId', type: ABIDataTypes.UINT256 })
    @emit('BadgeMinted')
    public mintBadge(calldata: Calldata): BytesWriter {
        const caller: Address    = Blockchain.tx.sender;
        const recipient: Address = calldata.readAddress();
        const habitId: u256      = calldata.readU256();
        const streak: u256       = calldata.readU256();

        // Only the authorized minter (StreakSats contract) can mint
        if (u256.fromUint8ArrayBE(caller) != this.minter.value) {
            throw new Revert('Not authorized minter');
        }

        const streakDays: u64 = streak.lo1;
        const badgeLevel: u8  = streakDays >= 100 ? 3 : (streakDays >= 30 ? 2 : 1);

        const badgeName: string = badgeLevel == 3 ? 'Legend' : (badgeLevel == 2 ? 'Dedicated' : 'Consistent');
        const emoji: string     = badgeLevel == 3 ? 'Gold' : (badgeLevel == 2 ? 'Silver' : 'Bronze');
        const blockNum: string  = Blockchain.block.number.toString();

        const uri: string =
            '{"name":"' + badgeName + ' Badge",' +
            '"description":"Soulbound StreakSats achievement. Non-transferable.",' +
            '"level":"' + emoji + '",' +
            '"streak":' + streakDays.toString() + ',' +
            '"habitId":' + habitId.lo1.toString() + ',' +
            '"mintedAtBlock":' + blockNum + '}';

        // Mint: tokenId = totalSupply + 1
        const tokenId: u256 = SafeMath.add(this.totalSupply, u256.One);
        this._mint(recipient, tokenId);
        this._setTokenURI(tokenId, uri);

        Blockchain.emit(new BadgeMintedEvent(tokenId, streak));

        const resp = new BytesWriter(32);
        resp.writeU256(tokenId);
        return resp;
    }

    // ── SOULBOUND: Override _transfer to prevent any transfers ───────────────
    protected override _transfer(from: Address, to: Address, tokenId: u256): void {
        // Allow minting (from == zero address)
        const fromU256 = u256.fromUint8ArrayBE(from);
        if (fromU256.isZero()) {
            super._transfer(from, to, tokenId);
            return;
        }
        throw new Revert('StreakBadge: soulbound - non-transferable');
    }
}
