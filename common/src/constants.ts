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

export enum ObjectCategory {
    Player, Obstacle
}

export enum PacketType {
    Join, Map, Update, Input
}

export const OBJECT_CATEGORY_BITS = 1;
export const MIN_OBJECT_SCALE = 0.25, MAX_OBJECT_SCALE = 2;
