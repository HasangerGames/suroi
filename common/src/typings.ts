export type Orientation = 0 | 1 | 2 | 3;
export type Variation = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type GetGameResponse =
    {
        readonly success: true
        readonly gameID: number
    } |
    {
        readonly success: false
        readonly message?: "warn" | "temp" | "perma"
        readonly reason?: string
        readonly reportID?: string
    };

export enum CustomTeamMessages {
    Join,
    PlayerJoin,
    PlayerLeave,
    Settings,
    Start,
    Started
}

export interface CustomTeamPlayerInfo {
    id: number
    isLeader?: boolean
    name: string
    skin: string
    badge?: string
    nameColor?: number
}

export type CustomTeamMessage =
    {
        type: CustomTeamMessages.Join
        id: number
        teamID: string
        isLeader: boolean
        autoFill: boolean
        locked: boolean
        players: CustomTeamPlayerInfo[]
    } |
    (
        {
            type: CustomTeamMessages.PlayerJoin
        } & CustomTeamPlayerInfo
    ) |
    {
        type: CustomTeamMessages.PlayerLeave
        id: number
        newLeaderID?: number
    } |
    {
        type: CustomTeamMessages.Settings
        autoFill?: boolean
        locked?: boolean
    } |
    {
        type: CustomTeamMessages.Start | CustomTeamMessages.Started
    };
