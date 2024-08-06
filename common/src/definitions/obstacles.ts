import { ZIndexes } from "../constants";
import { type Variation } from "../typings";
import { CircleHitbox, HitboxGroup, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { ContainerTints, MapObjectSpawnMode, ObjectDefinitions, ObstacleSpecialRoles, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { type LootDefinition } from "./loots";
import { type SyncedParticleSpawnerDefinition } from "./syncedParticles";

/**
 * An enum indicating the degree to which an obstacle should allow
 * throwables to sail over it.
 *
 * Note that any throwable whose velocity is below 0.03 u/ms won't be able to sail
 * over any obstacle, even those marked as `Always`. Additionally, if the obstacle
 * in question has a role that is `ObstacleSpecialRoles.Door`, its preference will only
 * be honored when the door is opened; if it is closed, it will act as {@link Never}.
 */
export enum FlyoverPref {
    /**
     * Always allow throwables to fly over the object.
     */
    Always,

    /**
     * Only allow throwables to fly over the object if the throwable's velocity exceeds 0.04 u/ms.
     * For reference, the maximum throwing speed is around 0.09 u/ms for a 1x scope.
     */
    Sometimes,

    /**
     * Never allow throwables to fly over the object.
     */
    Never
}

export type ObstacleDefinition = ObjectDefinition & {
    readonly material: typeof Materials[number]
    readonly health: number
    readonly indestructible: boolean
    readonly isStair?: boolean
    readonly transportTo?: number
    readonly returnTo?: number
    readonly impenetrable: boolean
    readonly noResidue: boolean
    readonly invisible: boolean
    readonly hideOnMap: boolean
    readonly scale?: {
        readonly spawnMin: number
        readonly spawnMax: number
        readonly destroy: number
    }
    readonly hitbox: Hitbox
    readonly spawnHitbox?: Hitbox
    readonly noCollisions: boolean
    readonly rotationMode: RotationMode
    readonly variations?: Exclude<Variation, 0>
    readonly particleVariations?: number
    readonly zIndex?: ZIndexes
    /**
     * Whether throwables can fly over this obstacle
     */
    readonly allowFlyover: FlyoverPref
    readonly hasLoot: boolean
    readonly spawnWithLoot: boolean
    readonly explosion?: string
    readonly detector?: boolean
    readonly noMeleeCollision: boolean
    readonly noBulletCollision: boolean
    readonly reflectBullets: boolean
    readonly anyLayer?: boolean

    readonly frames: {
        readonly base?: string
        readonly particle?: string
        readonly residue?: string
        readonly opened?: string
        readonly activated?: string
    }

    readonly wall?: {
        readonly color: number
        readonly borderColor: number
    }

    readonly imageAnchor?: Vector
    readonly spawnMode: MapObjectSpawnMode
    readonly tint?: number
    readonly particlesOnDestroy?: SyncedParticleSpawnerDefinition
    readonly additionalDestroySounds: string[]
    readonly sound?: ({ readonly name: string } | { readonly names: string[] }) & {
        readonly maxRange?: number
        readonly falloff?: number
    }
} & (
    (
        {
            readonly role: ObstacleSpecialRoles.Door
            readonly locked?: boolean
            readonly openOnce?: boolean
            readonly animationDuration?: number
            readonly doorSound?: string
        } & (
            {
                readonly operationStyle?: "swivel"
                readonly hingeOffset: Vector
            } | {
                readonly operationStyle: "slide"
                /**
                 * Determines how much the door slides. 1 means it'll be displaced by its entire width,
                 * 0.5 means it'll be displaced by half its width, etc
                 */
                readonly slideFactor?: number
            }
        )
    ) | {
        readonly role: ObstacleSpecialRoles.Activatable
        readonly sound?: ({ readonly name: string } | { readonly names: string[] }) & {
            readonly maxRange?: number
            readonly falloff?: number
        }
        readonly requiredItem?: ReferenceTo<LootDefinition>
        readonly interactText?: string
        readonly emitParticles?: boolean
        readonly replaceWith?: {
            readonly idString: Record<ReferenceTo<ObstacleDefinition>, number> | ReferenceTo<ObstacleDefinition>
            readonly delay: number
        }
    } | {
        readonly role: ObstacleSpecialRoles.Window
        readonly noCollisionAfterDestroyed?: boolean
    } | {
        readonly role?: ObstacleSpecialRoles.Wall
    }
);

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
    "sand",
    "fence",
    "iron",
    "piano"
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

export const Obstacles = ObjectDefinitions.create<ObstacleDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            indestructible: false,
            impenetrable: false,
            noResidue: false,
            invisible: false,
            hideOnMap: false,
            noCollisions: false,
            allowFlyover: FlyoverPref.Sometimes,
            hasLoot: false,
            spawnWithLoot: false,
            noMeleeCollision: false,
            noBulletCollision: false,
            reflectBullets: false,
            frames: {},
            imageAnchor: Vec.create(0, 0),
            spawnMode: MapObjectSpawnMode.Grass,
            additionalDestroySounds: []
        }),
        crate: () => ({
            material: "crate",
            health: 80,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            rotationMode: RotationMode.Binary,
            hitbox: RectangleHitbox.fromRect(9.2, 9.2),
            hasLoot: true
        }),
        houseWall: (lengthNumber: number) => ({
            idString: `house_wall_${lengthNumber}`,
            name: `House Wall ${lengthNumber}`,
            material: "wood",
            hideOnMap: true,
            noResidue: true,
            health: 170,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "wall_particle"
            },
            wall: {
                borderColor: 0x4a4134,
                color: 0xafa08c
            },
            role: ObstacleSpecialRoles.Wall
        }),
        hqWall: (lengthNumber: number, customHealth = false) => ({
            idString: `headquarters_wall_${lengthNumber}`,
            name: `Headquarters Wall ${lengthNumber}`,
            material: "wood",
            hideOnMap: true,
            noResidue: true,
            health: customHealth ? 100 : 170,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "wall_particle"
            },
            wall: {
                borderColor: 0x4a4134,
                color: 0xafa08c
            },
            role: ObstacleSpecialRoles.Wall
        }),
        concreteWall: () => ({
            material: "stone",
            health: 500,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            allowFlyover: FlyoverPref.Never,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        }),
        mobileHomeWall: (lengthNumber: string) => ({
            idString: `mobile_home_wall_${lengthNumber}`,
            name: `Mobile Home Wall ${lengthNumber}`,
            material: "appliance",
            noResidue: true,
            health: 240,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "briefcase_particle"
            },
            role: ObstacleSpecialRoles.Wall
        }),
        containerWalls: (id: number, style: "open2" | "open1" | "closed") => {
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
                hideOnMap: invisible,
                invisible,
                hitbox,
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                role: ObstacleSpecialRoles.Wall,
                reflectBullets: true,
                zIndex: ZIndexes.BuildingsFloor + 1,
                frames: {
                    base: invisible ? undefined : `container_walls_${style}`,
                    particle: "metal_particle"
                }
            };
        },
        gunMount: () => ({
            material: "wood",
            health: 60,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hasLoot: true,
            hitbox: new HitboxGroup(
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
        })
    })
)(
    apply => [
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
            zIndex: ZIndexes.ObstaclesLayer4,
            allowFlyover: FlyoverPref.Never
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
            allowFlyover: FlyoverPref.Never,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
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
            hitbox: new CircleHitbox(5.5),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            zIndex: ZIndexes.ObstaclesLayer4,
            allowFlyover: FlyoverPref.Never
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
            zIndex: ZIndexes.ObstaclesLayer4,
            allowFlyover: FlyoverPref.Never
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
            allowFlyover: FlyoverPref.Never,
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
            idString: "river_rock",
            name: "River Rock",
            material: "stone",
            health: 550,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.5
            },
            spawnMode: MapObjectSpawnMode.River,
            zIndex: ZIndexes.UnderwaterPlayers - 1,
            hitbox: new CircleHitbox(8),
            spawnHitbox: new CircleHitbox(9),
            rotationMode: RotationMode.Full,
            variations: 5,
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
            allowFlyover: FlyoverPref.Always,
            hasLoot: true
        },
        {
            idString: "birthday_cake",
            name: "Birthday Cake",
            material: "pumpkin",
            health: 70,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(1.9),
            spawnHitbox: new CircleHitbox(2.9),
            rotationMode: RotationMode.Full,
            allowFlyover: FlyoverPref.Always,
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
            idString: "detector",
            name: "Detector",
            material: "iron",
            health: 1000,
            detector: true,
            indestructible: true,
            noBulletCollision: true,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(9, 3, Vec.create(0, 0.5)),
            noCollisions: true,
            noResidue: true,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
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
        apply(
            "crate",
            {
                idString: "regular_crate",
                name: "Regular Crate",
                rotationMode: RotationMode.Binary,
                frames: {
                    particle: "crate_particle",
                    residue: "regular_crate_residue"
                }
            }
        ),
        apply(
            "crate",
            {
                idString: "flint_crate",
                name: "Flint Crate",
                rotationMode: RotationMode.None,
                hideOnMap: true
            }
        ),
        apply(
            "crate",
            {
                idString: "aegis_crate",
                name: "AEGIS Crate",
                rotationMode: RotationMode.None,
                hideOnMap: true
            }
        ),
        apply(
            "crate",
            {
                idString: "grenade_crate",
                name: "Grenade Crate",
                hitbox: RectangleHitbox.fromRect(6.5, 6.3),
                rotationMode: RotationMode.None,
                allowFlyover: FlyoverPref.Always
            }
        ),
        apply(
            "crate",
            {
                idString: "melee_crate",
                name: "Melee Crate",
                hitbox: RectangleHitbox.fromRect(6.5, 6.3),
                rotationMode: RotationMode.None,
                allowFlyover: FlyoverPref.Always
            }
        ),
        apply(
            "crate",
            {
                idString: "hazel_crate",
                name: "Hazel Crate",
                rotationMode: RotationMode.Binary,
                health: 1700,
                frames: {
                    particle: "hazel_crate_particle",
                    residue: "hazel_crate_residue"
                }
            }
        ),
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
            idString: "hq_desk_left",
            name: "Headquarters Desk",
            material: "crate",
            health: 350,
            impenetrable: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(18.25, 5.25, Vec.create(0, -3)),
                RectangleHitbox.fromRect(4.5, 11, Vec.create(-6.8, 0))
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "hq_desk_right",
            name: "Headquarters Desk",
            material: "crate",
            health: 350,
            impenetrable: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(18.25, 5.25, Vec.create(0, -3)),
                RectangleHitbox.fromRect(4.5, 11, Vec.create(6.8, 0))
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "piano",
            name: "Piano",
            material: "piano", // TODO: sounds
            health: 350,
            impenetrable: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(12.9, 3, Vec.create(0.1, -6.5)),
                RectangleHitbox.fromRect(11, 5, Vec.create(0.1, -3)),
                RectangleHitbox.fromRect(7, 5, Vec.create(3.5, 2.5)),
                RectangleHitbox.fromRect(2, 8, Vec.create(6, 0)),
                new CircleHitbox(1.6, Vec.create(-5.1, -4)),
                new CircleHitbox(1.6, Vec.create(-4.5, -2)),
                new CircleHitbox(1.6, Vec.create(-3, -1)),
                new CircleHitbox(1.6, Vec.create(0.5, 3)),
                new CircleHitbox(1.6, Vec.create(0, 2)),
                new CircleHitbox(1.6, Vec.create(-0.5, 1)),
                new CircleHitbox(1.6, Vec.create(-1, 0.5)),
                new CircleHitbox(1, Vec.create(6, -4.5)),
                new CircleHitbox(0.8, Vec.create(-6.4, -4.8)),
                new CircleHitbox(2.8, Vec.create(3.5, 5)),
                new CircleHitbox(3, Vec.create(4, 5)),
                new CircleHitbox(3, Vec.create(3, 4))
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "rocket_box",
            name: "Firework rocket box",
            material: "cardboard",
            health: 45,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.6
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: RectangleHitbox.fromRect(4, 4),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "box_particle",
                residue: "box_residue"

            }
        },
        {
            idString: "confetti_grenade_box",
            name: "Confetti grenade box",
            material: "cardboard",
            health: 45,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.6
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: RectangleHitbox.fromRect(4, 4),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "box_particle",
                residue: "box_residue"

            }
        },
        {
            idString: "tear_gas_crate",
            name: "Tear Gas Crate",
            material: "crate",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.6
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hitbox: RectangleHitbox.fromRect(9.15, 6.3),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            frames: {
                particle: "crate_particle",
                residue: "regular_crate_residue"
            },
            particlesOnDestroy: {
                type: "tear_gas_particle",
                count: 10,
                deployAnimation: {
                    duration: 4000,
                    staggering: {
                        delay: 300,
                        initialAmount: 2
                    }
                },
                spawnRadius: 15
            },
            additionalDestroySounds: ["smoke_grenade"]
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
            idString: "loot_barrel",
            name: "Loot Barrel",
            material: "metal",
            hideOnMap: true,
            health: 160,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            hasLoot: true,
            hitbox: new CircleHitbox(3.65),
            rotationMode: RotationMode.Full,
            explosion: "barrel_explosion",
            reflectBullets: true,
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
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
                falloff: 0.3
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
            idString: "firework_warehouse_exterior",
            name: "Firework Warehouse Exterior",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(27.7, 1.75, Vec.create(-19, -23)),
                RectangleHitbox.fromRect(27.7, 1.75, Vec.create(19, -23)),
                RectangleHitbox.fromRect(27.7, 1.75, Vec.create(-19, 23)),
                RectangleHitbox.fromRect(27.7, 1.75, Vec.create(19, 23)),
                RectangleHitbox.fromRect(1.75, 18, Vec.create(32.3, 15)),
                RectangleHitbox.fromRect(1.75, 18, Vec.create(32.3, -15)),
                RectangleHitbox.fromRect(1.75, 18, Vec.create(-32.3, 15)),
                RectangleHitbox.fromRect(1.75, 18, Vec.create(-32.3, -15))

            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            noResidue: true,
            frames: {
                particle: "wall_particle"
            }
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
            idString: "loot_tree",
            name: "Loot Tree",
            material: "stone",
            hideOnMap: true,
            health: 250,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(5.5),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            zIndex: ZIndexes.ObstaclesLayer4,
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
        {
            idString: "folders_shelf",
            name: "Folder Shelf",
            material: "crate",
            health: 210,
            impenetrable: true,
            hideOnMap: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(11, 6.3, Vec.create(0, 0))
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(9, 2) }, 1),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(20.86, 2) }, 2),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(11.4, 2) }, 3),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(21.4, 2) }, 4),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(16, 2) }, 5),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(15.1, 2) }, 6),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(20.6, 2) }, 7),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(10.7, 2) }, 8),
        apply("houseWall", { hitbox: RectangleHitbox.fromRect(17.7, 2) }, 9),

        // HQ walls (headquarters)
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(11.5, 2) }, 1),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(21, 2) }, 2),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(9.1, 2) }, 3),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(15.5, 2) }, 4),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(16.3, 2) }, 5),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(21.25, 2) }, 6),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(9, 2) }, 7),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(3, 1.6) }, 8, true),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(11, 2) }, 9),
        apply("hqWall", { hitbox: RectangleHitbox.fromRect(16, 2) }, 10),

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
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "water_cooler",
            name: "Cool Water",
            material: "appliance",
            health: 125,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(6, 5, Vec.create(0, -0.2)),
                RectangleHitbox.fromRect(5.7, 0.25, Vec.create(0, 2.5))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            noResidue: true,
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
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
            rotationMode: RotationMode.Limited,
            explosion: "stove_explosion",
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "speaker",
            name: "Speaker",
            material: "iron",
            health: 160,
            indestructible: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            sound: {
                name: "speaker_start",
                maxRange: 30,
                falloff: 0.25
            },
            noResidue: true,
            hitbox: RectangleHitbox.fromRect(6, 5, Vec.create(0, -0.1)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Activatable,
            interactText: "Play",
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "hq_fridge",
            name: "Headquarters Fridge",
            material: "appliance",
            health: 165,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hasLoot: true,
            hitbox: RectangleHitbox.fromRect(9.25, 6.45, Vec.create(0, -0.2)),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle",
                residue: "fridge_residue"
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
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
            rotationMode: RotationMode.Limited,
            reflectBullets: true
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
            idString: "aegis_golden_case", // TODO: add deagle loot and set hasLoot to true
            name: "Golden Aegis Case",
            material: "wood", // crate or wood?
            health: 150,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(11, 6, Vec.create(0, -0.2)),
                RectangleHitbox.fromRect(1, 0.4, Vec.create(-3.6, 3)),
                RectangleHitbox.fromRect(1, 0.4, Vec.create(3.8, 3))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            noResidue: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "sword_case",
            name: "Sword Case",
            material: "glass",
            health: 200,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(13, 6, Vec.create(0, 0))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            noResidue: true,
            frames: {
                particle: "window_particle"
            }
        },
        {
            idString: "dumpster",
            name: "Dumpster",
            material: "iron",
            reflectBullets: true,
            health: 300,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(6.5, 12.5, Vec.create(0.2, 0)),
                RectangleHitbox.fromRect(5.8, 0.8, Vec.create(0.25, 6.4)),
                RectangleHitbox.fromRect(5.8, 0.8, Vec.create(0.25, -6.4))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "trash_bag",
            name: "Trash Bag",
            material: "stone",
            health: 70,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hitbox: new CircleHitbox(2.2, Vec.create(0, 0)),
            rotationMode: RotationMode.Full,
            allowFlyover: FlyoverPref.Always,
            noResidue: true,
            frames: {
                particle: "flint_stone_particle"
            },
            particleVariations: 2
        },
        {
            idString: "secret_door",
            name: "Secret Door",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            hitbox: RectangleHitbox.fromRect(11, 1.75, Vec.create(-0.8, 0)),
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
            idString: "glass_door",
            name: "Glass Door",
            material: "glass",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            hitbox: RectangleHitbox.fromRect(10.25, 1.25, Vec.create(-0.6, 0)),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            role: ObstacleSpecialRoles.Door,
            hingeOffset: Vec.create(-5.5, 0),
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "window_particle"
            }
        },
        {
            idString: "metal_door",
            name: "Metal Door",
            material: "metal",
            reflectBullets: true,
            doorSound: "metal_door",
            indestructible: true,
            health: 500,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            hitbox: RectangleHitbox.fromRect(10.55, 1.9, Vec.create(-0.44, 0)),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            animationDuration: 80,
            role: ObstacleSpecialRoles.Door,
            hingeOffset: Vec.create(-5.5, 0),
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "metal_particle"
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Always,
            hasLoot: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "metal_small_drawer",
            name: "Metal Small Drawer",
            material: "iron",
            health: 125,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(6.2, 6, Vec.create(0, -0.4)),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            allowFlyover: FlyoverPref.Always,
            noResidue: true, // todo
            hasLoot: true,
            frames: {
                particle: "metal_particle"
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
            allowFlyover: FlyoverPref.Always,
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
            hitbox: RectangleHitbox.fromRect(6.85, 15.4, Vec.create(-0.3, 0)),
            rotationMode: RotationMode.Limited
        },
        {
            idString: "white_small_couch",
            name: "White Small Couch",
            material: "wood",
            health: 95,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(5, 5, Vec.create(0, 0)),
                RectangleHitbox.fromRect(2, 7, Vec.create(-3.5, 0)),
                RectangleHitbox.fromRect(2, 7, Vec.create(3.5, 0)),
                RectangleHitbox.fromRect(7, 2, Vec.create(0, -2.5))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "couch_part",
            name: "Couch Part",
            material: "wood",
            health: 95,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(5, 5, Vec.create(0, 0)),
                RectangleHitbox.fromRect(1.5, 6, Vec.create(-2.5, 0)),
                new CircleHitbox(2.5, Vec.create(0.9, 0))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle",
                residue: "brown_couch_part_residue"
            }
        },
        {
            idString: "couch_corner",
            name: "Couch Corner",
            material: "wood",
            health: 95,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(5, 5, Vec.create(0.6, 0.6)),
                RectangleHitbox.fromRect(1.5, 5, Vec.create(-2.5, 0.6)),
                RectangleHitbox.fromRect(5, 1.5, Vec.create(0.6, -2.5)),
                new CircleHitbox(0.8, Vec.create(-2.4, -2.4))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle",
                residue: "brown_couch_part_residue"
            }
        },
        {
            idString: "couch_end_right",
            name: "Couch Part",
            material: "wood",
            health: 95,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(5, 5, Vec.create(-1, 0)),
                RectangleHitbox.fromRect(6.8, 1.5, Vec.create(-0.25, -2.6)),
                RectangleHitbox.fromRect(1.5, 4.5, Vec.create(2.6, -0.5)),
                new CircleHitbox(0.85, Vec.create(2.6, -2.6)),
                new CircleHitbox(0.85, Vec.create(2.6, 2.65)),
                new CircleHitbox(2.635, Vec.create(-1, 0.25))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle",
                residue: "brown_couch_part_residue"
            }
        },
        {
            idString: "couch_end_left",
            name: "Couch Part",
            material: "wood",
            health: 95,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(5, 5, Vec.create(0, -1)),
                RectangleHitbox.fromRect(1.5, 6.8, Vec.create(-2.6, -0.5)),
                RectangleHitbox.fromRect(4.5, 1.5, Vec.create(0, 2.6)),
                new CircleHitbox(0.85, Vec.create(2.6, 2.6)),
                new CircleHitbox(0.85, Vec.create(-2.6, 2.65)),
                new CircleHitbox(2.65, Vec.create(0.25, -0.5))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle",
                residue: "brown_couch_part_residue"
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
            idString: "green_house_large_table",
            name: "Green House Large Table",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12, 16.6),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer3,
            noCollisions: true,
            noResidue: true
        },
        {
            idString: "large_table",
            name: "Large Table",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(16.6, 12),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer3,
            noCollisions: true,
            noResidue: true
        },
        {
            idString: "large_table_with_stuff",
            name: "Large Table Thing",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(16.6, 12),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer3,
            noCollisions: true,
            noResidue: true
        },
        {
            idString: "green_house_small_table",
            name: "Green House Small Table",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(8.3, 12.3),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer3,
            noCollisions: true,
            noResidue: true
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Never,
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Window
        },
        {
            idString: "window2",
            name: "Window",
            material: "glass",
            health: 20,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: RectangleHitbox.fromRect(1.8, 9.4),
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Never,
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
            hitbox: RectangleHitbox.fromRect(10.5, 1.4, Vec.create(-0.8, 0)),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
            role: ObstacleSpecialRoles.Wall,
            zIndex: ZIndexes.ObstaclesLayer2,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "hq_toilet_paper_wall",
            name: "Headquarters Toilet Paper Wall",
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
            allowFlyover: FlyoverPref.Never,
            role: ObstacleSpecialRoles.Wall,
            zIndex: ZIndexes.ObstaclesLayer2,
            frames: {
                particle: "wall_particle"
            }
        },
        apply(
            "concreteWall",
            {
                idString: "concrete_wall_end",
                name: "Concrete Wall End",
                hitbox: RectangleHitbox.fromRect(2.4, 2),
                indestructible: true
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "concrete_wall_end_broken",
                name: "Concrete Wall End Broken",
                hitbox: RectangleHitbox.fromRect(2.4, 2),
                indestructible: true,
                variations: 2
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "concrete_wall_segment",
                name: "Concrete Wall Segment",
                hitbox: RectangleHitbox.fromRect(16, 2),
                indestructible: true
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "concrete_wall_segment_long",
                name: "Concrete Wall Segment Long",
                hitbox: RectangleHitbox.fromRect(32, 2),
                indestructible: true
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "concrete_wall_corner",
                name: "Concrete Wall Corner",
                hitbox: RectangleHitbox.fromRect(2, 2),
                indestructible: true
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "inner_concrete_wall_1",
                name: "Inner Concrete Wall 1",
                hitbox: RectangleHitbox.fromRect(10.8, 1.9)
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "inner_concrete_wall_2",
                name: "Inner Concrete Wall 2",
                hitbox: RectangleHitbox.fromRect(36.7, 1.9)
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "inner_concrete_wall_3",
                name: "Inner Concrete Wall 3",
                hitbox: RectangleHitbox.fromRect(39.14, 1.9)
            }
        ),
        apply(
            "concreteWall",
            {
                idString: "inner_concrete_wall_4",
                name: "Inner Concrete Wall 4",
                hitbox: RectangleHitbox.fromRect(47.14, 1.9)
            }
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
            reflectBullets: true,
            noResidue: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        apply(
            "gunMount",
            {
                idString: "gun_mount_mcx_spear",
                name: "Gun Mount MCX Spear"
            }
        ),
        apply(
            "gunMount",
            {
                idString: "gun_mount_stoner_63",
                name: "Gun Mount Stoner 63"
            }
        ),
        apply(
            "gunMount",
            {
                idString: "gun_mount_mini_14",
                name: "Gun Mount Mini 14"
            }
        ),
        apply(
            "gunMount",
            {
                idString: "gun_mount_maul",
                name: "Gun Mount Maul",
                hitbox: new HitboxGroup(
                    RectangleHitbox.fromRect(5.05, 1, Vec.create(0, -1.3)),
                    RectangleHitbox.fromRect(0.8, 3, Vec.create(-1.55, 0.35)),
                    RectangleHitbox.fromRect(0.8, 3, Vec.create(1.55, 0.35))
                )
            }
        ),
        apply(
            "gunMount",
            {
                idString: "gun_mount_hp18",
                name: "Gun Mount HP18"
            }
        ),
        {
            idString: "red_house_exterior",
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
            allowFlyover: FlyoverPref.Never,
            noResidue: true,
            frames: {
                particle: "wall_particle"
            }
        },
        {
            idString: "green_house_exterior",
            name: "Green House Exterior",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(21.8, 1.88, Vec.create(-39.9, -30.2)),
                RectangleHitbox.fromRect(51.88, 1.88, Vec.create(8, -30.2)),
                RectangleHitbox.fromRect(1.88, 9.3, Vec.create(33, -2.55)),
                RectangleHitbox.fromRect(10.78, 1.87, Vec.create(28.55, 27.46)),
                RectangleHitbox.fromRect(1.88, 58, Vec.create(-49.86, -1)),
                RectangleHitbox.fromRect(42.74, 1.87, Vec.create(-9.3, 27.46)),
                RectangleHitbox.fromRect(10.02, 1.87, Vec.create(-45.79, 27.46)),
                RectangleHitbox.fromRect(1.88, 15.98, Vec.create(33, 20.22)),
                RectangleHitbox.fromRect(1.88, 11.08, Vec.create(33, -23.88)),
                RectangleHitbox.fromRect(3.5, 3.5, Vec.create(42.75, -0.67)),
                RectangleHitbox.fromRect(3.5, 3.5, Vec.create(42.75, 14.8))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
            zIndex: ZIndexes.ObstaclesLayer4,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "tango_crate",
            name: "Tango Crate",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(15.49, 5.85),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            hasLoot: true
        },
        {
            idString: "control_panel",
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
                idString: "control_panel_activated",
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
            idString: "control_panel_activated",
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
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "control_panel2",
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
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "control_panel_small",
            name: "Small Control Panel",
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
            allowFlyover: FlyoverPref.Never,
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
                falloff: 2
            },
            emitParticles: true,
            requiredItem: "gas_can",
            interactText: "Activate",
            hitbox: RectangleHitbox.fromRect(9, 7)
        },
        {
            idString: "ship_oil_tank",
            name: "Ship Oil Tank",
            material: "metal",
            health: 200,
            indestructible: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(28, 14)
        },
        {
            idString: "cargo_ship_front",
            name: "Cargo Ship",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            invisible: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            },
            hitbox: new HitboxGroup(

                // bottom hitboxes
                // HACK: refactor when we support collision with polygon hitboxes
                new CircleHitbox(11.1, Vec.create(120.8, 12)),
                new CircleHitbox(4, Vec.create(80, -30.8)),
                new CircleHitbox(4, Vec.create(127.5, 5)),
                new CircleHitbox(4, Vec.create(127.5, 20)),
                new CircleHitbox(6, Vec.create(126, 10)),
                new CircleHitbox(6, Vec.create(126, 15)),
                ...Array.from({ length: 2 }, (_, i) => {
                    const a = i === 0 ? 1 : -1;
                    const b = i === 0 ? 0 : 25;
                    return [
                        new CircleHitbox(4, Vec.create(126, 0 * a + b)),
                        new CircleHitbox(4, Vec.create(123.5, -4 * a + b)),
                        new CircleHitbox(4, Vec.create(122.5, -6 * a + b)),
                        new CircleHitbox(4, Vec.create(121, -8 * a + b)),
                        new CircleHitbox(4, Vec.create(120, -10 * a + b)),
                        new CircleHitbox(4, Vec.create(118.5, -12 * a + b)),
                        new CircleHitbox(4, Vec.create(116.5, -14 * a + b)),
                        new CircleHitbox(4, Vec.create(114.5, -16 * a + b)),
                        new CircleHitbox(4, Vec.create(113, -18 * a + b)),
                        new CircleHitbox(4, Vec.create(110.5, -20 * a + b)),
                        new CircleHitbox(4, Vec.create(108, -22 * a + b)),
                        new CircleHitbox(4, Vec.create(104, -24 * a + b)),
                        new CircleHitbox(4, Vec.create(99.5, -26 * a + b)),
                        new CircleHitbox(4, Vec.create(95, -27 * a + b)),
                        new CircleHitbox(4, Vec.create(91, -28 * a + b)),
                        new CircleHitbox(4, Vec.create(88, -29 * a + b)),
                        new CircleHitbox(4, Vec.create(83, -30 * a + b))
                    ];
                }).flat()
            )
        },
        {
            idString: "cargo_ship_walls",
            name: "Cargo Ship Walls",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            invisible: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            },
            hitbox: new HitboxGroup(

                // outer walls
                RectangleHitbox.fromRect(237, 3, Vec.create(-18.5, -45.5)),
                RectangleHitbox.fromRect(3, 92, Vec.create(-135.5, 0)),
                RectangleHitbox.fromRect(78.7, 3, Vec.create(-52.25, 45.5)),
                RectangleHitbox.fromRect(35.5, 3, Vec.create(-119.5, 45.5)),
                RectangleHitbox.fromRect(105.5, 3, Vec.create(50, 45.5)),

                // inner walls

                // cargo ship front
                RectangleHitbox.fromRect(3.8, 17, Vec.create(99, -36.1)),
                RectangleHitbox.fromRect(3.8, 17, Vec.create(99, 36.1)),

                // vault
                RectangleHitbox.fromRect(1.7, 19.5, Vec.create(98.3, 16.5)),
                RectangleHitbox.fromRect(1.7, 19.5, Vec.create(98.3, -16.8)),
                RectangleHitbox.fromRect(34, 1.7, Vec.create(114, -26.5)),
                RectangleHitbox.fromRect(34, 1.7, Vec.create(114, 26.5)),
                RectangleHitbox.fromRect(1.7, 53, Vec.create(130.65, 0)),

                // gas can/control room?
                RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-21.5, 31.1)),
                RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-42.1, 31.1)),
                RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-21.5, -31.1)),
                RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-42.1, -31.1)),

                // RectangleHitbox.fromRect(1.5, 61, Vec.create(-17, 0)),
                RectangleHitbox.fromRect(1.5, 61, Vec.create(-46.5, 0)),

                RectangleHitbox.fromRect(12.8, 0.9, Vec.create(-39, 42.35)),
                RectangleHitbox.fromRect(13.15, 0.9, Vec.create(-24.9, 42.35)),
                RectangleHitbox.fromRect(1.5, 2, Vec.create(-32, 42.35)),
                RectangleHitbox.fromRect(1.5, 2, Vec.create(-17.5, 42.35)),
                RectangleHitbox.fromRect(1.5, 2, Vec.create(-46.1, 42.35)),

                RectangleHitbox.fromRect(12.8, 0.9, Vec.create(-39, -42.35)),
                RectangleHitbox.fromRect(13.15, 0.9, Vec.create(-24.9, -42.35)),
                RectangleHitbox.fromRect(1.5, 2, Vec.create(-32, -42.35)),
                RectangleHitbox.fromRect(1.5, 2, Vec.create(-17.5, -42.35)),
                RectangleHitbox.fromRect(1.5, 2, Vec.create(-46.1, -42.35))

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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Never,
            noResidue: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "port_fence",
            name: "Port Fence",
            material: "fence",
            health: 40,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(8.45, 1.6),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "fence_particle"
            }
        },
        {
            idString: "port_fence_side",
            name: "Port Fence Side",
            material: "fence",
            health: 40,
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
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "fence_particle"
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
            allowFlyover: FlyoverPref.Never,
            invisible: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "house_column",
            name: "House Column",
            material: "stone",
            indestructible: true,
            health: 340,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(3, 3)
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "wall_particle"
            },
            role: ObstacleSpecialRoles.Wall
        },
        {
            idString: "potted_plant",
            name: "Potted Plant",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: new CircleHitbox(2.45, Vec.create(-0.15, 0.9)),
            rotationMode: RotationMode.Full,
            allowFlyover: FlyoverPref.Never,
            hasLoot: true
        },
        {
            idString: "trash_can",
            name: "Trash Can",
            material: "appliance",
            health: 105,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hasLoot: true,
            reflectBullets: true,
            hitbox: new CircleHitbox(2.5, Vec.create(0, 0)),
            rotationMode: RotationMode.Full,
            allowFlyover: FlyoverPref.Never,
            noResidue: true,
            frames: {
                particle: "metal_particle"
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
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
            allowFlyover: FlyoverPref.Never,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        apply("containerWalls", {}, 1, "closed"),
        apply("containerWalls", { tint: ContainerTints.Green }, 2, "open1"),
        apply("containerWalls", { tint: ContainerTints.Blue }, 3, "open1"),
        apply("containerWalls", { tint: ContainerTints.Blue }, 4, "open2"),
        apply("containerWalls", { tint: ContainerTints.Yellow }, 5, "open1"),
        apply("containerWalls", { tint: ContainerTints.Yellow }, 6, "open2"),
        {
            idString: "sandbags",
            name: "Sandbags",
            material: "sand",
            health: 1000,
            indestructible: true,
            hitbox: RectangleHitbox.fromRect(13.1, 7.7),
            rotationMode: RotationMode.Limited
        },
        {
            idString: "roadblock",
            name: "Road Block",
            material: "fence",
            health: 80,
            indestructible: false,
            hitbox: RectangleHitbox.fromRect(1, 10),
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
            allowFlyover: FlyoverPref.Always,
            hasLoot: true
        },
        {
            idString: "cooler",
            name: "Cooler",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(8.3, 4.73),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "m1117_damaged",
            name: "M1117 damaged",
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
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "humvee",
            name: "Humvee",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(17, 35.25, Vec.create(0, -0.4)), // Body
                RectangleHitbox.fromRect(18, 7, Vec.create(0, -12.3)), // Back wheels
                RectangleHitbox.fromRect(18, 7, Vec.create(0, 13.6)), // Front wheels
                RectangleHitbox.fromRect(2.5, 0.5, Vec.create(6.1, -18.25)), // Back exhaust
                RectangleHitbox.fromRect(15.25, 0.5, Vec.create(0, 17.5)), // Front bumper
                RectangleHitbox.fromRect(21, 1, Vec.create(0, 7.5)) // Front of hood
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
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
            health: 150,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(10.65, 7.42, Vec.create(0, 0.43)),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
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
            allowFlyover: FlyoverPref.Always,
            frames: {
                particle: "metal_particle",
                activated: "button_activated"
            }
        },
        apply("mobileHomeWall", { hitbox: RectangleHitbox.fromRect(6.97, 1.68) }, "1"),
        apply("mobileHomeWall", { hitbox: RectangleHitbox.fromRect(10.8, 1.68) }, "2"),
        apply("mobileHomeWall", { hitbox: RectangleHitbox.fromRect(20.43, 1.68) }, "3"),
        {
            idString: "mobile_home_bed",
            name: "Mobile Home Bed",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(7.12, 16.06),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "mobile_home_sink",
            name: "Mobile Home Sink",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.7
            },
            hideOnMap: true,
            hasLoot: true,
            hitbox: RectangleHitbox.fromRect(9.5, 6.63, Vec.create(0, -0.47)),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "mobile_home_stove",
            name: "Mobile Home Stove",
            material: "metal",
            health: 140,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(6.9, 6.64, Vec.create(0, -0.3)),
            rotationMode: RotationMode.Limited,
            explosion: "stove_explosion",
            frames: {
                particle: "metal_particle",
                residue: "stove_residue"
            },
            reflectBullets: true
        },
        {
            idString: "tire",
            name: "Tire",
            material: "stone",
            health: 200,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(3.47, 8.35),
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.BuildingsFloor - 1,
            noResidue: true,
            frames: {
                particle: "flint_stone_particle"
            },
            particleVariations: 2
        },
        {
            idString: "mobile_home_window",
            name: "Mobile Home Window",
            material: "glass",
            health: 20,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(13.8, 1.5),
            zIndex: ZIndexes.ObstaclesLayer2,
            allowFlyover: FlyoverPref.Never,
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Window,
            noCollisionAfterDestroyed: true,
            frames: {
                particle: "window_particle"
            }
        },
        {
            idString: "tugboat",
            name: "Tugboat",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            invisible: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "metal_particle"
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(8.93, 2.09, Vec.create(-9.53, -4.78)),
                RectangleHitbox.fromRect(8.93, 2.09, Vec.create(9.51, -4.78)),
                RectangleHitbox.fromRect(2.21, 35.83, Vec.create(14.37, 12.09)),
                RectangleHitbox.fromRect(2.14, 35.83, Vec.create(-14.33, 12.09)),
                RectangleHitbox.fromRect(30.88, 1.98, Vec.create(0.04, 29.78)),
                RectangleHitbox.fromRect(0.99, 14, Vec.create(-20.79, -38)),
                RectangleHitbox.fromRect(12, 1, Vec.create(-14, -46.2)),
                RectangleHitbox.fromRect(13, 1, Vec.create(13.5, -46.2)),
                RectangleHitbox.fromRect(1, 73, Vec.create(20.59, -8.5)),
                RectangleHitbox.fromRect(0.99, 45, Vec.create(-20.79, 5.5)),
                new CircleHitbox(1.45, Vec.create(-19.9, -45.5)),
                new CircleHitbox(1.45, Vec.create(-8.3, -45.5)),
                new CircleHitbox(1.45, Vec.create(7.4, -45.5)),
                new CircleHitbox(1.45, Vec.create(19.7, -45.5)),
                new CircleHitbox(1.45, Vec.create(19.7, -30.8)),
                new CircleHitbox(1.45, Vec.create(-19.9, -30.8)),
                new CircleHitbox(1.45, Vec.create(19.7, -16.6)),
                new CircleHitbox(1.45, Vec.create(-19.9, -16.6)),
                new CircleHitbox(1.45, Vec.create(19.7, -1.6)),
                new CircleHitbox(1.45, Vec.create(-19.9, -1.6)),
                new CircleHitbox(1.45, Vec.create(19.7, 13.4)),
                new CircleHitbox(1.45, Vec.create(-19.9, 13.4)),
                new CircleHitbox(1.45, Vec.create(19.7, 27.6)),
                new CircleHitbox(1.45, Vec.create(-19.9, 27.6)),
                // HACK: refactor when we support collision with polygon hitboxes
                ...Array.from({ length: 2 }, (_, i) => {
                    const a = i === 0 ? 1 : -1;
                    return Array.from({ length: 13 }, (_, i) => {
                        return new CircleHitbox(2, Vec.create(i * a * 1.5, 45 - (1 - Math.sqrt(1 - (i / 13) ** 2)) * i * 2));
                    });
                }).flat()
            )
        },
        {
            idString: "lux_crate",
            name: "Lux Crate",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(15.49, 5.85),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            hasLoot: true
        },
        {
            idString: "tugboat_control_panel",
            name: "Tugboat Control Panel",
            material: "metal",
            health: 250,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.95
            },
            hitbox: RectangleHitbox.fromRect(26.3, 8.02, Vec.create(0, 0.5)),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "office_chair",
            name: "Office Chair",
            material: "wood",
            health: 140,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(4.5, 5.3, Vec.create(0, -0.14)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "grey_office_chair",
            name: "Office Chair (Grey Edition)",
            material: "wood",
            health: 155,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            noResidue: true,
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(5, 5.1, Vec.create(0, 0)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "life_preserver",
            name: "Life Preserver",
            material: "stone",
            health: 80,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(3.2, 8.87, Vec.create(-0.4, 0)),
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.BuildingsFloor
        },
        {
            idString: "grenade_box",
            name: "grenade_box",
            material: "cardboard",
            health: 60,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(4.4, 4.4),
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer2,
            hasLoot: true,
            frames: {
                particle: "box_particle",
                residue: "box_residue"

            }
        },
        {
            idString: "sea_traffic_control",
            name: "Sea Traffic Control",
            material: "stone",
            health: 150,
            indestructible: true,
            invisible: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "rock_particle"
            },
            particleVariations: 2,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1.87, 20.8, Vec.create(19.6, -20.4)),
                RectangleHitbox.fromRect(2.37, 1.52, Vec.create(19.85, 1.62)),
                RectangleHitbox.fromRect(17.25, 1.74, Vec.create(11.91, 25.14)),
                RectangleHitbox.fromRect(1.78, 55, Vec.create(-20.19, -2.5)),
                RectangleHitbox.fromRect(2.4, 1.51, Vec.create(19.87, 13.27)),
                RectangleHitbox.fromRect(14.31, 1.78, Vec.create(-13.93, 25.12)),
                RectangleHitbox.fromRect(40.08, 1.78, Vec.create(-1.04, -29.91))
            )
        },
        {
            idString: "lily_pad",
            name: "Lily Pad",
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
            spawnMode: MapObjectSpawnMode.River,
            variations: 2,
            zIndex: ZIndexes.ObstaclesLayer3
        },
        {
            idString: "small_bridge",
            name: "Small Bridge",
            material: "wood",
            health: 150,
            indestructible: true,
            invisible: true,
            noBulletCollision: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            frames: {
                particle: "furniture_particle"
            },
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1.02, 56, Vec.create(6.39, 0)),
                RectangleHitbox.fromRect(1.02, 56, Vec.create(-6.39, 0)),
                ...Array.from({ length: 2 }, (_, i) => {
                    const a = i === 0 ? 1 : -1;
                    return Array.from({ length: 2 }, (_, i) => {
                        const b = i === 0 ? 1 : -1;
                        return [
                            new CircleHitbox(1.1, Vec.create(6.39 * a, 0)),
                            new CircleHitbox(1.1, Vec.create(6.39 * a, 9.54 * b)),
                            new CircleHitbox(1.1, Vec.create(6.39 * a, 19.17 * b)),
                            new CircleHitbox(1.1, Vec.create(6.39 * a, 27.97 * b))
                        ];
                    }).flat();
                }).flat()
            ),
            spawnHitbox: RectangleHitbox.fromRect(21.02, 69.69, Vec.create(0, 0))
        },
        {
            idString: "planted_bushes",
            name: "Planted Bushes",
            material: "porcelain",
            health: 800,
            indestructible: true,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(9.5, 16.5, Vec.create(0, 0)),
            rotationMode: RotationMode.Limited,
            spawnMode: MapObjectSpawnMode.River,
            noResidue: true,
            frames: {
                particle: "toilet_particle"
            }
        },
        {
            idString: "large_bridge",
            name: "Large Bridge",
            material: "stone",
            health: 150,
            indestructible: true,
            invisible: true,
            noBulletCollision: false,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            },
            hitbox: new HitboxGroup(
                // Main Bridge Sides
                RectangleHitbox.fromRect(4, 136, Vec.create(21.5, -1.5)),
                RectangleHitbox.fromRect(4, 136, Vec.create(-21.5, -1.5)),

                // Cinder Blocks on Edge of Bridge
                RectangleHitbox.fromRect(5, 5, Vec.create(-21.5, -72)),
                RectangleHitbox.fromRect(5, 5, Vec.create(21.5, -72)),
                RectangleHitbox.fromRect(5, 5, Vec.create(-21.5, 69)),
                RectangleHitbox.fromRect(5, 5, Vec.create(21.5, 69))
            ),
            spawnHitbox: RectangleHitbox.fromRect(60, 230, Vec.create(0, 0))
        },
        {
            idString: "viking_chest",
            name: "Viking Chest",
            material: "wood",
            health: 150,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(12, 7, Vec.create(0, -0.4)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            hideOnMap: true,
            frames: {
                particle: "chest_particle",
                residue: "chest_residue"
            },
            spawnMode: MapObjectSpawnMode.Beach,
            allowFlyover: FlyoverPref.Always
        },
        {
            idString: "river_chest",
            name: "River Chest",
            material: "wood",
            health: 150,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(12, 7, Vec.create(0, -0.4)),
            rotationMode: RotationMode.None,
            zIndex: ZIndexes.UnderwaterPlayers - 1,
            hasLoot: true,
            hideOnMap: true,
            frames: {
                particle: "chest_particle",
                residue: "chest_residue"
            },
            spawnMode: MapObjectSpawnMode.River,
            allowFlyover: FlyoverPref.Always
        },
        {
            idString: "bunker_entrance",
            name: "Bunker Entrance",
            material: "metal",
            health: 1000,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(19.5, 13.25, Vec.create(0, -3.25)),
                RectangleHitbox.fromRect(1.75, 12.75, Vec.create(8.85, 3.8)),
                RectangleHitbox.fromRect(1.75, 12.75, Vec.create(-8.85, 3.8))
            ),
            frames: {
                particle: "metal_particle"
            },
            rotationMode: RotationMode.Limited
        },
        {
            idString: "stair_walls",
            name: "Stair Walls",
            material: "metal",
            health: 1000,
            anyLayer: true,
            indestructible: true,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(0.1, 18.5, Vec.create(5, 0)),
                RectangleHitbox.fromRect(0.1, 18.5, Vec.create(-5, 0))
            ),
            frames: {
                particle: "metal_particle"
            },
            rotationMode: RotationMode.Limited
        },
        {
            idString: "stair_walls_big",
            name: "Stair Walls big",
            material: "metal",
            health: 1000,
            indestructible: true,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(0.1, 20, Vec.create(5, 0)),
                RectangleHitbox.fromRect(0.1, 20, Vec.create(-5, 0))
            ),
            frames: {
                particle: "metal_particle"
            },
            rotationMode: RotationMode.Limited
        },
        {
            idString: "stair_thing",
            name: "Stair thing",
            material: "metal",
            health: 1000,
            indestructible: true,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(12, 0.25, Vec.create(0, 0))
            ),
            frames: {
                particle: "metal_particle"
            },
            rotationMode: RotationMode.Limited
        },
        {
            idString: "stair_top",
            name: "Stair",
            material: "metal",
            health: 1000,
            indestructible: true,
            isStair: true,
            transportTo: 0,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(10, 1, Vec.create(0, 0))
            ),
            frames: {
                particle: "metal_particle"
            },
            rotationMode: RotationMode.Limited
        },
        {
            idString: "stair_middle",
            name: "Stair",
            material: "metal",
            health: 1000,
            indestructible: true,
            isStair: true,
            transportTo: -1,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(10, 10, Vec.create(0, 0))
            ),
            frames: {
                particle: "metal_particle"
            },
            rotationMode: RotationMode.Limited
        },
        {
            idString: "stair_bottom",
            name: "Stair",
            material: "metal",
            health: 1000,
            indestructible: true,
            isStair: true,
            transportTo: -2,
            invisible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(10, 1, Vec.create(0, 0))
            ),
            frames: {
                particle: "metal_particle"
            },
            rotationMode: RotationMode.Limited
        },

        // --------------------------------------------------------------------------------------------
        // Headquarters.
        // --------------------------------------------------------------------------------------------
        {
            idString: "headquarters_bottom_entrance",
            name: "Headquarters Bottom Entrance",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                // left
                RectangleHitbox.fromRect(0.25, 12.5, Vec.create(-40.9, 43)),
                new CircleHitbox(0.5, Vec.create(-41.1, 50.15)),
                new CircleHitbox(0.5, Vec.create(-41.1, 36.75)),

                // right
                RectangleHitbox.fromRect(0.25, 12.5, Vec.create(-20.86, 43.1)),
                new CircleHitbox(0.5, Vec.create(-20.95, 50.15)),
                new CircleHitbox(0.5, Vec.create(-20.95, 36.9))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "headquarters_alarm_barriers",
            name: "Headquarters Alarm Barriers",
            material: "metal",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            reflectBullets: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1, 9, Vec.create(-32.1, 23.5)),
                RectangleHitbox.fromRect(1, 8.5, Vec.create(-39.5, 23.5)),
                RectangleHitbox.fromRect(1, 9, Vec.create(-22.1, 23.5)),
                RectangleHitbox.fromRect(1, 8.5, Vec.create(-29.55, 23.5))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            invisible: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "headquarters_outer_walls",
            name: "Headquarters Outer Walls",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1.75, 20, Vec.create(69.5, 25)),
                RectangleHitbox.fromRect(1.75, 55, Vec.create(69.5, -22.5)),
                RectangleHitbox.fromRect(1.75, 48, Vec.create(69.5, -84.25)),
                RectangleHitbox.fromRect(45.5, 1.75, Vec.create(46, -107.4)),
                RectangleHitbox.fromRect(71.6, 1.75, Vec.create(-23.1, -107.5)),
                RectangleHitbox.fromRect(1.75, 60.5, Vec.create(-58, -76.25)),
                RectangleHitbox.fromRect(1.75, 2.2, Vec.create(-58, -35)),
                RectangleHitbox.fromRect(24.9, 1.7, Vec.create(-59.5, -35)),
                RectangleHitbox.fromRect(1.75, 70, Vec.create(-71, 0.5)),
                RectangleHitbox.fromRect(30, 1.75, Vec.create(-55.9, 34.65)),
                RectangleHitbox.fromRect(18, 1.75, Vec.create(-11.5, 34.75)),
                RectangleHitbox.fromRect(12.25, 1.75, Vec.create(14.75, 34.75)),
                RectangleHitbox.fromRect(39, 1.75, Vec.create(51, 34.75))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "headquarters_secret_room_walls",
            name: "Headquarters Secret Room Walls",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(9.35, 1.6, Vec.create(-5.8, -13.5)),
                RectangleHitbox.fromRect(1.6, 27, Vec.create(-9.7, 0)),
                RectangleHitbox.fromRect(20, 1.6, Vec.create(0, 13))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "headquarters_walls_second_floor",
            name: "Headquarters Walls",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                // outer
                RectangleHitbox.fromRect(1.75, 81.8, Vec.create(69.85, -80)),
                RectangleHitbox.fromRect(129.5, 1.75, Vec.create(5.5, -119.85)),
                RectangleHitbox.fromRect(1.75, 74.7, Vec.create(-58.15, -83)),
                RectangleHitbox.fromRect(14.4, 1.75, Vec.create(-64.5, -46.7)),
                RectangleHitbox.fromRect(1.75, 71.5, Vec.create(-71, -12)),
                RectangleHitbox.fromRect(1.75, 71, Vec.create(-22.5, -12)),
                RectangleHitbox.fromRect(48, 1.75, Vec.create(-47, 23)),

                // inner
                RectangleHitbox.fromRect(66, 1.75, Vec.create(37, -70.5)),
                RectangleHitbox.fromRect(4, 4, Vec.create(1.8, -69)),
                RectangleHitbox.fromRect(4, 4, Vec.create(-35.5, -69)),
                RectangleHitbox.fromRect(1.75, 50, Vec.create(-34.1, -96)),
                RectangleHitbox.fromRect(92, 1.8, Vec.create(23, -40.2)),
                RectangleHitbox.fromRect(1.75, 3, Vec.create(13.5, -41.6)),
                RectangleHitbox.fromRect(15, 1.75, Vec.create(-29.5, -46.6))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "headquarters_main_desk",
            name: "Headquarters Main Desk",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hideOnMap: true,
            noResidue: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(23.6, 5, Vec.create(0, 3)),
                RectangleHitbox.fromRect(4.6, 8, Vec.create(9.5, -1.5)),
                RectangleHitbox.fromRect(4.6, 8, Vec.create(-9.5, -1.5))
            ),
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "headquarters_wood_obstacles",
            name: "Headquarters Wood Obstacles",
            material: "wood",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: RectangleHitbox.fromRect(27.5, 5, Vec.create(-56.3, 31)),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            invisible: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "headquarters_wood_table_second_floor",
            name: "Headquarters Wood Obstacles",
            material: "wood",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(25.3, 3, Vec.create(29.5, -117)),
                RectangleHitbox.fromRect(4.2, 15.5, Vec.create(18.8, -111))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            invisible: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "headquarters_sinks",
            name: "Headquarters Sinks",
            material: "porcelain",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(34, 6, Vec.create(-7.4, -103.5))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always,
            invisible: true,
            frames: {
                particle: "toilet_particle"
            }
        },
        {
            idString: "headquarters_inner_walls",
            name: "Headquarters Inner Walls",
            material: "stone",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            hitbox: new HitboxGroup(
                RectangleHitbox.fromRect(1.55, 61, Vec.create(-19.7, 3.5)),
                RectangleHitbox.fromRect(20.5, 1.55, Vec.create(-10.25, -26.3)),
                RectangleHitbox.fromRect(53.5, 1.55, Vec.create(42.1, -26.4)),

                RectangleHitbox.fromRect(2, 18.6, Vec.create(-47.4, -12.65)),
                RectangleHitbox.fromRect(29.5, 1.51, Vec.create(-55.6, -2.6)),
                RectangleHitbox.fromRect(1.51, 8, Vec.create(-41.6, 2)),
                RectangleHitbox.fromRect(1.51, 18, Vec.create(-41.6, 25)),
                RectangleHitbox.fromRect(1.5, 40.5, Vec.create(-34.1, -86.3)),

                // squares
                RectangleHitbox.fromRect(4, 4.8, Vec.create(-47.3, -34.6)),
                RectangleHitbox.fromRect(4, 4, Vec.create(32.5, -64.1)),
                RectangleHitbox.fromRect(4, 4, Vec.create(10.9, -64.1)),
                RectangleHitbox.fromRect(4, 4, Vec.create(-33.5, -64))
            ),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            invisible: true,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
        },
        // --------------------------------------------------------------------------------------------

        {
            idString: "test_wall",
            name: "Test Wall",
            material: "wood",
            health: 200,
            hitbox: RectangleHitbox.fromRect(20, 2),
            rotationMode: RotationMode.Limited,
            wall: {
                color: 0xffaa00,
                borderColor: 0xff0000
            }
        }
    ]
);
