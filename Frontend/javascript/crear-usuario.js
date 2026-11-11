// ==========================================================================
// HealthView - Creación de Usuario (crear-usuario.js)
// Página solo para Administrador. El usuario se crea únicamente en la API;
// la contraseña temporal la genera el servidor y se muestra una sola vez.
// ==========================================================================

const API_BASE = `${HVAuth.API_URL}/usuarios`;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-crear-usuario");
  const modal = document.getElementById("modal-resultado");
  const tempPassSpan = document.getElementById("temp-pass-display");
  const copyBtn = document.getElementById("btn-copiar-clave");
  const alertError = document.getElementById("alerta-error");
  const btnSubmit = document.getElementById("btn-submit-crear");

  if (!form) return;

  function mostrarError(mensaje) {
    if (alertError) {
      alertError.textContent = mensaje;
      alertError.style.display = "block";
    } else {
      alert(mensaje);
    }
  }

  function restaurarBoton() {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Crear usuario";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (alertError) {
      alertError.style.display = "none";
      alertError.textContent = "";
    }

    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim().toLowerCase();
    const rol = document.getElementById("rol").value;

    if (!nombre) return mostrarError("Por favor ingresa el nombre completo.");
    if (!correo || !correo.includes("@")) {
      return mostrarError("Por favor ingresa un correo electrónico válido.");
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Creando...";
    }

    let datos;
    try {
      const respuesta = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, rol }),
      });
      datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        mostrarError(datos.error?.mensaje || "Error al registrar el usuario en el servidor.");
        restaurarBoton();
        return;
      }
    } catch (err) {
      mostrarError("No se pudo conectar con el servidor. Verifica que la API esté encendida.");
      restaurarBoton();
      return;
    }

    if (tempPassSpan) tempPassSpan.textContent = datos.contrasena_temporal;
    if (modal) modal.style.display = "flex";

    form.reset();
    document.getElementById("rol").value = "Administrador";
    restaurarBoton();
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const pass = tempPassSpan ? tempPassSpan.textContent : "";
      if (pass) {
        navigator.clipboard.writeText(pass).then(() => {
          copyBtn.textContent = "¡Copiada!";
          setTimeout(() => (copyBtn.textContent = "Copiar contraseña"), 2000);
        });
      }
    });
  }
});
