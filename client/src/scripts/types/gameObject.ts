import { type Game } from "../game";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector } from "../../../../common/src/utils/vector";
import { type ObjectCategory } from "../../../../common/src/constants";
import { type ObjectDefinition } from "../../../../common/src/utils/objectDefinitions";
import { Container } from "pixi.js";
import { localStorageInstance } from "../utils/localStorageHandler";
import { gsap } from "gsap";

/*
    Since this class seems to only ever be instantiated
    when some sort of stream is involved, it could be worth
    to refactor this constructor to take a stream object so
    that it can manage its own deserialization, allowing us
    to remove all these definite assignment assertions
*/
export abstract class GameObject<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition> {
    id: number;
    type: ObjectType<T, U>;

    readonly game: Game;

    private moveAnim?: gsap.core.Tween;

    _position!: Vector;
    get position(): Vector { return this._position; }
    set position(pos: Vector) {
        // Animate the position
        if (this.position === undefined || ("isNew" in this && this.isNew) || !localStorageInstance.config.movementSmoothing) {
            this.container.x = pos.x * 20;
            this.container.y = pos.y * 20;
        } else {
            this.moveAnim = gsap.to(this.container, {
                x: pos.x * 20,
                y: pos.y * 20,
                duration: 0.03
            });
        }
        this._position = pos;
    }

    rotation!: number;

    dead = false;

    readonly container: Container;

    protected constructor(game: Game, type: ObjectType<T, U>, id: number) {
        this.game = game;
        this.type = type;
        this.id = id;

        this.container = new Container();

        this.game.camera.container.addChild(this.container);
    }

    destroy(): void {
        this.moveAnim?.kill();
        this.container.destroy();
    }

    playSound(key: string, fallOff: number): number {
        return this.game.soundManager.get(key).pos(this.position.x, this.position.y).pannerAttr({
            coneInnerAngle: 360,
            coneOuterAngle: 360,
            coneOuterGain: 0,
            distanceModel: "inverse",
            maxDistance: 1000,
            refDistance: 5,
            rolloffFactor: 1,
            panningModel: "HRTF"
        }).play();
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;
}
