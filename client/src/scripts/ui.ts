import ClickEvent = JQuery.ClickEvent;
import $ from "jquery";

$(() => {
    // Enable splash "more" dropdown
    const dropdownCaret = $("#btn-dropdown-more i");
    const dropdown = $("#splash-more .dropdown-content");
    $(document.body).on("click", (e: ClickEvent): void => {
        if ((e.target as HTMLElement)?.id === "btn-dropdown-more") {
            if (dropdown.hasClass("active")) {
                dropdown.removeClass("active");
                dropdownCaret.removeClass("fa-caret-up").addClass("fa-caret-down");
            } else {
                dropdown.addClass("active");
                dropdownCaret.removeClass("fa-caret-down").addClass("fa-caret-up");
            }
        } else {
            dropdown.removeClass("active");
            dropdownCaret.removeClass("fa-caret-up").addClass("fa-caret-down");
        }
    });
});
