import { createPacket } from "./packet";

/*
    no serialization mechanism present because we don't care about the data the packet could hold
    so much as we do about the packet's presence to begin with (the packet's existence _is_ the data)
*/
// shut up
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export const PingPacket = createPacket("PingPacket")<void>({
    serialize(_stream) { /* no-op */ },
    deserialize(_stream) { /* no-op */ }
});
