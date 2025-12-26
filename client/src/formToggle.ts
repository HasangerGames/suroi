export function initAuthFormSimpleToggle(): void {
  const loginForm = document.getElementById("login-menu") as HTMLElement | null;
  const signupForm = document.getElementById("signup-menu") as HTMLElement | null;

  const toSignupBtn = document.getElementById("sign-toggle");
  const toLoginBtn = document.getElementById("login-toggle");

  if (!loginForm || !signupForm || !toSignupBtn || !toLoginBtn) return;

  
  toSignupBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    loginForm.style.display = "none";
    signupForm.style.display = "block";
  });


  toLoginBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    signupForm.style.display = "none";
    loginForm.style.display = "block";
  });
}
