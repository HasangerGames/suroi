export const Config = {
    regions: {
        dev: { name: "Local Server", soloAddress: "127.0.0.1:8000", duoAddress: "127.0.0.1:8000", https: false },
        na: { name: "North America", soloAddress: "na.suroi.io", https: true },
        eu: { name: "Europe", soloAddress: "eu.suroi.io", https: true },
        sa: { name: "South America", soloAddress: "sa.suroi.io", https: true },
        as: { name: "Asia", soloAddress: "as.suroi.io", https: true }
    },
    defaultRegion: "na",
    mode: "normal"
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    readonly regions: Record<string, {
        readonly name: string
        readonly soloAddress: string
        readonly duoAddress?: string
        readonly https: boolean
    }>
    readonly defaultRegion: string
    readonly mode: string
}
