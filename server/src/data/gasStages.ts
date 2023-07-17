import { GasState } from "../../../common/src/constants";

export interface GasStage {
    state: GasState
    duration: number
    oldRadius: number
    newRadius: number
    dps: number
    preventJoin?: boolean
}

export const GasStages: GasStage[] = [
    {
        state: GasState.Inactive,
        duration: 0,
        oldRadius: 750,
        newRadius: 750,
        dps: 0
    },
    {
        state: GasState.Waiting,
        duration: 60,
        oldRadius: 750,
        newRadius: 420,
        dps: 0
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 750,
        newRadius: 420,
        dps: 0.5
    },
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 420,
        newRadius: 250,
        dps: 1
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 420,
        newRadius: 250,
        dps: 1.5
    },
    {
        state: GasState.Waiting,
        duration: 30,
        oldRadius: 250,
        newRadius: 128,
        dps: 2
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 250,
        newRadius: 128,
        dps: 3
    },
    {
        state: GasState.Waiting,
        duration: 20,
        oldRadius: 128,
        newRadius: 64,
        dps: 3.5,
        preventJoin: true
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 128,
        newRadius: 64,
        dps: 4
    },
    {
        state: GasState.Waiting,
        duration: 15,
        oldRadius: 64,
        newRadius: 32,
        dps: 5
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 64,
        newRadius: 32,
        dps: 6
    },
    {
        state: GasState.Waiting,
        duration: 10,
        oldRadius: 32,
        newRadius: 0,
        dps: 7
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 32,
        newRadius: 0,
        dps: 8
    },
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: 0,
        newRadius: 0,
        dps: 9
    }
];
