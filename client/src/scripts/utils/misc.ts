import { InputActions } from "../../../../common/src/constants";
import type { AmmoDefinition } from "../../../../common/src/definitions/ammos";
import type { ArmorDefinition } from "../../../../common/src/definitions/armors";
import type { BackpackDefinition } from "../../../../common/src/definitions/backpacks";
import type { HealingItemDefinition } from "../../../../common/src/definitions/healingItems";
import type { ScopeDefinition } from "../../../../common/src/definitions/scopes";
import type { ThrowableDefinition } from "../../../../common/src/definitions/throwables";
import type { Game } from "../game";

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

export function stringIsPositiveNumber(str: string): boolean {
    const matches = str.match(/\d+/);
    return matches !== null && matches[0].length === str.length;
}

export function dropItemListener(game: Game, container: any, item: HealingItemDefinition | ScopeDefinition | ThrowableDefinition | ArmorDefinition | BackpackDefinition | AmmoDefinition): void {
    container[0].addEventListener(
        "pointerdown",
        (e: PointerEvent): void => {
            e.stopImmediatePropagation();
            if (e.button === 2) {
                game.inputManager.addAction({
                    type: InputActions.DropItem,
                    item
                });
            }
        }
    );
}
