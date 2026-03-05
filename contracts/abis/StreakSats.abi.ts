import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const StreakSatsEvents = [
    {
        name: 'HabitCreated',
        values: [
            { name: 'habitId', type: ABIDataTypes.UINT256 },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'CheckIn',
        values: [
            { name: 'habitId', type: ABIDataTypes.UINT256 },
            { name: 'newStreak', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'StreakBroken',
        values: [
            { name: 'habitId', type: ABIDataTypes.UINT256 },
            { name: 'taxAmount', type: ABIDataTypes.UINT256 },
            { name: 'returned', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'YieldClaimed',
        values: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Sponsored',
        values: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'ChallengeIssued',
        values: [
            { name: 'challengeId', type: ABIDataTypes.UINT256 },
            { name: 'friend', type: ABIDataTypes.UINT256 },
            { name: 'multiplier', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'ChallengeAccepted',
        values: [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Event,
    },
];

export const StreakSatsAbi = [
    {
        name: 'setAddresses',
        inputs: [
            { name: 'pillContractAddress', type: ABIDataTypes.ADDRESS },
            { name: 'badgeContractAddress', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'createHabit',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'frequency', type: ABIDataTypes.STRING },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'checkIn',
        inputs: [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'newStreakCount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'breakStreak',
        inputs: [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'taxAmount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimYield',
        inputs: [],
        outputs: [{ name: 'claimed', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'sponsor',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'challenge',
        inputs: [
            { name: 'friendAddress', type: ABIDataTypes.ADDRESS },
            { name: 'multiplier', type: ABIDataTypes.UINT256 },
            { name: 'baseAmount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'acceptChallenge',
        inputs: [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getChallengeInfo',
        inputs: [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'fromAddr', type: ABIDataTypes.UINT256 },
            { name: 'toAddr', type: ABIDataTypes.UINT256 },
            { name: 'multiplier', type: ABIDataTypes.UINT256 },
            { name: 'baseAmount', type: ABIDataTypes.UINT256 },
            { name: 'expiry', type: ABIDataTypes.UINT256 },
            { name: 'status', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getIncomingChallenges',
        inputs: [{ name: 'user', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'challengeIds', type: ABIDataTypes.BYTES32 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'cancelChallenge',
        inputs: [{ name: 'challengeId', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getLeaderboard',
        inputs: [],
        outputs: [
            { name: 'addresses', type: ABIDataTypes.BYTES32 },
            { name: 'streaks', type: ABIDataTypes.BYTES32 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMotoMiles',
        inputs: [{ name: 'user', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'miles', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserHabits',
        inputs: [{ name: 'user', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'habitIds', type: ABIDataTypes.BYTES32 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getHabitInfo',
        inputs: [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'streak', type: ABIDataTypes.UINT256 },
            { name: 'lastCheckIn', type: ABIDataTypes.UINT256 },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
            { name: 'frequency', type: ABIDataTypes.UINT256 },
            { name: 'isActive', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getHabitName',
        inputs: [{ name: 'habitId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'name', type: ABIDataTypes.STRING }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getStats',
        inputs: [],
        outputs: [
            { name: 'totalStaked', type: ABIDataTypes.UINT256 },
            { name: 'totalStreakDays', type: ABIDataTypes.UINT256 },
            { name: 'totalHabits', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPendingYield',
        inputs: [{ name: 'user', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'pending', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...StreakSatsEvents,
    ...OP_NET_ABI,
];

export default StreakSatsAbi;
