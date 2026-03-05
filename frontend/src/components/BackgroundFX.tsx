export default function BackgroundFX() {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
        }}>
            {/* Orb 1 — indigo, top-left */}
            <div className="bg-orb bg-orb-1" />
            {/* Orb 2 — teal, bottom-right */}
            <div className="bg-orb bg-orb-2" />
            {/* Orb 3 — amber, center-right */}
            <div className="bg-orb bg-orb-3" />
            {/* Dot grid */}
            <div className="bg-grid" />
        </div>
    );
}
