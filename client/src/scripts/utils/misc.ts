import { normalizeAngle } from "../../../../common/src/utils/math";
import { random } from "../../../../common/src/utils/random";

export function orientationToRotation(orientation: number): number {
    return -normalizeAngle(orientation * (Math.PI / 2));
}

const killWords = ["killed", "destroyed", "ended", "murdered", "wiped out", "annihilated", "slaughtered", "obliterated"];

export function randomKillWord(): string {
    return killWords[random(0, killWords.length - 1)];
}

declare global {
    interface Element {
        requestFullscreen: (options?: FullscreenOptions) => Promise<void>
        webkitRequestFullScreen?: (options?: FullscreenOptions) => Promise<void>
    }
}

export function requestFullscreen(): void {
    const elem = document.documentElement;

    if (typeof elem.requestFullscreen === "function") {
        void elem.requestFullscreen().catch();
    } else if (typeof elem.webkitRequestFullScreen === "function") {
        void elem.webkitRequestFullScreen().catch();
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
