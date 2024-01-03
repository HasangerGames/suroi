import { GameConstants, KillType, ObjectCategory } from "../../../common/src/constants";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Numeric } from "../../../common/src/utils/math";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../common/src/utils/vector";
import { type Airdrop, type Game } from "../game";
import { Building } from "./building";
import { BaseGameObject } from "./gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class Parachute extends BaseGameObject<ObjectCategory.Parachute> {
    override readonly type = ObjectCategory.Parachute;

    private _height = 1;
    get height(): number { return this._height; }

    hitbox = new CircleHitbox(10);

    endTime = Date.now() + GameConstants.airdrop.fallTime;

    private readonly _airdrop: Airdrop;

    constructor(game: Game, position: Vector, airdrop: Airdrop) {
        super(game, position);
        this.hitbox.position = position;
        this._airdrop = airdrop;

        this.game.mapPings.add(this.position);
    }

    update(): void {
        if (this._height < 0) {
            this.game.removeObject(this);
            this.game.airdrops.delete(this._airdrop);

            const crate = this.game.map.generateObstacle(this._airdrop.type, this.position);

            // Crush damage
            for (const object of this.game.grid.intersectsHitbox(crate.hitbox)) {
                if (object.hitbox?.collidesWith(crate.hitbox)) {
                    switch (true) {
                        case object instanceof Player: {
                            object.piercingDamage(GameConstants.airdrop.damage, KillType.Airdrop);
                            break;
                        }
                        case object instanceof Obstacle: {
                            object.damage(Infinity, crate);
                            break;
                        }
                        case object instanceof Building && object.scopeHitbox?.collidesWith(crate.hitbox): {
                            object.damage(Infinity);
                            break;
                        }
                    }
                }
            }

            // loop again to make sure loot added by destroyed obstacles is checked
            for (const loot of this.game.grid.intersectsHitbox(this.hitbox)) {
                if (loot instanceof Loot && this.hitbox.collidesWith(loot.hitbox)) {
                    if (loot.hitbox.collidesWith(crate.hitbox)) {
                        loot.hitbox.resolveCollision(crate.hitbox);
                    }

                    loot.push(
                        Angle.betweenPoints(this.position, loot.position),
                        -0.03
                    );
                }
            }

            return;
        }

        const elapsed = this.endTime - this.game.now;

        this._height = Numeric.lerp(0, 1, elapsed / GameConstants.airdrop.fallTime);

        this.game.partialDirtyObjects.add(this);
    }

    override get data(): FullData<ObjectCategory.Parachute> {
        return {
            height: this._height,
            full: {
                position: this.position
            }
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(): void { }
}
