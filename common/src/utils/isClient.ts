// biome-ignore lint/suspicious/noVar: let and const won't work here; only var
declare var IS_CLIENT: boolean;

if (typeof window === "undefined") {
    global.IS_CLIENT = false;
}
