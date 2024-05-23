import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { Orientation } from "../../../common/src/typings";
import { ColorStyles, styleText } from "../../../common/src/utils/ansiColoring";
import { ExtendedMap } from "../../../common/src/utils/misc";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { Vec } from "../../../common/src/utils/vector";
import { Obstacle } from "../objects/obstacle";
import { Player } from "../objects/player";
import { Events, GamePlugin } from "../pluginManager";

/**
 * Plugin to help place objects when developing buildings
 */
export class PlaceObjectPlugin extends GamePlugin {
    readonly obstacleToPlace: ReferenceTo<ObstacleDefinition> = "window";
    private readonly _playerToObstacle = new class extends ExtendedMap<Player, Obstacle> {
        override ifPresent(key: Player, callback: (obstacle: Obstacle) => void): void {
            const obstacle = super.get(key);

            if (obstacle === undefined) {
                console.warn(`[${styleText(this.constructor.name, ColorStyles.foreground.yellow.normal)}] Player with id ${key.id} has no associated obstacle`);
                return;
            }

            callback(obstacle);
        }
    } ();

    protected override initListeners(): void {
        this.on(Events.Player_Join, player => {
            const obstacle = new Obstacle(player.game, this.obstacleToPlace, player.position);
            this._playerToObstacle.set(player, obstacle);
            this.game.grid.addObject(obstacle);
        });

        this.on(Events.Player_Disconnect, player => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                this.game.grid.removeObject(obstacle);
                this._playerToObstacle.delete(player);
            });
        });

        this.on(Events.Player_Emote, ({ player }) => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                obstacle.rotation += 1;
                obstacle.rotation %= 4;
                this.updateObstacle(obstacle);
            });
        });

        this.on(Events.Player_Update, player => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                const position = Vec.add(
                    player.position,
                    Vec.create(Math.cos(player.rotation) * player.distanceToMouse, Math.sin(player.rotation) * player.distanceToMouse)
                );
                obstacle.position = position;
                this.updateObstacle(obstacle);
                player.game.grid.updateObject(obstacle);
            });
        });

        this.on(Events.Player_StartAttacking, player => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                const map = this.game.map;
                const round = (n: number): number => Math.round(n * 100) / 100;
                console.log(`{ idString: "${obstacle.definition.idString}", position: Vec.create(${round(obstacle.position.x - map.width / 2)}, ${round(obstacle.position.y - map.height / 2)}), rotation: ${obstacle.rotation} },`);
                // console.log(`Vec.create(${round(position.x - map.width / 2)}, ${round(position.y - map.height / 2)}),`);
            });
        });
    }

    updateObstacle(obstacle: Obstacle): void {
        obstacle.setDirty();
        const def = obstacle.definition;
        obstacle.hitbox = def.hitbox.transform(obstacle.position, obstacle.scale, obstacle.rotation as Orientation);
        obstacle.spawnHitbox = def.spawnHitbox ? def.spawnHitbox.transform(obstacle.position, obstacle.scale, obstacle.rotation as Orientation) : obstacle.hitbox;
    }
}
