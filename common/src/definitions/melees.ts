import { FireMode } from "../constants";
import type { WithPartial } from "../utils/misc";
import { ItemType, ObjectDefinitions, type InventoryItemDefinition, type RawDefinition } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";

interface MeleeKeyframe {
    readonly duration: number
    readonly fists: {
        readonly left: Vector
        readonly right: Vector
    }
    readonly image: {
        readonly position: Vector
        readonly angle: number
    }
}

export type MeleeDefinition = InventoryItemDefinition & {
    readonly itemType: ItemType.Melee

    readonly damage: number
    readonly obstacleMultiplier: number
    readonly piercingMultiplier?: number // If it does less dmg vs pierceable objects than it would vs a normal one
    readonly stonePiercing?: boolean
    readonly iceMultiplier?: number
    readonly swingSound: string
    readonly stopSound?: string
    readonly hitSound?: string
    readonly hitDelay?: number
    readonly radius: number
    readonly offset: Vector
    readonly cooldown: number
    readonly maxTargets: number
    readonly reskins?: readonly string[]
    readonly fists: InventoryItemDefinition["fists"] & {
        readonly animationDuration: number
        readonly randomFist?: boolean
    }
    readonly image?: {
        readonly position: Vector
        // no relation to the ZIndexes enum
        readonly zIndex: number
        readonly angle?: number
        readonly pivot?: Vector
        readonly lootScale?: number
        readonly separateWorldImage?: boolean
        readonly animated?: boolean
    }
    readonly animation?: MeleeKeyframe[]
    readonly fireMode: FireMode
    readonly reflectiveSurface?: {
        readonly pointA: Vector
        readonly pointB: Vector
    }
    readonly onBack: {
        readonly angle: number
        readonly position: Vector
        readonly reflectiveSurface?: {
            readonly pointA: Vector
            readonly pointB: Vector
        }
    }
};

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
    ([, , , missing]) => {
        type Missing = typeof missing;
        return ([
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
                swingSound: "heavy_swing",
                damage: 34,
                obstacleMultiplier: 1.5,
                radius: 3.8,
                offset: Vec.create(4.5, 2.2),
                cooldown: 450,
                hitDelay: 150,
                animation: [
                    // {
                    //     duration: 1500,
                    //     fists: {
                    //         left: Vec.create(25, 45),
                    //         right: Vec.create(35, 65)
                    //     },
                    //     image: {
                    //         position: Vec.create(65, 100),
                    //         angle: -260
                    //     }
                    // },
                    { // warmup
                        duration: 150,
                        fists: {
                            left: Vec.create(-40, 35),
                            right: Vec.create(-25, 55)
                        },
                        image: {
                            position: Vec.create(-25, 20),
                            angle: -65
                        }
                    },
                    { // swing
                        duration: 150,
                        fists: {
                            left: Vec.create(50, -5),
                            right: Vec.create(60, -10)
                        },
                        image: {
                            position: Vec.create(65, 27),
                            angle: -350
                        }
                    },
                    {
                        duration: 150,
                        fists: {
                            left: Vec.create(-30, 40),
                            right: Vec.create(-10, 50)
                        },
                        image: {
                            position: Vec.create(-30, 19),
                            angle: -110
                        }
                    }
                ],
                fists: {
                    animationDuration: 150,
                    left: Vec.create(-30, 40),
                    right: Vec.create(-10, 50)
                },
                image: {
                    position: Vec.create(-30, 19),
                    angle: -110,
                    pivot: Vec.create(-20, 50),
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
                    right: Vec.create(38, 35)
                },
                animation: [
                    {
                        duration: 100,
                        fists: {
                            left: Vec.create(75, -10),
                            right: Vec.create(75, 10)
                        },
                        image: {
                            position: Vec.create(80, -25),
                            angle: 65
                        }
                    },
                    {
                        duration: 100,
                        fists: {
                            left: Vec.create(38, -35),
                            right: Vec.create(38, 35)
                        },
                        image: {
                            position: Vec.create(42, 20),
                            angle: 45
                        }
                    }
                ],
                image: {
                    position: Vec.create(42, 20),
                    angle: 45,
                    lootScale: 0.6
                }
            },
            {
                idString: "hatchet",
                name: "Hatchet",
                damage: 45,
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
                animation: [
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
                ],
                image: {
                    position: Vec.create(42, 20),
                    angle: 135,
                    lootScale: 0.6
                }
            },
            {
                idString: "fire_hatchet",
                name: "Fire Hatchet",
                damage: 50,
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
                animation: [
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
                ],
                image: {
                    position: Vec.create(42, 20),
                    angle: 135,
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
                    right: Vec.create(38, 35)
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
                ],
                image: {
                    position: Vec.create(31, 41),
                    angle: 190,
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
                    right: Vec.create(38, 35)
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
                ],
                image: {
                    position: Vec.create(62, 42),
                    angle: 60,
                    lootScale: 0.8
                }
            },
            {
                idString: "sickle",
                name: "Sickle",
                damage: 24,
                swingSound: "soft_swing",
                obstacleMultiplier: 1.3,
                radius: 2.7,
                offset: Vec.create(4, 0),
                cooldown: 175,
                reskins: ["winter"],
                //  fireMode: FireMode.Auto, - todo
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
                        duration: 85,
                        fists: {
                            left: Vec.create(29, -39),
                            right: Vec.create(44, -25)
                        },
                        image: {
                            position: Vec.create(85, -25),
                            angle: 42
                        }
                    },
                    {
                        duration: 85,
                        fists: {
                            left: Vec.create(29, -39),
                            right: Vec.create(44, 35)
                        },
                        image: {
                            position: Vec.create(62, 64),
                            angle: 102
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
                damage: 54,
                iceMultiplier: 5,
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
                animation: [
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
                ],
                image: {
                    position: Vec.create(40, 20),
                    angle: 135,
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
                    right: Vec.create(30, 40)
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
                ],
                image: {
                    position: Vec.create(55, 55),
                    angle: -120,
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
                        duration: 150,
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
                        duration: 150,
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
                    right: Vec.create(38, 35)
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
                ],
                image: {
                    position: Vec.create(102, 35),
                    angle: 50,
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
                fists: {
                    animationDuration: 150,
                    left: Vec.create(40, -30),
                    right: Vec.create(40, 10)
                },
                animation: [
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
                ],
                image: {
                    position: Vec.create(47, 25),
                    angle: 130,
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
                    right: Vec.create(38, 35)
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
                            position: Vec.create(123, -13)
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
                            position: Vec.create(80, 25)
                        }
                    }
                ],
                image: {
                    position: Vec.create(80, 25),
                    angle: 35,
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
                fists: {
                    animationDuration: 150,
                    left: Vec.create(38, -35),
                    right: Vec.create(43.5, 41.5)
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
                ],
                image: {
                    position: Vec.create(5, 90),
                    angle: 170,
                    lootScale: 0.6
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
                    right: Vec.create(35, 70)
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
                ],
                image: {
                    position: Vec.create(106, 27),
                    angle: 10,
                    lootScale: 0.5,
                    animated: true
                }
            },
            {
                idString: "pan",
                name: "Pan",
                damage: 65,
                swingSound: "heavy_swing",
                hitSound: "pan_hit",
                obstacleMultiplier: 1.5,
                radius: 2.7,
                offset: Vec.create(5.5, 0),
                cooldown: 800,
                fists: {
                    animationDuration: 200,
                    left: Vec.create(38, -35),
                    right: Vec.create(45, 35)
                },
                animation: [
                    {
                        duration: 200,
                        fists: {
                            left: Vec.create(38, -35),
                            right: Vec.create(80, -5)
                        },
                        image: {
                            angle: 30,
                            position: Vec.create(115, 18)
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
                ],
                reflectiveSurface: {
                    pointA: Vec.create(3.8, -2.5),
                    pointB: Vec.create(2.5, 1.025)
                },
                onBack: {
                    angle: 35,
                    position: Vec.create(-45, 30),
                    reflectiveSurface: {
                        pointA: Vec.create(-3, 0.8),
                        pointB: Vec.create(0.25, 3)
                    }
                },
                image: {
                    separateWorldImage: true,
                    position: Vec.create(60, 4),
                    angle: -70,
                    lootScale: 0.9
                }
            }
        ] satisfies ReadonlyArray<RawDefinition<WithPartial<Missing, "killfeedFrame">>>).map(v => {
            // @ts-expect-error init code
            v.killfeedFrame ??= v.idString;
            return v as Missing;
        });
    }
);
