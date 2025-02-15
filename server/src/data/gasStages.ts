import { GasState } from "@common/constants";

export interface GasStage {
    readonly state: GasState
    readonly duration: number
    readonly oldRadius: number
    readonly newRadius: number
    readonly dps: number
    readonly summonAirdrop?: boolean
    readonly preventJoin?: boolean
}

export const GasStages: GasStage[] = [
    {
        state: GasState.Inactive,
        duration: 0,
        oldRadius: 0.76,
        newRadius: 0.76,
        dps: 0
    },
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.76,
        newRadius: 0.55,
        dps: 0
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 0.76,
        newRadius: 0.55,
        dps: 1,
        preventJoin: true
    },
    // Zone 1 closed, 1 min 5 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.55,
        newRadius: 0.43,
        dps: 1,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 0.55,
        newRadius: 0.43,
        dps: 1
    },
    // Zone 2 closed, 2 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.43,
        newRadius: 0.32,
        dps: 2
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.43,
        newRadius: 0.32,
        dps: 2
    },
    // Zone 3 closed, 3 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.32,
        newRadius: 0.2,
        dps: 3,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.32,
        newRadius: 0.2,
        dps: 3
    },
    // Zone 4 closed, 4 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.2,
        newRadius: 0.09,
        dps: 5
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.2,
        newRadius: 0.09,
        dps: 5
    },
    // Zone 5 closed, 5 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 20,
        oldRadius: 0.09,
        newRadius: 0,
        dps: 10,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 60,
        oldRadius: 0.09,
        newRadius: 0,
        dps: 10
    },
    // Final Zone Closed, 6 min 30 seconds
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: 0,
        newRadius: 0,
        dps: 10
    }
];

// console.log(GasStages.length);
// console.log(GasStages.reduce((a, b) => a + b.duration, 0));
