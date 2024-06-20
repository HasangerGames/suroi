import { GameConstants, KillfeedEventType, ObjectCategory } from "../../../common/src/constants";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Numeric } from "../../../common/src/utils/math";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type Airdrop, type Game } from "../game";
import { Events } from "../pluginManager";
import { Building } from "./building";
import { BaseGameObject } from "./gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class Parachute extends BaseGameObject<ObjectCategory.Parachute> {
    override readonly type = ObjectCategory.Parachute;
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

            this.game.pluginManager.emit(Events.Airdrop_Landed, this._airdrop);

            // Spawn smoke
            this.game.addSyncedParticles({
                type: "airdrop_smoke_particle",
                count: 5,
                deployAnimation: {
                    duration: 2000,
                    staggering: {
                        delay: 100,
                        initialAmount: 2
                    }
                },
                spawnRadius: 10
            }, crate.position);

            // Crush damage
            for (const object of this.game.grid.intersectsHitbox(crate.hitbox)) {
                if (object.hitbox?.collidesWith(crate.hitbox)) {
                    switch (true) {
                        case object instanceof Player: {
                            object.piercingDamage({
                                amount: GameConstants.airdrop.damage,
                                source: KillfeedEventType.Airdrop
                            });
                            break;
                        }
                        case object instanceof Obstacle: {
                            object.damage({
                                amount: Infinity,
                                source: crate
                            });
                            // Hacky hacky solution probably not the smartest solution atm but fuck it we ball :shrug:
                            if (object.definition.idString == "airdrop_crate_locked" && object != crate) {
                                let xDif = crate.position.x - object.position.x;
                                if (xDif <= 0) {
                                    xDif = xDif + 10;
                                } else {
                                    xDif = xDif - 10;
                                }
                                let yDif = crate.position.y - object.position.y;
                                if (yDif <= 0) {
                                    yDif = yDif + 10;
                                } else {
                                    yDif = yDif - 10;
                                }
                                const position = Vec.create(xDif, yDif);
                                crate.hitbox = object.hitbox.transform(position);
                                crate.position = crate.hitbox.getCenter();
                            }
                            break;
                        }
                        case object instanceof Building && object.scopeHitbox?.collidesWith(crate.hitbox): {
                            object.damageCeiling(Infinity);
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
