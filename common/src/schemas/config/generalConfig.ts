import z from "zod";
import { ItemType, WeaponType } from "../../definitions/loots";
import { DefinitionType } from "../../utils/objectDefinitions";
import { GameMode } from "../misc";

export const GeneralConfig = z.object({
    tps: z.number(),
    gridSize: z.number(),
    maxPosition: z.number(),
    objectMinScale: z.number(),
    objectMaxScale: z.number(),
    defaultMode: GameMode,
    player: z.object({
        radius: z.number(),
        baseSpeed: z.number(),
        defaultHealth: z.number(),
        maxAdrenaline: z.number(),
        maxShield: z.number(),
        maxInfection: z.number(),
        inventorySlotTypings: z.array(DefinitionType),
        maxWeapons: z.number(),
        maxPerks: z.number(),
        nameMaxLength: z.number(),
        defaultName: z.string(),
        defaultSkin: z.string(),
        killLeaderMinKills: z.number(),
        killCreditTimeoutMs: z.number(),
        maxMouseDist: z.number(),
        reviveDurationMs: z.number(),
        reviveMaxDist: z.number(),
        knockedOutDamageAmount: z.number(),
        knockedOutDamageIntervalMs: z.number(),
        buildingVisionSize: z.number(),
        emoteLimit: z.object({
            triggerAmount: z.number(),
            triggerDurationMs: z.number(),
            punishmentDurationMs: z.number(),
        }),
        ice: z.object({
            acceleration: z.number(),
            friction: z.number(),
            movingFriction: z.number(),
        }),
    }).refine(({ inventorySlotTypings, maxWeapons }) => maxWeapons === inventorySlotTypings.length),
    gas: z.object({
        damageScaleFactor: z.number(),
        unscaledDamageDist: z.number(),
    }),
    loot: z.object({
        maxSpawnJitter: z.number(),
        drag: z.number(),
        iceDrag: z.number(),
        radius: z.record(ItemType, z.number()),
    }),
    defaultSpeedModifiers: z.record(WeaponType, z.number()),
    airdrop: z.object({
        fallTime: z.number(),
        flyTime: z.number(),
        damage: z.number(),
    }),
    projectiles: z.object({
        maxHeight: z.number(),
        gravity: z.number(),
        distanceToMouseMultiplier: z.number(),
        drag: z.object({
            air: z.number(),
            ground: z.number(),
            ice: z.number(),
            water: z.number(),
        }),
    }),
    explosionMaxDistSquared: z.number(),
    trailPadding: z.number(),
    explosionRayDistance: z.number(),
});
