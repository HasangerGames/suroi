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

/**
 * Setup all splash dropdowns.
 */
const setupDropdown = (): void => {
    const dropdownCaret = document.querySelector("#btn-dropdown-more i");
    const dropdown = document.querySelector("#splash-more .dropdown-content");

    if (dropdownCaret === null || dropdown === null) return;

    document.addEventListener("click", (e: MouseEvent) => {
        const enabled = dropdown.classList.contains("active");
        if ((e.target as HTMLElement)?.id === "btn-dropdown-more") {
            if (enabled) {
                dropdown.classList.remove("active");
                dropdownCaret.classList.replace("fa-caret-up", "fa-caret-down");
            } else {
                dropdown.classList.add("active");
                dropdownCaret.classList.replace("fa-caret-down", "fa-caret-up");
            }
        } else {
            dropdown.classList.remove("active");
            dropdownCaret.classList.replace("fa-caret-up", "fa-caret-down");
        }
    });
};

export {
    setupDropdown
};
