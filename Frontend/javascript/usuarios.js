// ==========================================================================
// HealthView - Gestión de Usuarios (usuarios.js)
// Página solo para Administrador (guarda en auth.js + validación en el backend).
// Todos los cambios se hacen contra la API; no hay datos locales de respaldo.
// ==========================================================================

const API_BASE = `${HVAuth.API_URL}/usuarios`;

// Llama a la API y devuelve el JSON; si falla, lanza un Error con el mensaje del servidor.
async function llamarApi(url, opciones = {}) {
  const cabeceras = { ...(opciones.body ? { "Content-Type": "application/json" } : {}) };
  let respuesta;
  try {
    respuesta = await fetch(url, { ...opciones, headers: cabeceras });
  } catch (e) {
    throw new Error("No se pudo conectar con el servidor. Verifica que la API esté encendida.");
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error?.mensaje || "No se pudo completar la operación.");
  }
  return datos;
}

function escapeHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function formatearAcceso(iso) {
  if (!iso) return "Nunca";
  const f = new Date(iso);
  return isNaN(f) ? "Nunca" : f.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

// Renderizado de la tabla de usuarios
async function renderizarTabla() {
  const tbody = document.getElementById("tabla-usuarios-body");
  if (!tbody) return;

  let usuarios;
  try {
    usuarios = (await llamarApi(API_BASE)).datos || [];
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(e.message)}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  usuarios.forEach((u) => {
    const tr = document.createElement("tr");

    const badgeRol =
      u.rol === "Administrador"
        ? '<span class="badge-admin">Administrador</span>'
        : `<span class="badge-role">${escapeHtml(u.rol)}</span>`;

    const badgeEstado = u.activo
      ? '<span class="badge-active">Activo</span>'
      : '<span class="badge-inactive">Inactivo</span>';

    let accionesHtml = "";
    if (u.rol !== "Administrador") {
      accionesHtml += `<button type="button" onclick="accionCambiarRol(${u.id_usuario})">Cambiar rol</button>`;
      accionesHtml += `<button type="button" onclick="accionCambiarEstado(${u.id_usuario}, ${!u.activo})">${u.activo ? "Desactivar" : "Activar"}</button>`;
    }
    accionesHtml += `<button type="button" onclick="accionReiniciarClave(${u.id_usuario})">Reiniciar clave</button>`;

    tr.innerHTML = `
      <td class="col-nombre">${escapeHtml(u.nombre)}</td>
      <td>${escapeHtml(u.correo)}</td>
      <td>${badgeRol}</td>
      <td>${badgeEstado}</td>
      <td>${escapeHtml(formatearAcceso(u.ultimo_acceso))}</td>
      <td><div class="table-actions">${accionesHtml}</div></td>
    `;
    tbody.appendChild(tr);
  });
  // Se guardan para que las acciones muestren el nombre sin volver a pedirlos
  window.__usuarios = usuarios;
}

function buscarUsuario(id) {
  return (window.__usuarios || []).find((u) => u.id_usuario === id);
}

// Acción: Cambiar rol
async function accionCambiarRol(id) {
  const usuario = buscarUsuario(id);
  if (!usuario) return;

  const roles = ["Administrador", "Analista", "Investigador", "Médico"];
  const nuevoRol = prompt(
    `Cambiar rol para ${usuario.nombre} (actual: ${usuario.rol}):\n\nIngresa uno de los roles:\n- Administrador\n- Analista\n- Investigador\n- Médico`,
    usuario.rol,
  );
  if (!nuevoRol) return;
  if (!roles.includes(nuevoRol.trim())) {
    alert("Rol no válido. Debes ingresar Administrador, Analista, Investigador o Médico.");
    return;
  }

  try {
    await llamarApi(`${API_BASE}/${id}/rol`, {
      method: "PATCH",
      body: JSON.stringify({ rol: nuevoRol.trim() }),
    });
    alert(`El rol de ${usuario.nombre} fue actualizado a ${nuevoRol.trim()}.`);
    renderizarTabla();
  } catch (e) {
    alert(e.message);
  }
}

// Acción: Cambiar estado (Activar / Desactivar)
async function accionCambiarEstado(id, nuevoEstado) {
  const usuario = buscarUsuario(id);
  if (!usuario) return;

  const accionTexto = nuevoEstado ? "activar" : "desactivar";
  if (!confirm(`¿Estás seguro de que deseas ${accionTexto} la cuenta de ${usuario.nombre}?`)) return;

  try {
    await llamarApi(`${API_BASE}/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ activo: nuevoEstado }),
    });
    alert(`Usuario ${usuario.nombre} ${nuevoEstado ? "activado" : "desactivado"} exitosamente.`);
    renderizarTabla();
  } catch (e) {
    alert(e.message);
  }
}

// Acción: Reiniciar clave (la contraseña temporal la genera SOLO el servidor)
async function accionReiniciarClave(id) {
  const usuario = buscarUsuario(id);
  if (!usuario) return;

  let claveGenerada;
  try {
    const data = await llamarApi(`${API_BASE}/${id}/reiniciar-clave`, { method: "POST" });
    claveGenerada = data.contrasena_temporal;
  } catch (e) {
    alert(e.message);
    return;
  }

  const modal = document.getElementById("modal-temp-clave");
  const texto = document.getElementById("modal-temp-clave-texto");
  const display = document.getElementById("temp-clave-code");
  const btnCopiar = document.getElementById("btn-copiar-temp");

  if (texto) {
    texto.innerHTML = `Se ha generado una nueva contraseña temporal para <b>${escapeHtml(usuario.nombre)}</b> (${escapeHtml(usuario.correo)}):`;
  }
  if (display) display.textContent = claveGenerada;
  if (btnCopiar) {
    btnCopiar.textContent = "Copiar";
    btnCopiar.onclick = () => {
      navigator.clipboard.writeText(claveGenerada).then(() => {
        btnCopiar.textContent = "¡Copiada!";
        setTimeout(() => (btnCopiar.textContent = "Copiar"), 2000);
      });
    };
  }

  if (modal) {
    modal.style.display = "flex";
  } else {
    alert(`Contraseña temporal para ${usuario.nombre}: ${claveGenerada}`);
  }
}

// Modal Cambiar Contraseña propia
function abrirModalCambiarClave() {
  const modal = document.getElementById("modal-cambiar-clave");
  if (modal) modal.style.display = "flex";
}

function cerrarModalCambiarClave() {
  const modal = document.getElementById("modal-cambiar-clave");
  if (modal) modal.style.display = "none";
}

async function guardarNuevaClave(e) {
  e.preventDefault();
  const actual = document.getElementById("clave-actual").value;
  const nueva = document.getElementById("clave-nueva").value;

  if (nueva.length < 8) {
    alert("La nueva contraseña debe tener al menos 8 caracteres.");
    return;
  }

  try {
    const data = await llamarApi(`${HVAuth.API_URL}/auth/cambiar-clave`, {
      method: "POST",
      body: JSON.stringify({ contrasena_actual: actual, contrasena_nueva: nueva }),
    });
    HVAuth.guardarSesion(data.token, data.usuario);
    alert("Contraseña actualizada exitosamente.");
    cerrarModalCambiarClave();
    document.getElementById("form-cambiar-clave-modal").reset();
  } catch (err) {
    alert(err.message);
  }
}

function cerrarSesion() {
  if (confirm("¿Deseas cerrar tu sesión?")) HVAuth.cerrarSesion();
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  const u = HVAuth.usuario();
  const etiqueta = document.getElementById("nombre-usuario-sesion");
  if (u && etiqueta) etiqueta.textContent = `${u.nombre} · ${u.rol}`;
  renderizarTabla();
});
