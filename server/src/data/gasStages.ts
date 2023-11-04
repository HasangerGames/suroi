import { GasState } from "../../../common/src/constants";

export interface GasStage {
    readonly state: GasState
    readonly duration: number
    readonly oldRadius: number
    readonly newRadius: number
    readonly dps: number
    readonly preventJoin?: boolean
}

export const GasStages: GasStage[] = [
    {
        state: GasState.Inactive,
        duration: 0,
        oldRadius: 1024,
        newRadius: 1024,
        dps: 0
    },
    {
        state: GasState.Waiting,
        duration: 80,
        oldRadius: 1024,
        newRadius: 512,
        dps: 0
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 1024,
        newRadius: 512,
        dps: 0.5
    },
    {
        state: GasState.Waiting,
        duration: 60,
        oldRadius: 512,
        newRadius: 320,
        dps: 1,
        preventJoin: true
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 512,
        newRadius: 320,
        dps: 1.5
    },
    {
        state: GasState.Waiting,
        duration: 40,
        oldRadius: 320,
        newRadius: 128,
        dps: 2
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 320,
        newRadius: 128,
        dps: 3
    },
    {
        state: GasState.Waiting,
        duration: 30,
        oldRadius: 128,
        newRadius: 64,
        dps: 3.5
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
        duration: 5,
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

// console.log(GasStages.reduce((a, b) => a + b.duration, 0));
