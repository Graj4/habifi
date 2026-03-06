import { useState } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import { useApp } from '../App';
import { useUserHabits, useMotoMiles, usePendingYield, useCurrentBlock, sendTx, type HabitInfo } from '../lib/hooks';
import { STREAK_SATS_ABI } from '../lib/abi';
import { STREAK_SATS_ADDRESS, NETWORK, RPC_URL, BADGE_MILESTONES, getMotoTier, formatPill } from '../lib/config';
import { BadgesContent } from './Badges';

function BlocksUntilDeadline({ lastCheckIn, frequency, currentBlock }: { lastCheckIn: number; frequency: number; currentBlock: number }) {
    if (lastCheckIn === 0) return <span style={{ color: 'var(--green)' }}>✓ First check-in ready!</span>;
    const deadline = lastCheckIn + frequency;
    const blocksLeft = deadline - currentBlock;
    if (blocksLeft <= 0) return <span style={{ color: 'var(--red)', fontWeight: 700 }}>⚠️ WINDOW CLOSING!</span>;
    const minsLeft = blocksLeft * 10;
    const hoursLeft = Math.floor(minsLeft / 60);
    const remaining = minsLeft < 60 ? `${minsLeft}m` : `${hoursLeft}h ${minsLeft % 60}m`;
    return (
        <span style={{ color: blocksLeft < 20 ? 'var(--red)' : 'var(--text-muted)' }}>
            ⏱ {remaining} left
        </span>
    );
}

function HabitCard({
    habit, idx, onRefresh,
}: {
    habit: HabitInfo;
    idx: number;
    onRefresh: () => void;
}) {
    const { setPage, setSelectedHabit, setSelectedHabitIdx } = useApp();
    const currentBlock = Number(useCurrentBlock());  // guard: opnet resolves bigint at runtime

    const nextBadge  = BADGE_MILESTONES.find(b => b.days > habit.streak);
    const daysToNext = nextBadge ? nextBadge.days - habit.streak : null;

    const isFirstCheckIn = habit.lastCheckIn === 0;
    const deadline       = habit.lastCheckIn + habit.frequency;
    const blocksLeft     = currentBlock > 0 && !isFirstCheckIn ? deadline - currentBlock : null;
    const isUrgent       = blocksLeft !== null && blocksLeft < 20;

    const goToCheckIn = () => {
        setSelectedHabit(habit);
        setSelectedHabitIdx(idx);
        setPage('checkin');
    };

    return (
        <div
            className="card animate-in"
            style={{
                position:    'relative',
                overflow:    'hidden',
                borderColor: isUrgent ? 'var(--orange-border)' : 'var(--primary-border)',
                background:  isUrgent
                    ? 'linear-gradient(135deg, var(--orange-dim) 0%, var(--bg2) 100%)'
                    : 'linear-gradient(135deg, var(--primary-dim) 0%, var(--bg2) 100%)',
            }}
        >
            {/* Watermark streak number */}
            <div style={{
                position:     'absolute',
                right:        -8,
                top:          -16,
                fontSize:     110,
                fontWeight:   900,
                color:        'rgba(249,115,22,0.05)',
                lineHeight:   1,
                userSelect:   'none',
                pointerEvents:'none',
            }}>
                {habit.streak}
            </div>

            <div style={{ position: 'relative' }}>
                {/* Header row */}
                <div style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'flex-start',
                    marginBottom:   16,
                }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 600 }}>
                            Habit #{idx + 1}
                        </div>
                        <div className="streak-number" style={{ fontSize: 56 }}>
                            {habit.streak}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                            {habit.streak === 1 ? 'day streak' : 'day streak'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${isUrgent ? 'badge-red' : 'badge-primary'}`}>
                            {isUrgent ? 'Urgent' : 'Active'}
                        </span>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, fontWeight: 600 }}>
                            {formatPill(habit.stakeAmount)} staked
                        </div>
                    </div>
                </div>

                {/* Deadline indicator */}
                <div style={{
                    background:   'var(--bg)',
                    borderRadius: 8,
                    padding:      '10px 14px',
                    marginBottom: 16,
                    fontSize:     13,
                    display:      'flex',
                    alignItems:   'center',
                    gap:          8,
                }}>
                    <BlocksUntilDeadline
                        lastCheckIn={habit.lastCheckIn}
                        frequency={habit.frequency}
                        currentBlock={currentBlock}
                    />
                </div>

                {/* Check-in CTA */}
                <button
                    className="btn btn-primary btn-lg btn-full"
                    onClick={goToCheckIn}
                    style={{ marginBottom: 12 }}
                >
                    Check In — Day {habit.streak + 1} →
                </button>

                {/* Badge progress */}
                {nextBadge && (
                    <div style={{ marginTop: 4 }}>
                        <div style={{
                            display:        'flex',
                            justifyContent: 'space-between',
                            fontSize:       12,
                            color:          'var(--text-dim)',
                            marginBottom:   6,
                        }}>
                            <span>{nextBadge.emoji} {nextBadge.name}</span>
                            <span>{daysToNext}d left</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${Math.min(100, (habit.streak / nextBadge.days) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function blocksToTimeAgo(blocksAgo: number): string {
    if (blocksAgo <= 0) return 'just now';
    const mins = blocksAgo * 10;
    if (mins < 60)   return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
}

export default function Dashboard() {
    const { address, connected, connectWallet, setPage, addToast } = useApp();
    const { habits, loading: habitsLoading, refresh } = useUserHabits(address);
    const { miles }   = useMotoMiles(address);
    const { pending, refresh: refreshYield } = usePendingYield(address);
    const currentBlock = Number(useCurrentBlock()); // guard: opnet resolves bigint at runtime
    const [claimLoading, setClaimLoading] = useState(false);
    const [tab, setTab] = useState<'habits' | 'badges'>('habits');

    // Derive recent activity from on-chain habit state — no extra contract calls needed
    const activityItems = (() => { try { return habits.flatMap((h, idx) => {
        const items: { action: string; detail: string; timeAgo: string; amount: string; positive: boolean; sortKey: number }[] = [];
        const freqLabel = h.frequency <= 150 ? 'Daily' : 'Weekly';
        const label = h.name
            ? `${h.name} · ${freqLabel}`
            : `${freqLabel} · ${formatPill(h.stakeAmount)}`;
        if (h.lastCheckIn > 0) {
            items.push({
                action:   'Check In',
                detail:   `${label} · Day ${h.streak}`,
                timeAgo:  currentBlock > 0 ? blocksToTimeAgo(currentBlock - h.lastCheckIn) : '—',
                amount:   '+1 streak day',
                positive: true,
                sortKey:  h.lastCheckIn,
            });
        }
        items.push({
            action:   'Habit Created',
            detail:   `${label} staked`,
            timeAgo:  '—',
            amount:   `-${formatPill(h.stakeAmount ?? 0n)}`,
            positive: false,
            sortKey:  0,
        });
        return items;
    }).sort((a, b) => b.sortKey - a.sortKey).slice(0, 5); } catch { return []; } })();

    const motoTier = getMotoTier(miles);

    const handleClaim = async () => {
        if (!address || !STREAK_SATS_ADDRESS) { addToast('Contract not deployed', 'error'); return; }
        setClaimLoading(true);
        try {
            const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address!, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const sim = await contract.claimYield();
            if (sim && typeof sim === 'object' && 'error' in sim) throw new Error(String((sim as any).error));
            const txId = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast(`💰 Claimed ${formatPill(pending)}!`, 'success', txId);
            refreshYield();
        } catch (err: unknown) {
            addToast(`Claim failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setClaimLoading(false);
        }
    };

    if (!connected) {
        return (
            <div className="container section" style={{ textAlign: 'center', maxWidth: 480 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🔐</div>
                <h2 style={{ marginBottom: 12 }}>Connect Your Wallet</h2>
                <p style={{ marginBottom: 24 }}>Connect OP_WALLET to view your active streaks and claim yield.</p>
                <button className="btn btn-primary btn-lg" onClick={connectWallet}>
                    Connect OP_WALLET
                </button>
            </div>
        );
    }

    return (
        <div className="container section">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>My Dashboard</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    {tab === 'habits' && (
                        <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={habitsLoading}>
                            {habitsLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} />Refreshing…</> : '↻ Refresh'}
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setPage('create')}>
                        + New Habit
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                {(['habits', 'badges'] as const).map(t => (
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
                        {t === 'habits' ? '⚡ My Habits' : '🏅 Badges'}
                    </button>
                ))}
            </div>

            {tab === 'badges' ? <BadgesContent /> : <>
            {/* Summary cards */}
            <div className="grid-3" style={{ marginBottom: 32 }}>
                {/* Claimable yield */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Claimable Yield</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)', marginBottom: 12 }}>
                        {formatPill(pending)}
                    </div>
                    <button
                        className="btn btn-green btn-full"
                        onClick={handleClaim}
                        disabled={claimLoading || pending === 0n}
                    >
                        {claimLoading ? <><span className="spinner" />Claiming…</> : 'Claim Yield'}
                    </button>
                </div>

                {/* Moto miles */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Moto Miles 🏍</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--blue)', marginBottom: 4 }}>
                        {miles.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                        {motoTier.name} · Tier {motoTier.tier}
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min(100, (miles / 250) * 100)}%`,
                                background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                            }}
                        />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                        For $MOTO airdrop snapshot · only if HabiFi wins MotoCat
                    </div>
                </div>

                {/* Active habits */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Active Habits</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--orange)', marginBottom: 4 }}>
                        {habits.length}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                        Total: {habits.reduce((s, h) => s + h.streak, 0)} streak-days
                    </div>
                    <button className="btn btn-secondary btn-full" onClick={() => setTab('badges')}>
                        View Badges
                    </button>
                </div>
            </div>

            {/* Active habit cards */}
            {habitsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <span className="spinner spinner-lg" />
                </div>
            ) : habits.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                    <h3 style={{ marginBottom: 8 }}>No active habits yet</h3>
                    <p style={{ marginBottom: 8 }}>If you just submitted a habit, it will appear here after Bitcoin confirms (~2 min on testnet).</p>
                    <p style={{ marginBottom: 24 }}>The page auto-refreshes every 20 seconds, or tap Refresh above.</p>
                    <button className="btn btn-primary btn-lg" onClick={() => setPage('create')}>
                        Create My First Habit
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {habits.map((habit, idx) => (
                        <HabitCard
                            key={String(habit.id)}
                            habit={habit}
                            idx={idx}
                            onRefresh={refresh}
                        />
                    ))}
                </div>
            )}

            {/* Recent Activity */}
            <div style={{ marginTop: 32 }}>
                <h3 style={{ marginBottom: 16, color: 'var(--text-muted)' }}>Recent Activity</h3>
                <div className="card" style={{ padding: 0 }}>
                    {activityItems.length === 0 ? (
                        <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                            No activity yet — create a habit to get started.
                        </div>
                    ) : activityItems.map((tx, i) => (
                        <div
                            key={i}
                            style={{
                                display:      'flex',
                                alignItems:   'center',
                                gap:          16,
                                padding:      '14px 20px',
                                borderBottom: i < activityItems.length - 1 ? '1px solid var(--border)' : 'none',
                                fontSize:     13,
                            }}
                        >
                            <span style={{ flex: 1 }}>
                                <strong>{tx.action}</strong>
                                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{tx.detail}</span>
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{tx.timeAgo}</span>
                            <span style={{ color: tx.positive ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                                {tx.amount}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            </>}
        </div>
    );
}
