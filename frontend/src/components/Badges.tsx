import { useApp } from '../App';
import { useUserHabits, useMotoMiles } from '../lib/hooks';
import { BADGE_MILESTONES, getMotoTier } from '../lib/config';

const MOTO_TIERS = [
    { min: 0,   max: 50,  name: 'Rookie Rider',  tier: 0, desc: 'Just getting started'        },
    { min: 50,  max: 100, name: 'Street Runner',  tier: 1, desc: 'Building momentum'           },
    { min: 100, max: 250, name: 'Moto Pilgrim',   tier: 2, desc: 'Dedicated road warrior'      },
    { min: 250, max: Infinity, name: 'Moto Legend', tier: 3, desc: 'Elite airdrop priority'    },
];

function BadgeCard({
    emoji, name, color, desc, daysRequired,
    earned, earnedAt,
}: {
    emoji:        string;
    name:         string;
    color:        string;
    desc:         string;
    daysRequired: number;
    earned:       boolean;
    earnedAt?:    string;
}) {
    return (
        <div style={{
            borderRadius:  20,
            border:        `2px solid ${earned ? color : 'var(--border)'}`,
            background:    earned
                ? `linear-gradient(135deg, ${color}18 0%, var(--bg2) 100%)`
                : 'var(--bg2)',
            padding:       32,
            textAlign:     'center',
            opacity:       earned ? 1 : 0.5,
            transition:    'all 0.3s ease',
            position:      'relative',
            overflow:      'hidden',
        }}>
            {earned && (
                <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: `${color}30`, border: `1px solid ${color}60`,
                    borderRadius: 100, padding: '3px 10px',
                    fontSize: 11, fontWeight: 700, color,
                }}>
                    Earned ✓
                </div>
            )}
            {earned && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 120, height: 120, borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />
            )}
            <div style={{
                fontSize: 80, lineHeight: 1, marginBottom: 16,
                filter: earned ? `drop-shadow(0 0 20px ${color}80)` : 'grayscale(1)',
                transition: 'filter 0.3s', position: 'relative',
            }}>
                {emoji}
            </div>
            <h3 style={{ marginBottom: 8, color: earned ? color : 'var(--text-muted)', fontSize: 20 }}>
                {name}
            </h3>
            <p style={{ fontSize: 13, marginBottom: 12 }}>{desc}</p>
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 100,
                background: `${color}15`, border: `1px solid ${color}40`,
                fontSize: 13, fontWeight: 700, color,
            }}>
                {daysRequired}-day streak
            </div>
            {earned && earnedAt && (
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
                    Soulbound · Minted at block {earnedAt}
                </div>
            )}
            {!earned && (
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
                    Non-transferable once earned
                </div>
            )}
        </div>
    );
}

export function BadgesContent() {
    const { address, connected, connectWallet, setPage } = useApp();
    const { habits } = useUserHabits(address);
    const { miles }  = useMotoMiles(address);

    const maxStreak  = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
    const motoTier   = getMotoTier(miles);
    const currentIdx = MOTO_TIERS.findIndex(t => miles >= t.min && miles < t.max);
    const nextTier   = MOTO_TIERS[currentIdx + 1];
    const toNext     = nextTier ? nextTier.min - miles : 0;

    return (
        <div>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <h2 style={{ marginBottom: 8 }}>Achievement Badges</h2>
            <p style={{ marginBottom: 40 }}>
                Soulbound NFTs minted on Bitcoin L1 at streak milestones.
                Non-transferable — permanently bound to your wallet.
            </p>

            {/* ── Streak Badges ────────────────────────────────────────────── */}
            <h3 style={{ marginBottom: 20, color: 'var(--text-muted)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Streak Badges
            </h3>
            <div className="grid-3" style={{ marginBottom: 64 }}>
                {BADGE_MILESTONES.map(badge => (
                    <BadgeCard
                        key={badge.name}
                        emoji={badge.emoji}
                        name={badge.name}
                        color={badge.color}
                        desc={badge.desc}
                        daysRequired={badge.days}
                        earned={maxStreak >= badge.days}
                        earnedAt={maxStreak >= badge.days ? '—' : undefined}
                    />
                ))}
            </div>

            {/* ── OP_NET Sponsor Panel ─────────────────────────────────────── */}
            <div style={{
                borderRadius:  20,
                border:        '1px solid rgba(167,139,250,0.25)',
                background:    'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(91,127,255,0.06) 50%, var(--bg2) 100%)',
                overflow:      'hidden',
                position:      'relative',
            }}>
                {/* Decorative orb */}
                <div style={{
                    position:     'absolute', top: -60, right: -60,
                    width:        240, height: 240, borderRadius: '50%',
                    background:   'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
                    pointerEvents:'none',
                }} />

                {/* Co-branding header */}
                <div style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'space-between',
                    padding:       '20px 28px',
                    borderBottom:  '1px solid rgba(167,139,250,0.15)',
                    flexWrap:      'wrap',
                    gap:           12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'rgba(167,139,250,0.12)',
                            border: '1px solid rgba(167,139,250,0.25)',
                            borderRadius: 12, padding: '8px 14px',
                        }}>
                            <span style={{ fontSize: 20 }}>🏍</span>
                            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--purple)' }}>Moto Miles</span>
                        </div>
                        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>×</span>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--primary-dim)',
                            border: '1px solid var(--primary-border)',
                            borderRadius: 12, padding: '8px 14px',
                        }}>
                            <span style={{ fontSize: 20 }}>⚡</span>
                            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)' }}>OP_NET</span>
                        </div>
                    </div>
                    <span style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--purple)',
                        background: 'rgba(167,139,250,0.12)',
                        border: '1px solid rgba(167,139,250,0.25)',
                        borderRadius: 100, padding: '4px 12px',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                        Ecosystem Partner
                    </span>
                </div>

                <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

                    {/* Left — miles + tier */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            Your Miles
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 48, fontWeight: 900, color: 'var(--purple)', lineHeight: 1, letterSpacing: -2 }}>
                                {miles.toLocaleString()}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>miles</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <span style={{
                                fontWeight: 700, fontSize: 13, color: 'var(--purple)',
                                background: 'rgba(167,139,250,0.12)',
                                border: '1px solid rgba(167,139,250,0.25)',
                                borderRadius: 100, padding: '3px 10px',
                            }}>
                                {motoTier.name}
                            </span>
                            {nextTier && (
                                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                    {toNext} miles to {nextTier.name}
                                </span>
                            )}
                            {!nextTier && (
                                <span style={{ fontSize: 12, color: 'var(--green)' }}>Max tier reached</span>
                            )}
                        </div>

                        {/* Progress bar to next tier */}
                        {nextTier && (
                            <div>
                                <div className="progress-bar" style={{ marginBottom: 6 }}>
                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${Math.min(100, ((miles - motoTier.min) / (nextTier.min - motoTier.min)) * 100)}%`,
                                            background: 'linear-gradient(90deg, var(--purple), var(--primary))',
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
                                    <span>{motoTier.name}</span>
                                    <span>{nextTier.name}</span>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            +1 Mile per check-in · Snapshotted for $MOTO airdrop priority (if HabiFi wins MotoCat)
                        </div>
                    </div>

                    {/* Right — tier ladder */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            Tier Ladder
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {MOTO_TIERS.map((t, i) => {
                                const unlocked = miles >= t.min;
                                const current  = miles >= t.min && (t.max === Infinity || miles < t.max);
                                return (
                                    <div key={t.tier} style={{
                                        display:      'flex',
                                        alignItems:   'center',
                                        gap:          12,
                                        padding:      '10px 14px',
                                        borderRadius: 10,
                                        background:   current ? 'rgba(167,139,250,0.10)' : 'transparent',
                                        border:       current ? '1px solid rgba(167,139,250,0.2)' : '1px solid transparent',
                                        opacity:      unlocked ? 1 : 0.35,
                                        transition:   'all 0.2s',
                                    }}>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                            background: current ? 'var(--purple)' : unlocked ? 'var(--green)' : 'var(--border)',
                                            boxShadow:  current ? '0 0 8px var(--purple)' : 'none',
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: current ? 700 : 500, fontSize: 13, color: current ? 'var(--purple)' : 'var(--text)' }}>
                                                {t.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.desc}</div>
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                            {t.min}{t.max === Infinity ? '+' : `–${t.max}`}
                                        </span>
                                        {unlocked && !current && (
                                            <span style={{ color: 'var(--green)', fontSize: 13 }}>✓</span>
                                        )}
                                        {current && (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', background: 'rgba(167,139,250,0.15)', borderRadius: 100, padding: '2px 8px' }}>
                                                YOU
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer — what is $MOTO */}
                <div style={{
                    borderTop:     '1px solid rgba(167,139,250,0.15)',
                    padding:       '20px 28px',
                    display:       'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems:    'center',
                    gap:           24,
                }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                            What is $MOTO?
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: 520 }}>
                            $MOTO is the native token of the OP_NET ecosystem — the Bitcoin L1 smart contract
                            platform that powers HabiFi. Every check-in earns Moto Miles, which will be
                            snapshotted for priority allocation in the $MOTO airdrop <strong style={{ color: 'var(--text)' }}>if HabiFi wins the MotoCat contest</strong>.
                            Higher tier = higher priority. Start earning now — miles are accumulating regardless.
                        </div>
                    </div>
                    <a
                        href="https://motoswap.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none' }}
                    >
                        Visit MotoSwap ↗
                    </a>
                </div>
            </div>

            {/* ── Connect / empty prompts ──────────────────────────────────── */}
            {!connected && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <p style={{ marginBottom: 16 }}>Connect your wallet to see your earned badges and Moto Miles.</p>
                    <button className="btn btn-primary" onClick={connectWallet}>Connect Wallet</button>
                </div>
            )}
            {connected && maxStreak === 0 && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <p style={{ marginBottom: 16 }}>No badges earned yet — start a streak to unlock them.</p>
                    <button className="btn btn-primary" onClick={() => setPage('create')}>Create First Habit</button>
                </div>
            )}
        </div>
    );
}

export default function Badges() {
    return <div className="container section"><BadgesContent /></div>;
}
