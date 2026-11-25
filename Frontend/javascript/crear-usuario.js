// ==========================================================================
// HealthView - Creación de Usuario (crear-usuario.js)
// Página solo para Administrador. El usuario se crea únicamente en la API;
// la contraseña temporal la genera el servidor y se muestra una sola vez.
// ==========================================================================

const API_BASE = `${HVAuth.API_URL}/usuarios`;

document.addEventListener("DOMContentLoaded", () => {
  const usuarioActual = HVAuth.usuario();
  const nombreSesion = document.getElementById("nombre-usuario-sesion");
  if (nombreSesion && usuarioActual) {
    nombreSesion.textContent = `${usuarioActual.nombre} · ${usuarioActual.rol}`;
  }
  document.getElementById("btn-salir")?.addEventListener("click", () => {
    HVAuth.cerrarSesion();
  });

  const form = document.getElementById("form-crear-usuario");
  const modal = document.getElementById("modal-resultado");
  const tempPassSpan = document.getElementById("temp-pass-display");
  const copyBtn = document.getElementById("btn-copiar-clave");
  const alertError = document.getElementById("alerta-error");
  const btnSubmit = document.getElementById("btn-submit-crear");

  if (!form) return;

  function mostrarError(mensaje) {
    HVNotificar.error(mensaje, { titulo: "No se pudo crear el usuario" });
  }

  // Muestra la insignia del rol elegido y a qué módulos tiene acceso
  const selectRol = document.getElementById("rol");
  const descRol = document.getElementById("rol-descripcion");
  function mostrarDescripcionRol() {
    if (!selectRol || !descRol) return;
    const info = HVRoles.info[selectRol.value];
    descRol.innerHTML = `${HVRoles.html(selectRol.value)} ${info ? info.acceso : ""}`;
  }
  selectRol?.addEventListener("change", mostrarDescripcionRol);
  mostrarDescripcionRol();

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
    HVNotificar.toast("Usuario creado exitosamente");
    if (modal) modal.style.display = "flex";

    form.reset();
    document.getElementById("rol").value = "Administrador";

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Crear usuario";
    }
  });

  function mostrarError(mensaje) {
    if (alertError) {
      alertError.textContent = mensaje;
      alertError.style.display = "block";
    } else {
      alert(mensaje);
    }
  }

  function obtenerUsuariosLocal() {
    const raw = localStorage.getItem("healthview_usuarios");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  // Botón Copiar Contraseña
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
