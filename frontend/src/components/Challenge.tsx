import { useEffect, useRef, useState } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import { useApp } from '../App';
import { TxLinks } from './TxLinks';
import { STREAK_SATS_ABI, PILL_TOKEN_ABI } from '../lib/abi';
import { STREAK_SATS_ADDRESS, PILL_TOKEN_ADDRESS, NETWORK, RPC_URL, MIN_PILL_STAKE, PILL_DECIMALS_BN, formatPill, formatAddress } from '../lib/config';
import { sendTx } from '../lib/hooks';


const MINING_QUIPS = [
    'Satoshi is reviewing your request…',
    'Miners are hashing your move…',
    'Bitcoin L1 does not rush for anyone…',
    'Proof-of-patience activated…',
    'HODL the vibe — block incoming…',
    'Difficulty adjustment: patience required…',
];

function MiningScreen({ label, onCancel }: { label: string; onCancel: () => void }) {
    const [quipIdx, setQuipIdx] = useState(0);
    const [dots,    setDots]    = useState('');

    useEffect(() => {
        const q = setInterval(() => setQuipIdx(i => (i + 1) % MINING_QUIPS.length), 4000);
        const d = setInterval(() => setDots(s => s.length >= 3 ? '' : s + '.'), 500);
        return () => { clearInterval(q); clearInterval(d); };
    }, []);

    return (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 56, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }}>⛏️</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {label}{dots}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, minHeight: 20 }}>
                {MINING_QUIPS[quipIdx]}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>
                Checking every 15 s · Will auto-proceed on confirmation
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
    );
}

interface ChallengePreview {
    fromAddr:   string;
    multiplier: number;
    baseAmount: bigint;
    required:   bigint;
    expiry:     bigint;
    status:     number;
}

export default function Challenge() {
    const { address, connected, connectWallet, addToast, setPage } = useApp();

    // Send side
    const [friendAddr, setFriendAddr] = useState('');
    const multiplier = 1; // Accountability Pairs are always equal stakes
    const [baseInput,  setBaseInput]  = useState('1000');
    const [sending,    setSending]    = useState(false);
    const [sentId,     setSentId]     = useState<string | null>(null);

    // Accept side
    const [acceptId,        setAcceptId]        = useState('');
    const [accepting,       setAccepting]        = useState(false);
    const [mining,          setMining]           = useState(false);
    const [preview,         setPreview]          = useState<ChallengePreview | null>(null);
    const [lookingUp,       setLookingUp]        = useState(false);
    const [incomingIds,     setIncomingIds]      = useState<string[]>([]);
    const [cancelling,      setCancelling]       = useState<string | null>(null);
    const [acceptedTxId,    setAcceptedTxId]     = useState<string | null>(null);

    const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
    const approvePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lookupTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    const stopApprovePoll = () => { if (approvePollRef.current) { clearInterval(approvePollRef.current); approvePollRef.current = null; } };
    useEffect(() => () => {
        stopPoll();
        stopApprovePoll();
        if (lookupTimer.current) clearTimeout(lookupTimer.current);
    }, []);

    // Load incoming challenge IDs when wallet connects
    useEffect(() => {
        if (!address || !STREAK_SATS_ADDRESS) return;
        const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
        provider.getPublicKeyInfo(address, false).then(senderAddr => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            return contract.getIncomingChallenges(senderAddr);
        }).then((result: unknown) => {
            if (!result || typeof result !== 'object') return;
            const ids: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const firstBytes: Uint8Array | undefined = (result as any).properties?.challengeIds;
            if (firstBytes instanceof Uint8Array && firstBytes.length === 32) {
                const id = BigInt('0x' + Array.from(firstBytes).map((b: number) => b.toString(16).padStart(2, '0')).join(''));
                if (id > 0n) ids.push(String(id));
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reader = (result as any).result;
            if (reader && typeof reader.bytesLeft === 'function') {
                while (reader.bytesLeft() >= 32) {
                    const id: bigint = reader.readU256();
                    if (id > 0n) ids.push(String(id));
                }
            }
            setIncomingIds(ids);
        }).catch(console.error);
    }, [address]);

    const baseAmount: bigint = (() => {
        try { return BigInt(Math.round(parseFloat(baseInput) * 1e9)) * (PILL_DECIMALS_BN / 1_000_000_000n); }
        catch { return 0n; }
    })();

    const requiredStake = baseAmount * BigInt(multiplier);

    // ── Challenge lookup ───────────────────────────────────────────────────────
    const lookupChallenge = async (cid: string) => {
        if (!cid || !STREAK_SATS_ADDRESS) { setPreview(null); return; }
        setLookingUp(true);
        try {
            const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK) as any;
            const result   = await contract.getChallengeInfo(BigInt(cid));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = (result as any).properties as {
                fromAddr: bigint; toAddr: bigint; multiplier: bigint;
                baseAmount: bigint; expiry: bigint; status: bigint;
            } | undefined;
            if (!p || p.baseAmount === 0n) { setPreview(null); addToast('Challenge not found', 'error'); return; }

            // fromAddr is stored as u256 big-endian bytes — render as hex address
            const fromHex = p.fromAddr.toString(16).padStart(64, '0');
            const mult    = Number(p.multiplier);
            const base    = p.baseAmount;
            setPreview({
                fromAddr:   formatAddress('0x' + fromHex),
                multiplier: mult,
                baseAmount: base,
                required:   base * BigInt(mult),
                expiry:     p.expiry,
                status:     Number(p.status),
            });
        } catch (err) {
            setPreview(null);
            console.error('getChallengeInfo error:', err);
        } finally {
            setLookingUp(false);
        }
    };

    // Debounce lookup when acceptId changes
    const handleAcceptIdChange = (val: string) => {
        setAcceptId(val);
        setPreview(null);
        if (lookupTimer.current) clearTimeout(lookupTimer.current);
        if (val && /^\d+$/.test(val)) {
            lookupTimer.current = setTimeout(() => lookupChallenge(val), 600);
        }
    };

    // ── Send Challenge (phase 2 — called once allowance is confirmed) ──────────
    const executeChallenge = async () => {
        if (!address) return;
        setSending(true);
        try {
            const provider       = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr     = await provider.getPublicKeyInfo(address, false);
            const friendResolved = await provider.getPublicKeyInfo(friendAddr.trim(), false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const sim  = await contract.challenge(friendResolved, BigInt(multiplier), baseAmount);
            const txId = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cid    = (sim as any)?.properties?.challengeId;
            const cidStr = cid ? String(cid) : '?';
            setSentId(cidStr);
            addToast(`⚔️ Challenge sent! ID: ${cidStr} — share with your friend.`, 'success', txId);
            setFriendAddr('');
        } catch (err: unknown) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setSending(false);
        }
    };

    // ── Send Challenge (phase 1 — check allowance, approve if needed) ──────────
    const handleChallenge = async () => {
        if (!connected || !address) { connectWallet(); return; }
        if (!friendAddr.trim())          { addToast('Enter a wallet address', 'error'); return; }
        if (baseAmount < MIN_PILL_STAKE) { addToast('Base amount must be ≥ 500 PILL', 'error'); return; }
        if (!STREAK_SATS_ADDRESS)        { addToast('Contract not deployed yet', 'error'); return; }

        setSending(true);
        try {
            const provider   = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address, false);
            const streakAddr = await provider.getPublicKeyInfo(STREAK_SATS_ADDRESS!, true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pillContract = getContract(PILL_TOKEN_ADDRESS!, PILL_TOKEN_ABI, provider, NETWORK, senderAddr) as any;

            const allowResult      = await pillContract.allowance(senderAddr, streakAddr);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentAllowance = BigInt(String((allowResult as any)?.properties?.remaining ?? 0n));

            if (currentAllowance >= baseAmount) {
                // Allowance already sufficient — go straight to challenge
                setSending(false);
                await executeChallenge();
                return;
            }

            // Broadcast approval, then poll until it confirms
            const delta      = baseAmount - currentAllowance;
            const approveSim = await pillContract.increaseAllowance(streakAddr, delta);
            await sendTx(approveSim as Parameters<typeof sendTx>[0], address);
            setSending(false);
            addToast('Approval sent — waiting for Bitcoin confirmation…');

            // Poll allowance every 15 s; auto-send challenge once confirmed
            stopApprovePoll();
            approvePollRef.current = setInterval(async () => {
                try {
                    const p2         = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
                    const sa2        = await p2.getPublicKeyInfo(address, false);
                    const sk2        = await p2.getPublicKeyInfo(STREAK_SATS_ADDRESS!, true);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pc2        = getContract(PILL_TOKEN_ADDRESS!, PILL_TOKEN_ABI, p2, NETWORK, sa2) as any;
                    const ar2        = await pc2.allowance(sa2, sk2);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const confirmed  = BigInt(String((ar2 as any)?.properties?.remaining ?? 0n));
                    if (confirmed >= baseAmount) {
                        stopApprovePoll();
                        addToast('Approval confirmed — sending challenge…');
                        await executeChallenge();
                    }
                } catch { /* retry next tick */ }
            }, 15_000);

        } catch (err: unknown) {
            setSending(false);
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    // ── Cancel Challenge ───────────────────────────────────────────────────────
    const handleCancel = async (cid: string) => {
        if (!address || !STREAK_SATS_ADDRESS) return;
        setCancelling(cid);
        try {
            const provider   = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const sim  = await contract.cancelChallenge(BigInt(cid));
            const txId = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Challenge cancelled.', 'success', txId);
            setSentId(null);
        } catch (err: unknown) {
            addToast(`Cancel failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setCancelling(null);
        }
    };

    // ── Accept Challenge (auto-poll pattern) ───────────────────────────────────
    const executeAccept = async (cid: string) => {
        if (!address || !STREAK_SATS_ADDRESS) return;
        setAccepting(true);
        try {
            const provider   = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const sim  = await contract.acceptChallenge(BigInt(cid));
            const txId = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            setAcceptId('');
            setPreview(null);
            setAcceptedTxId(txId ?? null);
            addToast('Challenge accepted — now create your habit!', 'success', txId);
        } catch (err: unknown) {
            addToast(`Accept failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setAccepting(false);
        }
    };

    const handleAccept = async () => {
        if (!connected || !address)  { connectWallet(); return; }
        if (!acceptId.trim())         { addToast('Enter a challenge ID', 'error'); return; }
        if (!preview)                 { addToast('Look up the challenge first', 'error'); return; }
        if (preview.status !== 0)     { addToast('Challenge is no longer pending', 'error'); return; }
        if (!STREAK_SATS_ADDRESS)     { addToast('Contract not deployed yet', 'error'); return; }

        const requiredAmount = preview.required;

        setAccepting(true);
        try {
            const provider   = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address!, false);
            const streakAddr = await provider.getPublicKeyInfo(STREAK_SATS_ADDRESS, true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pillContract = getContract(PILL_TOKEN_ADDRESS, PILL_TOKEN_ABI, provider, NETWORK, senderAddr) as any;
            const allowResult  = await pillContract.allowance(senderAddr, streakAddr);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allowance    = BigInt(String((allowResult as any).properties?.remaining ?? 0));

            if (allowance >= requiredAmount) {
                setAccepting(false);
                await executeAccept(acceptId.trim());
                return;
            }

            // Submit approval, then start auto-polling
            const approveSim = await pillContract.increaseAllowance(streakAddr, requiredAmount - allowance);
            await sendTx(approveSim, address);

            const cidSnapshot = acceptId.trim();

            stopPoll();
            setMining(true);
            setAccepting(false);
            pollRef.current = setInterval(async () => {
                try {
                    const p2      = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
                    const sa2     = await p2.getPublicKeyInfo(address!, false);
                    const streak2 = await p2.getPublicKeyInfo(STREAK_SATS_ADDRESS!, true);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pill2   = getContract(PILL_TOKEN_ADDRESS, PILL_TOKEN_ABI, p2, NETWORK, sa2) as any;
                    const ar2     = await pill2.allowance(sa2, streak2);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const confirmed = BigInt(String((ar2 as any).properties?.remaining ?? 0));
                    if (confirmed >= requiredAmount) {
                        stopPoll();
                        setMining(false);
                        await executeAccept(cidSnapshot);
                    }
                } catch { /* retry next tick */ }
            }, 15_000);

        } catch (err: unknown) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
            setAccepting(false);
        }
    };

    const cancelMining = () => { stopPoll(); setMining(false); };

    if (!connected) {
        return (
            <div className="container section" style={{ textAlign: 'center', maxWidth: 480 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>⚔️</div>
                <h2 style={{ marginBottom: 12 }}>Accountability Pairs</h2>
                <p style={{ marginBottom: 24 }}>Connect your wallet to lock stakes with a rival and put skin in the game.</p>
                <button className="btn btn-primary btn-lg" onClick={connectWallet}>Connect OP_WALLET</button>
            </div>
        );
    }

    return (
        <div className="container section" style={{ maxWidth: 700 }}>
            <h2 style={{ marginBottom: 8 }}>⚔️ Accountability Pairs</h2>
            <p style={{ marginBottom: 32 }}>
                Two wallets. Equal stakes. Same habit. Whoever breaks first feeds the yield pool —
                and their rival earns it. Pure adversarial accountability on Bitcoin L1.
            </p>

            <div className="grid-2" style={{ gap: 24 }}>
                {/* ── Send Pair Request ── */}
                <div>
                    <h3 style={{ marginBottom: 16, color: 'var(--primary)' }}>Create a Pair</h3>
                    <div className="card">
                        <div className="form-group">
                            <label>Rival's Bitcoin Address</label>
                            <input
                                className="input mono"
                                placeholder="bc1q... or opt1..."
                                value={friendAddr}
                                onChange={e => setFriendAddr(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Stake Amount (PILL) — each party locks this</label>
                            <input
                                className="input"
                                type="number"
                                min="500"
                                step="100"
                                value={baseInput}
                                onChange={e => setBaseInput(e.target.value)}
                            />
                        </div>

                        <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: 'var(--text-muted)' }}>You lock</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatPill(baseAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Rival locks</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatPill(baseAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Total at stake</span>
                                <span style={{ color: 'var(--orange)', fontWeight: 800 }}>{formatPill(baseAmount * 2n)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Expires after</span>
                                <span>~48 hours (288 blocks)</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleChallenge}
                            disabled={sending || !friendAddr.trim() || baseAmount < MIN_PILL_STAKE}
                        >
                            {sending
                                ? <><span className="spinner" />Locking stakes…</>
                                : '⚔️ Send Pair Request'}
                        </button>

                        {sentId && (
                            <div style={{ marginTop: 14, padding: 12, background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 13 }}>
                                <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>⚔️ Pair request sent!</div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                                    Share Pair ID{' '}
                                    <strong className="mono" style={{ color: 'var(--orange)', fontSize: 15 }}>#{sentId}</strong>
                                    {' '}with your rival — or they'll see it automatically in their incoming list.
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleCancel(sentId)}
                                    disabled={cancelling === sentId}
                                    style={{ fontSize: 11 }}
                                >
                                    {cancelling === sentId ? <><span className="spinner" style={{ width: 12, height: 12 }} />Cancelling…</> : '✕ Cancel pair request'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Accept Pair Request ── */}
                <div>
                    <h3 style={{ marginBottom: 16, color: 'var(--primary)' }}>Accept a Pair Request</h3>
                    <div className="card" style={{ minHeight: 260 }}>
                        {mining ? (
                            <MiningScreen label="Mining your PILL approval" onCancel={cancelMining} />
                        ) : acceptedTxId ? (
                            /* ── Post-acceptance next-steps panel ── */
                            <div className="step-content">
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: 'var(--green-dim)', border: '1px solid rgba(16,217,168,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 22, marginBottom: 16,
                                }}>
                                    ✓
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: 'var(--green)' }}>
                                    You're locked in. ⚔️
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                                    Equal stakes locked on Bitcoin L1. Now commit to your habit — whoever blinks first loses.
                                </div>

                                <TxLinks txId={acceptedTxId} style={{ marginBottom: 20 }} />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                                    {[
                                        { n: '1', title: 'Create a habit', body: 'Go to "New Habit" and stake PILL on a habit you will commit to — this is your position in the competition.' },
                                        { n: '2', title: 'Check in every period', body: 'Hit Check In on your Dashboard within each window. Every check-in grows your streak and keeps you eligible for yield.' },
                                        { n: '3', title: 'Outlast your rival', body: 'If your rival breaks first, their penalty enters the yield pool — and you earn it back proportionally. Hold longer, earn more.' },
                                    ].map(step => (
                                        <div key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
                                                background: 'var(--primary-dim)', border: '1px solid var(--primary-border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 800, color: 'var(--primary)',
                                            }}>{step.n}</div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{step.title}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.body}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={() => { setPage('create'); }}
                                >
                                    Create My Habit — Start Competing
                                </button>
                                <button
                                    className="btn btn-ghost btn-full"
                                    onClick={() => setAcceptedTxId(null)}
                                    style={{ marginTop: 8, fontSize: 12 }}
                                >
                                    Accept another challenge
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Incoming challenges — auto-discovered */}
                                {incomingIds.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                            Incoming Challenges ({incomingIds.length})
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {incomingIds.map(id => (
                                                <button
                                                    key={id}
                                                    className={`btn btn-sm btn-incoming${acceptId === id ? ' selected' : ''}`}
                                                    onClick={() => handleAcceptIdChange(id)}
                                                    style={{ fontFamily: 'monospace' }}
                                                >
                                                    #{id}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Pair ID</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="input mono"
                                            placeholder="e.g. 1"
                                            value={acceptId}
                                            onChange={e => handleAcceptIdChange(e.target.value.replace(/\D/g, ''))}
                                        />
                                        {lookingUp && (
                                            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
                                        Ask your rival for the Pair ID — or pick from your incoming list above.
                                    </div>
                                </div>

                                {/* Challenge preview card */}
                                {preview && (
                                    <div style={{
                                        background:   preview.status === 0 ? 'var(--primary-dim)' : 'var(--bg)',
                                        border:       `1px solid ${preview.status === 0 ? 'var(--primary-border)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius)',
                                        padding:      14,
                                        marginBottom: 16,
                                        fontSize:     13,
                                    }}>
                                        <div style={{ fontWeight: 700, marginBottom: 10, color: preview.status === 0 ? 'var(--primary)' : 'var(--text-dim)' }}>
                                            {preview.status === 0 ? 'Open Challenge' : preview.status === 1 ? 'Already Accepted' : 'Expired'}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>From</div>
                                                <div className="mono" style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>{preview.fromAddr}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Multiplier</div>
                                                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, color: 'var(--primary)' }}>{preview.multiplier}×</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Base Stake</div>
                                                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{formatPill(preview.baseAmount)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>You Must Stake</div>
                                                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, color: 'var(--green)' }}>{formatPill(preview.required)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    className="btn btn-green btn-full"
                                    onClick={handleAccept}
                                    disabled={accepting || !acceptId.trim() || !preview || preview.status !== 0}
                                >
                                    {accepting
                                        ? <><span className="spinner" />Checking allowance…</>
                                        : preview && preview.status !== 0
                                            ? preview.status === 1 ? 'Already Accepted' : 'Challenge Expired'
                                            : preview
                                                ? `✅ Accept — Stake ${formatPill(preview.required)}`
                                                : '✅ Accept Challenge'}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="info-box" style={{ marginTop: 16, fontSize: 12, lineHeight: 1.7 }}>
                        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 6 }}>How it works</strong>
                        1. You send a pair request — your rival gets it automatically in their incoming list<br />
                        2. They accept → both wallets lock equal PILL on Bitcoin L1<br />
                        3. Both commit to the same habit and check in every period<br />
                        4. Whoever breaks their streak first — their penalty enters the yield pool, earned back by whoever holds longest<br /><br />
                        Pair requests expire after 48 hours (288 blocks). No penalty if expired.
                    </div>
                </div>
            </div>
        </div>
    );
}
