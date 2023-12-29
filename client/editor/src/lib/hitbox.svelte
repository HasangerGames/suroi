<script lang="ts">
    import {
        HitboxType,
        type HitboxJSON
    } from "../../../../common/src/utils/hitbox";
    import { PIXI_SCALE } from "../../../src/scripts/utils/constants";

    export let data: HitboxJSON;
    export let selected: boolean;
</script>

<g on:pointerdown fill="rgba({selected ? "255, 0, 0" : "255, 255, 255"}, 0.5)">
    {#if data.type === HitboxType.Circle}
        <circle
            r={data.radius * PIXI_SCALE}
            cx={data.position.x * PIXI_SCALE}
            cy={data.position.y * PIXI_SCALE}
        />
    {:else if data.type === HitboxType.Rect}
        <rect
            width={(data.max.x - data.min.x) * PIXI_SCALE}
            height={(data.max.y - data.min.y) * PIXI_SCALE}
            x={data.min.x * PIXI_SCALE}
            y={data.min.y * PIXI_SCALE}
        />
    {:else if data.type === HitboxType.Polygon}
        <polygon
            points={data.points
                .map(
                    (point) =>
                        `${point.x * PIXI_SCALE}, ${point.y * PIXI_SCALE}`
                )
                .join(",")}
        />
    {:else if data.type === HitboxType.Group}
        {#each data.hitboxes as hitbox}
            <svelte:self data={hitbox} />
        {/each}
    {/if}
</g>

