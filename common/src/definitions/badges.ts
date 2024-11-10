import { createTemplate, ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly roles?: readonly string[]
}

const badge = createTemplate<BadgeDefinition>()((name: string, roles: string[] = []) => ({
    idString: `bdg_${name.toLowerCase().replace(/ /g, "_")}`,
    name,
    roles
}));

export const Badges = ObjectDefinitions.create<BadgeDefinition>("Badges", [
    badge(["Developr", ["developr", "pap", "error", "limenade"]]),
    badge(["Dev Managr", ["solstice"]]),
    badge(["Designr", ["designr"]]),
    badge(["Lead Designr", ["lead_designr"]]),
    badge(["VIP Designr", ["vip_designr"]]),
    badge(["Composr", ["composr"]]),
    badge(["Lead Composr", ["lead_composr"]]),
    badge(["Moderatr", ["moderatr"]]),
    badge(["Administratr", ["administratr", "error"]]),
    badge(["Youtubr", ["youtubr"]]),
    badge(["Boostr", ["boostr"]]),
    badge(["Ownr", ["hasanger"]]),
    badge(["Bleh"]),
    badge(["Froog"]),
    badge(["AEGIS Logo"]),
    badge(["Flint Logo"]),
    badge(["Duel"]),
    badge(["Suroi Logo"]),
    badge(["Fire"]),
    badge(["Colon Three"]),
    badge(["Suroi General Chat"])
]);
