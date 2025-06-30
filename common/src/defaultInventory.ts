import { Ammos } from "./definitions/items/ammos";
import { HealingItems } from "./definitions/items/healingItems";
import { Scopes } from "./definitions/items/scopes";
import { Throwables } from "./definitions/items/throwables";
import { DefinitionType } from "./utils/objectDefinitions";

export const DEFAULT_INVENTORY: Record<string, number> = Object.create(null) as Record<string, number>;

for (const item of [...HealingItems, ...Ammos, ...Scopes, ...Throwables]) {
    let amount = 0;

    switch (true) {
        case item.defType === DefinitionType.Ammo && item.ephemeral: amount = Infinity; break;
        case item.defType === DefinitionType.Scope && item.giveByDefault: amount = 1; break;
    }

    DEFAULT_INVENTORY[item.idString] = amount;
}

Object.freeze(DEFAULT_INVENTORY);

export const itemKeys: readonly string[] = Object.keys(DEFAULT_INVENTORY);
export const itemKeysLength = itemKeys.length;
