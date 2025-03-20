export type Orientation = 0 | 1 | 2 | 3;
export type Variation = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PlayerModifiers {
    // Multiplicative
    maxHealth: number
    maxAdrenaline: number
    baseSpeed: number
    size: number
    adrenDrain: number

    // Additive
    minAdrenaline: number
    hpRegen: number
}

export interface PunishmentMessage {
    readonly message: "warn" | "temp" | "perma" | "vpn"
    readonly reason?: string
    readonly reportID?: string
}

export const enum CustomTeamMessages {
    Join,
    Update,
    Settings,
    KickPlayer,
    Start,
    Started
}

export interface CustomTeamPlayerInfo {
    id: number
    isLeader?: boolean
    ready: boolean
    name: string
    skin: string
    badge?: string
    nameColor?: number
}

export type CustomTeamMessage =
    | {
        type: CustomTeamMessages.Join
        teamID: string
        isLeader: boolean
        autoFill: boolean
        locked: boolean
        forceStart: boolean
    }
    | {
        type: CustomTeamMessages.Update
        players: CustomTeamPlayerInfo[]
        isLeader: boolean
        ready: boolean
        forceStart: boolean
    }
    | {
        type: CustomTeamMessages.Settings
        autoFill?: boolean
        locked?: boolean
        forceStart?: boolean
    }
    | {
        type: CustomTeamMessages.KickPlayer
        playerId: number
    }
    | {
        type: CustomTeamMessages.Start | CustomTeamMessages.Started
    };
