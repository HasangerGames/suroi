function reveal(){
    document.getElementById("dropdownMore").classList.toggle("dropdown-more-show");
}

//Close dropdown menus when user clicks somewhere not in the dropdown menu
window.onclick = function(event){
    if(!event.target.matches(".btn-dropdown-more")){
        var dropdown = document.getElementsByClassName("dropdown-more-content");
        var i;
        for(i=0; i<dropdown.length; i++){
            var open_dropdown = dropdown[i];
            if(open_dropdown.classList.contains("dropdown-more-show")){
                open_dropdown.classList.remove("dropdown-more-show");
            }
        }
    }
}

//icon flipping
const button = document.getElementsByClassName("btn-dropdown-more");
const dropDown = document.getElementsByClassName("dropdown-more");

button.addEventListener("click", () => {
    document.querySelector(".fa-solid.fa-caret-down").classList.toggle(".fa-caret-up")
  // toggle classes
  // toggle dropdown
});