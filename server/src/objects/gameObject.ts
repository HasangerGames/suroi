import { KillfeedEventType, type ObjectCategory } from "../../../common/src/constants";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { ObjectSerializations, type FullData } from "../../../common/src/utils/objectsSerializations";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GunItem } from "../inventory/gunItem";
import { MeleeItem } from "../inventory/meleeItem";
import { ThrowableItem } from "../inventory/throwableItem";
import { type Building } from "./building";
import { type DeathMarker } from "./deathMarker";
import { type Decal } from "./decal";
import { Explosion } from "./explosion";
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

export interface DamageParams {
    readonly amount: number
    readonly source?: GameObject | KillfeedEventType.Gas | KillfeedEventType.Airdrop | KillfeedEventType.BleedOut | KillfeedEventType.FinallyKilled
    readonly weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
}

export type CollidableGameObject<
    Cat extends ObjectCategory = ObjectCategory,
    HitboxType extends Hitbox = Hitbox
> = BaseGameObject<Cat> & { readonly hitbox: HitboxType };

export abstract class BaseGameObject<Cat extends ObjectCategory = ObjectCategory> {
    abstract readonly type: Cat;
    readonly abstract fullAllocBytes: number;
    readonly abstract partialAllocBytes: number;

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

    private _fullStream?: SuroiBitStream | undefined;
    get fullStream(): SuroiBitStream { return this._fullStream ??= SuroiBitStream.alloc(this.fullAllocBytes * 8); }

    private _partialStream?: SuroiBitStream | undefined;
    get partialStream(): SuroiBitStream { return this._partialStream ??= SuroiBitStream.alloc(this.partialAllocBytes * 8); }

    protected constructor(game: Game, position: Vector) {
        this.id = game.nextObjectID;
        this.game = game;
        this._position = position;
        this.setDirty();
    }

    serializeFull(): void {
        this.serializePartial();
        const stream = this.fullStream;
        stream.index = 0;
        ObjectSerializations[this.type].serializeFull(stream, this.data);
        stream.writeAlignToNextByte();
    }

    serializePartial(): void {
        const stream = this.partialStream;
        stream.index = 0;

        stream.writeObjectID(this.id);
        stream.writeObjectType(this.type);

        ObjectSerializations[this.type].serializePartial(stream, this.data);
        stream.writeAlignToNextByte();
    }

    /**
     * Sets this object as fully dirty
     *
     * This means all the serialization data will be sent
     * to clients on the next update
     */
    setDirty(): void {
        this.game.fullDirtyObjects.add(this);
    }

    /**
     * Sets this object as partially dirty
     *
     * This means the partial data will be sent to clients
     * on the next update
     */
    setPartialDirty(): void {
        this.game.partialDirtyObjects.add(this);
    }

    abstract damage(params: DamageParams): void;

    abstract get data(): FullData<Cat>;
}
