/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ObjectDefinitions } from "../utils/objectDefinitions";

interface ObstacleDefinition {
    idString: string
    imageName?: string
    variations?: string[]
}

export class Obstacles extends ObjectDefinitions {
    static readonly bitCount = 1;
    static readonly definitions: ObstacleDefinition[] = [
        {
            idString: "tree_oak",
            variations: ["tree_oak_1.svg", "tree_oak_2.svg", "tree_oak_3.svg"]
        },
        {
            idString: "rock",
            variations: ["rock_1.svg", "rock_2.svg", "rock_3.svg", "rock_4.svg", "rock_5.svg"]
        },
        {
            idString: "bush",
            imageName: "bush.svg"
        },
        {
            idString: "crate_regular",
            imageName: "crate_regular.svg"
        }
    ];
}
