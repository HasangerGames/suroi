import { RotationMode, ZIndexes } from "../constants";
import { DefinitionType, ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";
import { HealingItems } from "./items/healingItems";

export interface DecalDefinition extends ObjectDefinition {
    readonly defType: "decal"
    readonly image?: string
    /**
     * @default {1}
     */
    readonly scale?: number
    readonly rotationMode: RotationMode
    readonly zIndex?: ZIndexes
    readonly alpha?: number
}

export const Decals = new ObjectDefinitions<DecalDefinition>([
    {
        idString: "explosion_decal",
        name: "Explosion Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "frag_explosion_decal",
        name: "Frag Explosion Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "smoke_explosion_decal",
        name: "Smoke Explosion Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "seed_decal",
        name: "Seed Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "seed_explosion_decal",
        name: "Seed Explosion Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "used_flare_decal",
        name: "Used Flare Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "used_flare_decal_halloween",
        name: "Used Flare Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "seed_explosion_decal_infected",
        name: "Infected Seed Explosion Decal",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "vomit_pool",
        name: "Vomit Pool",
        defType: "decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "vomit_pool_wtr",
        name: "Vomit Pool",
        defType: "decal",
        rotationMode: RotationMode.Full,
        alpha: 0.5,
        zIndex: ZIndexes.Ground,
        image: "vomit_pool"
    },
    ...HealingItems.definitions.map(healingItem => {
        return {
            idString: `${healingItem.idString}_residue`,
            name: `${healingItem.name} Residue`,
            defType: "decal",
            rotationMode: RotationMode.Full
        } as DecalDefinition;
    })
]);
