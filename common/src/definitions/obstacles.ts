import { ZIndexes } from "../constants";
import { type Variation } from "../typings";
import { CircleHitbox, HitboxGroup, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { MapObjectSpawnMode, ObjectDefinitions, ObstacleSpecialRoles, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { ContainerTints } from "./buildings";
import { type LootDefinition } from "./loots";

export type ObstacleDefinition = ObjectDefinition & {
    readonly material: typeof Materials[number]
    readonly health: number
    readonly indestructible?: boolean
    readonly impenetrable?: boolean
    readonly noResidue?: boolean
    readonly invisible?: boolean
    readonly hideOnMap?: boolean
    readonly scale?: {
        readonly spawnMin: number
        readonly spawnMax: number
        readonly destroy: number
    }
    readonly hitbox: Hitbox
    readonly spawnHitbox?: Hitbox
    readonly noCollisions?: boolean
    readonly rotationMode: RotationMode
    readonly variations?: Exclude<Variation, 0>
    readonly particleVariations?: number
    readonly zIndex?: number
    readonly hasLoot?: boolean
    readonly spawnWithLoot?: boolean
    readonly explosion?: string
    readonly noMeleeCollision?: boolean
    readonly noBulletCollision?: boolean
    readonly reflectBullets?: boolean

    readonly frames?: {
        readonly base?: string
        readonly particle?: string
        readonly residue?: string
        readonly opened?: string
        readonly activated?: string
    }

    readonly imageAnchor?: Vector

    readonly spawnMode?: MapObjectSpawnMode

    readonly tint?: number
} & (({
    readonly role: ObstacleSpecialRoles.Door
    readonly locked?: boolean
    readonly openOnce?: boolean
    readonly animationDuration?: number
    readonly doorSound?: string
} & ({
    readonly operationStyle?: "swivel"
    readonly hingeOffset: Vector
} | {
    readonly operationStyle: "slide"
    /**
     * Determines how much the door slides. 1 means it'll be displaced by its entire width,
     * 0.5 means it'll be displaced by half its width, etc
     */
    readonly slideFactor?: number
})) | {
    readonly role: ObstacleSpecialRoles.Activatable
    readonly sound?: ({ readonly name: string } | { readonly names: string[] }) & {
        readonly maxRange?: number
        readonly fallOff?: number
    }
    readonly requiredItem?: ReferenceTo<LootDefinition>
    readonly interactText?: string
    readonly emitParticles?: boolean
    readonly replaceWith?: {
        readonly idString: Record<ReferenceTo<ObstacleDefinition>, number> | ReferenceTo<ObstacleDefinition>
        readonly delay: number
    }
} | {
    readonly role?: ObstacleSpecialRoles.Wall | ObstacleSpecialRoles.Window
});

export const Materials = [
    "tree",
    "stone",
    "bush",
    "crate",
    "metal",
    "wood",
    "pumpkin",
    "glass",
    "porcelain",
    "cardboard",
    "appliance",
    "large_refinery_barrel",
    "sand"
] as const;

export enum RotationMode {
    /**
     * Allows rotation in any direction (within the limits of the bit stream's encoding capabilities)
     */
    Full,
    /**
     * Allows rotation in the four cardinal directions: up, right, down and left
     */
    Limited,
    /**
     * Allows rotation in two directions: a "normal" direction and a "flipped" direction; for example,
     * up and down, or left and right
     */
    Binary,
    /**
     * Disabled rotation
     */
    None
}

function makeCrate(idString: string, name: string, options: Partial<ObstacleDefinition>): ObstacleDefinition {
    const definition: Partial<ObstacleDefinition> = {
        idString,
        name,
        material: "crate",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(9.2, 9.2),
        hasLoot: true,
        ...options
    };
    return definition as ObstacleDefinition;
}

function makeHouseWall(lengthNumber: string, hitbox: Hitbox): ObstacleDefinition {
    return {
        idString: `house_wall_${lengthNumber}`,
        name: `House Wall ${lengthNumber}`,
        material: "wood",
        noResidue: true,
        health: 120,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "wall_particle"
        },
        role: ObstacleSpecialRoles.Wall
    };
}

function makeConcreteWall(idString: string, name: string, hitbox: Hitbox, indestructible?: boolean, variations?: Exclude<Variation, 0>): ObstacleDefinition {
    return {
        idString,
        name,
        material: "stone",
        health: 500,
        indestructible,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox,
        rotationMode: RotationMode.Limited,
        role: ObstacleSpecialRoles.Wall,
        particleVariations: 2,
        variations,
        frames: {
            particle: "rock_particle"
        }
    };
}

function makeContainerWalls(id: number, style: "open2" | "open1" | "closed", tint?: number): ObstacleDefinition {
    let hitbox: Hitbox;
    switch (style) {
        case "open2":
            hitbox = new HitboxGroup(
                RectangleHitbox.fromRect(1.85, 28, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, Vec.create(-6.1, 0))
            );
            break;
        case "open1":
            hitbox = new HitboxGroup(
                RectangleHitbox.fromRect(1.85, 28, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, Vec.create(-6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec.create(0, -13.04))
            );
            break;
        case "closed":
        default:
            hitbox = RectangleHitbox.fromRect(14, 28);
            break;
    }
    const invisible = style === "closed";
    return {
        idString: `container_walls_${id}`,
        name: `Container Walls ${id}`,
        material: "metal",
        health: 500,
        indestructible: true,
        noResidue: true,
        hideOnMap: invisible || undefined,
        invisible: invisible || undefined,
        hitbox,
        rotationMode: RotationMode.Limited,
        role: ObstacleSpecialRoles.Wall,
        reflectBullets: true,
        zIndex: ZIndexes.BuildingsFloor + 1,
        frames: {
            base: invisible ? undefined : `container_walls_${style}`,
            particle: "metal_particle"
        },
        tint
    };
}

function makeGunMount(idString: string, name: string, hitbox?: Hitbox): ObstacleDefinition {
    return {
        idString,
        name,
        material: "wood",
        health: 60,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hasLoot: true,
        hitbox: hitbox ?? new HitboxGroup(
            RectangleHitbox.fromRect(8.2, 0.95, Vec.create(0, -1.32)), // Base
            RectangleHitbox.fromRect(0.75, 2.75, Vec.create(0, 0.48)), // Center post
            RectangleHitbox.fromRect(0.75, 2.75, Vec.create(-3.11, 0.48)), // Left post
            RectangleHitbox.fromRect(0.75, 2.75, Vec.create(3.17, 0.48)) // Right post
        ),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "furniture_particle",
            residue: "gun_mount_residue"
        }
    };
}

export const Obstacles = new ObjectDefinitions<ObstacleDefinition>(
    [
        {
            idString: "oak_tree",
            name: "Oak Tree",
            material: "tree",
            health: 180,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(5.5),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            variations: 3,
            zIndex: ZIndexes.ObstaclesLayer4
        },
        {
            idString: "pine_tree",
            name: "Pine Tree",
            material: "tree",
            health: 180,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(7),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            zIndex: ZIndexes.ObstaclesLayer4
        },
        {
            idString: "birch_tree",
            name: "Birch Tree",
            material: "tree",
            health: 240,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(5.5),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            zIndex: ZIndexes.ObstaclesLayer4
        },
        {
            idString: "christmas_tree",
            name: "Christmas Tree",
            material: "tree",
            health: 720,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(10),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            zIndex: ZIndexes.ObstaclesLayer4,
            hasLoot: true
        },
        {
            idString: "rock",
            name: "Rock",
            material: "stone",
            health: 200,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.5
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: new CircleHitbox(4),
            spawnHitbox: new CircleHitbox(4.5),
            rotationMode: RotationMode.Full,
            variations: 7,
            particleVariations: 2
        },
        {
            idString: "pumpkin",
            name: "Pumpkin",
            material: "pumpkin",
            health: 100,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(2.4),
            spawnHitbox: new CircleHitbox(3),
            rotationMode: RotationMode.Full,
            hasLoot: true
        },
        {
            idString: "flint_stone",
            name: "Flint Stone",
            material: "stone",
            health: 200,
            impenetrable: true,
            hasLoot: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: RectangleHitbox.fromRect(6.1, 6.1),
            rotationMode: RotationMode.None,
            particleVariations: 2
        },
        {
            idString: "bush",
            name: "Bush",
            material: "bush",
            health: 80,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(4.2),
            noCollisions: true,
            rotationMode: RotationMode.Full,
            particleVariations: 2,
            zIndex: ZIndexes.ObstaclesLayer3
        },
        {
            idString: "blueberry_bush",
            name: "Blueberry Bush",
            material: "bush",
            health: 80,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(4.2),
            noCollisions: true,
            rotationMode: RotationMode.Full,
            particleVariations: 2,
            zIndex: ZIndexes.ObstaclesLayer3,
            spawnWithLoot: true,
            frames: {
                particle: "bush_particle",
                residue: "bush_residue"
            }
        },
        makeCrate("regular_crate", "Regular Crate", {
            rotationMode: RotationMode.Binary,
            frames: {
                particle: "crate_particle",
                residue: "regular_crate_residue"
            }
        }),
        makeCrate("flint_crate", "Flint Crate", {
            rotationMode: RotationMode.None,
            hideOnMap: true
        }),
        makeCrate("aegis_crate", "AEGIS Crate", {
            rotationMode: RotationMode.None,
            hideOnMap: true
        }),
        makeCrate("grenade_crate", "Grenade Crate", {
            hitbox: RectangleHitbox.fromRect(6.5, 6.3),
            rotationMode: RotationMode.None,
            hideOnMap: true
        }),
        {
            idString: "melee_crate",
            name: "Melee Crate",
            material: "crate",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.6
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: RectangleHitbox.fromRect(6.1, 6.1),
            rotationMode: RotationMode.None,
            hasLoot: true,
            frames: {
                particle: "crate_particle",
                residue: "regular_crate_residue"
            }
        },
        {
            idString: "ammo_crate",
            name: "Ammo Crate",
            material: "cardboard",
            health: 160,
            impenetrable: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.6
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: RectangleHitbox.fromRect(8.5, 8.5),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "crate_particle"
            }
        },
        {
            idString: "tear_gas_crate",
            name: "Tear Gas Crate",
            material: "crate",
            health: 1000,
            indestructible: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.6
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: RectangleHitbox.fromRect(9.15, 6.3),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "crate_particle"
            }
        },
        {
            idString: "barrel",
            name: "Barrel",
            material: "metal",
            health: 160,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,

            hitbox: new CircleHitbox(3.65),
            rotationMode: RotationMode.Full,
            explosion: "barrel_explosion",
            reflectBullets: true
        },
        {
            idString: "super_barrel",
            name: "Super Barrel",
            material: "metal",
            health: 240,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: new CircleHitbox(3.65),
            rotationMode: RotationMode.Full,
            explosion: "super_barrel_explosion",
            reflectBullets: true
        },
        {
            idString: "oil_tank",
            name: "Oil Tank",
            material: "metal",
            health: 1000,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(16.8, 13.6),
                RectangleHitbox.fromRect(26, 2),
                new CircleHitbox(5, Vec.create(-8, 1.8)),
                new CircleHitbox(5, Vec.create(-8, -1.8)),
                new CircleHitbox(5, Vec.create(8, 1.8)),
                new CircleHitbox(5, Vec.create(8, -1.8))
            ),
            spawnHitbox: RectangleHitbox.fromRect(28, 18),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "small_bridge",
            name: "Small Bridge",
            material: "wood",
            health: 1000,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(44, 2, Vec.create(0, 6)),
                RectangleHitbox.fromRect(44, 2, Vec.create(0, -6)),
                new CircleHitbox(1.3, Vec.create(-22, 6.6)),
                new CircleHitbox(1.3, Vec.create(-10.09, 6.6)),
                new CircleHitbox(1.3, Vec.create(0.1, 6.6)),
                new CircleHitbox(1.3, Vec.create(10.30, 6.6)),
                new CircleHitbox(1.3, Vec.create(22, 6.6)),
                new CircleHitbox(1.3, Vec.create(-22, -6.7)),
                new CircleHitbox(1.3, Vec.create(-10.09, -6.7)),
                new CircleHitbox(1.3, Vec.create(0.1, -6.7)),
                new CircleHitbox(1.3, Vec.create(10.30, -6.7)),
                new CircleHitbox(1.3, Vec.create(22, -6.7))
            ),
            spawnHitbox: RectangleHitbox.fromRect(28, 18),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "wall_particle"
            },
            noBulletCollision: true,
            spawnMode: MapObjectSpawnMode.River
        },
        {
            idString: "airdrop_crate_locked",
            name: "Airdrop",
            material: "metal",
            health: 10000,
            indestructible: true,
            reflectBullets: true,
            hitbox: RectangleHitbox.fromRect(8.7, 8.7),
            spawnHitbox: RectangleHitbox.fromRect(10, 10),
            rotationMode: RotationMode.None,
            hideOnMap: true,
            role: ObstacleSpecialRoles.Activatable,
            zIndex: ZIndexes.ObstaclesLayer2,
            interactText: "Open",
            sound: {
                name: "airdrop_unlock",
                maxRange: 64,
                fallOff: 0.3
            },
            replaceWith: {
                idString: { airdrop_crate: 0.95, gold_airdrop_crate: 0.05 },
                delay: 800
            },
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "airdrop_crate",
            name: "Airdrop Crate",
            material: "crate",
            health: 150,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(8.7, 8.7)
            ),
            spawnHitbox: RectangleHitbox.fromRect(10, 10),
            hideOnMap: true,
            rotationMode: RotationMode.None,
            hasLoot: true
        },
        {
            idString: "gold_airdrop_crate",
            name: "Gold Airdrop Crate",
            material: "crate",
            health: 170,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(8.7, 8.7)
            ),
            spawnHitbox: RectangleHitbox.fromRect(10, 10),
            rotationMode: RotationMode.None,
            hideOnMap: true,
            hasLoot: true,
            frames: {
                particle: "airdrop_crate_particle"
            }
        },
        {
            idString: "gold_rock",
            name: "Gold Rock",
            material: "stone",
            hideOnMap: true,
            health: 250,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.3
            },
            hitbox: new CircleHitbox(4),
            spawnHitbox: new CircleHitbox(4.5),
            rotationMode: RotationMode.Full,
            hasLoot: true
        },
        {
            idString: "warehouse_walls",
            name: "Warehouse Wall",
            material: "metal",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1.7, 70.6),
                RectangleHitbox.fromRect(12, 1.7, Vec.create(5.5, -34.5)),
                RectangleHitbox.fromRect(12, 1.7, Vec.create(5.5, 34.5))
            ),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            noResidue: true,
            invisible: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "box",
            name: "Box",
            material: "cardboard",
            health: 60,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(4.4, 4.4),
            rotationMode: RotationMode.Limited,
            variations: 3,
            zIndex: ZIndexes.ObstaclesLayer2,
            hasLoot: true
        },
        {
            idString: "metal_shelf",
            name: "Metal Shelf",
            material: "metal",
            health: 1000,
            indestructible: true,
            noMeleeCollision: true,
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(25.5, 6.6),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer1 - 3,
            reflectBullets: true
        },
        makeHouseWall("1", RectangleHitbox.fromRect(9, 2)),
        makeHouseWall("2", RectangleHitbox.fromRect(20.86, 2)),
        makeHouseWall("3", RectangleHitbox.fromRect(11.4, 2)),
        makeHouseWall("4", RectangleHitbox.fromRect(21.4, 2)),
        makeHouseWall("5", RectangleHitbox.fromRect(16, 2)),
        {
            idString: "fridge",
            name: "Fridge",
            material: "appliance",
            health: 140,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hasLoot: true,
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.45)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "stove",
            name: "Stove",
            material: "metal",
            health: 140,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.45)),
            rotationMode: RotationMode.Limited,
            explosion: "stove_explosion",
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "washing_machine",
            name: "Washing Machine",
            material: "appliance",
            health: 140,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hasLoot: true,
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.45)),
            rotationMode: RotationMode.Limited,
            reflectBullets: true
        },
        {
            idString: "house_exterior",
            name: "House Exterior",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            hitbox: new HitboxGroup(
                // Comments assume the building is not rotated (rotation = 0)
                RectangleHitbox.fromRect(14.33, 2, Vec.create(-41.16, -34.15)), // First Topmost wall
                RectangleHitbox.fromRect(17, 2, Vec.create(-15, -34.15)), // Topmost wall after the first window
                RectangleHitbox.fromRect(44.33, 2, Vec.create(26.16, -34.15)), // Topmost wall after the second window
                RectangleHitbox.fromRect(2, 22.3, Vec.create(12.88, -22.05)), // Wall coming off of topmost wall
                RectangleHitbox.fromRect(2, 42.68, Vec.create(47.36, -11.86)), // Rightmost wall
                RectangleHitbox.fromRect(5.38, 2, Vec.create(43.74, 8.53)), // Short wall coming off of rightmost wall
                RectangleHitbox.fromRect(5.51, 2, Vec.create(16.62, 8.54)), // Short wall to the left of the previous one
                RectangleHitbox.fromRect(2, 22.7, Vec.create(12.88, 10.15)), // Wall coming off of the longer bottommost wall
                RectangleHitbox.fromRect(40.06, 2, Vec.create(-6.17, 22.54)), // Longer bottommost wall
                RectangleHitbox.fromRect(12.08, 2, Vec.create(-42.29, 22.54)), // Shorter bottommost wall
                RectangleHitbox.fromRect(2, 22.2, Vec.create(-47.36, -22.1)), // Leftmost wall until left window
                RectangleHitbox.fromRect(2, 24, Vec.create(-47.36, 11.5)), // Leftmost wall after the window

                RectangleHitbox.fromRect(3.25, 3.25, Vec.create(-40.27, 33.56)), // Left post
                RectangleHitbox.fromRect(3.25, 3.25, Vec.create(-22.48, 33.56)) // Right post
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "wall_particle"
            }
        },
        {
            idString: "door",
            name: "Door",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            hitbox: RectangleHitbox.fromRect(10.15, 1.6, Vec.create(-0.44, 0)),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            role: ObstacleSpecialRoles.Door,
            hingeOffset: Vec.create(-5.5, 0),
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "vault_door",
            name: "Vault Door",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hitbox: RectangleHitbox.fromRect(14.2, 1.9, Vec.create(1.1, -0.4)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Door,
            locked: true,
            openOnce: true,
            doorSound: "vault_door",
            animationDuration: 2000,
            hingeOffset: Vec.create(-6.1, -0.8),
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "toilet",
            name: "Toilet",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(2.5),
            // TODO Figure out why this doesn't work
            /* hitbox: new HitboxGroup([
                RectangleHitbox.fromRect(v(-3.18, 1.25), v(3.2, 4.05)),
                new CircleHitbox(2.5)
            ]), */
            rotationMode: RotationMode.Limited,
            hasLoot: true
        },
        {
            idString: "used_toilet",
            name: "Used Toilet",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(2.5),
            // TODO Figure out why this doesn't work
            /* hitbox: new HitboxGroup([
                RectangleHitbox.fromRect(v(-3.18, 1.25), v(3.2, 4.05)),
                new CircleHitbox(2.5)
            ]), */
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "toilet_particle",
                residue: "toilet_residue"
            }
        },
        {
            idString: "small_drawer",
            name: "Small Drawer",
            material: "wood",
            health: 80,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(6.2, 6, Vec.create(0, -0.5)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "large_drawer",
            name: "Large Drawer",
            material: "wood",
            health: 80,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12.5, 6, Vec.create(0, -0.5)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "couch",
            name: "Couch",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(7, 15.8, Vec.create(-0.2, 0)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "tv",
            name: "TV",
            material: "glass",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(1.1, 15.1, Vec.create(-0.25, 0)),
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer2,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "table",
            name: "Table",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(8.3, 12.2),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer3,
            noCollisions: true
        },
        {
            idString: "chair",
            name: "Chair",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(6.8, 6.7, Vec.create(0, 0)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "bookshelf",
            name: "Bookshelf",
            material: "wood",
            health: 80,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hideOnMap: true,
            variations: 2,
            hitbox: RectangleHitbox.fromRect(12.49, 4.24),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "window",
            name: "Window",
            material: "glass",
            health: 20,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(1.8, 9.4),
            zIndex: ZIndexes.ObstaclesLayer2,
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Window
        },
        {
            idString: "ship_cabin_window",
            name: "Ship Cabin Window",
            material: "glass",
            health: 20,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: RectangleHitbox.fromRect(1.8, 9.4),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Window
        },
        {
            idString: "bed",
            name: "Bed",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(11.2, 16),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "bunk_bed",
            name: "Bunk Bed",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(8.2, 15.6, Vec.create(0.4, 0)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "garage_door",
            name: "Garage Door",
            material: "wood",
            health: 200,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(21.7, 1.5, Vec.create(0, -0.4)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "porta_potty_toilet_open",
            name: "Porta Potty Toilet Open",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12.13, 4.3, Vec.create(0.02, -1.05)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "porta_potty_toilet_particle",
                residue: "porta_potty_toilet_residue"
            }
        },
        {
            idString: "porta_potty_toilet_closed",
            name: "Porta Potty Toilet Closed",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12, 4.3, Vec.create(0, -1.05)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "porta_potty_toilet_particle",
                residue: "porta_potty_toilet_residue"
            }
        },
        {
            idString: "porta_potty_back_wall",
            name: "Porta Potty Back Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12.8, 1.6, Vec.create(0, 0)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "porta_potty_door",
            name: "Porta Potty Door",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(9.2, 1.4, Vec.create(-0.8, 0)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Door,
            hingeOffset: Vec.create(-5.5, 0)
        },
        {
            idString: "porta_potty_front_wall",
            name: "Porta Potty Front Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(3, 1.6),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "porta_potty_sink_wall",
            name: "Porta Potty Sink Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(19.2, 1.9, Vec.create(0, 1.25)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            zIndex: ZIndexes.ObstaclesLayer2,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "porta_potty_toilet_paper_wall",
            name: "Porta Potty Toilet Paper Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(19.2, 1.7, Vec.create(0, -1.15)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            zIndex: ZIndexes.ObstaclesLayer2,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        makeConcreteWall(
            "concrete_wall_end",
            "Concrete Wall End",
            RectangleHitbox.fromRect(2.4, 2),
            true
        ),
        makeConcreteWall(
            "concrete_wall_end_broken",
            "Concrete Wall End Broken",
            RectangleHitbox.fromRect(2.4, 2),
            true,
            2
        ),
        makeConcreteWall(
            "concrete_wall_segment",
            "Concrete Wall Segment",
            RectangleHitbox.fromRect(16, 2),
            true
        ),
        makeConcreteWall(
            "concrete_wall_segment_long",
            "Concrete Wall Segment Long",
            RectangleHitbox.fromRect(32, 2),
            true
        ),
        makeConcreteWall(
            "concrete_wall_corner",
            "Concrete Wall Corner",
            RectangleHitbox.fromRect(2, 2),
            true
        ),
        makeConcreteWall(
            "inner_concrete_wall_1",
            "Inner Concrete Wall 1",
            RectangleHitbox.fromRect(10.8, 1.9)
        ),
        makeConcreteWall(
            "inner_concrete_wall_2",
            "Inner Concrete Wall 2",
            RectangleHitbox.fromRect(36.7, 1.9)
        ),
        makeConcreteWall(
            "inner_concrete_wall_3",
            "Inner Concrete Wall 3",
            RectangleHitbox.fromRect(39.14, 1.9)
        ),
        makeConcreteWall(
            "inner_concrete_wall_4",
            "Inner Concrete Wall 4",
            RectangleHitbox.fromRect(47.14, 1.9)
        ),
        {
            idString: "refinery_walls",
            name: "Refinery Walls",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(57, 1.8, Vec.create(-22, -36.1)), // First topmost wall
                RectangleHitbox.fromRect(30.75, 1.8, Vec.create(35.38, -36.1)), // Wall after the hole
                RectangleHitbox.fromRect(2, 33.5, Vec.create(49.75, -22.25)), // Wall from top right to bottom right
                RectangleHitbox.fromRect(16.25, 2.05, Vec.create(42.63, -6.53)), // Wall to the right of the entrance
                RectangleHitbox.fromRect(38.5, 2.05, Vec.create(2.25, -6.53)), // Wall to the left of the entrance
                RectangleHitbox.fromRect(2, 21.55, Vec.create(-16, 3.23)), // Wall on top of the window
                RectangleHitbox.fromRect(2, 13.5, Vec.create(-16, 30.25)), // Wall bellow the window
                RectangleHitbox.fromRect(35.5, 2, Vec.create(-32.75, 36.25)), // Bottommost wall
                RectangleHitbox.fromRect(2, 74, Vec.create(-49.5, 0)), // Wall from topmost to bottommost
                RectangleHitbox.fromRect(13.3, 2, Vec.create(-43.35, 9)), // inner door walls
                RectangleHitbox.fromRect(10.5, 2, Vec.create(-21.25, 9))
            ),
            rotationMode: RotationMode.Limited,
            particleVariations: 2,
            noResidue: true,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "small_refinery_barrel",
            name: "Small Refinery Barrel",
            material: "metal",
            health: 250,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(6.8),
            rotationMode: RotationMode.Full,
            explosion: "small_refinery_barrel_explosion",
            reflectBullets: true,
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "large_refinery_barrel",
            name: "Large Refinery Barrel",
            material: "large_refinery_barrel",
            health: 3500,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(17.15),
            rotationMode: RotationMode.Full,
            explosion: "large_refinery_barrel_explosion",
            reflectBullets: true,
            zIndex: ZIndexes.ObstaclesLayer5,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "large_oil_tank",
            name: "Large Oil Tank",
            material: "large_refinery_barrel",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(28),
            rotationMode: RotationMode.Full,
            zIndex: ZIndexes.ObstaclesLayer1,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "smokestack",
            name: "Smokestack",
            material: "metal",
            health: 500,
            indestructible: true,
            hitbox: new CircleHitbox(8.9),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            zIndex: ZIndexes.ObstaclesLayer5,
            noResidue: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "distillation_column",
            name: "Distillation Column",
            material: "metal",
            health: 500,
            indestructible: true,
            hitbox: new HitboxGroup(
                new CircleHitbox(5.22, Vec.create(0, -0.65)),
                new CircleHitbox(4.9, Vec.create(0, 0.9))
            ),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            zIndex: ZIndexes.ObstaclesLayer5,
            noResidue: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "distillation_equipment",
            name: "Distillation Equipment",
            material: "metal",
            health: 500,
            indestructible: true,
            hitbox: new HitboxGroup(
                new CircleHitbox(3, Vec.create(-11.3, -3.85)), // Main tank rounded corners
                new CircleHitbox(3, Vec.create(-11.3, -6.55)),
                RectangleHitbox.fromRect(17.5, 3.5, Vec.create(-5.55, -5.25)),
                RectangleHitbox.fromRect(14.2, 8.5, Vec.create(-3.9, -5.15)), // Main tank
                new CircleHitbox(3.15, Vec.create(0.72, 5.62)), // Bottom left circle
                new CircleHitbox(4.4, Vec.create(8.95, 5.62)), // Bottom right circle
                new CircleHitbox(5.35, Vec.create(8.95, -4.7)), // Top circle
                RectangleHitbox.fromRect(1.8, 3.7, Vec.create(0.65, 0.85)), // Pipe connected to bottom left circle
                RectangleHitbox.fromRect(2.6, 1.2, Vec.create(8.95, 1)), // Pipe between 2 rightmost circles
                RectangleHitbox.fromRect(1.6, 1.75, Vec.create(4.2, 5.53)), // Pipe between 2 bottommost circles
                RectangleHitbox.fromRect(1.9, -2.6, Vec.create(4.05, -6.65)) // Pipe connected to topmost circle
            ),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            noResidue: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        makeGunMount("gun_mount_mcx_spear", "Gun Mount MCX Spear"),
        makeGunMount("gun_mount_stoner_63", "Gun Mount Stoner 63"),
        makeGunMount("gun_mount_maul", "Gun Mount Maul", new HitboxGroup(
            RectangleHitbox.fromRect(5.05, 1, Vec.create(0, -1.3)),
            RectangleHitbox.fromRect(0.8, 3, Vec.create(-1.55, 0.35)),
            RectangleHitbox.fromRect(0.8, 3, Vec.create(1.55, 0.35))
        )),
        {
            idString: "small_house_exterior",
            name: "Small House Exterior",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            hitbox: new HitboxGroup(
                // Right walls
                RectangleHitbox.fromRect(2, 9, Vec.create(-31, 26)),
                RectangleHitbox.fromRect(2, 22, Vec.create(-31, 0.2)),
                RectangleHitbox.fromRect(2, 9.8, Vec.create(-31, -25)),

                // Top walls
                RectangleHitbox.fromRect(19.8, 2, Vec.create(22, 29.5)),
                RectangleHitbox.fromRect(8.2, 2, Vec.create(-26.00, 29.5)),
                RectangleHitbox.fromRect(14, 2, Vec.create(-4.6, 29.5)),

                // Left Wall
                RectangleHitbox.fromRect(2, 32, Vec.create(30.9, 13.5)),
                RectangleHitbox.fromRect(2, 16, Vec.create(30.9, -20.5)),

                RectangleHitbox.fromRect(12.3, 2, Vec.create(25.8, -28.9)), // Bottom Left Wall
                RectangleHitbox.fromRect(39.4, 2, Vec.create(-10.45, -28.9)) // Bottom Right Wall
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "wall_particle"
            }
        },
        {
            idString: "truck",
            name: "Truck",
            material: "metal",
            health: 1000,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(20.25, 2.15, Vec.create(0, 25.1)), // Front bumper
                RectangleHitbox.fromRect(18.96, 9.2, Vec.create(0, 19.4)), // Hood
                RectangleHitbox.fromRect(16.7, 23.5, Vec.create(0, 3)), // Cab
                RectangleHitbox.fromRect(4.75, 15.9, Vec.create(0, -16.65)), // Fifth wheel
                RectangleHitbox.fromRect(17, 6.9, Vec.create(0, -13.2)), // Front-most back wheels
                RectangleHitbox.fromRect(17, 6.9, Vec.create(0, -20.7)), // Rearmost back wheels
                RectangleHitbox.fromRect(16.55, 1.6, Vec.create(0, -25.35)) // Rear bumper
            ),
            reflectBullets: true,
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "trailer",
            name: "Trailer",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(14.9, 44.7, Vec.create(-0.05, 0)), // Body
                RectangleHitbox.fromRect(15.9, 6.4, Vec.create(0, -11.2)), // Front-most back wheels
                RectangleHitbox.fromRect(15.9, 6.4, Vec.create(0, -18.2)), // Rearmost back wheels
                RectangleHitbox.fromRect(15.5, 1.5, Vec.create(0, -22.5)), // Rear bumper
                RectangleHitbox.fromRect(9.75, 1, Vec.create(-0.05, 22.75)) // Front part (idk)
            ),
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer4,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "tango_crate",
            name: "Tango crate",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(15, 6.5),
            rotationMode: RotationMode.Limited,
            hasLoot: true
        },
        {
            idString: "panel_with_a_button",
            name: "Control Panel",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(11, 8),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            role: ObstacleSpecialRoles.Activatable,
            interactText: "Activate",
            replaceWith: {
                idString: "panel_with_the_button_pressed",
                delay: 0
            },
            sound: {
                names: ["button_press", "puzzle_solved"]
            },
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "panel_with_the_button_pressed",
            name: "Panel with the button pressed",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(11, 8),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "panel_without_button",
            name: "Panel without button",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(11, 8),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "panel_without_button_small",
            name: "Panel without button small",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(7.5, 8),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "crane_base_end",
            name: "Crane Base End",
            material: "metal",
            health: 10000,
            indestructible: true,
            zIndex: ZIndexes.BuildingsFloor,
            hitbox: RectangleHitbox.fromRect(4.5, 1.8),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "crane_base_part",
            name: "Crane Base Part",
            material: "metal",
            health: 10000,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(6.1, 15.5, Vec.create(0, 0)), // Middle big rectangle
                RectangleHitbox.fromRect(5.3, 6, Vec.create(0, 10.97)), // Top small rectangle
                RectangleHitbox.fromRect(4.2, 1.8, Vec.create(0, 14.8)), // Top wheels
                RectangleHitbox.fromRect(5.3, 6, Vec.create(0, -10.97)), // Bottom small rectangle
                RectangleHitbox.fromRect(4.2, 1.8, Vec.create(0, -14.8)) // Bottom wheels
            ),
            zIndex: ZIndexes.ObstaclesLayer4,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "crane_base",
            name: "crane base",
            material: "metal",
            health: 10000,
            indestructible: true,
            invisible: true,
            hitbox: new HitboxGroup(
                // Bottom Bottom left
                RectangleHitbox.fromRect(6, 15.5, Vec.create(-29.6, 77.7 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, 66.7 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, 62.9 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, 62.8 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, 88.6 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, 92.6 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, 92.6 + 0.6)), // Bottom Wheels

                // Top Bottom left
                RectangleHitbox.fromRect(6, 15.5, Vec.create(-29.6, 29.5 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, 18.5 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, 40.4 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, 44.4 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, 44.4 + 0.6)), // Bottom Wheels

                // Bottom Bottom Right
                RectangleHitbox.fromRect(6, 15.5, Vec.create(29.6, 77.7 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, 66.7 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, 62.9 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, 62.8 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, 88.6 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, 92.6 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, 92.6 + 0.6)), // Bottom Wheels

                // Top Bottom Right
                RectangleHitbox.fromRect(6, 15.5, Vec.create(29.6, 29.5 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, 18.5 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, 40.4 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, 44.4 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, 44.4 + 0.6)), // Bottom Wheels

                // Bottom Top left
                RectangleHitbox.fromRect(6, 15.5, Vec.create(-29.6, -82.2 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, -71.2 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, -67.4 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, -67.3 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, -93.1 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, -97.1 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, -97.1 + 0.6)), // Bottom Wheels

                // Top Top left
                RectangleHitbox.fromRect(6, 15.5, Vec.create(-29.6, -34 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, -23 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(-29.6, -44.9 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-30.8, -48.9 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(-28.5, -48.9 + 0.6)), // Bottom Wheels

                // Bottom Top Right
                RectangleHitbox.fromRect(6, 15.5, Vec.create(29.6, -82.2 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, -71.2 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, -67.4 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, -67.3 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, -93.1 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, -97.1 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, -97.1 + 0.6)), // Bottom Wheels

                // Top Top Right
                RectangleHitbox.fromRect(6, 15.5, Vec.create(29.6, -34 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, -23 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, Vec.create(29.6, -44.9 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, Vec.create(30.8, -48.9 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, Vec.create(28.5, -48.9 + 0.6)), // Bottom Wheels

                RectangleHitbox.fromRect(4.3, 1.8, Vec.create(29.6, -99.5)),
                RectangleHitbox.fromRect(4.3, 1.8, Vec.create(-29.6, -99.5)),

                RectangleHitbox.fromRect(4.3, 1.8, Vec.create(29.6, 99.5)),
                RectangleHitbox.fromRect(4.3, 1.8, Vec.create(-29.6, 99.5)) // Top Wheels

            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "generator",
            name: "Generator",
            material: "metal",
            health: 200,
            indestructible: true,
            reflectBullets: true,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            role: ObstacleSpecialRoles.Activatable,
            sound: {
                name: "generator_starting",
                maxRange: 412,
                fallOff: 2
            },
            emitParticles: true,
            requiredItem: "gas_can",
            interactText: "Activate",
            hitbox: RectangleHitbox.fromRect(9, 7)
        },
        {
            idString: "ship_thing_1",
            name: "Ship thing 1 lol",
            material: "metal",
            health: 200,
            indestructible: true,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(12, 25)
        },
        {
            idString: "ship",
            name: "Ship",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            invisible: true,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1, 220, Vec.create(48, -20)), // Right wall

                RectangleHitbox.fromRect(1, 66, Vec.create(-31, 4.8)), // Left wall (middle)
                RectangleHitbox.fromRect(1, 40, Vec.create(-31, 69)), // Left wall (bottom)
                RectangleHitbox.fromRect(1, 90, Vec.create(-31, -85)), // Left wall (top)

                RectangleHitbox.fromRect(32.2, 2, Vec.create(31.7, 81.6)), // bottom
                RectangleHitbox.fromRect(33, 2, Vec.create(-14.8, 81.6)), // bottom
                RectangleHitbox.fromRect(80, 1, Vec.create(8, -128)), // top

                // Captain's cabin
                RectangleHitbox.fromRect(46, 2, Vec.create(9, -90.2)), // top
                RectangleHitbox.fromRect(2, 38.6, Vec.create(-22.8, -70.2)), // left
                RectangleHitbox.fromRect(2, 24, Vec.create(-13.1, -79.2)),
                RectangleHitbox.fromRect(2, 9.9, Vec.create(31.1, -86.3)), // right
                RectangleHitbox.fromRect(2, 20.2, Vec.create(31.1, -61)),
                RectangleHitbox.fromRect(10, 2, Vec.create(36, -82.3)),
                RectangleHitbox.fromRect(2, 32.4, Vec.create(40.5, -67)),

                RectangleHitbox.fromRect(55, 2, Vec.create(4.4, -51.8)), // bottom

                // Tango room bottom walls
                RectangleHitbox.fromRect(60, 2, Vec.create(8, 104.5)),
                RectangleHitbox.fromRect(2, 30, Vec.create(-18, 96)),
                RectangleHitbox.fromRect(2, 30, Vec.create(35, 96)),

                // bottom hitboxes
                // HACK: refactor when we support collision with polygon hitboxes
                new CircleHitbox(12, Vec.create(8, 118)),
                ...Array.from({ length: 2 }, (_, i) => {
                    const a = i === 0 ? 1 : -1;
                    const b = i === 0 ? 0 : 17;
                    return [
                        new CircleHitbox(4, Vec.create(0 * a + b, 125)),
                        new CircleHitbox(4, Vec.create(-4 * a + b, 123.5)),
                        new CircleHitbox(4, Vec.create(-6 * a + b, 122.5)),
                        new CircleHitbox(4, Vec.create(-8 * a + b, 121)),
                        new CircleHitbox(4, Vec.create(-10 * a + b, 120)),
                        new CircleHitbox(4, Vec.create(-12 * a + b, 118.5)),
                        new CircleHitbox(4, Vec.create(-14 * a + b, 116.5)),
                        new CircleHitbox(4, Vec.create(-16 * a + b, 114.5)),
                        new CircleHitbox(4, Vec.create(-18 * a + b, 113)),
                        new CircleHitbox(4, Vec.create(-20 * a + b, 110.5)),
                        new CircleHitbox(4, Vec.create(-22 * a + b, 108)),
                        new CircleHitbox(4, Vec.create(-24 * a + b, 104)),
                        new CircleHitbox(4, Vec.create(-26 * a + b, 99.5)),
                        new CircleHitbox(4, Vec.create(-27 * a + b, 95)),
                        new CircleHitbox(4, Vec.create(-28 * a + b, 91))
                    ];
                }).flat()
            )
        },
        {
            idString: "oil_tanker_ship",
            name: "Oil Tanker",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            invisible: true,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1, 190, Vec.create(49, -22)), // Port
                RectangleHitbox.fromRect(1, 130, Vec.create(-32, -51.5)), // Starboard Top
                RectangleHitbox.fromRect(1, 30, Vec.create(-32, 39)), // Starboard middle
                RectangleHitbox.fromRect(1, 10, Vec.create(-32, 69)), // Starboard middle
                RectangleHitbox.fromRect(85, 1, Vec.create(8, -118.5)), // Stern
                RectangleHitbox.fromRect(69, 1.5, Vec.create(3.3, -88.5)), // Front of the cabin
                RectangleHitbox.fromRect(1.5, 17.5, Vec.create(37, -96.5)), // Left wall of the entrance to the cabin
                RectangleHitbox.fromRect(1.5, 29, Vec.create(46.5, -102.5)), // Right wall of the entrance to the cabin
                RectangleHitbox.fromRect(75, 1.5, Vec.create(9, -117)), // Back of the cabin
                RectangleHitbox.fromRect(1.5, 29, Vec.create(-29, -102.5)), // Right wall of the cabin
                RectangleHitbox.fromRect(1.5, 13, Vec.create(-6.2, -95.8)), // Right wall of the vector room

                // Bottom Hitboxes
                // HACK: refactor when we support collision with polygon hitboxes
                new CircleHitbox(12, Vec.create(8, 107)),
                ...Array.from({ length: 2 }, (_, i) => {
                    const a = i === 0 ? 1 : -1;
                    const b = i === 0 ? 0 : 17;
                    return [
                        new CircleHitbox(4, Vec.create(0 * a + b, 114)),
                        new CircleHitbox(4, Vec.create(-4 * a + b, 112.5)),
                        new CircleHitbox(4, Vec.create(-6 * a + b, 111.5)),
                        new CircleHitbox(4, Vec.create(-8 * a + b, 111)),
                        new CircleHitbox(4, Vec.create(-10 * a + b, 109.8)),
                        new CircleHitbox(4, Vec.create(-12 * a + b, 108.4)),
                        new CircleHitbox(4, Vec.create(-14 * a + b, 106.9)),
                        new CircleHitbox(4, Vec.create(-16 * a + b, 105.2)),
                        new CircleHitbox(4, Vec.create(-18 * a + b, 103.4)),
                        new CircleHitbox(4, Vec.create(-20 * a + b, 101.6)),
                        new CircleHitbox(4, Vec.create(-22 * a + b, 99)),
                        new CircleHitbox(4, Vec.create(-24 * a + b, 95.3)),
                        new CircleHitbox(4, Vec.create(-26 * a + b, 92)),
                        new CircleHitbox(4, Vec.create(-27 * a + b, 89.2)),
                        new CircleHitbox(4, Vec.create(-28 * a + b, 86.5)),
                        new CircleHitbox(4, Vec.create(-29 * a + b, 83.8)),
                        new CircleHitbox(4, Vec.create(-30 * a + b, 80.2)),
                        new CircleHitbox(4, Vec.create(-30 * a + b, 77))
                    ];
                }).flat(),

                RectangleHitbox.fromRect(85, 1.5, Vec.create(8.6, 73.6))
            )
        },
        {
            idString: "forklift",
            name: "Forklift",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(8.15, 17.3, Vec.create(0, -3.8)),
                RectangleHitbox.fromRect(9.45, 10.6, Vec.create(0, -4.9))
            ),
            zIndex: ZIndexes.ObstaclesLayer1 - 2,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "pallet",
            name: "Pallet",
            material: "wood",
            health: 120,
            indestructible: true,
            hitbox: RectangleHitbox.fromRect(0, 0),
            zIndex: ZIndexes.ObstaclesLayer1 - 1,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "crate_particle"
            },
            noCollisions: true
        },
        {
            idString: "bollard",
            name: "Bollard",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(8.2, 9.2, Vec.create(-0.36, 0)),
                new CircleHitbox(3.45, Vec.create(1, 0))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "barrier",
            name: "Barrier",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1.2, 31.75, Vec.create(-2.2, -2.8)),
                RectangleHitbox.fromRect(2, 5, Vec.create(-2.3, 15.4)),
                RectangleHitbox.fromRect(4.71, 6.59, Vec.create(0.95, 15.4))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "port_shed_exterior",
            name: "Port Shed Exterior",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1.75, 29.5, Vec.create(-10.23, -1.7)), // Left wall
                RectangleHitbox.fromRect(1.75, 9.2, Vec.create(10.23, -11.9)), // Right wall above window
                RectangleHitbox.fromRect(1.75, 10.7, Vec.create(10.23, 7.6)), // Right wall below window
                RectangleHitbox.fromRect(20, 1.75, Vec.create(0, -15.56)), // Top wall
                RectangleHitbox.fromRect(9, 1.75, Vec.create(-5.25, 12.19)) // Bottom wall
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "port_fence",
            name: "Port Fence",
            material: "appliance",
            health: 200,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(8.45, 1.6),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "port_fence_side",
            name: "Port Fence Side",
            material: "appliance",
            health: 200,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(7.75, 1.3, Vec.create(0, 3.2)),
                RectangleHitbox.fromRect(1.3, 7.75, Vec.create(3.2, 0))
            ),
            noResidue: true,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "port_warehouse_walls",
            name: "Port warehouse walls",
            material: "metal",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(2, 18.11, Vec.create(-31.23, -20.94)),
                RectangleHitbox.fromRect(60, 2.19, Vec.create(-2.23, -29.12)),
                RectangleHitbox.fromRect(2, 18.35, Vec.create(27.23, -21.05)),
                RectangleHitbox.fromRect(2, 17.61, Vec.create(-31.23, 21.44)),
                RectangleHitbox.fromRect(2, 17.81, Vec.create(27.23, 21.34)),
                RectangleHitbox.fromRect(13.33, 1.86, Vec.create(20.34, 13.35)),
                RectangleHitbox.fromRect(1.73, 24.52, Vec.create(-31.36, 0.38))
            ),
            rotationMode: RotationMode.Limited,
            invisible: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "armory_barracks_walls",
            name: "Armory Barracks Walls",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                new RectangleHitbox(Vec.create(23.44, -41), Vec.create(25.54, -15.1)),
                new RectangleHitbox(Vec.create(23.44, -4), Vec.create(25.54, 23.13)),
                new RectangleHitbox(Vec.create(23.44, 34.23), Vec.create(25.54, 41)),
                new RectangleHitbox(Vec.create(-25.51, -42.34), Vec.create(-1.91, -40.25)),
                new RectangleHitbox(Vec.create(7, 16.1), Vec.create(24, 18.2)),
                new RectangleHitbox(Vec.create(8.18, -42.34), Vec.create(25.54, -40.25)),
                new RectangleHitbox(Vec.create(-25.51, -41), Vec.create(-23.42, 17.54)),
                new RectangleHitbox(Vec.create(-25.51, 28.57), Vec.create(-23.42, 42.35)),
                new RectangleHitbox(Vec.create(-24, 40.25), Vec.create(-4.33, 42.35)),
                new RectangleHitbox(Vec.create(5.76, 40.25), Vec.create(25.54, 42.35)),
                new RectangleHitbox(Vec.create(4.05, 15.59), Vec.create(7.06, 18.77)),
                new RectangleHitbox(Vec.create(-4.12, -21.39), Vec.create(-1.11, -18.21)),
                new RectangleHitbox(Vec.create(-24, -20.85), Vec.create(-4, -18.76))
            ),
            rotationMode: RotationMode.Limited,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "armory_center_walls",
            name: "Armory Center Walls",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(2.09, 42, Vec.create(16.38, 0)),
                RectangleHitbox.fromRect(32.34, 2.08, Vec.create(1.24, -21.87)),
                RectangleHitbox.fromRect(2.09, 3.97, Vec.create(-13.88, -19.01)),
                RectangleHitbox.fromRect(2.09, 8.27, Vec.create(-13.88, 16.87)),
                RectangleHitbox.fromRect(2.09, 8.58, Vec.create(-13.88, -2.64)),
                RectangleHitbox.fromRect(32.34, 2.07, Vec.create(1.24, 21.88))
            ),
            rotationMode: RotationMode.Limited,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "armory_vault_walls",
            name: "Armory Vault Walls",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(2.09, 36, Vec.create(36.03, -2)),
                RectangleHitbox.fromRect(2.09, 11.67, Vec.create(-13.96, -15.16)),
                RectangleHitbox.fromRect(13.4, 2.09, Vec.create(30.37, 16.52)),
                RectangleHitbox.fromRect(74.12, 2.09, Vec.create(0.01, -20.98)),
                RectangleHitbox.fromRect(2.09, 11.07, Vec.create(-13.96, 10.47)),
                RectangleHitbox.fromRect(29, 2.09, Vec.create(21.9, -6.66)),
                RectangleHitbox.fromRect(2.07, 37, Vec.create(-36.01, -2.5)),
                RectangleHitbox.fromRect(35.39, 2.09, Vec.create(-19.35, 16.52)),
                RectangleHitbox.fromRect(4.16, 2.09, Vec.create(10.5, 16.52))
            ),
            rotationMode: RotationMode.Limited,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        makeContainerWalls(1, "closed"),
        makeContainerWalls(2, "open1", ContainerTints.Green),
        makeContainerWalls(3, "open1", ContainerTints.Blue),
        makeContainerWalls(4, "open2", ContainerTints.Blue),
        makeContainerWalls(5, "open1", ContainerTints.Yellow),
        makeContainerWalls(6, "open2", ContainerTints.Yellow),
        {
            idString: "sandbags",
            name: "Sandbags",
            material: "stone",
            health: 1000,
            indestructible: true,
            hitbox: RectangleHitbox.fromRect(13.5, 8.1),
            rotationMode: RotationMode.Limited
        },
        {
            idString: "gun_case",
            name: "Gun Case",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(10.22, 4.73),
            rotationMode: RotationMode.Limited,
            hasLoot: true
        },
        {
            idString: "m1117",
            name: "M1117",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(18.51, 32.28, Vec.create(0, -5.17)), // Body
                RectangleHitbox.fromRect(19.69, 6.67, Vec.create(0, -10.87)), // Back wheels
                RectangleHitbox.fromRect(19.69, 6.67, Vec.create(0, 10.8)), // Front wheels
                RectangleHitbox.fromRect(17, 5.38, Vec.create(0, 16.14)), // Back of hood
                RectangleHitbox.fromRect(15.06, 5.38, Vec.create(0, 19.7)) // Front of hood
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "cabinet",
            name: "Cabinet",
            material: "appliance",
            health: 100,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(14.53, 4.3, Vec.create(0, -0.22)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hasLoot: true
        },
        {
            idString: "briefcase",
            name: "Briefcase",
            material: "appliance",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(10.65, 7.42, Vec.create(0, 0.43)),
            rotationMode: RotationMode.Limited,
            hasLoot: true
        },
        {
            idString: "button",
            name: "Button",
            material: "stone",
            health: 1000,
            indestructible: true,
            role: ObstacleSpecialRoles.Activatable,
            interactText: "Press",
            sound: {
                name: "button_press"
            },
            hitbox: RectangleHitbox.fromRect(2.15, 1.51),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle",
                activated: "button_activated"
            }
        }
    ]
);
