import { Howl } from "howler";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { Guns } from "../../../../common/src/definitions/guns";
import { FloorType } from "../../../../common/src/definitions/buildings";
import { HealingItems } from "../../../../common/src/definitions/healingItems";

export class SoundManager {
    sounds: Record<string, Howl>;

    constructor() {
        this.sounds = {};
    }

    load(soundId: string, soundPath: string): void {
        const sound = new Howl({ src: `${soundPath}.mp3` });
        sound.load();
        this.sounds[soundId] = sound;
    }

    play(soundId: string): number {
        const sound = this.sounds[soundId];
        let id: number;
        if (sound) {
            id = sound.play();
        } else {
            console.warn(`Sound with soundId "${soundId}" not found.`);
            id = -1;
        }
        return id;
    }

    get(soundId: string): Howl {
        return this.sounds[soundId];
    }
}

export default function loadSounds(soundManager: SoundManager): void {
    for (const material of Materials) {
        soundManager.load(`${material}_hit_1`, `audio/sfx/hits/${material}_hit_1`);
        soundManager.load(`${material}_hit_2`, `audio/sfx/hits/${material}_hit_2`);
        soundManager.load(`${material}_destroyed`, `audio/sfx/hits/${material}_destroyed`);
    }

    for (const gun of Guns) {
        soundManager.load(`${gun.idString}_fire`, `audio/sfx/weapons/${gun.idString}_fire`);
        soundManager.load(`${gun.idString}_switch`, `audio/sfx/weapons/${gun.idString}_switch`);
        soundManager.load(`${gun.idString}_reload`, `audio/sfx/weapons/${gun.idString}_reload`);
    }

    for (const healingItem of HealingItems) {
        soundManager.load(healingItem.idString, `audio/sfx/healing/${healingItem.idString}`);
    }

    // funny hack to load sounds based on the strings of an enum :)
    for (const floorType of Object.keys(FloorType)) {
        if (floorType.length > 1) {
            const floorName = floorType.toLowerCase();

            soundManager.load(`${floorName}_step_1`, `audio/sfx/footsteps/${floorName}_1`);
            soundManager.load(`${floorName}_step_2`, `audio/sfx/footsteps/${floorName}_2`);
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
        ],
        [
            "audio/sfx/hits/player_hit_1",
            "player_hit_1"
        ],
        [
            "audio/sfx/hits/player_hit_2",
            "player_hit_2"
        ],
        [
            "audio/sfx/pickup",
            "pickup"
        ],
        [
            "audio/sfx/ammo_pickup",
            "ammo_pickup"
        ],
        [
            "audio/sfx/gauze_pickup",
            "gauze_pickup"
        ],
        [
            "audio/sfx/medikit_pickup",
            "medikit_pickup"
        ],
        [
            "audio/sfx/cola_pickup",
            "cola_pickup"
        ],
        [
            "audio/sfx/tablets_pickup",
            "tablets_pickup"
        ],
        [
            "audio/sfx/ammo_pickup",
            "ammo_pickup"
        ]
    ];

    for (const sound of soundsToLoad) {
        soundManager.load(sound[1], sound[0]);
    }
}
