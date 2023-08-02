import { random } from "../../../../common/src/utils/random";
import { normalizeAngle } from "../../../../common/src/utils/math";

export function orientationToRotation(orientation: number): number {
    return -normalizeAngle(orientation * (Math.PI / 2));
}

const killWords = ["killed", "destroyed", "ended", "murdered", "wiped out", "annihilated", "slaughtered", "obliterated"];

export function randomKillWord(): string {
    return killWords[random(0, killWords.length - 1)];
}

export function requestFullscreen(): void {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        void elem.requestFullscreen().catch();
    } else { // @ts-expect-error shut up eslint
        if (elem.webkitRequestFullScreen) { // @ts-expect-error shut up eslint
            void elem.webkitRequestFullScreen().catch();
        }
    }
}
