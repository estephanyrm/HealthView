// ==========================================================================
// HealthView - Cambio de contraseña (cambiar-clave.js)
// Se muestra tras iniciar sesión con una contraseña temporal.
// ==========================================================================
const form = document.getElementById("formulario-clave");
const cajaError = document.getElementById("mensaje-error");
const botonSubmit = document.getElementById("btn-submit");

function mostrarError(mensaje) {
  cajaError.textContent = mensaje;
  cajaError.classList.remove("d-none");
}

document.getElementById("btn-cancelar").addEventListener("click", () => HVAuth.cerrarSesion());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  cajaError.classList.add("d-none");

  const actual = document.getElementById("clave-actual").value;
  const nueva = document.getElementById("clave-nueva").value;
  const confirmar = document.getElementById("clave-confirmar").value;

  if (nueva.length < 8) return mostrarError("La nueva contraseña debe tener al menos 8 caracteres.");
  if (nueva !== confirmar) return mostrarError("La confirmación no coincide con la nueva contraseña.");

  try {
    botonSubmit.disabled = true;
    botonSubmit.textContent = "Guardando...";

    const respuesta = await fetch(`${HVAuth.API_URL}/auth/cambiar-clave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contrasena_actual: actual, contrasena_nueva: nueva }),
    });
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      return mostrarError(datos.error?.mensaje || "No se pudo cambiar la contraseña.");
    }

    // El servidor devuelve un token nuevo, ya sin la marca de contraseña temporal
    HVAuth.guardarSesion(datos.token, datos.usuario);
    window.location.href = datos.usuario.rol === "Administrador" ? "usuarios.html" : "dashboard.html";
  } catch (err) {
    mostrarError("No se pudo conectar con el servidor. Verifica que la API esté encendida.");
  } finally {
    botonSubmit.disabled = false;
    botonSubmit.textContent = "Guardar contraseña";
  }
});
