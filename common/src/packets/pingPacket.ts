import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Packet } from "./packet";

/*
    no serialization mechanism present because we don't care about the data the packet could hold
    so much as we do about the packet's presence to begin with (the packet's existence _is_ the data)
*/
export class PingPacket implements Packet {
    serialize(_stream: SuroiBitStream): void { /* no-op */ }
    deserialize(_stream: SuroiBitStream): void { /* no-op */ }
}
