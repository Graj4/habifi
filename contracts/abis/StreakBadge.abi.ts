import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const StreakBadgeEvents = [
    {
        name: 'BadgeMinted',
        values: [
            { name: 'tokenId', type: ABIDataTypes.UINT256 },
            { name: 'streak', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
];

export const StreakBadgeAbi = [
    {
        name: 'setMinter',
        inputs: [{ name: 'minterAddress', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'mintBadge',
        inputs: [
            { name: 'recipient', type: ABIDataTypes.ADDRESS },
            { name: 'habitId', type: ABIDataTypes.UINT256 },
            { name: 'streak', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...StreakBadgeEvents,
    ...OP_NET_ABI,
];

export default StreakBadgeAbi;
