import { Layer, ObjectCategory } from "@common/constants";
import { DamageSources } from "@common/packets/killPacket";
import { makeGameObjectTemplate } from "@common/utils/gameObject";
import { type Hitbox } from "@common/utils/hitbox";
import { ObjectSerializations, type FullData } from "@common/utils/objectsSerializations";
import { SuroiByteStream } from "@common/utils/suroiByteStream";
import { type Vector } from "@common/utils/vector";
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
import { Projectile } from "./projectile";
import { type SyncedParticle } from "./syncedParticle";

export interface ObjectMapping {
    [ObjectCategory.Player]: Player
    [ObjectCategory.Obstacle]: Obstacle
    [ObjectCategory.DeathMarker]: DeathMarker
    [ObjectCategory.Loot]: Loot
    [ObjectCategory.Building]: Building
    [ObjectCategory.Decal]: Decal
    [ObjectCategory.Parachute]: Parachute
    [ObjectCategory.Projectile]: Projectile
    [ObjectCategory.SyncedParticle]: SyncedParticle
}

export type GameObject = ObjectMapping[ObjectCategory];

export interface DamageParams {
    readonly amount: number
    readonly source?: GameObject | DamageSources.Gas | DamageSources.Obstacle | DamageSources.BleedOut | DamageSources.FinallyKilled
    readonly weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion | Obstacle
}

export type CollidableGameObject<
    Cat extends ObjectCategory = ObjectCategory,
    HitboxType extends Hitbox = Hitbox
> = ObjectMapping[Cat] & { readonly hitbox: HitboxType };

export abstract class BaseGameObject<Cat extends ObjectCategory = ObjectCategory> extends makeGameObjectTemplate() {
    declare readonly abstract type: Cat;
    // doesn't get forwarded from makeGameObjectTemplate for some reason

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

    private _layer: Layer = Layer.Ground;
    get layer(): Layer { return this._layer; }
    set layer(value: Layer) { this._layer = value; }

    abstract hitbox?: Hitbox;

    private _fullStream?: SuroiByteStream | undefined;
    get fullStream(): SuroiByteStream { return this._fullStream ??= new SuroiByteStream(new ArrayBuffer(this.fullAllocBytes)); }

    private _partialStream?: SuroiByteStream | undefined;
    get partialStream(): SuroiByteStream { return this._partialStream ??= new SuroiByteStream(new ArrayBuffer(this.partialAllocBytes)); }

    constructor(game: Game, position: Vector) {
        super();

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
    }

    serializePartial(): void {
        const stream = this.partialStream;
        stream.index = 0;

        stream.writeObjectId(this.id);
        stream.writeObjectType(this.type);

        ObjectSerializations[this.type].serializePartial(stream, this.data);
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
