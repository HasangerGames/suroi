import { FireMode } from "../constants";
import { ItemType, ObjectDefinitions, type InventoryItemDefinition } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";

export type MeleeDefinition = InventoryItemDefinition & {
    readonly itemType: ItemType.Melee

    readonly damage: number
    readonly obstacleMultiplier: number
    readonly piercingMultiplier?: number // If it does less dmg vs pierceable objects than it would vs a normal one
    readonly stonePiercing?: boolean
    readonly iceMultiplier?: number
    readonly swingSound: string
    readonly stopSound?: string
    readonly radius: number
    readonly offset: Vector
    readonly cooldown: number
    readonly maxTargets: number
    readonly reskins?: string[]
    readonly fists: InventoryItemDefinition["fists"] & {
        readonly animationDuration: number
        readonly randomFist?: boolean
        readonly noLeftFistMovement?: boolean
    }
    readonly image?: {
        readonly position: Vector
        readonly usePosition: Vector
        // no relation to the ZIndexes enum
        readonly zIndex: number
        readonly angle?: number
        readonly useAngle?: number
        readonly xConstant?: number
        readonly lootScale?: number
        readonly separateWorldImage?: boolean
        readonly animated?: boolean
    }
    readonly fireMode: FireMode
} & ({
    readonly rotationalAnimation: true
} | {
    readonly rotationalAnimation?: false
    readonly fists: {
        readonly useLeft: Vector
        readonly useRight: Vector
    }
});

export const DEFAULT_HAND_RIGGING = Object.freeze({
    left: Vec.create(38, -35),
    right: Vec.create(38, 35)
}) as InventoryItemDefinition["fists"] & object;

export const Melees = ObjectDefinitions.withDefault<MeleeDefinition>()(
    "Melees",
    {
        itemType: ItemType.Melee,
        noDrop: false,
        killstreak: false,
        speedMultiplier: 1,
        swingSound: "swing",
        iceMultiplier: 0.01,
        maxTargets: 1,
        image: {
            zIndex: 1
        },
        fireMode: FireMode.Single
    },
    () => [
        {
            idString: "fists",
            name: "Fists",
            damage: 20,
            obstacleMultiplier: 1,
            iceMultiplier: 0.01,
            radius: 1.5,
            offset: Vec.create(2.5, 0),
            cooldown: 250,
            noDrop: true,
            fists: {
                animationDuration: 125,
                randomFist: true,
                ...DEFAULT_HAND_RIGGING,
                useLeft: Vec.create(75, -10),
                useRight: Vec.create(75, 10)
            },
            image: undefined
        },
        {
            idString: "baseball_bat",
            name: "Baseball Bat",
            swingSound: "heavy_swing",
            damage: 34,
            obstacleMultiplier: 1.5,
            radius: 3.8,
            offset: Vec.create(3.8, 2.2),
            cooldown: 340,
            fists: {
                animationDuration: 150,
                left: Vec.create(55, -15),
                right: Vec.create(45, 0),
                useLeft: Vec.create(28, -15),
                useRight: Vec.create(50, -15)
            },
            image: {
                position: Vec.create(35, 45),
                usePosition: Vec.create(115, -14),
                angle: 155,
                useAngle: 45,
                lootScale: 0.55
            }
        },
        {
            idString: "feral_claws",
            name: "Feral Claws",
            damage: 20,
            obstacleMultiplier: 1,
            radius: 1.75,
            offset: Vec.create(2.5, 0),
            cooldown: 150,
            // noDrop: true,
            fists: {
                animationDuration: 100,
                randomFist: true,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(75, -10),
                useRight: Vec.create(75, 10)
            },
            image: {
                position: Vec.create(42, 20),
                usePosition: Vec.create(80, -25),
                angle: 45,
                useAngle: 65,
                lootScale: 0.6
            }
        },
        {
            idString: "hatchet",
            name: "Hatchet",
            damage: 45,
            rotationalAnimation: true,
            obstacleMultiplier: 2,
            piercingMultiplier: 1.5,
            radius: 2,
            swingSound: "heavy_swing",
            offset: Vec.create(5.4, -0.5),
            cooldown: 350,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(42, 20),
                angle: 135,
                useAngle: 65,
                lootScale: 0.6
            }
        },
        {
            idString: "fire_hatchet",
            name: "Fire Hatchet",
            damage: 50,
            rotationalAnimation: true,
            obstacleMultiplier: 2,
            piercingMultiplier: 2,
            iceMultiplier: 5,
            radius: 2.05,
            swingSound: "heavy_swing",
            offset: Vec.create(5.4, -0.5),
            cooldown: 420,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(42, 20),
                angle: 135,
                useAngle: 65,
                lootScale: 0.7
            }
        },
        {
            idString: "crowbar",
            name: "Crowbar",
            swingSound: "heavy_swing",
            damage: 40,
            obstacleMultiplier: 2.2,
            piercingMultiplier: 2,
            radius: 2.58,
            offset: Vec.create(5.9, 1.7),
            cooldown: 560,
            fists: {
                animationDuration: 200,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(100, 35)
            },
            image: {
                position: Vec.create(31, 41),
                usePosition: Vec.create(110, 33),
                angle: 190,
                useAngle: 40,
                lootScale: 0.65
            },
            reskins: ["winter"]
        },
        {
            idString: "kbar",
            name: "K-bar",
            swingSound: "soft_swing",
            damage: 25,
            obstacleMultiplier: 1.25,
            radius: 2.7,
            iceMultiplier: 0.1,
            offset: Vec.create(3.1, 0.9),
            cooldown: 225,
            fists: {
                animationDuration: 100,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(70, 20)
            },
            image: {
                position: Vec.create(62, 42),
                usePosition: Vec.create(90, 8),
                angle: 60,
                useAngle: 5,
                lootScale: 0.8
            }
        },
        {
            idString: "sickle",
            name: "Sickle",
            damage: 33,
            swingSound: "soft_swing",
            obstacleMultiplier: 1.3,
            radius: 2.7,
            offset: Vec.create(4, 0),
            cooldown: 400,
            rotationalAnimation: true,
            //  fireMode: FireMode.Auto, - todo
            fists: {
                animationDuration: 150,
                left: Vec.create(29, -39),
                right: Vec.create(44, 35),
                noLeftFistMovement: true
            },
            image: {
                position: Vec.create(62, 64),
                angle: 102,
                useAngle: 42,
                lootScale: 0.85,
                xConstant: 85
            },
            reskins: ["winter"]
        },
        {
            idString: "maul",
            name: "Maul",
            damage: 54,
            iceMultiplier: 5,
            rotationalAnimation: true,
            swingSound: "heavy_swing",
            obstacleMultiplier: 2,
            stonePiercing: true,
            piercingMultiplier: 1,
            radius: 2.7,
            offset: Vec.create(5.4, -0.5),
            cooldown: 450,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(40, 20),
                angle: 135,
                useAngle: 65,
                lootScale: 0.6
            }
        },
        {
            idString: "steelfang",
            name: "Steelfang",
            devItem: true,
            damage: 40,
            noDrop: true,
            stonePiercing: true,
            obstacleMultiplier: 1,
            piercingMultiplier: 1,
            radius: 2.7,
            offset: Vec.create(3.1, 0.9),
            cooldown: 200,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(30, 40),
                useLeft: Vec.create(35, -40),
                useRight: Vec.create(75, -20)
            },
            image: {
                position: Vec.create(55, 55),
                usePosition: Vec.create(80, -25),
                angle: -120,
                useAngle: -800,
                lootScale: 0.9
            },
            wearerAttributes: {
                passive: {
                    speedBoost: 1.1
                }
            }
        },
        {
            idString: "gas_can",
            name: "Gas Can",
            damage: 22,
            obstacleMultiplier: 1,
            radius: 1.75,
            offset: Vec.create(3.1, 0.5),
            cooldown: 250,
            image: {
                position: Vec.create(54, 35),
                usePosition: Vec.create(91, 10),
                useAngle: 0,
                lootScale: 0.8,
                separateWorldImage: true
            },
            fists: {
                animationDuration: 125,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(75, 10)
            }
        },
        {
            idString: "heap_sword",
            name: "HE-AP sword",
            devItem: true,
            damage: 75,
            obstacleMultiplier: 2.5,
            piercingMultiplier: 1,
            killstreak: true,
            stonePiercing: true,
            radius: 4,
            offset: Vec.create(5, 0),
            cooldown: 300,
            maxTargets: Infinity,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(120, 20)
            },
            image: {
                position: Vec.create(102, 35),
                usePosition: Vec.create(140, -30),
                angle: 50,
                useAngle: -20,
                lootScale: 0.6
            }
        },
        {
            idString: "ice_pick",
            name: "Ice Pick",
            swingSound: "heavy_swing",
            damage: 35,
            obstacleMultiplier: 1.9,
            piercingMultiplier: 1,
            iceMultiplier: 5,
            radius: 2.8,
            offset: Vec.create(5.4, -0.5),
            cooldown: 420,
            rotationalAnimation: true,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -30),
                right: Vec.create(40, 10)
            },
            image: {
                position: Vec.create(47, 25),
                angle: 130,
                useAngle: 65,
                lootScale: 0.6
            }
        },
        {
            idString: "seax",
            name: "Seax",
            damage: 45,
            swingSound: "heavy_swing",
            obstacleMultiplier: 1.5,
            radius: 2.7,
            offset: Vec.create(5.4, -0.5),
            cooldown: 410,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(95, 20)
            },
            image: {
                position: Vec.create(80, 25),
                usePosition: Vec.create(123, -13),
                angle: 35,
                useAngle: 0,
                lootScale: 0.7
            }
        },
        {
            idString: "falchion",
            name: "Falchion",
            damage: 41,
            swingSound: "soft_swing",
            obstacleMultiplier: 1.1,
            radius: 4.1,
            // maxTargets: Infinity, - TODO: It must hit multiple targets at once, however enabling this causes melee through wall bug to appear
            offset: Vec.create(7.2, 0.5),
            piercingMultiplier: 0.95,
            cooldown: 450,
            rotationalAnimation: true,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(43.5, 41.5)
            },
            image: {
                position: Vec.create(5, 90),
                angle: 170,
                useAngle: 25,
                lootScale: 0.6,
                xConstant: 108 // for world image
            }
        },
        {
            idString: "chainsaw",
            name: "Chain Saw",
            devItem: true,
            damage: 25,
            fireMode: FireMode.Auto,
            obstacleMultiplier: 2,
            piercingMultiplier: 2,
            radius: 2.7,
            swingSound: "chainsaw",
            stopSound: "chainsaw_stop",
            offset: Vec.create(6.8, 0.5),
            cooldown: 0,
            fists: {
                animationDuration: 0,
                left: Vec.create(61, 10),
                right: Vec.create(35, 70),
                useLeft: Vec.create(57, 10),
                useRight: Vec.create(31, 70)
            },
            image: {
                position: Vec.create(106, 27),
                usePosition: Vec.create(106, 27),
                angle: 10,
                useAngle: 10,
                lootScale: 0.5,
                animated: true
            }
        }
    ]
);
