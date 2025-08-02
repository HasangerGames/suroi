import { MapIndicatorDefinition, MapIndicators } from "@common/definitions/mapIndicators";
import { MapIndicatorSerialization } from "@common/packets/updatePacket";
import { Vec, Vector } from "@common/utils/vector";
import { Game } from "../game";
import { ReifiableDef } from "@common/utils/objectDefinitions";

export class MapIndicator implements MapIndicatorSerialization {
    id: number;
    dead = false;

    positionDirty = true;
    position: Vector;
    updatePosition(position: Vector): void {
        if (Vec.equals(position, this.position)) return;
        this.position = position;
        this.positionDirty = true;
    }

    definitionDirty = true;
    definition: MapIndicatorDefinition;

    constructor(game: Game, definition: ReifiableDef<MapIndicatorDefinition>, position: Vector) {
        this.id = game.nextMapIndicatorID;
        this.definition = MapIndicators.reify(definition);
        this.position = position;
    }
}
