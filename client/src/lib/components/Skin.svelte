<script lang="ts">
  import { type SkinDefinition, Skins } from "$common/definitions/items/skins";

  let { idString } = $props();

  const skinDef = Skins.fromStringSafe(idString) ?? {} as SkinDefinition;

  async function importSkin(filename: string): Promise<string> {
    return (await import(`../img/game/skins/${filename}.svg?url`)).default;
  }
  const baseImage = await importSkin(skinDef.baseImage ?? `${idString}_base`);
  const fistImage = await importSkin(skinDef.fistImage ?? `${idString}_fist`);

  function getTint(mask: string, tint?: number): string {
    if (tint !== undefined) {
      return `;mask-image: url("${mask}");background-color: #${tint.toString(16)};background-blend-mode: multiply`;
    }
    return "";
  }
  const baseStyle = `background-image: url("${baseImage}")${getTint(baseImage, skinDef.baseTint)}`;
  const fistStyle = `background-image: url("${fistImage}")${getTint(fistImage, skinDef.fistTint)}`;
</script>

<div class="relative w-[102px] h-[98px]">
  <div class="relative top-0 left-[6px] w-[90px] h-[90px] rotate-90"       style={baseStyle}></div>
  <div class="absolute top-[64px] w-[34px] h-[34px] rotate-90"             style={fistStyle}></div>
  <div class="absolute top-[64px] w-[34px] h-[34px] rotate-90 left-[68px]" style={fistStyle}></div>
</div>
