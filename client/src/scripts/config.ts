export const Config = {
    regions: {
        dev: { name: "Local Server", address: "127.0.0.1:8000", https: false },
        na: { name: "US East", address: "na.suroi.io", https: true },
        na2: { name: "US West", address: "na2.suroi.io", https: true },
        eu: { name: "Europe", address: "eu.suroi.io", https: true },
        sa: { name: "South America", address: "sa.suroi.io", https: true },
        as: { name: "Asia", address: "as.suroi.io", https: true }
    },
    defaultRegion: "na"
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    readonly regions: Record<string, {
        name: string
        address: string
        https: boolean
    }>
    readonly defaultRegion: string
}
