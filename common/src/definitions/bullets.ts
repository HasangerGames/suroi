import { defaultBulletTemplate } from "../constants";
import { Loots } from "../definitions/loots";
import { ItemType, ObjectDefinitions, type BaseBulletDefinition, type ObjectDefinition } from "../utils/objectDefinitions";
import { Explosions } from "./explosions";

export type BulletDefinition = BaseBulletDefinition & ObjectDefinition;

const bulletColors: Record<string, number> = {
    "9mm": 0xffff80,
    "12g": 0xffc8c8,
    "556mm": 0x80ff80,
    "762mm": 0x80ffff,
    "127mm": 0x408000,
    "shrapnel": 0x1d1d1d
};

export const Bullets = ObjectDefinitions.create<BulletDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => defaultBulletTemplate
    })
)(
    () => [
        ...Loots.byType(ItemType.Gun),
        ...Explosions.definitions
    ]
        .filter(def => !("isDual" in def) || !def.isDual)
        .map(def => {
            let tracerColor = def.ballistics.tracer.color;

            // if this bullet definition doesn't override the tracer color
            // calculate it based on ammo type or if it's shrapnel
            if (!tracerColor) {
                if ("ammoType" in def && def.ammoType in bulletColors) {
                    tracerColor = bulletColors[def.ammoType];
                } else if (def.ballistics.shrapnel) {
                    tracerColor = bulletColors.shrapnel;
                }
            }

            return {
                idString: `${def.idString}_bullet`,
                name: `${def.name} Bullet`,
                ...def.ballistics,
                tracer: {
                    color: tracerColor,
                    ...def.ballistics.tracer
                }
            };
        })
);
