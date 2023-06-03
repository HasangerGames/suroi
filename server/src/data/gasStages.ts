import { GasMode } from "../../../common/src/constants";

export interface GasStage {
    mode: GasMode
    duration: number
    oldRadius: number
    newRadius: number
    dps: number
}

export const GasStages: GasStage[] = [
    {
        mode: GasMode.Inactive,
        duration: 0,
        oldRadius: 512,
        newRadius: 512,
        dps: 0
    },
    {
        mode: GasMode.Waiting,
        duration: 60,
        oldRadius: 512,
        newRadius: 256,
        dps: 0
    },
    {
        mode: GasMode.Advancing,
        duration: 20,
        oldRadius: 512,
        newRadius: 256,
        dps: 0.5
    },
    {
        mode: GasMode.Waiting,
        duration: 30,
        oldRadius: 256,
        newRadius: 128,
        dps: 1
    },
    {
        mode: GasMode.Advancing,
        duration: 15,
        oldRadius: 256,
        newRadius: 128,
        dps: 1.5
    },
    {
        mode: GasMode.Waiting,
        duration: 20,
        oldRadius: 128,
        newRadius: 64,
        dps: 2
    },
    {
        mode: GasMode.Advancing,
        duration: 10,
        oldRadius: 128,
        newRadius: 64,
        dps: 2.5
    },
    {
        mode: GasMode.Waiting,
        duration: 15,
        oldRadius: 64,
        newRadius: 16,
        dps: 3
    },
    {
        mode: GasMode.Advancing,
        duration: 5,
        oldRadius: 64,
        newRadius: 16,
        dps: 3.5
    },
    {
        mode: GasMode.Waiting,
        duration: 10,
        oldRadius: 16,
        newRadius: 0,
        dps: 4
    },
    {
        mode: GasMode.Advancing,
        duration: 5,
        oldRadius: 16,
        newRadius: 0,
        dps: 4.5
    },
    {
        mode: GasMode.Waiting,
        duration: 0,
        oldRadius: 0,
        newRadius: 0,
        dps: 5
    }
];
