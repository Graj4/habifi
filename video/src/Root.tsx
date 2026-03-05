import { Composition } from 'remotion';
import { HabiFiIntro } from './HabiFiIntro';

export const Root = () => (
    <Composition
        id="HabiFiIntro"
        component={HabiFiIntro}
        durationInFrames={390}  // 13 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
    />
);
