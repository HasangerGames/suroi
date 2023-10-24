import { type ObjectCategory } from "../../../common/src/constants";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type ObjectDefinition } from "../../../common/src/utils/objectDefinitions";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";

export abstract class GameObject {
    damageable = false;

    id: number;
    abstract readonly type: ObjectCategory;

    abstract objectType: ObjectType<typeof this["type"], ObjectDefinition>;

    game: Game;

    _position: Vector;
    get position(): Vector { return this._position; }
    set position(position: Vector) { this._position = position; }

    _rotation = 0;
    get rotation(): number { return this._rotation; }
    set rotation(rotation: number) { this._rotation = rotation; }

    scale = 1;
    dead = false;
    hitbox?: Hitbox;

    protected constructor(game: Game, position: Vector) {
        this.id = game.nextObjectID;
        this.game = game;
        this._position = position;
        game.updateObjects = true;
    }

    abstract damage(amount: number, source?: GameObject): void;

    abstract serializePartial(stream: SuroiBitStream): void;
    abstract serializeFull(stream: SuroiBitStream): void;
}
