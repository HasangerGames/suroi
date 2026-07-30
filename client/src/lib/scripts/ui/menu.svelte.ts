import { invalidate } from "$app/navigation";
import { GameConstants } from "$common/constants";
import { GameInfo } from "$common/schemas/api/games";
import type { GameMode, Region, TeamMode } from "$common/schemas/misc";
import { pickRandomInArray } from "$common/utils/random";
import { m } from "$lib/paraglide/messages";
import pkg from "../../../../../package.json";
import { Config } from "../utils/config";

export const menuUi = $state<{
    state: "menu" | "connecting" | "inGame";

    skinIdString: string;
    nickname: string;

    background?: { filename: string, artist: string };
    marqueeText?: string;

    noBlur?: boolean;

    showHardwareAccelWarning?: boolean;
    showRotateMessage?: boolean;

    connectingText?: string;
    serverError?: string;

    newRegion: Region;
    newGameMode: GameMode;
    newTeamMode: TeamMode;

    selectedGameId?: string;
}>({
    state: "menu",

    skinIdString: GameConstants.player.defaultSkin,
    nickname: GameConstants.player.defaultName,

    newRegion: Config.defaultRegion,
    newGameMode: "normal",
    newTeamMode: "solo",
});

export let joinGame: (gameInfo: GameInfo) => Promise<void>;
export function setJoinGame(value: (gameInfo: GameInfo) => Promise<void>): void {
    joinGame = value;
}

export let endGame: () => void;
export function setEndGame(value: () => void): void {
    endGame = value;
}

export let updateNickname: () => void;
export function setUpdateNickname(value: () => void): void {
    updateNickname = value;
}

let lastPlayButtonClickTime = 0;
export async function play(games: GameInfo[]) {
    if (menuUi.state !== "menu") return;

    // Play button rate limit
    const now = Date.now();
    if (now - lastPlayButtonClickTime < 1500) return;
    lastPlayButtonClickTime = now;

    menuUi.state = "connecting";

    function serverError(message: string): void {
        menuUi.state = "menu";
        menuUi.serverError = message;
        invalidate("app:games");
    }

    let gameInfo: GameInfo | undefined;
    if (menuUi.selectedGameId === "new") {
        try {
            menuUi.connectingText = m.loading_creating_game();
            const response = await fetch(`${Config.regions[menuUi.newRegion].mainAddress}/api/game/new/${menuUi.newGameMode}/${menuUi.newTeamMode}`);
            gameInfo = {
                ...GameInfo.parse(await response.json()),
                region: menuUi.newRegion,
            };
        } catch (e) {
            console.error(e);
            serverError(m.error_creating_game());
            return;
        }
    } else if (menuUi.selectedGameId !== undefined) {
        gameInfo = games.find(game => game.id === menuUi.selectedGameId);
    }

    menuUi.selectedGameId = undefined;

    if (!gameInfo) {
        serverError(m.error_finding_game());
        return;
    }

    menuUi.connectingText = m.loading_connecting();
    await joinGame(gameInfo);
}

export function randomBackground(): { filename: string, artist: string } {
    const backgrounds: [string, string][] = [
        ["bridge_duel_precisederp.png", "@PreciseDerp"],
        ["gun_vs_c4_precisederp.png", "@PreciseDerp"],
        ["terrorizer_migraine7341.png", "@migraine7341"],
        ["suroi_moment_migraine7341.png", "@migraine7341"],
        ["tango_51_boeing_777.jpg", "Boeing_777"],
        ["winter_confrontation_yoko.png", "Yoko"],
        ["l115a1_sniper_yoko.png", "Yoko"],
        ["untitled_winter_yoko.png", "Yoko"],
        ["harvest_mode_yoko.png", "Yoko"],
        ["hunted_mode_experience_deviouslemon331.png", "DeviousLemon331"],
        ["monument_j.png", "J"],
        ["rounds_j.png", "J"],
        ["most_average_hunted_day_danzan.png", "danzan"],
        ["infection_yoko.png", "Yoko"],
    ];
    const [filename, artist] = pickRandomInArray(backgrounds);
    return { filename, artist };
}

export function randomMarqueeText(): string {
    return pickRandomInArray([
        "Fat free!",
        "Gluten free!",
        "Tell your friends!",
        "Support queer rights!",
        "Support open source software!",
        "Ad-free!",
        "Free and open source!",
        "Supported by donations!",
        "Still in beta!",
        'This is called a "marquee"!',
        "Kill or be killed!",
        "Accounts before GTA 6!",
        "Circles shooting circles since 2023!",
        "Established 2023!",
        `${new Date().getFullYear() - 2023} years and counting!`,
        "Suroi Sundays!",
        "Hop on Suroi!",
        "We're back, baby!",                              // Title of the first ever Suroi news post
        "Feeling gassy!",                                 // Former title of a Suroi news post
        "Now featuring Fireball and Blueberry Smoothie!", // Skins previously rejected from Suroi for "not fitting the art style"
        "Probably not copyright infringing!",             // Suroi's predecessor, Surviv Reloaded, was taken down for copyright infringement
        "Dr. Giggletouch wuz here",                       // My (AnnihilatingFox) in game name :P
        "Could cause Dwayne!",                            // Suroi inside joke
        "That's just too much realism!",                  // Suroi inside joke
        "Sur.oi Bero Roylae",                             // Suroi/Surviv.io inside joke, origin of the Suroi name
        "Is this thing on?",
        '<span style="background-image: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet); color: transparent; -webkit-background-clip: text;">rainbows are cool</span>',
        "Does anyone even read these?",
        "These are harder to come up with than you might think!",
        "Now in color!",
        `Version ${pkg.version}!`,
        "Now in 2D!",
        "It's not over yet!",
        "Stay positive!",
        "Woo, Linux!",
        "Woo, Inkscape!", // Open source vector graphics software used to make most of Suroi's art
        "Also try Minecraft!",                                          // Game: Terraria
        "Also try Terraria!",                                           // Game: Minecraft
        "I've come to make an announcement!",                           // Meme: Eggman's Announcement
        "Sorry Link, I don't give credit!",                             // Meme: Morshu
        "'Tis but a scratch!",                                          // Show: Monty Python and the Holy Grail
        "9 + 10 = 21!",                                                 // Meme: 9 + 10 = 21/You stupid
        "Never gonna give you up!",                                     // Song: Rick Astley - Never Gonna Give You Up
        "When you need foundation repair, you want foundation repair!", // YouTube: cs188 - [YTP] No one needs foundation repair
        "Did I ever tell you what the definition of insanity is?",      // Game: Far Cry 3
        "Wake up, Mr. Freeman!",                                        // Game: Half-Life 2 (Intro)
        "Galunga!",                                                     // Game: Half-Life 2 (Spoken by Vortigaunts)
        "Nobody hurt me!",                                              // Book: Homer - Odyssey
        "Mayonnaise is not an instrument!",                             // Meme: SpongeBob
        "Please let this be a normal field trip...",                    // Song: Magic School Bus theme
        "Stacy's mom has got it goin' on!",                             // Song: Fountains of Wayne - Stacy's Mom
        "Michaelsoft Binbows!",                                         // Meme: Defunct Japanese computer repair store
        "You're gonna have a bad time!",                                // Game: Undertale
        "Bendgate!",                                                    // Meme: Issue affecting iPhone 6
        "Taste of blood!",                                              // Game: Portal
        "Frankenturrets!",                                              // Game: Portal 2
        "I am not a moron!",                                            // Game: Portal 2
        "I can't believe you've done this!",                            // Meme
        "My new band is called Syskill!",                               // Meme: Catch the Ice Dude
        "Are you sure?",                                                // Show: Invincible
        "Living in an Amish paradise!",                                 // Song: "Weird Al" Yankovic - Amish Paradise
        "Rip and tear!",                                                // Game: Doom
        "Microslop!",                                                   // Meme: Derogatory name for Microsoft
        "Do you know da wae?",                                          // Meme: Ugandan Knuckles
        "Don't you lecture me with your 30 dollar haircut!",            // Show: Dragon Ball Z: Super Android 13!
        "Rock and Stone!",                                              // Game: Deep Rock Galactic
        "FIRE IN THE HOLE!",                                            // Meme: Lobotomy Dash (Geometry Dash)
        "Sustingus!",                                                   // Game: Deltarune Chapter 5 (Flowery voice clip)
        "Sorry to keep you waiting!",                                   // Game: Deltarune Chapter 5 (Flowery voice clip)
        "Flowery!",                                                     // Game: Deltarune Chapter 5 (Flowery voice clip)
        "Hey guys! I think I found a glue!",                            // Game: Deltarune Chapter 5 (Flowery voice clip)
        "Here I come, San Frandiscooo!",                                // Game: Deltarune Chapter 5 (Flowery voice clip)
        "Jarona!",                                                      // Game: Deltarune Chapter 5 (Flowery voice clip)
    ]);
}
