import type { ClientAndGeneralConfig } from "../../../../vite/config-plugin";

const config = (await import("virtual:suroi-config")).default as ClientAndGeneralConfig;
export const c = config.client;
export const g = config.general;
