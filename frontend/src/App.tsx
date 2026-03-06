import { useState, createContext, useContext, Component, type ReactNode } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
    state = { error: null };
    static getDerivedStateFromError(e: Error) { return { error: e.message }; }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 32, color: 'var(--red)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    <strong>Render error (open console for full stack):</strong>{'\n\n'}{this.state.error}
                    <br /><br />
                    <button onClick={() => this.setState({ error: null })}>Retry</button>
                </div>
            );
        }
        return this.props.children;
    }
}

import { useWallet, type HabitInfo } from './lib/hooks';
import BackgroundFX from './components/BackgroundFX';
import Nav from './components/Nav';
import Home from './components/Home';
import CreateHabit from './components/CreateHabit';
import CheckIn from './components/CheckIn';
import Dashboard from './components/Dashboard';
import Challenge from './components/Challenge';
import GroupHabits from './components/GroupHabits';
import Feed from './components/Feed';

// ─── App-wide context ─────────────────────────────────────────────────────────
interface AppContextType {
    page: string;
    setPage: (p: string) => void;
    address: string | null;
    connected: boolean;
    connectWallet: () => void;
    disconnectWallet: () => void;
    walletLoading: boolean;
    addToast: (msg: string, type?: 'success' | 'error', txId?: string) => void;
    selectedHabit: HabitInfo | null;
    setSelectedHabit: (h: HabitInfo | null) => void;
    selectedHabitIdx: number;
    setSelectedHabitIdx: (n: number) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(AppContext);

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: number; msg: string; type: 'success' | 'error'; txId?: string; }

export default function App() {
    const [page, setPage] = useState('home');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [selectedHabit,    setSelectedHabit]    = useState<HabitInfo | null>(null);
    const [selectedHabitIdx, setSelectedHabitIdx] = useState(0);
    const { address, connected, loading: walletLoading, connect, disconnect } = useWallet();

    const addToast = (msg: string, type: 'success' | 'error' = 'success', txId?: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type, txId }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), txId ? 8000 : 4000);
    };

    const ctx: AppContextType = {
        page, setPage, address, connected,
        connectWallet: connect,
        disconnectWallet: disconnect,
        walletLoading,
        addToast,
        selectedHabit,    setSelectedHabit,
        selectedHabitIdx, setSelectedHabitIdx,
    };

    const renderPage = () => {
        switch (page) {
            case 'community':
            case 'feed':      return <Feed />;
            case 'create':    return <CreateHabit />;
            case 'checkin':   return <CheckIn />;
            case 'dashboard': return <Dashboard />;
            case 'challenge': return <Challenge />;
            case 'groups':    return <GroupHabits />;
            default:          return <Home />;
        }
    };

    return (
        <AppContext.Provider value={ctx}>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <BackgroundFX />
                <Nav />
                <main style={{ flex: 1 }}>
                    <ErrorBoundary key={page}>
                        {renderPage()}
                    </ErrorBoundary>
                </main>

                {/* Toast container */}
                <div className="toast-container">
                    {toasts.map(t => (
                        <div key={t.id} className={`toast toast-${t.type}`}>
                            <span>{t.type === 'success' ? '✅' : '❌'}</span>
                            <span>{t.msg}</span>
                            {t.txId && (
                                <div style={{ marginLeft: 8, display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <a
                                        href={`https://mempool.opnet.org/testnet4/tx/${t.txId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}
                                    >
                                        OPNet ↗
                                    </a>
                                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>|</span>
                                    <a
                                        href={`https://mempool.space/testnet4/tx/${t.txId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}
                                    >
                                        Mempool ↗
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </AppContext.Provider>
    );
}
