import $ from "jquery";

export const body = $(document.body);
export function createDropdown(selector: string): void {
    const dropdown = {
        main: $(`${selector} .dropdown-content`),
        caret: $(`${selector} button i`),
        active: false,
        show() {
            this.active = true;
            this.main.addClass("active");
            this.caret.removeClass("fa-caret-down").addClass("fa-caret-up");
        },
        hide() {
            this.active = false;
            this.main.removeClass("active");
            this.caret.addClass("fa-caret-down").removeClass("fa-caret-up");
        },
        toggle() {
            this.active
                ? this.hide()
                : this.show();
        }
    };
    $(`${selector} button`).on("click", ev => {
        dropdown.toggle();
        ev.stopPropagation();
    });
    body.on("click", () => { dropdown.hide(); });
}
