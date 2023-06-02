import { GasMode } from "../../../common/src/constants";

export interface GasStage {
    mode: GasMode
    duration: number
    oldRadius: number
    newRadius: number
    damage: number
}

export const GasStages: GasStage[] = [
    {
        mode: GasMode.Inactive,
        duration: 0,
        oldRadius: 512,
        newRadius: 512,
        damage: 0
    },
    {
        mode: GasMode.Waiting,
        duration: 60,
        oldRadius: 512,
        newRadius: 256,
        damage: 0
    },
    {
        mode: GasMode.Advancing,
        duration: 20,
        oldRadius: 512,
        newRadius: 256,
        damage: 1
    },
    {
        mode: GasMode.Waiting,
        duration: 30,
        oldRadius: 256,
        newRadius: 128,
        damage: 1.5
    },
    {
        mode: GasMode.Advancing,
        duration: 15,
        oldRadius: 256,
        newRadius: 128,
        damage: 2
    },
    {
        mode: GasMode.Waiting,
        duration: 20,
        oldRadius: 128,
        newRadius: 64,
        damage: 2.5
    },
    {
        mode: GasMode.Advancing,
        duration: 10,
        oldRadius: 128,
        newRadius: 64,
        damage: 3
    },
    {
        mode: GasMode.Waiting,
        duration: 10,
        oldRadius: 128,
        newRadius: 64,
        damage: 2.5
    },
    {
        mode: GasMode.Advancing,
        duration: 10,
        oldRadius: 128,
        newRadius: 64,
        damage: 3
    }
];
