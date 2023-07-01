import {
    type Body, Circle, Vec2
} from "planck";
import { type CollisionFilter, type GameObject } from "../types/gameObject";
import { type Player } from "./player";
import { type Game } from "../game";
import { randomFloat } from "../../../common/src/utils/random";
import { distanceSquared } from "../../../common/src/utils/math";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { type ObjectType } from "../../../common/src/utils/objectType";

export class Bullet {
    readonly is: CollisionFilter = {
        player: false,
        obstacle: false,
        bullet: true,
        loot: false
    };

    readonly collidesWith: CollisionFilter = {
        player: true,
        obstacle: true,
        bullet: false,
        loot: false
    };

    id: number;

    initialPosition: Vec2;
    finalPosition: Vec2;
    rotation: number;

    speedVariance = 0;

    maxDistance: number;
    maxDistanceSquared: number;

    dead = false;

    body: Body;

    source: GunDefinition;
    sourceType: ObjectType;
    shooter: Player;

    constructor(game: Game, position: Vec2, rotation: number, source: GunDefinition, sourceType: ObjectType, shooter: Player) {
        this.id = game.nextBulletID;
        this.initialPosition = position;
        this.rotation = rotation;
        this.source = source;
        this.sourceType = sourceType;
        this.shooter = shooter;

        const definition = this.source.ballistics;

        // explosion shrapnel variance
        this.speedVariance = randomFloat(0, definition.speedVariance);
        this.maxDistance = definition.maxDistance * (this.speedVariance + 1);
        this.maxDistanceSquared = (definition.maxDistanceSquared as number) * (this.speedVariance + 1);

        // Init body
        this.body = game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true,
            bullet: true
        });

        this.body.createFixture({
            shape: Circle(0),
            friction: 0.0,
            density: 0.0,
            restitution: 0.0,
            userData: this
        });

        this.body.setMassData({
            I: 0,
            center: Vec2(0, 0),
            mass: 0.0
        });

        const velocity = Vec2(Math.sin(rotation), Math.cos(rotation)).mul(definition.speed * (this.speedVariance + 1));
        this.finalPosition = this.initialPosition.clone().add(Vec2(this.maxDistance * Math.sin(rotation), this.maxDistance * Math.cos(rotation)));
        this.body.setLinearVelocity(velocity);
    }

    get position(): Vec2 {
        return this.initialPosition;
    }

    get distanceSquared(): number {
        return distanceSquared(this.initialPosition, this.body.getPosition());
    }
}

export class DamageRecord {
    damaged: GameObject;
    damager: Player;
    bullet: Bullet;

    constructor(damaged: GameObject, damager: Player, bullet: Bullet) {
        this.damaged = damaged;
        this.damager = damager;
        this.bullet = bullet;
    }
}
