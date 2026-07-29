type IconsList = Record<string, () => Promise<unknown>>;
function processIcons(icons: IconsList): IconsList {
    const iconsEntries = Object.entries(icons)
        .map(([path, icon]) => [path.split("/").at(-1)?.slice(0, -".svg".length), icon]);
    return Object.fromEntries(iconsEntries);
}

export const iconModules: Record<string, IconsList> = {
    lucide: processIcons(import.meta.glob("../../../../node_modules/lucide-static/icons/*.svg", { query: "?raw", import: "default" })),
    "simple-icons": processIcons(import.meta.glob("../../../../node_modules/simple-icons/icons/*.svg", { query: "?raw", import: "default" })),
    suroi: processIcons(import.meta.glob("../img/icons/*.svg", { query: "?raw", import: "default" })),
};
