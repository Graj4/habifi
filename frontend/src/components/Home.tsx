import { useApp } from '../App';
import { useStats, useLeaderboard } from '../lib/hooks';
import { formatPill, formatAddress } from '../lib/config';

// ─── Metric pill ──────────────────────────────────────────────────────────────
function MetricPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div style={{
            display:      'flex',
            flexDirection:'column',
            gap:           4,
            padding:      '0 28px',
            borderRight:  '1px solid var(--border)',
        }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {label}
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: accent ? 'var(--green)' : 'var(--text)' }}>
                {value}
            </span>
        </div>
    );
}

// ─── Step row ─────────────────────────────────────────────────────────────────
function StepRow({ n, title, body }: { n: string; title: string; body: string }) {
    return (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--primary-dim)',
                border:     '1px solid var(--primary-border)',
                display:    'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 15, color: 'var(--primary)',
                flexShrink: 0, marginTop: 2,
            }}>
                {n}
            </div>
            <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>{body}</p>
            </div>
        </div>
    );
}

export default function Home() {
    const { setPage, connected, connectWallet } = useApp();
    const { stats }   = useStats();
    const { entries } = useLeaderboard();

    return (
        <div>
            {/* ── Hero ────────────────────────────────────────────────────── */}
            <section style={{ padding: '72px 0 56px' }}>
                <div className="container home-hero" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 64, alignItems: 'center' }}>

                    {/* Left — copy */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <span style={{
                                display: 'inline-block', width: 8, height: 8,
                                borderRadius: '50%', background: 'var(--green)',
                                boxShadow: '0 0 8px var(--green)',
                            }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Live on Bitcoin L1 · Testnet
                            </span>
                        </div>

                        <h1 style={{ marginBottom: 20, lineHeight: 1.08 }}>
                            HabiFi<br />
                            <span style={{
                                background: 'linear-gradient(135deg, var(--primary) 0%, #818CF8 100%)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                on Bitcoin.
                            </span>
                        </h1>

                        <p style={{ fontSize: 16, lineHeight: 1.7, maxWidth: 480, marginBottom: 36 }}>
                            Stake PILL on your commitment. Your staked PILL earns yield
                            proportional to how much you have at risk — when others break their
                            streak, their 10% tax is redistributed across all active stakers.
                            More skin in the game, more yield.
                        </p>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {connected ? (
                                <button className="btn btn-primary btn-lg" onClick={() => setPage('create')}>
                                    Commit a Habit
                                </button>
                            ) : (
                                <button className="btn btn-primary btn-lg" onClick={connectWallet}>
                                    Connect Wallet
                                </button>
                            )}
                            <button className="btn btn-secondary btn-lg" onClick={() => setPage('dashboard')}>
                                View Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Right — protocol snapshot card */}
                    <div className="card card-primary" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                                Protocol Snapshot
                            </span>
                        </div>
                        {[
                            {
                                label: 'Total Value Staked',
                                value: stats ? formatPill(stats.totalStaked) : '—',
                                note:  'across active habits',
                                accent: false,
                            },
                            {
                                label: 'Active Streak-Days',
                                value: stats ? stats.totalStreakDays.toLocaleString() : '—',
                                note:  'on-chain check-ins',
                                accent: false,
                            },
                            {
                                label: 'Habits Created',
                                value: stats ? stats.totalHabits.toLocaleString() : '—',
                                note:  'committed positions',
                                accent: false,
                            },
                            {
                                label: 'Impatience Tax',
                                value: '10%',
                                note:  'redistributed to winners',
                                accent: true,
                            },
                        ].map((row, i, arr) => (
                            <div key={row.label} style={{
                                display:       'flex',
                                justifyContent:'space-between',
                                alignItems:    'center',
                                padding:       '16px 24px',
                                borderBottom:  i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                            }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{row.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{row.note}</div>
                                </div>
                                <div style={{
                                    fontSize: 18, fontWeight: 800, letterSpacing: -0.5,
                                    color: row.accent ? 'var(--green)' : 'var(--text)',
                                }}>
                                    {row.value}
                                </div>
                            </div>
                        ))}
                        <div style={{ padding: '14px 24px', background: 'var(--primary-dim)', borderTop: '1px solid var(--primary-border)' }}>
                            <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                                Powered by OP_NET · No bridges · Non-custodial
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Metrics bar ─────────────────────────────────────────────── */}
            <div style={{
                borderTop:    '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                background:   'var(--bg2)',
                padding:      '20px 0',
            }}>
                <div className="container home-metrics">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingRight: 28, borderRight: '1px solid var(--border)', marginRight: 0, flexShrink: 0 }}>
                            Live
                        </div>
                        <MetricPill label="Total Staked"    value={stats ? formatPill(stats.totalStaked) : '—'} />
                        <MetricPill label="Streak-Days"     value={stats ? stats.totalStreakDays.toLocaleString() : '—'} />
                        <MetricPill label="Habits"          value={stats ? stats.totalHabits.toLocaleString() : '—'} />
                        <MetricPill label="Yield Rate"      value="10%" accent />
                        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)' }}>
                            Bitcoin L1 · OP_NET
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mechanism + Leaderboard ─────────────────────────────────── */}
            <section className="section">
                <div className="container home-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>

                    {/* Mechanism */}
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            How It Works
                        </p>
                        <h2 style={{ marginBottom: 32, fontSize: 22 }}>A commitment protocol,<br />not a loyalty programme.</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            <StepRow
                                n="01"
                                title="Stake on your habit"
                                body="Lock PILL tokens against a habit you choose — exercise, reading, coding. Your stake is your collateral. The protocol holds it in escrow on Bitcoin L1."
                            />
                            <div style={{ height: 1, background: 'var(--border)', marginLeft: 64 }} />
                            <StepRow
                                n="02"
                                title="Check in every period"
                                body="Submit an on-chain check-in within each frequency window. Your streak accumulates publicly and immutably on Bitcoin — no back-dating possible."
                            />
                            <div style={{ height: 1, background: 'var(--border)', marginLeft: 64 }} />
                            <StepRow
                                n="03"
                                title="Earn from broken streaks"
                                body="When a participant breaks their streak, 10% of their stake is redistributed proportionally to all active streak holders. Discipline pays, literally."
                            />
                        </div>

                        <div className="info-box" style={{ marginTop: 36 }}>
                            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 6 }}>Why OP_NET?</strong>
                            Contracts execute natively on Bitcoin L1 via Tapscript-encoded calldata.
                            No EVM bridge, no wrapped BTC, no sidechain risk.
                        </div>
                    </div>

                    {/* Leaderboard preview */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                    Leaderboard
                                </p>
                                <h2 style={{ fontSize: 22 }}>Top performers</h2>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setPage('leaderboard')}>
                                Full table →
                            </button>
                        </div>

                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Table header */}
                            <div style={{
                                display:      'grid',
                                gridTemplateColumns: '40px 1fr 80px 80px',
                                padding:      '12px 20px',
                                borderBottom: '1px solid var(--border)',
                                fontSize:     11,
                                fontWeight:   700,
                                color:        'var(--text-dim)',
                                textTransform:'uppercase',
                                letterSpacing:'0.06em',
                                background:   'var(--bg3)',
                            }}>
                                <span>#</span>
                                <span>Address</span>
                                <span style={{ textAlign: 'right' }}>Streak</span>
                                <span style={{ textAlign: 'right' }}>Status</span>
                            </div>

                            {entries.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                                    No positions yet — be the first to commit.
                                </div>
                            ) : entries.slice(0, 8).map((entry, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display:      'grid',
                                        gridTemplateColumns: '40px 1fr 80px 80px',
                                        alignItems:   'center',
                                        padding:      '14px 20px',
                                        borderBottom: i < Math.min(entries.length, 8) - 1 ? '1px solid var(--border)' : 'none',
                                        background:   i === 0 ? 'linear-gradient(90deg, rgba(91,127,255,0.06) 0%, transparent 80%)' : 'transparent',
                                        transition:   'background var(--transition)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'linear-gradient(90deg, rgba(91,127,255,0.06) 0%, transparent 80%)' : 'transparent')}
                                >
                                    <span style={{
                                        fontSize:   13,
                                        fontWeight: i < 3 ? 800 : 600,
                                        color:      i === 0 ? 'var(--primary)' : i < 3 ? 'var(--text)' : 'var(--text-muted)',
                                    }}>
                                        {entry.rank}
                                    </span>
                                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {formatAddress(entry.address)}
                                    </span>
                                    <span style={{ textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>
                                        {entry.streak}d
                                    </span>
                                    <span style={{ textAlign: 'right' }}>
                                        <span className={`badge ${entry.streak > 0 ? 'badge-green' : 'badge-red'}`}>
                                            {entry.streak > 0 ? 'Active' : 'Broken'}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* CTA under table */}
                        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                            {connected ? (
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setPage('create')}>
                                    Commit a Habit
                                </button>
                            ) : (
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={connectWallet}>
                                    Connect to Compete
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={() => setPage('leaderboard')}>
                                Leaderboard
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer style={{
                background:  'var(--bg2)',
                borderTop:   '1px solid var(--border)',
                padding:     '40px 0',
            }}>
                <div className="container home-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, alignItems: 'start' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>HabiFi</div>
                        <p style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 240 }}>
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
                            <button
                                key={link.id}
                                onClick={() => setPage(link.id)}
                                style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '4px 0', textAlign: 'left', fontFamily: 'inherit' }}
                            >
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
                            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>#opnetvibecode</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
