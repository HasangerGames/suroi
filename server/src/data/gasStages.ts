import { GasState } from "@common/constants";

export interface GasStage {
    readonly state: GasState
    readonly duration: number
    readonly oldRadius: number
    readonly newRadius: number
    readonly dps: number
    readonly summonAirdrop?: boolean
    readonly scaleDamageFactor?: number
    readonly finalStage?: boolean // only affects client side text
}

/**
 * Number of seconds after which players are prevented from joining a game
 */
export const GAME_SPAWN_WINDOW = 84;

type GasOffset={
    minOffset: number
    maxOffset: number
};

export const gasOffset: GasOffset = {
minOffset: 0.4,
maxOffset: 0.6
}

const gasStageRadii: number[] = [
    0.76, // 0
    0.55, // 1
    0.43, // 2
    0.32, // 3
    0.2,  // 4
    0.09, // 5
    0     // 6
];

export const GasStages: GasStage[] = [
    {
        state: GasState.Inactive,
        duration: 0,
        oldRadius: gasStageRadii[0],
        newRadius: gasStageRadii[0],
        dps: 0
    },
    {
        state: GasState.Waiting,
        duration: 75,
        oldRadius: gasStageRadii[0],
        newRadius: gasStageRadii[1],
        dps: 0
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: gasStageRadii[0],
        newRadius: gasStageRadii[1],
        dps: 1
    },
    // Zone 1 closed, 1 min 5 seconds
    {
        state: GasState.Waiting,
        duration: 45,
        oldRadius: gasStageRadii[1],
        newRadius: gasStageRadii[2],
        dps: 1,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: gasStageRadii[1],
        newRadius: gasStageRadii[2],
        dps: 1
    },
    // Zone 2 closed, 2 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 40,
        oldRadius: gasStageRadii[2],
        newRadius: gasStageRadii[3],
        dps: 2
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: gasStageRadii[2],
        newRadius: gasStageRadii[3],
        dps: 2
    },
    // Zone 3 closed, 3 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 35,
        oldRadius: gasStageRadii[3],
        newRadius: gasStageRadii[4],
        dps: 3,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: gasStageRadii[3],
        newRadius: gasStageRadii[4],
        dps: 3
    },
    // Zone 4 closed, 4 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 30,
        oldRadius: gasStageRadii[4],
        newRadius: gasStageRadii[5],
        dps: 5
    },
    {
        state: GasState.Advancing,
        duration: 15,
        oldRadius: gasStageRadii[4],
        newRadius: gasStageRadii[5],
        dps: 5
    },
    // Zone 5 closed, 5 min 10 seconds
    {
        state: GasState.Waiting,
        duration: 20,
        oldRadius: gasStageRadii[5],
        newRadius: gasStageRadii[6],
        dps: 10,
        summonAirdrop: true,
        scaleDamageFactor: 1,
        finalStage: true
    },
    {
        state: GasState.Advancing,
        duration: 60,
        oldRadius: gasStageRadii[5],
        newRadius: gasStageRadii[6],
        dps: 10,
        scaleDamageFactor: 1,
        finalStage: true
    },
    // Final Zone Closed, 6 min 30 seconds
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: gasStageRadii[6],
        newRadius: gasStageRadii[6],
        dps: 10,
        scaleDamageFactor: 1,
        finalStage: true
    }
];

// console.log(GasStages.length);
// console.log(GasStages.reduce((a, b) => a + b.duration, 0));
