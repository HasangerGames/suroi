export type Orientation = 0 | 1 | 2 | 3;
export type Variation = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type GetGameResponse =
    {
        readonly success: true
        readonly gameID: number
    } |
    {
        readonly success: false
        readonly message?: "warn" | "temp" | "perma" | "vpn"
        readonly reason?: string
        readonly reportID?: string
    };

export const enum CustomTeamMessages {
    Join,
    Update,
    Settings,
    Start,
    Started
}

export interface CustomTeamPlayerInfo {
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
    }
    | {
        type: CustomTeamMessages.Update
        players: CustomTeamPlayerInfo[]
        isLeader: boolean
        ready: boolean
    }
    | {
        type: CustomTeamMessages.Settings
        autoFill?: boolean
        locked?: boolean
    }
    | {
        type: CustomTeamMessages.Start | CustomTeamMessages.Started
    };
