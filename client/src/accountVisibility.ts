document.addEventListener("DOMContentLoaded", () => {
  const acoountBtn = document.getElementById("account-btn-container") as HTMLButtonElement | null;
  const acoountPanel = document.querySelector(".modal3") as HTMLDivElement | null;


  if (!acoountBtn || !acoountPanel ) return;


  acoountBtn.addEventListener("click", () => {
    acoountPanel.classList.add("active");
   

  });


  const closeBtn = document.querySelector("#account-panel-close");

  if(!closeBtn) return;


  
closeBtn.addEventListener("click",()=>{
     acoountPanel.classList.remove("active");
  })

  document.addEventListener("click", (e: MouseEvent) => {
    if (
      !acoountPanel.contains(e.target as Node) &&
      !acoountBtn.contains(e.target as Node)
    ) {
      acoountPanel.classList.remove("active");
      
    }
  });
  })
  


