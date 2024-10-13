import { GunDefinition, Guns } from "@common/definitions/guns";
import { MeleeDefinition, Melees } from "@common/definitions/melees";
import { ThrowableDefinition, Throwables } from "@common/definitions/throwables";
import { ItemType } from "@common/utils/objectDefinitions";
import { pickRandomInArray } from "@common/utils/random";

import { GunItem } from "../inventory/gunItem";
import { Player } from "../objects/player";
import { GamePlugin } from "../pluginManager";
import { Numeric } from "../../../common/src/utils/math";

const selectableGuns = Guns.definitions.filter(g => !g.killstreak && !g.wearerAttributes);
const selectableMelees = Melees.definitions.filter(g => !g.killstreak && !g.wearerAttributes);
const selectableThrowables = Throwables.definitions.filter(g => !g.killstreak && !g.wearerAttributes);

/**
 * Plugin that swaps the player weapon when the player gets a kill
 */
export class WeaponSwapPlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on("player_will_die", ({ source }) => {
            if (!(source instanceof Player)) return;

            const inventory = source.inventory;
            const index = source.activeItemIndex;

            let item: GunDefinition | MeleeDefinition | ThrowableDefinition;
            const itemType = source.activeItemDefinition.itemType;
            switch (itemType) {
                case ItemType.Gun: {
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
                case ItemType.Melee: {
                    item = pickRandomInArray(selectableMelees);
                    break;
                }
                case ItemType.Throwable: {
                    item = pickRandomInArray(selectableThrowables);
                    inventory.items.setItem(item.idString, source.inventory.backpack.maxCapacity[item.idString]);
                }
            }

            inventory.replaceWeapon(index, item);

            if (source.activeItem instanceof GunItem) {
                source.activeItem.ammo = source.activeItem.definition.capacity;
            }
        });
    }
}
