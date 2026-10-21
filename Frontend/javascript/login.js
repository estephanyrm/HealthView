const botonMostrar = document.getElementById("mostrar-contrasena");
const inputContrasena = document.getElementById("contrasena");
const icono = botonMostrar.querySelector("i");

botonMostrar.addEventListener("click", () => {
  if (inputContrasena.type === "password") {
    inputContrasena.type = "text";
    icono.classList.remove("fa-eye");
    icono.classList.add("fa-eye-slash"); // Muestra el ojo tachado cuando está visible
  } else {
    inputContrasena.type = "password";
    icono.classList.remove("fa-eye-slash");
    icono.classList.add("fa-eye"); // Muestra el ojo normal cuando está oculto
  }
});

const setupFormRegister = () => {
  const form = document.querySelector("#formulario-login");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.querySelector("#correo").value;
    const password = document.querySelector("#contrasena").value;

    console.log(password);
  });
};
setupFormRegister();
