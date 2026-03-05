import { useState } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import { useApp } from '../App';
import { STREAK_SATS_ABI, STREAK_BADGE_ABI } from '../lib/abi';
import {
    STREAK_SATS_ADDRESS, STREAK_BADGE_ADDRESS, PILL_TOKEN_ADDRESS,
    NETWORK, RPC_URL,
} from '../lib/config';
import { sendTx } from '../lib/hooks';

function simError(sim: unknown): string | null {
    if (sim === null || sim === undefined) return `Got null/undefined response`;
    if (typeof sim !== 'object') return `Unexpected response: ${typeof sim} — ${String(sim)}`;
    if ('error' in (sim as object)) return String((sim as any).error);
    if (!('sendTransaction' in (sim as object)))
        return `No sendTransaction method. Keys: ${Object.keys(sim as object).join(', ')}`;
    return null;
}

export default function Admin() {
    const { address, addToast, setPage } = useApp();
    const [loadingA, setLoadingA] = useState(false);
    const [loadingB, setLoadingB] = useState(false);
    const [doneA,    setDoneA]    = useState(false);
    const [debugA,   setDebugA]   = useState('');
    const [debugB,   setDebugB]   = useState('');

    const doSetAddresses = async () => {
        if (!address) { addToast('Connect your wallet first', 'error'); return; }
        setLoadingA(true);
        setDebugA('');
        try {
            const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            // Resolve ALL addresses to proper Address objects via RPC
            const senderAddr = await provider.getPublicKeyInfo(address, false);
            const pillAddr   = await provider.getPublicKeyInfo(PILL_TOKEN_ADDRESS, true);
            const badgeAddr  = await provider.getPublicKeyInfo(STREAK_BADGE_ADDRESS, true);
            const contract   = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const sim = await contract.setAddresses(pillAddr, badgeAddr);
            console.log('[Admin] setAddresses sim:', sim);
            const err = simError(sim);
            if (err) throw new Error(err);
            const txId = await sendTx(sim as any, address!);
            setDoneA(true);
            addToast('Step 1 done — setAddresses confirmed!', 'success', txId);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setDebugA(msg);
            addToast(`Step 1 failed: ${msg}`, 'error');
        } finally {
            setLoadingA(false);
        }
    };

    const doSetMinter = async () => {
        if (!address) { addToast('Connect your wallet first', 'error'); return; }
        setLoadingB(true);
        setDebugB('');
        try {
            const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            // Resolve ALL addresses to proper Address objects via RPC
            const senderAddr     = await provider.getPublicKeyInfo(address, false);
            const streakSatsAddr = await provider.getPublicKeyInfo(STREAK_SATS_ADDRESS, true);
            const contract = getContract(STREAK_BADGE_ADDRESS, STREAK_BADGE_ABI, provider, NETWORK, senderAddr) as any;
            const sim = await contract.setMinter(streakSatsAddr);
            console.log('[Admin] setMinter sim:', sim);
            const err = simError(sim);
            if (err) throw new Error(err);
            const txId = await sendTx(sim as any, address!);
            addToast('🎉 Setup complete! Contracts are ready.', 'success', txId);
            setPage('home');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setDebugB(msg);
            addToast(`Step 2 failed: ${msg}`, 'error');
        } finally {
            setLoadingB(false);
        }
    };

    return (
        <div className="container section" style={{ maxWidth: 520 }}>
            <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage('home')}
                style={{ marginBottom: 24 }}
            >
                ← Back to Home
            </button>
            <h2 style={{ marginBottom: 8 }}>🔧 One-Time Contract Setup</h2>
            <p style={{ marginBottom: 32, color: 'var(--text-muted)' }}>
                Run these two transactions in order using your deployer wallet.
                Each one opens OP_WALLET to confirm.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card">
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            {doneA ? '✅' : '1️⃣'} setAddresses — HabiFi
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Tells HabiFi where to find the PILL token and StreakBadge contracts.
                        </div>
                    </div>
                    <button
                        className="btn btn-primary btn-full"
                        onClick={doSetAddresses}
                        disabled={loadingA || doneA}
                    >
                        {loadingA ? <><span className="spinner" />Resolving addresses & waiting for OP_WALLET…</> : doneA ? 'Done ✅' : 'Run Step 1'}
                    </button>
                    {debugA && (
                        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg)', borderRadius: 6, fontSize: 12, color: 'var(--red)', wordBreak: 'break-all' }}>
                            {debugA}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            2️⃣ setMinter — StreakBadge
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Authorizes HabiFi to mint NFT badges. Without this, badges will fail.
                        </div>
                    </div>
                    <button
                        className="btn btn-primary btn-full"
                        onClick={doSetMinter}
                        disabled={loadingB || !doneA}
                    >
                        {loadingB ? <><span className="spinner" />Resolving address & waiting for OP_WALLET…</> : 'Run Step 2'}
                    </button>
                    {debugB && (
                        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg)', borderRadius: 6, fontSize: 12, color: 'var(--red)', wordBreak: 'break-all' }}>
                            {debugB}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
