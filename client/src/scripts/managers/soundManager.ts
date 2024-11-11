import { Layer } from "@common/constants";
// import { equalLayer, isGroundLayer } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { MODE /* , SOUND_FILTER_FOR_LAYERS */ } from "../utils/constants";
// add a namespace to pixi sound imports because it has annoying generic names like "sound" and "filters" without a namespace
import * as PixiSound from "@pixi/sound";

export interface SoundOptions {
    position?: Vector
    falloff: number
    layer: Layer | number
    maxRange: number
    loop: boolean
    speed?: number
    /**
     * If the sound volume and panning will be updated
     * when the camera position changes after it started playing
     */
    dynamic: boolean
    ambient: boolean
    onEnd?: () => void
}

PixiSound.sound.disableAutoPause = true;

export class GameSound {
    readonly manager: SoundManager;

    name: string;
    position?: Vector;
    falloff: number;
    maxRange: number;
    layer: Layer | number;
    speed: number;
    onEnd?: () => void;

    readonly dynamic: boolean;
    readonly ambient: boolean;

    get volume(): number { return this.ambient ? this.manager.ambienceVolume : this.manager.sfxVolume; }

    instance?: PixiSound.IMediaInstance;
    readonly stereoFilter: PixiSound.filters.StereoFilter;
    // readonly reverbFilter: PixiSound.filters.ReverbFilter;

    ended = false;

    constructor(name: string, options: SoundOptions, manager: SoundManager) {
        this.name = name;
        this.manager = manager;
        this.position = options.position;
        this.falloff = options.falloff;
        this.maxRange = options.maxRange;
        this.layer = options.layer;
        this.speed = options.speed ?? 1;
        this.dynamic = options.dynamic;
        this.ambient = options.ambient;
        this.onEnd = options.onEnd;
        this.stereoFilter = new PixiSound.filters.StereoFilter(0);
        // this.reverbFilter = new PixiSound.filters.ReverbFilter(1, 20);

        if (!PixiSound.sound.exists(name)) {
            console.warn(`Unknown sound with name ${name}`);
            return;
        }

        const filter: PixiSound.Filter = this.stereoFilter;

        // We want reverb inside bunkers (basement layer) or if we are on a different layer with visible objects (layer floor1)
        /* if (SOUND_FILTER_FOR_LAYERS && this.manager.game.layer) {
            switch (this.manager.game.layer) {
                case Layer.Floor1:
                    filter = !equalLayer(this.layer, this.manager.game.layer ?? Layer.Ground) && isGroundLayer(this.layer) ? this.reverbFilter : this.stereoFilter;
                    break;

                case Layer.Basement1:
                    filter = this.reverbFilter;
                    break;
            }
        } */

        const instanceOrPromise = PixiSound.sound.play(name, {
            loaded: (_err, _sound, instance) => {
                if (instance) this.init(instance);
            },
            filters: [filter],
            loop: options.loop,
            volume: this.volume,
            speed: this.speed
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
        if (!this.instance) return;

        if (this.position) {
            const diff = Vec.sub(this.manager.position, this.position);

            this.instance.volume = (
                1 - Numeric.clamp(Math.abs(Vec.length(diff) / this.maxRange), 0, 1)
            ) ** (1 + this.falloff * 2) * this.volume;

            this.stereoFilter.pan = Numeric.clamp(-diff.x / this.maxRange, -1, 1);
        } else {
            this.instance.volume = this.volume;
        }
    }

    setPaused(paused: boolean): void {
        if (this.instance) this.instance.paused = paused;
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
    readonly updatableSounds = new Set<GameSound>();

    sfxVolume: number;
    ambienceVolume: number;

    position = Vec.create(0, 0);

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (SoundManager._instantiated) {
            throw new Error("Class 'SoundManager' has already been instantiated");
        }
        SoundManager._instantiated = true;

        this.sfxVolume = game.console.getBuiltInCVar("cv_sfx_volume");
        this.ambienceVolume = game.console.getBuiltInCVar("cv_ambience_volume");
        this.loadSounds();
    }

    play(name: string, options?: Partial<SoundOptions>): GameSound {
        const sound = new GameSound(name, {
            falloff: 1,
            maxRange: 256,
            dynamic: false,
            ambient: false,
            layer: this.game.layer ?? Layer.Ground,
            loop: false,
            ...options
        }, this);

        if (sound.dynamic || sound.ambient) {
            this.updatableSounds.add(sound);
        }

        return sound;
    }

    update(): void {
        for (const sound of this.updatableSounds) {
            if (sound.ended) {
                this.updatableSounds.delete(sound);
                continue;
            }
            sound.update();
        }
    }

    stopAll(): void {
        PixiSound.sound.stopAll();
    }

    loadSounds(): void {
        for (const path in import.meta.glob(["/public/audio/sfx/**/*.mp3", "/public/audio/ambience/**/*.mp3"])) {
            /**
             * For some reason, PIXI will call the `loaded` callback twice
             * when an error occurs…
             */
            let called = false;

            const name = path.slice(path.lastIndexOf("/") + 1, -4); // removes path and extension
            let url = path.slice(7); // removes the "/public"
            if (MODE.specialSounds?.includes(name)) {
                url = url.replace(name, `${name}_${MODE.reskin}`);
            }

            PixiSound.sound.add(
                name,
                {
                    url,
                    preload: true,
                    loaded(error: Error | null) {
                        // despite what the pixi typings say, logging `error` shows that it can be null
                        if (error !== null && !called) {
                            called = true;
                            console.warn(`Failed to load sound '${name}' (path '${url}')\nError object provided below`);
                            console.error(error);
                        }
                    }
                }
            );
        }
    }
}
