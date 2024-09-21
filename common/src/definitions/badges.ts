import { createTemplate, ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly roles?: string[]
}

const badge = createTemplate<BadgeDefinition>()((name: string, roles: string[] = []) => ({
    idString: name.toLowerCase().replace(/ /g, "_"),
    name,
    roles
}));

export const Badges = new ObjectDefinitions<BadgeDefinition>([
    badge(["Youtubr", ["youtubr", "123op"]]),
    badge(["Developr", ["developr", "error"]]),
    badge(["Lead Designr", ["lead_designr"]]),
    badge(["VIP Designr", ["vip_designr"]]),
    badge(["Composr", ["composr"]]),
    badge(["Lead Composr", ["lead_composr"]]),
    badge(["Moderatr", ["moderatr"]]),
    badge(["Trial Moderatr", ["trial_moderatr"]]),
    badge(["Studio Managr", ["studio_managr"]]),
    badge(["Boostr", ["boostr"]]),
    badge(["Designr", ["designr"]]),
    badge(["Ownr", ["hasanger"]]),
    badge(["Contributr+", ["katie"]]),
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
