interface TxLinksProps {
    txId: string | null;
    style?: React.CSSProperties;
}

/**
 * Side-by-side explorer links — OPNet + Mempool.space (same pattern as MotoSwap).
 * Both point to the testnet4 network.
 */
export function TxLinks({ txId, style }: TxLinksProps) {
    if (!txId || txId === 'pending') return null;
    return (
        <div style={{ display: 'flex', gap: 8, ...style }}>
            <a
                href={`https://mempool.opnet.org/testnet4/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: 13, justifyContent: 'center' }}
            >
                OPNet Explorer ↗
            </a>
            <a
                href={`https://mempool.space/testnet4/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: 13, justifyContent: 'center' }}
            >
                Mempool.space ↗
            </a>
        </div>
    );
}
