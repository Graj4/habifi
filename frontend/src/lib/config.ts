// ── Network ───────────────────────────────────────────────────────────────────
import { networks } from '@btc-vision/bitcoin';
export const NETWORK = networks.opnetTestnet;
export const RPC_URL = 'https://testnet.opnet.org';

// ── Contract Addresses ────────────────────────────────────────────────────────
// Replace these with your deployed contract addresses after running:
//   npm run build  (in /contracts)
//   deploy via OP_WALLET
export const STREAK_SATS_ADDRESS  = 'opt1sqzxdtk7qn76k0w3zaa3lpnt08xssjyk32yq7230c';
export const STREAK_BADGE_ADDRESS = 'opt1sqpjskj277j0vsh034y82zvyyeljv0c5hsvlswjuh';
export const PILL_TOKEN_ADDRESS   = '0xb09fc29c112af8293539477e23d8df1d3126639642767d707277131352040cbb';

// ── Constants ─────────────────────────────────────────────────────────────────
export const PILL_DECIMALS     = 18;
export const PILL_DECIMALS_BN  = 10n ** 18n;
export const MIN_PILL_STAKE    = BigInt('500000000000000000000'); // 500 PILL
export const BLOCKS_PER_DAY    = 144;
export const BLOCKS_PER_WEEK   = 1008;

// ── Habit categories ──────────────────────────────────────────────────────────
export const HABIT_CATEGORIES = [
    {
        value: 'exercise',
        label: '🏃 Exercise',
        emoji: '🏃',
        tip: 'Each check-in = at least 20 minutes of physical activity. Walk, run, lift — your stake keeps you accountable.',
    },
    {
        value: 'reading',
        label: '📚 Reading',
        emoji: '📚',
        tip: 'Each check-in = at least 20 pages or 30 minutes of reading. Books, long-form articles, whitepapers — your call.',
    },
    {
        value: 'orange-pilling',
        label: '🍊 Orange-Pilling Friends',
        emoji: '🍊',
        tip: 'Each check-in = one genuine Bitcoin conversation with someone who isn\'t already down the rabbit hole. Share a resource, explain self-custody, or walk them through a wallet setup. Self-reported — your staked PILL is your proof of conviction.',
        highlight: true,
    },
    {
        value: 'no-coffee',
        label: '☕ No Coffee',
        emoji: '☕',
        tip: 'Each check-in = a full day without coffee or caffeine. Discipline in the small things compounds into discipline in the big ones.',
    },
    {
        value: 'meditation',
        label: '🧘 Meditation',
        emoji: '🧘',
        tip: 'Each check-in = at least 10 minutes of mindfulness or breathwork. Low time-preference thinking starts here.',
    },
    {
        value: 'cold-shower',
        label: '🚿 Cold Shower',
        emoji: '🚿',
        tip: 'Each check-in = a full cold shower, no warm-up. Proof of work for your nervous system.',
    },
    {
        value: 'custom',
        label: '✏️ Custom',
        emoji: '✏️',
        tip: 'Define your own habit below. Be specific about what counts as a successful check-in — vague commitments break first.',
    },
] as const;

// ── Badge milestones ──────────────────────────────────────────────────────────
export const BADGE_MILESTONES = [
    { days: 7,   name: 'Consistent', emoji: '🥉', color: '#CD7F32', desc: 'Maintained a 7-day streak' },
    { days: 30,  name: 'Dedicated',  emoji: '🥈', color: '#C0C0C0', desc: 'Maintained a 30-day streak' },
    { days: 100, name: 'Legend',     emoji: '🥇', color: '#FFD700', desc: 'Maintained a 100-day streak' },
] as const;

// ── Moto Miles tiers ──────────────────────────────────────────────────────────
export const MOTO_TIERS = [
    { min: 0,   max: 49,  name: 'Rookie Rider',  tier: 0 },
    { min: 50,  max: 99,  name: 'Street Runner', tier: 1 },
    { min: 100, max: 249, name: 'Moto Pilgrim',  tier: 2 },
    { min: 250, max: Infinity, name: 'Moto Legend', tier: 3 },
] as const;

export function getMotoTier(miles: number) {
    return [...MOTO_TIERS].reverse().find(t => miles >= t.min) ?? MOTO_TIERS[0];
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export function formatAddress(addr: string): string {
    if (!addr || addr.length < 14) return addr;
    return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// Accepts bigint, number, or string — opnet returns UINT256 as plain number
export function formatPill(raw: bigint | number | string): string {
    const n = BigInt(typeof raw === 'number' ? Math.trunc(raw) : raw);
    const whole = n / PILL_DECIMALS_BN;
    const frac  = (n % PILL_DECIMALS_BN).toString().padStart(PILL_DECIMALS, '0').slice(0, 2);
    return `${whole.toLocaleString()}.${frac} PILL`;
}

export function formatSats(sats: number): string {
    if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(4)} BTC`;
    if (sats >= 1_000)       return `${(sats / 1_000).toFixed(1)}k sats`;
    return `${sats} sats`;
}

export function blocksToTime(blocks: number): string {
    const minutes = blocks * 10;
    if (minutes < 60)   return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
}
