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

        void (async() => {
            console.time("load sounds");
            const response = await fetch("./audio/bleh.mp3");
            const buffer = await response.arrayBuffer();
            const sheet = {
                '12g_frag_explosion': { start: 0, end: 42634 },
                airdrop_fall: { start: 42634, end: 127899 },
                airdrop_land: { start: 127899, end: 139057 },
                airdrop_land_water: { start: 139057, end: 157657 },
                airdrop_plane: { start: 157657, end: 252337 },
                airdrop_unlock: { start: 252337, end: 304872 },
                bleed: { start: 304872, end: 320835 },
                bullet_whiz_1: { start: 320835, end: 325765 },
                bullet_whiz_2: { start: 325765, end: 331867 },
                bullet_whiz_3: { start: 331867, end: 337553 },
                bush_rustle_1: { start: 337553, end: 346488 },
                bush_rustle_2: { start: 346488, end: 356396 },
                button_press: { start: 356396, end: 364844 },
                c4_beep: { start: 364844, end: 371162 },
                c4_pin: { start: 371162, end: 378267 },
                ceiling_collapse: { start: 378267, end: 404931 },
                detection: { start: 404931, end: 415314 },
                auto_door_close: { start: 415314, end: 424971 },
                auto_door_open: { start: 424971, end: 434628 },
                barn_door_close: { start: 434628, end: 492155 },
                barn_door_open: { start: 492155, end: 549682 },
                door_close: { start: 549682, end: 557266 },
                door_open: { start: 557266, end: 565354 },
                metal_auto_door_close: { start: 565354, end: 594173 },
                metal_auto_door_open: { start: 594173, end: 615874 },
                metal_door_close: { start: 615874, end: 689077 },
                metal_door_open: { start: 689077, end: 694084 },
                monument_slide_open: { start: 694084, end: 773020 },
                emote: { start: 773020, end: 777764 },
                firework_rocket_explode: { start: 777764, end: 824840 },
                carpet_step_1: { start: 824840, end: 833199 },
                carpet_step_2: { start: 833199, end: 837379 },
                grass_step_1: { start: 837379, end: 843619 },
                grass_step_2: { start: 843619, end: 850003 },
                metal_step_1: { start: 850003, end: 856995 },
                metal_step_2: { start: 856995, end: 863725 },
                sand_step_1: { start: 863725, end: 868189 },
                sand_step_2: { start: 868189, end: 876445 },
                stone_step_1: { start: 876445, end: 880842 },
                stone_step_2: { start: 880842, end: 884951 },
                void_step_1: { start: 884951, end: 923320 },
                void_step_2: { start: 923320, end: 961689 },
                water_step_1: { start: 961689, end: 980476 },
                water_step_2: { start: 980476, end: 1001873 },
                wood_step_1: { start: 1001873, end: 1008124 },
                wood_step_2: { start: 1008124, end: 1013823 },
                frag_grenade: { start: 1013823, end: 1039701 },
                generator_running: { start: 1039701, end: 1056183 },
                generator_starting: { start: 1056183, end: 1082942 },
                gun_click: { start: 1082942, end: 1087427 },
                cola: { start: 1087427, end: 1128279 },
                gauze: { start: 1128279, end: 1180453 },
                medikit: { start: 1180453, end: 1272661 },
                tablets: { start: 1272661, end: 1435664 },
                heavy_swing: { start: 1435664, end: 1444441 },
                appliance_destroyed: { start: 1444441, end: 1479049 },
                appliance_hit_1: { start: 1479049, end: 1490067 },
                appliance_hit_2: { start: 1490067, end: 1501613 },
                bullet_reflection_1: { start: 1501613, end: 1529248 },
                bullet_reflection_2: { start: 1529248, end: 1551031 },
                bullet_reflection_3: { start: 1551031, end: 1574486 },
                bullet_reflection_4: { start: 1574486, end: 1596269 },
                bullet_reflection_5: { start: 1596269, end: 1618052 },
                bush_destroyed: { start: 1618052, end: 1637571 },
                bush_hit_1: { start: 1637571, end: 1647699 },
                bush_hit_2: { start: 1647699, end: 1655523 },
                crate_destroyed: { start: 1655523, end: 1667787 },
                fence_destroyed: { start: 1667787, end: 1675981 },
                fence_hit_1: { start: 1675981, end: 1682510 },
                fence_hit_2: { start: 1682510, end: 1688319 },
                glass_destroyed: { start: 1688319, end: 1716591 },
                glass_hit_1: { start: 1716591, end: 1724607 },
                glass_hit_2: { start: 1724607, end: 1733487 },
                ice_destroyed: { start: 1733487, end: 1761759 },
                ice_hit_1: { start: 1761759, end: 1769775 },
                ice_hit_2: { start: 1769775, end: 1778655 },
                kukri_stab: { start: 1778655, end: 1784506 },
                metal_heavy_destroyed: { start: 1784506, end: 1822481 },
                metal_heavy_hit_1: { start: 1822481, end: 1832153 },
                metal_heavy_hit_2: { start: 1832153, end: 1841825 },
                metal_light_destroyed: { start: 1841825, end: 1875618 },
                metal_light_hit_1: { start: 1875618, end: 1885314 },
                metal_light_hit_2: { start: 1885314, end: 1895250 },
                pan_hit: { start: 1895250, end: 1928685 },
                piano_hit_1: { start: 1928685, end: 1949019 },
                piano_hit_2: { start: 1949019, end: 1968464 },
                piano_hit_3: { start: 1968464, end: 1992498 },
                piano_hit_4: { start: 1992498, end: 2011658 },
                piano_hit_5: { start: 2011658, end: 2035642 },
                piano_hit_6: { start: 2035642, end: 2055140 },
                piano_hit_7: { start: 2055140, end: 2077040 },
                piano_hit_8: { start: 2077040, end: 2097061 },
                player_hit_1: { start: 2097061, end: 2100743 },
                player_hit_2: { start: 2100743, end: 2104977 },
                porcelain_destroyed: { start: 2104977, end: 2129889 },
                porcelain_hit_1: { start: 2129889, end: 2135649 },
                porcelain_hit_2: { start: 2135649, end: 2141313 },
                pumpkin_destroyed: { start: 2141313, end: 2158593 },
                sand_hit_1: { start: 2158593, end: 2169358 },
                sand_hit_2: { start: 2169358, end: 2178590 },
                stone_destroyed: { start: 2178590, end: 2188958 },
                stone_hit_1: { start: 2188958, end: 2196671 },
                stone_hit_2: { start: 2196671, end: 2203214 },
                trash_bag_destroyed: { start: 2203214, end: 2228709 },
                tree_destroyed: { start: 2228709, end: 2237395 },
                tree_hit_1: { start: 2237395, end: 2243155 },
                tree_hit_2: { start: 2243155, end: 2250163 },
                wood_destroyed: { start: 2250163, end: 2259835 },
                wood_hit_1: { start: 2259835, end: 2265283 },
                wood_hit_2: { start: 2265283, end: 2271012 },
                join_notification: { start: 2271012, end: 2292267 },
                kill_leader_assigned: { start: 2292267, end: 2337502 },
                kill_leader_dead: { start: 2337502, end: 2347450 },
                ammo_pickup: { start: 2347450, end: 2352658 },
                backpack_pickup: { start: 2352658, end: 2361802 },
                cola_pickup: { start: 2361802, end: 2372410 },
                gauze_pickup: { start: 2372410, end: 2377052 },
                grenade_pickup: { start: 2377052, end: 2386237 },
                helmet_pickup: { start: 2386237, end: 2392622 },
                medikit_pickup: { start: 2392622, end: 2400014 },
                pickup: { start: 2400014, end: 2404982 },
                scope_pickup: { start: 2404982, end: 2428982 },
                tablets_pickup: { start: 2428982, end: 2433700 },
                throwable_pickup: { start: 2433700, end: 2442885 },
                vest_pickup: { start: 2442885, end: 2452005 },
                airdrop_ping: { start: 2452005, end: 2460676 },
                arrow_ping: { start: 2460676, end: 2466802 },
                gift_ping: { start: 2466802, end: 2476686 },
                heal_ping: { start: 2476686, end: 2486340 },
                warning_ping: { start: 2486340, end: 2504129 },
                pumpkin_bomb: { start: 2504129, end: 2529222 },
                puzzle_error: { start: 2529222, end: 2559093 },
                puzzle_solved: { start: 2559093, end: 2567645 },
                recorder_buzz: { start: 2567645, end: 2642800 },
                seed_explode: { start: 2642800, end: 2654165 },
                smoke_grenade: { start: 2654165, end: 2692805 },
                soft_swing: { start: 2692805, end: 2696148 },
                speaker_start: { start: 2696148, end: 2739156 },
                swing: { start: 2739156, end: 2743572 },
                tent_collapse: { start: 2743572, end: 2765275 },
                throwable_pin: { start: 2765275, end: 2770585 },
                throwable_throw: { start: 2770585, end: 2783959 },
                vault_door_open: { start: 2783959, end: 2824615 },
                acr_fire: { start: 2824615, end: 2830537 },
                acr_reload: { start: 2830537, end: 2867981 },
                acr_switch: { start: 2867981, end: 2875598 },
                ak47_fire: { start: 2875598, end: 2885009 },
                ak47_reload: { start: 2885009, end: 2922925 },
                ak47_switch: { start: 2922925, end: 2930962 },
                arx160_fire: { start: 2930962, end: 2940236 },
                arx160_reload: { start: 2940236, end: 2975543 },
                arx160_switch: { start: 2975543, end: 2981455 },
                aug_fire: { start: 2981455, end: 2991047 },
                aug_reload: { start: 2991047, end: 3021425 },
                aug_switch: { start: 3021425, end: 3028625 },
                blr_fire: { start: 3028625, end: 3039523 },
                blr_reload: { start: 3039523, end: 3068182 },
                blr_switch: { start: 3068182, end: 3078924 },
                chainsaw: { start: 3078924, end: 3085989 },
                chainsaw_stop: { start: 3085989, end: 3119843 },
                chainsaw_switch: { start: 3119843, end: 3130170 },
                crowbar_switch: { start: 3130170, end: 3134448 },
                cz600_fire: { start: 3134448, end: 3154293 },
                cz600_reload: { start: 3154293, end: 3187757 },
                cz600_switch: { start: 3187757, end: 3195791 },
                cz75a_fire: { start: 3195791, end: 3207438 },
                cz75a_reload: { start: 3207438, end: 3239176 },
                cz75a_switch: { start: 3239176, end: 3248839 },
                deagle_fire: { start: 3248839, end: 3263543 },
                deagle_reload: { start: 3263543, end: 3289745 },
                deagle_switch: { start: 3289745, end: 3297593 },
                death_ray_fire: { start: 3297593, end: 3308593 },
                death_ray_reload: { start: 3308593, end: 3329667 },
                death_ray_switch: { start: 3329667, end: 3336654 },
                default_switch: { start: 3336654, end: 3342705 },
                dt11_fire: { start: 3342705, end: 3361210 },
                dt11_reload: { start: 3361210, end: 3389653 },
                dt11_switch: { start: 3389653, end: 3394347 },
                dual_cz75a_reload: { start: 3394347, end: 3450991 },
                dual_deagle_reload: { start: 3450991, end: 3499411 },
                dual_g19_reload: { start: 3499411, end: 3544918 },
                dual_m1895_reload: { start: 3544918, end: 3599830 },
                dual_mp5k_reload: { start: 3599830, end: 3649383 },
                dual_rsh12_reload: { start: 3649383, end: 3708500 },
                dual_s_g17_reload: { start: 3708500, end: 3739968 },
                falchion_switch: { start: 3739968, end: 3749014 },
                fire_hatchet_switch: { start: 3749014, end: 3756026 },
                firework_launcher_fire: { start: 3756026, end: 3780739 },
                firework_launcher_reload: { start: 3780739, end: 3796903 },
                firework_launcher_switch: { start: 3796903, end: 3809624 },
                flues_fire: { start: 3809624, end: 3835108 },
                flues_reload: { start: 3835108, end: 3862092 },
                flues_switch: { start: 3862092, end: 3867517 },
                g17_scoped_fire: { start: 3867517, end: 3872132 },
                g17_scoped_reload: { start: 3872132, end: 3897209 },
                g17_scoped_switch: { start: 3897209, end: 3903101 },
                g19_fire: { start: 3903101, end: 3914887 },
                g19_reload: { start: 3914887, end: 3938157 },
                g19_switch: { start: 3938157, end: 3943933 },
                gas_can_switch: { start: 3943933, end: 3947270 },
                hatchet_switch: { start: 3947270, end: 3961428 },
                hp18_fire: { start: 3961428, end: 3968561 },
                hp18_reload: { start: 3968561, end: 3975226 },
                hp18_switch: { start: 3975226, end: 3983258 },
                kbar_switch: { start: 3983258, end: 3987222 },
                kukri_switch: { start: 3987222, end: 3993654 },
                l115a1_fire: { start: 3993654, end: 4024729 },
                l115a1_reload: { start: 4024729, end: 4068846 },
                l115a1_switch: { start: 4068846, end: 4076305 },
                lewis_gun_fire: { start: 4076305, end: 4093777 },
                lewis_gun_reload: { start: 4093777, end: 4137427 },
                lewis_gun_switch: { start: 4137427, end: 4143585 },
                m16a2_fire: { start: 4143585, end: 4154999 },
                m16a2_reload: { start: 4154999, end: 4188905 },
                m16a2_switch: { start: 4188905, end: 4199404 },
                m1895_fire: { start: 4199404, end: 4223173 },
                m1895_reload: { start: 4223173, end: 4256767 },
                m1895_switch: { start: 4256767, end: 4266471 },
                m1_garand_fire: { start: 4266471, end: 4285021 },
                m1_garand_fire_last: { start: 4285021, end: 4304474 },
                m1_garand_reload: { start: 4304474, end: 4328089 },
                m1_garand_switch: { start: 4328089, end: 4337407 },
                m3k_fire: { start: 4337407, end: 4363797 },
                m3k_reload: { start: 4363797, end: 4368998 },
                m3k_switch: { start: 4368998, end: 4374854 },
                m590m_fire: { start: 4374854, end: 4401668 },
                m590m_reload: { start: 4401668, end: 4432271 },
                m590m_switch: { start: 4432271, end: 4440590 },
                mcx_spear_fire: { start: 4440590, end: 4452727 },
                mcx_spear_reload: { start: 4452727, end: 4483389 },
                mcx_spear_switch: { start: 4483389, end: 4489909 },
                mg36_fire: { start: 4489909, end: 4509153 },
                mg36_reload: { start: 4509153, end: 4542654 },
                mg36_switch: { start: 4542654, end: 4550060 },
                mg5_fire: { start: 4550060, end: 4559876 },
                mg5_reload: { start: 4559876, end: 4629874 },
                mg5_switch: { start: 4629874, end: 4638036 },
                micro_uzi_fire: { start: 4638036, end: 4649723 },
                micro_uzi_reload: { start: 4649723, end: 4675129 },
                micro_uzi_switch: { start: 4675129, end: 4681599 },
                mini14_fire: { start: 4681599, end: 4700538 },
                mini14_reload: { start: 4700538, end: 4727045 },
                mini14_switch: { start: 4727045, end: 4735771 },
                mk18_fire: { start: 4735771, end: 4755823 },
                mk18_reload: { start: 4755823, end: 4803597 },
                mk18_switch: { start: 4803597, end: 4813509 },
                model_37_fire: { start: 4813509, end: 4830271 },
                model_37_reload: { start: 4830271, end: 4839919 },
                model_37_switch: { start: 4839919, end: 4851216 },
                model_89_fire: { start: 4851216, end: 4859667 },
                model_89_reload: { start: 4859667, end: 4871660 },
                model_89_switch: { start: 4871660, end: 4881519 },
                mosin_nagant_fire: { start: 4881519, end: 4914952 },
                mosin_nagant_reload: { start: 4914952, end: 4922515 },
                mosin_nagant_reload_full: { start: 4922515, end: 4955961 },
                mosin_nagant_switch: { start: 4955961, end: 4967331 },
                mp40_fire: { start: 4967331, end: 4979070 },
                mp40_reload: { start: 4979070, end: 5008327 },
                mp40_switch: { start: 5008327, end: 5015773 },
                mp5k_fire: { start: 5015773, end: 5025791 },
                mp5k_reload: { start: 5025791, end: 5054398 },
                mp5k_switch: { start: 5054398, end: 5061544 },
                negev_fire: { start: 5061544, end: 5075581 },
                negev_reload: { start: 5075581, end: 5154363 },
                negev_switch: { start: 5154363, end: 5162121 },
                pan_switch: { start: 5162121, end: 5170177 },
                pk61_fire: { start: 5170177, end: 5187760 },
                pk61_reload: { start: 5187760, end: 5264022 },
                pk61_switch: { start: 5264022, end: 5277584 },
                pp19_fire: { start: 5277584, end: 5281729 },
                pp19_reload: { start: 5281729, end: 5312835 },
                pp19_switch: { start: 5312835, end: 5319173 },
                radio_fire: { start: 5319173, end: 5322511 },
                radio_reload: { start: 5322511, end: 5342328 },
                radio_switch: { start: 5342328, end: 5346813 },
                revitalizer_fire: { start: 5346813, end: 5363575 },
                revitalizer_reload: { start: 5363575, end: 5373223 },
                revitalizer_switch: { start: 5373223, end: 5384520 },
                rgs_fire: { start: 5384520, end: 5410287 },
                rgs_fire_last: { start: 5410287, end: 5432879 },
                rgs_reload: { start: 5432879, end: 5466180 },
                rgs_switch: { start: 5466180, end: 5474525 },
                rsh12_fire: { start: 5474525, end: 5488257 },
                rsh12_reload: { start: 5488257, end: 5523151 },
                rsh12_switch: { start: 5523151, end: 5528653 },
                saf200_fire: { start: 5528653, end: 5543274 },
                saf200_reload: { start: 5543274, end: 5568883 },
                saf200_switch: { start: 5568883, end: 5576344 },
                seedshot_fire: { start: 5576344, end: 5582005 },
                seedshot_reload: { start: 5582005, end: 5621624 },
                seedshot_switch: { start: 5621624, end: 5632998 },
                sks_fire: { start: 5632998, end: 5645265 },
                sks_reload: { start: 5645265, end: 5652932 },
                sks_reload_full: { start: 5652932, end: 5685576 },
                sks_switch: { start: 5685576, end: 5692197 },
                sr25_fire: { start: 5692197, end: 5706039 },
                sr25_reload: { start: 5706039, end: 5732834 },
                sr25_switch: { start: 5732834, end: 5742443 },
                stoner_63_fire: { start: 5742443, end: 5761434 },
                stoner_63_reload: { start: 5761434, end: 5809501 },
                stoner_63_switch: { start: 5809501, end: 5821303 },
                tango_51_fire: { start: 5821303, end: 5854293 },
                tango_51_reload: { start: 5854293, end: 5889572 },
                tango_51_switch: { start: 5889572, end: 5896561 },
                throwable_switch: { start: 5896561, end: 5901985 },
                usas12_fire: { start: 5901985, end: 5911177 },
                usas12_reload: { start: 5911177, end: 5952596 },
                usas12_switch: { start: 5952596, end: 5956769 },
                vaccinator_fire: { start: 5956769, end: 5964666 },
                vaccinator_reload: { start: 5964666, end: 6002255 },
                vaccinator_switch: { start: 6002255, end: 6013969 },
                vector_fire: { start: 6013969, end: 6025717 },
                vector_reload: { start: 6025717, end: 6054820 },
                vector_switch: { start: 6054820, end: 6062957 },
                vepr12_fire: { start: 6062957, end: 6076974 },
                vepr12_reload: { start: 6076974, end: 6105261 },
                vepr12_switch: { start: 6105261, end: 6112316 },
                vks_fire: { start: 6112316, end: 6125722 },
                vks_reload: { start: 6125722, end: 6161099 },
                vks_switch: { start: 6161099, end: 6170199 },
                vss_fire: { start: 6170199, end: 6178981 },
                vss_reload: { start: 6178981, end: 6206464 },
                vss_switch: { start: 6206464, end: 6212865 },
                port_ambience: { start: 6212865, end: 6400989 }
            };
            for (const [id, { start, end }] of Object.entries(sheet)) {
                this.loadSound(id, buffer.slice(start, end), true);
            }
            console.timeEnd("load sounds");
        })();

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
        // const id = this._nameToId[name];

        const sound = new GameSound(name, name, {
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
        // this._nameToId = {};

        // const isLoading: Record<string, boolean> = {};

        // for (const folder of Game.mode.sounds.foldersToLoad) {
        //     for (const [name, id] of Object.entries(this._folderNameToId[folder])) {
        //         this._nameToId[name] = id;
        //         isLoading[id] = true;
        //         this.loadSound(id, true);
        //     }
        // }

        // // add sounds that are not in the mode folders but set preload to false
        // for (const nameToId of Object.values(this._folderNameToId)) {
        //     for (const [name, id] of Object.entries(nameToId)) {
        //         if (!this._nameToId[name]) {
        //             this._nameToId[name] = id;
        //         }
        //         if (!isLoading[id]) {
        //             this.loadSound(id, false);
        //         }
        //     }
        // }
    }

    loadSound(id: string, source: ArrayBuffer, preload: boolean): void {
        if (PixiSound.sound.exists(id)) return;

        // const url = this._idToPath[id];
        // if (!url) {
        //     return;
        // }

        /**
         * For some reason, PIXI will call the `loaded` callback twice
         * when an error occurs…
         */
        let called = false;

        PixiSound.sound.add(
            id,
            {
                source,
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
