import { GasState } from "../../../common/src/constants";

export interface GasStage {
    state: GasState
    duration: number
    oldRadius: number
    newRadius: number
    dps: number
}

export const GasStages: GasStage[] = [
    {
        state: GasState.Inactive,
        duration: 0,
        oldRadius: 512,
        newRadius: 512,
        dps: 0
    },
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 512,
        newRadius: 256,
        dps: 0
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 512,
        newRadius: 256,
        dps: 1
    },
    {
        state: GasState.Waiting,
        duration: 30,
        oldRadius: 256,
        newRadius: 128,
        dps: 2
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 256,
        newRadius: 128,
        dps: 3
    },
    {
        state: GasState.Waiting,
        duration: 20,
        oldRadius: 128,
        newRadius: 64,
        dps: 4
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 128,
        newRadius: 64,
        dps: 5
    },
    {
        state: GasState.Waiting,
        duration: 15,
        oldRadius: 64,
        newRadius: 16,
        dps: 6
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 64,
        newRadius: 32,
        dps: 7
    },
    {
        state: GasState.Waiting,
        duration: 10,
        oldRadius: 32,
        newRadius: 0,
        dps: 8
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 32,
        newRadius: 3,
        dps: 9
    },
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: 3,
        newRadius: 3,
        dps: 10
    }
];
