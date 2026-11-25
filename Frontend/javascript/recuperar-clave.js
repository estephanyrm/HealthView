const API_URL = "http://127.0.0.1:5000/api";
const parametros = new URLSearchParams(window.location.search);
const token = parametros.get("token");
const formularioSolicitud = document.getElementById("formulario-solicitud");
const formularioRestablecimiento = document.getElementById(
  "formulario-restablecimiento",
);
const mensaje = document.getElementById("mensaje-recuperacion");

const mostrarMensaje = (texto, tipo) => {
  if (tipo === "success") HVNotificar.exito(texto);
  else HVNotificar.error(texto);
};

if (token) {
  formularioSolicitud.classList.add("d-none");
  formularioRestablecimiento.classList.remove("d-none");
}

formularioSolicitud.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = formularioSolicitud.querySelector("button[type='submit']");
  boton.disabled = true;
  boton.textContent = "Enviando...";

  try {
    const respuesta = await fetch(`${API_URL}/auth/solicitar-recuperacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: document.getElementById("correo-recuperacion").value.trim(),
      }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(
        datos.error?.mensaje || "No se pudo procesar la solicitud.",
      );
    }
    mostrarMensaje(datos.mensaje, "success");
  } catch (error) {
    mostrarMensaje(
      error.message || "No se pudo conectar con el servidor.",
      "danger",
    );
  } finally {
    boton.disabled = false;
    boton.textContent = "Enviar enlace";
  }
});

formularioRestablecimiento.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = formularioRestablecimiento.querySelector(
    "button[type='submit']",
  );
  const nueva = document.getElementById("contrasena-nueva").value;
  const confirmar = document.getElementById("confirmar-contrasena").value;
  if (nueva !== confirmar) {
    mostrarMensaje("Las contraseñas no coinciden.", "danger");
    return;
  }

  boton.disabled = true;
  boton.textContent = "Guardando...";
  try {
    const respuesta = await fetch(`${API_URL}/auth/restablecer-clave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, contrasena_nueva: nueva }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(
        datos.error?.mensaje || "No se pudo cambiar la contraseña.",
      );
    }
    formularioRestablecimiento.classList.add("d-none");
    mostrarMensaje(`${datos.mensaje} Ya puedes iniciar sesión.`, "success");
  } catch (error) {
    mostrarMensaje(
      error.message || "No se pudo conectar con el servidor.",
      "danger",
    );
  } finally {
    boton.disabled = false;
    boton.textContent = "Guardar contraseña";
  }
});
