import { InputActions, InventoryMessages, Layer, ObjectCategory, TeamMode, ZIndexes } from "@common/constants";
import { Badges, type BadgeDefinition } from "@common/definitions/badges";
import { Emotes } from "@common/definitions/emotes";
import { ArmorType } from "@common/definitions/items/armors";
import { Ammos } from "@common/definitions/items/ammos";
import { Explosions } from "@common/definitions/explosions";
import { type DualGunNarrowing, type GunDefinition } from "@common/definitions/items/guns";
import { type MeleeDefinition } from "@common/definitions/items/melees";
import { Skins } from "@common/definitions/items/skins";
import { type LootDefinition, type WeaponDefinition } from "@common/definitions/loots";
import type { ColorKeys, ModeDefinition, ModeName } from "@common/definitions/modes";
import { Modes } from "@common/definitions/modes";
import type { JoinedData } from "@common/packets/joinedPacket";
import { JoinPacket } from "@common/packets/joinPacket";
import { PacketType, type DataSplit, type PacketDataIn, type PacketDataOut } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { type UpdateDataOut } from "@common/packets/updatePacket";
import { CircleHitbox } from "@common/utils/hitbox";
import { adjacentOrEquivLayer, equalLayer } from "@common/utils/layer";
import { EaseFunctions, Geometry, Numeric } from "@common/utils/math";
import { Timeout } from "@common/utils/misc";
import { DefinitionType } from "@common/utils/objectDefinitions";
import { ObjectPool } from "@common/utils/objectPool";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { random, randomFloat, randomRotation, randomVector } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { sound, type Sound } from "@pixi/sound";
import FontFaceObserver from "fontfaceobserver";
import $ from "jquery";
import { Application, Color, Container, loadTextures } from "pixi.js";
import "pixi.js/prepare";
import { setUpCommands } from "./console/commands";
import { GameConsole } from "./console/gameConsole";
import { defaultClientCVars } from "./console/variables";
import { CameraManager } from "./managers/cameraManager";
import { EmoteWheelManager, MapPingWheelManager } from "./managers/emoteWheelManager";
import { GasManager, GasRender } from "./managers/gasManager";
import { InputManager } from "./managers/inputManager";
import { MapManager } from "./managers/mapManager";
import { ParticleManager } from "./managers/particleManager";
import { ScreenRecordManager } from "./managers/screenRecordManager";
import { GameSound, SoundManager } from "./managers/soundManager";
import { UIManager } from "./managers/uiManager";
import { Building } from "./objects/building";
import { Bullet } from "./objects/bullet";
import { DeathMarker } from "./objects/deathMarker";
import { Decal } from "./objects/decal";
import { explosion } from "./objects/explosion";
import { type GameObject } from "./objects/gameObject";
import { Loot } from "./objects/loot";
import { Obstacle } from "./objects/obstacle";
import { Parachute } from "./objects/parachute";
import { Plane } from "./objects/plane";
import { Player } from "./objects/player";
import { Projectile } from "./objects/projectile";
import { SyncedParticle } from "./objects/syncedParticle";
import { autoPickup, fetchServerData, finalizeUI, resetPlayButtons, setUpUI, teamSocket, unlockPlayButtons, updateDisconnectTime } from "./ui";
import { EMOTE_SLOTS, LAYER_TRANSITION_DELAY, PERK_MESSAGE_FADE_TIME, PIXI_SCALE, UI_DEBUG_MODE } from "./utils/constants";
import { DebugRenderer } from "./utils/debugRenderer";
import { setUpNetGraph } from "./utils/graph/netGraph";
import { loadSpritesheets, SuroiSprite } from "./utils/pixi";
import { getTranslatedString, initTranslation } from "./utils/translations/translations";
import { type TranslationKeys } from "./utils/translations/typings";
import { Tween, type TweenOptions } from "./utils/tween";
import { colord } from "colord";
import type { DebugMenu } from "./utils/debugMenu";


interface ObjectClassMapping {
    readonly [ObjectCategory.Player]: typeof Player
    readonly [ObjectCategory.Obstacle]: typeof Obstacle
    readonly [ObjectCategory.DeathMarker]: typeof DeathMarker
    readonly [ObjectCategory.Loot]: typeof Loot
    readonly [ObjectCategory.Building]: typeof Building
    readonly [ObjectCategory.Decal]: typeof Decal
    readonly [ObjectCategory.Parachute]: typeof Parachute
    readonly [ObjectCategory.Projectile]: typeof Projectile
    readonly [ObjectCategory.SyncedParticle]: typeof SyncedParticle
}

const ObjectClassMapping: ObjectClassMapping = Object.freeze({
    [ObjectCategory.Player]: Player,
    [ObjectCategory.Obstacle]: Obstacle,
    [ObjectCategory.DeathMarker]: DeathMarker,
    [ObjectCategory.Loot]: Loot,
    [ObjectCategory.Building]: Building,
    [ObjectCategory.Decal]: Decal,
    [ObjectCategory.Parachute]: Parachute,
    [ObjectCategory.Projectile]: Projectile,
    [ObjectCategory.SyncedParticle]: SyncedParticle
} satisfies {
    readonly [K in ObjectCategory]: new (id: number, data: ObjectsNetData[K]) => InstanceType<ObjectClassMapping[K]>
});

type ObjectMapping = {
    readonly [Cat in keyof ObjectClassMapping]: InstanceType<ObjectClassMapping[Cat]>
};

type Colors = Record<ColorKeys | "background" | "ghillie", Color>;

type ComparisonTrend = "better" | "worse" | "neutral";

interface WeaponComparisonLine {
    readonly label: string;
    current: string;
    next: string;
    trend: ComparisonTrend;
}

interface CondensedComparisonLine {
    readonly label: string;
    readonly value: string;
    readonly trend: ComparisonTrend;
}

interface WeaponComparisonPayload {
    readonly key: string;
    readonly lines: WeaponComparisonLine[];
    readonly mode: "compare" | "inspect";
    readonly condensedLines?: CondensedComparisonLine[];
}

interface CondensedDiffInput {
    readonly label: string;
    readonly current?: number;
    readonly next?: number;
    readonly higherIsBetter?: boolean;
    readonly formatter?: (value: number) => string;
}

interface WeaponComparisonBuilder<T extends WeaponDefinition> {
    readonly compare: (current: T, next: T) => WeaponComparisonLine[];
    readonly condensedCompare: (current: T, next: T) => CondensedComparisonLine[];
    readonly condensedInspect: (definition: T) => CondensedComparisonLine[];
}

const COMPARISON_EPSILON = 1e-3;

const fmtNum = (v: number, d = 2) => {
    const fixed = v.toFixed(d);
    return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
};
const fmtSec = (s: number) => `${fmtNum(s, 2)}s`;
const fmtDeg = (v: number) => `${fmtNum(v, 2)}°`;
const fmtMult = (v: number) => `${fmtNum(v, 2)}x`;
const fmtRate = (v: number) => `${fmtNum(v, 2)}/s`;
const fmtOptional = (v: number | undefined, f: (n: number) => string) => (v === undefined ? "—" : f(v));

function determineTrend(current?: number, next?: number, higherIsBetter = true): ComparisonTrend {
    if (current === undefined || next === undefined) return "neutral";
    const delta = next - current;
    if (Math.abs(delta) < COMPARISON_EPSILON) return "neutral";
    const improved = higherIsBetter ? delta > 0 : delta < 0;
    return improved ? "better" : "worse";
}

function createComparisonLine(
    label: string,
    current?: number,
    next?: number,
    higherIsBetter = true,
    formatter: (value: number) => string = v => fmtNum(v, 2)
): WeaponComparisonLine | undefined {
    if (current === undefined && next === undefined) return undefined;
    return {
        label,
        current: current === undefined ? "—" : formatter(current),
        next: next === undefined ? "—" : formatter(next),
        trend: determineTrend(current, next, higherIsBetter)
    };
}

function createCondensedDiffLine(
    label: string,
    current?: number,
    next?: number,
    higherIsBetter = true,
    formatter: (value: number) => string = v => fmtNum(v, 2)
): CondensedComparisonLine | undefined {
    if (current === undefined || next === undefined) return undefined;
    const trend = determineTrend(current, next, higherIsBetter);
    const delta = Math.abs(next - current);
    const magnitude = formatter(trend === "neutral" ? 0 : delta);
    const sign = trend === "neutral" ? "=" : trend === "better" ? "+" : "-";
    return { label, value: `${sign}${magnitude}`, trend };
}

function buildCondensedDiffLines(inputs: CondensedDiffInput[]): CondensedComparisonLine[] {
    return inputs
        .map(({ label, current, next, higherIsBetter, formatter }) =>
            createCondensedDiffLine(label, current, next, higherIsBetter, formatter)
        )
        .filter(Boolean) as CondensedComparisonLine[];
}

const createCondensedValueLine = (label: string, value: string): CondensedComparisonLine => ({
    label,
    value,
    trend: "neutral"
});

function buildSpecialCondensedLine(
    label: string,
    currentTags: string[],
    nextTags: string[]
): CondensedComparisonLine | undefined {
    if (!currentTags.length && !nextTags.length) return undefined;

    const nextExtras = nextTags.filter(tag => !currentTags.includes(tag));
    const currentExtras = currentTags.filter(tag => !nextTags.includes(tag));

    let trend: ComparisonTrend = "neutral";
    if (nextExtras.length && !currentExtras.length) trend = "better";
    else if (!nextExtras.length && currentExtras.length) trend = "worse";

    const displayValue = nextTags.length ? formatTagList(nextTags) : formatTagList(currentTags);
    return { label, value: displayValue, trend };
}

function getGunDamage(def: GunDefinition): number {
    return def.ballistics.damage * (def.bulletCount ?? 1);
}

function getExplosionDamage(def: GunDefinition): number | undefined {
    const ref = def.ballistics.onHitExplosion;
    if (!ref) return undefined;
    return Explosions.fromStringSafe(ref)?.damage;
}

function getGunReloadTime(def: GunDefinition): number | undefined {
    return def.reloadFullOnEmpty ? def.fullReloadTime : def.reloadTime;
}

function getGunFireRate(def: GunDefinition): number | undefined {
    if (def.fireDelay <= 0) return undefined;
    return 1000 / def.fireDelay;
}

function getGunDPS(def: GunDefinition): number | undefined {
    const rate = getGunFireRate(def);
    return rate === undefined ? undefined : getGunDamage(def) * rate;
}

function getGunTotalDPS(def: GunDefinition): number | undefined {
    const rate = getGunFireRate(def);
    if (rate === undefined) return undefined;
    const explode = getExplosionDamage(def) ?? 0;
    return (getGunDamage(def) + explode) * rate;
}

function getGunCondensedLines(current: GunDefinition, next: GunDefinition): CondensedComparisonLine[] {
    const explosionCurrent = getExplosionDamage(current) ?? 0;
    const explosionNext = getExplosionDamage(next) ?? 0;

    const lines = buildCondensedDiffLines([
        { label: "DPS", current: getGunTotalDPS(current), next: getGunTotalDPS(next), formatter: v => fmtNum(v, 1) },
        { label: "Reload", current: getGunReloadTime(current), next: getGunReloadTime(next), higherIsBetter: false, formatter: fmtSec },
        { label: "Spread", current: current.shotSpread, next: next.shotSpread, higherIsBetter: false, formatter: fmtDeg }
    ]);

    if (explosionCurrent || explosionNext) {
        const dpsLine = lines.find(l => l.label === "DPS");
        if (dpsLine) dpsLine.trend = "neutral";
    }

    const specialCondensed = buildSpecialCondensedLine("Special", getGunSpecialTags(current), getGunSpecialTags(next));
    if (specialCondensed) lines.push(specialCondensed);

    return lines;
}

function getGunCondensedInspectLines(def: GunDefinition): CondensedComparisonLine[] {
    const result = [
        createCondensedValueLine("DPS", fmtOptional(getGunTotalDPS(def), v => fmtNum(v, 1))),
        createCondensedValueLine("Reload", fmtOptional(getGunReloadTime(def), fmtSec)),
        createCondensedValueLine("Spread", fmtDeg(def.shotSpread))
    ];
    const specialTags = getGunSpecialTags(def);
    if (specialTags.length) {
        result.push({ label: "Special", value: formatTagList(specialTags), trend: "neutral" });
    }
    return result;
}

function getMeleeCondensedLines(current: MeleeDefinition, next: MeleeDefinition): CondensedComparisonLine[] {
    const lines = buildCondensedDiffLines([
        { label: "Damage", current: current.damage, next: next.damage, formatter: v => fmtNum(v, 0) },
        {
            label: "Cooldown",
            current: current.cooldown,
            next: next.cooldown,
            higherIsBetter: false,
            formatter: v => fmtSec(v / 1000)
        }
    ]);

    const specialCondensed = buildSpecialCondensedLine("Special", current.specialTags ?? [], next.specialTags ?? []);
    if (specialCondensed) lines.push(specialCondensed);
    return lines;
}

function getMeleeCondensedInspectLines(def: MeleeDefinition): CondensedComparisonLine[] {
    const result = [
        createCondensedValueLine("Damage", fmtNum(def.damage, 0)),
        createCondensedValueLine("Cooldown", fmtSec(def.cooldown / 1000))
    ];
    const tags = def.specialTags ?? [];
    if (tags.length) result.push(createCondensedValueLine("Special", formatTagList(tags)));
    return result;
}

function formatDamageValue(base?: number, explosion?: number): string {
    if (base === undefined) return "—";
    const baseText = fmtNum(base, 1);
    if (!explosion) return baseText;
    return `${baseText} (+${fmtNum(explosion, 1)})`;
}

function formatDpsValue(base?: number, total?: number): string {
    if (base === undefined) return "—";
    const baseText = fmtNum(base, 1);
    if (total === undefined || Math.abs(total - base) < COMPARISON_EPSILON) return baseText;
    return `${baseText} (${fmtNum(total, 1)})`;
}

function getGunSpecialTags(def: GunDefinition): string[] {
    const tags = new Set<string>();
    const { ballistics } = def;

    if (ballistics.onHitExplosion) tags.add("Explosive");
    if (ballistics.shrapnel) tags.add("Shrapnel");
    if (ballistics.enemySpeedMultiplier) tags.add("Slow");
    if (ballistics.teammateHeal) tags.add("Heals");
    if (ballistics.removePerk) tags.add("Perk Breaker");
    if (def.summonAirdrop) tags.add("Airdrop");
    if (def.infiniteAmmo) tags.add("Inf Ammo");
    if (def.consistentPatterning) tags.add("Consistent Patterning");
    const ammoDef = Ammos.fromStringSafe(def.ammoType);
    if (ammoDef?.ephemeral) tags.add("Inf Ammo");

    return [...tags];
}

function formatTagList(tags: string[], perLine = 2): string {
    if (!tags.length) return "None";
    const lines: string[] = [];
    for (let i = 0; i < tags.length; i += perLine) {
        lines.push(tags.slice(i, i + perLine).join(", "));
    }
    return lines.join("\n");
}

function createSpecialComparisonLine(label: string, current: string[], next: string[]): WeaponComparisonLine | undefined {
    if (!current.length && !next.length) return undefined;

    const nextExtras = next.filter(t => !current.includes(t));
    const currentExtras = current.filter(t => !next.includes(t));

    let trend: ComparisonTrend = "neutral";
    if (nextExtras.length && !currentExtras.length) trend = "better";
    else if (!nextExtras.length && currentExtras.length) trend = "worse";

    return {
        label,
        current: formatTagList(current),
        next: formatTagList(next),
        trend
    };
}

function compareGunDefinitions(current: GunDefinition, next: GunDefinition): WeaponComparisonLine[] {
    const reloadCurrent = getGunReloadTime(current);
    const reloadNext = getGunReloadTime(next);
    const currentSpecial = getGunSpecialTags(current);
    const nextSpecial = getGunSpecialTags(next);
    const currentExplosionDamage = getExplosionDamage(current);
    const nextExplosionDamage = getExplosionDamage(next);
    const currentTotalDps = getGunTotalDPS(current);
    const nextTotalDps = getGunTotalDPS(next);

    const lines = [
        createComparisonLine("Damage", getGunDamage(current), getGunDamage(next), true, v => fmtNum(v, 1)),
        createComparisonLine("DPS", getGunDPS(current), getGunDPS(next), true, v => fmtNum(v, 1)),
        createComparisonLine("Fire Rate", getGunFireRate(current), getGunFireRate(next), true, fmtRate),
        createComparisonLine("Reload", reloadCurrent, reloadNext, false, fmtSec),
        createComparisonLine("Spread", current.shotSpread, next.shotSpread, false, fmtDeg),
        createComparisonLine("Move Spread", current.moveSpread, next.moveSpread, false, fmtDeg),
        createComparisonLine("Move Speed", current.speedMultiplier, next.speedMultiplier, true, fmtMult),
        createComparisonLine("Range", current.ballistics.range, next.ballistics.range, true, v => fmtNum(v, 0)),
        createComparisonLine("Capacity", current.capacity, next.capacity, true, v => fmtNum(v, 0)),
        createSpecialComparisonLine("Special", currentSpecial, nextSpecial)
    ].filter(Boolean) as WeaponComparisonLine[];

    const damageLine = lines.find(l => l.label === "Damage");
    if (damageLine) {
        damageLine.current = formatDamageValue(getGunDamage(current), currentExplosionDamage);
        damageLine.next = formatDamageValue(getGunDamage(next), nextExplosionDamage);
        if (currentExplosionDamage || nextExplosionDamage) damageLine.trend = "neutral";
    }

    const dpsLine = lines.find(l => l.label === "DPS");
    if (dpsLine) {
        dpsLine.current = formatDpsValue(getGunDPS(current), currentTotalDps);
        dpsLine.next = formatDpsValue(getGunDPS(next), nextTotalDps);
        if (currentExplosionDamage || nextExplosionDamage) dpsLine.trend = "neutral";
    }

    return lines;
}

function compareMeleeDefinitions(current: MeleeDefinition, next: MeleeDefinition): WeaponComparisonLine[] {
    return [
        createComparisonLine("Damage", current.damage, next.damage, true, v => fmtNum(v, 0)),
        createComparisonLine("Cooldown", current.cooldown, next.cooldown, false, v => fmtSec(v / 1000)),
        createComparisonLine("Obstacle\nDMG Multi", current.obstacleMultiplier, next.obstacleMultiplier, true, v => fmtNum(v, 2)),
        createComparisonLine("Reach", current.radius, next.radius, true, v => fmtNum(v, 2)),
        createComparisonLine("Speed", current.speedMultiplier, next.speedMultiplier, true, v => fmtNum(v, 2))
    ].filter(Boolean) as WeaponComparisonLine[];
}

function convertToInspectionLines(lines: WeaponComparisonLine[]): WeaponComparisonLine[] {
    return lines.map(({ label, next }) => ({
        label,
        current: "",
        next,
        trend: "neutral"
    }));
}

function buildWeaponComparisonPayload<T extends WeaponDefinition>(
    loot: T,
    current: T | undefined,
    condensedEnabled: boolean,
    builder: WeaponComparisonBuilder<T>
): WeaponComparisonPayload {
    const comparing = current !== undefined;
    const lines = builder.compare(current ?? loot, loot);
    const mode: "compare" | "inspect" = comparing ? "compare" : "inspect";

    return {
        key: `${condensedEnabled ? "condensed" : "full"}:${comparing ? `${current.idString}->` : ""}${loot.idString}`,
        lines: comparing ? lines : convertToInspectionLines(lines),
        mode,
        condensedLines: condensedEnabled
            ? comparing
                ? builder.condensedCompare(current, loot)
                : builder.condensedInspect(loot)
            : undefined
    };
}

function getWeaponComparisonPayload(
    lootDefinition: LootDefinition | undefined,
    currentWeapon: WeaponDefinition | undefined,
    enabled: boolean,
    condensedEnabled: boolean
): WeaponComparisonPayload | undefined {
    if (!enabled || !lootDefinition) return undefined;
    if (lootDefinition.defType !== DefinitionType.Gun && lootDefinition.defType !== DefinitionType.Melee) return undefined;

    const current = currentWeapon?.defType === lootDefinition.defType ? currentWeapon : undefined;

    const payload =
        lootDefinition.defType === DefinitionType.Gun
            ? buildWeaponComparisonPayload(
                  lootDefinition as GunDefinition,
                  current as GunDefinition | undefined,
                  condensedEnabled,
                  {
                      compare: compareGunDefinitions,
                      condensedCompare: getGunCondensedLines,
                      condensedInspect: getGunCondensedInspectLines
                  }
              )
            : buildWeaponComparisonPayload(
                  lootDefinition as MeleeDefinition,
                  current as MeleeDefinition | undefined,
                  condensedEnabled,
                  {
                      compare: compareMeleeDefinitions,
                      condensedCompare: getMeleeCondensedLines,
                      condensedInspect: getMeleeCondensedInspectLines
                  }
              );

    return payload.lines.length ? payload : undefined;
}

let lastRenderedComparisonKey: string | undefined;

function renderWeaponComparison(payload?: WeaponComparisonPayload): void {
    const { weaponComparisonList, interactMsg } = UIManager.ui;
    const payloadKey = payload ? `${payload.mode}:${payload.key}` : undefined;

    if (payloadKey === lastRenderedComparisonKey) return;
    lastRenderedComparisonKey = payloadKey;

    if (!payload || (!payload.lines.length && !payload.condensedLines?.length)) {
        interactMsg.removeClass("has-comparison inspect-mode");
        weaponComparisonList.empty();
        return;
    }

    const { lines, mode, condensedLines } = payload;

    interactMsg.addClass("has-comparison");
    interactMsg.toggleClass("inspect-mode", mode === "inspect");
    weaponComparisonList.empty();

    if (condensedLines?.length) {
        for (const line of condensedLines) {
            const row = $("<div>").addClass("weapon-comparison-line weapon-comparison-line--condensed");
            $("<span>").addClass("weapon-comparison-label").text(line.label).appendTo(row);

            const values = $("<div>")
                .addClass("weapon-comparison-values weapon-comparison-values--condensed")
                .appendTo(row);

            $("<span>")
                .addClass(
                    `weapon-comparison-diff weapon-comparison-diff--${
                        mode === "compare" ? line.trend : "neutral"
                    }${mode === "inspect" ? " weapon-comparison-diff--inspect" : ""}`
                )
                .text(line.value)
                .appendTo(values);

            weaponComparisonList.append(row);
        }
        return;
    }

    for (const line of lines) {
        const row = $("<div>").addClass("weapon-comparison-line");
        $("<span>").addClass("weapon-comparison-label").text(line.label).appendTo(row);

        const values = $("<div>").addClass("weapon-comparison-values").appendTo(row);

        if (mode === "inspect") {
            values.addClass("weapon-comparison-values--inspect");
            $("<span>").addClass("weapon-comparison-new").text(line.next ?? "—").appendTo(values);
        } else {
            $("<span>").addClass("weapon-comparison-original").text(line.current ?? "—").appendTo(values);
            $("<span>").addClass(`weapon-comparison-arrow weapon-comparison-arrow--${line.trend}`).text("→").appendTo(values);
            $("<span>").addClass("weapon-comparison-new").text(line.next ?? "—").appendTo(values);
        }

        weaponComparisonList.append(row);
    }
}


export const Game = new (class Game {
    private _socket?: WebSocket;

    socketCloseCallback?: (value: unknown) => void;

    readonly objects = new ObjectPool<ObjectMapping>();
    readonly bullets = new Set<Bullet>();
    readonly planes = new Set<Plane>();

    ambience?: GameSound;
    riverAmbience!: GameSound;
    oceanAmbience!: GameSound;

    layerTween?: Tween<Container>;

    readonly spinningImages = new Map<SuroiSprite, number>();

    readonly playerNames = new Map<number, {
        readonly name: string
        readonly hasColor: boolean
        readonly nameColor: Color
        readonly badge?: BadgeDefinition
    }>();

    activePlayerID = -1;
    teamID = -1;

    isTeamMode = false;

    debugMenu?: DebugMenu;

    _modeName: ModeName | undefined;
    get modeName(): ModeName {
        if (this._modeName === undefined) throw new Error("modeName accessed before initialization");
        return this._modeName;
    }

    set modeName(modeName: ModeName) {
        this._modeName = modeName;
        this._mode = Modes[this.modeName];

        // Converts the strings in the mode definition to Color objects
        this._colors = (Object.entries(this.mode.colors) as [ColorKeys, string][]).reduce(
            (result, [key, color]) => {
                result[key] = new Color(color);
                return result;
            },
            {} as Colors
        );

        // pixi filters don't apply to the background, so we have to apply them here separately
        const canvasFilters = this.mode.canvasFilters;
        if (canvasFilters) {
            const { h, s, l } = colord(this.colors.grass.toRgbaString()).toHsl();
            this.colors.background = new Color(`hsl(${h}, ${s * canvasFilters.saturation}%, ${l * canvasFilters.brightness}%)`);
        } else {
            this.colors.background = this.colors.grass;
        }

        this._colors.ghillie = new Color(this._colors.grass).multiply("hsl(0, 0%, 99%)");
    }

    _mode: ModeDefinition | undefined;
    get mode(): ModeDefinition {
        if (!this._mode) throw new Error("mode accessed before initialization");
        return this._mode;
    }

    private _colors: Colors | undefined;
    get colors(): Colors {
        if (!this._colors) throw new Error("colors accessed before initialization");
        return this._colors;
    }

    /**
     * proxy for `activePlayer`'s layer
     */
    get layer(): Layer {
        return this.activePlayer?.layer ?? Layer.Ground;
    }

    get activePlayer(): Player | undefined {
        return this.objects.get(this.activePlayerID) as Player;
    }

    connecting = false;
    gameStarted = false;
    gameOver = false;
    spectating = false;
    error = false;

    hideSecondFloor = false;

    readonly pixi = new Application();

    gasRender!: GasRender;

    readonly netGraph = setUpNetGraph();

    readonly fontObserver = new FontFaceObserver("Inter", { weight: 600 }).load();

    music!: Sound;

    readonly tweens = new Set<Tween<object>>();

    private readonly _timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay?: number): Timeout {
        const timeout = new Timeout(callback, Date.now() + (delay ?? 0));
        this._timeouts.add(timeout);
        return timeout;
    }

    private _initialized = false;
    async init(): Promise<void> {
        if (this._initialized) {
            throw new Error("'Game' has already been initialized.");
        }
        this._initialized = true;

        GameConsole.init();
        setUpCommands();
        await initTranslation();
        InputManager.init();
        if (DEBUG_CLIENT) {
            this.debugMenu = new (await import("./utils/debugMenu")).DebugMenu();
            this.debugMenu.init();
        }
        await setUpUI();
        await fetchServerData();
        this.gasRender = new GasRender(PIXI_SCALE);
        MapManager.init();
        CameraManager.init();
        GasManager.init();

        const initPixi = async(): Promise<void> => {
            const renderMode = GameConsole.getBuiltInCVar("cv_renderer");
            const renderRes = GameConsole.getBuiltInCVar("cv_renderer_res");

            const pixi = this.pixi;
            await pixi.init({
                resizeTo: window,
                background: this.colors.background,
                antialias: InputManager.isMobile
                    ? GameConsole.getBuiltInCVar("mb_antialias")
                    : GameConsole.getBuiltInCVar("cv_antialias"),
                autoDensity: true,
                preferWebGLVersion: renderMode === "webgl1" ? 1 : 2,
                preference: renderMode === "webgpu" ? "webgpu" : "webgl",
                resolution: renderRes === "auto" ? (window.devicePixelRatio || 1) : parseFloat(renderRes),
                hello: true,
                autoStart: false,
                canvas: document.getElementById("game-canvas") as HTMLCanvasElement,
                // we only use pixi click events (to spectate players on click)
                // so other events can be disabled for performance
                eventFeatures: {
                    move: false,
                    globalMove: false,
                    wheel: false,
                    click: true
                }
            });

            // Setting preferCreateImageBitmap to false reduces RAM usage in most browsers
            if (!GameConsole.getBuiltInCVar("cv_alt_texture_loading") && loadTextures.config) {
                loadTextures.config.preferCreateImageBitmap = false;
            }

            void loadSpritesheets(
                this.modeName,
                pixi.renderer,
                InputManager.isMobile
                    ? GameConsole.getBuiltInCVar("mb_high_res_textures")
                    : GameConsole.getBuiltInCVar("cv_high_res_textures")
            ).then(() => {
                EmoteWheelManager.init();
                MapPingWheelManager.init();
                MapPingWheelManager.setupSlots();
            });

            // HACK: the game ui covers the canvas
            // so send pointer events manually to make clicking to spectate players work
            UIManager.ui.gameUi[0].addEventListener("pointerdown", e => {
                pixi.canvas.dispatchEvent(new PointerEvent("pointerdown", {
                    pointerId: e.pointerId,
                    button: e.button,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenY: e.screenY,
                    screenX: e.screenX
                }));
            });

            pixi.ticker.add(this.render.bind(this));

            const gameContainer = new Container({ isRenderGroup: true });
            gameContainer.addChild(CameraManager.container);
            if (DEBUG_CLIENT) gameContainer.addChild(DebugRenderer.graphics);

            const uiContainer = new Container({ isRenderGroup: true });
            uiContainer.addChild(
                MapManager.container,
                MapManager.mask,
                ...Object.values(this.netGraph).map(g => g.container),
                EmoteWheelManager.container,
                MapPingWheelManager.container
            );

            pixi.stage.addChild(gameContainer, uiContainer);

            MapManager.visible = !GameConsole.getBuiltInCVar("cv_minimap_minimized");
            MapManager.expanded = GameConsole.getBuiltInCVar("cv_map_expanded");
            UIManager.ui.gameUi.toggle(GameConsole.getBuiltInCVar("cv_draw_hud"));

            pixi.renderer.on("resize", () => this.resize());
            this.resize();
        };

        let menuMusicSuffix: string;
        if (GameConsole.getBuiltInCVar("cv_use_old_menu_music")) {
            menuMusicSuffix = "_old";
        } else if (this.mode.replaceMenuMusic) {
            const modeName_ = Modes[this.modeName].similarTo ?? this.modeName;
            menuMusicSuffix = `_${modeName_}`;
        } else {
            menuMusicSuffix = "";
        }
        this.music = sound.add("menu_music", {
            url: `./audio/music/menu_music${menuMusicSuffix}.mp3`,
            singleInstance: true,
            preload: true,
            autoPlay: true,
            loop: true,
            volume: GameConsole.getBuiltInCVar("cv_music_volume")
        });

        void Promise.all([
            initPixi(),
            SoundManager.init(),
            finalizeUI()
        ]).then(() => {
            unlockPlayButtons();
            resetPlayButtons();
        });
    }

    resize(): void {
        MapManager.resize();
        CameraManager.resize(true);
    }

    updateAmbience(): void {
        if (!this.activePlayer || this.mode.noRiverAmbience) return;

        const position = this.activePlayer.position;

        // TODO Optimize this function to use the distance from the edge of the map
        // rather than the beach hitbox
        const oceanDistance = MapManager.distanceToShoreSquared(position);
        this.oceanAmbience.volume = Numeric.delerp(oceanDistance, 4225, 0);

        let riverWeight = 0;
        const rivers = MapManager.terrain.rivers;
        for (let i = 0, len = rivers.length; i < len; i++) { // hasanger mwah optimization
            const river = rivers[i];
            if (river.isTrail) continue;

            const closestPoint = river.getPosition(river.getClosestT(position)),
                  distanceToRiver = Geometry.distanceSquared(position, closestPoint),
                  riverWidth = river.waterWidths[i] + 2,
                  normalizedDistance = Numeric.delerp(distanceToRiver, (30 + riverWidth) ** 2, riverWidth ** 2),
                  riverStrength = Numeric.clamp(river.waterWidths[i] / 8, 0.25, 1);
            riverWeight = Numeric.max(normalizedDistance * riverStrength, riverWeight);
        }
        this.riverAmbience.volume = riverWeight;
    }

    connect(address: string): void {
        this.error = false;

        if (this.gameStarted) return;

        this._socket = new WebSocket(address);
        this._socket.binaryType = "arraybuffer";

        this._socket.onopen = (): void => {
            this.pixi.start();
            this.music?.stop();
            this.connecting = false;
            this.gameStarted = true;
            this.gameOver = false;
            this.spectating = false;

            for (const graph of Object.values(this.netGraph)) graph.clear();

            if (!UI_DEBUG_MODE) {
                clearTimeout(UIManager.gameOverScreenTimeout);
                const ui = UIManager.ui;

                ui.gameOverOverlay.hide();
                ui.killMsgModal.hide();
                ui.killMsgCounter.text("0");
                ui.killFeed.html("");
                ui.spectatingContainer.hide();
                ui.joystickContainer.show();
            }

            let skin: typeof defaultClientCVars["cv_loadout_skin"];
            this.sendPacket(JoinPacket.create({
                isMobile: InputManager.isMobile,
                name: GameConsole.getBuiltInCVar("cv_player_name"),
                skin: Skins.fromStringSafe(
                    GameConsole.getBuiltInCVar("cv_loadout_skin")
                ) ?? Skins.fromString(
                    typeof (skin = defaultClientCVars.cv_loadout_skin) === "object"
                        ? skin.value
                        : skin
                ),
                badge: Badges.fromStringSafe(GameConsole.getBuiltInCVar("cv_loadout_badge")),
                emotes: EMOTE_SLOTS.map(
                    slot => Emotes.fromStringSafe(GameConsole.getBuiltInCVar(`cv_loadout_${slot}_emote`))
                )
            }));

            this.gasRender.graphics.zIndex = 1000;
            CameraManager.addObject(this.gasRender.graphics);
            MapManager.indicator.setFrame("player_indicator");

            const particleEffects = this.mode.particleEffects;

            if (particleEffects !== undefined) {
                const This = this;
                const gravityOn = particleEffects.gravity;
                ParticleManager.addEmitter({
                    delay: particleEffects.delay,
                    active: GameConsole.getBuiltInCVar("cv_ambient_particles"),
                    spawnOptions: () => ({
                        frames: particleEffects.frames,
                        get position(): Vector {
                            const width = CameraManager.width / PIXI_SCALE;
                            const height = CameraManager.height / PIXI_SCALE;
                            const player = This.activePlayer;
                            if (!player) return Vec(0, 0);
                            const { x, y } = player.position;
                            return randomVector(x - width, x + width, y - height, y + height);
                        },
                        speed: randomVector(-10, 10, gravityOn ? 10 : -10, 10),
                        lifetime: randomFloat(12000, 50000),
                        zIndex: Number.MAX_SAFE_INTEGER - 5,
                        alpha: {
                            start: this.layer === Layer.Ground ? 0.7 : 0,
                            end: 0
                        },
                        rotation: {
                            start: randomFloat(0, 36),
                            end: randomFloat(40, 80)
                        },
                        scale: {
                            start: randomFloat(0.8, 1.1),
                            end: randomFloat(0.7, 0.8)
                        }
                    })
                });
            }
        };

        // Handle incoming messages
        this._socket.onmessage = (message: MessageEvent<ArrayBuffer>): void => {
            const stream = new PacketStream(message.data);
            let iterationCount = 0;
            const splits = [0, 0, 0, 0, 0, 0, 0] satisfies DataSplit;
            while (true) {
                if (++iterationCount === 1e3) {
                    console.warn("1000 iterations of packet reading; possible infinite loop");
                }
                const packet = stream.deserialize(splits);
                if (packet === undefined) break;
                this.onPacket(packet);
            }

            const msgLength = message.data.byteLength;
            this.netGraph.receiving.addEntry(msgLength, splits);
        };

        const ui = UIManager.ui;

        this._socket.onerror = (): void => {
            this.pixi.stop();
            this.error = true;
            this.connecting = false;
            ui.splashMsgText.html(getTranslatedString("msg_err_joining"));
            ui.splashMsg.show();
            resetPlayButtons();
        };

        this._socket.onclose = (e: CloseEvent): void => {
            this.pixi.stop();
            this.connecting = false;
            this.socketCloseCallback?.(undefined);
            resetPlayButtons();

            const reason = e.reason || "Connection lost";

            if (reason.startsWith("Invalid game version")) {
                alert(reason);
                // reload the page with a time stamp to try clearing cache
                location.search = `t=${Date.now()}`;
            }

            if (!this.gameOver) {
                if (this.gameStarted) {
                    ui.splashUi.fadeIn(400);
                    ui.splashMsgText.html(reason);
                    ui.splashMsg.show();
                }
                ui.btnSpectate.addClass("btn-disabled");
                if (!this.error) void this.endGame();
            } else {
                for (const sound of SoundManager.updatableSounds) {
                    sound.stop();
                }
            }
        };
    }

    inventoryMsgTimeout: number | undefined;

    onPacket(packet: PacketDataOut): void {
        switch (packet.type) {
            case PacketType.Joined:
                this.startGame(packet);
                break;
            case PacketType.Map:
                MapManager.updateFromPacket(packet);
                break;
            case PacketType.Update:
                this.processUpdate(packet);
                break;
            case PacketType.GameOver:
                UIManager.showGameOverScreen(packet);
                break;
            case PacketType.Kill:
                UIManager.processKillPacket(packet);
                break;
            case PacketType.Report: {
                UIManager.processReportPacket(packet);
                break;
            }
            case PacketType.Pickup: {
                const { message, item } = packet;

                if (message !== undefined) {
                    const { inventoryMsg } = UIManager.ui;
                    inventoryMsg.text(getTranslatedString(this._inventoryMessageMap[message])).fadeOut(0).fadeIn(250);

                    clearTimeout(this.inventoryMsgTimeout);
                    this.inventoryMsgTimeout = window.setTimeout(() => inventoryMsg.fadeOut(250), 2500);
                } else if (item !== undefined) {
                    let soundID: string;
                    switch (item.defType) {
                        case DefinitionType.Ammo:
                            soundID = "ammo_pickup";
                            break;
                        case DefinitionType.HealingItem:
                            soundID = `${item.idString}_pickup`;
                            break;
                        case DefinitionType.Scope:
                            soundID = "scope_pickup";
                            break;
                        case DefinitionType.Armor:
                            if (item.armorType === ArmorType.Helmet) soundID = "helmet_pickup";
                            else soundID = "vest_pickup";
                            break;
                        case DefinitionType.Backpack:
                            soundID = "backpack_pickup";
                            break;
                        case DefinitionType.Throwable:
                            soundID = "throwable_switch";
                            break;
                        case DefinitionType.Perk:
                            soundID = "pickup";
                            break;
                        default:
                            soundID = "pickup";
                            break;
                    }

                    SoundManager.play(soundID);
                } else {
                    console.warn("Unexpected PickupPacket with neither message nor item");
                }
                break;
            }
        }
    }

    private readonly _inventoryMessageMap: Record<InventoryMessages, TranslationKeys> = {
        [InventoryMessages.NotEnoughSpace]: "msg_not_enough_space",
        [InventoryMessages.ItemAlreadyEquipped]: "msg_item_already_equipped",
        [InventoryMessages.BetterItemEquipped]: "msg_better_item_equipped",
        [InventoryMessages.CannotUseFlare]: "msg_cannot_use_flare"
    };

    startGame(packet: JoinedData): void {
        // Sound which notifies the player that the
        // game started if page is out of focus.
        if (!document.hasFocus()) SoundManager.play("join_notification");

        const ambience = this.mode.ambience;
        if (ambience) {
            this.ambience = SoundManager.play(ambience, { loop: true, ambient: true });
            if (this.mode.ambienceVolume !== undefined) {
                this.ambience.volume = this.mode.ambienceVolume;
            }
        }

        if (!this.mode.noRiverAmbience) {
            this.riverAmbience = SoundManager.play("river_ambience", { loop: true, ambient: true });
            this.riverAmbience.volume = 0;

            this.oceanAmbience = SoundManager.play("ocean_ambience", { loop: true, ambient: true });
            this.oceanAmbience.volume = 0;
        }

        const emotes = EmoteWheelManager.emotes = packet.emotes
            .slice(0, 6)
            .filter(e => e !== undefined)
            .map(({ idString }) => idString);
        const len = emotes.length;
        emotes.push(...emotes.splice(0, (1 % len + len) % len)); // rotates the array so emotes appear in the correct order
        EmoteWheelManager.setupSlots();
        UIManager.updateRequestableItems();
        MapManager.resize();

        const ui = UIManager.ui;

        if (this.isTeamMode = packet.teamMode !== TeamMode.Solo) {
            this.teamID = packet.teamID;
        }

        ui.inventoryMsg.fadeOut(PERK_MESSAGE_FADE_TIME);

        ui.canvas.addClass("active");
        ui.splashUi.fadeOut(400, () => resetPlayButtons());

        ui.killLeaderLeader.html(getTranslatedString("msg_waiting_for_leader"));
        ui.killLeaderCount.text("0");
        ui.spectateKillLeader.addClass("btn-disabled");

        if (!UI_DEBUG_MODE) ui.teamContainer.toggle(this.isTeamMode);

        // send the packet to sync our local configs when joining
        this.debugMenu?.sendPacket();
    }

    async endGame(): Promise<void> {
        return await new Promise(resolve => {
            const ui = UIManager.ui;

            ui.gameMenu.fadeOut(250);
            ui.splashOptions.addClass("loading");
            ui.loaderText.text("");

            SoundManager.stopAll();
            this.gameOver = true;
            this._socket?.close();

            ui.splashUi.fadeIn(400, async() => {
                this.pixi.stop();
                void this.music?.play();

                for (const object of this.objects) object.destroy();
                for (const plane of this.planes) plane.destroy();
                this.objects.clear();
                this.bullets.clear();
                this.planes.clear();
                this.playerNames.clear();
                this._timeouts.clear();

                CameraManager.reset();
                GasManager.reset();
                MapManager.reset();
                ParticleManager.reset();
                ScreenRecordManager.reset();
                UIManager.reset();

                // Wait for the socket to close if it hasn't already
                if (this._socket?.readyState !== WebSocket.CLOSED) {
                    await new Promise(resolve => this.socketCloseCallback = resolve);
                }

                updateDisconnectTime();
                resetPlayButtons();

                this.gameStarted = false;

                if (teamSocket) ui.createTeamMenu.fadeIn(250, resolve);
                else resolve();
            });
        });
    }

    private readonly _packetStream = new PacketStream(new ArrayBuffer(1024));
    sendPacket(packet: PacketDataIn): void {
        this._packetStream.stream.index = 0;
        this._packetStream.serialize(packet);
        this.sendData(this._packetStream.getBuffer());
    }

    sendData(buffer: ArrayBuffer): void {
        if (this._socket?.readyState === WebSocket.OPEN) {
            this.netGraph.sending.addEntry(buffer.byteLength);
            try {
                this._socket.send(buffer);
            } catch (e) {
                console.warn("Error sending packet. Details:", e);
            }
        }
    }

    render(): void {
        if (!this.gameStarted) return;
        const delta = this.pixi.ticker.deltaMS;

        // execute timeouts
        const now = Date.now();
        for (const timeout of this._timeouts) {
            if (timeout.killed) {
                this._timeouts.delete(timeout);
                continue;
            }
            if (now > timeout.end) {
                timeout.callback();
                this._timeouts.delete(timeout);
            }
        }

        const hasMovementSmoothing = GameConsole.getBuiltInCVar("cv_movement_smoothing");

        const showHitboxes = GameConsole.getBuiltInCVar("db_show_hitboxes");

        for (const object of this.objects) {
            object.update();
            if (hasMovementSmoothing) object.updateInterpolation();

            if (DEBUG_CLIENT) {
                if (showHitboxes) object.updateDebugGraphics();
            }
        }

        if (hasMovementSmoothing && this.activePlayer) {
            CameraManager.position = this.activePlayer.container.position;
        }

        for (const [image, spinSpeed] of this.spinningImages.entries()) {
            image.rotation += spinSpeed * delta;
        }

        for (const tween of this.tweens) tween.update();

        for (const bullet of this.bullets) bullet.update(delta);

        ParticleManager.update(delta);

        MapManager.update();
        this.gasRender.update();

        for (const plane of this.planes) plane.update();

        CameraManager.update();

        EmoteWheelManager.update();
        MapPingWheelManager.update();

        if (DEBUG_CLIENT) {
            DebugRenderer.graphics.position = CameraManager.container.position;
            DebugRenderer.graphics.scale = CameraManager.container.scale;
            DebugRenderer.render();
        }

        if (GameConsole.getBuiltInCVar("pf_show_fps")) {
            const fps = Math.round(this.pixi.ticker.FPS);
            this.netGraph.fps.addEntry(fps);
        }
    }

    private _lastUpdateTime = 0;
    get lastUpdateTime(): number { return this._lastUpdateTime; }

    /**
     * Otherwise known as "time since last update", in milliseconds
     */
    private _serverDt = 0;
    /**
     * Otherwise known as "time since last update", in milliseconds
     */
    get serverDt(): number { return this._serverDt; }

    private _pingSeq = -1;

    private readonly _seqsSent: Array<number | undefined> = [];
    get seqsSent(): Array<number | undefined> { return this._seqsSent; }

    takePingSeq(): number {
        const n = this._pingSeq = (this._pingSeq + 1) % 128;
        this._seqsSent[n] = Date.now();
        return n;
    }

    processUpdate(updateData: UpdateDataOut): void {
        const now = Date.now();
        this._serverDt = now - this._lastUpdateTime;
        this._lastUpdateTime = now;

        for (const { id, name, hasColor, nameColor, badge } of updateData.newPlayers ?? []) {
            this.playerNames.set(id, {
                name: name,
                hasColor: hasColor,
                nameColor: new Color(nameColor),
                badge: badge
            });
        }

        const playerData = updateData.playerData;
        if (playerData) {
            UIManager.updateUI(playerData);
            UIManager.updateWeaponSlots(); // to load reskins

            if (this.spectating && playerData.teamID !== undefined && playerData.id !== undefined) {
                this.teamID = playerData.teamID;
            }
        }

        for (const deletedPlayerId of updateData.deletedPlayers ?? []) {
            this.playerNames.delete(deletedPlayerId);
        }

        for (const { id, type, data } of updateData.fullDirtyObjects ?? []) {
            const object: GameObject | undefined = this.objects.get(id);

            if (object === undefined || object.destroyed) {
                type K = typeof type;

                const _object = new (
                    ObjectClassMapping[type] as new (id: number, data: ObjectsNetData[K]) => InstanceType<ObjectClassMapping[K]>
                )(id, data);
                this.objects.add(_object);
            } else {
                object.updateFromData(data, false);
            }
        }

        for (const { id, data } of updateData.partialDirtyObjects ?? []) {
            const object = this.objects.get(id);
            if (object === undefined) {
                console.warn(`Trying to partially update non-existant object with ID ${id}`);
                continue;
            }

            (object as GameObject).updateFromData(data, false);
        }

        for (const id of updateData.deletedObjects ?? []) {
            const object = this.objects.get(id);
            if (object === undefined) {
                console.warn(`Trying to delete unknown object with ID ${id}`);
                continue;
            }

            object.destroy();
            this.objects.delete(object);
        }

        for (const bullet of updateData.deserializedBullets ?? []) {
            this.bullets.add(new Bullet(bullet));
        }

        for (const explosionData of updateData.explosions ?? []) {
            explosion(explosionData.definition, explosionData.position, explosionData.layer);
        }

        for (const emote of updateData.emotes ?? []) {
            if (
                GameConsole.getBuiltInCVar("cv_hide_emotes")
                && emote.definition.defType === DefinitionType.Emote // healing item/weapon emotes are always displayed
            ) break;

            const player = this.objects.get(emote.playerID);
            if (player?.isPlayer) {
                player.showEmote(emote.definition);
            } else {
                console.warn(`Tried to emote on behalf of ${player === undefined ? "a non-existant player" : `a/an ${ObjectCategory[player.type]}`}`);
                continue;
            }
        }

        GasManager.updateFrom(updateData);

        if (updateData.aliveCount !== undefined) {
            const { playerAlive, btnSpectate } = UIManager.ui;
            playerAlive.text(updateData.aliveCount);
            btnSpectate.toggle(updateData.aliveCount > 1);
        }

        for (const plane of updateData.planes ?? []) {
            this.planes.add(new Plane(plane.position, plane.direction));
        }

        for (const ping of updateData.mapPings ?? []) {
            MapManager.addMapPing(ping);
        }

        for (const indicator of updateData.mapIndicators ?? []) {
            MapManager.updateMapIndicator(indicator);
        }

        if (updateData.killLeader) {
            UIManager.updateKillLeader(updateData.killLeader);
        }

        this.tick();
    }

    addTween<T extends object>(config: TweenOptions<T>): Tween<T> {
        const tween = new Tween(config);
        this.tweens.add(tween);
        return tween;
    }

    removeTween(tween: Tween<object>): void {
        this.tweens.delete(tween);
    }

    backgroundTween?: Tween<{ readonly r: number, readonly g: number, readonly b: number }>;
    volumeTween?: Tween<GameSound>;

    updateLayer(newLayer: Layer, initial = false, oldLayer?: Layer): void {
        CameraManager.updateLayer(newLayer, initial, oldLayer);

        for (const sound of SoundManager.updatableSounds) {
            sound.updateLayer();
            sound.update();
        }
        // slight hack
        // if we don't do this then ambience will play at the wrong volume for a tick
        this.riverAmbience?.layerVolumeTween?.kill();
        this.oceanAmbience?.layerVolumeTween?.kill();
        this.updateAmbience();

        const basement = newLayer === Layer.Basement;
        MapManager.terrainGraphics.visible = !basement;

        const currentColor = this.pixi.renderer.background.color;
        const targetColor = basement ? this.colors.void : this.colors.background;

        if (currentColor.toNumber() !== targetColor.toNumber()) {
            const { red, green, blue } = currentColor;
            const color = { r: red * 255, g: green * 255, b: blue * 255 };

            this.backgroundTween?.kill();
            this.backgroundTween = this.addTween({
                target: color,
                to: { r: targetColor.red * 255, g: targetColor.green * 255, b: targetColor.blue * 255 },
                onUpdate: () => {
                    this.pixi.renderer.background.color = new Color(color);
                },
                duration: LAYER_TRANSITION_DELAY,
                onComplete: () => { this.backgroundTween = undefined; }
            });
        }
    }

    // yes this might seem evil. but the two local variables really only need to
    // exist so this method can use them: therefore, making them attributes on the
    // enclosing instance is pointless and might induce people into thinking they
    // can use them to do something when they probably can't and shouldn't
    readonly tick = (() => {
        /**
         * Context: rerendering ui elements needlessly is bad, so we
         * determine the information that should trigger a re-render if
         * changed, and cache them in order to detect such changes
         *
         * In the case of the pickup message thingy, those informations are:
         * - the item the pickup message concerns
         * - its quantity
         * - the bind to interact has changed
         * - whether the user can interact with it
        */
        const cache: {
            object?: Loot | Obstacle | Player
            offset?: number
            isAction?: boolean
            bind?: string
            canInteract?: boolean
            comparisonKey?: string
        } = {};

        /**
         * When a bind is changed, the corresponding html won't
         * get changed because rendering only occurs when an item
         * is interactable. We thus store whether the intent to
         * change was acknowledged here.
         */
        let bindChangeAcknowledged = false;

        // same idea as above
        const funnyDetonateButtonCache: {
            bind?: string
        } = {};

        // keep image thingy around to consult (and therefore lazily change) src
        let detonateBindIcon: JQuery<HTMLImageElement> | undefined;

        return () => {
            if (!this.gameStarted || (this.gameOver && !this.spectating)) return;

            InputManager.update();
            SoundManager.update();
            ScreenRecordManager.update();

            const player = this.activePlayer;
            if (!player) return;

            const isAction = UIManager.action.active;
            const showCancel = isAction && !UIManager.action.fake;

            if (isAction) {
                UIManager.updateAction();
            }

            interface CloseObject {
                object?: Loot | Obstacle | Player
                dist: number
            }

            const interactable: CloseObject = {
                object: undefined,
                dist: Number.MAX_VALUE
            };
            const uninteractable: CloseObject = {
                object: undefined,
                dist: Number.MAX_VALUE
            };
            const detectionHitbox = new CircleHitbox(3 * player.sizeMod, player.position);

            let hideSecondFloor = false;

            for (const object of this.objects) {
                const { isLoot, isObstacle, isPlayer, isBuilding } = object;
                const isInteractable = (isLoot || isObstacle || isPlayer) && object.canInteract(player);

                if (object.isObstacle && object.activated && object.definition.animationFrames) {
                    object.animationFrame ??= 0;
                    object.animationFrame++;
                    object.animationFrame %= object.definition.animationFrames.length;
                    object.image.setFrame(object.definition.animationFrames[object.animationFrame]);
                }

                if (
                    (isLoot || isInteractable)
                    && object.hitbox.collidesWith(detectionHitbox)
                    && adjacentOrEquivLayer(object, player.layer)
                ) {
                    const dist = Geometry.distanceSquared(object.position, player.position);
                    if (isInteractable) {
                        if (dist < interactable.dist) {
                            interactable.dist = dist;
                            interactable.object = object;
                        }
                    } else if (isLoot && dist < uninteractable.dist) {
                        uninteractable.dist = dist;
                        uninteractable.object = object;
                    }
                } else if (isBuilding) {
                    object.toggleCeiling();
                    if (
                        object.ceilingHitbox !== undefined
                        && !object.ceilingVisible
                        && object.definition.hasSecondFloor
                    ) {
                        hideSecondFloor = true;
                    }

                // tree leaves
                } else if (isObstacle && object.definition.isTree && object.leavesSprite && !object.dead) {
                    const {
                        minDist = 32,
                        maxDist = 729,
                        trunkMinAlpha = 0.8,
                        leavesMinAlpha = 0.35
                    } = object.definition.tree ?? {};
                    const dist = Geometry.distanceSquared(object.position, player.position);
                    object.image.alpha = Numeric.remap(dist, minDist, maxDist, trunkMinAlpha, 1);
                    object.leavesSprite.alpha = Numeric.remap(dist, minDist, maxDist, leavesMinAlpha, 1);

                // metal detectors
                } else if (isObstacle && object.definition.detector && object.notOnCoolDown) {
                    for (const player of this.objects.getCategory(ObjectCategory.Player)) {
                        if (
                            !object.hitbox.collidesWith(player.hitbox)
                            || !equalLayer(object.layer, player.layer)
                            || player.dead
                        ) continue;

                        SoundManager.play("detection", {
                            falloff: 0.25,
                            position: Vec(object.position.x + 20, object.position.y - 20),
                            maxRange: 200
                        });

                        object.notOnCoolDown = false;
                        setTimeout(() => object.notOnCoolDown = true, 1000);
                    }

                // bush particles
                } else if (isObstacle && object.definition.material === "bush" && object.definition.noCollisions) {
                    for (const player of this.objects.getCategory(ObjectCategory.Player)) {
                        const inBush = equalLayer(object.layer, player.layer) && object.hitbox.isPointInside(player.position);

                        if (
                            (player.bushID === undefined && !inBush) // not in this bush
                            || (player.bushID !== undefined && player.bushID !== object.id) // in a different bush
                            || player.dead
                        ) continue;

                        if (object.dead) {
                            player.bushID = undefined;
                            continue;
                        }

                        let bushSound: string | undefined;
                        if (player.bushID === undefined) {
                            // bush
                            player.bushID = object.id;
                            bushSound = "bush_rustle_1";
                        } else if (!inBush) {
                            // in this case we exit bushh lol
                            player.bushID = undefined;
                            bushSound = "bush_rustle_2";
                        }
                        if (!bushSound) continue;

                        let particle = object.definition.frames?.particle ?? `${object.definition.idString}_particle`;
                        if (object.definition.particleVariations) {
                            particle += `_${random(1, object.definition.particleVariations)}`;
                        }

                        ParticleManager.spawnParticles(2, () => ({
                            frames: particle,
                            position: object.hitbox.randomPoint(),
                            zIndex: Numeric.max((object.definition.zIndex ?? ZIndexes.Players) + 1, 4),
                            lifetime: 500,
                            scale: {
                                start: randomFloat(0.85, 0.95),
                                end: 0,
                                ease: EaseFunctions.quarticIn
                            },
                            alpha: {
                                start: 1,
                                end: 0,
                                ease: EaseFunctions.sexticIn
                            },
                            rotation: { start: randomRotation(), end: randomRotation() },
                            speed: Vec.fromPolar(randomRotation(), randomFloat(6, 9))
                        }));

                        object.playSound(bushSound, {
                            falloff: 0.25,
                            maxRange: 200
                        });
                    }
                }
            }

            this.updateAmbience();

            if (this.hideSecondFloor !== hideSecondFloor) {
                this.hideSecondFloor = hideSecondFloor;
                CameraManager.updateLayer(this.layer);
            }

            const object = interactable.object ?? uninteractable.object;
            const offset = object?.isObstacle ? object.door?.offset : undefined;
            const canInteract = interactable.object !== undefined;

            const bind: string | undefined = InputManager.binds.getInputsBoundToAction(object === undefined ? "cancel_action" : "interact")[0];
            const lootDefinition = object?.isLoot ? object.definition : undefined;
            const activeInventoryWeapon = UIManager.inventory.weapons[UIManager.inventory.activeWeaponIndex]?.definition;
            const comparisonPayload = getWeaponComparisonPayload(
                lootDefinition,
                activeInventoryWeapon,
                GameConsole.getBuiltInCVar("cv_weapon_compare"),
                GameConsole.getBuiltInCVar("cv_weapon_compare_condensed")
            );
            const comparisonKey = comparisonPayload ? `${comparisonPayload.mode}:${comparisonPayload.key}` : undefined;

            const differences = {
                object: cache.object?.id !== object?.id,
                offset: cache.offset !== offset,
                isAction: cache.isAction !== isAction,
                bind: cache.bind !== bind,
                canInteract: cache.canInteract !== canInteract,
                comparison: cache.comparisonKey !== comparisonKey
            };

            if (differences.bind) bindChangeAcknowledged = false;

            if (
                differences.object
                || differences.offset
                || differences.isAction
                || differences.bind
                || differences.canInteract
                || differences.comparison
            ) {
                // Cache miss, rerender
                cache.object = object;
                cache.offset = offset;
                cache.isAction = isAction;
                cache.bind = bind;
                cache.canInteract = canInteract;
                cache.comparisonKey = comparisonKey;

                const {
                    interactKey,
                    interactMsg,
                    interactText
                } = UIManager.ui;
                const type = lootDefinition?.defType;

                // Update interact message
                if (object !== undefined || (isAction && showCancel)) {
                    // If the loot object hasn't changed, we don't need to redo the text
                    if (differences.object || differences.offset || differences.isAction) {
                        let text;
                        switch (true) {
                            case object?.isObstacle: {
                                if (object.definition.isActivatable || object.definition.customInteractMessage) {
                                    text = getTranslatedString(`interact_${object.definition.interactObstacleIdString ?? object.definition.idString}` as TranslationKeys);
                                } else if (object.definition.isDoor) {
                                    text = object.door?.offset === 0
                                        ? getTranslatedString("action_open_door")
                                        : getTranslatedString("action_close_door");
                                }
                                break;
                            }
                            case object?.isLoot: {
                                const definition = object.definition;
                                const itemName = definition.defType === DefinitionType.Gun && definition.isDual
                                    ? getTranslatedString(
                                        "dual_template",
                                        { gun: getTranslatedString(definition.singleVariant as TranslationKeys) }
                                    )
                                    : getTranslatedString(("translationString" in definition && "lootAndKillfeedTranslationString" in definition ? definition.translationString : definition.idString) as TranslationKeys);

                                text = `${itemName}${object.count > 1 ? ` (${object.count})` : ""}`;
                                break;
                            }
                            case object?.isPlayer: {
                                text = getTranslatedString("action_revive", { player: UIManager.getRawPlayerName(object.id) });
                                break;
                            }
                            case isAction: {
                                text = getTranslatedString("action_cancel");
                                break;
                            }
                        }

                        if (text) interactText.text(text);
                    }

                    if (!InputManager.isMobile && (!bindChangeAcknowledged || (object === undefined && isAction))) {
                        bindChangeAcknowledged = true;

                        const icon = bind === undefined ? undefined : InputManager.getIconFromInputName(bind);

                        if (icon === undefined) {
                            interactKey.text(bind ?? "");
                        } else {
                            interactKey.html(`<img src="${icon}" alt="${bind}"/>`);
                        }
                    }

                    if (canInteract || (object === undefined && isAction)) {
                        interactKey
                            .addClass("active")
                            .show();
                    } else {
                        interactKey
                            .removeClass("active")
                            .hide();
                    }

                    if (
                        (!object?.isObstacle
                            || !object.definition.isActivatable
                            || !object.definition.noInteractMessage)
                    ) {
                        interactMsg.show();
                        if (player.downed && (object?.isLoot || (object?.isObstacle && object.definition.noInteractMessage))) interactMsg.hide();
                    }
                } else {
                   if (!UI_DEBUG_MODE) interactMsg.hide();
                }

                renderWeaponComparison(comparisonPayload);

                // Mobile stuff
                if (InputManager.isMobile && canInteract) {
                    const weapons = UIManager.inventory.weapons;

                    // Auto pickup (top 10 conditionals)
                    if (
                        GameConsole.getBuiltInCVar("cv_autopickup")
                        && object?.isLoot
                        && autoPickup
                        && (
                            (
                                (
                                    // Auto-pickup dual gun
                                    // Only pick up melees if no melee is equipped
                                    (
                                        type !== DefinitionType.Melee || weapons?.[2]?.definition.idString === "fists" // FIXME are y'all fr
                                    )

                                    // Only pick up guns if there's a free slot
                                    && (
                                        type !== DefinitionType.Gun || (!weapons?.[0] || !weapons?.[1])
                                    )

                                    // Don't pick up skins
                                    && type !== DefinitionType.Skin

                                    // Don't pick up perks
                                    && type !== DefinitionType.Perk
                                )
                            ) || (
                                type === DefinitionType.Gun
                                && weapons?.some(
                                        weapon => {
                                            const definition = weapon?.definition;

                                            return definition?.defType === DefinitionType.Gun
                                                && (
                                                    (
                                                        object?.definition === definition
                                                        && !definition.isDual
                                                        && definition.dualVariant
                                                    ) // Picking up a single pistol when inventory has single pistol
                                                    || (
                                                        (
                                                            object.definition as DualGunNarrowing | undefined
                                                        )?.singleVariant === definition.idString
                                                    )
                                                    // Picking up dual pistols when inventory has a pistol
                                                    // TODO implement splitting of dual guns to not lost reload later
                                                );
                                        }
                                    )
                            )
                        )
                    ) {
                        InputManager.addAction(InputActions.Loot);
                    } else if ( // Auto open doors
                        object?.isObstacle
                        && object.canInteract(player)
                        && object.definition.isDoor
                        && object.door?.offset === 0
                    ) {
                        InputManager.addAction(InputActions.Interact);
                    }
                }
            }

            // funny detonate button stuff
            const detonateKey = UIManager.ui.detonateKey;
            if (!InputManager.isMobile) {
                const boomBind: string | undefined = InputManager.binds.getInputsBoundToAction("explode_c4")[0];

                if (funnyDetonateButtonCache.bind !== boomBind) {
                    funnyDetonateButtonCache.bind = bind;

                    if (boomBind !== undefined) {
                        const bindImg = InputManager.getIconFromInputName(boomBind);

                        detonateKey.show();

                        if (bindImg === undefined) {
                            detonateKey.text(boomBind ?? "");
                            if (detonateBindIcon !== undefined) {
                                detonateKey.empty();
                                detonateBindIcon = undefined;
                            }
                        } else {
                            if (detonateBindIcon === undefined) {
                                detonateKey.children().add(detonateBindIcon = $(`<img src="${bindImg}" alt=${boomBind} />`));
                            }

                            if (detonateBindIcon.attr("src") !== bindImg) {
                                detonateBindIcon.attr("src", bindImg);
                            }
                        }
                    } else {
                        detonateKey.hide();
                    }
                }
            } else {
                detonateKey.hide();
            }
        };
    })();
})();
