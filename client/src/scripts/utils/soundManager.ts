import { Howl } from "howler";
import { Guns } from "../../../../common/src/definitions/guns";
import { HealingItems } from "../../../../common/src/definitions/healingItems";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { clamp } from "../../../../common/src/utils/math";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { v, type Vector, vLength, vSub } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { MODE } from "./constants";
import { Reskins } from "../../../../common/src/definitions/modes";

export interface Sound {
    readonly name: string
    readonly id: number
    position?: Vector
    readonly fallOff: number
    readonly maxRange: number
}

export class SoundManager {
    private readonly sounds: Record<string, Howl> = {};

    game: Game;

    volume: number;

    position = v(0, 0);

    dynamicSounds = new Set<Sound>();

    constructor(game: Game) {
        this.game = game;
        this.volume = game.console.getBuiltInCVar("cv_sfx_volume");
        this.loadSounds();
    }

    load(name: string, path: string): void {
        if (MODE.reskin && Reskins[MODE.reskin]?.sounds?.includes(name)) path += `_${MODE.reskin}`;
        this.sounds[name] = new Howl({ src: `./${path}.mp3` }).load();
    }

    play(
        name: string,
        position?: Vector,
        fallOff = 1,
        maxRange = 256,
        dynamic?: boolean,
        onend?: () => void
    ): Sound {
        const howl = this.sounds[name];
        let id = -1;

        const sound = {
            name,
            id,
            position,
            fallOff,
            maxRange
        };

        if (howl) {
            if (this.volume > 0) {
                id = sound.id = howl.play();
                howl.on("end", () => {
                    if (sound.position && dynamic) this.dynamicSounds.delete(sound);
                    onend?.();
                }, id);
            }

            if (sound.position) {
                if (dynamic) this.dynamicSounds.add(sound);
                this.update(sound, howl);
            }
        } else {
            console.warn(`Sound with name '${name}' not found`);
        }

        return sound;
    }

    update(sound?: Sound, howl?: Howl): void {
        if (sound && howl) {
            if (sound.position) {
                const diff = vSub(this.position, sound.position);
                howl.volume((1 - clamp(Math.abs(vLength(diff) / sound.maxRange), 0, 1)) ** (1 + sound.fallOff * 2) * this.volume, sound.id);
                howl.stereo(clamp(diff.x / sound.maxRange * -1.0, -1.0, 1.0), sound.id);
            }
        } else {
            for (const sound of this.dynamicSounds) {
                const howl = this.sounds[sound.name];
                if (!howl) continue;
                this.update(sound, howl);
            }
        }
    }

    stop(sound: Sound): void {
        if (this.sounds[sound.name]?.stop(sound.id) === undefined) {
            console.warn(`Couldn't stop sound with name '${sound.name}' because it was never playing to begin with`);
        }
    }

    get(name: string): Howl {
        return this.sounds[name];
    }

    loadSounds(): void {
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
                "airdrop_crate_open",
                "audio/sfx/airdrop_crate_open"
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
                "helmet_pickup",
                "audio/sfx/pickup/helmet_pickup"
            ],
            [
                "vest_pickup",
                "audio/sfx/pickup/vest_pickup"
            ],
            [
                "backpack_pickup",
                "audio/sfx/pickup/backpack_pickup"
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
            ],
            [
                "usas_explosion",
                "audio/sfx/usas_explosion"
            ],
            [
                "kill_leader_assigned",
                "audio/sfx/kill_leader_assigned"
            ],
            [
                "kill_leader_dead",
                "audio/sfx/kill_leader_dead"
            ],
            [
                "airdrop_ping",
                "audio/sfx/airdrop/airdrop_ping"
            ],
            [
                "airdrop_plane",
                "audio/sfx/airdrop/airdrop_plane"
            ],
            [
                "airdrop_fall",
                "audio/sfx/airdrop/airdrop_fall"
            ],
            [
                "airdrop_unlock",
                "audio/sfx/airdrop/airdrop_unlock"
            ],
            [
                "airdrop_land",
                "audio/sfx/airdrop/airdrop_land"
            ],
            [
                "airdrop_land_water",
                "audio/sfx/airdrop/airdrop_land_water"
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
            if (gun.ballistics.lastShotFX) soundsToLoad.push([`${gun.idString}_last_shot`, `audio/sfx/weapons/${gun.idString}_last_shot`]);
        }

        for (const healingItem of HealingItems) {
            soundsToLoad.push([healingItem.idString, `audio/sfx/healing/${healingItem.idString}`]);
        }

        for (const floorType in FloorTypes) {
            soundsToLoad.push([`${floorType}_step_1`, `audio/sfx/footsteps/${floorType}_1`]);
            soundsToLoad.push([`${floorType}_step_2`, `audio/sfx/footsteps/${floorType}_2`]);
        }

        for (const [name, path] of soundsToLoad) {
            this.load(name, `./${path}`);
        }
    }
}
