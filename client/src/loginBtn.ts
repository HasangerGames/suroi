
export function LoginBtn():void{

  const loginBtn = document.querySelector<HTMLButtonElement>("#btn-login");
  const loginPanel = document.querySelector<HTMLDivElement>(".modal2") ;





  loginBtn?.addEventListener("click", () => {
    loginPanel?.classList.add("active");
   

  });


  const closeBtn = document.querySelector<HTMLElement>(".close");

  closeBtn?.addEventListener("click",()=>{
     loginPanel?.classList.remove("active");
  });


  document.addEventListener("click", (e: MouseEvent) => {

  
    if(e.target instanceof Node){
        
          if (
                !loginPanel?.contains(e.target) &&
                !loginBtn?.contains(e.target)
              ) {
                loginPanel?.classList.remove("active");
                
              }
    }
  });
}