<script lang="ts">
  import { iconModules } from "./iconModules.svelte.ts";

  let { src, size = 6, ...props } = $props();

  const { attributes, svgContent } = $derived(await (async () => {
    const [namespace, name] = src.split(":");

    const icons = iconModules[namespace];
    if (!icons) throw new Error(`Unknown icon namespace: '${namespace}'`);

    const iconImport = icons[name];
    if (!iconImport) throw new Error(`Unknown icon: '${src}'`);

    const rawSvg = await iconImport() as string;
    const parsedSvg = rawSvg.match(/.*?<svg([^>]*)>([\s\S]*?)<\/svg>/mi);
    if (!parsedSvg) throw new Error(`Unable to parse icon: '${src}'`);

    const attributes: Record<string, string> = {};
    const attributeRegex = /([^=]+)="([^"]*)"/g;
    const rawAttributes = parsedSvg[1];
    let parsedAttribute: RegExpExecArray | null;
    while (parsedAttribute = attributeRegex.exec(rawAttributes)) {
        attributes[parsedAttribute[1].trim()] = parsedAttribute[2];
    }

    return { attributes, svgContent: parsedSvg[2] };
  })());
</script>

<svg
  {...attributes}
  width={size * 4}
  height={size * 4}
  class="drop-shadow-lg"
  {...props}
>
  {@html svgContent}
</svg>
