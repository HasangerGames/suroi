import { type Vector } from "../../../common/src/utils/vector";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type Game } from "../game";

export class Body {
    game: Game;

    _position: Vector;
    oldPosition: Vector;

    initialHitbox: Hitbox;
    hitbox: Hitbox;

    constructor(game: Game, position: Vector, hitbox: Hitbox) {
        this.game = game;
        this.oldPosition = this.position = this._position = position;
        this.hitbox = this.initialHitbox = hitbox;
    }

    set position(position: Vector) {
        this._position = position;
        if (this.initialHitbox !== undefined) this.hitbox = this.initialHitbox.transform(position);
    }

    get position(): Vector {
        return this._position;
    }
}
