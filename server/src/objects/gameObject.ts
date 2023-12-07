import { type ObjectCategory } from "../../../common/src/constants";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";

export abstract class GameObject<Cat extends ObjectCategory = ObjectCategory> {
    abstract readonly type: Cat;
    readonly id: number;
    readonly game: Game;

    _position: Vector;
    get position(): Vector { return this._position; }
    set position(position: Vector) { this._position = position; }

    _rotation = 0;
    get rotation(): number { return this._rotation; }
    set rotation(rotation: number) { this._rotation = rotation; }

    damageable = false;
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

    abstract get data(): Required<ObjectsNetData[Cat]>;
}
