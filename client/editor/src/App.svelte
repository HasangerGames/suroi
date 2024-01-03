<script lang="ts">
    import {
        HitboxGroup,
        HitboxType,
        RectangleHitbox
    } from "../../../common/src/utils/hitbox";
    import { Numeric } from "../../../common/src/utils/math";
    import { Vec } from "../../../common/src/utils/vector";
    import Hitbox from "./lib/hitbox.svelte";

    let hitboxes = [
        ...new HitboxGroup(
            RectangleHitbox.fromRect(1.47, 102.18, Vec.create(129.93, 73.42)),
            RectangleHitbox.fromRect(126.01, 1.5, Vec.create(67.66, 123.77)),
            RectangleHitbox.fromRect(84.61, 1.48, Vec.create(88.35, 74.7)),
            RectangleHitbox.fromRect(74.74, 1.52, Vec.create(-113.86, -33.25)),
            RectangleHitbox.fromRect(1.49, 8.59, Vec.create(-15.17, 65.39)),
            RectangleHitbox.fromRect(84.61, 1.49, Vec.create(88.35, 49.55)),
            RectangleHitbox.fromRect(1.51, 56, Vec.create(-77.24, -5)),
            RectangleHitbox.fromRect(207.5, 1.5, Vec.create(25.75, 23.08)),
            RectangleHitbox.fromRect(84.61, 1.49, Vec.create(88.35, 98.77)),
            RectangleHitbox.fromRect(21.42, 1.48, Vec.create(-5.21, 61.83)),
            RectangleHitbox.fromRect(1.47, 63.43, Vec.create(5.4, 92.81)),
            RectangleHitbox.fromRect(1.49, 8.6, Vec.create(-42.55, 65.39)),
            RectangleHitbox.fromRect(33, 1.48, Vec.create(-59, 61.83)),
            RectangleHitbox.fromRect(1.44, 8.6, Vec.create(-75.61, 65.39)),
            RectangleHitbox.fromRect(1.46, 8.6, Vec.create(-102.97, 65.39)),
            RectangleHitbox.fromRect(13, 1.48, Vec.create(-110, 61.83)),
            RectangleHitbox.fromRect(1.46, 55.47, Vec.create(-116.51, 34.84)),
            RectangleHitbox.fromRect(35.45, 1.47, Vec.create(-133.5, 7.85))
        ).transform(Vec.create(4.5, 0)).toJSON().hitboxes
    ];

    let selected = hitboxes[0];
    let selectedIndex = 0;

    let x = 0;
    let y = 0;
    let scale = 1;

    let dragging = false;
    function pointerDown(e: PointerEvent) {
        dragging = true;
    }
    function pointerUp(e: PointerEvent) {
        dragging = false;
    }

    function pointermove(e: PointerEvent) {
        if (dragging) {
            x += e.movementX;
            y += e.movementY;
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

    const bgImage = loadImage("/img/game/buildings/port_floor.svg");

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
