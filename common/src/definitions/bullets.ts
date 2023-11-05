import { type BaseBulletDefinition, type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { Explosions } from "./explosions";
import { Guns } from "./guns";

export type BulletDefiniton = BaseBulletDefinition & ObjectDefinition;

const bulletColors: Record<string, number> = {
    "9mm": 0xffff80,
    "12g": 0xffc8c8,
    "556mm": 0x80ff80,
    "762mm": 0x80ffff,
    shrapnel: 0x1d1d1d
};

export const Bullets = new ObjectDefinitions<BulletDefiniton>([
    ...Guns,
    ...Explosions.definitions
].map(def => {
    let tracerColor = def.ballistics.tracer?.color;

    // if this bullet definition doesn't override the tracer color
    // calculate it based on ammo type or if its a shrapnel
    if (!tracerColor) {
        if ("ammoType" in def && def.ammoType in bulletColors) {
            tracerColor = bulletColors[def.ammoType];
        } else if (def.ballistics.shrapnel) {
            tracerColor = bulletColors.shrapnel;
        }
    }

    const bullet: BulletDefiniton = {
        idString: `${def.idString}_bullet`,
        name: `${def.name} Bullet`,
        ...def.ballistics,
        tracer: {
            color: tracerColor,
            ...def.ballistics.tracer
        }
    };

    return bullet;
}));
