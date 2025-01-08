import { type UserConfig } from "vite";
import { spritesheet } from "./vite-spritesheet-plugin/spritesheet-plugin";

export default (): UserConfig => ({
    server: {
        port: 3000,
        strictPort: true,
        host: "0.0.0.0"

    },
    preview: {
        port: 3000,
        strictPort: true,
        host: "0.0.0.0"
    },

    define: {
        API_URL: JSON.stringify("http://localhost:8080/api")
    },

    plugins: [spritesheet(true)]
});
