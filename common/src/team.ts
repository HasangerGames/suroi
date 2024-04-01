export enum CustomTeamMessageType {
    Join,
    PlayerJoin,
    PlayerLeave,
    Settings,
    Start,
    Started
}

export interface CustomTeamPlayerInterface {
    id: number
    isLeader?: boolean
    name: string
    skin: string
    badge?: string
    nameColor?: number
}

export type CustomTeamMessage =
    {
        type: CustomTeamMessageType.Join
        id: number
        teamID: string
        isLeader: boolean
        autoFill: boolean
        locked: boolean
        players: CustomTeamPlayerInterface[]
    } |
    (
        {
            type: CustomTeamMessageType.PlayerJoin
        } & CustomTeamPlayerInterface
    ) |
    {
        type: CustomTeamMessageType.PlayerLeave
        id: number
        newLeaderID?: number
    } |
    {
        type: CustomTeamMessageType.Settings
        autoFill?: boolean
        locked?: boolean
    } |
    {
        type: CustomTeamMessageType.Start
    } | {
        type: CustomTeamMessageType.Started
        gameID: number
    };
