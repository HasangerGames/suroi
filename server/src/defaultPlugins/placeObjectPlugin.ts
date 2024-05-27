import { Orientation } from "../../../common/src/typings";
import { Vec } from "../../../common/src/utils/vector";
import { Obstacle } from "../objects/obstacle";
import { Player } from "../objects/player";
import { GamePlugin } from "../pluginManager";

/**
 * Plugin to help place objects when developing buildings
 */
export class PlaceObjectPlugin extends GamePlugin {
    obstacleToPlace = "window";
    playerToObstacle = new Map<Player, Obstacle>();

    protected override initListeners(): void {
        this.on("playerJoin", player => {
            const obstacle = new Obstacle(player.game, this.obstacleToPlace, player.position);
            this.playerToObstacle.set(player, obstacle);
            this.game.grid.addObject(obstacle);
        });

        this.on("playerDisconnect", player => {
            this.game.grid.removeObject(this.playerToObstacle.get(player)!);
            this.playerToObstacle.delete(player);
        });

        this.on("playerEmote", event => {
            const obstacle = this.playerToObstacle.get(event.player)!;
            obstacle.rotation += 1;
            obstacle.rotation %= 4;
            this.updateObstacle(obstacle);
        });

        this.on("playerUpdate", player => {
            const position = Vec.add(
                player.position,
                Vec.create(Math.cos(player.rotation) * player.distanceToMouse, Math.sin(player.rotation) * player.distanceToMouse)
            );
            const obstacle = this.playerToObstacle.get(player)!;
            obstacle.position = position;
            this.updateObstacle(obstacle);
            player.game.grid.updateObject(obstacle);
        });

        this.on("playerStartAttacking", player => {
            const obstacle = this.playerToObstacle.get(player)!;
            const map = this.game.map;
            const round = (n: number): number => Math.round(n * 100) / 100;
            console.log(`{ idString: "${obstacle.definition.idString}", position: Vec.create(${round(obstacle.position.x - map.width / 2)}, ${round(obstacle.position.y - map.height / 2)}), rotation: ${obstacle.rotation} },`);
            // console.log(`Vec.create(${round(position.x - map.width / 2)}, ${round(position.y - map.height / 2)}),`);
        });
    }

    updateObstacle(obstacle: Obstacle): void {
        obstacle.setDirty();
        const def = obstacle.definition;
        obstacle.hitbox = def.hitbox.transform(obstacle.position, obstacle.scale, obstacle.rotation as Orientation);
        obstacle.spawnHitbox = def.spawnHitbox ? def.spawnHitbox.transform(obstacle.position, obstacle.scale, obstacle.rotation as Orientation) : obstacle.hitbox;
    }
}
