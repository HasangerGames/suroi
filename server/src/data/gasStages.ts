import { GasState } from "../../../common/src/constants";

export interface GasStage {
    readonly state: GasState
    readonly duration: number
    readonly oldRadius: number
    readonly newRadius: number
    readonly dps: number
    readonly summonAirdrop?: boolean
}

export const GasStages: GasStage[] = [
    {
        state: GasState.Inactive,
        duration: 0,
        oldRadius: 0.762,
        newRadius: 0.762,
        dps: 0,
        summonAirdrop: true
    },
    {
        state: GasState.Waiting,
        duration: 80,
        oldRadius: 0.762,
        newRadius: 0.5,
        dps: 0,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 0.762,
        newRadius: 0.5,
        dps: 1
    },
    {
        state: GasState.Waiting,
        duration: 60,
        oldRadius: 0.5,
        newRadius: 0.32,
        dps: 2
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.5,
        newRadius: 0.3,
        dps: 3
    },
    {
        state: GasState.Waiting,
        duration: 40,
        oldRadius: 0.3,
        newRadius: 0.15,
        dps: 4,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 0.3,
        newRadius: 0.15,
        dps: 6
    },
    {
        state: GasState.Waiting,
        duration: 30,
        oldRadius: 0.15,
        newRadius: 0.06,
        dps: 7
    },
    {
        state: GasState.Advancing,
        duration: 8,
        oldRadius: 0.15,
        newRadius: 0.06,
        dps: 8
    },
    {
        state: GasState.Waiting,
        duration: 20,
        oldRadius: 0.06,
        newRadius: 0.03,
        dps: 10
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 0.06,
        newRadius: 0.03,
        dps: 12
    },
    {
        state: GasState.Waiting,
        duration: 10,
        oldRadius: 0.03,
        newRadius: 0,
        dps: 14
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 0.024,
        newRadius: 0,
        dps: 15
    },
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: 0,
        newRadius: 0,
        dps: 16
    }
];

// console.log(GasStages.reduce((a, b) => a + b.duration, 0));
