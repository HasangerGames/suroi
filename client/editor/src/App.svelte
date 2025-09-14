<script lang="ts">
    import { removeFrom } from "@common/utils/misc";
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

    let hitboxes: HitboxJSON[] = [
        ...new GroupHitbox(
            RectangleHitbox.fromRect(10, 10, Vec(0, 0))
        ).toJSON().hitboxes
    ];

    let lastHitboxMove = 0;
    let selected = hitboxes[0];
    let selectedIndex = 0;

    let x = 0;
    let y = 0;
    let scale = 1;
    let pointerX = 0;
    let pointerY = 0;

    let hitboxesContainer: HTMLElement;
    // biome-ignore lint/style/noNonNullAssertion: we're assuming this element exists
    onMount(() => { hitboxesContainer = document.getElementById("hitboxes-container")!; });

    let nudgeStep = 0.01; // world units to move per arrow key

    let dragging = false;
    let rightDragging = false; // Flag for right mouse button drag
    let resizing = false;
    let resizeHandle = '';

    function pointerDown(e: PointerEvent) {
        if (e.button === 0) { // Left mouse button
            // Check if clicking on resize handle
            const handle = getResizeHandle(pointerX, pointerY);
            if (handle) {
                resizing = true;
                resizeHandle = handle;
            } else {
                dragging = true;
            }
        } else if (e.button === 2) { // Right mouse button
            rightDragging = true;
        }
    }

    function pointerUp(e: PointerEvent) {
        if (e.button === 0) {
            dragging = false;
            resizing = false;
            resizeHandle = '';
        } else if (e.button === 2) {
            rightDragging = false;
            adjustingWidth = false;
            adjustingHeight = false;
        }
    }

    let adjustingWidth = false;
    let adjustingHeight = false;

    function getResizeHandle(x: number, y: number): string {
        if (selected.type === HitboxType.Rect) {
            const { min, max } = selected;
            const tolerance = 0.5; // Small tolerance for edge detection

            // Check if we're on the border of the rectangle
            const onLeftEdge = Math.abs(x - min.x) < tolerance && y >= min.y - tolerance && y <= max.y + tolerance;
            const onRightEdge = Math.abs(x - max.x) < tolerance && y >= min.y - tolerance && y <= max.y + tolerance;
            const onTopEdge = Math.abs(y - min.y) < tolerance && x >= min.x - tolerance && x <= max.x + tolerance;
            const onBottomEdge = Math.abs(y - max.y) < tolerance && x >= min.x - tolerance && x <= max.x + tolerance;

            // Corner handles (corners have priority)
            if (onLeftEdge && onTopEdge) return 'nw';
            if (onRightEdge && onTopEdge) return 'ne';
            if (onLeftEdge && onBottomEdge) return 'sw';
            if (onRightEdge && onBottomEdge) return 'se';

            // Edge handles (only if on edge, not corner)
            if (onTopEdge && !onLeftEdge && !onRightEdge) return 'n';
            if (onBottomEdge && !onLeftEdge && !onRightEdge) return 's';
            if (onLeftEdge && !onTopEdge && !onBottomEdge) return 'w';
            if (onRightEdge && !onTopEdge && !onBottomEdge) return 'e';

        } else if (selected.type === HitboxType.Circle) {
            const { position, radius } = selected;
            const tolerance = 0.5; // Small tolerance for edge detection

            const distanceFromCenter = Math.sqrt(
                Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2)
            );

            // Only detect handles if we're very close to the circumference
            if (Math.abs(distanceFromCenter - radius) < tolerance) {
                const angle = Math.atan2(y - position.y, x - position.x);

                // Check which cardinal direction is closest
                const angles = {
                    'e': 0,
                    's': Math.PI / 2,
                    'w': Math.PI,
                    'n': -Math.PI / 2
                };

                let closestHandle = 'e';
                let smallestDiff = Math.abs(angle - angles.e);

                for (const [handle, handleAngle] of Object.entries(angles)) {
                    let diff = Math.abs(angle - handleAngle);
                    // Handle wrap-around for angles
                    if (diff > Math.PI) diff = 2 * Math.PI - diff;

                    if (diff < smallestDiff && diff < Math.PI / 4) { // Only if within 45 degrees
                        smallestDiff = diff;
                        closestHandle = handle;
                    }
                }

                return closestHandle;
            }
        }
        return '';
    }

    function pointermove(e: PointerEvent) {
        const { x: rectX, y: rectY } = hitboxesContainer.getBoundingClientRect();
        [pointerX, pointerY] = [
            (e.clientX - x - rectX) / scale / PIXI_SCALE,
            (e.clientY - y - rectY) / scale / PIXI_SCALE
        ];

        if (resizing) {
            const [dx, dy] = [
                e.movementX / scale / PIXI_SCALE,
                e.movementY / scale / PIXI_SCALE
            ];

            if (selected.type === HitboxType.Rect) {
                const { min, max } = selected;

                switch (resizeHandle) {
                    case 'nw':
                        selected.min.x = Math.min(min.x + dx, max.x - 0.1);
                        selected.min.y = Math.min(min.y + dy, max.y - 0.1);
                        break;
                    case 'ne':
                        selected.max.x = Math.max(max.x + dx, min.x + 0.1);
                        selected.min.y = Math.min(min.y + dy, max.y - 0.1);
                        break;
                    case 'sw':
                        selected.min.x = Math.min(min.x + dx, max.x - 0.1);
                        selected.max.y = Math.max(max.y + dy, min.y + 0.1);
                        break;
                    case 'se':
                        selected.max.x = Math.max(max.x + dx, min.x + 0.1);
                        selected.max.y = Math.max(max.y + dy, min.y + 0.1);
                        break;
                    case 'n':
                        selected.min.y = Math.min(min.y + dy, max.y - 0.1);
                        break;
                    case 's':
                        selected.max.y = Math.max(max.y + dy, min.y + 0.1);
                        break;
                    case 'w':
                        selected.min.x = Math.min(min.x + dx, max.x - 0.1);
                        break;
                    case 'e':
                        selected.max.x = Math.max(max.x + dx, min.x + 0.1);
                        break;
                }
            } else if (selected.type === HitboxType.Circle) {
                const distance = Math.sqrt(
                    Math.pow(pointerX - selected.position.x, 2) +
                    Math.pow(pointerY - selected.position.y, 2)
                );
                // @ts-expect-error radius is technically read only but who cares
                selected.radius = Math.max(0.1, distance);
            }
            updateSelected();
        } else if (dragging && !rightDragging) {
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
        }

        // Update cursor based on what we're hovering over
        if (!resizing && !dragging) {
            const handle = getResizeHandle(pointerX, pointerY);
            hitboxesContainer.style.cursor = handle ? `${handle}-resize` : 'default';
        } else if (dragging) {
            hitboxesContainer.style.cursor = "grabbing";
        }

        // Update cursor based on what we're hovering over
        if (!resizing && !dragging) {
            const handle = getResizeHandle(pointerX, pointerY);
            hitboxesContainer.style.cursor = handle ? getCursorForHandle(handle) : 'default';
        }
    }

    function getCursorForHandle(handle: string): string {
        switch (handle) {
            case 'nw': case 'se': return 'nw-resize';
            case 'ne': case 'sw': return 'ne-resize';
            case 'n': case 's': return 'n-resize';
            case 'w': case 'e': return 'e-resize';
            default: return 'default';
        }
    }

    function contextMenu_(event: PointerEvent) {
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
        // biome-ignore lint/suspicious/noEmptyBlockStatements: ignore exception
        } catch {}
        convertHitboxes();
    }

    function loadImage(src: string): Promise<{ width: number, height: number, src: string }> {
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

    const addRectangle = () => createHitbox(new RectangleHitbox(Vec(-5, -5), Vec(5, 5)));
    const addCircle = () => createHitbox(new CircleHitbox(5));

    function duplicateSelected() {
        hitboxes.push(JSON.parse(JSON.stringify(selected)));
    }

    function deleteSelected() {
        removeFrom(hitboxes, selected);
        hitboxes = hitboxes;
        selected = hitboxes[0];
    }
    const bgImage = loadImage("/img/game/hunted/buildings/train_floor.svg");

    function handleKeydown(e: KeyboardEvent) {
        let moved = false;
        if (selected.type === HitboxType.Rect) {
            switch (e.key) {
                case 'ArrowLeft': selected.min.x -= nudgeStep; selected.max.x -= nudgeStep; moved = true; break;
                case 'ArrowRight': selected.min.x += nudgeStep; selected.max.x += nudgeStep; moved = true; break;
                case 'ArrowUp': selected.min.y -= nudgeStep; selected.max.y -= nudgeStep; moved = true; break;
                case 'ArrowDown': selected.min.y += nudgeStep; selected.max.y += nudgeStep; moved = true; break;
            }
        } else if (selected.type === HitboxType.Circle) {
            switch (e.key) {
                case 'ArrowLeft': selected.position.x -= nudgeStep; moved = true; break;
                case 'ArrowRight': selected.position.x += nudgeStep; moved = true; break;
                case 'ArrowUp': selected.position.y -= nudgeStep; moved = true; break;
                case 'ArrowDown': selected.position.y += nudgeStep; moved = true; break;
            }
        }
        if (moved) {
            e.preventDefault();
            updateSelected();
        }
    }
</script>

<main>
    <div id="editor">
        <div id="buttons-container">
            <button on:click={addRectangle}>Add Rectangle Hitbox</button>
            <button on:click={addCircle}>Add Circle Hitbox</button>
            <button on:click={duplicateSelected}>Duplicate Selected</button>
            <button on:click={deleteSelected}>Delete Selected</button>
           <div>
               <label>
                   Nudge Step:
                   <input type="number" bind:value={nudgeStep} min="0.1" step="0.1" style="width: 60px;" />
               </label>
           </div>
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

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        id="hitboxes-container"
        on:pointerdown={pointerDown}
        on:pointerup={pointerUp}
        on:pointermove={pointermove}
        on:wheel={mouseWheel}
        on:contextmenu={contextMenu_}
        on:keydown={handleKeydown}
        tabindex="-1"
        role="application"
        aria-label="Hitbox editor canvas"
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

               <!-- Resize handles for selected hitbox -->
               {#if selected.type === HitboxType.Rect}
                   {@const { min, max } = selected}
                   {@const centerX = (min.x + max.x) / 2}
                   {@const centerY = (min.y + max.y) / 2}
                   {@const handleSize = 2 / scale}

                   <!-- Corner handles -->
                   <rect x={(min.x * PIXI_SCALE) - handleSize} y={(min.y * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="blue" class="resize-handle" />
                   <rect x={(max.x * PIXI_SCALE) - handleSize} y={(min.y * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="blue" class="resize-handle" />
                   <rect x={(min.x * PIXI_SCALE) - handleSize} y={(max.y * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="blue" class="resize-handle" />
                   <rect x={(max.x * PIXI_SCALE) - handleSize} y={(max.y * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="blue" class="resize-handle" />

                   <!-- Edge handles -->
                   <rect x={(centerX * PIXI_SCALE) - handleSize} y={(min.y * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="lightblue" class="resize-handle" />
                   <rect x={(centerX * PIXI_SCALE) - handleSize} y={(max.y * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="lightblue" class="resize-handle" />
                   <rect x={(min.x * PIXI_SCALE) - handleSize} y={(centerY * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="lightblue" class="resize-handle" />
                   <rect x={(max.x * PIXI_SCALE) - handleSize} y={(centerY * PIXI_SCALE) - handleSize} width={handleSize * 2} height={handleSize * 2} fill="lightblue" class="resize-handle" />
               {:else if selected.type === HitboxType.Circle}
                   {@const { position, radius } = selected}
                   {@const handleSize = 2 / scale}

                   <!-- Radius handles -->
                   <circle cx={(position.x + radius) * PIXI_SCALE} cy={position.y * PIXI_SCALE} r={handleSize} fill="blue" class="resize-handle" />
                   <circle cx={(position.x - radius) * PIXI_SCALE} cy={position.y * PIXI_SCALE} r={handleSize} fill="blue" class="resize-handle" />
                   <circle cx={position.x * PIXI_SCALE} cy={(position.y - radius) * PIXI_SCALE} r={handleSize} fill="blue" class="resize-handle" />
                   <circle cx={position.x * PIXI_SCALE} cy={(position.y + radius) * PIXI_SCALE} r={handleSize} fill="blue" class="resize-handle" />
               {/if}
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

    .resize-handle {
        pointer-events: all;
        cursor: pointer;
    }

    #hitboxes-container:focus {
        outline: none;
    }
</style>
