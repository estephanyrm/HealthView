// ==========================================================================
// HealthView - Registros de hospitalización (registros.js)
// CRUD completo contra /api/hospitalizaciones (solo Administrador):
//   Consultar (GET) · Crear (POST) · Modificar (PATCH) · Eliminar (DELETE)
// ==========================================================================
const API = HVAuth.API_URL;
const API_REG = `${API}/hospitalizaciones`;
const $ = (id) => document.getElementById(id);

const estado = { pagina: 1, paginas: 0, modo: "crear", idEditado: null };
let controladorConsulta;

const CAMPOS_TEXTO_OPCIONALES = ["numero_factura", "id_municipio", "hora_ingreso"];
const CAMPOS_NUMERICOS = ["via_ingreso", "causa_externa", "tipo_usuario", "estado_salida", "edad_valor", "unidad_edad"];
const CAMPOS = [
  "numero_factura", "id_prestador", "id_eps", "id_municipio",
  "via_ingreso", "causa_externa", "tipo_usuario", "fecha_ingreso", "hora_ingreso",
  "fecha_egreso", "estado_salida", "id_dx_ingreso", "id_dx_egreso",
  "sexo", "edad_valor", "unidad_edad", "zona_residencia",
];

function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

async function llamarApi(url, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, {
      ...opciones,
      headers: { ...(opciones.body ? { "Content-Type": "application/json" } : {}), ...(opciones.headers || {}) },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("No se pudo conectar con el servidor. Verifica que la API esté encendida.");
  }
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const detalle = datos.error?.detalles?.campos ? ` (${datos.error.detalles.campos.join(", ")})` : "";
    throw new Error((datos.error?.mensaje || "No se pudo completar la operación.") + detalle);
  }
  return datos;
}

function mostrarError(mensaje) {
  $("aviso-registros").textContent = mensaje;
  $("aviso-registros").hidden = false;
}

// ───────── Consulta ─────────
async function consultar(evento, pagina = 1) {
  evento?.preventDefault();
  controladorConsulta?.abort();
  controladorConsulta = new AbortController();
  const solicitud = controladorConsulta;
  estado.pagina = pagina;
  $("aviso-registros").hidden = true;
  $("tabla-registros").innerHTML = '<tr><td colspan="8" class="tabla-vacia">Consultando…</td></tr>';

  const parametros = new URLSearchParams({ per_page: "10", page: String(pagina) });
  const filtros = {
    id_hospitalizacion: $("filtro-id").value.trim(),
    anio: $("filtro-anio").value,
    sexo: $("filtro-sexo").value,
    id_dx_egreso: $("filtro-dx").value.trim(),
  };
  Object.entries(filtros).forEach(([k, v]) => v && parametros.set(k, v));

  try {
    const resultado = await llamarApi(`${API_REG}?${parametros}`, { signal: solicitud.signal });
    if (controladorConsulta !== solicitud) return;
    pintarRegistros(resultado);
  } catch (error) {
    if (error.name === "AbortError" || controladorConsulta !== solicitud) return;
    $("tabla-registros").innerHTML = '<tr><td colspan="8" class="tabla-vacia">No se pudo completar la consulta.</td></tr>';
    mostrarError(error.message);
  }
}

function pintarRegistros(resultado) {
  const filas = resultado.datos || [];
  const { total, pagina, paginas } = resultado.paginacion;
  estado.paginas = paginas;
  $("resultado-registros").textContent =
    `${Number(total).toLocaleString("es-CO")} registros coinciden. Se muestran 10 por página.`;
  $("info-pagina").textContent = paginas ? `Página ${pagina} de ${paginas.toLocaleString("es-CO")}` : "";
  $("btn-pag-ant").disabled = pagina <= 1;
  $("btn-pag-sig").disabled = pagina >= paginas;

  $("tabla-registros").innerHTML = filas.length ? filas.map((f) => `
    <tr>
      <td><strong>#${esc(f.id_hospitalizacion)}</strong></td>
      <td>${esc(f.numero_factura || "—")}</td>
      <td>${esc(f.fecha_ingreso)}</td>
      <td>${esc(f.edad_anios)} años · ${f.sexo === "F" ? "Mujer" : "Hombre"}</td>
      <td>${esc(f.id_dx_egreso)}</td>
      <td>${esc(f.dias_estancia)} días</td>
      <td>${Number(f.estado_salida) === 1 ? "Vivo" : "Fallecido"}</td>
      <td class="acciones-registro">
        <button type="button" data-accion="editar" data-id="${esc(f.id_hospitalizacion)}">Modificar</button>
        <button type="button" data-accion="eliminar" data-id="${esc(f.id_hospitalizacion)}">Eliminar</button>
      </td>
    </tr>`).join("") : '<tr><td colspan="8" class="tabla-vacia">No hay registros con esos filtros.</td></tr>';
}

// ───────── Catálogos del formulario ─────────
async function cargarCatalogos() {
  const selects = [
    ["vias-ingreso", "via_ingreso", "id_via"],
    ["causas-externas", "causa_externa", "id_causa"],
    ["tipos-usuario", "tipo_usuario", "id_tipo_usuario"],
  ];
  const listas = [
    ["prestadores", "lista-prestadores", "id_prestador"],
    ["eps", "lista-eps", "id_eps"],
    ["municipios", "lista-municipios", "id_municipio"],
  ];
  const form = $("form-editar-registro");
  await Promise.all([
    ...selects.map(async ([cat, campo, id]) => {
      const select = form.elements.namedItem(campo);
      try {
        const { datos } = await llamarApi(`${API}/catalogos/${cat}`);
        datos.sort((a, b) => a[id] - b[id])
          .forEach((d) => select.add(new Option(`${d[id]} · ${d.nombre}`, d[id])));
      } catch {
        // Sin catálogo se permite escribir el código numérico
        const input = Object.assign(document.createElement("input"), { name: campo, type: "number", min: 0, required: true });
        select.replaceWith(input);
      }
    }),
    ...listas.map(async ([cat, listaId, id]) => {
      try {
        const { datos } = await llamarApi(`${API}/catalogos/${cat}`);
        $(listaId).innerHTML = datos.map((d) => `<option value="${esc(d[id])}">${esc(d.etiqueta || d.nombre)}</option>`).join("");
      } catch { /* la lista de sugerencias es opcional */ }
    }),
  ]);
}

// Sugerencias de diagnósticos CIE-10 mientras se escribe (el catálogo es grande)
let temporizadorDx;
function sugerirDiagnosticos(evento) {
  const texto = evento.target.value.trim();
  clearTimeout(temporizadorDx);
  if (texto.length < 3) return;
  temporizadorDx = setTimeout(async () => {
    try {
      const { datos } = await llamarApi(`${API}/catalogos/diagnosticos?q=${encodeURIComponent(texto)}`);
      $("lista-dx").innerHTML = datos.slice(0, 30)
        .map((d) => `<option value="${esc(d.codigo)}">${esc(d.descripcion || d.codigo)}</option>`).join("");
    } catch { /* opcional */ }
  }, 300);
}

// ───────── Crear / modificar ─────────
function abrirModal(modo, registro = null) {
  const form = $("form-editar-registro");
  form.reset();
  estado.modo = modo;
  estado.idEditado = registro?.id_hospitalizacion ?? null;
  $("aviso-edicion").hidden = true;

  if (registro) {
    CAMPOS.forEach((campo) => {
      const entrada = form.elements.namedItem(campo);
      let valor = registro[campo] ?? "";
      if (campo === "hora_ingreso" && valor) valor = String(valor).slice(0, 5);
      if (entrada) entrada.value = valor;
    });
  }
  $("etiqueta-edicion").textContent = modo === "crear" ? "Nuevo registro" : "Edición controlada";
  $("titulo-edicion").textContent = modo === "crear"
    ? "Registrar hospitalización"
    : `Modificar hospitalización #${estado.idEditado}`;
  $("btn-guardar-edicion").textContent = modo === "crear" ? "Registrar hospitalización" : "Guardar cambios";
  $("modal-editar-registro").hidden = false;
  form.elements.namedItem(modo === "crear" ? "numero_factura" : "id_prestador")?.focus();
}

function cerrarModal() {
  $("modal-editar-registro").hidden = true;
}

async function abrirEdicion(id) {
  try {
    abrirModal("editar", await llamarApi(`${API_REG}/${id}`));
  } catch (error) {
    mostrarError(error.message);
  }
}

function leerFormulario() {
  const form = $("form-editar-registro");
  const datos = {};
  CAMPOS.forEach((campo) => {
    const valor = String(form.elements.namedItem(campo).value).trim();
    if (CAMPOS_TEXTO_OPCIONALES.includes(campo)) datos[campo] = valor || null;
    else if (CAMPOS_NUMERICOS.includes(campo)) datos[campo] = Number(valor);
    else if (["id_dx_ingreso", "id_dx_egreso"].includes(campo)) datos[campo] = valor.toUpperCase();
    else datos[campo] = valor;
  });
  return datos;
}

async function guardar(evento) {
  evento.preventDefault();
  const datos = leerFormulario();
  if (datos.fecha_egreso < datos.fecha_ingreso) {
    $("aviso-edicion").textContent = "La fecha de egreso no puede ser anterior a la de ingreso.";
    $("aviso-edicion").hidden = false;
    return;
  }

  const boton = $("btn-guardar-edicion");
  boton.disabled = true;
  try {
    const creando = estado.modo === "crear";
    const guardado = await llamarApi(creando ? API_REG : `${API_REG}/${estado.idEditado}`, {
      method: creando ? "POST" : "PATCH",
      body: JSON.stringify(datos),
    });
    cerrarModal();
    HVNotificar.exito(
      creando
        ? `Se registró la hospitalización #${guardado.id_hospitalizacion} (${guardado.dias_estancia} días de estancia).`
        : `Se guardaron los cambios de la hospitalización #${guardado.id_hospitalizacion}.`,
    );
    if (creando) $("filtro-id").value = guardado.id_hospitalizacion;
    await consultar(null, creando ? 1 : estado.pagina);
  } catch (error) {
    $("aviso-edicion").textContent = error.message;
    $("aviso-edicion").hidden = false;
  } finally {
    boton.disabled = false;
  }
}

// ───────── Eliminar ─────────
async function eliminarRegistro(id) {
  const acepta = await HVNotificar.confirmar({
    titulo: `¿Eliminar la hospitalización #${id}?`,
    texto: "Se borrará el registro y sus diagnósticos asociados. Esta acción no se puede deshacer.",
    confirmar: "Sí, eliminar",
    peligro: true,
  });
  if (!acepta) return;
  try {
    await llamarApi(`${API_REG}/${id}`, { method: "DELETE" });
    HVNotificar.toast(`Hospitalización #${id} eliminada.`);
    await consultar(null, estado.pagina);
  } catch (error) {
    mostrarError(error.message);
  }
}

// ───────── Eventos ─────────
$("form-registros").addEventListener("submit", (e) => consultar(e, 1));
$("btn-limpiar-registros").addEventListener("click", () => setTimeout(() => consultar(null, 1), 0));
$("btn-pag-ant").addEventListener("click", () => consultar(null, estado.pagina - 1));
$("btn-pag-sig").addEventListener("click", () => consultar(null, estado.pagina + 1));
$("btn-nuevo-registro").addEventListener("click", () => abrirModal("crear"));
$("form-editar-registro").addEventListener("submit", guardar);
$("btn-cerrar-edicion").addEventListener("click", cerrarModal);
$("btn-cancelar-edicion").addEventListener("click", cerrarModal);
$("modal-editar-registro").addEventListener("click", (e) => e.target === e.currentTarget && cerrarModal());
document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarModal());
["id_dx_ingreso", "id_dx_egreso"].forEach((campo) =>
  $("form-editar-registro").elements.namedItem(campo).addEventListener("input", sugerirDiagnosticos));
$("tabla-registros").addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;
  if (boton.dataset.accion === "editar") abrirEdicion(boton.dataset.id);
  if (boton.dataset.accion === "eliminar") eliminarRegistro(boton.dataset.id);
});
$("btn-salir").addEventListener("click", () => HVAuth.cerrarSesion());

const usuario = HVAuth.usuario();
$("usuario-nombre").textContent = usuario?.nombre || "Usuario";
$("usuario-rol").textContent = usuario?.rol || "";
cargarCatalogos();
