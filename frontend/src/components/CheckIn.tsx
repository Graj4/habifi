import React, { useState } from 'react';
import { TxLinks } from './TxLinks';
import { getContract, JSONRpcProvider } from 'opnet';
import { useApp } from '../App';
import { STREAK_SATS_ABI } from '../lib/abi';
import { STREAK_SATS_ADDRESS, NETWORK, RPC_URL, formatPill, BLOCKS_PER_DAY } from '../lib/config';
import { sendTx, useCurrentBlock } from '../lib/hooks';

type FlowStep = 'review' | 'confirm' | 'submitting' | 'done';

const STEP_LABELS = ['Review', 'Confirm', 'Submit', 'Done'] as const;

function blocksToTime(blocks: number): string {
    if (blocks <= 0) return 'window closing';
    const mins = blocks * 10;
    if (mins < 60) return `${mins}m remaining`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m remaining`;
}

export default function CheckIn() {
    const { address, setPage, addToast, selectedHabit, selectedHabitIdx } = useApp();
    const currentBlock = Number(useCurrentBlock()); // guard: opnet resolves bigint at runtime

    const [flowStep, setFlowStep] = useState<FlowStep>('review');
    const [loading,  setLoading]  = useState(false);
    const [txId,     setTxId]     = useState<string | null>(null);

    // ── Guards ──────────────────────────────────────────────────────────────
    if (!selectedHabit) {
        return (
            <div className="container section" style={{ maxWidth: 540, textAlign: 'center' }}>
                <p style={{ marginBottom: 16 }}>No habit selected.</p>
                <button className="btn btn-primary" onClick={() => setPage('dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const habit     = selectedHabit;
    const habitLabel = habit.name || `Habit #${selectedHabitIdx + 1}`;

    // ── Derived values ──────────────────────────────────────────────────────
    const isFirstCheckIn = habit.lastCheckIn === 0;
    const deadline       = habit.lastCheckIn + habit.frequency;
    const blocksLeft     = currentBlock > 0 && !isFirstCheckIn ? deadline - currentBlock : null;
    const isUrgent       = blocksLeft !== null && blocksLeft < 20;
    const isExpired      = blocksLeft !== null && blocksLeft <= 0;

    const freqLabel  = habit.frequency >= BLOCKS_PER_DAY ? 'Daily' : 'Weekly';
    const stakeLabel = formatPill(habit.stakeAmount);

    // ── Submit check-in TX ──────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!address || !STREAK_SATS_ADDRESS) {
            addToast('Wallet not connected or contract not deployed', 'error');
            return;
        }
        setLoading(true);
        setFlowStep('submitting');
        try {
            const provider   = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
            const senderAddr = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const sim        = await contract.checkIn(habit.id);
            if (sim && typeof sim === 'object' && 'error' in sim) throw new Error(String((sim as any).error));
            const submittedTxId = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            setTxId(submittedTxId ?? 'pending');
            setFlowStep('done');
            addToast(`Day ${habit.streak + 1} locked in! +1 Moto Mile earned.`, 'success', submittedTxId ?? undefined);
        } catch (err: unknown) {
            setFlowStep('confirm');
            addToast(`Check-in failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Stepper state ───────────────────────────────────────────────────────
    const stepOrder: Record<FlowStep, number> = { review: 0, confirm: 1, submitting: 2, done: 3 };
    const activeIdx = stepOrder[flowStep];

    const getStepState = (idx: number): 'completed' | 'active' | 'pending' => {
        if (flowStep === 'done')  return 'completed';
        if (activeIdx > idx)     return 'completed';
        if (activeIdx === idx)   return 'active';
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
                ← Back to Dashboard
            </button>

            <h2 style={{ marginBottom: 4 }}>Daily Check-In</h2>
            <p style={{ marginBottom: 28 }}>
                {habitLabel} · Prove you showed up. Your stake depends on it.
            </p>

            <div className="card" style={{
                borderColor: isUrgent ? 'var(--orange-border)' : 'var(--primary-border)',
                background:  isUrgent
                    ? 'linear-gradient(135deg, var(--orange-dim) 0%, var(--bg2) 60%)'
                    : 'linear-gradient(135deg, var(--primary-dim) 0%, var(--bg2) 60%)',
            }}>

                {/* ── Step indicator ────────────────────────────────────────── */}
                <div className="stepper">
                    {STEP_LABELS.map((label, i) => {
                        const state = getStepState(i);
                        return (
                            <React.Fragment key={label}>
                                {i > 0 && (
                                    <div className={`stepper-line${getStepState(i - 1) === 'completed' ? ' completed' : ''}`} />
                                )}
                                <div className={`stepper-step${state === 'completed' ? ' completed' : ''}${state === 'active' ? ' active' : ''}`}>
                                    <div className="stepper-dot">
                                        {state === 'completed' ? '✓' : i + 1}
                                    </div>
                                    <div className="stepper-label">{label}</div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* STEP 1: Review                                               */}
                {/* ──────────────────────────────────────────────────────────── */}
                {flowStep === 'review' && (
                    <div className="step-content">

                        {/* Streak display */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div className="streak-number" style={{ fontSize: 80 }}>
                                {habit.streak}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                                {habit.streak === 0 ? 'Starting your streak' : `day streak · going for Day ${habit.streak + 1}`}
                            </div>
                        </div>

                        {/* Stats row */}
                        <div style={{
                            display:      'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap:          1,
                            background:   'var(--border)',
                            borderRadius: 'var(--radius)',
                            overflow:     'hidden',
                            marginBottom: 20,
                        }}>
                            {[
                                { label: 'Stake at Risk', value: stakeLabel,  color: 'var(--primary)' },
                                { label: 'Frequency',     value: freqLabel,   color: 'var(--text)'    },
                                { label: 'Moto Miles',    value: '+1 earned', color: 'var(--blue)'    },
                            ].map(({ label, value, color }) => (
                                <div key={label} style={{ background: 'var(--bg2)', padding: '14px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Time window */}
                        {isFirstCheckIn ? (
                            <div className="info-box success" style={{ marginBottom: 20 }}>
                                <strong style={{ color: 'var(--green)' }}>First check-in — no deadline yet.</strong>{' '}
                                After this, you'll have {freqLabel === 'Daily' ? '~24h' : '~7 days'} between each check-in.
                            </div>
                        ) : isExpired ? (
                            <div className="info-box error" style={{ marginBottom: 20 }}>
                                <strong style={{ color: 'var(--red)' }}>Check-in window has closed.</strong>{' '}
                                Your streak may already be at risk. Check in now to see if it can be saved.
                            </div>
                        ) : (
                            <div className={`info-box${isUrgent ? ' warning' : ''}`} style={{ marginBottom: 20 }}>
                                <strong style={{ color: isUrgent ? 'var(--orange)' : 'var(--text)' }}>
                                    {isUrgent ? 'Urgent — ' : ''}
                                    {blocksLeft !== null ? blocksToTime(blocksLeft) : 'Calculating...'}
                                </strong>
                                {' '}· Miss the window and your 10% penalty kicks in.
                            </div>
                        )}

                        {/* What happens */}
                        <div style={{
                            background:   'var(--bg)',
                            borderRadius: 'var(--radius)',
                            padding:      '14px 16px',
                            marginBottom: 20,
                            fontSize:     13,
                        }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                What check-in does
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Streak</span>
                                    <span style={{ fontWeight: 700, color: 'var(--orange)' }}>
                                        Day {habit.streak} → Day {habit.streak + 1}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Moto Miles</span>
                                    <span style={{ fontWeight: 700, color: 'var(--blue)' }}>+1 mile</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Yield eligibility</span>
                                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>Maintained</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Gas cost</span>
                                    <span style={{ fontWeight: 700 }}>~330 sats</span>
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg btn-full"
                            onClick={() => setFlowStep('confirm')}
                        >
                            Continue to Confirm →
                        </button>
                    </div>
                )}

                {/* ──────────────────────────────────────────────────────────── */}
                {/* STEP 2: Confirm                                              */}
                {/* ──────────────────────────────────────────────────────────── */}
                {flowStep === 'confirm' && (
                    <div className="step-content">
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{
                                fontSize:   13,
                                color:      'var(--text-muted)',
                                marginBottom: 6,
                            }}>
                                You are checking in for
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
                                {habitLabel}
                            </div>
                            <div style={{ color: 'var(--orange)', fontWeight: 700, fontSize: 16 }}>
                                Day {habit.streak} → Day {habit.streak + 1}
                            </div>
                        </div>

                        {/* Commitment summary */}
                        <div style={{
                            background:   'var(--bg)',
                            borderRadius: 'var(--radius)',
                            padding:      '16px',
                            marginBottom: 20,
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Stake Protected</div>
                                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{stakeLabel}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Miles Earned</div>
                                    <div style={{ fontWeight: 700, color: 'var(--blue)' }}>+1 Moto Mile</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Yield Status</div>
                                    <div style={{ fontWeight: 700, color: 'var(--green)' }}>Active</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Network</div>
                                    <div style={{ fontWeight: 700 }}>Bitcoin L1</div>
                                </div>
                            </div>
                        </div>

                        <div className="info-box" style={{ marginBottom: 20 }}>
                            Your check-in is recorded permanently on Bitcoin L1. This confirms
                            you completed your habit and keeps your streak alive.
                        </div>

                        <button
                            className="btn btn-green btn-lg btn-full"
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{ marginBottom: 10 }}
                        >
                            {loading
                                ? <><span className="spinner" />Submitting...</>
                                : `Confirm Check-In — Day ${habit.streak + 1}`}
                        </button>

                        <button
                            className="btn btn-ghost btn-full"
                            onClick={() => setFlowStep('review')}
                            style={{ fontSize: 13 }}
                        >
                            ← Back to Review
                        </button>
                    </div>
                )}

                {/* ──────────────────────────────────────────────────────────── */}
                {/* STEP 3: Submitting                                           */}
                {/* ──────────────────────────────────────────────────────────── */}
                {flowStep === 'submitting' && (
                    <div className="step-content" style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <span className="spinner spinner-lg" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                            Submitting to Bitcoin L1...
                        </div>
                        <p style={{ fontSize: 13 }}>
                            Sign the transaction in your wallet when prompted.
                        </p>
                    </div>
                )}

                {/* ──────────────────────────────────────────────────────────── */}
                {/* STEP 4: Done                                                 */}
                {/* ──────────────────────────────────────────────────────────── */}
                {flowStep === 'done' && (
                    <div className="step-content" style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width:          64,
                            height:         64,
                            borderRadius:   '50%',
                            background:     'var(--green-dim)',
                            border:         '2px solid var(--green)',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            margin:         '0 auto 20px',
                            fontSize:       28,
                            color:          'var(--green)',
                            fontWeight:     700,
                        }}>
                            ✓
                        </div>

                        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>
                            Day {habit.streak + 1} locked in!
                        </div>
                        <p style={{ marginBottom: 8 }}>
                            Your streak is safe. +1 Moto Mile earned.
                        </p>
                        <p style={{ fontSize: 12, marginBottom: 24 }}>
                            Dashboard updates after Bitcoin confirmation (~2 min on testnet).
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <TxLinks txId={txId} />
                            <button
                                className="btn btn-primary btn-lg btn-full"
                                onClick={() => setPage('dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
