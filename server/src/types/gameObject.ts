import { type Game } from "../game";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Vector } from "../../../common/src/utils/vector";
import { type Hitbox } from "../../../common/src/utils/hitbox";

export abstract class GameObject {
    abstract isPlayer: boolean;
    abstract isObstacle: boolean;
    abstract collidesWith: { player: boolean, obstacle: boolean };

    id: number;
    type: ObjectType;

    game: Game;

    _position: Vector;
    _rotation = 0;
    scale = 1;
    dead = false;
    hitbox?: Hitbox;

    protected constructor(game: Game, type: ObjectType, position: Vector) {
        this.id = game.nextObjectId;
        this.game = game;
        this.type = type;
        this._position = position;
    }

    get position(): Vector {
        return this._position;
    }

    set position(position: Vector) {
        this._position = position;
    }

    get rotation(): number {
        return this._rotation;
    }

    set rotation(rotation: number) {
        this._rotation = rotation;
    }

    abstract damage(amount: number, source?: GameObject): void;

    abstract serializePartial(stream: SuroiBitStream): void;
    abstract serializeFull(stream: SuroiBitStream): void;
}
