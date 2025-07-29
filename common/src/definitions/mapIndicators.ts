import { DefinitionType, ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface MapIndicatorDefinition extends ObjectDefinition {
    readonly defType: DefinitionType.MapIndicator
}

export const MapIndicators = new ObjectDefinitions<MapIndicatorDefinition>([
    "helmet_indicator",
    "vest_indicator",
    "pack_indicator",
    "juggernaut_indicator",
    "player_indicator"
].map(idString => ({
    idString,
    name: idString,
    defType: DefinitionType.MapIndicator
})));
