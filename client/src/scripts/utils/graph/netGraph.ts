import type { DataSplitTypes } from "@common/packets/packet";
import { Vec } from "@common/utils/vector";
import type { ColorSource } from "pixi.js";
import { SegmentedBarGraph, SingleGraph, type BaseGraph } from "./graph";
import type { CVarChangeListener } from "../../console/variables";
import { GameConsole } from "../../console/gameConsole";
import { Game } from "../../game";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function setUpNetGraph() {
    const makeFormatter = ([big, small]: readonly [big: string, small: string], cutoff = 1000, fixedPlaces = 2) =>
        (n: number): string => n > cutoff
            ? `${(n / 1000).toFixed(fixedPlaces)} ${big}`
            : `${n.toFixed(fixedPlaces)} ${small}`;

    const bytes = makeFormatter(["kB", "B"], 100);
    const time = makeFormatter(["s", "ms"]);

    const anchor = Vec(5, 300);

    const receiving = new SegmentedBarGraph({
        ...anchor,
        fill: { color: "white", alpha: 0.5 },
        stroke: { color: "white" },
        background: { stroke: { color: "transparent" } },
        segments: (
            [
                ["active player data", "red"],
                ["players", "lime"],
                ["obstacles", "blue"],
                ["loot", "yellow"],
                ["particles", "magenta"],
                ["objects", "orange"],
                ["killfeed", "black"]
            ] satisfies Record<DataSplitTypes, readonly [string, ColorSource]>
        ).map(([name, color]) => ({ name, color, alpha: 0.5 }))
    });

    const sendGraphOffset = Vec(0, 135);
    const sending = new SingleGraph({
        ...Vec.add(anchor, sendGraphOffset),
        height: 30,
        fill: { color: "blue" },
        stroke: { color: "blue" },
        background: { stroke: { color: "transparent" } }
    });

    const pingGraphOffset = Vec(0, 205);
    const ping = new SingleGraph({
        ...Vec.add(anchor, pingGraphOffset),
        height: 15,
        fill: { color: "lime" },
        stroke: { color: "lime" },
        background: { stroke: { color: "transparent" } }
    });

    const fpsGraphOffset = Vec(0, 225);
    const fps = new SingleGraph({
        ...Vec.add(anchor, fpsGraphOffset),
        height: 15,
        fill: { color: "red" },
        stroke: { color: "red" },
        background: { stroke: { color: "transparent" } }
    });

    const addChangeListener = GameConsole.variables.addChangeListener.bind(GameConsole.variables);
    const getBuiltInCVar = GameConsole.getBuiltInCVar.bind(GameConsole);

    const obj = Object.freeze({
        receiving: receiving
            .addLabel(({ last }) => `in :${bytes(last).padStart(8)}`)
            .addLabel(({ mean }) => `avg:${bytes(mean).padStart(8)}`)
            .addLabel(({ valueThroughput: val }) => `${bytes(val).padStart(5)}/s`)
            .addLabel(({ countThroughput: cnt }) => `${cnt.toFixed(2).padStart(5)}/s`),

        sending: sending
            .addLabel(({ last }) => `out:${bytes(last).padStart(8)}`, { style: { fill: "lightblue" } }, { y: -17 })
            .addLabel(({ mean }) => `avg:${bytes(mean).padStart(8)}`, { style: { fill: "lightblue" } }, { y: -17 })
            .addLabel(({ valueThroughput: val }) => `${bytes(val).padStart(5)}/s`, { style: { fill: "lightblue" } }, { y: -17 })
            .addLabel(({ countThroughput: cnt }) => `${cnt.toFixed(2).padStart(5)}/s`, { style: { fill: "lightblue" } }, { y: -17 }),

        ping: ping
            .addLabel(({ last }) => `ping:${time(last).padStart(9)}`, { style: { fill: "lightgreen" } }, { y: -34 })
            .addLabel(({ mean }) => `avg:${time(mean).padStart(9)}`, { style: { fill: "lightgreen" } }, { y: -34 })
            .addLabel(() => `lerp: ${time(Game.serverDt).padStart(5)}`, { style: { fill: "lightgreen" } }, { y: -34 }),

        fps: fps
            .addLabel(({ last }) => `fps : ${last.toFixed(2).padStart(5)}`, { style: { fill: "pink" } }, { y: -38 })
            .addLabel(({ min }) => `min: ${min.toFixed(2).padStart(5)}`, { style: { fill: "pink" } }, { y: -38 })
            .addLabel(({ max }) => `max: ${max.toFixed(2).padStart(5)}`, { style: { fill: "pink" } }, { y: -38 })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function updateGraphVis(graph: BaseGraph<any[], any>, val: 0 | 1 | 2, doUpdate = true): void {
        graph._showGraph = val >= 2;
        graph._showLabels = val >= 1;
        if (doUpdate) graph.update();
    }

    function updateForNetGraph(val: 0 | 1 | 2, doUpdate = true): void {
        const showIO = getBuiltInCVar("pf_show_inout");
        const showPing = getBuiltInCVar("pf_show_ping");
        const showFps = getBuiltInCVar("pf_show_fps");

        updateGraphVis(receiving, showIO ? val : 0, doUpdate);
        updateGraphVis(sending, showIO ? val : 0, doUpdate);
        updateGraphVis(
            ping,
            showPing
                ? val
                : 0,
            doUpdate
        );
        updateGraphVis(
            fps,
            showFps
                ? val
                : 0,
            doUpdate
        );

        updatePositionsForGraphs(val);
    }

    function updatePositionsForGraphs(val: 0 | 1 | 2): void {
        const showIO = getBuiltInCVar("pf_show_inout");
        const showPing = getBuiltInCVar("pf_show_ping");
        const showFps = getBuiltInCVar("pf_show_fps");

        // spaghetti
        // my spaghetti :3
        // (help)
        switch (val) {
            case 1: {
                receiving.y = anchor.y - receiving.height;
                sending.y = anchor.y + sendGraphOffset.y - receiving.height;
                ping.y = (
                    showIO
                        ? anchor.y + pingGraphOffset.y - receiving.height - sending.height
                        : anchor.y + sendGraphOffset.y - receiving.height
                ) - (showFps ? 0 : 17);
                fps.y = (
                    showIO
                        ? anchor.y + fpsGraphOffset.y - receiving.height - sending.height
                        : anchor.y + sendGraphOffset.y + fpsGraphOffset.y - pingGraphOffset.y - receiving.height
                ) - (showPing ? 0 : 35);
                break;
            }
            case 2: {
                receiving.y = anchor.y;
                sending.y = anchor.y + sendGraphOffset.y;
                ping.y = (
                    showIO
                        ? anchor.y + pingGraphOffset.y
                        : anchor.y + sendGraphOffset.y - receiving.height
                ) - (showFps ? 0 : 17);
                fps.y = (
                    showIO
                        ? anchor.y + fpsGraphOffset.y
                        : anchor.y + sendGraphOffset.y - receiving.height + fpsGraphOffset.y - pingGraphOffset.y
                ) - (showPing ? 0 : 35);
                break;
            }
        }
    }

    const generateListener = (
        targetForceY: number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        self: BaseGraph<any[], any>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        other: BaseGraph<any[], any>
    ): CVarChangeListener<boolean> => val => {
        if (val) {
            updateGraphVis(self, getBuiltInCVar("pf_net_graph"), false);
            updatePositionsForGraphs(getBuiltInCVar("pf_net_graph"));
            for (const label of other.labels) {
                if (label.forceY === undefined) continue;
                label.forceY = targetForceY;
            }
        } else {
            self.showGraph = self.showLabels = false;
            updatePositionsForGraphs(getBuiltInCVar("pf_net_graph"));
            for (const label of other.labels) {
                if (label.forceY === undefined) continue;
                label.forceY = -17;
            }
        }
        other.update();
    };

    addChangeListener("pf_show_ping", generateListener(-38, ping, fps));
    addChangeListener("pf_show_fps", generateListener(-34, fps, ping));
    addChangeListener("pf_show_inout", val => {
        const ng = getBuiltInCVar("pf_net_graph");
        if (val) {
            updateGraphVis(sending, ng, false);
            updateGraphVis(receiving, ng, false);
        } else {
            sending._showGraph = sending._showLabels = false;
            receiving._showGraph = receiving._showLabels = false;
        }
        sending.update();
        receiving.update();
        updatePositionsForGraphs(ng);
    });
    updateForNetGraph(getBuiltInCVar("pf_net_graph"), false);
    addChangeListener("pf_net_graph", val => updateForNetGraph(val));

    return obj;
}
