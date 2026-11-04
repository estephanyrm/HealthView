// ==========================================================================
// HealthView - Creación de Usuario (crear-usuario.js)
// Conexión con Backend Flask (/api/usuarios) y persistencia local de respaldo
// ==========================================================================

const API_BASE = "/api/usuarios";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-crear-usuario");
  const modal = document.getElementById("modal-resultado");
  const tempPassSpan = document.getElementById("temp-pass-display");
  const copyBtn = document.getElementById("btn-copiar-clave");
  const alertError = document.getElementById("alerta-error");
  const btnSubmit = document.getElementById("btn-submit-crear");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (alertError) {
      alertError.style.display = "none";
      alertError.textContent = "";
    }

    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim().toLowerCase();
    const rol = document.getElementById("rol").value;

    if (!nombre) {
      mostrarError("Por favor ingresa el nombre completo.");
      return;
    }
    if (!correo || !correo.includes("@")) {
      mostrarError("Por favor ingresa un correo electrónico válido.");
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Creando...";
    }

    let claveGenerada = null;

    // 1. Intentar registrar en Backend Flask
    try {
      const respuesta = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nombre, correo, rol }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        const msg =
          datos.error?.mensaje ||
          "Error al registrar el usuario en el servidor.";
        mostrarError(msg);
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Crear usuario";
        }
        return;
      }

      claveGenerada = datos.contrasena_temporal;
    } catch (err) {
      // Si la API Python no está encendida en local, guardamos en el almacenamiento local de respaldo
      console.log(
        "Conexión con Flask no disponible, guardando usuario en almacenamiento local.",
      );
    }

    // 2. Si no hubo respuesta del backend o se está en modo local, generar y guardar localmente
    if (!claveGenerada) {
      const lista = obtenerUsuariosLocal();
      if (lista.some((u) => u.correo.toLowerCase() === correo)) {
        mostrarError(
          "Ya existe un usuario registrado con este correo electrónico.",
        );
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Crear usuario";
        }
        return;
      }

      claveGenerada =
        "HV-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "!";
      const nuevoId =
        lista.length > 0
          ? Math.max(...lista.map((u) => u.id_usuario || 0)) + 1
          : 1;

      lista.unshift({
        id_usuario: nuevoId,
        nombre: nombre,
        correo: correo,
        rol: rol,
        activo: true,
        ultimo_acceso: "Nunca",
      });

      localStorage.setItem("healthview_usuarios", JSON.stringify(lista));
    }

    // 3. Mostrar modal con la clave temporal generada
    if (tempPassSpan) tempPassSpan.textContent = claveGenerada;
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
          setTimeout(() => {
            copyBtn.textContent = "Copiar contraseña";
          }, 2000);
        });
      }
    });
  }
});
