<script lang="ts">
    import { Circle } from "pixi.js";
    import {
    CircleHitbox,
        HitboxGroup,
        HitboxType,
        RectangleHitbox
    } from "../../../common/src/utils/hitbox";
    import { Numeric } from "../../../common/src/utils/math";
    import { Vec } from "../../../common/src/utils/vector";
    import Hitbox from "./lib/hitbox.svelte";

    let hitboxes = [
        ...new HitboxGroup(
                // Right walls
                // Above window
                RectangleHitbox.fromRect(2, 10.5, Vec.create(-31, 21.3)),
                // First below window
                RectangleHitbox.fromRect(2, 8.5, Vec.create(-31, 1.9)),
                // Second below window
                RectangleHitbox.fromRect(2, 14, Vec.create(-31, -20)),

                // Top walls
                // Left of window
                RectangleHitbox.fromRect(20, 2, Vec.create(37, 27.3)),
                // Right of window
                RectangleHitbox.fromRect(48.7, 2, Vec.create(-7.5, 27.3)),

                // Left Wall
                // Whole side of building
                RectangleHitbox.fromRect(2, 55.2, Vec.create(46.5, 0)),

                // Bottom Walls
                // Left of back door
                RectangleHitbox.fromRect(9, 2, Vec.create(43, -26.5)),
                // Right of back door
                RectangleHitbox.fromRect(39.6, 2, Vec.create(8, -26.5)),
                // Right of window
                RectangleHitbox.fromRect(10.2, 2, Vec.create(-26.7, -26.5))
            ).transform(Vec.create(0, 0), 1.076, 3).toJSON().hitboxes
    ];

    let selected = hitboxes[0];
    let selectedIndex = 0;

    let x = 0;
    let y = 0;
    let scale = 1;

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
        }
    }

    function pointermove(e: PointerEvent) {
        if (dragging && !rightDragging) {
            x += e.movementX;
            y += e.movementY;
        } else if (rightDragging && !dragging) {
            if (selected.type === HitboxType.Circle) {
                selected.position.x += e.movementX;
                selected.position.y += e.movementY;
            } else if (selected.type === HitboxType.Rect) {
                selected.min.x += e.movementX / 10;
                selected.min.y += e.movementY / 10;
                selected.max.x += e.movementX / 10;
                selected.max.y += e.movementY / 10;
            }
            updateSelected();
        }
    }

    function mouseWheel(e: WheelEvent) {
        scale = Numeric.clamp(scale - e.deltaY / 1000, 0.1, 5);
    }

    function updateSelected() {
        hitboxes[hitboxes.indexOf(selected)] = selected;
    }

    function onOutputInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        try {
            hitboxes = JSON.parse(target.value);
        } catch {}
        convertHitboxes();
    }

    async function loadImage(src: string): Promise<{ width: number, height: number}> {
        const img = new Image()
        img.src = src

        return new Promise((resolve) => {
            img.onload = () => {
                resolve(img);
            }
        })
    }

    let hitboxesStr = "";
    function convertHitboxes() {
        hitboxesStr = "new HitboxGroup(\n";
        hitboxesStr += hitboxes.map((hitbox) => {
            const round = (n: number) => Math.round(n * 100) / 100;
            if (hitbox.type === HitboxType.Rect) {
                const width = hitbox.max.x - hitbox.min.x;
                const height = hitbox.max.y - hitbox.min.y;
                const center = Vec.create(hitbox.min.x + (width / 2), hitbox.min.y + (height / 2));
                return `    RectangleHitbox.fromRect(${round(width)}, ${round(height)}, ${(width === 0 && height === 0) ? "" : `Vec.create(${round(center.x)}, ${round(center.y)})`})`;
            } else {
                return `    new CircleHitbox(${round(hitbox.radius)}, Vec.create(${round(hitbox.position.x)}, ${round(hitbox.position.y)}))`;
            }
        }).join(",\n");
        hitboxesStr += "\n)";
    }
    convertHitboxes();

    const bgImage = loadImage("/img/game/buildings/green_house_floor.svg");

</script>

<main>
    <div id="editor">
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
        oncontextmenu="return false"
    >
        <svg>
            <g transform="translate({x} {y}) scale({scale})">
                {#await bgImage}
                {:then img}
                    <image x="{-(img.width / 2)}" y="{-(img.height / 2)}" href="{img.src}" onmousedown="return false"></image>
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
    @import "../../src/scss/palette.scss";

    main {
        display: flex;
        background-color: $bg;
        color: white;
    }

    #editor {
        height: 100vh;
        width: 20vw;
        background-color: $transparent_bg;
        display: flex;
        flex-direction: column;

        .output {
            justify-self: flex-end;
            width: 90%;
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
</style>
