import { GameConstants, KillType, ObjectCategory } from "../../../common/src/constants";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { angleBetweenPoints, lerp } from "../../../common/src/utils/math";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../common/src/utils/vector";
import { type Airdrop, type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { Building } from "./building";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class Parachute extends GameObject<ObjectCategory.Parachute> {
    override readonly type = ObjectCategory.Parachute;

    height = 1;

    hitbox = new CircleHitbox(10);

    startTime = Date.now();

    endTime = Date.now() + GameConstants.airdrop.fallTime;

    airdrop: Airdrop;

    constructor(game: Game, position: Vector, airdrop: Airdrop) {
        super(game, position);
        this.hitbox.position = position;
        this.airdrop = airdrop;

        this.game.mapPings.add(this.position);
    }

    update(): void {
        if (this.height < 0) {
            this.game.removeObject(this);
            this.game.airdrops.delete(this.airdrop);

            const crate = this.game.map.generateObstacle(this.airdrop.type, this.position);

            // Crush damage
            for (const object of this.game.grid.intersectsHitbox(crate.hitbox)) {
                if (object.hitbox?.collidesWith(crate.hitbox)) {
                    if (object instanceof Player) {
                        object.piercingDamage(GameConstants.airdrop.damage, KillType.Airdrop);
                    } else if (object instanceof Obstacle) {
                        object.damage(Infinity, crate);
                    } else if (object instanceof Building &&
                        object.scopeHitbox &&
                        crate.hitbox.collidesWith(object.scopeHitbox)) {
                        object.damage(Infinity);
                    }
                }
            }

            // loop again to make sure loot added by destroyed obstacles is checked
            for (const loot of this.game.grid.intersectsHitbox(this.hitbox)) {
                if (loot instanceof Loot && this.hitbox.collidesWith(loot.hitbox)) {
                    if (loot.hitbox.collidesWith(crate.hitbox)) {
                        loot.hitbox.resolveCollision(crate.hitbox);
                    }
                    const angle = angleBetweenPoints(this.position, loot.position);

                    loot.push(angle, -10);
                }
            }

            return;
        }

        const elapsed = this.endTime - this.game.now;

        this.height = lerp(0, 1, elapsed / GameConstants.airdrop.fallTime);

        this.game.partialDirtyObjects.add(this);
    }

    override get data(): Required<ObjectsNetData[ObjectCategory.Parachute]> {
        return {
            height: this.height,
            full: { position: this.position }
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(): void { }
}
