import { Armors } from "$common/definitions/items/armors";
import { Backpacks } from "$common/definitions/items/backpacks";
import { pickRandomInArray } from "$common/utils/random";
import { Player } from "../objects/player";
import { GamePlugin } from "../pluginManager";

/**
 * Event plugin: Juggernaut
 */
export default class JuggernautPlugin extends GamePlugin {
    juggernautId: number | undefined;
    protected override initListeners(): void {
        this.on("player_did_join", ({ player }) => {
            if (!this.juggernautId) {
                this.makeJuggernaut(player);
            }
        });

        this.on("player_will_die", ({ player }) => {
            if (player.id === this.juggernautId) {
                player.removePerk("tactical_reload");
                player.removePerk("extended_mags");
                player.removePerk("flechettes");
                player.inventory.helmet = undefined;
                player.inventory.vest = undefined;
                player.inventory.backpack = Backpacks.fromString("bag");
                player.inventory.destroyWeapon(0);
                player.inventory.destroyWeapon(1);
            }
        });

        this.on("player_will_piercing_damaged", ({ source, player }, { cancel }) => {
            if (
                source instanceof Player
                && source.id !== this.juggernautId
                && player.id !== this.juggernautId
            ) {
                cancel();
            }
        });

        this.on("player_did_die", ({ player }) => {
            if (player.id === this.juggernautId) {
                if (player.killedBy && !player.killedBy.dead) {
                    this.makeJuggernaut(player.killedBy);
                } else {
                    this.makeJuggernaut();
                }
            }
        });

        this.on("player_disconnect", player => {
            if (player.id === this.juggernautId) {
                this.makeJuggernaut();
            }
        });
    }

    makeJuggernaut(player?: Player): void {
        if (player === undefined) {
            if (this.game.spectatablePlayers.length > 0) {
                player = pickRandomInArray(this.game.spectatablePlayers);
            } else {
                return;
            }
        }

        this.juggernautId = player.id;

        player.addPerk("experimental_forcefield");
        player.addPerk("tactical_reload");
        player.addPerk("extended_mags");
        player.addPerk("flechettes");

        player.inventory.helmet = Armors.fromString("tactical_helmet");
        player.inventory.vest = Armors.fromString("tactical_vest");
        player.inventory.backpack = Backpacks.fromString("tactical_pack");

        player.inventory.dropWeapons();
        player.giveGun("mg5");
        player.giveGun("negev");

        player.dirty.items = true;
        player.dirty.weapons = true;
    }
}
