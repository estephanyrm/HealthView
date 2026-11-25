// ==========================================================================
// HealthView - Configuración (configuracion.js). Solo Administrador.
// Muestra la cuenta actual, permite cambiar la contraseña, comprueba el estado
// de la API/BD, resume los usuarios y presenta la matriz de permisos por rol.
// ==========================================================================
const API = HVAuth.API_URL;
const $ = (id) => document.getElementById(id);

const ROLES = ["Administrador", "Analista", "Investigador", "Médico"];
// Igual que la validación de la API (app/routes/*: roles_requeridos)
const MODULOS = [
  ["Panel inteligente", ROLES],
  ["Tendencias", ["Administrador", "Analista"]],
  ["Mapa epidemiológico", ["Administrador", "Analista", "Investigador"]],
  ["Alertas", ["Administrador", "Médico"]],
  ["Búsqueda y filtros", ["Administrador", "Analista"]],
  ["Reportes", ["Administrador", "Analista"]],
  ["Comparador y predicción", ["Administrador"]],
  ["Usuarios, registros y configuración", ["Administrador"]],
];

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fecha = (iso) => {
  const f = iso ? new Date(iso) : null;
  return f && !isNaN(f) ? f.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—";
};

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: opciones.body ? { "Content-Type": "application/json" } : {},
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.error?.mensaje || "No se pudo completar la operación.");
  return datos;
}

function estadoServicio(id, ok, texto) {
  $(id).innerHTML = `<span class="estado-punto ${ok ? "ok" : "mal"}"></span>${esc(texto)}`;
}

// ───────── Mi cuenta ─────────
function expiracionToken() {
  try {
    const carga = JSON.parse(atob(HVAuth.token().split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return carga.exp ? new Date(carga.exp * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

async function cargarCuenta() {
  let u = HVAuth.usuario();
  try {
    u = (await pedir("/auth/me")).usuario;
  } catch { /* se muestran los datos guardados en la sesión */ }
  $("cfg-nombre").textContent = u?.nombre || "—";
  $("cfg-correo").textContent = u?.correo || "—";
  $("cfg-rol").innerHTML = u?.rol ? HVRoles.html(u.rol) : "—";
  $("cfg-acceso").textContent = fecha(u?.ultimo_acceso);
  $("cfg-expira").textContent = fecha(expiracionToken());
}

// ───────── Estado del sistema ─────────
async function cargarSistema() {
  $("cfg-url").textContent = API;
  $("cfg-docs").href = API.replace(/\/api$/, "") + "/api/docs";
  const inicio = performance.now();
  try {
    const salud = await pedir("/health");
    $("cfg-latencia").textContent = `${Math.round(performance.now() - inicio)} ms`;
    estadoServicio("cfg-api", true, "En línea");
    estadoServicio("cfg-bd", salud.base_de_datos === "conectada", salud.base_de_datos || "Desconocido");
  } catch (error) {
    estadoServicio("cfg-api", false, "Sin conexión");
    estadoServicio("cfg-bd", false, "Sin comprobar");
    $("cfg-latencia").textContent = "—";
    return;
  }
  // El panel general queda en caché al arrancar la API, así que esta consulta suele ser instantánea
  $("cfg-registros").textContent = "Calculando…";
  try {
    const panel = await pedir("/dashboard?anio=todos");
    $("cfg-anios").textContent = panel.filtros.anios_disponibles.join(", ");
    $("cfg-registros").textContent = Number(panel.indicadores.hospitalizaciones).toLocaleString("es-CO");
  } catch {
    $("cfg-registros").textContent = "No disponible";
  }
}

// ───────── Usuarios ─────────
async function cargarUsuarios() {
  try {
    const { datos } = await pedir("/usuarios");
    const activos = datos.filter((u) => u.activo).length;
    const pendientes = datos.filter((u) => u.debe_cambiar_clave).length;
    const porRol = ROLES.map((rol) => [rol, datos.filter((u) => u.rol === rol).length]);
    $("cfg-usuarios").innerHTML = `
      <li><span>Total de cuentas</span><span>${datos.length}</span></li>
      <li><span>Activas / inactivas</span><span>${activos} / ${datos.length - activos}</span></li>
      <li><span>Con contraseña temporal pendiente</span><span>${pendientes}</span></li>
      ${porRol.map(([rol, n]) => `<li><span>${HVRoles.html(rol)}</span><span>${n}</span></li>`).join("")}`;
  } catch (error) {
    $("cfg-usuarios").innerHTML = `<li><span>${esc(error.message)}</span><span></span></li>`;
  }
}

// ───────── Permisos ─────────
function pintarPermisos() {
  $("permisos-cabecera").innerHTML =
    `<tr><th>Módulo</th>${ROLES.map((r) => `<th>${HVRoles.html(r)}</th>`).join("")}</tr>`;
  $("permisos-cuerpo").innerHTML = MODULOS.map(([modulo, roles]) => `
    <tr><td>${esc(modulo)}</td>${ROLES.map((r) =>
      roles.includes(r) ? '<td class="si" aria-label="Sí">✓</td>' : '<td class="no" aria-label="No">—</td>').join("")}</tr>`).join("");
}

// ───────── Cambiar contraseña ─────────
$("form-clave").addEventListener("submit", async (e) => {
  e.preventDefault();
  const actual = $("clave-actual").value;
  const nueva = $("clave-nueva").value;
  if (nueva !== $("clave-confirmar").value) {
    HVNotificar.aviso("La confirmación no coincide con la nueva contraseña.");
    return;
  }
  const boton = $("btn-guardar-clave");
  boton.disabled = true;
  try {
    const datos = await pedir("/auth/cambiar-clave", {
      method: "POST",
      body: JSON.stringify({ contrasena_actual: actual, contrasena_nueva: nueva, contrasena_confirmacion: nueva }),
    });
    HVAuth.guardarSesion(datos.token, datos.usuario); // el servidor entrega un token nuevo
    e.target.reset();
    HVNotificar.exito("Tu contraseña se actualizó correctamente.");
    cargarCuenta();
  } catch (error) {
    HVNotificar.error(error.message);
  } finally {
    boton.disabled = false;
  }
});

$("btn-actualizar").addEventListener("click", () => {
  cargarSistema();
  cargarUsuarios();
});
$("btn-salir").addEventListener("click", () => HVAuth.cerrarSesion());

const actual = HVAuth.usuario();
$("usuario-nombre").textContent = actual?.nombre || "Usuario";
$("usuario-rol").textContent = actual?.rol || "";
pintarPermisos();
cargarCuenta();
cargarSistema();
cargarUsuarios();
