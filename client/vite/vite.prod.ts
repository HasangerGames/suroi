import { type UserConfig } from "vite";
import { spritesheet } from "./vite-spritesheet-plugin/spritesheet-plugin";

export default (): UserConfig => ({
    define: {
        API_URL: JSON.stringify("/api")
    },
    plugins: [spritesheet(false)]
});
