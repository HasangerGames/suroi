import { HealingItems } from "../../../../common/src/definitions/healingItems";
import { Loots } from "../../../../common/src/definitions/loots";
import { MapPings } from "../../../../common/src/definitions/mapPings";
import { Reskins } from "../../../../common/src/definitions/modes";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { Throwables } from "../../../../common/src/definitions/throwables";
import { Numeric } from "../../../../common/src/utils/math";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { MODE } from "../utils/constants";
// add a namespace to pixi sound imports because it has annoying generic names like "sound" and "filters" without a namespace
import * as PixiSound from "@pixi/sound";

export interface SoundOptions {
    position?: Vector
    falloff: number
    maxRange: number
    loop: boolean
    /**
     * If the sound volume and panning will be updated
     * when the camera position changes after it started playing
     */
    dynamic: boolean
    onEnd?: () => void
}

PixiSound.sound.disableAutoPause = true;

export class GameSound {
    readonly manager: SoundManager;

    name: string;
    position?: Vector;
    fallOff: number;
    maxRange: number;
    onEnd?: () => void;

    readonly dynamic: boolean;

    instance?: PixiSound.IMediaInstance;
    readonly stereoFilter: PixiSound.filters.StereoFilter;

    ended = false;

    constructor(name: string, options: SoundOptions, manager: SoundManager) {
        this.name = name;
        this.manager = manager;
        this.position = options.position;
        this.fallOff = options.falloff;
        this.maxRange = options.maxRange;
        this.dynamic = options.dynamic;
        this.onEnd = options.onEnd;
        this.stereoFilter = new PixiSound.filters.StereoFilter(0);

        if (!PixiSound.sound.exists(name)) {
            console.warn(`Unknown sound with name ${name}`);
            return;
        }

        const instanceOrPromise = PixiSound.sound.play(name, {
            loaded: (_err, _sound, instance) => {
                if (instance) this.init(instance);
            },
            filters: [this.stereoFilter],
            loop: options.loop,
            volume: this.manager.volume
        });

        // PixiSound.sound.play returns a promise if the sound has not finished loading
        if (!(instanceOrPromise instanceof Promise)) {
            this.init(instanceOrPromise);
        }
    }

    init(instance: PixiSound.IMediaInstance): void {
        this.instance = instance;
        instance.on("end", () => {
            this.onEnd?.();
            this.ended = true;
        });
        instance.on("stop", () => {
            this.ended = true;
        });
        this.update();
    }

    update(): void {
        if (this.instance && this.position) {
            const diff = Vec.sub(this.manager.position, this.position);

            this.instance.volume = (1 -
                Numeric.clamp(
                    Math.abs(Vec.length(diff) / this.maxRange),
                    0,
                    1
                )) ** (1 + this.fallOff * 2) * this.manager.volume;

            this.stereoFilter.pan = Numeric.clamp(diff.x / this.maxRange * -1, -1, 1);
        }
    }

    stop(): void {
        // trying to stop a sound that already ended or was stopped will stop a random sound
        // (maybe a bug? idk)
        if (this.ended) return;
        this.instance?.stop();
        this.ended = true;
    }
}

export class SoundManager {
    readonly game: Game;
    readonly dynamicSounds = new Set<GameSound>();

    volume: number;
    position = Vec.create(0, 0);

    constructor(game: Game) {
        this.game = game;
        this.volume = game.console.getBuiltInCVar("cv_sfx_volume");
        this.loadSounds();
    }

    play(name: string, options?: Partial<SoundOptions>): GameSound {
        const sound = new GameSound(name, {
            falloff: 1,
            maxRange: 256,
            dynamic: false,
            loop: false,
            ...options
        }, this);

        if (sound.dynamic) this.dynamicSounds.add(sound);

        return sound;
    }

    update(): void {
        for (const sound of this.dynamicSounds) {
            if (sound.ended) {
                this.dynamicSounds.delete(sound);
                continue;
            }
            sound.update();
        }
    }

    stopAll(): void {
        PixiSound.sound.stopAll();
    }

    loadSounds(): void {
        const soundsToLoad: Record<string, string> = {
            player_hit_1: "audio/sfx/hits/player_hit_1",
            player_hit_2: "audio/sfx/hits/player_hit_2",
            gun_click: "audio/sfx/gun_click",
            swing: "audio/sfx/swing",
            emote: "audio/sfx/emote",

            door_open: "audio/sfx/door_open",
            door_close: "audio/sfx/door_close",
            vault_door_open: "audio/sfx/vault_door_open",
            generator_starting: "audio/sfx/generator_starting",
            generator_running: "audio/sfx/generator_running",
            ceiling_collapse: "audio/sfx/ceiling_collapse",

            pickup: "audio/sfx/pickup/pickup",
            ammo_pickup: "audio/sfx/pickup/ammo_pickup",
            scope_pickup: "audio/sfx/pickup/scope_pickup",
            helmet_pickup: "audio/sfx/pickup/helmet_pickup",
            vest_pickup: "audio/sfx/pickup/vest_pickup",
            backpack_pickup: "audio/sfx/pickup/backpack_pickup",
            gauze_pickup: "audio/sfx/pickup/gauze_pickup",
            medikit_pickup: "audio/sfx/pickup/medikit_pickup",
            cola_pickup: "audio/sfx/pickup/cola_pickup",
            tablets_pickup: "audio/sfx/pickup/tablets_pickup",
            throwable_pickup: "audio/sfx/pickup/throwable_pickup",

            usas_explosion: "audio/sfx/usas_explosion",

            kill_leader_assigned: "audio/sfx/kill_leader_assigned",
            kill_leader_dead: "audio/sfx/kill_leader_dead",

            airdrop_plane: "audio/sfx/airdrop/airdrop_plane",
            airdrop_fall: "audio/sfx/airdrop/airdrop_fall",
            airdrop_unlock: "audio/sfx/airdrop/airdrop_unlock",
            airdrop_crate_open: "audio/sfx/airdrop/airdrop_crate_open",
            airdrop_land: "audio/sfx/airdrop/airdrop_land",
            airdrop_land_water: "audio/sfx/airdrop/airdrop_land_water",

            throwable_pin: "audio/sfx/throwable_pin",
            throwable_throw: "audio/sfx/throwable_throw",
            frag_grenade: "audio/sfx/frag_grenade",
            smoke_grenade: "audio/sfx/smoke_grenade",

            button_press: "audio/sfx/button_press",
            puzzle_error: "audio/sfx/puzzle_error",
            puzzle_solved: "audio/sfx/puzzle_solved",

            bleed: "audio/sfx/bleed"
        };

        for (const material of Materials) {
            soundsToLoad[`${material}_hit_1`] = `audio/sfx/hits/${material}_hit_1`;
            soundsToLoad[`${material}_hit_2`] = `audio/sfx/hits/${material}_hit_2`;
            soundsToLoad[`${material}_destroyed`] = `audio/sfx/hits/${material}_destroyed`;
        }

        for (const gun of Loots.byType(ItemType.Gun)) {
            if (!gun.isDual) {
                soundsToLoad[`${gun.idString}_fire`] = `audio/sfx/weapons/${gun.idString}_fire`;
                soundsToLoad[`${gun.idString}_switch`] = `audio/sfx/weapons/${gun.idString}_switch`;
            }

            soundsToLoad[`${gun.idString}_reload`] = `audio/sfx/weapons/${gun.idString}_reload`;
            if (gun.ballistics.lastShotFX) soundsToLoad[`${gun.idString}_last_shot`] = `audio/sfx/weapons/${gun.idString}_last_shot`;
        }

        for (const throwable of Throwables) {
            soundsToLoad[`${throwable.idString}_switch`] = `audio/sfx/weapons/${throwable.idString}_switch`;
        }

        for (const healingItem of HealingItems) {
            soundsToLoad[healingItem.idString] = `audio/sfx/healing/${healingItem.idString}`;
        }

        for (const floorType in FloorTypes) {
            soundsToLoad[`${floorType}_step_1`] = `audio/sfx/footsteps/${floorType}_1`;
            soundsToLoad[`${floorType}_step_2`] = `audio/sfx/footsteps/${floorType}_2`;
        }

        for (const ping of MapPings) {
            if (ping.sound) {
                soundsToLoad[ping.idString] = `audio/sfx/pings/${ping.idString}`;
            }
        }

        for (const key in soundsToLoad) {
            let path = soundsToLoad[key];

            if (MODE.reskin && Reskins[MODE.reskin]?.sounds?.includes(key)) {
                path += `_${MODE.reskin}`;
            }

            soundsToLoad[key] = `./${path}.mp3`;
        }

        for (const [alias, path] of Object.entries(soundsToLoad)) {
            /**
             * For some reason, PIXI will call the `loaded` callback twice
             * when an error occurs…
             */
            let called = false;

            PixiSound.sound.add(
                alias,
                {
                    url: path,
                    preload: true,
                    loaded(error) {
                        if (error !== null && !called) {
                            called = true;
                            console.warn(`Failed to load sound '${alias}' (path '${path}')\nError object provided below`);
                            console.error(error);
                        }
                    }
                }
            );
        }
    }
}
