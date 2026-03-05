import React, { useState } from 'react';
import { TxLinks } from './TxLinks';
import { getContract, JSONRpcProvider } from 'opnet';
import { useApp } from '../App';
import { STREAK_SATS_ABI, PILL_TOKEN_ABI } from '../lib/abi';
import {
    STREAK_SATS_ADDRESS, PILL_TOKEN_ADDRESS, NETWORK, RPC_URL,
    HABIT_CATEGORIES, MIN_PILL_STAKE, PILL_DECIMALS_BN, formatPill,
} from '../lib/config';
import { sendTx } from '../lib/hooks';

type FlowStep = 'configure' | 'approving' | 'creating' | 'done';

const DEFAULT_STAKE = 1000n * PILL_DECIMALS_BN;
// 4 steps — the final "Check In" step is shown as "Up Next" on the Done screen
const STEP_LABELS   = ['Setup', 'Approve', 'Create', 'Check In'] as const;

// ── Selector pill button ──────────────────────────────────────────────────────
function PillBtn({
    active, onClick, children, style,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding:      '10px 8px',
                borderRadius: 'var(--radius)',
                border:       `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                background:   active ? 'var(--primary-dim)' : 'var(--bg3)',
                color:        active ? 'var(--primary)'    : 'var(--text-muted)',
                cursor:       'pointer',
                fontSize:     12,
                fontWeight:   600,
                transition:   'all 0.15s',
                textAlign:    'center',
                fontFamily:   'inherit',
                ...style,
            }}
        >
            {children}
        </button>
    );
}

// ── Commitment summary row ────────────────────────────────────────────────────
function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, color: color ?? 'var(--text)' }}>
                {value}
            </div>
        </div>
    );
}

export default function CreateHabit() {
    const { address, connected, connectWallet, setPage, addToast } = useApp();

    // ── Form state ──────────────────────────────────────────────────────────
    const [category,   setCategory]   = useState('exercise');
    const [customName, setCustomName] = useState('');
    const [frequency,  setFrequency]  = useState<'daily' | 'weekly'>('daily');
    const [stakeInput, setStakeInput] = useState('1000');

    // ── Flow state ──────────────────────────────────────────────────────────
    const [flowStep,        setFlowStep]        = useState<FlowStep>('configure');
    const [loading,         setLoading]         = useState(false);
    const [loadingMsg,      setLoadingMsg]       = useState('');
    const [approvalTxId,    setApprovalTxId]    = useState<string | null>(null);
    const [habitTxId,       setHabitTxId]       = useState<string | null>(null);
    const [skippedApproval, setSkippedApproval] = useState(false);

    // ── Derived values ──────────────────────────────────────────────────────
    const stakeRaw: bigint = (() => {
        try { return BigInt(Math.round(parseFloat(stakeInput) * 1e9)) * (PILL_DECIMALS_BN / 1_000_000_000n); }
        catch { return 0n; }
    })();

    const habitName = category === 'custom'
        ? customName
        : (HABIT_CATEGORIES.find(c => c.value === category)?.label ?? '');

    const estimatedWeeklyYield = (): string => {
        const weeklyPool = DEFAULT_STAKE * 100n * 20n / 100n * 10n / 100n;
        const userShare  = stakeRaw > 0n ? weeklyPool * 7n / (7n * 100n) : 0n;
        return formatPill(userShare);
    };

    const isFormValid = habitName.trim().length > 0 && stakeRaw >= MIN_PILL_STAKE;

    // ── Step 1: check allowance, approve if needed, or create directly ──────
    const handleBegin = async () => {
        if (!connected || !address) { connectWallet(); return; }
        if (!habitName.trim())      { addToast('Please enter a habit name', 'error'); return; }
        if (stakeRaw < MIN_PILL_STAKE) { addToast('Minimum stake is 500 PILL', 'error'); return; }
        if (!STREAK_SATS_ADDRESS)   { addToast('Contract not deployed — update config.ts', 'error'); return; }

        setLoading(true);
        setLoadingMsg('Checking PILL allowance...');
        try {
            const provider   = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address!, false);
            const streakAddr = await provider.getPublicKeyInfo(STREAK_SATS_ADDRESS, true);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pillContract = getContract(PILL_TOKEN_ADDRESS, PILL_TOKEN_ABI, provider, NETWORK, senderAddr) as any;
            const allowResult  = await pillContract.allowance(senderAddr, streakAddr);
            const allowProps   = (allowResult as any)?.properties;
            // OP20 allowance may decode as `remaining` or `allowance` depending on ABI version
            const rawAllowance = allowProps?.remaining ?? allowProps?.allowance ?? allowProps?.value ?? 0;
            const allowance    = BigInt(String(rawAllowance));

            if (allowance < stakeRaw) {
                // Need approval — approve MaxUint256 so this is a one-time-ever step
                const MAX_UINT256 = 2n ** 256n - 1n;
                setLoadingMsg('Submitting PILL approval...');
                const approveSim  = await pillContract.increaseAllowance(streakAddr, MAX_UINT256 - allowance);
                const approveTxId = await sendTx(approveSim, address);
                setApprovalTxId(approveTxId ?? 'pending');
                setFlowStep('approving');
                addToast('Approval submitted! After this confirms, all future habits are one-click.', 'success', approveTxId);
            } else {
                // Allowance sufficient — skip approve step, create directly
                setSkippedApproval(true);
                setFlowStep('creating');
                setLoadingMsg('Creating habit on Bitcoin L1...');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
                const sim  = await contract.createHabit(habitName.trim(), frequency, stakeRaw);
                const txId = await sendTx(sim as Parameters<typeof sendTx>[0], address);
                setHabitTxId(txId ?? 'pending');
                setFlowStep('done');
                addToast('Habit submitted! Appears after Bitcoin confirmation.', 'success', txId);
            }
        } catch (err: unknown) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
            // Always reset to configure — flowStep is a stale closure here so don't read it
            setFlowStep('configure');
            setSkippedApproval(false);
        } finally {
            setLoading(false);
            setLoadingMsg('');
        }
    };

    // ── Step 3: create habit after approval confirmed ───────────────────────
    const handleCreate = async () => {
        if (!connected || !address) { connectWallet(); return; }
        setLoading(true);
        setFlowStep('creating');
        setLoadingMsg('Creating habit on Bitcoin L1...');
        try {
            const provider   = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address!, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const sim  = await contract.createHabit(habitName.trim(), frequency, stakeRaw);
            const txId = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            setHabitTxId(txId ?? 'pending');
            setFlowStep('done');
            addToast('Habit submitted! Appears after Bitcoin confirmation.', 'success', txId);
        } catch (err: unknown) {
            setFlowStep('approving');
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setLoading(false);
            setLoadingMsg('');
        }
    };

    // ── Stepper helpers ─────────────────────────────────────────────────────
    // Map flowStep to a numeric position (0-3 for the first 3 steps; step 4 = "Up Next")
    const activeIdx = ({ configure: 0, approving: 1, creating: 2, done: 3 } as const)[flowStep];

    const getStepState = (idx: number): 'completed' | 'active' | 'next' | 'pending' => {
        if (flowStep === 'done') {
            if (idx < 3) return 'completed';   // Setup, Approve, Create — all done
            if (idx === 3) return 'next';       // Check In — up next for the user
        }
        // When approval was skipped and we're at/past creating, mark Approve as auto-completed
        if (skippedApproval && idx === 1 && activeIdx >= 2) return 'completed';
        if (activeIdx > idx)   return 'completed';
        if (activeIdx === idx) return 'active';
        return 'pending';
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="container section" style={{ maxWidth: 540 }}>
            <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage('dashboard')}
                style={{ marginBottom: 24 }}
            >
                ← Back
            </button>

            <h2 style={{ marginBottom: 8 }}>Make Your Commitment On Mother-chain!</h2>
            <p style={{ marginBottom: 28 }}>
                Stake PILL on Bitcoin L1. Break the streak = 10% penalty. Hold = earn yield.
            </p>

            {/* ── Single panel card (MotoSwap-style, never leaves the page) ── */}
            <div className="card card-primary">

                {/* ── Step indicator ──────────────────────────────────────── */}
                <div className="stepper">
                    {STEP_LABELS.map((label, i) => {
                        const state = getStepState(i);
                        const cls = [
                            'stepper-step',
                            state === 'completed' ? 'completed' : '',
                            state === 'active'    ? 'active'    : '',
                            state === 'next'      ? 'next'      : '',
                        ].filter(Boolean).join(' ');
                        return (
                            <React.Fragment key={label}>
                                {i > 0 && (
                                    <div className={`stepper-line${getStepState(i - 1) === 'completed' ? ' completed' : ''}`} />
                                )}
                                <div className={cls}>
                                    <div className="stepper-dot">
                                        {state === 'completed' ? '✓' : i + 1}
                                    </div>
                                    <div className="stepper-label">
                                        {state === 'next' ? 'Up Next' : label}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* ────────────────────────────────────────────────────────── */}
                {/* STEP 0: Configure habit                                    */}
                {/* ────────────────────────────────────────────────────────── */}
                {flowStep === 'configure' && (
                    <div className="step-content">

                        {/* Habit category */}
                        <div className="form-group">
                            <label>Habit Type</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {HABIT_CATEGORIES.map(cat => (
                                    <PillBtn
                                        key={cat.value}
                                        active={category === cat.value}
                                        onClick={() => setCategory(cat.value)}
                                    >
                                        {cat.label}
                                    </PillBtn>
                                ))}
                            </div>
                        </div>

                        {/* Category tip */}
                        {(() => {
                            const cat = HABIT_CATEGORIES.find(c => c.value === category);
                            if (!cat) return null;
                            return (
                                <div
                                    className={`info-box${(cat as { highlight?: boolean }).highlight ? ' warning' : ''}`}
                                    style={{ marginTop: -4, marginBottom: 20, fontSize: 12, lineHeight: 1.65 }}
                                >
                                    <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>
                                        {cat.emoji} What counts as a check-in?
                                    </strong>
                                    {cat.tip}
                                </div>
                            );
                        })()}

                        {/* Custom habit name */}
                        {category === 'custom' && (
                            <div className="form-group">
                                <label>Custom Habit Name</label>
                                <input
                                    className="input"
                                    placeholder="e.g. Walk 10,000 steps"
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                    maxLength={64}
                                />
                            </div>
                        )}

                        {/* Frequency */}
                        <div className="form-group">
                            <label>Check-in Frequency</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['daily', 'weekly'] as const).map(f => (
                                    <PillBtn
                                        key={f}
                                        active={frequency === f}
                                        onClick={() => setFrequency(f)}
                                        style={{ flex: 1, padding: '12px 8px' }}
                                    >
                                        {f === 'daily' ? 'Daily' : 'Weekly'}
                                        <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, opacity: 0.7 }}>
                                            {f === 'daily' ? '~144 blocks / day' : '~1,008 blocks / week'}
                                        </div>
                                    </PillBtn>
                                ))}
                            </div>
                        </div>

                        {/* Stake amount */}
                        <div className="form-group">
                            <label>Stake Amount (PILL)</label>
                            <input
                                className="input"
                                type="number"
                                min="500"
                                step="100"
                                placeholder="500"
                                value={stakeInput}
                                onChange={e => setStakeInput(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                {['500', '1000', '5000', '10000'].map(v => (
                                    <button
                                        key={v}
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setStakeInput(v)}
                                        style={{ flex: 1, padding: '6px 0' }}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                                Min: 500 PILL ·{' '}
                                {stakeRaw >= MIN_PILL_STAKE
                                    ? <span style={{ color: 'var(--green)' }}>Valid amount</span>
                                    : <span style={{ color: 'var(--red)' }}>Below minimum</span>
                                }
                            </div>
                        </div>

                        <div className="divider" />

                        {/* Commitment preview */}
                        <div style={{
                            background:   'var(--bg)',
                            borderRadius: 'var(--radius)',
                            padding:      16,
                            marginBottom: 20,
                        }}>
                            <div style={{
                                fontSize:      11,
                                color:         'var(--text-dim)',
                                marginBottom:  12,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontWeight:    600,
                            }}>
                                Commitment Preview
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <SummaryRow label="Habit"          value={habitName || '—'} />
                                <SummaryRow label="Frequency"      value={frequency} />
                                <SummaryRow label="Your Stake"     value={`${stakeInput} PILL`} color="var(--primary)" />
                                <SummaryRow label="Penalty"        value="10% if broken"   color="var(--red)" />
                                <SummaryRow label="Est. 7-day Yield" value={estimatedWeeklyYield()} color="var(--green)" />
                                <SummaryRow label="Moto Miles"     value="+1 per check-in" color="var(--blue)" />
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg btn-full"
                            onClick={handleBegin}
                            disabled={loading || !isFormValid}
                        >
                            {loading
                                ? <><span className="spinner" />{loadingMsg || 'Checking...'}</>
                                : 'Begin Setup →'}
                        </button>

                        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12 }}>
                            Confirmed on Bitcoin L1 · Gas ~330 sats
                            {' '}
                            <span
                                title="First time? You'll sign a one-time PILL approval tx, then immediately create your habit. After that, all habits are one-click — no more approvals."
                                style={{
                                    display:        'inline-flex',
                                    alignItems:     'center',
                                    justifyContent: 'center',
                                    width:          15,
                                    height:         15,
                                    borderRadius:   '50%',
                                    border:         '1px solid var(--text-dim)',
                                    color:          'var(--text-dim)',
                                    fontSize:       10,
                                    cursor:         'help',
                                    verticalAlign:  'middle',
                                    userSelect:     'none',
                                }}
                            >
                                ?
                            </span>
                        </p>
                    </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* STEP 1: Approval pending                                   */}
                {/* ────────────────────────────────────────────────────────── */}
                {flowStep === 'approving' && (
                    <div className="step-content">
                        <div className="info-box" style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text)', fontSize: 14 }}>
                                One-Time PILL Approval
                            </div>
                            This is a one-time setup. Once confirmed (~2 min), all future habits
                            will be created in a single click — no more approvals needed.
                        </div>

                        {/* Habit summary */}
                        <div style={{
                            background:   'var(--bg)',
                            borderRadius: 'var(--radius)',
                            padding:      '14px 16px',
                            marginBottom: 20,
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <SummaryRow label="Habit"      value={habitName} />
                                <SummaryRow label="Frequency"  value={frequency} />
                                <SummaryRow label="Stake"      value={`${stakeInput} PILL`} color="var(--primary)" />
                                <SummaryRow label="Est. Yield" value={estimatedWeeklyYield()} color="var(--green)" />
                            </div>
                        </div>

                        <TxLinks txId={approvalTxId} style={{ marginBottom: 12 }} />

                        <button
                            className="btn btn-primary btn-lg btn-full"
                            onClick={handleCreate}
                            disabled={loading}
                        >
                            {loading
                                ? <><span className="spinner" />{loadingMsg}</>
                                : 'Continue — Create Habit →'}
                        </button>

                        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12 }}>
                            Wait for approval confirmation before clicking Continue
                        </p>
                    </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* STEP 2: Creating (in-progress)                             */}
                {/* ────────────────────────────────────────────────────────── */}
                {flowStep === 'creating' && (
                    <div className="step-content" style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                            <span className="spinner spinner-lg" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                            Creating your habit...
                        </div>
                        <p style={{ fontSize: 13 }}>{loadingMsg || 'Submitting to Bitcoin L1'}</p>
                    </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* STEP 4 DONE — habit created, bridge to first check-in      */}
                {/* ────────────────────────────────────────────────────────── */}
                {flowStep === 'done' && (
                    <div className="step-content">

                        {/* Success header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                            <div style={{
                                width:          48,
                                height:         48,
                                borderRadius:   '50%',
                                background:     'var(--green-dim)',
                                border:         '2px solid var(--green)',
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                flexShrink:     0,
                                fontSize:       22,
                                color:          'var(--green)',
                                fontWeight:     700,
                            }}>
                                ✓
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 18 }}>Commitment live on Bitcoin L1</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Confirmation takes ~2 min on testnet
                                </div>
                            </div>
                        </div>

                        {/* Step 4 callout — the key missing piece */}
                        <div style={{
                            background:   'var(--primary-dim)',
                            border:       '1px solid var(--primary-border)',
                            borderRadius: 'var(--radius)',
                            padding:      '18px 20px',
                            marginBottom: 20,
                        }}>
                            <div style={{
                                display:      'flex',
                                alignItems:   'center',
                                gap:          10,
                                marginBottom: 12,
                            }}>
                                <div style={{
                                    width:          28,
                                    height:         28,
                                    borderRadius:   '50%',
                                    border:         '2px solid var(--primary)',
                                    display:        'flex',
                                    alignItems:     'center',
                                    justifyContent: 'center',
                                    fontSize:       13,
                                    fontWeight:     700,
                                    color:          'var(--primary)',
                                    flexShrink:     0,
                                }}>
                                    4
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
                                    Step 4: Your First Check-In
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                                <div style={{
                                    display:      'flex',
                                    alignItems:   'flex-start',
                                    gap:          10,
                                    background:   'var(--bg)',
                                    borderRadius: 8,
                                    padding:      '10px 12px',
                                }}>
                                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>1</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        Go to <strong style={{ color: 'var(--text)' }}>Dashboard</strong> after confirmation.
                                        Your habit card will appear there.
                                    </span>
                                </div>
                                <div style={{
                                    display:      'flex',
                                    alignItems:   'flex-start',
                                    gap:          10,
                                    background:   'var(--bg)',
                                    borderRadius: 8,
                                    padding:      '10px 12px',
                                }}>
                                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>2</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        Click <strong style={{ color: 'var(--text)' }}>Check In — Day 1 →</strong> on the card.
                                        It opens the same guided flow you just completed.
                                    </span>
                                </div>
                                <div style={{
                                    display:      'flex',
                                    alignItems:   'flex-start',
                                    gap:          10,
                                    background:   'var(--bg)',
                                    borderRadius: 8,
                                    padding:      '10px 12px',
                                }}>
                                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>3</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        Repeat every <strong style={{ color: 'var(--text)' }}>
                                            {frequency === 'daily' ? '24 hours' : '7 days'}
                                        </strong>. Miss the window and a 10% penalty is taken from your stake.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Yield reminder */}
                        <div className="info-box success" style={{ marginBottom: 20, fontSize: 12 }}>
                            <strong style={{ color: 'var(--green)' }}>How yield works:</strong>{' '}
                            When anyone breaks their streak, 10% of their stake enters the yield pool.
                            That pool is redistributed to all active stakers proportional to their PILL at risk —
                            the more you stake, the larger your share.
                        </div>

                        {/* Actions */}
                        <button
                            className="btn btn-primary btn-lg btn-full"
                            onClick={() => setPage('dashboard')}
                            style={{ marginBottom: 10 }}
                        >
                            Go to Dashboard — Start Check-In →
                        </button>

                        <TxLinks txId={habitTxId} />
                    </div>
                )}

            </div>
        </div>
    );
}
