import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    NetEvent,
    OP_NET,
    Revert,
    SafeMath,
    StoredString,
    StoredU256,
} from '@btc-vision/btc-runtime/runtime';

// ─── EVENT CLASSES ────────────────────────────────────────────────────────────
@final
class HabitCreatedEvent extends NetEvent {
    constructor(habitId: u256, stakeAmount: u256) {
        const data = new BytesWriter(64);
        data.writeU256(habitId);
        data.writeU256(stakeAmount);
        super('HabitCreated', data);
    }
}

@final
class CheckInEvent extends NetEvent {
    constructor(habitId: u256, newStreak: u256) {
        const data = new BytesWriter(64);
        data.writeU256(habitId);
        data.writeU256(newStreak);
        super('CheckIn', data);
    }
}

@final
class StreakBrokenEvent extends NetEvent {
    constructor(habitId: u256, taxAmount: u256, returned: u256) {
        const data = new BytesWriter(96);
        data.writeU256(habitId);
        data.writeU256(taxAmount);
        data.writeU256(returned);
        super('StreakBroken', data);
    }
}

@final
class YieldClaimedEvent extends NetEvent {
    constructor(amount: u256) {
        const data = new BytesWriter(32);
        data.writeU256(amount);
        super('YieldClaimed', data);
    }
}

@final
class SponsoredEvent extends NetEvent {
    constructor(amount: u256) {
        const data = new BytesWriter(32);
        data.writeU256(amount);
        super('Sponsored', data);
    }
}

@final
class ChallengeIssuedEvent extends NetEvent {
    constructor(challengeId: u256, friend: u256, multiplier: u256) {
        const data = new BytesWriter(96);
        data.writeU256(challengeId);
        data.writeU256(friend);
        data.writeU256(multiplier);
        super('ChallengeIssued', data);
    }
}

@final
class ChallengeAcceptedEvent extends NetEvent {
    constructor(challengeId: u256) {
        const data = new BytesWriter(32);
        data.writeU256(challengeId);
        super('ChallengeAccepted', data);
    }
}

// ─── PRECISION for yield accumulator (MasterChef pattern) ────────────────────
const PRECISION: u256 = u256.fromString('1000000000000000000'); // 1e18

// ─── TAX RATE ─────────────────────────────────────────────────────────────────
const TAX_NUMERATOR: u256   = u256.fromU32(10);
const TAX_DENOMINATOR: u256 = u256.fromU32(100);

// ─── MINIMUM STAKES ───────────────────────────────────────────────────────────
const MIN_PILL_STAKE: u256 = u256.fromString('500000000000000000000'); // 500 PILL (18 decimals)

// ─── LEADERBOARD SIZE ─────────────────────────────────────────────────────────
const LB_SIZE: i32 = 10;

// ─── EMPTY 30-BYTE SUB-POINTER ────────────────────────────────────────────────
function emptySubPointer(): Uint8Array {
    return new Uint8Array(30);
}

// ─── ENCODE u64 AS 30-BYTE SUB-POINTER ───────────────────────────────────────
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

// ─── ENCODE (ADDRESS_FIRST_22_BYTES + u64) AS 30-BYTE SUB-POINTER ─────────────
function addrIdxSub(addr: Address, idx: u64): Uint8Array {
    const buf = new Uint8Array(30);
    for (let i = 0; i < 22; i++) {
        buf[i] = addr[i];
    }
    buf[22] = u8((idx >> 56) & 0xff);
    buf[23] = u8((idx >> 48) & 0xff);
    buf[24] = u8((idx >> 40) & 0xff);
    buf[25] = u8((idx >> 32) & 0xff);
    buf[26] = u8((idx >> 24) & 0xff);
    buf[27] = u8((idx >> 16) & 0xff);
    buf[28] = u8((idx >>  8) & 0xff);
    buf[29] = u8( idx        & 0xff);
    return buf;
}

// ─── ENCODE ADDRESS AS 30-BYTE SUB-POINTER (first 30 bytes of 32-byte addr) ──
function addrSub(addr: Address): Uint8Array {
    const buf = new Uint8Array(30);
    for (let i = 0; i < 30; i++) {
        buf[i] = addr[i];
    }
    return buf;
}

// ─── ENCODE (u64 PRIMARY + u8 FIELD SELECTOR) AS 30-BYTE SUB-POINTER ─────────
function habitFieldSub(habitId: u64, field: u8): Uint8Array {
    const buf = new Uint8Array(30);
    buf[0] = field;
    buf[22] = u8((habitId >> 56) & 0xff);
    buf[23] = u8((habitId >> 48) & 0xff);
    buf[24] = u8((habitId >> 40) & 0xff);
    buf[25] = u8((habitId >> 32) & 0xff);
    buf[26] = u8((habitId >> 24) & 0xff);
    buf[27] = u8((habitId >> 16) & 0xff);
    buf[28] = u8((habitId >>  8) & 0xff);
    buf[29] = u8( habitId        & 0xff);
    return buf;
}

// ─── STORAGE POINTER DECLARATIONS ─────────────────────────────────────────────
// Global counters & accumulators
const PTR_HABIT_COUNT:       u16 = Blockchain.nextPointer; // total habits ever created
const PTR_PILL_POOL:         u16 = Blockchain.nextPointer; // total PILL in redistribution pool
const PTR_TOTAL_STREAK_DAYS: u16 = Blockchain.nextPointer; // sum of all active streak counts
const PTR_ACC_REWARD:        u16 = Blockchain.nextPointer; // accumulated reward per PILL staked (×PRECISION)
const PTR_CHALLENGE_COUNT:   u16 = Blockchain.nextPointer; // total challenges ever created
const PTR_PILL_ADDRESS:      u16 = Blockchain.nextPointer; // PILL token contract address
const PTR_BADGE_ADDRESS:     u16 = Blockchain.nextPointer; // StreakBadge contract address

// Per-habit storage  (subPointer = habitFieldSub(habitId, fieldId))
// fieldId values:
//   0 = streakCount  (u256)
//   1 = lastCheckIn  (u256, block number; 0 if never checked in)
//   2 = stakeAmount  (u256)
//   3 = frequency    (u256, blocks — 144 daily, 1008 weekly)
//   4 = isActive     (u256, 1 = active)
//   5 = createdAt    (u256, block number of habit creation)
const PTR_HABIT_DATA:        u16 = Blockchain.nextPointer;

// Per-habit habit name  (StoredString — indexed by habitId as u64)
const PTR_HABIT_NAME:        u16 = Blockchain.nextPointer;

// Per-habit owner address
const PTR_HABIT_OWNER:       u16 = Blockchain.nextPointer;

// Per-user habit list
const PTR_USER_HABIT_LIST:   u16 = Blockchain.nextPointer; // addrIdxSub(user, idx) → habitId
const PTR_USER_HABIT_COUNT:  u16 = Blockchain.nextPointer; // addrSub(user) → count

// Per-user yield tracking
const PTR_USER_DEBT:         u16 = Blockchain.nextPointer; // accrued reward debt
const PTR_USER_CLAIMABLE:    u16 = Blockchain.nextPointer; // pending claimable PILL
const PTR_MOTO_MILES:        u16 = Blockchain.nextPointer; // moto miles counter

// Leaderboard (10 slots × 2 fields)
const PTR_LB_ADDR:           u16 = Blockchain.nextPointer;
const PTR_LB_STREAK:         u16 = Blockchain.nextPointer;

// Per-challenge storage (subPointer = habitFieldSub(challengeId, fieldId))
// fieldId: 0=from, 1=to, 2=multiplier, 3=baseAmount, 4=expiryBlock, 5=status, 6=issuerLocked
const PTR_CHALLENGE_DATA:    u16 = Blockchain.nextPointer;

const PTR_TOTAL_STAKED:      u16 = Blockchain.nextPointer; // sum of all active PILL stakes

// Per-user incoming challenges index
const PTR_INCOMING_CHALLENGE_LIST:  u16 = Blockchain.nextPointer;
const PTR_INCOMING_CHALLENGE_COUNT: u16 = Blockchain.nextPointer;

// ─── HABIT FIELD SELECTORS ────────────────────────────────────────────────────
const FIELD_STREAK:      u8 = 0;
const FIELD_CHECKIN:     u8 = 1;
const FIELD_STAKE:       u8 = 2;
const FIELD_FREQUENCY:   u8 = 3;
const FIELD_ACTIVE:      u8 = 4;
const FIELD_CREATED_AT:  u8 = 5; // block number when habit was created

// ─── CHALLENGE FIELD SELECTORS ────────────────────────────────────────────────
const CF_FROM:           u8 = 0;
const CF_TO:             u8 = 1;
const CF_MULTIPLIER:     u8 = 2;
const CF_BASE_AMOUNT:    u8 = 3;
const CF_EXPIRY:         u8 = 4;
const CF_STATUS:         u8 = 5;
const CF_ISSUER_LOCKED:  u8 = 6; // PILL locked by the issuer on challenge creation

// ─── CHALLENGE STATUS ─────────────────────────────────────────────────────────
const STATUS_PENDING:    u256 = u256.fromU32(0);
const STATUS_ACCEPTED:   u256 = u256.fromU32(1);
const STATUS_CANCELLED:  u256 = u256.fromU32(2);

// ─── PROTOCOL CONSTANTS ───────────────────────────────────────────────────────
const MAX_HABITS_PER_USER:      u64 = 50;
const CHALLENGE_EXPIRY_BLOCKS:  u64 = 288;  // ~48 hours
const BLOCKS_PER_DAY:           u64 = 144;
const MAX_STREAK:               u256 = u256.fromU32(10000);

// ─── CONTRACT ─────────────────────────────────────────────────────────────────
@final
export class StreakSats extends OP_NET {

    private readonly habitCount:      StoredU256;
    private readonly pillPool:        StoredU256;
    private readonly totalStreakDays: StoredU256;
    private readonly totalStaked:     StoredU256;
    private readonly accReward:       StoredU256;
    private readonly challengeCount:  StoredU256;
    private readonly pillAddress:     StoredU256;
    private readonly badgeAddress:    StoredU256;

    public constructor() {
        super();
        this.habitCount      = new StoredU256(PTR_HABIT_COUNT,       emptySubPointer());
        this.pillPool        = new StoredU256(PTR_PILL_POOL,         emptySubPointer());
        this.totalStreakDays = new StoredU256(PTR_TOTAL_STREAK_DAYS, emptySubPointer());
        this.accReward       = new StoredU256(PTR_ACC_REWARD,        emptySubPointer());
        this.challengeCount  = new StoredU256(PTR_CHALLENGE_COUNT,   emptySubPointer());
        this.pillAddress     = new StoredU256(PTR_PILL_ADDRESS,      emptySubPointer());
        this.badgeAddress    = new StoredU256(PTR_BADGE_ADDRESS,     emptySubPointer());
        this.totalStaked     = new StoredU256(PTR_TOTAL_STAKED,      emptySubPointer());
    }

    public override onDeployment(_calldata: Calldata): void {
        // Deployer sets addresses via setAddresses() after deployment
    }

    // ────────────────────────────────────────────────────────────────────────────
    // ADMIN
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'pillContractAddress',  type: ABIDataTypes.ADDRESS },
        { name: 'badgeContractAddress', type: ABIDataTypes.ADDRESS },
    )
    @returns()
    public setAddresses(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        const pillAddr: Address  = calldata.readAddress();
        const badgeAddr: Address = calldata.readAddress();
        this.pillAddress.value  = u256.fromUint8ArrayBE(pillAddr);
        this.badgeAddress.value = u256.fromUint8ArrayBE(badgeAddr);
        return new BytesWriter(0);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CREATE HABIT
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'name',        type: ABIDataTypes.STRING  },
        { name: 'frequency',   type: ABIDataTypes.STRING  },
        { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'habitId', type: ABIDataTypes.UINT256 })
    @emit('HabitCreated')
    public createHabit(calldata: Calldata): BytesWriter {
        const sender: Address   = Blockchain.tx.sender;
        const name: string      = calldata.readStringWithLength();
        const frequency: string = calldata.readStringWithLength();
        const stakeAmount: u256 = calldata.readU256();

        if (stakeAmount < MIN_PILL_STAKE) throw new Revert('Stake below minimum (500 PILL)');
        if (name.length === 0)            throw new Revert('Habit name cannot be empty');

        const freqBlocks: u64 = frequency === 'daily' ? BLOCKS_PER_DAY : BLOCKS_PER_DAY * 7;

        // Pull PILL tokens from sender
        this._pullPill(sender, stakeAmount);
        this.totalStaked.value = SafeMath.add(this.totalStaked.value, stakeAmount);

        // Assign habit ID
        const habitId: u256 = SafeMath.add(this.habitCount.value, u256.fromU32(1));
        this.habitCount.value = habitId;
        const hid: u64 = habitId.lo1;

        // Settle pending yield before changing user state
        this._settle(sender);

        // Store habit fields
        this._setHabitU256(hid, FIELD_STREAK,     u256.Zero);
        this._setHabitU256(hid, FIELD_CHECKIN,    u256.Zero);
        this._setHabitU256(hid, FIELD_STAKE,      stakeAmount);
        this._setHabitU256(hid, FIELD_FREQUENCY,  u256.fromU64(freqBlocks));
        this._setHabitU256(hid, FIELD_ACTIVE,     u256.fromU32(1));
        this._setHabitU256(hid, FIELD_CREATED_AT, u256.fromU64(Blockchain.block.number));

        // Store habit name
        const nameStore = new StoredString(PTR_HABIT_NAME, hid);
        nameStore.value = name;

        // Store owner
        new StoredU256(PTR_HABIT_OWNER, u64ToSub(hid)).value = u256.fromUint8ArrayBE(sender);

        // Add to user's habit list
        const userCount: u64 = this._getUserHabitCount(sender);
        if (userCount >= MAX_HABITS_PER_USER) throw new Revert('Max habits per user reached');
        this._setUserHabit(sender, userCount, hid);
        this._setUserHabitCount(sender, SafeMath.add(u256.fromU64(userCount), u256.fromU32(1)));

        // Update debt to new total stake × accReward (prevents claiming historical rewards)
        const newTotalStake: u256 = this._getUserTotalActiveStake(sender);
        new StoredU256(PTR_USER_DEBT, addrSub(sender)).value =
            SafeMath.mul(newTotalStake, this.accReward.value);

        Blockchain.emit(new HabitCreatedEvent(habitId, stakeAmount));

        const resp = new BytesWriter(32);
        resp.writeU256(habitId);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CHECK IN
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'habitId', type: ABIDataTypes.UINT256 },
    )
    @returns(
        { name: 'newStreakCount', type: ABIDataTypes.UINT256 },
    )
    @emit('CheckIn')
    public checkIn(calldata: Calldata): BytesWriter {
        const sender: Address = Blockchain.tx.sender;
        const habitId: u256   = calldata.readU256();
        const hid: u64        = habitId.lo1;

        this._requireOwner(hid, sender);
        this._requireActive(hid);

        const lastCheckIn: u64  = this._getHabitU256(hid, FIELD_CHECKIN).lo1;
        const frequency: u64    = this._getHabitU256(hid, FIELD_FREQUENCY).lo1;
        const currentBlock: u64 = Blockchain.block.number;

        // First check-in is always allowed immediately after habit creation.
        // Subsequent check-ins must wait one frequency period from the last check-in.
        if (lastCheckIn !== 0) {
            const windowStart: u64 = lastCheckIn + frequency;
            if (currentBlock < windowStart) throw new Revert('Check-in window not yet open');
        }

        this._settle(sender);

        const oldStreak: u256 = this._getHabitU256(hid, FIELD_STREAK);
        const newStreak: u256 = SafeMath.add(oldStreak, u256.fromU32(1));

        this._setHabitU256(hid, FIELD_STREAK,  newStreak);
        this._setHabitU256(hid, FIELD_CHECKIN, u256.fromU64(currentBlock));

        this.totalStreakDays.value = SafeMath.add(this.totalStreakDays.value, u256.fromU32(1));

        // Increment Moto Miles
        const miles = new StoredU256(PTR_MOTO_MILES, addrSub(sender));
        miles.value = SafeMath.add(miles.value, u256.fromU32(1));

        // Mint soulbound badge at milestones
        const newStreakDays: u64 = newStreak.lo1;
        if (newStreakDays == 7 || newStreakDays == 30 || newStreakDays == 100) {
            this._mintBadge(sender, hid, newStreakDays);
        }

        this._updateLeaderboard(sender, newStreak);

        Blockchain.emit(new CheckInEvent(habitId, newStreak));

        const resp = new BytesWriter(32);
        resp.writeU256(newStreak);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // BREAK STREAK — callable by anyone when window is missed
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'habitId', type: ABIDataTypes.UINT256 },
    )
    @returns(
        { name: 'taxAmount', type: ABIDataTypes.UINT256 },
    )
    @emit('StreakBroken')
    public breakStreak(calldata: Calldata): BytesWriter {
        const habitId: u256   = calldata.readU256();
        const hid: u64        = habitId.lo1;

        this._requireActive(hid);

        const lastCheckIn: u64  = this._getHabitU256(hid, FIELD_CHECKIN).lo1;
        const createdAt: u64    = this._getHabitU256(hid, FIELD_CREATED_AT).lo1;
        const frequency: u64    = this._getHabitU256(hid, FIELD_FREQUENCY).lo1;
        const currentBlock: u64 = Blockchain.block.number;

        // Deadline is 2× frequency after the last action (check-in or creation)
        // This gives users a 2-window grace period before anyone can break their streak
        const lastAction: u64 = lastCheckIn !== 0 ? lastCheckIn : createdAt;
        const deadline: u64   = lastAction + frequency + frequency;
        if (currentBlock < deadline) throw new Revert('Check-in window still open');

        // Get owner
        const ownerU256 = new StoredU256(PTR_HABIT_OWNER, u64ToSub(hid));
        const owner: Address = Address.fromUint8Array(ownerU256.value.toUint8Array(true));

        // Settle pending yield BEFORE changing habit state
        this._settle(owner);

        const stakeAmount: u256 = this._getHabitU256(hid, FIELD_STAKE);
        const taxAmount: u256   = SafeMath.div(SafeMath.mul(stakeAmount, TAX_NUMERATOR), TAX_DENOMINATOR);
        const returned: u256    = SafeMath.sub(stakeAmount, taxAmount);
        const oldStreak: u256   = this._getHabitU256(hid, FIELD_STREAK);

        // Update global totals
        if (this.totalStaked.value >= stakeAmount) {
            this.totalStaked.value = SafeMath.sub(this.totalStaked.value, stakeAmount);
        } else {
            this.totalStaked.value = u256.Zero;
        }
        if (this.totalStreakDays.value >= oldStreak) {
            this.totalStreakDays.value = SafeMath.sub(this.totalStreakDays.value, oldStreak);
        } else {
            this.totalStreakDays.value = u256.Zero;
        }

        // Distribute tax into yield accumulator
        this._addToPool(taxAmount);

        // Return 90% of stake to owner
        this._sendPill(owner, returned);

        // Deactivate habit
        this._setHabitU256(hid, FIELD_ACTIVE, u256.Zero);
        this._setHabitU256(hid, FIELD_STAKE,  u256.Zero);

        // Fix: set debt to remaining active stake × accReward (not zero)
        // Must call AFTER marking habit inactive so _getUserTotalActiveStake excludes it
        const remainingStake: u256 = this._getUserTotalActiveStake(owner);
        new StoredU256(PTR_USER_DEBT, addrSub(owner)).value =
            SafeMath.mul(remainingStake, this.accReward.value);

        this._removeFromLeaderboard(owner);

        Blockchain.emit(new StreakBrokenEvent(habitId, taxAmount, returned));

        const resp = new BytesWriter(32);
        resp.writeU256(taxAmount);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CLAIM YIELD
    // ────────────────────────────────────────────────────────────────────────────
    @method()
    @returns({ name: 'claimed', type: ABIDataTypes.UINT256 })
    @emit('YieldClaimed')
    public claimYield(_calldata: Calldata): BytesWriter {
        const sender: Address = Blockchain.tx.sender;

        this._settle(sender);

        const claimable = new StoredU256(PTR_USER_CLAIMABLE, addrSub(sender));
        const amount: u256 = claimable.value;
        if (amount == u256.Zero) throw new Revert('Nothing to claim');

        claimable.value = u256.Zero;
        this.pillPool.value = SafeMath.sub(this.pillPool.value, amount);

        this._sendPill(sender, amount);

        Blockchain.emit(new YieldClaimedEvent(amount));

        const resp = new BytesWriter(32);
        resp.writeU256(amount);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // SPONSOR — anyone can add PILL to the yield pool
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @returns()
    @emit('Sponsored')
    public sponsor(calldata: Calldata): BytesWriter {
        const sender: Address = Blockchain.tx.sender;
        const amount: u256    = calldata.readU256();
        if (amount == u256.Zero) throw new Revert('Amount cannot be zero');

        this._pullPill(sender, amount);
        this._addToPool(amount);

        Blockchain.emit(new SponsoredEvent(amount));

        return new BytesWriter(0);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CHALLENGE — send a streak challenge to a friend
    // Issuer locks baseAmount PILL as skin in the game
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'friendAddress', type: ABIDataTypes.ADDRESS  },
        { name: 'multiplier',    type: ABIDataTypes.UINT256  },
        { name: 'baseAmount',    type: ABIDataTypes.UINT256  },
    )
    @returns({ name: 'challengeId', type: ABIDataTypes.UINT256 })
    @emit('ChallengeIssued')
    public challenge(calldata: Calldata): BytesWriter {
        const sender: Address      = Blockchain.tx.sender;
        const friend: Address      = calldata.readAddress();
        const multiplierU256: u256 = calldata.readU256();
        const multiplier: u8       = u8(multiplierU256.lo1);
        const baseAmount: u256     = calldata.readU256();

        if (multiplier < 1 || multiplier > 3) throw new Revert('Multiplier must be 1-3');
        if (baseAmount < MIN_PILL_STAKE)       throw new Revert('Base amount below minimum');

        // Lock issuer's baseAmount as skin in the game
        this._pullPill(sender, baseAmount);

        const challengeId: u256 = SafeMath.add(this.challengeCount.value, u256.fromU32(1));
        this.challengeCount.value = challengeId;
        const cid: u64 = challengeId.lo1;

        const expiryBlock: u64 = Blockchain.block.number + CHALLENGE_EXPIRY_BLOCKS;

        this._setChallengeField(cid, CF_FROM,          u256.fromUint8ArrayBE(sender));
        this._setChallengeField(cid, CF_TO,            u256.fromUint8ArrayBE(friend));
        this._setChallengeField(cid, CF_MULTIPLIER,    u256.fromU32(multiplier));
        this._setChallengeField(cid, CF_BASE_AMOUNT,   baseAmount);
        this._setChallengeField(cid, CF_EXPIRY,        u256.fromU64(expiryBlock));
        this._setChallengeField(cid, CF_STATUS,        STATUS_PENDING);
        this._setChallengeField(cid, CF_ISSUER_LOCKED, baseAmount);

        // Index under recipient
        const inIdx: u64 = this._getIncomingCount(friend);
        new StoredU256(PTR_INCOMING_CHALLENGE_LIST, addrIdxSub(friend, inIdx)).value = challengeId;
        new StoredU256(PTR_INCOMING_CHALLENGE_COUNT, addrSub(friend)).value = u256.fromU64(inIdx + 1);

        Blockchain.emit(new ChallengeIssuedEvent(
            challengeId, u256.fromUint8ArrayBE(friend), u256.fromU32(multiplier),
        ));

        const resp = new BytesWriter(32);
        resp.writeU256(challengeId);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // ACCEPT CHALLENGE
    // Both issuer's locked amount and recipient's stake go to the yield pool
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'challengeId', type: ABIDataTypes.UINT256 },
    )
    @returns()
    @emit('ChallengeAccepted')
    public acceptChallenge(calldata: Calldata): BytesWriter {
        const sender: Address   = Blockchain.tx.sender;
        const challengeId: u256 = calldata.readU256();
        const cid: u64          = challengeId.lo1;

        const toU256  = this._getChallengeField(cid, CF_TO);
        const to: Address = Address.fromUint8Array(toU256.toUint8Array(true));
        if (u256.fromUint8ArrayBE(sender) != u256.fromUint8ArrayBE(to)) {
            throw new Revert('Not the challenge recipient');
        }

        const status = this._getChallengeField(cid, CF_STATUS);
        if (status != STATUS_PENDING) throw new Revert('Challenge not pending');

        const expiry: u64 = this._getChallengeField(cid, CF_EXPIRY).lo1;
        if (Blockchain.block.number > expiry) throw new Revert('Challenge expired');

        const multiplier: u256    = this._getChallengeField(cid, CF_MULTIPLIER);
        const baseAmount: u256    = this._getChallengeField(cid, CF_BASE_AMOUNT);
        const required: u256      = SafeMath.mul(baseAmount, multiplier);
        const issuerLocked: u256  = this._getChallengeField(cid, CF_ISSUER_LOCKED);

        // Pull recipient's stake
        this._pullPill(sender, required);

        // Both amounts go to the yield pool (issuer's was already held by the contract)
        this._addToPool(SafeMath.add(required, issuerLocked));

        this._setChallengeField(cid, CF_STATUS, STATUS_ACCEPTED);

        Blockchain.emit(new ChallengeAcceptedEvent(challengeId));

        return new BytesWriter(0);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET CHALLENGE INFO
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'challengeId', type: ABIDataTypes.UINT256 },
    )
    @returns(
        { name: 'fromAddr',   type: ABIDataTypes.UINT256 },
        { name: 'toAddr',     type: ABIDataTypes.UINT256 },
        { name: 'multiplier', type: ABIDataTypes.UINT256 },
        { name: 'baseAmount', type: ABIDataTypes.UINT256 },
        { name: 'expiry',     type: ABIDataTypes.UINT256 },
        { name: 'status',     type: ABIDataTypes.UINT256 },
    )
    public getChallengeInfo(calldata: Calldata): BytesWriter {
        const challengeId: u256 = calldata.readU256();
        const cid: u64          = challengeId.lo1;
        const resp = new BytesWriter(6 * 32);
        resp.writeU256(this._getChallengeField(cid, CF_FROM));
        resp.writeU256(this._getChallengeField(cid, CF_TO));
        resp.writeU256(this._getChallengeField(cid, CF_MULTIPLIER));
        resp.writeU256(this._getChallengeField(cid, CF_BASE_AMOUNT));
        resp.writeU256(this._getChallengeField(cid, CF_EXPIRY));
        resp.writeU256(this._getChallengeField(cid, CF_STATUS));
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET INCOMING CHALLENGES
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'user', type: ABIDataTypes.ADDRESS },
    )
    @returns({ name: 'challengeIds', type: ABIDataTypes.BYTES32 })
    public getIncomingChallenges(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();
        const count: u64    = this._getIncomingCount(user);
        const resp = new BytesWriter(u32(count) * 32);
        for (let i: u64 = 0; i < count; i++) {
            resp.writeU256(new StoredU256(PTR_INCOMING_CHALLENGE_LIST, addrIdxSub(user, i)).value);
        }
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CANCEL CHALLENGE — refunds issuer's locked PILL
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'challengeId', type: ABIDataTypes.UINT256 },
    )
    @returns()
    public cancelChallenge(calldata: Calldata): BytesWriter {
        const sender: Address   = Blockchain.tx.sender;
        const challengeId: u256 = calldata.readU256();
        const cid: u64          = challengeId.lo1;

        const fromU256 = this._getChallengeField(cid, CF_FROM);
        if (u256.fromUint8ArrayBE(sender) != fromU256) throw new Revert('Not the challenger');

        const status = this._getChallengeField(cid, CF_STATUS);
        if (status != STATUS_PENDING) throw new Revert('Challenge not pending');

        // Refund issuer's locked PILL
        const issuerLocked: u256 = this._getChallengeField(cid, CF_ISSUER_LOCKED);
        if (issuerLocked > u256.Zero) {
            this._sendPill(sender, issuerLocked);
            this._setChallengeField(cid, CF_ISSUER_LOCKED, u256.Zero);
        }

        this._setChallengeField(cid, CF_STATUS, STATUS_CANCELLED);

        return new BytesWriter(0);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET LEADERBOARD
    // ────────────────────────────────────────────────────────────────────────────
    @method()
    @returns(
        { name: 'addresses', type: ABIDataTypes.BYTES32 },
        { name: 'streaks',   type: ABIDataTypes.BYTES32 },
    )
    public getLeaderboard(_calldata: Calldata): BytesWriter {
        const resp = new BytesWriter(LB_SIZE * 32 * 2);
        for (let i = 0; i < LB_SIZE; i++) {
            resp.writeU256(new StoredU256(PTR_LB_ADDR,   u64ToSub(u64(i))).value);
            resp.writeU256(new StoredU256(PTR_LB_STREAK, u64ToSub(u64(i))).value);
        }
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET MOTO MILES
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'user', type: ABIDataTypes.ADDRESS },
    )
    @returns({ name: 'miles', type: ABIDataTypes.UINT256 })
    public getMotoMiles(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();
        const resp = new BytesWriter(32);
        resp.writeU256(new StoredU256(PTR_MOTO_MILES, addrSub(user)).value);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET USER HABITS
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'user', type: ABIDataTypes.ADDRESS },
    )
    @returns({ name: 'habitIds', type: ABIDataTypes.BYTES32 })
    public getUserHabits(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();
        const count: u64    = this._getUserHabitCount(user);
        const resp = new BytesWriter(u32(count) * 32);
        for (let i: u64 = 0; i < count; i++) {
            resp.writeU256(new StoredU256(PTR_USER_HABIT_LIST, addrIdxSub(user, i)).value);
        }
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET HABIT INFO — streak, lastCheckIn, stakeAmount, frequency, isActive
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'habitId', type: ABIDataTypes.UINT256 },
    )
    @returns(
        { name: 'streak',      type: ABIDataTypes.UINT256 },
        { name: 'lastCheckIn', type: ABIDataTypes.UINT256 },
        { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
        { name: 'frequency',   type: ABIDataTypes.UINT256 },
        { name: 'isActive',    type: ABIDataTypes.UINT256 },
    )
    public getHabitInfo(calldata: Calldata): BytesWriter {
        const habitId: u256 = calldata.readU256();
        const hid: u64      = habitId.lo1;
        const resp = new BytesWriter(5 * 32);
        resp.writeU256(this._getHabitU256(hid, FIELD_STREAK));
        resp.writeU256(this._getHabitU256(hid, FIELD_CHECKIN));
        resp.writeU256(this._getHabitU256(hid, FIELD_STAKE));
        resp.writeU256(this._getHabitU256(hid, FIELD_FREQUENCY));
        resp.writeU256(this._getHabitU256(hid, FIELD_ACTIVE));
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET HABIT NAME — returns the stored name string for a habit
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'habitId', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'name', type: ABIDataTypes.STRING })
    public getHabitName(calldata: Calldata): BytesWriter {
        const habitId: u256 = calldata.readU256();
        const hid: u64      = habitId.lo1;
        const name: string  = new StoredString(PTR_HABIT_NAME, hid).value;
        const resp = new BytesWriter(name.length * 4 + 4);
        resp.writeStringWithLength(name);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET STATS
    // ────────────────────────────────────────────────────────────────────────────
    @method()
    @returns(
        { name: 'totalStaked',     type: ABIDataTypes.UINT256 },
        { name: 'totalStreakDays', type: ABIDataTypes.UINT256 },
        { name: 'totalHabits',     type: ABIDataTypes.UINT256 },
    )
    public getStats(_calldata: Calldata): BytesWriter {
        const resp = new BytesWriter(3 * 32);
        resp.writeU256(this.totalStaked.value);
        resp.writeU256(this.totalStreakDays.value);
        resp.writeU256(this.habitCount.value);
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET PENDING YIELD
    // ────────────────────────────────────────────────────────────────────────────
    @method(
        { name: 'user', type: ABIDataTypes.ADDRESS },
    )
    @returns({ name: 'pending', type: ABIDataTypes.UINT256 })
    public getPendingYield(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();
        const pending: u256 = this._calcPending(user);
        const claimable     = new StoredU256(PTR_USER_CLAIMABLE, addrSub(user));
        const resp = new BytesWriter(32);
        resp.writeU256(SafeMath.add(claimable.value, pending));
        return resp;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL: MasterChef-style yield settlement
    // ────────────────────────────────────────────────────────────────────────────

    private _calcPending(user: Address): u256 {
        const userStake: u256 = this._getUserTotalActiveStake(user);
        if (userStake == u256.Zero) return u256.Zero;

        const debt        = new StoredU256(PTR_USER_DEBT, addrSub(user));
        const accumulated = SafeMath.mul(userStake, this.accReward.value);
        if (accumulated <= debt.value) return u256.Zero;
        return SafeMath.div(SafeMath.sub(accumulated, debt.value), PRECISION);
    }

    private _settle(user: Address): void {
        const pending: u256 = this._calcPending(user);
        if (pending > u256.Zero) {
            const claimable = new StoredU256(PTR_USER_CLAIMABLE, addrSub(user));
            claimable.value = SafeMath.add(claimable.value, pending);
        }
        const userStake: u256 = this._getUserTotalActiveStake(user);
        new StoredU256(PTR_USER_DEBT, addrSub(user)).value =
            SafeMath.mul(userStake, this.accReward.value);
    }

    private _addToPool(amount: u256): void {
        const total: u256 = this.totalStaked.value;
        if (total > u256.Zero) {
            const addedAcc = SafeMath.div(SafeMath.mul(amount, PRECISION), total);
            this.accReward.value = SafeMath.add(this.accReward.value, addedAcc);
        }
        this.pillPool.value = SafeMath.add(this.pillPool.value, amount);
    }

    private _getUserTotalActiveStake(user: Address): u256 {
        const count: u64 = this._getUserHabitCount(user);
        let total: u256  = u256.Zero;
        for (let i: u64 = 0; i < count; i++) {
            const hid: u64 = new StoredU256(PTR_USER_HABIT_LIST, addrIdxSub(user, i)).value.lo1;
            if (hid == 0) continue;
            if (this._getHabitU256(hid, FIELD_ACTIVE) == u256.Zero) continue;
            total = SafeMath.add(total, this._getHabitU256(hid, FIELD_STAKE));
        }
        return total;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL: Leaderboard (insertion sort on top-10)
    // ────────────────────────────────────────────────────────────────────────────
    private _updateLeaderboard(user: Address, newStreak: u256): void {
        const userU256: u256 = u256.fromUint8ArrayBE(user);

        let userSlot:  i32   = -1;
        let minStreak: u256  = u256.fromString('999999999');
        let minSlot:   i32   = 0;

        for (let i: i32 = 0; i < LB_SIZE; i++) {
            const slotAddr   = new StoredU256(PTR_LB_ADDR,   u64ToSub(u64(i)));
            const slotStreak = new StoredU256(PTR_LB_STREAK, u64ToSub(u64(i)));
            if (slotAddr.value == userU256) userSlot = i;
            if (slotStreak.value < minStreak) {
                minStreak = slotStreak.value;
                minSlot   = i;
            }
        }

        if (userSlot >= 0) {
            new StoredU256(PTR_LB_STREAK, u64ToSub(u64(userSlot))).value = newStreak;
        } else if (newStreak > minStreak) {
            new StoredU256(PTR_LB_ADDR,   u64ToSub(u64(minSlot))).value = userU256;
            new StoredU256(PTR_LB_STREAK, u64ToSub(u64(minSlot))).value = newStreak;
        }
    }

    private _removeFromLeaderboard(user: Address): void {
        const userU256: u256 = u256.fromUint8ArrayBE(user);
        for (let i: i32 = 0; i < LB_SIZE; i++) {
            const slotAddr = new StoredU256(PTR_LB_ADDR, u64ToSub(u64(i)));
            if (slotAddr.value == userU256) {
                slotAddr.value = u256.Zero;
                new StoredU256(PTR_LB_STREAK, u64ToSub(u64(i))).value = u256.Zero;
                return;
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL: Badge minting (cross-contract call to StreakBadge)
    // ────────────────────────────────────────────────────────────────────────────
    private _mintBadge(user: Address, hid: u64, streak: u64): void {
        if (this.badgeAddress.value == u256.Zero) return;
        const badgeAddr: Address = Address.fromUint8Array(this.badgeAddress.value.toUint8Array(true));
        const cd = new BytesWriter(4 + 32 + 32 + 32);
        cd.writeSelector(encodeSelector('mintBadge(address,uint256,uint256)'));
        cd.writeAddress(user);
        cd.writeU256(u256.fromU64(hid));
        cd.writeU256(u256.fromU64(streak));
        Blockchain.call(badgeAddr, cd, false);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL: PILL token transfers
    // ────────────────────────────────────────────────────────────────────────────
    private _pullPill(from: Address, amount: u256): void {
        if (this.pillAddress.value == u256.Zero) throw new Revert('PILL address not set');
        const pillAddr: Address = Address.fromUint8Array(this.pillAddress.value.toUint8Array(true));
        const cd = new BytesWriter(4 + 32 + 32 + 32);
        cd.writeSelector(encodeSelector('transferFrom(address,address,uint256)'));
        cd.writeAddress(from);
        cd.writeAddress(Blockchain.contractAddress);
        cd.writeU256(amount);
        const result = Blockchain.call(pillAddr, cd, true);
        if (!result.success) throw new Revert('PILL transferFrom failed');
    }

    private _sendPill(to: Address, amount: u256): void {
        if (this.pillAddress.value == u256.Zero) throw new Revert('PILL address not set');
        const pillAddr: Address = Address.fromUint8Array(this.pillAddress.value.toUint8Array(true));
        const cd = new BytesWriter(4 + 32 + 32);
        cd.writeSelector(encodeSelector('transfer(address,uint256)'));
        cd.writeAddress(to);
        cd.writeU256(amount);
        const result = Blockchain.call(pillAddr, cd, true);
        if (!result.success) throw new Revert('PILL transfer failed');
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL: Storage helpers
    // ────────────────────────────────────────────────────────────────────────────
    private _getHabitU256(hid: u64, field: u8): u256 {
        return new StoredU256(PTR_HABIT_DATA, habitFieldSub(hid, field)).value;
    }

    private _setHabitU256(hid: u64, field: u8, val: u256): void {
        new StoredU256(PTR_HABIT_DATA, habitFieldSub(hid, field)).value = val;
    }

    private _getChallengeField(cid: u64, field: u8): u256 {
        return new StoredU256(PTR_CHALLENGE_DATA, habitFieldSub(cid, field)).value;
    }

    private _setChallengeField(cid: u64, field: u8, val: u256): void {
        new StoredU256(PTR_CHALLENGE_DATA, habitFieldSub(cid, field)).value = val;
    }

    private _getUserHabitCount(user: Address): u64 {
        return new StoredU256(PTR_USER_HABIT_COUNT, addrSub(user)).value.lo1;
    }

    private _getIncomingCount(user: Address): u64 {
        return new StoredU256(PTR_INCOMING_CHALLENGE_COUNT, addrSub(user)).value.lo1;
    }

    private _setUserHabitCount(user: Address, val: u256): void {
        new StoredU256(PTR_USER_HABIT_COUNT, addrSub(user)).value = val;
    }

    private _setUserHabit(user: Address, idx: u64, hid: u64): void {
        new StoredU256(PTR_USER_HABIT_LIST, addrIdxSub(user, idx)).value = u256.fromU64(hid);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL: Access control
    // ────────────────────────────────────────────────────────────────────────────
    private _requireOwner(hid: u64, caller: Address): void {
        const owner: u256 = new StoredU256(PTR_HABIT_OWNER, u64ToSub(hid)).value;
        if (owner != u256.fromUint8ArrayBE(caller)) throw new Revert('Not habit owner');
    }

    private _requireActive(hid: u64): void {
        if (this._getHabitU256(hid, FIELD_ACTIVE) == u256.Zero) throw new Revert('Habit not active');
    }
}
