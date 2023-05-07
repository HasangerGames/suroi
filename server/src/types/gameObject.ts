import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Vector } from "../../../common/src/utils/vector";

export abstract class GameObject {
    id: number;
    type: ObjectType;

    game: Game;

    _position: Vector;
    _rotation: Vector;

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

    get rotation(): Vector {
        return this._rotation;
    }

    set rotation(rotation: Vector) {
        this._rotation = rotation;
    }

    abstract serializePartial(stream: SuroiBitStream): void;
    abstract serializeFull(stream: SuroiBitStream): void;
}
