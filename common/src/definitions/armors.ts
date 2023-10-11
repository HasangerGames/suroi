import { type ArmorType } from "../constants";
import { type ItemDefinition, type ItemType } from "../utils/objectDefinitions";
import { Helmets } from "./helmets";
import { Vests } from "./vests";

export interface ArmorDefinition extends ItemDefinition {
    readonly itemType: ItemType.Armor
    readonly armorType: ArmorType
    readonly level: number
    readonly damageReduction: number
}

export const Armors: ArmorDefinition[] = Array.prototype.concat(Helmets, Vests);
