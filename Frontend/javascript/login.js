// Muestra u oculta la contraseña mientras se escribe.
const passwordInput = document.getElementById("contrasena");
const passwordToggle = document.getElementById("mostrar-contrasena");

passwordToggle.addEventListener("click", () => {
  const isPasswordHidden = passwordInput.type === "password";
  passwordInput.type = isPasswordHidden ? "text" : "password";
  passwordToggle.textContent = isPasswordHidden ? "Ocultar" : "Mostrar";
  passwordToggle.setAttribute("aria-pressed", String(isPasswordHidden));
});
