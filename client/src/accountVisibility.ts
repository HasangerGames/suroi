
export function AccountVisibility():void{

  const accountBtn = document.querySelector<HTMLButtonElement>("#account-btn-container") ;
  const accountPanel = document.querySelector<HTMLDivElement>(".modal3");

  accountBtn?.addEventListener("click", () => {
    accountPanel?.classList.add("active");
   

  });


  const closeBtn = document.querySelector<HTMLButtonElement>("#account-panel-close");


closeBtn?.addEventListener("click",()=>{
     accountPanel?.classList.remove("active");
  })

  document.addEventListener("click", (e: MouseEvent) => {

 

    if(e.target instanceof Node){
      if (
        !accountPanel?.contains(e.target) &&
        !accountBtn?.contains(e.target)
      ) {
        accountPanel?.classList.remove("active");

      }
    }
  });
}