export function initPasswordVisibility(): void {
  const toggleBtns =
    document.querySelectorAll<HTMLElement>(".toggle-password");

  if (toggleBtns.length === 0) return;

  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      
      const allPasswordInputs =
        document.querySelectorAll<HTMLInputElement>(".pass-word");
      const allPasswordTexts =
        document.querySelectorAll<HTMLElement>(".visible-text");

      const index = Array.from(toggleBtns).indexOf(btn);

      const passwordInput = allPasswordInputs[index];
      const passwordText = allPasswordTexts[index];

      if (!passwordInput || !passwordText) return;

      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      passwordText.textContent = isHidden
        ? "hide password"
        : "show password";
    });
  });
}
