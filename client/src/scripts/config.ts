export interface ConfigType {
    readonly regions: Record<string, {
        name: string
        address: string
        https: boolean
    }>
    readonly defaultRegion: string
}

export const Config = {
    regions: {
        dev: { name: "Local Server", address: "127.0.0.1:8000", https: false },
        na: { name: "North America (Detroit)", address: "suroi.io", https: true },
        eu: { name: "Europe (Berlin)", address: "eu.suroi.io", https: true },
        sa: { name: "South America (São Paulo)", address: "sa.suroi.io", https: true },
        as: { name: "Asia (Osaka)", address: "as.suroi.io", https: true }
    },
    defaultRegion: "na"
} satisfies ConfigType as ConfigType;
