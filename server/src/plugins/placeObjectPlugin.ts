import { type ObstacleDefinition } from "@common/definitions/obstacles";
import { Orientation } from "@common/typings";
import { ExtendedMap } from "@common/utils/misc";
import { type ReferenceTo } from "@common/utils/objectDefinitions";
import { Vec } from "@common/utils/vector";

import { Obstacle } from "../objects/obstacle";
import { Player } from "../objects/player";
import { GamePlugin } from "../pluginManager";

/**
 * Plugin to help place objects when developing buildings
 */
export default class PlaceObjectPlugin extends GamePlugin {
    readonly obstacleToPlace: ReferenceTo<ObstacleDefinition> = "house_column";
    private readonly _playerToObstacle = new ExtendedMap<Player, Obstacle>();

    protected override initListeners(): void {
        this.on("player_did_join", ({ player }) => {
            const obstacle = new Obstacle(player.game, this.obstacleToPlace, player.position);
            this._playerToObstacle.set(player, obstacle);
            this.game.grid.addObject(obstacle);
        });

        this.on("player_disconnect", player => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                this.game.grid.removeObject(obstacle);
                this._playerToObstacle.delete(player);
            });
        });

        this.on("player_did_emote", ({ player }) => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                obstacle.rotation += 1;
                obstacle.rotation %= 4;
                this.updateObstacle(obstacle);
            });
        });

        this.on("player_update", player => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                const position = Vec.add(
                    player.position,
                    Vec(Math.cos(player.rotation) * player.distanceToMouse, Math.sin(player.rotation) * player.distanceToMouse)
                );
                obstacle.position = position;
                obstacle.layer = player.layer;
                this.updateObstacle(obstacle);
                player.game.grid.updateObject(obstacle);
            });
        });

        this.on("player_start_attacking", player => {
            this._playerToObstacle.ifPresent(player, obstacle => {
                const map = this.game.map;
                const round = (n: number): number => Math.round(n * 100) / 100;
                console.log(`{ idString: "${obstacle.definition.idString}", position: Vec(${round(obstacle.position.x - map.width / 2)}, ${round(obstacle.position.y - map.height / 2)}), rotation: ${obstacle.rotation} },`);
                // console.log(`Vec(${round(position.x - map.width / 2)}, ${round(position.y - map.height / 2)}),`);
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
