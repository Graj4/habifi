import { ABIDataTypes, type BitcoinInterfaceAbi } from 'opnet';

const F = 'function' as const;

// ── StreakSats contract ABI ───────────────────────────────────────────────────
export const STREAK_SATS_ABI: BitcoinInterfaceAbi = ([
    {
        type: F, name: 'setAddresses',
        inputs: [
            { name: 'pillContractAddress',  type: ABIDataTypes.ADDRESS },
            { name: 'badgeContractAddress', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [],
    },
    {
        type: F, name: 'createHabit',
        inputs: [
            { name: 'name',        type: ABIDataTypes.STRING  },
            { name: 'frequency',   type: ABIDataTypes.STRING  },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'checkIn',
        inputs:  [{ name: 'habitId',       type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'newStreakCount', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'breakStreak',
        inputs:  [{ name: 'habitId',   type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'taxAmount', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'claimYield',
        inputs:  [],
        outputs: [{ name: 'claimed', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'sponsor',
        inputs:  [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [],
    },
    {
        type: F, name: 'challenge',
        inputs: [
            { name: 'friendAddress', type: ABIDataTypes.ADDRESS },
            { name: 'multiplier',    type: ABIDataTypes.UINT256 },
            { name: 'baseAmount',    type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'acceptChallenge',
        inputs:  [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        outputs: [],
    },
    {
        type: F, name: 'getChallengeInfo',
        inputs:  [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'fromAddr',   type: ABIDataTypes.UINT256 },
            { name: 'toAddr',     type: ABIDataTypes.UINT256 },
            { name: 'multiplier', type: ABIDataTypes.UINT256 },
            { name: 'baseAmount', type: ABIDataTypes.UINT256 },
            { name: 'expiry',     type: ABIDataTypes.UINT256 },
            { name: 'status',     type: ABIDataTypes.UINT256 },
        ],
    },
    {
        type: F, name: 'getIncomingChallenges',
        inputs:  [{ name: 'user',         type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'challengeIds', type: ABIDataTypes.BYTES32 }],
    },
    {
        type: F, name: 'cancelChallenge',
        inputs:  [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        outputs: [],
    },
    {
        type: F, name: 'getLeaderboard',
        inputs:  [],
        outputs: [], // raw 640 bytes: 10 × (addr u256, streak u256) — parsed manually
    },
    {
        type: F, name: 'getMotoMiles',
        inputs:  [{ name: 'user',  type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'miles', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'getUserHabits',
        inputs:  [{ name: 'user',     type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'habitIds', type: ABIDataTypes.BYTES32 }],
    },
    {
        type: F, name: 'getHabitInfo',
        inputs: [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'streak',      type: ABIDataTypes.UINT256 },
            { name: 'lastCheckIn', type: ABIDataTypes.UINT256 },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
            { name: 'frequency',   type: ABIDataTypes.UINT256 },
            { name: 'isActive',    type: ABIDataTypes.UINT256 },
        ],
    },
    {
        type: F, name: 'getHabitName',
        inputs:  [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'name',    type: ABIDataTypes.STRING  }],
    },
    {
        type: F, name: 'getStats',
        inputs: [],
        outputs: [
            { name: 'totalStaked',     type: ABIDataTypes.UINT256 },
            { name: 'totalStreakDays', type: ABIDataTypes.UINT256 },
            { name: 'totalHabits',     type: ABIDataTypes.UINT256 },
        ],
    },
    {
        type: F, name: 'getPendingYield',
        inputs:  [{ name: 'user',    type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'pending', type: ABIDataTypes.UINT256 }],
    },
    // ── Group Habit Pools ──────────────────────────────────────────────────────
    {
        type: F, name: 'createGroupHabit',
        inputs: [
            { name: 'name',         type: ABIDataTypes.STRING  },
            { name: 'frequency',    type: ABIDataTypes.STRING  },
            { name: 'durationDays', type: ABIDataTypes.UINT256 },
            { name: 'minStake',     type: ABIDataTypes.UINT256 },
            { name: 'maxPlayers',   type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'joinGroupHabit',
        inputs: [
            { name: 'groupId',     type: ABIDataTypes.UINT256 },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
    },
    {
        type: F, name: 'startGroupHabit',
        inputs:  [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
        outputs: [],
    },
    {
        type: F, name: 'cancelGroupHabit',
        inputs:  [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
        outputs: [],
    },
    {
        type: F, name: 'checkInGroup',
        inputs:  [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
        outputs: [],
    },
    {
        type: F, name: 'eliminateGroupMember',
        inputs: [
            { name: 'groupId',       type: ABIDataTypes.UINT256 },
            { name: 'memberAddress', type: ABIDataTypes.ADDRESS  },
        ],
        outputs: [],
    },
    {
        type: F, name: 'claimGroupWinnings',
        inputs:  [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'claimed', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'getGroupInfo',
        inputs:  [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'frequency',     type: ABIDataTypes.UINT256 },
            { name: 'duration',      type: ABIDataTypes.UINT256 },
            { name: 'minStake',      type: ABIDataTypes.UINT256 },
            { name: 'maxPlayers',    type: ABIDataTypes.UINT256 },
            { name: 'status',        type: ABIDataTypes.UINT256 },
            { name: 'startBlock',    type: ABIDataTypes.UINT256 },
            { name: 'totalPool',     type: ABIDataTypes.UINT256 },
            { name: 'memberCount',   type: ABIDataTypes.UINT256 },
            { name: 'survivorCount', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        type: F, name: 'getGroupMembers',
        inputs:  [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'members', type: ABIDataTypes.BYTES32 }],
    },
    {
        type: F, name: 'getGroupName',
        inputs:  [{ name: 'groupId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'name',    type: ABIDataTypes.STRING  }],
    },
] as unknown) as BitcoinInterfaceAbi;

// ── PILL token ABI (OP20 subset) ─────────────────────────────────────────────
// Note: OP20 uses increaseAllowance instead of approve
export const PILL_TOKEN_ABI: BitcoinInterfaceAbi = ([
    {
        type: F, name: 'increaseAllowance',
        inputs: [
            { name: 'spender', type: ABIDataTypes.ADDRESS },
            { name: 'amount',  type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
    },
    {
        type: F, name: 'allowance',
        inputs: [
            { name: 'owner',   type: ABIDataTypes.ADDRESS },
            { name: 'spender', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [{ name: 'remaining', type: ABIDataTypes.UINT256 }],
    },
] as unknown) as BitcoinInterfaceAbi;

// ── StreakBadge contract ABI ──────────────────────────────────────────────────
export const STREAK_BADGE_ABI: BitcoinInterfaceAbi = ([
    {
        type: F, name: 'setMinter',
        inputs:  [{ name: 'minterAddress', type: ABIDataTypes.ADDRESS }],
        outputs: [],
    },
    {
        type: F, name: 'mintBadge',
        inputs: [
            { name: 'recipient', type: ABIDataTypes.ADDRESS },
            { name: 'habitId',   type: ABIDataTypes.UINT256 },
            { name: 'streak',    type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'balanceOf',
        inputs:  [{ name: 'owner',   type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'balance', type: ABIDataTypes.UINT256 }],
    },
    {
        type: F, name: 'ownerOf',
        inputs:  [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'owner',   type: ABIDataTypes.ADDRESS }],
    },
    {
        type: F, name: 'tokenURI',
        inputs:  [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'uri',     type: ABIDataTypes.STRING  }],
    },
] as unknown) as BitcoinInterfaceAbi;
