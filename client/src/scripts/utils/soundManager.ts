import { Howl } from "howler";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { Guns } from "../../../../common/src/definitions/guns";
import { FloorType } from "../../../../common/src/definitions/buildings";
import { HealingItems } from "../../../../common/src/definitions/healingItems";
import { v, vSub, type Vector, vLength } from "../../../../common/src/utils/vector";
import { localStorageInstance } from "./localStorageHandler";
import { clamp } from "../../../../common/src/utils/math";

export interface Sound {
    name: string
    id: number
}

export class SoundManager {
    sounds: Record<string, Howl>;

    volume = localStorageInstance.config.sfxVolume;

    position = v(0, 0);

    constructor() {
        this.sounds = {};
    }

    load(name: string, path: string): void {
        const sound = new Howl({ src: `${path}.mp3` });
        sound.load();
        this.sounds[name] = sound;
    }

    play(name: string, position?: Vector, fallOff = 1, maxRange = 256): Sound {
        const sound = this.sounds[name];
        let id = -1;

        if (sound) {
            let volume = this.volume;
            let stereoNorm = 0;
            if (position) {
                const baseVolume = this.volume;
                const diff = vSub(this.position, position);
                const dist = vLength(diff);
                const distNormal = clamp(Math.abs(dist / maxRange), 0, 1);
                const scaledVolume = (1.0 - distNormal) ** (1.0 + fallOff * 2.0);
                volume = scaledVolume * baseVolume;
                stereoNorm = clamp(diff.x / maxRange * -1.0, -1.0, 1.0);
            }
            if (volume > 0) {
                sound.volume(volume);
                sound.stereo(stereoNorm);
                id = sound.play();
            }
        } else {
            console.warn(`Sound with name "${name}" not found.`);
        }
        return {
            name,
            id
        };
    }

    stop(sound: Sound): void {
        this.sounds[sound.name].stop(sound.id);
    }

    get(name: string): Howl {
        return this.sounds[name];
    }
}

export function loadSounds(soundManager: SoundManager): void {
    const soundsToLoad = [
        [
            "gun_click",
            "audio/sfx/gun_click"
        ],
        [
            "swing",
            "audio/sfx/swing"
        ],
        [
            "emote",
            "audio/sfx/emote"
        ],
        [
            "door_open",
            "audio/sfx/door_open"
        ],
        [
            "door_close",
            "audio/sfx/door_close"
        ],
        [
            "ceiling_collapse",
            "audio/sfx/ceiling_collapse"
        ],
        [
            "player_hit_1",
            "audio/sfx/hits/player_hit_1"
        ],
        [
            "player_hit_2",
            "audio/sfx/hits/player_hit_2"
        ],
        [
            "pickup",
            "audio/sfx/pickup/pickup"
        ],
        [
            "ammo_pickup",
            "audio/sfx/pickup/ammo_pickup"
        ],
        [
            "gauze_pickup",
            "audio/sfx/pickup/gauze_pickup"
        ],
        [
            "medikit_pickup",
            "audio/sfx/pickup/medikit_pickup"
        ],
        [
            "cola_pickup",
            "audio/sfx/pickup/cola_pickup"
        ],
        [
            "tablets_pickup",
            "audio/sfx/pickup/tablets_pickup"
        ]
    ];

    for (const material of Materials) {
        soundsToLoad.push([`${material}_hit_1`, `audio/sfx/hits/${material}_hit_1`]);
        soundsToLoad.push([`${material}_hit_2`, `audio/sfx/hits/${material}_hit_2`]);
        soundsToLoad.push([`${material}_destroyed`, `audio/sfx/hits/${material}_destroyed`]);
    }

    for (const gun of Guns) {
        soundsToLoad.push([`${gun.idString}_fire`, `audio/sfx/weapons/${gun.idString}_fire`]);
        soundsToLoad.push([`${gun.idString}_switch`, `audio/sfx/weapons/${gun.idString}_switch`]);
        soundsToLoad.push([`${gun.idString}_reload`, `audio/sfx/weapons/${gun.idString}_reload`]);
    }

    for (const healingItem of HealingItems) {
        soundsToLoad.push([healingItem.idString, `audio/sfx/healing/${healingItem.idString}`]);
    }

    // funny hack to load sounds based on the strings of an enum :)
    for (const floorType of Object.keys(FloorType)) {
        if (floorType.length > 1) {
            const floorName = floorType.toLowerCase();

            soundsToLoad.push([`${floorName}_step_1`, `audio/sfx/footsteps/${floorName}_1`]);
            soundsToLoad.push([`${floorName}_step_2`, `audio/sfx/footsteps/${floorName}_2`]);
        }
    }

    for (const sound of soundsToLoad) {
        soundManager.load(sound[0], sound[1]);
    }
}
