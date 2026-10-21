const API_URL = "http://127.0.0.1:5000/api";

// Mostrar / ocultar contraseña
const botonMostrar = document.getElementById("mostrar-contrasena");
const inputContrasena = document.getElementById("contrasena");
const icono = botonMostrar.querySelector("i");

botonMostrar.addEventListener("click", () => {
  if (inputContrasena.type === "password") {
    inputContrasena.type = "text";
    icono.classList.remove("fa-eye");
    icono.classList.add("fa-eye-slash");
  } else {
    inputContrasena.type = "password";
    icono.classList.remove("fa-eye-slash");
    icono.classList.add("fa-eye");
  }
});

// Envío del formulario a Flask
const setupFormLogin = () => {
  const form = document.querySelector("#formulario-login");
  const cajaError = document.querySelector("#mensaje-error");
  const botonSubmit = document.querySelector("#btn-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    // Ocultar errores previos
    cajaError.classList.add("d-none");
    cajaError.textContent = "";

    const correo = document.querySelector("#correo").value.trim();
    const contrasena = document.querySelector("#contrasena").value;

    try {
      botonSubmit.disabled = true;
      botonSubmit.textContent = "Verificando...";

      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Permite guardar la cookie de sesión de Flask
        body: JSON.stringify({ correo, contrasena }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        // Si Flask devuelve 400, 401 o 403, mostramos el mensaje que envía ApiError
        const mensaje = datos.error?.mensaje || "Error al iniciar sesión.";
        cajaError.textContent = mensaje;
        cajaError.classList.remove("d-none");
        return;
      }

      // Guardamos los datos básicos del usuario en sessionStorage para usarlos en la interfaz
      sessionStorage.setItem("usuario", JSON.stringify(datos.usuario));

      // Si el usuario debe cambiar su contraseña, lo redirigimos a la página de cambio de contraseña
      if (datos.usuario.debe_cambiar_clave) {
        window.location.href = "cambiar-clave.html";
        return;
      }

      // Si no debe cambiar clave, redirigimos según su rol o al panel principal
      if (datos.usuario.rol === "Administrador") {
        window.location.href = "usuarios.html"; 
      } else {
        window.location.href = "dashboard.html";
      }

    } catch (error) {
      cajaError.textContent = "No se pudo conectar con el servidor. Verifica que la API esté encendida.";
      cajaError.classList.remove("d-none");
    } finally {
      botonSubmit.disabled = false;
      botonSubmit.textContent = "Iniciar sesión";
    }
  });
};

setupFormLogin();