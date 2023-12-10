<script lang="ts">
    import {
        CircleHitbox,
        HitboxGroup,
        HitboxType,
        PolygonHitbox,
        RectangleHitbox
    } from "../../../common/src/utils/hitbox";
    import { clamp } from "../../../common/src/utils/math";
    import { v } from "../../../common/src/utils/vector";
    import Hitbox from "./lib/hitbox.svelte";

    // small house hitbox with also a big circle lol
    let hitboxes = [
        ...new HitboxGroup(
            new CircleHitbox(10, v(0, 0)),
            RectangleHitbox.fromRect(2, 9, v(-31, 26)),
            RectangleHitbox.fromRect(2, 22, v(-31, 0.2)),
            RectangleHitbox.fromRect(2, 9.8, v(-31, -25)),
            RectangleHitbox.fromRect(19.8, 2, v(22, 29.5)),
            RectangleHitbox.fromRect(8.2, 2, v(-26.0, 29.5)),
            RectangleHitbox.fromRect(14, 2, v(-4.6, 29.5)),
            RectangleHitbox.fromRect(2, 32, v(30.9, 13.5)),
            RectangleHitbox.fromRect(2, 16, v(30.9, -20.5)),
            RectangleHitbox.fromRect(12.3, 2, v(25.8, -28.9)),
            RectangleHitbox.fromRect(39.4, 2, v(-10.45, -28.9))
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
        scale = clamp(scale - e.deltaY / 1000, 0.1, 5);
    }

    function updateSelected() {
        hitboxes[hitboxes.indexOf(selected)] = selected;
    }

    function onOutputInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        try {
            hitboxes = JSON.parse(target.value);
        } catch {}
    }
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

        <textarea  id="output" on:keyup={onOutputInput}
            >{JSON.stringify(hitboxes, null, 1)}
        </textarea>
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

        #output {
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
