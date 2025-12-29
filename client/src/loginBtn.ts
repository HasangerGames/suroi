

export function LoginBtn():void{

  const loginBtn = document.querySelector<HTMLButtonElement>("#btn-login");
  const loginPanel = document.querySelector<HTMLDivElement>(".modal2") ;


  if (!loginBtn || !loginPanel ) return;


  loginBtn.addEventListener("click", () => {
    loginPanel.classList.add("active");
   

  });


  const closeBtn = document.querySelectorAll<HTMLElement>(".close");

  if(closeBtn.length ===0) return;


  closeBtn.forEach(btn=>{
     btn.addEventListener("click",()=>{
     loginPanel.classList.remove("active");
  });
});

  document.addEventListener("click", (e: MouseEvent) => {

    const target = e.target;


    if(target instanceof Node){
        
          if (
                !loginPanel.contains(target) &&
                !loginBtn.contains(target)
              ) {
                loginPanel.classList.remove("active");
                
              }
    }
    
  });
 
  

}


