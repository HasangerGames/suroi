import { Howl, type HowlCallback, type HowlErrorCallback } from "howler";
import { Guns } from "../../../../common/src/definitions/guns";
import { HealingItems } from "../../../../common/src/definitions/healingItems";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { clamp } from "../../../../common/src/utils/math";
import { FloorTypes } from "../../../../common/src/utils/mapUtils";
import { v, type Vector, vLength, vSub } from "../../../../common/src/utils/vector";
import { consoleVariables } from "./console/variables";

export interface Sound {
    readonly name: string
    readonly id: number
}

export class SoundManager {
    private readonly sounds: Record<string, Howl> = {};

    volume = consoleVariables.get.builtIn("cv_sfx_volume").value;

    position = v(0, 0);

    load(name: string, path: string): void {
        this.sounds[name] = new Howl({ src: `./${path}.mp3` }).load();
    }

    play(name: string, position?: Vector, fallOff = 1, maxRange = 256, onend?: HowlCallback | HowlErrorCallback): Sound {
        const sound = this.sounds[name];
        let id = -1;

        if (sound) {
            let volume = this.volume;
            let stereoNorm = 0;
            if (position) {
                const diff = vSub(this.position, position);
                volume = (1 - clamp(Math.abs(vLength(diff) / maxRange), 0, 1)) ** (1 + fallOff * 2) * this.volume;
                stereoNorm = clamp(diff.x / maxRange * -1.0, -1.0, 1.0);
            }

            if (volume > 0) {
                id = sound.play();
                sound.volume(volume, id);
                sound.stereo(stereoNorm, id);
                if (onend) sound.on("end", onend, id);
            }
        } else {
            console.warn(`Sound with name '${name}' not found`);
        }

        return {
            name,
            id
        };
    }

    stop(sound: Sound): void {
        if (this.sounds[sound.name]?.stop(sound.id) === undefined) {
            console.warn(`Couldn't stop sound with name '${sound.name}' because it was never playing to begin with`);
        }
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
            "vault_door_open",
            "audio/sfx/vault_door_open"
        ],
        [
            "generator_starting",
            "audio/sfx/generator_starting"
        ],
        [
            "generator_running",
            "audio/sfx/generator_running"
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
            "scope_pickup",
            "audio/sfx/pickup/scope_pickup"
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

    for (const floorType in FloorTypes) {
        soundsToLoad.push([`${floorType}_step_1`, `audio/sfx/footsteps/${floorType}_1`]);
        soundsToLoad.push([`${floorType}_step_2`, `audio/sfx/footsteps/${floorType}_2`]);
    }

    for (const [name, path] of soundsToLoad) {
        soundManager.load(name, path);
    }
}
