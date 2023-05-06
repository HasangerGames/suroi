document.querySelector(".dropdown-more > button")?.addEventListener("click", () => {
    document.querySelector("#dropdownMore")?.classList.toggle("dropdown-more-show");
});

// Close dropdown menus when user clicks outside of scope.
document.querySelector(".btn-dropdown-more")?.addEventListener("click", () => {
    const dropdown = document.querySelectorAll(".dropdown-more-content");
    for (let i = 0; i < dropdown.length; i++) {
        const openDropdown = dropdown[i];
        if (openDropdown.classList.contains("dropdown-more-show")) openDropdown.classList.remove("dropdown-more-show");
    }
});
