import { GameObject } from "../types/gameObject";
import { type Game } from "../game";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type ExplosionDefinition } from "../../../common/src/definitions/explosions";
import { type Vector } from "../../../common/src/utils/vector";
import { distance } from "../../../common/src/utils/math";

export class Explosion extends GameObject {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    source: GameObject;

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    constructor(game: Game, type: ObjectType, position: Vector, source: GameObject) {
        super(game, type, position);
        this.source = source;
    }

    explode(): void {
        // NOTE: the CircleHitbox distance was returing weird values and i was lazy to debug it
        // so for now its just checking if the obstacle distance is in range
        const definition = this.type.definition as ExplosionDefinition;
        const visibleObjects: GameObject[] = this.game.visibleObjects[48][Math.round(this.position.x / 10) * 10][Math.round(this.position.y / 10) * 10];

        for (const object of visibleObjects) {
            if (!object.dead && object.hitbox !== undefined) {
                const dist = distance(this.position, object.position);
                if (dist < definition.radius.max) {
                    let damage = definition.damage * definition.obstacleMultiplier;
                    if (dist > definition.radius.min) {
                        const damagePercent = Math.abs(dist / definition.radius.max - 1);
                        damage *= damagePercent;
                    }
                    object.damage(damage, this.source);
                }
            }
        }

        for (const player of this.game.players) {
            const dist = distance(this.position, player.position);
            if (dist < definition.radius.max) {
                let damage = definition.damage;
                if (dist > definition.radius.min) {
                    const damagePercent = Math.abs(dist / definition.radius.max - 1);
                    damage *= damagePercent;
                }
                player.damage(damage, this.source);
            }
        }
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    damage(amount: number, source): void {}
    serializePartial(stream: SuroiBitStream): void {}

    serializeFull(stream: SuroiBitStream): void {
        stream.writeObjectType(this.type);
        stream.writePosition(this.position);
    }
}
