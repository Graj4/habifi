import { useLeaderboard } from '../lib/hooks';
import { useApp } from '../App';

const RANK_STYLE: Record<number, { bg: string; color: string; label: string }> = {
    1: { bg: 'linear-gradient(135deg, #FFD700, #F7931A)', color: '#000', label: '🥇' },
    2: { bg: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', color: '#000', label: '🥈' },
    3: { bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', color: '#fff', label: '🥉' },
};

export default function Leaderboard() {
    const { entries, loading, refresh } = useLeaderboard();
    const { setPage, connected, connectWallet } = useApp();

    return (
        <div className="container section">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h2>🏆 Leaderboard</h2>
                    <p style={{ marginTop: 6 }}>Top 10 highest streak counts on Bitcoin L1 · Yield share is proportional to PILL staked</p>
                </div>
                <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
                    {loading ? <span className="spinner" /> : '↻ Refresh'}
                </button>
            </div>

            {/* Top 3 podium */}
            {entries.length >= 3 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 32, alignItems: 'flex-end', justifyContent: 'center' }}>
                    {[entries[1], entries[0], entries[2]].map((entry, i) => {
                        const rank  = i === 1 ? 1 : (i === 0 ? 2 : 3);
                        const style = RANK_STYLE[rank];
                        const height = rank === 1 ? 160 : (rank === 2 ? 120 : 100);
                        return (
                            <div
                                key={entry.address}
                                style={{
                                    flex:           rank === 1 ? 1.2 : 1,
                                    textAlign:      'center',
                                }}
                            >
                                <div style={{ fontSize: 32, marginBottom: 8 }}>{style.label}</div>
                                <div
                                    style={{
                                        background:    style.bg,
                                        color:         style.color,
                                        borderRadius:  '12px 12px 0 0',
                                        height,
                                        display:       'flex',
                                        flexDirection: 'column',
                                        alignItems:    'center',
                                        justifyContent:'center',
                                        padding:       '16px 12px',
                                    }}
                                >
                                    <div style={{ fontWeight: 900, fontSize: rank === 1 ? 36 : 28, lineHeight: 1 }}>
                                        🔥 {entry.streak}
                                    </div>
                                    <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8, fontFamily: 'monospace' }}>
                                        {entry.address}
                                    </div>
                                </div>
                                <div style={{
                                    background:   'var(--bg2)',
                                    borderRadius: '0 0 12px 12px',
                                    padding:      '8px 12px',
                                    fontSize:     11,
                                    color:        'var(--text-dim)',
                                    border:       '1px solid var(--border)',
                                    borderTop:    'none',
                                }}>
                                    day streak
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                        <span className="spinner spinner-lg" />
                    </div>
                ) : entries.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🏅</div>
                        <h3 style={{ marginBottom: 8 }}>No streaks yet</h3>
                        <p style={{ marginBottom: 24 }}>Be the first on the Bitcoin L1 leaderboard!</p>
                        {connected
                            ? <button className="btn btn-primary" onClick={() => setPage('create')}>Start First Streak</button>
                            : <button className="btn btn-primary" onClick={connectWallet}>Connect Wallet</button>
                        }
                    </div>
                ) : (
                    <>
                        <div style={{
                            display:    'grid',
                            gridTemplateColumns: '60px 1fr auto',
                            gap:        0,
                            padding:    '12px 20px',
                            background: 'var(--bg3)',
                            borderBottom: '1px solid var(--border)',
                            fontSize:   11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            color:      'var(--text-muted)',
                        }}>
                            <span>Rank</span>
                            <span>Wallet</span>
                            <span style={{ textAlign: 'right' }}>Streak</span>
                        </div>
                        {entries.map((entry, i) => {
                            const rankStyle = RANK_STYLE[entry.rank];
                            return (
                                <div
                                    key={entry.address}
                                    style={{
                                        display:    'grid',
                                        gridTemplateColumns: '60px 1fr auto',
                                        gap:        0,
                                        padding:    '16px 20px',
                                        borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                                        alignItems: 'center',
                                        background: i === 0 ? 'linear-gradient(90deg, rgba(247,147,26,0.05) 0%, transparent 100%)' : 'transparent',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {rankStyle ? (
                                            <div style={{
                                                width:        32, height: 32,
                                                borderRadius: 8,
                                                background:   rankStyle.bg,
                                                display:      'flex',
                                                alignItems:   'center',
                                                justifyContent:'center',
                                                fontSize:     16,
                                            }}>
                                                {rankStyle.label}
                                            </div>
                                        ) : (
                                            <div style={{
                                                width:        32, height: 32,
                                                borderRadius: 8,
                                                background:   'var(--bg3)',
                                                display:      'flex',
                                                alignItems:   'center',
                                                justifyContent:'center',
                                                fontWeight:   700,
                                                fontSize:     13,
                                                color:        'var(--text-muted)',
                                            }}>
                                                {entry.rank}
                                            </div>
                                        )}
                                    </div>
                                    <span className="mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        {entry.address}
                                    </span>
                                    <span style={{ fontWeight: 800, color: 'var(--orange)', fontSize: 18 }}>
                                        🔥 {entry.streak}
                                    </span>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>
                Leaderboard reads directly from Bitcoin L1 · No backend · Fully on-chain
            </p>
        </div>
    );
}
