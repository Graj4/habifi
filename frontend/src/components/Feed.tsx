import { useCallback, useEffect, useState } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import { STREAK_SATS_ADDRESS, NETWORK, RPC_URL, formatAddress, formatPill } from '../lib/config';
import { STREAK_SATS_ABI } from '../lib/abi';
import { LeaderboardContent } from './Leaderboard';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FeedEntry {
    address:     string;
    habitName:   string;
    streak:      number;
    stakeAmount: bigint;
    lastCheckIn: number; // block number
    isActive:    boolean;
}

// ─── Provider ────────────────────────────────────────────────────────────────
let _provider: JSONRpcProvider | null = null;
function getProvider() {
    if (!_provider) _provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
    return _provider;
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────
async function fetchFeed(): Promise<FeedEntry[]> {
    if (!STREAK_SATS_ADDRESS) return [];
    const provider = getProvider();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK) as any;

    // 1. Get leaderboard users
    const lbResult = await contract.getLeaderboard();
    const reader = lbResult?.result;
    if (!reader || typeof reader.bytesLeft !== 'function') return [];

    const userAddrs: string[] = [];
    for (let i = 0; i < 10; i++) {
        if (reader.bytesLeft() < 64) break;
        const addrBytes: Uint8Array = reader.readBytes(32);
        reader.readU256(); // skip streak
        const streak = 0; // not used here
        void streak;
        const hex = Array.from(addrBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        if (hex !== '0'.repeat(64)) userAddrs.push('0x' + hex);
    }

    if (userAddrs.length === 0) return [];

    // 2. For each user, fetch their habits
    const entries: FeedEntry[] = [];

    await Promise.all(userAddrs.map(async (userHex) => {
        try {
            const senderAddr = await provider.getPublicKeyInfo(userHex, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userContract = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;

            const idsResult = await userContract.getUserHabits(senderAddr);
            const habitIds: bigint[] = [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const firstIdBytes: Uint8Array | undefined = (idsResult as any).properties?.habitIds;
            if (firstIdBytes instanceof Uint8Array && firstIdBytes.length === 32) {
                const id = BigInt('0x' + Array.from(firstIdBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
                if (id > 0n) habitIds.push(id);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r2 = (idsResult as any).result;
            if (r2 && typeof r2.bytesLeft === 'function') {
                while (r2.bytesLeft() >= 32) {
                    const id: bigint = r2.readU256();
                    if (id > 0n) habitIds.push(id);
                }
            }

            for (const hid of habitIds) {
                try {
                    const [infoRes, nameRes] = await Promise.all([
                        userContract.getHabitInfo(hid),
                        userContract.getHabitName(hid),
                    ]);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const info = (infoRes as any)?.properties;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const name = (nameRes as any)?.properties?.name ?? '';
                    if (!info) continue;
                    entries.push({
                        address:     userHex,
                        habitName:   name || 'Unnamed Habit',
                        streak:      Number(info.streak      ?? 0),
                        stakeAmount: BigInt(String(info.stakeAmount ?? 0)),
                        lastCheckIn: Number(info.lastCheckIn ?? 0),
                        isActive:    Number(info.isActive    ?? 0) !== 0,
                    });
                } catch { /* skip this habit */ }
            }
        } catch { /* skip this user */ }
    }));

    // Sort by lastCheckIn descending (most recent first)
    return entries
        .filter(e => e.isActive && e.lastCheckIn > 0)
        .sort((a, b) => b.lastCheckIn - a.lastCheckIn);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function streakEmoji(streak: number): string {
    if (streak >= 100) return '🏆';
    if (streak >= 30)  return '💎';
    if (streak >= 7)   return '🔥';
    return '⚡';
}

function streakColor(streak: number): string {
    if (streak >= 100) return 'var(--orange)';
    if (streak >= 30)  return '#a78bfa';
    if (streak >= 7)   return 'var(--green)';
    return 'var(--text-muted)';
}

function blockAgo(block: number, currentBlock: number): string {
    if (!currentBlock || !block) return 'recently';
    const diff = currentBlock - block;
    if (diff <= 0)   return 'just now';
    if (diff < 6)    return `~${diff * 10}m ago`;
    if (diff < 144)  return `~${Math.round(diff / 6)}h ago`;
    return `~${Math.round(diff / 144)}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Feed() {
    const [tab,          setTab]          = useState<'feed' | 'leaderboard'>('feed');
    const [entries,      setEntries]      = useState<FeedEntry[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [currentBlock, setCurrentBlock] = useState(0);
    const [lastRefresh,  setLastRefresh]  = useState<Date | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Try to get current block height for time estimates
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bn = await (getProvider() as any).getBlockNumber?.().catch?.(() => 0);
            if (bn) setCurrentBlock(Number(bn));
        } catch { /* optional */ }
        try {
            const data = await fetchFeed();
            setEntries(data);
            setLastRefresh(new Date());
        } catch (e) {
            console.error('Feed load error:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { void load(); }, [load]);

    // Auto-refresh every 60s
    useEffect(() => {
        const id = setInterval(() => void load(), 60_000);
        return () => clearInterval(id);
    }, [load]);

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Community</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Live activity and leaderboard from Bitcoin L1
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['feed', 'leaderboard'] as const).map(t => (
                    <button
                        key={t}
                        className="btn btn-sm"
                        onClick={() => setTab(t)}
                        style={{
                            background: tab === t ? 'var(--primary)' : 'var(--bg3)',
                            color:      tab === t ? '#fff' : 'var(--text-muted)',
                            border:     '1px solid ' + (tab === t ? 'var(--primary)' : 'var(--border2)'),
                            fontWeight: tab === t ? 700 : 500,
                        }}
                    >
                        {t === 'feed' ? '📡 Activity' : '🏆 Leaderboard'}
                    </button>
                ))}
                {tab === 'feed' && (
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => void load()}
                        disabled={loading}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {loading ? <span className="spinner" /> : '↻'} Refresh
                    </button>
                )}
            </div>

            {tab === 'leaderboard' ? <LeaderboardContent /> : loading && entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-dim)' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
                    <div style={{ fontWeight: 600 }}>Loading community activity…</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>Querying Bitcoin L1</div>
                </div>
            ) : entries.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 56 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No activity yet</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        Be the first to create and check in to a habit!
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {entries.map((e, i) => (
                        <div
                            key={i}
                            className="card"
                            style={{
                                display:    'flex',
                                alignItems: 'center',
                                gap:        16,
                                padding:    '14px 18px',
                                animation:  `fadeIn 0.3s ease ${i * 0.04}s both`,
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width:        42,
                                height:       42,
                                borderRadius: '50%',
                                background:   'linear-gradient(135deg, var(--primary), var(--green))',
                                display:      'flex',
                                alignItems:   'center',
                                justifyContent: 'center',
                                fontWeight:   800,
                                fontSize:     14,
                                color:        '#fff',
                                flexShrink:   0,
                                fontFamily:   'monospace',
                            }}>
                                {e.address.slice(2, 4).toUpperCase()}
                            </div>

                            {/* Main content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                                        {formatAddress(e.address)}
                                    </span>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>checked in to</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                                        "{e.habitName}"
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                        {blockAgo(e.lastCheckIn, currentBlock)}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>·</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                        {formatPill(e.stakeAmount)} staked
                                    </span>
                                </div>
                            </div>

                            {/* Streak badge */}
                            <div style={{
                                display:        'flex',
                                flexDirection:  'column',
                                alignItems:     'center',
                                flexShrink:     0,
                                background:     streakColor(e.streak) + '15',
                                border:         '1px solid ' + streakColor(e.streak) + '40',
                                borderRadius:   10,
                                padding:        '6px 12px',
                                minWidth:       64,
                            }}>
                                <span style={{ fontSize: 18, lineHeight: 1 }}>{streakEmoji(e.streak)}</span>
                                <span style={{ fontSize: 18, fontWeight: 800, color: streakColor(e.streak), lineHeight: 1.2 }}>
                                    {e.streak}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>DAYS</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer note */}
            {tab === 'feed' && entries.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-dim)' }}>
                    Showing activity from top {entries.length} active habits · Updates every 60s
                </div>
            )}
        </div>
    );
}
