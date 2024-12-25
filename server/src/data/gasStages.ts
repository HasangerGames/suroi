import { GasState } from "@common/constants";

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
        state: GasState.Advancing,
        duration: 5,
        oldRadius: 0.762,
        newRadius: 0,
        dps: 100
    },
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: 0,
        newRadius: 0,
        dps: 100
    }
];

// console.log(GasStages.length);
// console.log(GasStages.reduce((a, b) => a + b.duration, 0));
