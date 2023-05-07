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
