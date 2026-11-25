const API_URL = "http://127.0.0.1:5000/api";

document.getElementById("btn-salir").addEventListener("click", () => {
  // HVAuth (auth.js) avisa a la API con el token, limpia la sesión y vuelve al login
  HVAuth.cerrarSesion();
});
