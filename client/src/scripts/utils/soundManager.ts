import { Howl } from "howler";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { Guns } from "../../../../common/src/definitions/guns";
import { FloorType } from "../../../../common/src/definitions/buildings";
import { HealingItems } from "../../../../common/src/definitions/healingItems";
import { type Vector } from "../../../../common/src/utils/vector";

export interface Sound {
    name: string
    id: number
}

export class SoundManager {
    sounds: Record<string, Howl>;

    volume = 1;

    constructor() {
        this.sounds = {};
    }

    load(name: string, path: string): void {
        const sound = new Howl({ src: `${path}.mp3` });
        sound.load();
        this.sounds[name] = sound;
    }

    play(name: string, position?: Vector, fallOff = 1): Sound {
        let sound = this.sounds[name];
        let id: number;

        if (sound) {
            if (position) {
                sound = sound.pos(position.x, position.y).pannerAttr({
                    coneInnerAngle: 360,
                    coneOuterAngle: 360,
                    coneOuterGain: 0.5,
                    distanceModel: "inverse",
                    maxDistance: 1024,
                    refDistance: 1,
                    rolloffFactor: fallOff,
                    panningModel: "equalpower"
                });
                sound.volume(this.volume);
            }

            id = sound.play();
        } else {
            console.warn(`Sound with name "${name}" not found.`);
            id = -1;
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
            "pickup",
            "audio/sfx/pickup"
        ],
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
