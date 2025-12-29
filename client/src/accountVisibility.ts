
export function AccountVisibility():void{





  const acountBtn = document.querySelector<HTMLButtonElement>("#account-btn-container") ;
  const acountPanel = document.querySelector<HTMLDivElement>(".modal3");


  if (!acountBtn || !acountPanel ) return;


  acountBtn.addEventListener("click", () => {
    acountPanel.classList.add("active");
   

  });


  const closeBtn = document.querySelector<HTMLButtonElement>("#account-panel-close");

  if(!closeBtn) return;


  
closeBtn.addEventListener("click",()=>{
     acountPanel.classList.remove("active");
  })

  document.addEventListener("click", (e: MouseEvent) => {

    const target = e.target;

    if(target instanceof Node){
      if (
        !acountPanel.contains(target) &&
        !acountBtn.contains(target)
      ) {
        acountPanel.classList.remove("active");

      }
    }

  });

  
}