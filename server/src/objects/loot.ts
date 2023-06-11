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
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type Player } from "./player";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { type HealingItemDefinition, HealType } from "../../../common/src/definitions/healingItems";

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
            linearDamping: 0.003,
            angularDamping: 0
        });
        const radius: number = (this.type.definition as LootDefinition).itemType === ItemType.Gun ? 3.125 : 2.5;
        this.body.createFixture({
            shape: Circle(radius),
            restitution: 0,
            density: 1.0,
            friction: 0.0,
            userData: this
        });

        this.hitbox = new CircleHitbox(radius, this.position);

        // Push the loot in a random direction
        const angle: number = randomRotation();
        this.body.setLinearVelocity(Vec2(Math.cos(angle), Math.sin(angle)).mul(0.005));
        this.body.applyTorque(randomBoolean() ? 0.003 : -0.003);

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

    canInteract(player: Player): boolean {
        const inventory = player.inventory;
        switch ((this.type.definition as LootDefinition).itemType) {
            case ItemType.Healing:
                switch (this.type.idString) {
                    case "medikit": return player.health < 100;
                    case "cola": return player.adrenaline < 100;
                }
                break;
            case ItemType.Gun:
                return !inventory.hasWeapon(0) ||
                       !inventory.hasWeapon(1) ||
                       (inventory.activeWeaponIndex < 2 && this.type.idString !== inventory.activeWeapon.type.idString);
        }
        return false;
    }

    interact(player: Player): void {
        const inventory = player.inventory;
        let success = false;
        const definition = this.type.definition as LootDefinition;
        switch (definition.itemType) {
            case ItemType.Healing: {
                success = true;
                const healDefinition = definition as HealingItemDefinition;
                if (healDefinition.healType === HealType.Health) player.health += healDefinition.restoreAmount;
                else if (healDefinition.healType === HealType.Adrenaline) player.adrenaline += healDefinition.restoreAmount;
                break;
            }
            case ItemType.Melee: {
                break;
            }
            case ItemType.Gun: {
                if (!inventory.hasWeapon(0) || !inventory.hasWeapon(1)) {
                    inventory.appendWeapon(this.type.idString);
                    success = true;
                } else if (inventory.activeWeaponIndex < 2 && this.type.idString !== inventory.activeWeapon.type.idString) {
                    inventory.addOrReplaceWeapon(inventory.activeWeaponIndex, this.type.idString);
                    success = true;
                }
                break;
            }
        }
        if (success) {
            this.game.dynamicObjects.delete(this);
            this.game.loot.delete(this);
            this.game.deletedObjects.add(this);
            this.game.world.destroyBody(this.body);
        }/* else if (!ignoreItem) {
            const invertedAngle = (player.rotation + Math.PI) % (2 * Math.PI);
            /* eslint-disable-next-line no-new
            new Loot(this.game, this.type, vAdd(this.position, v(0.4 * Math.cos(invertedAngle), 0.4 * Math.sin(invertedAngle))));
        }*/
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
