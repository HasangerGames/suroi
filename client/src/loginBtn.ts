document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("btn-login") as HTMLButtonElement | null;
  const loginPanel = document.querySelector(".modal2") as HTMLDivElement | null;


  if (!loginBtn || !loginPanel ) return;


  loginBtn.addEventListener("click", () => {
    loginPanel.classList.add("active");
   

  });


  const closeBtn = document.querySelectorAll<HTMLElement>(".close");

  if(!closeBtn) return;


  closeBtn.forEach(btn=>{
btn.addEventListener("click",()=>{
     loginPanel.classList.remove("active");
  })

  document.addEventListener("click", (e: MouseEvent) => {
    if (
      !loginPanel.contains(e.target as Node) &&
      !loginBtn.contains(e.target as Node)
    ) {
      loginPanel.classList.remove("active");
      
    }
  });
  })
  
});

