import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Vector } from "../../../common/src/utils/vector";
import { type Hitbox } from "../../../common/src/utils/hitbox";

export abstract class GameObject {
    id: number;
    type: ObjectType;

    game: Game;

    _position: Vector;
    _rotation: number;
    scale = 1;
    hitbox?: Hitbox;
    spawnHitbox: Hitbox;

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

    serializePartial(stream: SuroiBitStream): void {
        stream.writeObjectType(this.type);
        stream.writeUint16(this.id);
    }

    abstract serializeFull(stream: SuroiBitStream): void;
}
