import { GameConstants } from "../../constants";
import type { Mutable } from "../../utils/misc";
import { ObjectDefinitions } from "../../utils/objectDefinitions";
import type { WeaponDefinition } from "../loots";

/**
 * Subclass of {@link ObjectDefinitions} specialized for {@link InventoryItemDefinition}s. Notable
 * changes include:
 * - Resolving speed multipliers (`base` * `defaultForType` * `specific`)
 */
export class InventoryItemDefinitions<Def extends WeaponDefinition> extends ObjectDefinitions<Def> {
    constructor(definitions: readonly Def[]) {
        super(
            definitions.map(i => {
                (i as Mutable<Def>).speedMultiplier *= GameConstants.defaultSpeedModifiers[i.defType];

                return i;
            })
        );
    }
}
