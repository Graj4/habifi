import { useApp } from '../App';
import { formatAddress } from '../lib/config';

const NAV_ITEMS = [
    { id: 'home',        label: 'Home'        },
    { id: 'dashboard',   label: 'Dashboard'   },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'challenge',   label: 'Challenge'   },
    { id: 'groups',      label: 'Groups'      },
    { id: 'badges',      label: 'Badges'      },
] as const;

export default function Nav() {
    const { page, setPage, address, connected, connectWallet, disconnectWallet, walletLoading } = useApp();

    return (
        <nav style={{
            background:     'rgba(6, 13, 31, 0.92)',
            backdropFilter: 'blur(24px)',
            borderBottom:   '1px solid rgba(91, 127, 255, 0.12)',
            position:       'sticky',
            top:            0,
            zIndex:         100,
        }}>
            <div className="container" style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                height:         64,
                gap:            16,
            }}>
                {/* Logo */}
                <button
                    onClick={() => setPage('home')}
                    style={{
                        background: 'none',
                        border:     'none',
                        cursor:     'pointer',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        8,
                        flexShrink: 0,
                    }}
                >
                    <span style={{
                        fontSize:   30,
                        lineHeight: 1,
                        filter:     'drop-shadow(0 0 8px rgba(249,115,22,0.7)) drop-shadow(0 0 16px rgba(255,200,50,0.4))',
                    }}>
                        ⚡
                    </span>
                    <span style={{
                        fontWeight:           900,
                        fontSize:             22,
                        letterSpacing:        -0.5,
                        background:           'linear-gradient(90deg, #F97316, #FFD700, #FF8C00, #FFD700, #F97316)',
                        backgroundSize:       '250% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor:  'transparent',
                        animation:            'logoShimmer 4s ease infinite',
                    }}>
                        HabiFi
                    </span>
                </button>

                {/* Nav items (desktop) */}
                <div style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setPage(item.id)}
                            className="btn btn-ghost btn-sm"
                            style={{
                                color:      page === item.id ? 'var(--primary)' : 'var(--text-muted)',
                                background: page === item.id ? 'var(--primary-dim)' : 'transparent',
                                border:     page === item.id ? '1px solid var(--primary-border)' : '1px solid transparent',
                                fontWeight: page === item.id ? 600 : 500,
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Wallet */}
                <div style={{ flexShrink: 0 }}>
                    {connected && address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                background:   'var(--bg3)',
                                border:       '1px solid var(--border2)',
                                borderRadius: 'var(--radius)',
                                padding:      '7px 14px',
                                display:      'flex',
                                alignItems:   'center',
                                gap:          8,
                                fontSize:     13,
                            }}>
                                <span style={{
                                    width:        7,
                                    height:       7,
                                    borderRadius: '50%',
                                    background:   'var(--green)',
                                    flexShrink:   0,
                                    boxShadow:    '0 0 6px var(--green)',
                                }} />
                                <span className="mono">{formatAddress(address)}</span>
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setPage('create')}
                            >
                                + New Habit
                            </button>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={disconnectWallet}
                                style={{ color: 'var(--text-dim)', fontSize: 12 }}
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={connectWallet}
                            disabled={walletLoading}
                        >
                            {walletLoading ? <><span className="spinner" />Connecting</> : 'Connect Wallet'}
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
