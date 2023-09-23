import {
    type ObjectDefinition,
    ObjectDefinitions
} from "../utils/objectDefinitions";

export interface CrosshairDefinition extends ObjectDefinition {}

export const Emotes = new ObjectDefinitions<CrosshairDefinition>([
    {
        idString: "happy_face",
        name: "Happy Face"
    }
]);
