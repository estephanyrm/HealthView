const API_URL = `${HVAuth.API_URL}/hospitalizaciones`;
const $ = (id) => document.getElementById(id);
let registroEditado;
let controladorConsulta;

function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[caracter]);
}

async function llamarApi(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(opciones.headers || {}),
    },
  });
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error?.mensaje || "No se pudo completar la operación.");
  return datos;
}

function mostrarError(mensaje) {
  HVNotificar.error(mensaje);
}

async function consultar(evento) {
  evento?.preventDefault();
  controladorConsulta?.abort();
  controladorConsulta = new AbortController();
  const solicitud = controladorConsulta;
  $("aviso-registros").hidden = true;
  $("tabla-registros").innerHTML = '<tr><td colspan="8" class="tabla-vacia">Consultando…</td></tr>';
  const parametros = new URLSearchParams({ per_page: "10", page: "1" });
  const id = $("filtro-id").value.trim();
  const anio = $("filtro-anio").value;
  const sexo = $("filtro-sexo").value;
  const dx = $("filtro-dx").value.trim();
  if (id) parametros.set("id_hospitalizacion", id);
  if (anio) parametros.set("anio", anio);
  if (sexo) parametros.set("sexo", sexo);
  if (dx) parametros.set("id_dx_egreso", dx);

  try {
    const resultado = await llamarApi(`${API_URL}?${parametros}`, { signal: solicitud.signal });
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
  $("resultado-registros").textContent =
    `Mostrando ${filas.length} de ${Number(resultado.paginacion.total).toLocaleString("es-CO")} registros coincidentes (máximo 10 por consulta).`;
  $("tabla-registros").innerHTML = filas.length ? filas.map((fila) => `
    <tr>
      <td><strong>#${esc(fila.id_hospitalizacion)}</strong></td>
      <td>${esc(fila.numero_factura || "—")}</td>
      <td>${esc(fila.fecha_ingreso)}</td>
      <td>${esc(fila.edad_anios)} años · ${fila.sexo === "F" ? "Mujer" : "Hombre"}</td>
      <td>${esc(fila.id_dx_egreso)}</td>
      <td>${esc(fila.dias_estancia)} días</td>
      <td>${Number(fila.estado_salida) === 1 ? "Vivo" : "Fallecido"}</td>
      <td class="acciones-registro">
        <button type="button" data-accion="editar" data-id="${esc(fila.id_hospitalizacion)}">Modificar</button>
        <button type="button" data-accion="eliminar" data-id="${esc(fila.id_hospitalizacion)}">Eliminar</button>
      </td>
    </tr>`).join("") : '<tr><td colspan="8" class="tabla-vacia">No hay registros con esos filtros.</td></tr>';
}

async function abrirEdicion(id) {
  $("aviso-edicion").hidden = true;
  try {
    registroEditado = await llamarApi(`${API_URL}/${id}`);
    const form = $("form-editar-registro");
    Object.entries(registroEditado).forEach(([campo, valor]) => {
      const entrada = form.elements.namedItem(campo);
      if (entrada) entrada.value = valor ?? "";
    });
    $("titulo-edicion").textContent = `Modificar hospitalización #${id}`;
    $("modal-editar-registro").hidden = false;
  } catch (error) {
    mostrarError(error.message);
  }
}

async function eliminarRegistro(id) {
  const acepta = await HVNotificar.confirmar({
    titulo: "Eliminar hospitalización",
    texto: `¿Eliminar la hospitalización #${id}? Esta acción no se puede deshacer.`,
    confirmar: "Sí, eliminar",
    peligro: true,
  });
  if (!acepta) return;
  try {
    await llamarApi(`${API_URL}/${id}`, { method: "DELETE" });
    HVNotificar.toast("Hospitalización eliminada");
    await consultar();
  } catch (error) {
    mostrarError(error.message);
  }
}

async function guardarEdicion(evento) {
  evento.preventDefault();
  const form = $("form-editar-registro");
  const campos = [
    "numero_factura", "id_prestador", "id_eps", "id_municipio",
    "via_ingreso", "causa_externa", "tipo_usuario", "fecha_ingreso",
    "fecha_egreso", "estado_salida", "id_dx_ingreso", "id_dx_egreso",
    "sexo", "edad_valor", "unidad_edad", "zona_residencia",
  ];
  const datos = {};
  campos.forEach((campo) => {
    const valor = form.elements.namedItem(campo).value.trim();
    if (["numero_factura", "id_municipio"].includes(campo)) {
      datos[campo] = valor || null;
    } else if (["via_ingreso", "causa_externa", "tipo_usuario", "estado_salida", "edad_valor", "unidad_edad"].includes(campo)) {
      datos[campo] = Number(valor);
    } else {
      datos[campo] = valor;
    }
  });

  const boton = $("btn-guardar-edicion");
  boton.disabled = true;
  try {
    await llamarApi(`${API_URL}/${registroEditado.id_hospitalizacion}`, {
      method: "PATCH",
      body: JSON.stringify(datos),
    });
    $("modal-editar-registro").hidden = true;
    HVNotificar.toast("Registro actualizado");
    await consultar();
  } catch (error) {
    HVNotificar.error(error.message);
  } finally {
    boton.disabled = false;
  }
}

$("form-registros").addEventListener("submit", consultar);
$("btn-limpiar-registros").addEventListener("click", () => setTimeout(consultar, 0));
$("form-editar-registro").addEventListener("submit", guardarEdicion);
$("btn-cerrar-edicion").addEventListener("click", () => ($("modal-editar-registro").hidden = true));
$("btn-cancelar-edicion").addEventListener("click", () => ($("modal-editar-registro").hidden = true));
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
