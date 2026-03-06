import { useEffect, useRef } from 'react';
import { useApp } from '../App';
import { useStats, useLeaderboard } from '../lib/hooks';
import { formatPill, formatAddress } from '../lib/config';

// ── Animated orb background ───────────────────────────────────────────────────
function Orbs() {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{
                position: 'absolute', width: 600, height: 600,
                borderRadius: '50%', top: -200, left: -100,
                background: 'radial-gradient(circle, rgba(91,127,255,0.18) 0%, transparent 70%)',
                animation: 'orbFloat 8s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute', width: 500, height: 500,
                borderRadius: '50%', bottom: -150, right: -100,
                background: 'radial-gradient(circle, rgba(16,217,168,0.14) 0%, transparent 70%)',
                animation: 'orbFloat 10s ease-in-out infinite reverse',
            }} />
            <div style={{
                position: 'absolute', width: 300, height: 300,
                borderRadius: '50%', top: '40%', left: '40%',
                background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
                animation: 'orbFloat 12s ease-in-out infinite 2s',
            }} />
        </div>
    );
}

// ── Floating habit card (hero visual) ─────────────────────────────────────────
function HabitCardMock() {
    return (
        <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Glow behind card */}
            <div style={{
                position: 'absolute', inset: -2,
                borderRadius: 24,
                background: 'linear-gradient(135deg, rgba(91,127,255,0.4), rgba(16,217,168,0.3))',
                filter: 'blur(20px)',
                zIndex: 0,
            }} />

            {/* Main card */}
            <div style={{
                position: 'relative', zIndex: 1,
                background: 'rgba(12,22,40,0.95)',
                border: '1px solid rgba(91,127,255,0.25)',
                borderRadius: 24,
                padding: '28px 28px 24px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                minWidth: 340,
            }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>
                            Active Habit
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>🏃 Exercise</div>
                    </div>
                    <div style={{
                        background: 'rgba(16,217,168,0.12)',
                        border: '1px solid rgba(16,217,168,0.3)',
                        borderRadius: 100, padding: '6px 14px',
                        fontSize: 12, fontWeight: 700, color: 'var(--green)',
                    }}>
                        Active
                    </div>
                </div>

                {/* Streak */}
                <div style={{
                    background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.2)',
                    borderRadius: 16, padding: '16px 20px',
                    marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16,
                }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: '#F97316', lineHeight: 1, letterSpacing: -2 }}>
                        21
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Day Streak 🔥</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Next check-in in ~2h</div>
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Staked</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>1,000 PILL</div>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Earned Yield</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>+24.7 PILL</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
                        <span>Progress to 30-day badge</span>
                        <span>70%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: '70%', borderRadius: 100,
                            background: 'linear-gradient(90deg, var(--primary), var(--green))',
                            animation: 'shimmer 2s linear infinite',
                            backgroundSize: '200% 100%',
                        }} />
                    </div>
                </div>
            </div>

            {/* Floating yield badge */}
            <div style={{
                position: 'absolute', top: -18, right: -18, zIndex: 2,
                background: 'linear-gradient(135deg, #10D9A8, #059669)',
                borderRadius: 100, padding: '8px 16px',
                fontSize: 13, fontWeight: 800, color: '#fff',
                boxShadow: '0 8px 24px rgba(16,217,168,0.4)',
                whiteSpace: 'nowrap',
                animation: 'badgePop 3s ease-in-out infinite',
            }}>
                +24.7 PILL yield ✓
            </div>

            {/* Floating streak badge */}
            <div style={{
                position: 'absolute', bottom: -16, left: -16, zIndex: 2,
                background: 'linear-gradient(135deg, #F97316, #DC2626)',
                borderRadius: 100, padding: '8px 16px',
                fontSize: 13, fontWeight: 800, color: '#fff',
                boxShadow: '0 8px 24px rgba(249,115,22,0.4)',
                whiteSpace: 'nowrap',
                animation: 'badgePop 3s ease-in-out infinite 1.5s',
            }}>
                🔥 21-day streak
            </div>
        </div>
    );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, body, color, gradient }: {
    icon: string; title: string; body: string; color: string; gradient: string;
}) {
    return (
        <div style={{
            background: 'var(--bg2)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '28px 24px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px ${color}22`;
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
        >
            {/* Corner gradient */}
            <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 120, height: 120,
                background: gradient,
                borderRadius: '0 20px 0 120px',
                opacity: 0.15,
            }} />
            <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{title}</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
    );
}

// ── Ticker stat ───────────────────────────────────────────────────────────────
function TickerStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 32px', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: accent ? 'var(--green)' : 'var(--text)', letterSpacing: -0.5 }}>{value}</span>
        </div>
    );
}

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home() {
    const { setPage, connected, connectWallet } = useApp();
    const { stats }   = useStats();
    const { entries } = useLeaderboard();

    return (
        <div>
            <style>{`
                @keyframes orbFloat {
                    0%, 100% { transform: translateY(0px) scale(1); }
                    50%       { transform: translateY(-30px) scale(1.05); }
                }
                @keyframes badgePop {
                    0%, 100% { transform: translateY(0px) rotate(-2deg); }
                    50%       { transform: translateY(-6px) rotate(2deg); }
                }
                @keyframes shimmer {
                    0%   { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--green); }
                    50%       { opacity: 0.5; box-shadow: 0 0 16px var(--green); }
                }
            `}</style>

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <section style={{ padding: '80px 0 72px', position: 'relative', overflow: 'hidden' }}>
                <Orbs />
                <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="home-hero" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 80, alignItems: 'center' }}>

                        {/* Left */}
                        <div>
                            {/* Live badge */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
                                background: 'rgba(16,217,168,0.08)', border: '1px solid rgba(16,217,168,0.2)',
                                borderRadius: 100, padding: '8px 16px' }}>
                                <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: 'var(--green)',
                                    animation: 'pulse-dot 2s ease-in-out infinite',
                                    display: 'inline-block',
                                }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                    Live on Bitcoin L1 · Testnet
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 style={{ fontSize: 'clamp(44px, 6vw, 76px)', lineHeight: 1.04, marginBottom: 24, letterSpacing: -2 }}>
                                Build habits.<br />
                                <span style={{
                                    background: 'linear-gradient(135deg, #5B7FFF 0%, #10D9A8 100%)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    Earn on Bitcoin.
                                </span>
                            </h1>

                            <p style={{ fontSize: 17, lineHeight: 1.75, maxWidth: 500, marginBottom: 16, color: 'var(--text-muted)' }}>
                                Stake PILL on your habits and earn yield just for staying consistent.
                                Miss a check-in and lose 10% — that penalty gets redistributed to
                                everyone still holding their streak.
                            </p>
                            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 40 }}>
                                No bridges. No EVM. Fully native to Bitcoin L1 via OP_NET.
                            </p>

                            {/* CTAs */}
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                                {connected ? (
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={() => setPage('create')}
                                        style={{ background: 'linear-gradient(135deg, #5B7FFF, #8B5CF6)', boxShadow: '0 8px 32px rgba(91,127,255,0.4)' }}
                                    >
                                        Commit a Habit →
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={connectWallet}
                                        style={{ background: 'linear-gradient(135deg, #5B7FFF, #8B5CF6)', boxShadow: '0 8px 32px rgba(91,127,255,0.4)' }}
                                    >
                                        Connect Wallet →
                                    </button>
                                )}
                                <button className="btn btn-secondary btn-lg" onClick={() => setPage('dashboard')}>
                                    View Dashboard
                                </button>
                            </div>

                            {/* Trust row */}
                            <div style={{ display: 'flex', gap: 24, marginTop: 40, flexWrap: 'wrap' }}>
                                {[
                                    { icon: '🔒', text: 'Non-custodial' },
                                    { icon: '⛓', text: 'Bitcoin L1' },
                                    { icon: '⚡', text: 'OP_NET Runtime' },
                                ].map(({ icon, text }) => (
                                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                                        <span>{icon}</span>
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — floating habit card */}
                        <HabitCardMock />
                    </div>
                </div>
            </section>

            {/* ── Live ticker ───────────────────────────────────────────────── */}
            <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '16px 0', overflow: 'hidden' }}>
                <div className="container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.15em', paddingRight: 32, borderRight: '1px solid var(--border)', flexShrink: 0 }}>
                            Live
                        </div>
                        <TickerStat label="Total Staked"  value={stats ? formatPill(stats.totalStaked) : '—'} />
                        <TickerStat label="Streak-Days"   value={stats ? stats.totalStreakDays.toLocaleString() : '—'} />
                        <TickerStat label="Habits"        value={stats ? stats.totalHabits.toLocaleString() : '—'} />
                        <TickerStat label="Penalty Rate"  value="10%" accent />
                        <TickerStat label="Network"       value="Bitcoin L1" />
                    </div>
                </div>
            </div>

            {/* ── How It Works ─────────────────────────────────────────────── */}
            <section className="section">
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 52 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
                            How It Works
                        </p>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: -1 }}>
                            A commitment protocol,<br />not a loyalty programme.
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="home-features">
                        <FeatureCard
                            icon="🔒"
                            title="Stake on your habit"
                            body="Lock PILL tokens against a habit — exercise, reading, or anything. Your stake is your collateral, held in escrow on Bitcoin L1."
                            color="#5B7FFF"
                            gradient="linear-gradient(135deg, #5B7FFF, #8B5CF6)"
                        />
                        <FeatureCard
                            icon="✅"
                            title="Check in every period"
                            body="Submit an on-chain check-in within each window. Your streak accumulates publicly and immutably on Bitcoin — no back-dating possible."
                            color="#10D9A8"
                            gradient="linear-gradient(135deg, #10D9A8, #059669)"
                        />
                        <FeatureCard
                            icon="💰"
                            title="Earn from broken streaks"
                            body="When someone breaks their streak, 10% of their stake is redistributed to all active holders. Discipline pays, literally."
                            color="#F97316"
                            gradient="linear-gradient(135deg, #F97316, #DC2626)"
                        />
                    </div>

                    <div className="info-box" style={{ marginTop: 32, textAlign: 'center', maxWidth: 560, margin: '32px auto 0' }}>
                        <strong style={{ color: 'var(--text)' }}>Why OP_NET?</strong>{' '}
                        Contracts execute natively on Bitcoin L1 via Tapscript-encoded calldata.
                        No EVM bridge, no wrapped BTC, no sidechain risk.
                    </div>
                </div>
            </section>

            {/* ── Leaderboard ───────────────────────────────────────────────── */}
            <section className="section" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                                Leaderboard
                            </p>
                            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: -1 }}>Top performers</h2>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPage('leaderboard')}>
                            Full table →
                        </button>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            display: 'grid', gridTemplateColumns: '48px 1fr 100px 90px',
                            padding: '12px 24px', borderBottom: '1px solid var(--border)',
                            fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
                            textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--bg3)',
                        }}>
                            <span>#</span><span>Address</span>
                            <span style={{ textAlign: 'right' }}>Streak</span>
                            <span style={{ textAlign: 'right' }}>Status</span>
                        </div>

                        {entries.length === 0 ? (
                            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                                No positions yet — be the first to commit.
                            </div>
                        ) : entries.slice(0, 5).map((entry, i) => (
                            <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '48px 1fr 100px 90px',
                                alignItems: 'center', padding: '16px 24px',
                                borderBottom: i < Math.min(entries.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                                background: i === 0 ? 'linear-gradient(90deg, rgba(91,127,255,0.07) 0%, transparent 60%)' : 'transparent',
                                transition: 'background 0.15s',
                            }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                                onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'linear-gradient(90deg, rgba(91,127,255,0.07) 0%, transparent 60%)' : 'transparent')}
                            >
                                <span style={{ fontSize: 16 }}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{entry.rank}</span>}
                                </span>
                                <span className="mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatAddress(entry.address)}</span>
                                <span style={{ textAlign: 'right', fontSize: 18, fontWeight: 900, color: '#F97316' }}>{entry.streak}d</span>
                                <span style={{ textAlign: 'right' }}>
                                    <span className={`badge ${entry.streak > 0 ? 'badge-green' : 'badge-red'}`}>
                                        {entry.streak > 0 ? 'Active' : 'Broken'}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        {connected ? (
                            <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #5B7FFF, #8B5CF6)', boxShadow: '0 8px 24px rgba(91,127,255,0.3)' }} onClick={() => setPage('create')}>
                                Commit a Habit →
                            </button>
                        ) : (
                            <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #5B7FFF, #8B5CF6)', boxShadow: '0 8px 24px rgba(91,127,255,0.3)' }} onClick={connectWallet}>
                                Connect to Compete →
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={() => setPage('leaderboard')}>Leaderboard</button>
                    </div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '48px 0' }}>
                <div className="container home-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, alignItems: 'start' }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10, background: 'linear-gradient(135deg, #5B7FFF, #10D9A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            HabiFi
                        </div>
                        <p style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 240, color: 'var(--text-muted)' }}>
                            A habit-commitment protocol native to Bitcoin L1. Non-custodial, immutable, fully on-chain.
                        </p>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Protocol</div>
                        {[
                            { label: 'Dashboard',   id: 'dashboard'   },
                            { label: 'Leaderboard', id: 'leaderboard' },
                            { label: 'Challenges',  id: 'challenge'   },
                            { label: 'Badges',      id: 'badges'      },
                        ].map(link => (
                            <button key={link.id} onClick={() => setPage(link.id)}
                                style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '4px 0', textAlign: 'left', fontFamily: 'inherit' }}>
                                {link.label}
                            </button>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Network</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 2 }}>
                            <div>Bitcoin L1</div>
                            <div>OP_NET Runtime</div>
                            <div>Testnet (Signet)</div>
                            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>#opnetvibecode · #MotoCat</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
