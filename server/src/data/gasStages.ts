export enum GasMode {
    Inactive, Waiting, Advancing
}

export interface GasStage {
    mode: GasMode
    duration: number
    oldRadius: number
    newRadius: number
    damage: number
}

export const GasStages: GasStage[] = [
    {
        mode: GasMode.Inactive,
        duration: 0,
        oldRadius: 534.6,
        newRadius: 534.6,
        damage: 0
    },
    {
        mode: GasMode.Waiting,
        duration: 80,
        oldRadius: 534.6,
        newRadius: 324,
        damage: 0
    },
    {
        mode: GasMode.Advancing,
        duration: 30,
        oldRadius: 534.6,
        newRadius: 324,
        damage: 1.57
    },
    {
        mode: GasMode.Waiting,
        duration: 65,
        oldRadius: 324,
        newRadius: 225,
        damage: 2.35
    },
    {
        mode: GasMode.Advancing,
        duration: 25,
        oldRadius: 324,
        newRadius: 225,
        damage: 2.35
    },
    {
        mode: GasMode.Waiting,
        duration: 50,
        oldRadius: 225,
        newRadius: 153,
        damage: 3.53
    },
    {
        mode: GasMode.Advancing,
        duration: 20,
        oldRadius: 225,
        newRadius: 153,
        damage: 3.53
    },
    {
        mode: GasMode.Waiting,
        duration: 40,
        oldRadius: 153,
        newRadius: 99,
        damage: 7.45
    },
    {
        mode: GasMode.Advancing,
        duration: 15,
        oldRadius: 153,
        newRadius: 99,
        damage: 7.45
    },
    {
        mode: GasMode.Waiting,
        duration: 30,
        oldRadius: 99,
        newRadius: 54,
        damage: 9.8
    },
    {
        mode: GasMode.Advancing,
        duration: 10,
        oldRadius: 99,
        newRadius: 54,
        damage: 9.8
    },
    {
        mode: GasMode.Waiting,
        duration: 25,
        oldRadius: 54,
        newRadius: 32.4,
        damage: 14.12
    },
    {
        mode: GasMode.Advancing,
        duration: 5,
        oldRadius: 54,
        newRadius: 32.4,
        damage: 14.12
    },
    {
        mode: GasMode.Waiting,
        duration: 20,
        oldRadius: 32.4,
        newRadius: 16.2,
        damage: 22
    },
    {
        mode: GasMode.Advancing,
        duration: 6,
        oldRadius: 32.4,
        newRadius: 16.2,
        damage: 22
    },
    {
        mode: GasMode.Waiting,
        duration: 15,
        oldRadius: 16.2,
        newRadius: 0,
        damage: 22
    },
    {
        mode: GasMode.Advancing,
        duration: 15,
        oldRadius: 16.2,
        newRadius: 0,
        damage: 22
    }
];
