<script lang="ts">
    import { onMount } from "svelte";
    import {
        BaseHitbox,
        CircleHitbox,
        GroupHitbox,
        type HitboxJSON,
        HitboxType,
        RectangleHitbox,

        type ShapeHitbox

    } from "../../../common/src/utils/hitbox";
    import { Numeric } from "../../../common/src/utils/math";
    import { Vec } from "../../../common/src/utils/vector";
    import { PIXI_SCALE } from "../../src/scripts/utils/constants";
    import Hitbox from "./lib/hitbox.svelte";
  import { removeFrom } from "@common/utils/misc";

    let hitboxes: HitboxJSON[] = [
        ...new GroupHitbox(
            RectangleHitbox.fromRect(10, 10)
        ).toJSON().hitboxes
    ];

    let selected = hitboxes[0];
    let selectedIndex = 0;

    let x = 0;
    let y = 0;
    let scale = 1;
    let pointerX = 0;
    let pointerY = 0;

    let hitboxesContainer: HTMLElement;
    onMount(() => { hitboxesContainer = document.getElementById("hitboxes-container"); });

    let dragging = false;
    let rightDragging = false; // Flag for right mouse button drag
    function pointerDown(e: PointerEvent) {
        if (e.button === 0) { // Left mouse button
            dragging = true;
        } else if (e.button === 2) { // Right mouse button
            rightDragging = true;
        }
    }

    function pointerUp(e: PointerEvent) {
        if (e.button === 0) {
            dragging = false;
        } else if (e.button === 2) {
            rightDragging = false;
            adjustingWidth = false;
            adjustingHeight = false;
        }
    }

    let lastHitboxMove;
    let adjustingWidth = false;
    let adjustingHeight = false;

    function pointermove(e: PointerEvent) {
        const { x: rectX, y: rectY } = hitboxesContainer.getBoundingClientRect();
        [pointerX, pointerY] = [
            (e.clientX - x - rectX) / scale / PIXI_SCALE,
            (e.clientY - y - rectY) / scale / PIXI_SCALE
        ];

        if (dragging && !rightDragging) {
            const now = Date.now();
            if (now - lastHitboxMove < 100 || BaseHitbox.fromJSON(selected).isPointInside(Vec(pointerX, pointerY))) {
                lastHitboxMove = now;
                const [dx, dy] = [
                    e.movementX / scale / PIXI_SCALE,
                    e.movementY / scale / PIXI_SCALE
                ];
                if (selected.type === HitboxType.Circle) {
                    selected.position.x += dx;
                    selected.position.y += dy;
                } else if (selected.type === HitboxType.Rect) {
                    selected.min.x += dx;
                    selected.min.y += dy;
                    selected.max.x += dx;
                    selected.max.y += dy;
                }
                updateSelected();
            } else {
                x += e.movementX;
                y += e.movementY;
            }
        } else if (rightDragging) {
            if (selected.type === HitboxType.Rect) {
                const { min, max } = selected;
                let [width, height] = [max.x - min.x, max.y - min.y];
                const [centerX, centerY] = [min.x + width / 2, min.y + height / 2];
                if (
                    (
                        (pointerX > selected.max.x || pointerX < selected.min.x)
                        && (pointerY > selected.min.y && pointerY < selected.max.y)
                    ) || adjustingWidth
                ) {
                    width += e.movementX / scale / PIXI_SCALE;
                    adjustingWidth = true;
                    adjustingHeight = false;
                }
                if (
                    (
                        (pointerY > selected.max.y || pointerY < selected.min.y)
                        && (pointerX > selected.min.x && pointerX < selected.max.x)
                    ) || adjustingHeight
                ) {
                    height += e.movementY / scale / PIXI_SCALE;
                    adjustingWidth = false;
                    adjustingHeight = true;
                }

                min.x = centerX - width / 2;
                min.y = centerY - height / 2;
                max.x = centerX + width / 2;
                max.y = centerY + height / 2;
                updateSelected();
            } else if (selected.type === HitboxType.Circle) {
                // @ts-expect-error radius is technically read only but who cares
                selected.radius += e.movementX / scale / PIXI_SCALE;
                updateSelected();
            }
        }
    }

    function contextMenu_(event) {
        event.preventDefault();
    }

    function mouseWheel(e: WheelEvent) {
        const oldScale = scale;
        const { x: rectX, y: rectY } = hitboxesContainer.getBoundingClientRect();
        const [mouseX, mouseY] = [
            e.clientX - rectX,
            e.clientY - rectY
        ];
        scale = Numeric.clamp(scale * (e.deltaY > 0 ? 0.75 : 1.25), 0.1, 10);
        x = mouseX - (mouseX - x) * (scale / oldScale);
        y = mouseY - (mouseY - y) * (scale / oldScale);
    }

    function updateSelected() {
        hitboxes[hitboxes.indexOf(selected)] = selected;
        convertHitboxes();
    }

    function onOutputInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        try {
            hitboxes = JSON.parse(target.value);
        } catch {}
        convertHitboxes();
    }

    async function loadImage(src: string): Promise<{ width: number, height: number, src: string }> {
        const img = new Image();
        img.src = src;

        return new Promise((resolve) => {
            img.onload = () => {
                resolve(img);
            }
        })
    }

    let hitboxesStr = "";
    function convertHitboxes() {
        hitboxesStr = "new GroupHitbox(\n";
        hitboxesStr += hitboxes.map((hitbox) => {
            const round = (n: number) => Math.round(n * 100) / 100;
            if (hitbox.type === HitboxType.Rect) {
                const width = hitbox.max.x - hitbox.min.x;
                const height = hitbox.max.y - hitbox.min.y;
                const center = Vec(hitbox.min.x + (width / 2), hitbox.min.y + (height / 2));
                return `    RectangleHitbox.fromRect(${round(width)}, ${round(height)}, ${(width === 0 && height === 0) ? "" : `Vec(${round(center.x)}, ${round(center.y)})`})`;
            } else if (hitbox.type === HitboxType.Circle) {
                return `    new CircleHitbox(${round(hitbox.radius)}, Vec(${round(hitbox.position.x)}, ${round(hitbox.position.y)}))`;
            }
        }).join(",\n");
        hitboxesStr += "\n)";
    }
    convertHitboxes();

    function createHitbox(hitbox: ShapeHitbox) {
        hitbox = hitbox.toJSON() as ShapeHitbox;
        hitboxes.push(hitbox);
        selected = hitbox;
        updateSelected();
    }

    const addRectangle = () => createHitbox(new RectangleHitbox(Vec(-10, -10), Vec(10, 10)));
    const addCircle = () => createHitbox(new CircleHitbox(5));

    function duplicateSelected() {
        hitboxes.push(JSON.parse(JSON.stringify(selected)));
    }

    function deleteSelected() {
        removeFrom(hitboxes, selected);
        hitboxes = hitboxes;
        selected = hitboxes[0];
    }

    const bgImage = loadImage("/img/game/normal/buildings/fulcrum_bunker_floor.svg");
</script>

<main>
    <div id="editor">
        <div id="buttons-container">
            <button on:click={addRectangle}>Add Rectangle Hitbox</button>
            <button on:click={addCircle}>Add Circle Hitbox</button>
            <button on:click={duplicateSelected}>Duplicate Selected</button>
            <button on:click={deleteSelected}>Delete Selected</button>
        </div>
        {#if selected.type === HitboxType.Circle}
            <div>
                <span>Radius: </span>
                <input
                    type="number"
                    min="0"
                    bind:value={selected.radius}
                    on:input={updateSelected}
                />
            </div>

            <div>
                <span>X: </span>
                <input
                    type="number"
                    bind:value={selected.position.x}
                    on:input={updateSelected}
                />
            </div>

            <div>
                <span>Y: </span>
                <input
                    type="number"
                    bind:value={selected.position.y}
                    on:input={updateSelected}
                />
            </div>
        {:else if selected.type === HitboxType.Rect}
            <div>
                <span>Min X: </span>
                <input
                    type="number"
                    bind:value={selected.min.x}
                    on:input={updateSelected}
                />
            </div>

            <div>
                <span>Min Y: </span>
                <input
                    type="number"
                    bind:value={selected.min.y}
                    on:input={updateSelected}
                />
            </div>
            <div>
                <span>Max X: </span>
                <input
                    type="number"
                    bind:value={selected.max.x}
                    on:input={updateSelected}
                />
            </div>

            <div>
                <span>Max Y: </span>
                <input
                    type="number"
                    bind:value={selected.max.y}
                    on:input={updateSelected}
                />
            </div>
        {/if}

        <textarea class="output" on:keyup={onOutputInput}>{JSON.stringify(hitboxes, null, 1)}</textarea>
        <textarea class="output">{hitboxesStr}</textarea>
    </div>

    <div
        id="hitboxes-container"
        on:pointerdown={pointerDown}
        on:pointerup={pointerUp}
        on:pointermove={pointermove}
        on:wheel={mouseWheel}
        on:contextmenu={contextMenu_}
    >
        <svg>
            <g transform="translate({x} {y}) scale({scale})">
                <!-- svelte-ignore empty-block -->
                {#await bgImage}
                {:then img}
                    <image class="nopointer" x={-(img.width / 2)} y={-(img.height / 2)} href={img.src}></image>
                {/await}
                {#each hitboxes as hitbox (hitbox)}
                    <Hitbox
                        on:pointerdown={() => {
                            selected = hitbox;
                            selectedIndex;
                        }}
                        data={hitbox}
                        selected={selected === hitbox}
                    />
                {/each}
            </g>
        </svg>
    </div>
</main>

<style lang="scss">
    @use "../../src/scss/palette.scss";

    main {
        display: flex;
        background-color: #5b8939;
        color: white;
    }

    #editor {
        height: 100vh;
        width: 20vw;
        padding: 10px;
        background-color: palette.$transparent_bg;
        display: flex;
        flex-direction: column;

        #buttons-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 15px;

            button {
                padding: 5px;
            }
        }

        .output {
            height: 500px;
            resize: none;
        }
    }

    #hitboxes-container {
        width: 80vw;
        height: 100vh;
    }

    svg {
        width: 100%;
        height: 100%;
    }

    .nopointer {
        pointer-events: none;
    }
</style>
