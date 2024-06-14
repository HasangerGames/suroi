import { Reskins } from "../../../../common/src/definitions/modes";
import { Numeric } from "../../../../common/src/utils/math";
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

            this.instance.volume = (1
            - Numeric.clamp(
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
    readonly dynamicSounds = new Set<GameSound>();

    volume: number;
    position = Vec.create(0, 0);

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (SoundManager._instantiated) {
            throw new Error("Class 'SoundManager' has already been instantiated");
        }
        SoundManager._instantiated = true;

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
        const sounds = import.meta.glob("/public/audio/**/*.mp3");

        const soundsToLoad: Record<string, string> = {};

        for (const sound in sounds) {
            const path = sound.split("/");
            const name = path[path.length - 1].replace(".mp3", "");
            if (soundsToLoad[name]) {
                console.warn(`Duplicated sound: ${name}`);
            }
            soundsToLoad[name] = sound.replace("/public", "");
        }

        for (const key in soundsToLoad) {
            let path = soundsToLoad[key];

            if (MODE.reskin && Reskins[MODE.reskin]?.sounds?.includes(key)) {
                path += `_${MODE.reskin}`;
            }

            soundsToLoad[key] = `.${path}`;
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
                    loaded(error: Error | null) {
                        // despite what the pixi typings say, logging `error` shows that it can be null
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
