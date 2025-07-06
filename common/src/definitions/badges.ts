import { DefinitionType, ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly defType: DefinitionType.Badge
    readonly roles?: readonly string[]
}

const badge = (name: string, roles?: string[]): BadgeDefinition => ({
    idString: `bdg_${name.toLowerCase().split(" ").join("_")}`,
    name,
    defType: DefinitionType.Badge,
    roles
});

export const Badges = new ObjectDefinitions<BadgeDefinition>([
    // Roles
    badge("Developr", ["developr", "pap"]),
    badge("Dev Managr", ["dev_managr"]),
    badge("Designr", ["designr"]),
    badge("VIP Designr", ["vip_designr"]),
    badge("Sound Designr", ["sound_designr"]),
    badge("Moderatr", ["moderatr"]),
    badge("Administratr", ["administratr"]),
    badge("Content Creatr", ["content_creatr"]),
    badge("Donatr", ["donatr"]),
    badge("Marketr", ["marketr"]),
    badge("Ownr", ["hasanger"]),

    // Player
    badge("Bleh"),
    badge("Froog"),
    badge("AEGIS Logo"),
    badge("Flint Logo"),
    badge("Duel"),
    badge("Suroi Logo"),
    badge("Fire"),
    badge("Colon Three"),
    badge("Suroi General Chat")
]);
