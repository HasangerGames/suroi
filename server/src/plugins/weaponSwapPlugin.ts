import { GunDefinition, Guns } from "@common/definitions/items/guns";
import { MeleeDefinition, Melees } from "@common/definitions/items/melees";
import { ThrowableDefinition, Throwables } from "@common/definitions/items/throwables";
import { DefinitionType } from "@common/utils/objectDefinitions";
import { pickRandomInArray } from "@common/utils/random";

import { Numeric } from "../../../common/src/utils/math";
import { Player } from "../objects/player";
import { GamePlugin } from "../pluginManager";

const selectableGuns = Guns.definitions.filter(g => !g.killstreak && !g.wearerAttributes);
const selectableMelees = Melees.definitions.filter(g => !g.killstreak && !g.wearerAttributes);
const selectableThrowables = Throwables.definitions.filter(g => !g.killstreak && !g.wearerAttributes);

/**
 * Plugin that swaps the player weapon when the player gets a kill
 */
export default class WeaponSwapPlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on("player_will_die", ({ source }) => {
            if (!(source instanceof Player)) return;

            const inventory = source.inventory;
            const index = source.activeItemIndex;

            let item: GunDefinition | MeleeDefinition | ThrowableDefinition;
            const defType = source.activeItemDefinition.defType;
            switch (defType) {
                case DefinitionType.Gun: {
                    const gun = pickRandomInArray(selectableGuns);
                    item = gun;
                    const { ammoType } = gun;
                    if (gun.ammoSpawnAmount) {
                        const amount = Numeric.min(
                            inventory.backpack.maxCapacity[ammoType],
                            inventory.items.getItem(ammoType) + gun.ammoSpawnAmount
                        );
                        inventory.items.setItem(ammoType, amount);
                        source.dirty.items = true;
                    }
                    break;
                }
                case DefinitionType.Melee: {
                    item = pickRandomInArray(selectableMelees);
                    break;
                }
                case DefinitionType.Throwable: {
                    item = pickRandomInArray(selectableThrowables);
                    inventory.items.setItem(item.idString, source.inventory.backpack.maxCapacity[item.idString]);
                }
            }

            inventory.replaceWeapon(index, item);

            if (source.activeItem.isGun) {
                source.activeItem.ammo = source.activeItem.definition.capacity;
            }
        });
    }
}
