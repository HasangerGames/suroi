import { Obstacles } from "../constants/obstacles";

export enum ObjectCategory {
    Player, Obstacle
}

// TODO Better typings
export interface ObjectDefinition { idString: string }

export function getDefinitionsForCategory(category: ObjectCategory): ObjectDefinition[] {
    switch (category) {
        case ObjectCategory.Obstacle: return Obstacles;
    }
    return [];
}
