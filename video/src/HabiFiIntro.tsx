import {
    AbsoluteFill,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
    Sequence,
    Audio,
    staticFile,
} from 'remotion';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = '#060D1F';
const BG2     = '#0C1628';
const PRIMARY = '#5B7FFF';
const GREEN   = '#10D9A8';
const ORANGE  = '#F97316';
const TEXT    = '#E8EDF8';
const MUTED   = '#8B97B4';

// ── Spring helper ──────────────────────────────────────────────────────────────
function useEntrance(delay = 0) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 80 } });
    const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const translateY = interpolate(s, [0, 1], [30, 0]);
    const scale = interpolate(s, [0, 1], [0.9, 1]);
    return { opacity, translateY, scale };
}

// ── Background ─────────────────────────────────────────────────────────────────
function Background() {
    return (
        <AbsoluteFill style={{
            background: `
                radial-gradient(ellipse 80% 60% at 15% 20%, rgba(91,127,255,0.18) 0%, transparent 60%),
                radial-gradient(ellipse 60% 50% at 85% 80%, rgba(16,217,168,0.12) 0%, transparent 55%),
                ${BG}
            `,
        }} />
    );
}

// ── Grid lines ─────────────────────────────────────────────────────────────────
function GridLines() {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 30], [0, 0.06], { extrapolateRight: 'clamp' });
    return (
        <AbsoluteFill style={{ opacity }}>
            <svg width="1920" height="1080">
                {Array.from({ length: 20 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={1080} stroke={PRIMARY} strokeWidth={0.5} />
                ))}
                {Array.from({ length: 11 }).map((_, i) => (
                    <line key={`h${i}`} x1={0} y1={i * 100} x2={1920} y2={i * 100} stroke={PRIMARY} strokeWidth={0.5} />
                ))}
            </svg>
        </AbsoluteFill>
    );
}

// ── Scene 1: Logo ──────────────────────────────────────────────────────────────
function SceneLogo() {
    const logo    = useEntrance(0);
    const tagline = useEntrance(18);
    const pill    = useEntrance(32);

    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
            <div style={{ opacity: logo.opacity, transform: `scale(${logo.scale})`, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{
                    width: 80, height: 80, borderRadius: 20,
                    background: `linear-gradient(135deg, ${PRIMARY}, ${GREEN})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40, boxShadow: `0 0 60px rgba(91,127,255,0.5)`,
                }}>
                    ₿
                </div>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 72, fontWeight: 900, color: TEXT, letterSpacing: -2 }}>
                    Habi<span style={{ color: PRIMARY }}>Fi</span>
                </span>
            </div>

            <div style={{ opacity: tagline.opacity, transform: `translateY(${tagline.translateY}px)`, fontFamily: 'Poppins, sans-serif', fontSize: 26, color: MUTED, fontWeight: 400, letterSpacing: 1 }}>
                Habit Tracking on Bitcoin L1
            </div>

            <div style={{
                opacity: pill.opacity, transform: `translateY(${pill.translateY}px)`,
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(91,127,255,0.12)', border: `1px solid rgba(91,127,255,0.3)`,
                borderRadius: 100, padding: '8px 20px',
                fontFamily: 'Poppins, sans-serif', fontSize: 14, color: PRIMARY, fontWeight: 600, letterSpacing: '0.06em',
            }}>
                ⚡ Powered by OP_NET · Bitcoin L1 Smart Contracts
            </div>
        </AbsoluteFill>
    );
}

// ── Scene 2: How It Works — each card is its own component ────────────────────
function StepCard({ icon, title, desc, color, delay }: {
    icon: string; title: string; desc: string; color: string; delay: number;
}) {
    const e = useEntrance(delay);
    return (
        <div style={{
            opacity: e.opacity,
            transform: `translateY(${e.translateY}px) scale(${e.scale})`,
            background: BG2, border: `1px solid rgba(255,255,255,0.07)`,
            borderRadius: 20, padding: '36px 40px', width: 280,
            textAlign: 'center', boxShadow: `0 0 40px ${color}22`,
        }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800, color, marginBottom: 10 }}>{title}</div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 15, color: MUTED, lineHeight: 1.5 }}>{desc}</div>
        </div>
    );
}

function SceneHowItWorks() {
    const label = useEntrance(0);
    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 48 }}>
            <div style={{
                opacity: label.opacity, transform: `translateY(${label.translateY}px)`,
                fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 700,
                color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>
                How It Works
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
                <StepCard icon="🔒" title="Stake PILL"      desc="Lock tokens as skin in the game" color={PRIMARY} delay={10} />
                <StepCard icon="✅" title="Check In Daily"  desc="Prove your habit on Bitcoin L1"  color={GREEN}   delay={22} />
                <StepCard icon="💰" title="Earn Yield"      desc="Breakers fund the winners"        color={ORANGE}  delay={34} />
            </div>
        </AbsoluteFill>
    );
}

// ── Scene 3: Stats — each number is its own component ─────────────────────────
function StatItem({ value, label, color, delay }: {
    value: string; label: string; color: string; delay: number;
}) {
    const e = useEntrance(delay);
    return (
        <div style={{ opacity: e.opacity, transform: `scale(${e.scale})`, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 64, fontWeight: 900, color, lineHeight: 1, letterSpacing: -2 }}>
                {value}
            </div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 14, color: MUTED, marginTop: 8, fontWeight: 500 }}>
                {label}
            </div>
        </div>
    );
}

function SceneStats() {
    const headline = useEntrance(0);
    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 52 }}>
            <div style={{
                opacity: headline.opacity, transform: `translateY(${headline.translateY}px)`,
                fontFamily: 'Poppins, sans-serif', fontSize: 38, fontWeight: 900, color: TEXT, textAlign: 'center',
            }}>
                Miss a day. <span style={{ color: '#F43F5E' }}>Lose stake.</span>
                <br />
                Keep going. <span style={{ color: GREEN }}>Earn yield.</span>
            </div>
            <div style={{ display: 'flex', gap: 48 }}>
                <StatItem value="10%"  label="Penalty on break" color="#F43F5E" delay={18} />
                <StatItem value="144"  label="Blocks per day"   color={ORANGE}  delay={28} />
                <StatItem value="∞"    label="Streak potential" color={GREEN}   delay={38} />
            </div>
        </AbsoluteFill>
    );
}

// ── Scene 4: CTA ───────────────────────────────────────────────────────────────
function SceneCTA() {
    const frame    = useCurrentFrame();
    const headline = useEntrance(0);
    const sub      = useEntrance(18);
    const btn      = useEntrance(30);
    const fadeOut  = interpolate(frame, [60, 70], [1, 0], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28, opacity: fadeOut }}>
            <div style={{
                opacity: headline.opacity, transform: `scale(${headline.scale})`,
                fontFamily: 'Poppins, sans-serif', fontSize: 58, fontWeight: 900, color: TEXT,
                textAlign: 'center', lineHeight: 1.1,
            }}>
                Commit a Habit.<br />
                <span style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${GREEN})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Earn on Bitcoin L1.
                </span>
            </div>

            <div style={{
                opacity: sub.opacity, transform: `translateY(${sub.translateY}px)`,
                fontFamily: 'Poppins, sans-serif', fontSize: 18, color: MUTED, textAlign: 'center', maxWidth: 600, lineHeight: 1.6,
            }}>
                Built on OP_NET · Confirmed on Bitcoin · Competing in MotoCat Week 2
            </div>

            <div style={{
                opacity: btn.opacity, transform: `translateY(${btn.translateY}px)`,
                marginTop: 12, background: `linear-gradient(135deg, ${PRIMARY}, #8B5CF6)`,
                borderRadius: 100, padding: '18px 52px',
                fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff',
                boxShadow: `0 0 60px rgba(91,127,255,0.5)`, letterSpacing: 0.5,
            }}>
                HabiFi on Bitcoin L1
            </div>
        </AbsoluteFill>
    );
}

// ── Fade wrapper ───────────────────────────────────────────────────────────────
function FadeWrapper({ children, fadeDuration = 10 }: { children: React.ReactNode; fadeDuration?: number }) {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const opacity = interpolate(
        frame,
        [0, fadeDuration, durationInFrames - fadeDuration, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

// ── Main composition ───────────────────────────────────────────────────────────
export const HabiFiIntro = () => (
    <AbsoluteFill style={{ fontFamily: 'Poppins, sans-serif', background: BG }}>
        <Audio src={staticFile('MP3.mp3')} />
        <Background />
        <GridLines />

        <Sequence from={0} durationInFrames={110}>
            <SceneLogo />
        </Sequence>

        <Sequence from={100} durationInFrames={130}>
            <FadeWrapper>
                <SceneHowItWorks />
            </FadeWrapper>
        </Sequence>

        <Sequence from={220} durationInFrames={110}>
            <FadeWrapper>
                <SceneStats />
            </FadeWrapper>
        </Sequence>

        <Sequence from={320} durationInFrames={70}>
            <FadeWrapper>
                <SceneCTA />
            </FadeWrapper>
        </Sequence>
    </AbsoluteFill>
);
