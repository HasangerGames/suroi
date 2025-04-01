import { Layer } from "@common/constants";
// import { equalLayer, isGroundLayer } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { Vec, type Vector } from "@common/utils/vector";
import { Game } from "../game";
// add a namespace to pixi sound imports because it has annoying generic names like "sound" and "filters" without a namespace
import * as PixiSound from "@pixi/sound";
import { paths } from "virtual:game-sounds";
import { GameConsole } from "../console/gameConsole";

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
    id: string;
    name: string;
    position?: Vector;
    falloff: number;
    maxRange: number;
    layer: Layer | number;
    speed: number;
    onEnd?: () => void;

    readonly dynamic: boolean;
    readonly ambient: boolean;

    get managerVolume(): number { return this.ambient ? SoundManager.ambienceVolume : SoundManager.sfxVolume; }

    // acts as multiplier
    volume = 1;

    instance?: PixiSound.IMediaInstance;
    readonly stereoFilter: PixiSound.filters.StereoFilter;
    // readonly reverbFilter: PixiSound.filters.ReverbFilter;

    ended = false;

    constructor(id: string, name: string, options: SoundOptions) {
        this.id = id;
        this.name = name;
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

        if (!PixiSound.sound.exists(id)) {
            console.warn(`Unknown sound with name ${id}`);
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

        const instanceOrPromise = PixiSound.sound.play(id, {
            loaded: (_err, _sound, instance) => {
                if (instance) this.init(instance);
            },
            filters: [filter],
            loop: options.loop,
            volume: this.managerVolume * this.volume,
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
            const diff = Vec.sub(SoundManager.position, this.position);

            this.instance.volume = (
                1 - Numeric.clamp(Math.abs(Vec.length(diff) / this.maxRange), 0, 1)
            ) ** (1 + this.falloff * 2) * this.managerVolume * this.volume;

            this.stereoFilter.pan = Numeric.clamp(-diff.x / this.maxRange, -1, 1);
        } else {
            this.instance.volume = this.managerVolume * this.volume;
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

export const SoundManager = new (class SoundManager {
    readonly updatableSounds = new Set<GameSound>();

    sfxVolume = 0;
    ambienceVolume = 0;

    position = Vec.create(0, 0);

    /**
     * Explanation for the following code:
     * Every sound now has an internal ID and a name
     * The internal ID is required for sounds that have the same file name but are in different folders
     * This is used so modes can override sounds by just having a file with the same name in their folders
     *
     * Sounds that are not in the current mode folders will *still* be loaded but only when they are played
     * This is done for example for the HQ music thingy that is a big file that's not played most of the time
     */

    /** current map of names to ID based on the folders loaded by the current mode */
    private _nameToId: Record<string, string> = {};

    /** Map of sound ID to sound path used to load sounds */
    private readonly _idToPath: Record<string, string> = {};

    // used to map sounds from a mode to their ID's
    // example: on winter `airdrop_plane` will map to `winter/airdrop_plane`
    //                                      mode       sound name sound ID
    //                                       ^              ^        ^
    private readonly _folderNameToId = {} as Record<string, Record<string, string>>;

    private _initialized = false;
    init(): void {
        if (this._initialized) {
            throw new Error("SoundManager has already been initialized");
        }
        this._initialized = true;

        this.sfxVolume = GameConsole.getBuiltInCVar("cv_sfx_volume");
        this.ambienceVolume = GameConsole.getBuiltInCVar("cv_ambience_volume");

        for (const path of paths as string[]) {
            const name = path.slice(path.lastIndexOf("/") + 1, -4); // removes path and extension
            const url = path;

            const folder = path.split("/")[3];
            const id = `${folder}/${name}`;

            this._folderNameToId[folder] ??= {};
            this._folderNameToId[folder][name] = id;

            this._idToPath[id] = url;
        }
    }

    has(name: string): boolean {
        return PixiSound.sound.exists(name);
    }

    play(name: string, options?: Partial<SoundOptions>): GameSound {
        const id = this._nameToId[name];

        const sound = new GameSound(id, name, {
            falloff: 1,
            maxRange: 256,
            dynamic: false,
            ambient: false,
            layer: Game.layer ?? Layer.Ground,
            loop: false,
            ...options
        });

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
        this._nameToId = {};

        const isLoading: Record<string, boolean> = {};

        for (const folder of Game.mode.sounds.foldersToLoad) {
            for (const [name, id] of Object.entries(this._folderNameToId[folder])) {
                this._nameToId[name] = id;
                isLoading[id] = true;
                this.loadSound(id, true);
            }
        }

        // add sounds that are not in the mode folders but set preload to false
        for (const nameToId of Object.values(this._folderNameToId)) {
            for (const [name, id] of Object.entries(nameToId)) {
                if (!this._nameToId[name]) {
                    this._nameToId[name] = id;
                }
                if (!isLoading[id]) {
                    this.loadSound(id, false);
                }
            }
        }
    }

    loadSound(id: string, preload: boolean): void {
        if (PixiSound.sound.exists(id)) return;

        const url = this._idToPath[id];
        if (!url) {
            return;
        }

        /**
         * For some reason, PIXI will call the `loaded` callback twice
         * when an error occurs…
         */
        let called = false;

        PixiSound.sound.add(
            id,
            {
                url,
                preload,
                loaded(error: Error | null) {
                    // despite what the pixi typings say, logging `error` shows that it can be null
                    if (error !== null && !called) {
                        called = true;
                        console.warn(`Failed to load sound '${id}' (path '${url}')\nError object provided below`);
                        console.error(error);
                    }
                }
            }
        );
    }
})();
