import { FireMode } from "../../constants";
import { DefinitionType, ItemType, type InventoryItemDefinition } from "../../utils/objectDefinitions";
import { Vec, type Vector } from "../../utils/vector";
import { Tier } from "./guns";
import { InventoryItemDefinitions } from "./items";

export interface MeleeDefinition extends InventoryItemDefinition {
    readonly defType: DefinitionType.Melee
    readonly itemType: ItemType.Melee
    readonly tier: Tier

    readonly fireMode?: FireMode
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly piercingMultiplier?: number // If it does less dmg vs pierceable objects than it would vs a normal one
    readonly stonePiercing?: boolean
    /**
     * @default {0.01}
     */
    readonly iceMultiplier?: number
    readonly swingSound?: string
    readonly stopSound?: string
    readonly hitSound?: string
    readonly hitDelay?: number
    readonly radius: number
    readonly offset: Vector
    readonly cooldown: number
    readonly attackCooldown?: number
    readonly maxTargets?: number

    readonly fists: InventoryItemDefinition["fists"] & {
        readonly animationDuration: number
        readonly randomFist?: boolean
    }

    readonly image?: {
        readonly position: Vector
        // no relation to the ZIndexes enum
        readonly zIndex?: number
        readonly angle?: number
        readonly pivot?: Vector
        readonly lootScale?: number
        readonly separateWorldImage?: boolean
        readonly animated?: boolean
    }

    readonly animation: ReadonlyArray<{
        readonly duration: number
        readonly fists: {
            readonly left: Vector
            readonly right: Vector
        }
        readonly image?: {
            readonly position: Vector
            readonly angle: number
        }
    }>

    readonly reflectiveSurface?: {
        readonly pointA: Vector
        readonly pointB: Vector
    }

    readonly onBack?: {
        readonly angle: number
        readonly position: Vector
        readonly reflectiveSurface?: {
            readonly pointA: Vector
            readonly pointB: Vector
        }
    }
}

export const DEFAULT_HAND_RIGGING = Object.freeze({
    left: Vec.create(38, -35),
    right: Vec.create(38, 35)
}) as InventoryItemDefinition["fists"] & object;

export const Melees = new InventoryItemDefinitions<MeleeDefinition>([
    {
        idString: "fists",
        name: "Fists",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.D,
        damage: 20,
        speedMultiplier: 1,
        obstacleMultiplier: 1,
        iceMultiplier: 0.01,
        radius: 1.5,
        offset: Vec.create(2.5, 0),
        cooldown: 250,
        noDrop: true,
        fists: {
            animationDuration: 125,
            randomFist: true,
            ...DEFAULT_HAND_RIGGING
        },
        animation: [
            {
                duration: 125,
                fists: {
                    left: Vec.create(75, -10),
                    right: Vec.create(75, 10)
                }
            },
            {
                duration: 125,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35)
                }
            }
        ],
        image: undefined
    },
    {
        idString: "baseball_bat",
        name: "Baseball Bat",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.C,
        swingSound: "heavy_swing",
        damage: 34,
        speedMultiplier: 1,
        obstacleMultiplier: 1.5,
        radius: 4,
        offset: Vec.create(3.8, 2.2),
        cooldown: 450,
        fists: {
            animationDuration: 150,
            left: Vec.create(55, -15),
            right: Vec.create(45, 0)
        },
        animation: [
            {
                duration: 150,
                fists: {
                    left: Vec.create(28, -15),
                    right: Vec.create(50, -15)
                },
                image: {
                    position: Vec.create(115, -14),
                    angle: 45
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(55, -15),
                    right: Vec.create(45, 0)
                },
                image: {
                    position: Vec.create(35, 45),
                    angle: 155
                }
            }
        ],
        image: {
            position: Vec.create(35, 45),
            angle: 155,
            lootScale: 0.55
        }
    },
    /**
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
                    right: Vec.create(45, 0)
                },
                animation: [
                    {
                        duration: 150,
                        fists: {
                            left: Vec.create(28, -15),
                            right: Vec.create(50, -15)
                        },
                        image: {
                            position: Vec.create(115, -14),
                            angle: 45
                        }
                    },
                    {
                        duration: 150,
                        fists: {
                            left: Vec.create(55, -15),
                            right: Vec.create(45, 0)
                        },
                        image: {
                            position: Vec.create(35, 45),
                            angle: 155
                        }
                    }
                ],
                image: {
                    position: Vec.create(35, 45),
                    angle: 155,
                    lootScale: 0.55
                }
            },
    */
    {
        idString: "hatchet",
        name: "Hatchet",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.B,
        damage: 38,
        speedMultiplier: 1,
        obstacleMultiplier: 2,
        piercingMultiplier: 1.5,
        radius: 2,
        swingSound: "heavy_swing",
        offset: Vec.create(5.4, -0.5),
        cooldown: 420,
        hitDelay: 180,
        fists: {
            animationDuration: 150,
            left: Vec.create(40, -25),
            right: Vec.create(40, 15)
        },
        image: {
            position: Vec.create(42, 20),
            angle: 135,
            lootScale: 0.6
        },
        animation: [
            { // warmup
                duration: 100,
                fists: {
                    left: Vec.create(40, 25),
                    right: Vec.create(0, 50)
                },
                image: {
                    angle: 210,
                    position: Vec.create(-10, 45)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(0, -50),
                    right: Vec.create(40, -25)
                },
                image: {
                    position: Vec.create(42, -25),
                    angle: 65
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(40, -25),
                    right: Vec.create(40, 15)
                },
                image: {
                    position: Vec.create(42, 20),
                    angle: 135
                }
            }
        ]
    },
    {
        idString: "fire_hatchet",
        name: "Fire Hatchet",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.A,
        damage: 50,
        speedMultiplier: 1,
        obstacleMultiplier: 2,
        piercingMultiplier: 2,
        iceMultiplier: 5,
        radius: 2.05,
        swingSound: "heavy_swing",
        offset: Vec.create(5.4, -0.5),
        cooldown: 420,
        hitDelay: 180,
        fists: {
            animationDuration: 150,
            left: Vec.create(40, -25),
            right: Vec.create(40, 15)
        },
        image: {
            position: Vec.create(42, 20),
            angle: 135,
            lootScale: 0.7
        },
        animation: [
            { // warmup
                duration: 100,
                fists: {
                    left: Vec.create(40, 25),
                    right: Vec.create(0, 50)
                },
                image: {
                    angle: 210,
                    position: Vec.create(-10, 45)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(0, -50),
                    right: Vec.create(40, -25)
                },
                image: {
                    position: Vec.create(42, -25),
                    angle: 65
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(40, -25),
                    right: Vec.create(40, 15)
                },
                image: {
                    position: Vec.create(42, 20),
                    angle: 135
                }
            }
        ]
    },
    {
        idString: "crowbar",
        name: "Crowbar",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.A,
        swingSound: "heavy_swing",
        damage: 40,
        speedMultiplier: 1,
        obstacleMultiplier: 2.2,
        piercingMultiplier: 2,
        radius: 2.58,
        offset: Vec.create(5.9, 1.7),
        cooldown: 560,
        reskins: ["winter"],
        fists: {
            animationDuration: 200,
            left: Vec.create(38, -35),
            right: Vec.create(38, 35)
        },
        image: {
            position: Vec.create(31, 41),
            angle: 190,
            lootScale: 0.65
        },
        animation: [
            {
                duration: 200,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(100, 35)
                },
                image: {
                    position: Vec.create(110, 33),
                    angle: 40
                }
            },
            {
                duration: 200,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35)
                },
                image: {
                    position: Vec.create(31, 41),
                    angle: 190
                }
            }
        ]
    },
    {
        idString: "kbar",
        name: "K-bar",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.C,
        swingSound: "soft_swing",
        damage: 25,
        speedMultiplier: 1,
        obstacleMultiplier: 1.25,
        radius: 2.7,
        iceMultiplier: 0.1,
        offset: Vec.create(3.1, 0.9),
        cooldown: 225,
        fists: {
            animationDuration: 100,
            left: Vec.create(38, -35),
            right: Vec.create(38, 35)
        },
        image: {
            position: Vec.create(62, 42),
            angle: 60,
            lootScale: 0.8
        },
        animation: [
            {
                duration: 100,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(70, 20)
                },
                image: {
                    position: Vec.create(90, 8),
                    angle: 5
                }
            },
            {
                duration: 100,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35)
                },
                image: {
                    position: Vec.create(62, 42),
                    angle: 60
                }
            }
        ]
    },
    {
        idString: "sickle",
        name: "Sickle",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.A,
        damage: 24,
        swingSound: "soft_swing",
        speedMultiplier: 1,
        obstacleMultiplier: 1.3,
        radius: 2.7,
        offset: Vec.create(4, 0),
        cooldown: 150,
        attackCooldown: 125,
        reskins: ["winter"],
        fireMode: FireMode.Auto,
        fists: {
            animationDuration: 70,
            left: Vec.create(29, -39),
            right: Vec.create(44, 35)
        },
        image: {
            position: Vec.create(42, 66),
            angle: 135,
            lootScale: 0.85
        },
        animation: [
            {
                duration: 65,
                fists: {
                    left: Vec.create(29, -39),
                    right: Vec.create(44, -25)
                },
                image: {
                    position: Vec.create(82, -34),
                    angle: 30
                }
            },
            {
                duration: 85,
                fists: {
                    left: Vec.create(29, -39),
                    right: Vec.create(44, 35)
                },
                image: {
                    position: Vec.create(42, 66),
                    angle: 135
                }
            }
        ]
    },
    {
        idString: "maul",
        name: "Maul",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.S,
        damage: 54,
        speedMultiplier: 1,
        iceMultiplier: 5,
        swingSound: "heavy_swing",
        obstacleMultiplier: 2,
        stonePiercing: true,
        piercingMultiplier: 1,
        radius: 2.7,
        offset: Vec.create(5.4, -0.5),
        cooldown: 450,
        hitDelay: 180,
        fists: {
            animationDuration: 150,
            left: Vec.create(40, -25),
            right: Vec.create(40, 15)
        },
        image: {
            angle: 135,
            position: Vec.create(40, 20),
            lootScale: 0.6
        },
        animation: [
            { // warmup
                duration: 100,
                fists: {
                    left: Vec.create(40, 25),
                    right: Vec.create(0, 50)
                },
                image: {
                    angle: 210,
                    position: Vec.create(-10, 45)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(0, -50),
                    right: Vec.create(40, -25)
                },
                image: {
                    angle: 65,
                    position: Vec.create(40, -25)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(40, -25),
                    right: Vec.create(40, 15)
                },
                image: {
                    angle: 135,
                    position: Vec.create(40, 20)
                }
            }
        ]
    },
    {
        idString: "steelfang",
        name: "Steelfang",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.S,
        devItem: true,
        noSwap: true,
        damage: 40,
        noDrop: true,
        stonePiercing: true,
        speedMultiplier: 1,
        obstacleMultiplier: 1,
        piercingMultiplier: 1,
        radius: 2.7,
        offset: Vec.create(3.1, 0.9),
        cooldown: 200,
        wearerAttributes: {
            passive: {
                speedBoost: 1.1
            }
        },
        fists: {
            animationDuration: 150,
            left: Vec.create(38, -35),
            right: Vec.create(30, 40)
        },
        image: {
            position: Vec.create(55, 55),
            angle: -120,
            lootScale: 0.9
        },
        animation: [
            {
                duration: 150,
                fists: {
                    left: Vec.create(35, -40),
                    right: Vec.create(75, -20)
                },
                image: {
                    angle: -800,
                    position: Vec.create(80, -25)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(30, 40)
                },
                image: {
                    angle: -120,
                    position: Vec.create(55, 55)
                }
            }
        ]
    },
    {
        idString: "gas_can",
        name: "Gas Can",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.S,
        damage: 22,
        speedMultiplier: 1,
        obstacleMultiplier: 1,
        radius: 1.75,
        offset: Vec.create(3.1, 0.5),
        cooldown: 250,
        image: {
            position: Vec.create(54, 35),
            lootScale: 0.8,
            separateWorldImage: true
        },
        fists: {
            animationDuration: 125,
            left: Vec.create(38, -35),
            right: Vec.create(38, 35)
        },
        animation: [
            {
                duration: 125,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(75, 10)
                },
                image: {
                    angle: 0,
                    position: Vec.create(91, 10)
                }
            },
            {
                duration: 125,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35)
                },
                image: {
                    angle: 0,
                    position: Vec.create(54, 35)
                }
            }
        ]
    },
    {
        idString: "heap_sword",
        name: "HE-AP sword",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.S,
        devItem: true,
        noSwap: true,
        damage: 75,
        speedMultiplier: 1,
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
            right: Vec.create(38, 35)
        },
        image: {
            position: Vec.create(102, 35),
            angle: 50,
            lootScale: 0.6
        },
        animation: [
            {
                duration: 150,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(120, 20)
                },
                image: {
                    angle: -20,
                    position: Vec.create(140, -30)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35)
                },
                image: {
                    angle: 50,
                    position: Vec.create(102, 35)
                }
            }
        ]
    },
    {
        idString: "ice_pick",
        name: "Ice Pick",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.S,
        swingSound: "heavy_swing",
        damage: 40,
        speedMultiplier: 1,
        obstacleMultiplier: 1.9,
        piercingMultiplier: 1,
        iceMultiplier: 5,
        radius: 2.8,
        offset: Vec.create(5.4, -0.5),
        cooldown: 350,
        hitDelay: 180,
        fists: {
            animationDuration: 150,
            left: Vec.create(40, -30),
            right: Vec.create(40, 10)
        },
        image: {
            position: Vec.create(47, 25),
            angle: 130,
            lootScale: 0.6
        },
        animation: [
            { // warmup
                duration: 100,
                fists: {
                    left: Vec.create(40, 25),
                    right: Vec.create(0, 50)
                },
                image: {
                    angle: 210,
                    position: Vec.create(-10, 45)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(0, -50),
                    right: Vec.create(40, -25)
                },
                image: {
                    position: Vec.create(47, -25),
                    angle: 65
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(40, -30),
                    right: Vec.create(40, 10)
                },
                image: {
                    position: Vec.create(47, 25),
                    angle: 135
                }
            }
        ]
    },
    {
        idString: "seax",
        name: "Seax",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.A,
        damage: 45,
        swingSound: "heavy_swing",
        speedMultiplier: 1,
        obstacleMultiplier: 1.5,
        radius: 2.7,
        offset: Vec.create(5.4, -0.5),
        cooldown: 410,
        fists: {
            animationDuration: 150,
            left: Vec.create(38, -35),
            right: Vec.create(38, 35)
        },
        image: {
            position: Vec.create(80, 32),
            angle: 35,
            lootScale: 0.7
        },
        animation: [
            {
                duration: 150,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(95, 20)
                },
                image: {
                    angle: 0,
                    position: Vec.create(130, -9)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35)
                },
                image: {
                    angle: 35,
                    position: Vec.create(80, 32)
                }
            }
        ]
    },
    {
        idString: "falchion",
        name: "Falchion",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.B,
        damage: 41,
        swingSound: "soft_swing",
        speedMultiplier: 1,
        obstacleMultiplier: 1.1,
        radius: 4.1,
        // maxTargets: Infinity, - TODO: It must hit multiple targets at once, however enabling this causes melee through wall bug to appear
        offset: Vec.create(7.2, 0.5),
        piercingMultiplier: 0.95,
        cooldown: 450,
        fists: {
            animationDuration: 150,
            left: Vec.create(38, -35),
            right: Vec.create(43.5, 41.5)
        },
        image: {
            position: Vec.create(5, 90),
            angle: 170,
            lootScale: 0.6
        },
        animation: [
            {
                duration: 150,
                fists: {
                    left: Vec.create(0, -50),
                    right: Vec.create(43.5, -25)
                },
                image: {
                    angle: 25,
                    position: Vec.create(108, -25)
                }
            },
            {
                duration: 150,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(43.5, 41.5)
                },
                image: {
                    angle: 170,
                    position: Vec.create(5, 90)
                }
            }
        ]
    },
    {
        idString: "chainsaw",
        name: "Chain Saw",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.S,
        fireMode: FireMode.Auto,
        devItem: true,
        noSwap: true,
        damage: 25,
        speedMultiplier: 1,
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
            right: Vec.create(35, 70)
        },
        image: {
            position: Vec.create(106, 27),
            angle: 10,
            lootScale: 0.5,
            animated: true
        },
        animation: [
            {
                duration: 10,
                fists: {
                    left: Vec.create(57, 10),
                    right: Vec.create(31, 70)
                },
                image: {
                    angle: 10,
                    position: Vec.create(106, 27)
                }
            },
            {
                duration: 10,
                fists: {
                    left: Vec.create(61, 10),
                    right: Vec.create(35, 70)
                },
                image: {
                    angle: 10,
                    position: Vec.create(106, 27)
                }
            }
        ]
    },
    {
        idString: "pan",
        name: "Pan",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.S,
        damage: 65,
        swingSound: "heavy_swing",
        hitSound: "pan_hit",
        speedMultiplier: 1,
        obstacleMultiplier: 1.5,
        radius: 2.7,
        offset: Vec.create(5.5, 2),
        cooldown: 800,
        reflectiveSurface: {
            pointA: Vec.create(3.55, -2),
            pointB: Vec.create(2.6, 0.66)
        },
        onBack: {
            angle: 35,
            position: Vec.create(-45, 30),
            reflectiveSurface: {
                pointA: Vec.create(-2.83, 0.96),
                pointB: Vec.create(-0.35, 2.62)
            }
        },
        fists: {
            animationDuration: 200,
            left: Vec.create(38, -35),
            right: Vec.create(45, 35)
        },
        image: {
            separateWorldImage: true,
            angle: -70,
            position: Vec.create(60, 4),
            lootScale: 0.9
        },
        animation: [

            {
                duration: 200,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(65, 55)
                },
                image: {
                    angle: 15,
                    position: Vec.create(105, 65)
                }
            },
            {
                duration: 200,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(45, 35)
                },
                image: {
                    angle: -70,
                    position: Vec.create(60, 4)
                }
            }
        ]
    },
    {
        idString: "kukri",
        name: "Kukri",
        defType: DefinitionType.Melee,
        itemType: ItemType.Melee,
        tier: Tier.A,
        swingSound: "soft_swing",
        hitSound: "kukri_stab",
        damage: 40,
        speedMultiplier: 1,
        obstacleMultiplier: 1,
        radius: 2.5,
        iceMultiplier: 0.1,
        offset: Vec.create(4.25, -0.8),
        cooldown: 350,
        fists: {
            animationDuration: 150,
            left: Vec.create(38, -35),
            right: Vec.create(0, 45)
        },
        image: {
            position: Vec.create(45, 45),
            angle: 50,
            lootScale: 0.75
        },
        hitDelay: 100,
        animation: [
            { // warmup
                duration: 100,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(-5, 48)
                },
                image: {
                    position: Vec.create(24, 76),
                    angle: 95
                }
            },
            {
                duration: 95,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(60, 10)
                },
                image: {
                    position: Vec.create(85, -25),
                    angle: -5
                }
            },
            {
                duration: 95,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(0, 45)
                },
                image: {
                    position: Vec.create(45, 45),
                    angle: 50
                }
            }
        ]
    }
]);
