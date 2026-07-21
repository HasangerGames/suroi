import { Armors } from "@common/definitions/items/armors";
import { Backpacks } from "@common/definitions/items/backpacks";
import { GamePlugin } from "../pluginManager";

/**
 * Event plugin: Juggernaut
 */
export default class JuggernautPlugin extends GamePlugin {
    juggernautId: number | undefined;
    protected override initListeners(): void {
        this.on("player_did_join", ({ player }) => {
            if (this.juggernautId) return;
            this.juggernautId = player.id;
            player.addPerk("experimental_forcefield");
            player.addPerk("tactical_reload");
            player.addPerk("extended_mags");
            player.addPerk("flechettes");
            player.inventory.helmet = Armors.fromString("tactical_helmet");
            player.inventory.vest = Armors.fromString("tactical_vest");
            player.inventory.backpack = Backpacks.fromString("tactical_pack");
            player.giveGun("mg5");
            player.giveGun("negev");
            player.dirty.items = true;
            player.dirty.weapons = true;
        });

        this.on("player_will_die", ({ player }) => {
            player.removePerk("tactical_reload");
            player.removePerk("extended_mags");
            player.removePerk("flechettes");
        });

        this.on("player_did_die", ({ player }) => {
            if (player.id === this.juggernautId) {
                this.juggernautId = undefined;
            }
        });

        this.on("player_disconnect", player => {
            if (player.id === this.juggernautId) {
                this.juggernautId = undefined;
            }
        });
    }
}
