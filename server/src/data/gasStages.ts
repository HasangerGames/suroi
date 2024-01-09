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
        newRadius: 0.381,
        dps: 0,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 0.762,
        newRadius: 0.381,
        dps: 0.5
    },
    {
        state: GasState.Waiting,
        duration: 60,
        oldRadius: 0.381,
        newRadius: 0.238,
        dps: 1
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.381,
        newRadius: 0.238,
        dps: 1.5
    },
    {
        state: GasState.Waiting,
        duration: 40,
        oldRadius: 0.238,
        newRadius: 0.095,
        dps: 2,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 0.238,
        newRadius: 0.095,
        dps: 3
    },
    {
        state: GasState.Waiting,
        duration: 30,
        oldRadius: 0.095,
        newRadius: 0.048,
        dps: 3.5
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 0.095,
        newRadius: 0.048,
        dps: 4
    },
    {
        state: GasState.Waiting,
        duration: 20,
        oldRadius: 0.048,
        newRadius: 0.024,
        dps: 5
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 0.048,
        newRadius: 0.024,
        dps: 6
    },
    {
        state: GasState.Waiting,
        duration: 10,
        oldRadius: 0.024,
        newRadius: 0,
        dps: 7
    },
    {
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 0.024,
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
