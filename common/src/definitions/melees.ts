import { type FireMode } from "../constants";
import { ItemType, type InventoryItemDefinition } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";

export interface MeleeDefinition extends InventoryItemDefinition {
    readonly itemType: ItemType.Melee

    readonly damage: number
    readonly obstacleMultiplier: number
    readonly piercingMultiplier?: number // If it does less dmg vs pierceable objects than it would vs a normal one
    readonly radius: number
    readonly offset: Vector
    readonly cooldown: number
    readonly maxTargets: number
    readonly fists: InventoryItemDefinition["fists"] & {
        readonly animationDuration: number
        readonly randomFist?: boolean
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
        offset: Vec.create(2.5, 0),
        cooldown: 250,
        noDrop: true,
        speedMultiplier: 1,
        maxTargets: 1,
        fists: {
            animationDuration: 125,
            randomFist: true,
            left: Vec.create(38, -35),
            right: Vec.create(38, 35),
            useLeft: Vec.create(75, -10),
            useRight: Vec.create(75, 10)
        }
    },
    {
        idString: "baseball_bat",
        name: "Baseball Bat",
        itemType: ItemType.Melee,
        damage: 35,
        obstacleMultiplier: 1,
        radius: 3.8,
        offset: Vec.create(3.8, 2.2),
        cooldown: 450,
        speedMultiplier: 1,
        maxTargets: 1,
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
        idString: "kbar",
        name: "K-bar",
        itemType: ItemType.Melee,
        damage: 25,
        obstacleMultiplier: 1.25,
        radius: 2.7,
        offset: Vec.create(3.1, 0.9),
        cooldown: 225,
        speedMultiplier: 1,
        maxTargets: 1,
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
        idString: "maul",
        name: "Maul",
        itemType: ItemType.Melee,
        damage: 40,
        obstacleMultiplier: 1.9,
        piercingMultiplier: 1,
        radius: 2.7,
        offset: Vec.create(5.4, -0.5),
        cooldown: 450,
        speedMultiplier: 1,
        maxTargets: 1,
        fists: {
            animationDuration: 150,
            left: Vec.create(40, -25),
            right: Vec.create(40, 15),
            useLeft: Vec.create(35, -35),
            useRight: Vec.create(75, -20)
        },
        image: {
            position: Vec.create(45, 20),
            usePosition: Vec.create(85, -25),
            angle: 135,
            useAngle: 65,
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
        offset: Vec.create(3.1, 0.5),
        cooldown: 250,
        speedMultiplier: 1,
        maxTargets: 1,
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
        itemType: ItemType.Melee,
        damage: 75,
        obstacleMultiplier: 2.5,
        piercingMultiplier: 1,
        killstreak: true,
        radius: 4,
        offset: Vec.create(5, 0),
        cooldown: 300,
        speedMultiplier: 1,
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
        itemType: ItemType.Melee,
        damage: 35,
        obstacleMultiplier: 1.9,
        piercingMultiplier: 1,
        radius: 2.8,
        offset: Vec.create(5.4, -0.5),
        cooldown: 420,
        speedMultiplier: 1,
        maxTargets: 1,
        fists: {
            animationDuration: 150,
            left: Vec.create(40, -30),
            right: Vec.create(40, 10),
            useLeft: Vec.create(33, -36),
            useRight: Vec.create(68, -20)
        },
        image: {
            position: Vec.create(47, 25),
            usePosition: Vec.create(85, -25),
            angle: 130,
            useAngle: 65,
            lootScale: 0.6
        }
    }
];
