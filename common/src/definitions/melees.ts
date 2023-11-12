import { type FireMode } from "../constants";
import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";

export interface MeleeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Melee

    readonly damage: number
    readonly obstacleMultiplier: number
    readonly piercingMultiplier?: number // If it does less dmg vs pierceable objects than it would vs a normal one
    readonly radius: number
    readonly offset: Vector
    readonly cooldown: number
    readonly speedMultiplier: number
    readonly killstreak?: boolean
    readonly maxTargets: number
    readonly fists: {
        readonly animationDuration: number
        readonly randomFist: boolean
        readonly left: Vector
        readonly right: Vector
        readonly useLeft: Vector
        readonly useRight: Vector
    }
    readonly image?: {
        readonly position: Vector
        readonly usePosition: Vector
        readonly angle?: number
        readonly useAngle?: number
        readonly lootScale?: number
        readonly separateWorldImage?: boolean
    }
    readonly fireMode?: FireMode
}

export const Melees: MeleeDefinition[] = [
    {
        idString: "fists",
        name: "Fists",
        itemType: ItemType.Melee,
        damage: 20,
        obstacleMultiplier: 1,
        radius: 1.5,
        offset: v(2.5, 0),
        cooldown: 250,
        noDrop: true,
        speedMultiplier: 1,
        maxTargets: 1,
        fists: {
            animationDuration: 125,
            randomFist: true,
            left: v(38, -35),
            right: v(38, 35),
            useLeft: v(75, -10),
            useRight: v(75, 10)
        }
    },
    {
        idString: "baseball_bat",
        name: "Baseball Bat",
        itemType: ItemType.Melee,
        damage: 35,
        obstacleMultiplier: 1,
        radius: 3.8,
        offset: v(3.8, 2.2),
        cooldown: 450,
        speedMultiplier: 1,
        maxTargets: 1,
        fists: {
            animationDuration: 150,
            randomFist: false,
            left: v(55, -15),
            right: v(45, 0),
            useLeft: v(28, -15),
            useRight: v(50, -15)
        },
        image: {
            position: v(35, 45),
            usePosition: v(115, -14),
            angle: 155,
            useAngle: 45,
            lootScale: 0.55
        }
    },
    {
        idString: "kbar",
        name: "K-bar",
        itemType: ItemType.Melee,
        damage: 25,
        obstacleMultiplier: 1.25,
        radius: 2.7,
        offset: v(3.1, 0.9),
        cooldown: 200,
        speedMultiplier: 1,
        maxTargets: 1,
        fists: {
            animationDuration: 100,
            randomFist: false,
            left: v(38, -35),
            right: v(38, 35),
            useLeft: v(38, -35),
            useRight: v(70, 20)
        },
        image: {
            position: v(62, 42),
            usePosition: v(90, 8),
            angle: 60,
            useAngle: 5,
            lootScale: 0.8
        }
    },
    {
        idString: "maul",
        name: "Maul",
        itemType: ItemType.Melee,
        damage: 40,
        obstacleMultiplier: 2,
        piercingMultiplier: 1,
        radius: 2.7,
        offset: v(4.9, -1),
        cooldown: 450,
        speedMultiplier: 1,
        maxTargets: 1,
        fists: {
            animationDuration: 150,
            randomFist: false,
            left: v(35, -25),
            right: v(35, 5),
            useLeft: v(35, -15),
            useRight: v(65, -15)
        },
        image: {
            position: v(40, 20),
            usePosition: v(85, -25),
            angle: 135,
            useAngle: 45,
            lootScale: 0.6
        }
    },
    {
        idString: "gas_can",
        name: "Gas Can",
        itemType: ItemType.Melee,
        damage: 22,
        obstacleMultiplier: 1,
        radius: 1.75,
        offset: v(3.1, 0.5),
        cooldown: 250,
        speedMultiplier: 1,
        maxTargets: 1,
        image: {
            position: v(54, 35),
            usePosition: v(91, 10),
            useAngle: 0,
            lootScale: 0.8,
            separateWorldImage: true
        },
        fists: {
            animationDuration: 125,
            randomFist: false,
            left: v(38, -35),
            right: v(38, 35),
            useLeft: v(38, -35),
            useRight: v(75, 10)
        }
    },
    {
        idString: "heap_sword",
        name: "HE-AP sword",
        itemType: ItemType.Melee,
        damage: 75,
        obstacleMultiplier: 2.5,
        piercingMultiplier: 1,
        killstreak: true,
        radius: 4,
        offset: v(5, 0),
        cooldown: 300,
        speedMultiplier: 1,
        maxTargets: Infinity,
        fists: {
            animationDuration: 150,
            randomFist: false,
            left: v(38, -35),
            right: v(38, 35),
            useLeft: v(38, -35),
            useRight: v(120, 20)
        },
        image: {
            position: v(102, 35),
            usePosition: v(140, -30),
            angle: 50,
            useAngle: -20,
            lootScale: 0.6
        }
    }
];
