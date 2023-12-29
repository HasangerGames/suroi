<script lang="ts">
    import {
    BaseHitbox,
        CircleHitbox,
        HitboxGroup,
        HitboxType,
        PolygonHitbox,
        RectangleHitbox,

        type HitboxJSON

    } from "../../../common/src/utils/hitbox";
    import { Numeric } from "../../../common/src/utils/math";
    import { Vec } from "../../../common/src/utils/vector";
    import Hitbox from "./lib/hitbox.svelte";

    let hitboxes = [
        ...new HitboxGroup(
            RectangleHitbox.fromRect(2.09, 36, Vec.create(36.03, -2)),
            RectangleHitbox.fromRect(2.09, 11.67, Vec.create(-13.96, -15.16)),
            RectangleHitbox.fromRect(13.4, 2.09, Vec.create(30.37, 16.52)),
            RectangleHitbox.fromRect(74.12, 2.09, Vec.create(0.01, -20.98)),
            RectangleHitbox.fromRect(8.2, 2, Vec.create(26, -29.5)),
            RectangleHitbox.fromRect(34.47, 2.09, Vec.create(18.77, -6.66)),
            RectangleHitbox.fromRect(2.07, 37, Vec.create(-36.01, -2.5)),
            RectangleHitbox.fromRect(35.39, 2.09, Vec.create(-19.35, 16.52)),
            RectangleHitbox.fromRect(4.16, 2.09, Vec.create(10.5, 16.52))
        ).toJSON().hitboxes
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

    const bgImage = loadImage("/img/game/buildings/armory_vault_floor.svg");

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
