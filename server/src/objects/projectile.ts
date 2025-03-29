import { GameConstants, ObjectCategory } from "@common/constants";
import { PerkData, PerkIds } from "@common/definitions/items/perks";
import { ThrowableDefinition, Throwables } from "@common/definitions/items/throwables";
import { CircleHitbox, HitboxType, RectangleHitbox } from "@common/utils/hitbox";
import { equivLayer } from "@common/utils/layer";
import { Angle, Geometry, Numeric } from "@common/utils/math";
import { type ReifiableDef } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import type { ThrowableItem } from "../inventory/throwableItem";
import { BaseGameObject, DamageParams, GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";

export interface ProjectileParams {
    readonly position: Vector
    readonly definition: ReifiableDef<ThrowableDefinition>
    readonly height: number
    readonly rotation?: number
    readonly layer: number
    readonly owner: GameObject
    readonly source?: ThrowableItem
    readonly velocity: Vector
    readonly fuseTime?: number
    readonly halloweenSkin?: boolean
}

export class Projectile extends BaseGameObject.derive(ObjectCategory.Projectile) {
    override readonly fullAllocBytes = 16;
    override readonly partialAllocBytes = 16;

    readonly definition: ThrowableDefinition;
    readonly source?: ThrowableItem;

    halloweenSkin: boolean;

    activated = false;
    throwerTeamID = 0;
    tintIndex = 0;
    health: number;

    owner: GameObject;

    override get position(): Vector { return this.hitbox.position; }
    override set position(pos: Vector) { this.hitbox.position = pos; }

    private _lastPosition: Vector;

    inAir = false;

    hitbox = new CircleHitbox(0);
    private _height: number;

    private _velocity: Vector;
    private _velocityZ: number;

    private _angularVelocity: number;
    private _fuseTime: number;
    private readonly _obstaclesBelow = new Set<Obstacle>();

    constructor(game: Game, params: ProjectileParams) {
        super(game, params.position);
        this.layer = params.layer;

        this.rotation = params.rotation ?? 0;

        this.definition = Throwables.reify(params.definition);
        this.position = params.position;
        this._lastPosition = this.position;
        this.hitbox.radius = this.definition.hitboxRadius;

        this.health = this.definition.health ?? Infinity;

        this.owner = params.owner;
        this.source = params.source;
        if (this.owner.isPlayer) {
            this.throwerTeamID = this.owner.teamID ?? 0;
            this.tintIndex = this.owner.colorIndex;
        }

        this.halloweenSkin = params.halloweenSkin ?? false;

        this._height = params.height;
        this._velocity = params.velocity;

        this._fuseTime = params.fuseTime ?? this.definition.fuseTime;

        this._angularVelocity = this.definition.physics.initialAngularVelocity;
        this._velocityZ = this.definition.physics.initialZVelocity;
    }

    update(): void {
        if (!this.definition.c4 || this.activated) {
            this._fuseTime -= this.game.dt;
        }

        if (this._fuseTime < 0) {
            this._detonate();
            return;
        }

        const initialLastPosition = Vec.clone(this.position);

        const dt = this.game.dt / 1000;

        const objects = this.game.grid.intersectsHitbox(
            RectangleHitbox.fromLine(this._lastPosition, this.position),
            this.layer
        );

        const collisions: Array<{
            position: Vector
            normal: Vector
            object: GameObject
            distance: number
            isLine?: boolean
        }> = [];

        for (const object of objects) {
            if (
                !(object.isBuilding || object.isObstacle || object.isPlayer)
                || object.dead
                || !object.hitbox
                || object === this.owner
                || !equivLayer(object, this)
                || (object.isObstacle && object.definition.noCollisions)
            ) continue;

            const hitbox = object.hitbox;
            const hitboxes = hitbox.type === HitboxType.Group ? hitbox.hitboxes : [hitbox];

            for (const hitbox of hitboxes) {
                const intersection = hitbox.getIntersection(this.hitbox);
                if (intersection) {
                    const position = Vec.sub(this.position,
                        Vec.scale(intersection.dir, intersection.pen)
                    );
                    collisions.push({
                        position,
                        normal: intersection.dir,
                        object,
                        distance: Geometry.distanceSquared(this._lastPosition, position)
                    });
                }
            }

            const lineIntersection = hitbox.intersectsLine(this._lastPosition, this.position);
            if (lineIntersection) {
                const position = Vec.add(
                    lineIntersection.point, Vec.scale(
                        Vec.normalize(
                            Vec.sub(
                                lineIntersection.point,
                                this._lastPosition
                            )
                        ),
                        -this.hitbox.radius / 5
                    ));
                collisions.push({
                    position,
                    normal: lineIntersection.normal,
                    object,
                    distance: Geometry.distanceSquared(this._lastPosition, position),
                    isLine: true
                });
            }
        }

        collisions.sort((a, b) => a.distance - b.distance);

        for (const collision of collisions) {
            const { object } = collision;
            if (!object.hitbox) continue;

            if (object.isObstacle) {
                if (object.definition.isStair) {
                    object.handleStairInteraction(this);
                    continue;
                }
                const height = object.height;

                if (this._height >= height) {
                    this._obstaclesBelow.add(object);
                    continue;
                }
                if (this._obstaclesBelow.has(object)) continue;
            }

            if (collision.isLine) {
                this.position = collision.position;
            }

            if (!this.inAir) continue;

            if ((object.isObstacle || object.isPlayer) && this.definition.impactDamage) {
                const damage = this.definition.impactDamage
                    * (object.isPlayer ? 1 : this.definition.obstacleMultiplier ?? 1);
                object.damage({ amount: damage, source: this.owner, weaponUsed: this.source });
            }
            if (object.dead) continue;

            this.hitbox.resolveCollision(object.hitbox);

            this._reflect(collision.normal);

            break;
        }

        // only decrease projectile height if its not on top of an obstacle that has a height smaller than it
        let height = this._height;
        let sittingOnObstacle = false;
        // find obstacle with highest height
        for (const obstacle of this._obstaclesBelow) {
            if (!obstacle.hitbox.collidesWith(this.hitbox) || obstacle.dead) {
                this._obstaclesBelow.delete(obstacle);
                continue;
            }

            height = Numeric.max(height, obstacle.height);
            if (this._height <= obstacle.height) {
                sittingOnObstacle = true;
            }
        }

        const lastHeight = this._height;
        if (this._height === 0 || sittingOnObstacle) {
            this._height = height;
        } else {
            if (this._height > 0) {
                this._velocityZ -= GameConstants.projectiles.gravity * dt;
            }
            this._height += this._velocityZ * dt;
            this._height = Numeric.clamp(this._height, 0, GameConstants.projectiles.maxHeight);
        }

        const onFloor = this._height <= 0;
        const onWater = onFloor && !!FloorTypes[this.game.map.terrain.getFloor(this.position, this.layer)].overlay;

        const drag = this.definition.physics.drag ?? GameConstants.projectiles.drag;
        // apply more friction based on being on top of something (ground or obstacle) or on water
        let speedDrag: number = drag.air;
        if (onWater) speedDrag = drag.water;
        else if (onFloor || sittingOnObstacle) speedDrag = drag.ground;

        this.inAir = !onFloor && !sittingOnObstacle;

        this._velocity = Vec.scale(this._velocity, 1 / (1 + dt * speedDrag));

        this._lastPosition = Vec.clone(this.position);
        this.position = Vec.add(this.position, Vec.scale(this._velocity, dt));

        this.position.x = Numeric.clamp(this.position.x, 0, this.game.map.width);
        this.position.y = Numeric.clamp(this.position.y, 0, this.game.map.height);

        const lastRotation = this.rotation;
        this.rotation = Angle.normalize(this.rotation + this._angularVelocity * dt);

        this._angularVelocity *= (1 / (1 + dt * 1.2));

        if (
            !Vec.equals(this.position, initialLastPosition)
            || !Numeric.equals(this.rotation, lastRotation)
            || !Numeric.equals(this._height, lastHeight)
        ) this.setPartialDirty();
    }

    detonated = false;
    private _detonate(): void {
        if (this.detonated) return;

        this.detonated = true;
        const { explosion } = this.definition.detonation;

        const particles
            = (this.halloweenSkin && this.definition.detonation.spookyParticles)
                ? this.definition.detonation.spookyParticles
                : this.definition.detonation.particles;

        const game = this.game;

        if (explosion !== undefined) {
            game.addExplosion(
                explosion,
                this.position,
                this.owner,
                this.layer,
                this.source,
                this.halloweenSkin ? PerkData[PerkIds.PlumpkinBomb].damageMod : 1,
                this._obstaclesBelow
            );
        }

        if (particles !== undefined) {
            game.addSyncedParticles(particles, this.position, this.layer);
        }

        this.game.removeProjectile(this);
    }

    private _reflect(normal: Vector): void {
        const length = Vec.length(this._velocity);
        const direction = Vec.scale(this._velocity, 1 / length);
        const dot = Vec.dotProduct(direction, normal);
        const newDir = Vec.add(Vec.scale(normal, dot * -2), direction);
        this._velocity = Vec.scale(newDir, length * 0.3);
    }

    override get data(): FullData<ObjectCategory.Projectile> {
        return {
            position: this.position,
            rotation: this.rotation,
            layer: this.layer,
            height: this._height,
            full: {
                definition: this.definition,
                halloweenSkin: this.halloweenSkin,
                activated: this.activated,
                c4: {
                    throwerTeamID: this.throwerTeamID,
                    tintIndex: this.tintIndex
                }
            }
        };
    }

    push(angle: number, speed: number): void {
        this._velocity = Vec.add(this._velocity, Vec.fromPolar(angle, speed * 1000));
        if (!this.definition.physics.noSpin) this._angularVelocity = 10;
    }

    activateC4(): boolean {
        if (!this.definition.c4) {
            throw new Error("Tried to activate non c4 projectile");
        }
        if (this.inAir) return false;
        this.activated = true;
        this.setDirty();
        return true;
    }

    override damage({ amount }: DamageParams): void {
        if (!this.health) return;

        this.health = this.health - amount;
        if (this.health <= 0) {
            this.destroy();
            this.game.removeProjectile(this);
        }
    }

    destroy(): void {
        if (this.dead) return;
        this.dead = true;

        if (this.owner.isPlayer) {
            this.owner.c4s.delete(this);
            this.owner.dirty.activeC4s = true;
        }
    }
}
