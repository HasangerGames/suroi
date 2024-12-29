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
        duration: 60,
        oldRadius: 0.76,
        newRadius: 0.55,
        dps: 0
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 0.76,
        newRadius: 0.55,
        dps: 2
    },
    // Zone 1 closed, 1 min 20 seconds
    {
        state: GasState.Waiting,
        duration: 60,
        oldRadius: 0.55,
        newRadius: 0.38,
        dps: 2,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 0.55,
        newRadius: 0.38,
        dps: 2
    },
    // Zone 2 closed, 2 min 40 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.38,
        newRadius: 0.29,
        dps: 4
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.38,
        newRadius: 0.29,
        dps: 4
    },
    // Zone 3 closed, 3 min 40 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.29,
        newRadius: 0.18,
        dps: 6,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.29,
        newRadius: 0.18,
        dps: 6
    },
    // Zone 4 closed, 4 min 40 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: 0.18,
        newRadius: 0.09,
        dps: 10
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: 0.18,
        newRadius: 0.09,
        dps: 10
    },
    // Zone 5 closed, 5 min 40 seconds
    {
        state: GasState.Waiting,
        duration: 30,
        oldRadius: 0.09,
        newRadius: 0,
        dps: 3.5,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 60,
        oldRadius: 0.09,
        newRadius: 0,
        dps: 20
    },
    // Final Zone Closed, 7 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: 0,
        newRadius: 0,
        dps: 20
    }
];

// console.log(GasStages.length);
// console.log(GasStages.reduce((a, b) => a + b.duration, 0));
