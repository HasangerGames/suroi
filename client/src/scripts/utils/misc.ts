import { type Vector } from "../../../../common/src/utils/vector";
import Vector2 = Phaser.Math.Vector2;
import { random } from "../../../../common/src/utils/random";

export function v2v(v: Vector): Vector2 {
    return new Vector2(v.x, v.y);
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
