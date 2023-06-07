import {
    type Body, Circle, Vec2
} from "planck";

import { type Game } from "../game";

import { type CollisionFilter, GameObject } from "../types/gameObject";
import { v2v } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Vector } from "../../../common/src/utils/vector";
import { randomBoolean, randomRotation } from "../../../common/src/utils/random";

export class Loot extends GameObject {
    override readonly is: CollisionFilter = {
        player: false,
        obstacle: false,
        bullet: false,
        loot: true
    };

    override readonly collidesWith: CollisionFilter = {
        player: false,
        obstacle: true,
        bullet: false,
        loot: true
    };

    body: Body;

    oldPosition: Vector;
    oldRotation = 0;

    isNew = true;

    constructor(game: Game, type: ObjectType, position: Vector) {
        super(game, type, position);

        this.oldPosition = position;

        // Create the body
        this.body = game.world.createBody({
            type: "dynamic",
            position: v2v(position),
            linearDamping: 0.003
        });
        this.body.createFixture({
            shape: Circle(2.5),
            restitution: 0,
            density: 1.0,
            friction: 0.0,
            userData: this
        });

        // Push the loot in a random direction
        const angle: number = randomRotation();
        this.body.setLinearVelocity(Vec2(Math.cos(angle), Math.sin(angle)).mul(0.005));
        this.body.applyTorque(randomBoolean() ? 0.015 : -0.015);

        game.loot.add(this);
        game.dynamicObjects.add(this);
        game.fullDirtyObjects.add(this);
        game.updateObjects = true;
    }

    get position(): Vector {
        return this.body.getPosition();
    }

    get rotation(): number {
        const angle: number = this.body.getAngle();
        return Math.atan2(Math.cos(angle), Math.sin(angle));
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(amount: number, source?: GameObject): void {}

    override serializePartial(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeRotation(this.rotation, 8);
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writeObjectType(this.type);
        stream.writeBoolean(this.isNew);
    }
}
