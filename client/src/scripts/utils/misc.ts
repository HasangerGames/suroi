import { normalizeAngle } from "../../../../common/src/utils/math";
import { random } from "../../../../common/src/utils/random";

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

export function formatDate(seconds: number): string {
    const date = new Date(seconds * 1000);
    let timeString = "";
    const minutes = date.getMinutes();
    if (minutes > 0) timeString += `${minutes}m`;
    timeString += `${date.getSeconds()}s`;

    return timeString;
}
