export const Config = {
    regions: {
        dev: { name: "Local Server", address: "127.0.0.1:8000", https: false },
        na: { name: "North America", address: "na.suroi.io", https: true },
        eu: { name: "Europe", address: "eu.suroi.io", https: true },
        sa: { name: "South America", address: "sa.suroi.io", https: true },
        as: { name: "Asia", address: "as.suroi.io", https: true }
    },
    defaultRegion: "na",
    mode: "normal"
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    readonly regions: Record<string, {
        readonly name: string
        readonly address: string
        readonly https: boolean
    }>
    readonly defaultRegion: string
    readonly mode: string
}
