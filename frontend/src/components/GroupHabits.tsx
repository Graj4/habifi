import { useCallback, useEffect, useRef, useState } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import { useApp } from '../App';
import { STREAK_SATS_ABI, PILL_TOKEN_ABI } from '../lib/abi';
import {
    STREAK_SATS_ADDRESS, PILL_TOKEN_ADDRESS, NETWORK, RPC_URL,
    MIN_PILL_STAKE, PILL_DECIMALS_BN, formatPill, formatAddress,
} from '../lib/config';
import { sendTx } from '../lib/hooks';

// ─── Types ─────────────────────────────────────────────────────────────────────
const GROUP_OPEN      = 0n;
const GROUP_ACTIVE    = 1n;
const GROUP_FINISHED  = 2n;
const GROUP_CANCELLED = 3n;

const FREQ_LABEL: Record<string, string> = { daily: 'Daily', weekly: 'Weekly' };

interface GroupInfo {
    id:            bigint;
    name:          string;
    frequency:     bigint;   // blocks
    duration:      bigint;   // blocks
    minStake:      bigint;
    maxPlayers:    number;
    status:        bigint;
    startBlock:    bigint;
    totalPool:     bigint;
    memberCount:   number;
    survivorCount: number;
}

interface MemberInfo {
    address:     string;
    stake:       bigint;
    isActive:    boolean;
    lastCheckIn: bigint;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function statusLabel(s: bigint): { text: string; color: string } {
    if (s === GROUP_OPEN)      return { text: 'Open',      color: 'var(--primary)' };
    if (s === GROUP_ACTIVE)    return { text: 'Active',    color: 'var(--green)'   };
    if (s === GROUP_FINISHED)  return { text: 'Finished',  color: 'var(--text-dim)'};
    if (s === GROUP_CANCELLED) return { text: 'Cancelled', color: 'var(--red)'     };
    return { text: 'Unknown', color: 'var(--text-dim)' };
}

function freqLabel(blocks: bigint): string {
    const BLOCKS_PER_DAY = 144n;
    if (blocks <= BLOCKS_PER_DAY) return 'Daily';
    return 'Weekly';
}

function durationLabel(blocks: bigint): string {
    const days = Number(blocks) / 144;
    return `${Math.round(days)} days`;
}

const MINING_QUIPS = [
    'Satoshi is reviewing your request…',
    'Miners are hashing your move…',
    'Bitcoin L1 does not rush for anyone…',
    'Proof-of-patience activated…',
    'HODL the vibe — block incoming…',
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
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{label}{dots}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{MINING_QUIPS[quipIdx]}</div>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
    );
}

// ─── Provider singleton ─────────────────────────────────────────────────────────
let _provider: JSONRpcProvider | null = null;
function getProvider() {
    if (!_provider) _provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
    return _provider;
}

// ─── Read helpers ───────────────────────────────────────────────────────────────
async function fetchGroupIds(): Promise<bigint[]> {
    if (!STREAK_SATS_ADDRESS) return [];
    const provider = getProvider();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK) as any;
    // groupCount is a public stored value — read first N by trying getGroupInfo(1..N)
    // We use getStats to find nothing, but groupCount isn't exposed via ABI directly.
    // Instead, we iterate from 1 until we get an empty name (revert = no more groups).
    const ids: bigint[] = [];
    for (let i = 1n; i <= 50n; i++) {
        try {
            const r = await contract.getGroupName(i);
            const name = r?.properties?.name ?? r?.name ?? '';
            if (!name) break;
            ids.push(i);
        } catch {
            break;
        }
    }
    return ids;
}

async function fetchGroupInfo(id: bigint): Promise<GroupInfo | null> {
    if (!STREAK_SATS_ADDRESS) return null;
    try {
        const provider = getProvider();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK) as any;
        const [nameRes, infoRes] = await Promise.all([
            contract.getGroupName(id),
            contract.getGroupInfo(id),
        ]);
        const name = nameRes?.properties?.name ?? nameRes?.name ?? '';
        const p    = infoRes?.properties ?? infoRes ?? {};
        return {
            id,
            name,
            frequency:     BigInt(p.frequency     ?? 0n),
            duration:      BigInt(p.duration       ?? 0n),
            minStake:      BigInt(p.minStake        ?? 0n),
            maxPlayers:    Number(p.maxPlayers      ?? 0),
            status:        BigInt(p.status          ?? 0n),
            startBlock:    BigInt(p.startBlock      ?? 0n),
            totalPool:     BigInt(p.totalPool       ?? 0n),
            memberCount:   Number(p.memberCount     ?? 0),
            survivorCount: Number(p.survivorCount   ?? 0),
        };
    } catch {
        return null;
    }
}

async function fetchGroupMembers(groupId: bigint, memberCount: number): Promise<MemberInfo[]> {
    if (!STREAK_SATS_ADDRESS || memberCount === 0) return [];
    try {
        const provider = getProvider();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK) as any;
        const res = await contract.getGroupMembers(groupId);
        const reader = res?.result;
        if (!reader) return [];
        const members: MemberInfo[] = [];
        // First member is in properties.members, rest via BinaryReader
        const first = res?.properties?.members;
        if (first === undefined) return [];

        // Each member = 4×u256 = addr, stake, isActive, lastCheckIn
        // The SDK only decodes the first u256 in properties; rest are in the BinaryReader
        const total = memberCount;
        const allU256s: bigint[] = [BigInt(first)];
        while (reader.bytesLeft() >= 32) {
            allU256s.push(reader.readU256() as bigint);
        }
        // Group into chunks of 4
        for (let i = 0; i < total && i * 4 + 3 < allU256s.length; i++) {
            const addrVal     = allU256s[i * 4];
            const stake       = allU256s[i * 4 + 1];
            const isActiveVal = allU256s[i * 4 + 2];
            const lastCheckIn = allU256s[i * 4 + 3];
            // Convert address u256 to hex string
            const hex = addrVal.toString(16).padStart(64, '0');
            members.push({
                address:     '0x' + hex,
                stake,
                isActive:    isActiveVal !== 0n,
                lastCheckIn,
            });
        }
        return members;
    } catch {
        return [];
    }
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function GroupHabits() {
    const { address, connected, connectWallet, addToast } = useApp();
    const [tab,          setTab]          = useState<'browse' | 'create'>('browse');
    const [groups,       setGroups]       = useState<GroupInfo[]>([]);
    const [loadingList,  setLoadingList]  = useState(true);
    const [selectedId,   setSelectedId]   = useState<bigint | null>(null);
    const [members,      setMembers]      = useState<MemberInfo[]>([]);
    const [loadingDetail,setLoadingDetail]= useState(false);
    const [mining,       setMining]       = useState('');
    const mountedRef = useRef(true);
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

    // ── Browse: load group list ─────────────────────────────────────────────────
    const loadGroups = useCallback(async () => {
        setLoadingList(true);
        try {
            const ids = await fetchGroupIds();
            const infos = await Promise.all(ids.map(fetchGroupInfo));
            if (mountedRef.current) setGroups(infos.filter(Boolean) as GroupInfo[]);
        } catch { /* silent */ }
        if (mountedRef.current) setLoadingList(false);
    }, []);

    useEffect(() => { void loadGroups(); }, [loadGroups]);

    // ── Detail: load members when group selected ────────────────────────────────
    useEffect(() => {
        if (selectedId === null) return;
        const grp = groups.find(g => g.id === selectedId);
        if (!grp) return;
        setLoadingDetail(true);
        fetchGroupMembers(selectedId, grp.memberCount)
            .then(m => { if (mountedRef.current) { setMembers(m); setLoadingDetail(false); } })
            .catch(() => { if (mountedRef.current) setLoadingDetail(false); });
    }, [selectedId, groups]);

    // ── Create form state ───────────────────────────────────────────────────────
    const [cName,     setCName]     = useState('');
    const [cFreq,     setCFreq]     = useState<'daily' | 'weekly'>('daily');
    const [cDuration, setCDuration] = useState('30');
    const [cMinStake, setCMinStake] = useState('500');
    const [cMaxPlay,  setCMaxPlay]  = useState('5');

    // ── Tx helpers ───────────────────────────────────────────────────────────────
    const ensureApproval = async (amount: bigint) => {
        if (!address || !PILL_TOKEN_ADDRESS || !STREAK_SATS_ADDRESS) return;
        const provider     = getProvider();
        const senderInfo   = await provider.getPublicKeyInfo(address, false);
        const streakInfo   = await provider.getPublicKeyInfo(STREAK_SATS_ADDRESS, true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pillContract = getContract(PILL_TOKEN_ADDRESS, PILL_TOKEN_ABI, provider, NETWORK, senderInfo) as any;

        const readAllowance = async (): Promise<bigint> => {
            const res = await pillContract.allowance(senderInfo, streakInfo);
            return BigInt(res?.properties?.remaining ?? res?.remaining ?? 0n);
        };

        const allowance = await readAllowance();
        const MAX_U256  = (1n << 256n) - 1n;
        if (allowance >= amount) return;

        const delta = MAX_U256 - allowance;
        setMining('Approving PILL');
        const approveSim = await pillContract.increaseAllowance(streakInfo, delta);
        const txId = await sendTx(approveSim as Parameters<typeof sendTx>[0], address);
        addToast('PILL approved — waiting for confirmation…', 'success', txId);

        // Poll until allowance is confirmed on-chain (up to ~5 min)
        setMining('Waiting for approval confirmation');
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 15_000));
            const updated = await readAllowance();
            if (updated >= amount) return;
        }
        throw new Error('Approval not confirmed after 5 minutes — please try again');
    };

    const handleCreate = async () => {
        if (!connected || !address) { connectWallet(); return; }
        const name     = cName.trim();
        const duration = parseInt(cDuration, 10);
        const maxPlay  = parseInt(cMaxPlay, 10);
        const minStake = BigInt(Math.round(parseFloat(cMinStake))) * PILL_DECIMALS_BN;
        if (!name)                                              { addToast('Enter a group name', 'error'); return; }
        if (isNaN(duration) || duration < 7 || duration > 90)  { addToast('Duration must be 7–90 days', 'error'); return; }
        if (isNaN(maxPlay)  || maxPlay  < 2 || maxPlay  > 10)  { addToast('Max players must be 2–10',   'error'); return; }
        if (minStake < MIN_PILL_STAKE)                          { addToast('Min stake too low (500 PILL minimum)', 'error'); return; }
        try {
            await ensureApproval(minStake);
            setMining('Creating group');
            const provider   = getProvider();
            const senderInfo = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderInfo) as any;
            const sim        = await contract.createGroupHabit(name, cFreq, BigInt(duration), minStake, BigInt(maxPlay));
            const txId       = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Group created!', 'success', txId);
            setTab('browse');
            void loadGroups();
        } catch (e: unknown) {
            setMining('');
            addToast(e instanceof Error ? e.message : 'Transaction failed', 'error');
        }
        setMining('');
    };

    const handleJoin = async (grp: GroupInfo) => {
        if (!connected || !address) { connectWallet(); return; }
        try {
            await ensureApproval(grp.minStake);
            setMining('Joining group');
            const provider   = getProvider();
            const senderInfo = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderInfo) as any;
            const sim        = await contract.joinGroupHabit(grp.id, grp.minStake);
            const txId       = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Joined group!', 'success', txId);
            void loadGroups();
        } catch (e: unknown) {
            setMining('');
            addToast(e instanceof Error ? e.message : 'Join failed', 'error');
        }
        setMining('');
    };

    const handleStart = async (grp: GroupInfo) => {
        if (!connected || !address) { connectWallet(); return; }
        try {
            setMining('Starting group');
            const provider   = getProvider();
            const senderInfo = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderInfo) as any;
            const sim        = await contract.startGroupHabit(grp.id);
            const txId       = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Group started!', 'success', txId);
            void loadGroups();
        } catch (e: unknown) {
            setMining('');
            addToast(e instanceof Error ? e.message : 'Start failed', 'error');
        }
        setMining('');
    };

    const handleCancel = async (grp: GroupInfo) => {
        if (!connected || !address) { connectWallet(); return; }
        try {
            setMining('Cancelling group');
            const provider   = getProvider();
            const senderInfo = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderInfo) as any;
            const sim        = await contract.cancelGroupHabit(grp.id);
            const txId       = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Group cancelled, stakes refunded', 'success', txId);
            void loadGroups();
        } catch (e: unknown) {
            setMining('');
            addToast(e instanceof Error ? e.message : 'Cancel failed', 'error');
        }
        setMining('');
    };

    const handleCheckIn = async (grp: GroupInfo) => {
        if (!connected || !address) { connectWallet(); return; }
        try {
            setMining('Checking in');
            const provider   = getProvider();
            const senderInfo = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderInfo) as any;
            const sim        = await contract.checkInGroup(grp.id);
            const txId       = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Group check-in recorded!', 'success', txId);
            void loadGroups();
        } catch (e: unknown) {
            setMining('');
            addToast(e instanceof Error ? e.message : 'Check-in failed', 'error');
        }
        setMining('');
    };

    const handleEliminate = async (grp: GroupInfo, memberAddr: string) => {
        if (!connected || !address) { connectWallet(); return; }
        try {
            const provider   = getProvider();
            const senderInfo = await provider.getPublicKeyInfo(address, false);
            const memberInfo = await provider.getPublicKeyInfo(memberAddr, false);
            setMining('Eliminating member');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderInfo) as any;
            const sim      = await contract.eliminateGroupMember(grp.id, memberInfo);
            const txId     = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Member eliminated', 'success', txId);
            void loadGroups();
        } catch (e: unknown) {
            setMining('');
            addToast(e instanceof Error ? e.message : 'Elimination failed', 'error');
        }
        setMining('');
    };

    const handleClaim = async (grp: GroupInfo) => {
        if (!connected || !address) { connectWallet(); return; }
        try {
            setMining('Claiming winnings');
            const provider   = getProvider();
            const senderInfo = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract   = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderInfo) as any;
            const sim        = await contract.claimGroupWinnings(grp.id);
            const txId       = await sendTx(sim as Parameters<typeof sendTx>[0], address);
            addToast('Winnings claimed!', 'success', txId);
            void loadGroups();
        } catch (e: unknown) {
            setMining('');
            addToast(e instanceof Error ? e.message : 'Claim failed', 'error');
        }
        setMining('');
    };

    // ─── Render ─────────────────────────────────────────────────────────────────
    if (mining) {
        return (
            <div className="container" style={{ paddingTop: 48 }}>
                <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
                    <MiningScreen label={mining} onCancel={() => setMining('')} />
                </div>
            </div>
        );
    }

    const selectedGroup = groups.find(g => g.id === selectedId) ?? null;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                    Group Habit Pools
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Stake PILL with a group · Last ones standing split the pot
                </p>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['browse', 'create'] as const).map(t => (
                    <button
                        key={t}
                        className="btn btn-sm"
                        onClick={() => { setTab(t); setSelectedId(null); }}
                        style={{
                            background: tab === t ? 'var(--primary)' : 'var(--bg3)',
                            color:      tab === t ? '#fff' : 'var(--text-muted)',
                            border:     '1px solid ' + (tab === t ? 'var(--primary)' : 'var(--border2)'),
                            fontWeight: tab === t ? 700 : 500,
                        }}
                    >
                        {t === 'browse' ? 'Browse Groups' : '+ Create Group'}
                    </button>
                ))}
            </div>

            {/* ── Browse tab ─────────────────────────────────────────────────── */}
            {tab === 'browse' && !selectedGroup && (
                <>
                    {loadingList ? (
                        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px' }} />
                            Loading groups…
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>No groups yet</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                                Be the first to create a group habit pool!
                            </div>
                            <button className="btn btn-primary" onClick={() => setTab('create')}>
                                Create Group
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {groups.map(grp => {
                                const s = statusLabel(grp.status);
                                return (
                                    <div
                                        key={String(grp.id)}
                                        className="card"
                                        style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                                        onClick={() => setSelectedId(grp.id)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                            <div style={{ fontWeight: 700, fontSize: 16 }}>{grp.name}</div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: s.color, background: s.color + '20', borderRadius: 20, padding: '2px 10px' }}>
                                                {s.text}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                            <span>Frequency</span><span style={{ textAlign: 'right', color: 'var(--text)' }}>{freqLabel(grp.frequency)}</span>
                                            <span>Duration</span><span  style={{ textAlign: 'right', color: 'var(--text)' }}>{durationLabel(grp.duration)}</span>
                                            <span>Min stake</span><span style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{formatPill(grp.minStake)}</span>
                                            <span>Total pool</span><span style={{ textAlign: 'right', color: 'var(--orange)', fontWeight: 700 }}>{formatPill(grp.totalPool)}</span>
                                            <span>Players</span><span style={{ textAlign: 'right', color: 'var(--text)' }}>{grp.memberCount}/{grp.maxPlayers}</span>
                                            <span>Survivors</span><span style={{ textAlign: 'right', color: 'var(--green)' }}>{grp.survivorCount}</span>
                                        </div>
                                        <div style={{ marginTop: 12, color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>
                                            View details →
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── Group detail ────────────────────────────────────────────────── */}
            {tab === 'browse' && selectedGroup && (
                <div style={{ maxWidth: 560, margin: '0 auto' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedId(null)}
                        style={{ marginBottom: 16 }}
                    >
                        ← Back
                    </button>

                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{selectedGroup.name}</h2>
                            <span style={{
                                fontSize: 12, fontWeight: 600,
                                color: statusLabel(selectedGroup.status).color,
                                background: statusLabel(selectedGroup.status).color + '20',
                                borderRadius: 20, padding: '3px 12px',
                            }}>
                                {statusLabel(selectedGroup.status).text}
                            </span>
                        </div>

                        {/* Info grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 0', fontSize: 14, marginBottom: 20 }}>
                            {[
                                ['Frequency',    freqLabel(selectedGroup.frequency)],
                                ['Duration',     durationLabel(selectedGroup.duration)],
                                ['Min stake',    formatPill(selectedGroup.minStake)],
                                ['Total pool',   formatPill(selectedGroup.totalPool)],
                                ['Players',      `${selectedGroup.memberCount} / ${selectedGroup.maxPlayers}`],
                                ['Survivors',    String(selectedGroup.survivorCount)],
                            ].map(([k, v]) => (
                                <><span style={{ color: 'var(--text-muted)' }}>{k}</span><span style={{ textAlign: 'right', fontWeight: 600 }}>{v}</span></>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {selectedGroup.status === GROUP_OPEN && (
                                <button className="btn btn-primary" onClick={() => handleJoin(selectedGroup)}>
                                    Join ({formatPill(selectedGroup.minStake)})
                                </button>
                            )}
                            {selectedGroup.status === GROUP_OPEN && selectedGroup.memberCount >= 2 && (
                                <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#000', fontWeight: 700 }} onClick={() => handleStart(selectedGroup)}>
                                    Start Game
                                </button>
                            )}
                            {selectedGroup.status === GROUP_OPEN && (
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleCancel(selectedGroup)}>
                                    Cancel Group
                                </button>
                            )}
                            {selectedGroup.status === GROUP_ACTIVE && (
                                <button className="btn btn-primary" onClick={() => handleCheckIn(selectedGroup)}>
                                    Check In
                                </button>
                            )}
                            {(selectedGroup.status === GROUP_ACTIVE || selectedGroup.status === GROUP_FINISHED) && (
                                <button className="btn btn-sm" style={{ background: 'var(--orange)', color: '#000', fontWeight: 700 }} onClick={() => handleClaim(selectedGroup)}>
                                    Claim Winnings
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Members list */}
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>
                            Members ({selectedGroup.memberCount})
                        </div>
                        {loadingDetail ? (
                            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)' }}>
                                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                                Loading members…
                            </div>
                        ) : members.length === 0 ? (
                            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No members loaded.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {members.map((m, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px',
                                        opacity: m.isActive ? 1 : 0.4,
                                    }}>
                                        <div>
                                            <span className="mono" style={{ fontSize: 13 }}>{formatAddress(m.address)}</span>
                                            {!m.isActive && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>ELIMINATED</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>{formatPill(m.stake)}</span>
                                            {m.isActive && selectedGroup.status === GROUP_ACTIVE && (
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: 'var(--red)', fontSize: 11, padding: '2px 8px' }}
                                                    onClick={() => handleEliminate(selectedGroup, m.address)}
                                                >
                                                    Eliminate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Create tab ──────────────────────────────────────────────────── */}
            {tab === 'create' && (
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div className="card">
                        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Create a Group Habit</h2>

                        <div className="info-box" style={{ marginBottom: 20, fontSize: 13 }}>
                            You stake the min amount when creating. Others join by matching it.
                            Last ones standing after the duration split the entire pool.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Name */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Group Name
                                </label>
                                <input
                                    className="input"
                                    placeholder="e.g. Morning Runners"
                                    value={cName}
                                    onChange={e => setCName(e.target.value)}
                                    maxLength={32}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Frequency */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Check-in Frequency
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {(['daily', 'weekly'] as const).map(f => (
                                        <button
                                            key={f}
                                            className="btn btn-sm"
                                            onClick={() => setCFreq(f)}
                                            style={{
                                                flex: 1,
                                                background: cFreq === f ? 'var(--primary)' : 'var(--bg3)',
                                                color:      cFreq === f ? '#fff' : 'var(--text-muted)',
                                                border:     '1px solid ' + (cFreq === f ? 'var(--primary)' : 'var(--border2)'),
                                                fontWeight: cFreq === f ? 700 : 500,
                                            }}
                                        >
                                            {FREQ_LABEL[f]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Duration (days · 7–90)
                                </label>
                                <input
                                    className="input"
                                    type="number"
                                    min="7"
                                    max="90"
                                    value={cDuration}
                                    onChange={e => setCDuration(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Min stake */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Min Stake per Player (PILL · min 500)
                                </label>
                                <input
                                    className="input"
                                    type="number"
                                    min="500"
                                    value={cMinStake}
                                    onChange={e => setCMinStake(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Max players */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Max Players (2–10)
                                </label>
                                <input
                                    className="input"
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={cMaxPlay}
                                    onChange={e => setCMaxPlay(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Summary */}
                            <div className="info-box" style={{ fontSize: 13 }}>
                                <strong>Your upfront cost:</strong> {cMinStake || 0} PILL<br />
                                <strong>Max prize pool:</strong> ~{(parseFloat(cMinStake || '0') * parseInt(cMaxPlay || '1', 10)).toFixed(0)} PILL (if full)
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleCreate}
                                style={{ width: '100%', fontWeight: 700 }}
                            >
                                {connected ? 'Create Group' : 'Connect Wallet to Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
