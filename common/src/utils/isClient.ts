if (typeof window === "undefined") {
    // @ts-expect-error global variable init
    global.IS_CLIENT = false;
}
