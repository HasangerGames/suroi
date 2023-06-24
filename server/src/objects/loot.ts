import { type Body, Circle, Vec2 } from "planck";

import { type Game } from "../game";

import { type CollisionFilter, GameObject } from "../types/gameObject";
import { v2v } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Vector } from "../../../common/src/utils/vector";
import { randomRotation } from "../../../common/src/utils/random";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type Player } from "./player";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { HealType } from "../../../common/src/definitions/healingItems";
import { PickupPacket } from "../packets/sending/pickupPacket";

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

        // Create the body and hitbox
        this.body = game.world.createBody({
            type: "dynamic",
            position: v2v(position),
            linearDamping: 0.003,
            angularDamping: 0,
            fixedRotation: true
        });
        const itemType = (this.type.definition as LootDefinition).itemType;
        let radius: number;
        switch (itemType) {
            case ItemType.Gun:
                radius = 3.4;
                break;
            case ItemType.Ammo:
                radius = 2;
                break;
            case ItemType.Melee:
                radius = 3;
                break;
            case ItemType.Healing:
                radius = 2.5;
                break;
            default:
                radius = 2.5;
                break;
        }
        this.body.createFixture({
            shape: Circle(radius),
            restitution: 0,
            density: 1.0,
            friction: 0.0,
            userData: this
        });
        this.hitbox = new CircleHitbox(radius, this.position);

        // Push the loot in a random direction
        const angle = randomRotation();
        this.body.setLinearVelocity(Vec2(Math.cos(angle), Math.sin(angle)).mul(0.005));

        setTimeout((): void => { this.isNew = false; }, 100);
    }

    get position(): Vector {
        return this.body.getPosition();
    }

    get rotation(): number {
        const angle = this.body.getAngle();
        return Math.atan2(Math.cos(angle), Math.sin(angle));
    }

    canInteract(player: Player): boolean {
        const inventory = player.inventory;
        const definition = this.type.definition as LootDefinition;
        switch (definition.itemType) {
            case ItemType.Healing: {
                switch (definition.healType) {
                    case HealType.Health: return player.health < 100;
                    case HealType.Adrenaline: return player.adrenaline < 100;
                }
            }
            // average ESLint L
            // eslint-disable-next-line no-fallthrough
            case ItemType.Gun: {
                return !inventory.hasWeapon(0) ||
                    !inventory.hasWeapon(1) ||
                    (inventory.activeWeaponIndex < 2 && this.type.idNumber !== inventory.activeWeapon.type.idNumber);
            }
            case ItemType.Melee: {
                return this.type.idNumber !== inventory.getWeapon(2)?.type.idNumber;
            }
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

                if (definition.healType === HealType.Health) player.health += definition.restoreAmount;
                else if (definition.healType === HealType.Adrenaline) player.adrenaline += definition.restoreAmount;

                break;
            }
            case ItemType.Melee: {
                inventory.addOrReplaceWeapon(2, this.type.idString);
                success = true;
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
            this.game.removeObject(this);
            this.game.world.destroyBody(this.body);
            if (definition.itemType !== ItemType.Gun) {
                player.sendPacket(new PickupPacket(player));
            }
        }/* else if (!ignoreItem) {
            const invertedAngle = (player.rotation + Math.PI) % (2 * Math.PI);
            /* eslint-disable-next-line no-new
            new Loot(this.game, this.type, vAdd(this.position, v(0.4 * Math.cos(invertedAngle), 0.4 * Math.sin(invertedAngle))));
        } */
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(amount: number, source?: GameObject): void {}

    override serializePartial(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writeBoolean(this.isNew);
    }
}
