import { Howl } from "howler";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { Guns } from "../../../../common/src/definitions/guns";
import { FloorType } from "../../../../common/src/definitions/buildings";
import { HealingItems } from "../../../../common/src/definitions/healingItems";

export interface SoundDefinition {
    soundId: string
    soundPath: string
}

export class SoundManagerClass {
    sounds: Record<string, SoundDefinition>;

    constructor() {
        this.sounds = {};
    }

    load(soundId: string, soundPath: string): void {
        this.sounds[soundId] = { soundId, soundPath };
    }

    play(soundId: string): void {
        const sound = this.sounds[soundId];
        if (sound) {
            const soundObject = new Howl({
                src: [`${sound.soundPath}.mp3`]
            });
            soundObject.play();
        } else {
            console.error(`Sound with soundId "${soundId}" not found.`);
        }
    }
}

export default function loadSounds(SoundManager: SoundManagerClass): void {
    for (const material of Materials) {
        SoundManager.load(`${material}_hit_1`, `audio/sfx/hits/${material}_hit_1`);
        SoundManager.load(`${material}_hit_2`, `audio/sfx/hits/${material}_hit_2`);
        SoundManager.load(`${material}_destroyed`, `audio/sfx/hits/${material}_destroyed`);
    }

    for (const gun of Guns) {
        SoundManager.load(`${gun.idString}_fire`, `audio/sfx/weapons/${gun.idString}_fire`);
        SoundManager.load(`${gun.idString}_switch`, `audio/sfx/weapons/${gun.idString}_switch`);
        SoundManager.load(`${gun.idString}_reload`, `audio/sfx/weapons/${gun.idString}_reload`);
    }

    for (const healingItem of HealingItems) {
        SoundManager.load(healingItem.idString, `audio/sfx/healing/${healingItem.idString}`);
    }

    // funny hack to load sounds based on the strings of an enum :)
    for (const floorType of Object.keys(FloorType)) {
        if (floorType.length > 1) {
            const floorName = floorType.toLowerCase();

            SoundManager.load(`${floorName}_step_1`, `audio/sfx/footsteps/${floorName}_1`);
            SoundManager.load(`${floorName}_step_2`, `audio/sfx/footsteps/${floorName}_2`);
        }
    }

    const soundsToLoad = [
        [
            "audio/sfx/pickup",
            "pickup"
        ],
        [
            "audio/sfx/gun_click",
            "gun_click"
        ],
        [
            "audio/sfx/swing",
            "swing"
        ],
        [
            "audio/sfx/emote",
            "emote"
        ],
        [
            "audio/sfx/door_open",
            "door_open"
        ],
        [
            "audio/sfx/door_close",
            "door_close"
        ],
        [
            "audio/sfx/ceiling_collapse",
            "ceiling_collapse"
        ]
    ];

    for (const sound of soundsToLoad) {
        SoundManager.load(sound[1], sound[0]);
    }

    SoundManager.load("player_hit_1", "audio/sfx/hits/player_hit_1");
    SoundManager.load("player_hit_2", "audio/sfx/hits/player_hit_2");
}
