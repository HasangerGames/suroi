import { Layer } from "@common/constants";
import { TintedParticles } from "@common/definitions/obstacles";
import { getEffectiveZIndex } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { random, randomRotation } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";

export class ParticleManager {
    readonly particles = new Set<Particle>();
    readonly emitters = new Set<ParticleEmitter>();

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (ParticleManager._instantiated) {
            throw new Error("Class 'ParticleManager' has already been instantiated");
        }
        ParticleManager._instantiated = true;
    }

    update(delta: number): void {
        for (const particle of this.particles) {
            particle.update(delta);

            if (particle.dead) {
                this.particles.delete(particle);
                particle.image.destroy();
                particle.options.onDeath?.(particle);
            }
        }

        for (const emitter of this.emitters) {
            if (emitter.dead) {
                this.emitters.delete(emitter);
                continue;
            }

            if (emitter.active && emitter.lastSpawn + emitter.delay < Date.now()) {
                this.spawnParticle(emitter.spawnOptions());
                emitter.lastSpawn = Date.now();
            }
        }
    }

    spawnParticle(options: ParticleOptions): Particle {
        const particle = new Particle(this, options);
        this.particles.add(particle);
        this.game.camera.addObject(particle.image);
        return particle;
    }

    spawnParticles(count: number, options: () => ParticleOptions): void {
        for (let i = 0; i < count; i++) this.spawnParticle(options());
    }

    addEmitter(options: EmitterOptions): ParticleEmitter {
        const emitter = new ParticleEmitter(options);
        this.emitters.add(emitter);
        return emitter;
    }

    clear(): void {
        this.particles.clear();
        this.emitters.clear();
    }
}

export type ParticleProperty = {
    readonly start: number
    readonly end: number
    readonly ease?: (x: number) => number
} | number;

export interface ParticleOptions {
    readonly frames: string | string[]
    readonly position: Vector
    readonly speed: Vector
    readonly lifetime: number
    readonly zIndex: number
    readonly layer?: Layer
    readonly scale?: ParticleProperty
    readonly alpha?: ParticleProperty
    readonly rotation?: ParticleProperty
    readonly tint?: number
    readonly onDeath?: (particle: Particle) => void
}

export class Particle {
    position: Vector;
    layer: Layer;
    readonly image: SuroiSprite;

    private readonly _spawnTime = Date.now();
    get spawnTime(): number { return this._spawnTime; }

    private readonly _deathTime = Date.now();
    get deathTime(): number { return this._deathTime; }

    private _dead = false;
    get dead(): boolean { return this._dead; }

    readonly options: ParticleOptions;

    scale: number;
    alpha: number;
    rotation: number;

    constructor(readonly manager: ParticleManager, options: ParticleOptions) {
        this._deathTime = this._spawnTime + options.lifetime;
        this.position = options.position;
        this.layer = options.layer ?? Layer.Ground;
        const frames = options.frames;
        const frame = typeof frames === "string" ? frames : frames[random(0, frames.length - 1)];
        const tintedParticle = TintedParticles[frame];
        this.image = new SuroiSprite(tintedParticle?.base ?? frame);
        this.image.tint = options.tint ?? tintedParticle?.tint ?? 0xffffff;
        this.image.setZIndex(getEffectiveZIndex(options.zIndex, this.layer, this.manager.game.layer));

        this.scale = typeof options.scale === "number" ? options.scale : 1;
        this.alpha = typeof options.alpha === "number" ? options.alpha : 1;
        this.rotation = typeof options.rotation === "number" ? options.rotation : randomRotation();

        this.options = options;
    }

    update(delta: number): void {
        this.position = Vec.add(this.position, Vec.scale(Vec.scale(this.options.speed, delta), 1e-3));
        const options = this.options;

        const now = Date.now();
        let interpFactor: number;
        if (now >= this._deathTime) {
            this._dead = true;
            interpFactor = 1;
        } else {
            interpFactor = (now - this._spawnTime) / options.lifetime;
        }

        if (typeof options.scale === "object") {
            this.scale = Numeric.lerp(options.scale.start, options.scale.end, (options.scale.ease ?? (t => t))(interpFactor));
        }

        if (typeof options.alpha === "object") {
            this.alpha = Numeric.lerp(options.alpha.start, options.alpha.end, (options.alpha.ease ?? (t => t))(interpFactor));
        }

        if (typeof options.rotation === "object") {
            this.rotation = Numeric.lerp(options.rotation.start, options.rotation.end, (options.rotation.ease ?? (t => t))(interpFactor));
        }

        this.image.setZIndex(getEffectiveZIndex(options.zIndex, this.layer, this.manager.game.layer));

        this.image.position.copyFrom(toPixiCoords(this.position));
        this.image.scale.set(this.scale);
        this.image.setRotation(this.rotation).setAlpha(this.alpha);
    }

    kill(): void {
        this._dead = true;
        this.manager.particles.delete(this);
        this.image.destroy();
    }
}

export interface EmitterOptions {
    readonly delay: number
    readonly active: boolean
    readonly spawnOptions: () => ParticleOptions
}

export class ParticleEmitter {
    private _dead = false;
    get dead(): boolean { return this._dead; }

    lastSpawn = 0;
    delay: number;
    active: boolean;
    readonly spawnOptions: () => ParticleOptions;

    constructor(options: EmitterOptions) {
        this.delay = options.delay;
        this.active = options.active;
        this.spawnOptions = options.spawnOptions;
    }

    destroy(): void {
        this._dead = true;
    }
}
