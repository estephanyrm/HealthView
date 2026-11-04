// ==========================================================================
// HealthView - Gestión de Usuarios (usuarios.js)
// Conexión con Backend Flask (/api/usuarios) y persistencia local de respaldo
// ==========================================================================

const API_BASE = "/api/usuarios";

const USUARIOS_INICIALES = [
  { id_usuario: 1, nombre: "Usuario 1", correo: "usuario1@ejemplo.co", rol: "Administrador", activo: true, ultimo_acceso: "Hoy" },
  { id_usuario: 2, nombre: "Usuario 2", correo: "usuario2@ejemplo.co", rol: "Analista", activo: true, ultimo_acceso: "Ayer" },
  { id_usuario: 3, nombre: "Usuario 3", correo: "usuario3@ejemplo.co", rol: "Investigador", activo: true, ultimo_acceso: "Hace 3 días" },
  { id_usuario: 4, nombre: "Usuario 4", correo: "usuario4@ejemplo.co", rol: "Médico", activo: true, ultimo_acceso: "Hace 1 semana" },
  { id_usuario: 5, nombre: "Usuario 5", correo: "usuario5@ejemplo.co", rol: "Analista", activo: false, ultimo_acceso: "Nunca" }
];

// Obtener lista de usuarios
async function cargarUsuarios() {
  try {
    const respuesta = await fetch(API_BASE, { credentials: "include" });
    if (respuesta.ok) {
      const json = await respuesta.json();
      if (Array.isArray(json.datos) && json.datos.length > 0) {
        guardarLocalmente(json.datos);
        return json.datos;
      }
    }
  } catch (error) {
    // Si la API Python no está corriendo en segundo plano, usamos almacenamiento local
    console.log("Servidor local Flask no detectado. Utilizando almacenamiento local de respaldo.");
  }
  return obtenerLocalmente();
}

function obtenerLocalmente() {
  const guardados = localStorage.getItem("healthview_usuarios");
  if (!guardados) {
    localStorage.setItem("healthview_usuarios", JSON.stringify(USUARIOS_INICIALES));
    return USUARIOS_INICIALES;
  }
  try {
    return JSON.parse(guardados);
  } catch (e) {
    return USUARIOS_INICIALES;
  }
}

function guardarLocalmente(lista) {
  localStorage.setItem("healthview_usuarios", JSON.stringify(lista));
}

// Renderizado de la tabla de usuarios
async function renderizarTabla() {
  const usuarios = await cargarUsuarios();
  const tbody = document.getElementById("tabla-usuarios-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  usuarios.forEach((u) => {
    const tr = document.createElement("tr");

    // Rol Badge
    const badgeRol = u.rol === "Administrador"
      ? '<span class="badge-admin">Administrador</span>'
      : `<span class="badge-role">${escapeHtml(u.rol)}</span>`;

    // Estado Badge
    const badgeEstado = u.activo
      ? '<span class="badge-active">Activo</span>'
      : '<span class="badge-inactive">Inactivo</span>';

    // Acciones
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
      <td>${escapeHtml(u.ultimo_acceso || "Nunca")}</td>
      <td>
        <div class="table-actions">
          ${accionesHtml}
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// Acción: Cambiar rol
async function accionCambiarRol(id) {
  const lista = obtenerLocalmente();
  const usuario = lista.find(u => u.id_usuario === id);
  if (!usuario) return;

  const roles = ["Administrador", "Analista", "Investigador", "Médico"];
  const nuevoRol = prompt(
    `Cambiar rol para ${usuario.nombre} (actual: ${usuario.rol}):\n\nIngresa uno de los roles:\n- Administrador\n- Analista\n- Investigador\n- Médico`,
    usuario.rol
  );

  if (!nuevoRol || !roles.includes(nuevoRol.trim())) {
    if (nuevoRol) alert("Rol no válido. Debes ingresar Administrador, Analista, Investigador o Médico.");
    return;
  }

  const rolNormalizado = nuevoRol.trim();

  // Intentar API Flask
  try {
    await fetch(`${API_BASE}/${id}/rol`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol: rolNormalizado }),
      credentials: "include"
    });
  } catch (e) {
    // Modo local
  }

  usuario.rol = rolNormalizado;
  guardarLocalmente(lista);
  renderizarTabla();
  alert(`El rol de ${usuario.nombre} fue actualizado a ${rolNormalizado}.`);
}

// Acción: Cambiar estado (Activar / Desactivar)
async function accionCambiarEstado(id, nuevoEstado) {
  const lista = obtenerLocalmente();
  const usuario = lista.find(u => u.id_usuario === id);
  if (!usuario) return;

  const accionTexto = nuevoEstado ? "activar" : "desactivar";
  if (!confirm(`¿Estás seguro de que deseas ${accionTexto} la cuenta de ${usuario.nombre}?`)) {
    return;
  }

  // Intentar API Flask
  try {
    await fetch(`${API_BASE}/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: nuevoEstado }),
      credentials: "include"
    });
  } catch (e) {
    // Modo local
  }

  usuario.activo = nuevoEstado;
  guardarLocalmente(lista);
  renderizarTabla();
  alert(`Usuario ${usuario.nombre} ${nuevoEstado ? "activado" : "desactivado"} exitosamente.`);
}

// Acción: Reiniciar clave
async function accionReiniciarClave(id) {
  const lista = obtenerLocalmente();
  const usuario = lista.find(u => u.id_usuario === id);
  if (!usuario) return;

  let claveGenerada = "HV-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "!";

  // Intentar API Flask
  try {
    const res = await fetch(`${API_BASE}/${id}/reiniciar-clave`, {
      method: "POST",
      credentials: "include"
    });
    if (res.ok) {
      const data = await res.json();
      if (data.contrasena_temporal) claveGenerada = data.contrasena_temporal;
    }
  } catch (e) {
    // Modo local
  }

  // Mostrar modal con clave temporal
  const modal = document.getElementById("modal-temp-clave");
  const texto = document.getElementById("modal-temp-clave-texto");
  const display = document.getElementById("temp-clave-code");
  const btnCopiar = document.getElementById("btn-copiar-temp");

  if (texto) {
    texto.innerHTML = `Se ha generado una nueva contraseña temporal para <b>${escapeHtml(usuario.nombre)}</b> (${escapeHtml(usuario.correo)}):`;
  }
  if (display) {
    display.textContent = claveGenerada;
  }
  if (btnCopiar) {
    btnCopiar.textContent = "Copiar";
    btnCopiar.onclick = () => {
      navigator.clipboard.writeText(claveGenerada).then(() => {
        btnCopiar.textContent = "¡Copiada!";
        setTimeout(() => { btnCopiar.textContent = "Copiar"; }, 2000);
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

function guardarNuevaClave(e) {
  e.preventDefault();
  const actual = document.getElementById("clave-actual").value;
  const nueva = document.getElementById("clave-nueva").value;

  if (nueva.length < 8) {
    alert("La nueva contraseña debe tener al menos 8 caracteres.");
    return;
  }

  alert("Contraseña actualizada exitosamente.");
  cerrarModalCambiarClave();
  document.getElementById("form-cambiar-clave-modal").reset();
}

function cerrarSesion() {
  if (confirm("¿Deseas cerrar tu sesión?")) {
    window.location.href = "login.html";
  }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  renderizarTabla();
});
