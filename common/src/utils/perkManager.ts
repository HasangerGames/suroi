import { Perks, type PerkDefinition } from "../definitions/items/perks";
import { makeSchemaManager, type SchemaCollection } from "./schemaManager";

export type PerkCollection = SchemaCollection<PerkDefinition>;
export const PerkManager = makeSchemaManager(Perks, "PerkManager", 0 as number);
export type PerkManager = InstanceType<typeof PerkManager>;
