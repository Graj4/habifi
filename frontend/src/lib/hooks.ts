import { useCallback, useEffect, useState } from 'react';
import { JSONRpcProvider, getContract } from 'opnet';
import { useWalletConnect } from '@btc-vision/walletconnect';
import {
    NETWORK, RPC_URL, STREAK_SATS_ADDRESS,
    formatAddress,
} from './config';
import { STREAK_SATS_ABI } from './abi';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HabitInfo {
    id:          bigint;
    name:        string;
    streak:      number;
    lastCheckIn: number;   // block number
    stakeAmount: bigint;
    frequency:   number;   // blocks
    isActive:    boolean;
}

export interface LeaderboardEntry {
    address: string;
    streak:  number;
    rank:    number;
}

export interface Stats {
    totalStaked:     bigint;
    totalStreakDays: number;
    totalHabits:     number;
}

// ─── Wallet hook ──────────────────────────────────────────────────────────────
export function useWallet() {
    const { walletAddress, openConnectModal, connectToWallet, disconnect, connecting } = useWalletConnect();
    const address = walletAddress ?? null;

    // Try connecting OP_WALLET directly (bypasses the modal's isInstalled() timing
    // issue where window.opnet may not yet be injected during the initial memo run).
    // Falls back to the wallet picker modal if window.opnet is absent.
    const connect = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== 'undefined' && (window as any).opnet) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            void (connectToWallet as any)('OP_WALLET');
        } else {
            openConnectModal();
        }
    }, [connectToWallet, openConnectModal]);

    return {
        address,
        connected: !!address,
        loading: connecting,
        connect,
        disconnect,
    };
}

// ─── Provider (read-only) ─────────────────────────────────────────────────────
let _provider: JSONRpcProvider | null = null;
function getProvider(): JSONRpcProvider {
    if (!_provider) {
        _provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
    }
    return _provider;
}

// ─── Stats hook ───────────────────────────────────────────────────────────────
export function useStats() {
    const [stats,   setStats]   = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!STREAK_SATS_ADDRESS) return;
        try {
            const provider  = getProvider();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract  = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK) as any;
            const result    = await contract.getStats();
            if (!result || typeof result !== 'object') return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (result as any).properties;
            if (!data) return;
            setStats({
                totalStaked:     BigInt(String(data.totalStaked     ?? 0)),
                totalStreakDays: Number(data.totalStreakDays ?? 0),
                totalHabits:     Number(data.totalHabits    ?? 0),
            });
        } catch (err) {
            console.error('getStats error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return { stats, loading, refresh };
}

// ─── Leaderboard hook ─────────────────────────────────────────────────────────
export function useLeaderboard() {
    const [entries,  setEntries]  = useState<LeaderboardEntry[]>([]);
    const [loading,  setLoading]  = useState(true);

    const refresh = useCallback(async () => {
        if (!STREAK_SATS_ADDRESS) {
            // Demo data when contract not deployed
            setEntries([
                { rank: 1, address: 'bc1q...a4k2', streak: 87 },
                { rank: 2, address: 'bc1q...9xm1', streak: 64 },
                { rank: 3, address: 'bc1q...7pl9', streak: 51 },
                { rank: 4, address: 'bc1q...3mn0', streak: 38 },
                { rank: 5, address: 'bc1q...5qrt', streak: 22 },
            ]);
            setLoading(false);
            return;
        }
        try {
            const provider = getProvider();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK) as any;
            const result   = await contract.getLeaderboard();
            if (!result || typeof result !== 'object') return;

            // The contract writes 10 × (addr u256, streak u256) = 640 bytes interleaved.
            // ABI outputs=[] so the BinaryReader is fully unread — parse all 10 pairs directly.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reader = (result as any).result;
            if (!reader || typeof reader.bytesLeft !== 'function') return;

            const entries: LeaderboardEntry[] = [];
            for (let i = 0; i < 10; i++) {
                if (reader.bytesLeft() < 64) break;
                // addr is stored as u256 (32 bytes, big-endian)
                const addrBytes: Uint8Array = reader.readBytes(32);
                const streak:    bigint      = reader.readU256();
                if (streak > 0n) {
                    const addrHex = Array.from(addrBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                    entries.push({
                        rank:    i + 1,
                        address: formatAddress('0x' + addrHex),
                        streak:  Number(streak),
                    });
                }
            }
            setEntries(entries.sort((a, b) => b.streak - a.streak).map((e, i) => ({ ...e, rank: i + 1 })));
        } catch (err) {
            console.error('getLeaderboard error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return { entries, loading, refresh };
}

// ─── User habits hook ─────────────────────────────────────────────────────────
export function useUserHabits(address: string | null) {
    const [habits,  setHabits]  = useState<HabitInfo[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!address || !STREAK_SATS_ADDRESS) return;
        setLoading(true);
        try {
            const provider = getProvider();
            const senderAddr = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;

            // Get habit IDs for user
            const idsResult = await contract.getUserHabits(senderAddr);
            if (!idsResult || typeof idsResult !== 'object') return;

            const habitIds: bigint[] = [];

            // The ABI declares BYTES32 (reads first 32 bytes = 1 habit ID).
            // Collect that first ID from decoded properties.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const firstIdBytes: Uint8Array | undefined = (idsResult as any).properties?.habitIds;
            if (firstIdBytes instanceof Uint8Array && firstIdBytes.length === 32) {
                const id = BigInt('0x' + Array.from(firstIdBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
                if (id > 0n) habitIds.push(id);
            }

            // Read any additional habit IDs (for users with 2+ habits) from the
            // remaining bytes still in the BinaryReader.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reader = (idsResult as any).result;
            if (reader && typeof reader.bytesLeft === 'function') {
                while (reader.bytesLeft() >= 32) {
                    const id: bigint = reader.readU256();
                    if (id > 0n) habitIds.push(id);
                }
            }

            // Fetch info for each habit
            const habitInfos: HabitInfo[] = [];
            for (const id of habitIds) {
                const infoResult = await contract.getHabitInfo(id);
                if (!infoResult || typeof infoResult !== 'object') continue;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const info = (infoResult as any).properties as {
                    streak: bigint; lastCheckIn: bigint;
                    stakeAmount: bigint; frequency: bigint; isActive: bigint;
                } | undefined;
                if (!info) continue;

                // Fetch habit name from getHabitName
                let habitName = '';
                try {
                    const nameResult = await contract.getHabitName(id);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const nameProp = (nameResult as any)?.properties?.name;
                    if (typeof nameProp === 'string') habitName = nameProp;
                } catch { /* name unavailable */ }

                habitInfos.push({
                    id,
                    name:        habitName,
                    streak:      Number(info.streak      ?? 0),
                    lastCheckIn: Number(info.lastCheckIn ?? 0),
                    stakeAmount: BigInt(String(info.stakeAmount ?? 0)),
                    frequency:   Number(info.frequency   ?? 0),
                    isActive:    Number(info.isActive    ?? 0) !== 0,
                });
            }
            setHabits(habitInfos.filter(h => h.isActive));
        } catch (err) {
            console.error('getUserHabits error:', err);
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => { refresh(); }, [refresh]);

    // Auto-poll every 20 s so UI updates when the Bitcoin tx confirms
    useEffect(() => {
        if (!address || !STREAK_SATS_ADDRESS) return;
        const id = setInterval(refresh, 20_000);
        return () => clearInterval(id);
    }, [address, refresh]);

    return { habits, loading, refresh };
}

// ─── Moto Miles hook ──────────────────────────────────────────────────────────
export function useMotoMiles(address: string | null) {
    const [miles,   setMiles]   = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address || !STREAK_SATS_ADDRESS) return;
        setLoading(true);
        const provider = getProvider();
        provider.getPublicKeyInfo(address, false)
            .then(senderAddr => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const contract = getContract(STREAK_SATS_ADDRESS!, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
                return contract.getMotoMiles(senderAddr);
            })
            .then((result: unknown) => {
                if (typeof result !== 'object' || result === null) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = (result as any).properties as { miles: bigint } | undefined;
                if (!data) return;
                setMiles(Number(data.miles));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [address]);

    return { miles, loading };
}

// ─── Pending yield hook ───────────────────────────────────────────────────────
export function usePendingYield(address: string | null) {
    const [pending,  setPending]  = useState<bigint>(0n);
    const [loading,  setLoading]  = useState(false);

    const refresh = useCallback(async () => {
        if (!address || !STREAK_SATS_ADDRESS) return;
        setLoading(true);
        try {
            const provider   = getProvider();
            const senderAddr = await provider.getPublicKeyInfo(address, false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contract = getContract(STREAK_SATS_ADDRESS, STREAK_SATS_ABI, provider, NETWORK, senderAddr) as any;
            const result   = await contract.getPendingYield(senderAddr);
            if (!result || typeof result !== 'object') return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (result as any).properties as { pending: bigint } | undefined;
            if (!data) return;
            setPending(data.pending);
        } catch (err) {
            console.error('getPendingYield error:', err);
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => { refresh(); }, [refresh]);

    return { pending, loading, refresh };
}

// ─── Current block hook ───────────────────────────────────────────────────────
export function useCurrentBlock(): number {
    const [block, setBlock] = useState(0);
    useEffect(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (getProvider() as any).getBlockNumber?.();
            if (result && typeof result.then === 'function') {
                result.then((b: number) => setBlock(b)).catch(() => {});
            }
        } catch { /* provider doesn't support getBlockNumber */ }
    }, []);
    return block;
}

// ─── Transaction helper ───────────────────────────────────────────────────────
export async function sendTx(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    simulation: { sendTransaction: (opts: Record<string, any>) => Promise<unknown> },
    refundTo: string,
): Promise<string | undefined> {
    const receipt = await simulation.sendTransaction({
        signer:                    null,
        mldsaSigner:               null,
        refundTo,
        network:                   NETWORK,
        maximumAllowedSatToSpend:  0n,
    }) as Record<string, unknown> | null | undefined;
    console.log('[sendTx] receipt:', receipt);
    // Try common field names in case the wallet returns a different shape
    const txId = (
        receipt?.transactionId ??
        receipt?.txId ??
        receipt?.txid ??
        receipt?.hash
    ) as string | undefined;
    return txId;
}
