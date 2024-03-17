import { type ObjectCategory } from "../../../common/src/constants";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { ObjectSerializations, type FullData } from "../../../common/src/utils/objectsSerializations";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { type Building } from "./building";
import { type DeathMarker } from "./deathMarker";
import { type Decal } from "./decal";
import { type Loot } from "./loot";
import { type Obstacle } from "./obstacle";
import { type Parachute } from "./parachute";
import { type Player } from "./player";
import { type SyncedParticle } from "./syncedParticle";
import { type ThrowableProjectile } from "./throwableProj";

export interface ObjectMapping {
    [ObjectCategory.Player]: Player
    [ObjectCategory.Obstacle]: Obstacle
    [ObjectCategory.DeathMarker]: DeathMarker
    [ObjectCategory.Loot]: Loot
    [ObjectCategory.Building]: Building
    [ObjectCategory.Decal]: Decal
    [ObjectCategory.Parachute]: Parachute
    [ObjectCategory.ThrowableProjectile]: ThrowableProjectile
    [ObjectCategory.SyncedParticle]: SyncedParticle
}

export type GameObject = ObjectMapping[ObjectCategory];

export abstract class BaseGameObject<Cat extends ObjectCategory = ObjectCategory> {
    abstract readonly type: Cat;
    abstract allocBytes: number;
    readonly id: number;
    readonly game: Game;

    _position: Vector;
    get position(): Vector { return this._position; }
    set position(position: Vector) { this._position = position; }

    _rotation = 0;
    get rotation(): number { return this._rotation; }
    set rotation(rotation: number) { this._rotation = rotation; }

    damageable = false;
    dead = false;
    hitbox?: Hitbox;

    stream!: SuroiBitStream;
    partialLength = 0;

    protected constructor(game: Game, position: Vector) {
        this.id = game.nextObjectID;
        this.game = game;
        this._position = position;
        this.setDirty();
    }

    serialize(): void {
        if (this.stream === undefined) {
            this.stream = SuroiBitStream.alloc(this.allocBytes * 8);
        }

        this.stream.index = 0;

        this.stream.writeObjectID(this.id);
        this.stream.writeObjectType(this.type);

        ObjectSerializations[this.type].serializePartial(this.stream, this.data);
        this.stream.writeAlignToNextByte();
        this.partialLength = this.stream.byteIndex;

        ObjectSerializations[this.type].serializeFull(this.stream, this.data);
        this.stream.writeAlignToNextByte();
    }

    /**
     * Sets this object as fully dirty
     * This means all the serialization data will be sent to clients
     */
    setDirty(): void {
        this.game.fullDirtyObjects.add(this);
    }

    /**
     * Sets this object as partially dirty
     * This means the partial data will be sent to clients
     */
    setPartialDirty(): void {
        this.game.partialDirtyObjects.add(this);
    }

    abstract damage(amount: number, source?: GameObject): void;

    abstract get data(): FullData<Cat>;
}
