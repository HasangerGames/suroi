import { GameConstants, ObjectCategory } from "@common/constants";
import { DamageSources } from "@common/packets/killPacket";
import { CircleHitbox } from "@common/utils/hitbox";
import { Angle, Numeric } from "@common/utils/math";
import { type FullData } from "@common/utils/objectsSerializations";
import { type Vector } from "@common/utils/vector";
import { type Airdrop, type Game } from "../game";
import { BaseGameObject } from "./gameObject";

export class Parachute extends BaseGameObject.derive(ObjectCategory.Parachute) {
    override readonly fullAllocBytes = 8;
    override readonly partialAllocBytes = 4;

    private _height = 1;
    get height(): number { return this._height; }

    hitbox = new CircleHitbox(10);

    endTime = Date.now() + GameConstants.airdrop.fallTime;

    private readonly _airdrop: Airdrop;

    constructor(game: Game, position: Vector, airdrop: Airdrop) {
        super(game, position);
        this.hitbox.position = position;
        this._airdrop = airdrop;
    }

    update(): void {
        if (this._height < 0) {
            this.game.removeObject(this);
            this.game.airdrops.splice(this.game.airdrops.indexOf(this._airdrop), 1);

            const crate = this.game.map.generateObstacle(this._airdrop.type, this.position);

            if (!crate) return;

            this.game.pluginManager.emit("airdrop_landed", this._airdrop);

            // Spawn smoke
            this.game.addSyncedParticles("airdrop_smoke_particle", crate.position, crate.layer);

            // Crush damage
            for (const object of this.game.grid.intersectsHitbox(crate.hitbox, crate.layer)) {
                if (object.hitbox?.collidesWith(crate.hitbox)) {
                    switch (true) {
                        case object.isPlayer: {
                            object.piercingDamage({
                                amount: GameConstants.airdrop.damage,
                                source: DamageSources.Obstacle,
                                weaponUsed: crate
                            });
                            break;
                        }
                        case object.isObstacle: {
                            object.damage({
                                amount: Infinity,
                                source: crate
                            });
                            break;
                        }
                        case object.isBuilding && object.scopeHitbox?.collidesWith(crate.hitbox): {
                            object.damageCeiling(Infinity);
                            break;
                        }
                    }
                }
            }

            // loop again to make sure loot added by destroyed obstacles is checked
            for (const loot of this.game.grid.intersectsHitbox(this.hitbox, this.layer)) {
                if (loot.isLoot && this.hitbox.collidesWith(loot.hitbox)) {
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

        this.setPartialDirty();
    }

    override get data(): FullData<ObjectCategory.Parachute> {
        return {
            height: this._height,
            full: {
                position: this.position
            }
        };
    }

    override damage(): void { /* "hold on bro, lemme shoot the 'chute" */ }
}
