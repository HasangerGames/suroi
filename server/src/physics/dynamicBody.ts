import { Body } from "./body";
import { v, vAdd, vClone } from "../../../common/src/utils/vector";
import { CircleHitbox } from "../../../common/src/utils/hitbox";

export class DynamicBody extends Body {
    velocity = v(0, 0);

    tick(): void {
        // Move body based on velocity
        this.oldPosition = vClone(this.position);
        this.position = vAdd(this.position, this.velocity);
        this.hitbox = this.initialHitbox.transform(this.position);

        // Find and resolve collisions
        for (const potential of this.game.getVisibleObjects(this.position)) {
            if (potential.hitbox !== undefined && this.hitbox.collidesWith(potential.hitbox)) { // TODO Make an array of collidable objects
                this.hitbox.resolveCollision(potential.hitbox);
                if (this.hitbox instanceof CircleHitbox) this._position = this.hitbox.position;
            }
        }
    }
}
