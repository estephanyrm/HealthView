// Mapa epidemiológico: pide /api/mapa y pinta Antioquia por municipio de residencia.
const API_URL = "http://127.0.0.1:5000/api";

const num = (n) => Number(n).toLocaleString("es-CO");
const dec = (n, d = 1) =>
  Number(n).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const $ = (id) => document.getElementById(id);
const esc = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Escala de verdes (de base.css) y color para "sin datos"
const ESCALA = ["#e7f0e9", "#bcd5c7", "#8fb3a5", "#5f8f7e", "#285c4d"];
const SIN_DATOS = "#eef0ea";
const MIN_CASOS = 30; // con menos casos, estancia y mortalidad no son confiables

const METRICAS = {
  hospitalizaciones: { etq: "hospitalizaciones", fmt: (v) => num(v), min: 0 },
  estancia_promedio: { etq: "estancia promedio", fmt: (v) => `${dec(v)} días`, min: MIN_CASOS },
  mortalidad: { etq: "mortalidad", fmt: (v) => `${dec(v, 2)} %`, min: MIN_CASOS },
};

const estado = { anio: "todos", metrica: "hospitalizaciones", vista: "municipios",
  datos: null, porId: {}, a: "", b: "", turno: 0, cache: {} };

// ───────── Sesión ─────────
function iniciarSesionUI() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  if (!usuario) { window.location.href = "login.html"; return false; }
  $("usuario-nombre").textContent = usuario.nombre;
  $("usuario-rol").textContent = usuario.rol;
  $("nav-admin").hidden = usuario.rol !== "Administrador";
  return true;
}
$("btn-salir").addEventListener("click", async () => {
  try { await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }); }
  finally { HVAuth.limpiarSesion(); window.location.href = "login.html"; }
});

async function pedir(ruta) {
  const r = await fetch(`${API_URL}${ruta}`, { credentials: "include" });
  if (r.status === 401 || r.status === 403) {
    HVAuth.limpiarSesion();
    window.location.href = "login.html";
    throw new Error("sesion");
  }
  const datos = await r.json();
  if (!r.ok) throw new Error(datos.error?.mensaje || "No se pudieron cargar los datos.");
  return datos;
}

// ───────── Datos ─────────
async function cargar() {
  $("aviso-error").hidden = true;
  estado.cache = {};
  try {
    estado.datos = await pedir(`/mapa?anio=${estado.anio}`);
    estado.porId = Object.fromEntries(estado.datos.municipios.map((m) => [m.id_municipio, m]));
    llenarAnios(estado.datos.filtros.anios_disponibles);
    llenarMunicipios();
    pintar();
    comparar();
  } catch (e) {
    if (e.message === "sesion") return;
    $("aviso-error-texto").textContent =
      e instanceof TypeError ? "No se pudo conectar con el servidor. Verifica que la API esté encendida." : e.message;
    $("aviso-error").hidden = false;
  }
}

function llenarAnios(anios) {
  const s = $("filtro-anio");
  if (s.options.length === 1) { anios.forEach((a) => s.add(new Option(a, a))); s.value = estado.anio; }
}
function llenarMunicipios() {
  ["sel-a", "sel-b"].forEach((id) => {
    const s = $(id), previo = s.value;
    s.length = 1;
    [...estado.datos.municipios].sort((x, y) => x.nombre.localeCompare(y.nombre, "es"))
      .forEach((m) => s.add(new Option(m.nombre, m.id_municipio)));
    s.value = previo;
  });
}

// ───────── Pintar ─────────
const valorDe = (fila) => {
  const m = METRICAS[estado.metrica];
  return fila && fila.hospitalizaciones >= m.min ? fila[estado.metrica] : null;
};

function cortes(valores) {
  const v = valores.filter((x) => x !== null).sort((a, b) => a - b);
  if (!v.length) return [];
  return [0.2, 0.4, 0.6, 0.8].map((q) => v[Math.floor(q * (v.length - 1))]);
}
const claseDe = (valor, c) => (valor === null ? -1 : c.filter((x) => valor > x).length);

function pintar() {
  const m = METRICAS[estado.metrica];
  const enMunicipios = estado.vista === "municipios";
  $("rejilla-mapa").classList.toggle("solo-lista", !enMunicipios);

  const ant = estado.datos.municipios.filter((x) => x.cod_depto === "05");
  const fuera = estado.datos.municipios.filter((x) => x.cod_depto !== "05")
    .reduce((a, x) => a + x.hospitalizaciones, 0);
  const c = cortes(ant.map(valorDe));

  $("titulo-mapa").textContent = `Municipios de Antioquia · ${m.etq}`;
  $("sub-mapa").textContent = estado.metrica === "hospitalizaciones"
    ? "Por municipio de residencia del paciente. Los números dependen del tamaño de la población."
    : `Solo municipios con al menos ${MIN_CASOS} hospitalizaciones; el resto se muestra en gris.`;
  $("nota-fuera").textContent =
    `Residentes de otros departamentos: ${num(fuera)} · Sin municipio registrado: ${num(estado.datos.sin_municipio)}.`;

  // Mapa
  const svg = $("mapa");
  svg.setAttribute("viewBox", `0 0 ${MAPA_ANTIOQUIA.ancho} ${MAPA_ANTIOQUIA.alto}`);
  svg.innerHTML = MAPA_ANTIOQUIA.municipios.map((g) => {
    const fila = estado.porId[g.id], val = valorDe(fila);
    const k = claseDe(val, c);
    const nombre = fila?.nombre || g.nombre;
    return `<path class="muni" data-id="${g.id}" d="${g.d}" fill-rule="evenodd"
      fill="${k < 0 ? SIN_DATOS : ESCALA[k]}" tabindex="0" role="button"
      aria-label="${esc(nombre)}: ${fila ? num(fila.hospitalizaciones) + " hospitalizaciones" : "sin datos"}"></path>`;
  }).join("");
  marcarSeleccion();

  // Leyenda
  const lim = [0, ...c];
  $("leyenda").innerHTML = c.length
    ? ESCALA.map((col, i) => `<span><i style="background:${col}"></i>${
        i === 0 ? `hasta ${m.fmt(c[0])}` : i === 4 ? `más de ${m.fmt(c[3])}` : `${m.fmt(lim[i])} a ${m.fmt(c[i])}`}</span>`).join("")
      + `<span><i style="background:${SIN_DATOS}"></i>sin datos o pocos casos</span>`
    : "";

  pintarRanking();
}

function pintarRanking() {
  const m = METRICAS[estado.metrica];
  const enMunicipios = estado.vista === "municipios";
  const base = enMunicipios ? estado.datos.municipios : estado.datos.departamentos;
  const lista = base.map((f) => ({ f, v: valorDe(f) })).filter((x) => x.v !== null)
    .sort((a, b) => b.v - a.v).slice(0, enMunicipios ? 10 : 40);

  $("titulo-ranking").textContent = enMunicipios
    ? `Los 10 municipios con más ${m.etq}` : `Departamentos por ${m.etq}`;
  $("sub-ranking").textContent = enMunicipios ? "Haz clic en uno para compararlo." : "Según el departamento de residencia.";

  const max = lista[0]?.v || 1;
  $("lista-ranking").innerHTML = lista.length ? lista.map(({ f, v }, i) => `
    <li ${enMunicipios ? `class="clic" data-id="${f.id_municipio}" tabindex="0"` : ""}>
      <div class="dx-fila">
        <span class="dx-nombre"><b>${i + 1}</b>${esc(f.nombre)}${enMunicipios ? "" : ""}</span>
        <span class="dx-cifra"><b>${m.fmt(v)}</b> · ${num(f.hospitalizaciones)} casos</span>
        <span class="dx-barra"><span style="width:${((100 * v) / max).toFixed(1)}%"></span></span>
      </div></li>`).join("") : '<li class="vacio">Sin datos para este periodo.</li>';
}

// ───────── Interacción con el mapa ─────────
const tip = $("tip");
$("mapa").addEventListener("mousemove", (e) => {
  const p = e.target.closest(".muni");
  if (!p) { tip.hidden = true; return; }
  const fila = estado.porId[p.dataset.id];
  const g = MAPA_ANTIOQUIA.municipios.find((x) => x.id === p.dataset.id);
  tip.innerHTML = fila
    ? `<b>${esc(fila.nombre)}</b>${num(fila.hospitalizaciones)} hospitalizaciones<br>Estancia ${dec(fila.estancia_promedio)} días · Mortalidad ${dec(fila.mortalidad, 2)} %`
    : `<b>${esc(g.nombre)}</b>Sin hospitalizaciones registradas`;
  const caja = $("mapa").parentElement.getBoundingClientRect();
  tip.hidden = false;
  tip.style.left = `${Math.min(e.clientX - caja.left + 12, caja.width - tip.offsetWidth - 4)}px`;
  tip.style.top = `${e.clientY - caja.top + 14}px`;
});
$("mapa").addEventListener("mouseleave", () => (tip.hidden = true));
$("mapa").addEventListener("click", (e) => { const p = e.target.closest(".muni"); if (p) elegir(p.dataset.id); });
$("mapa").addEventListener("keydown", (e) => {
  const p = e.target.closest(".muni");
  if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); elegir(p.dataset.id); }
});
$("lista-ranking").addEventListener("click", (e) => { const li = e.target.closest("li[data-id]"); if (li) elegir(li.dataset.id); });
$("lista-ranking").addEventListener("keydown", (e) => {
  const li = e.target.closest("li[data-id]");
  if (li && e.key === "Enter") elegir(li.dataset.id);
});

// Cada clic llena un lado de la comparación, alternando A y B
function elegir(id) {
  if (!estado.porId[id]) return;
  const lado = estado.turno++ % 2 === 0 ? "a" : "b";
  estado[lado] = id;
  $(`sel-${lado}`).value = id;
  marcarSeleccion();
  comparar();
  $("titulo-comparar").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function marcarSeleccion() {
  document.querySelectorAll(".muni").forEach((p) => {
    p.classList.toggle("sel-a", p.dataset.id === estado.a);
    p.classList.toggle("sel-b", p.dataset.id === estado.b);
  });
}
$("sel-a").addEventListener("change", (e) => { estado.a = e.target.value; marcarSeleccion(); comparar(); });
$("sel-b").addEventListener("change", (e) => { estado.b = e.target.value; marcarSeleccion(); comparar(); });

// ───────── Comparación ─────────
async function detalle(id) {
  if (!estado.cache[id]) estado.cache[id] = await pedir(`/mapa/${id}?anio=${estado.anio}`);
  return estado.cache[id];
}

async function comparar() {
  const caja = $("comparacion");
  if (!estado.a || !estado.b) { caja.innerHTML = '<p class="vacio">Elige dos municipios para compararlos.</p>'; return; }
  try {
    const [A, B] = await Promise.all([detalle(estado.a), detalle(estado.b)]);
    const fila = (etq, f) => `<tr><th scope="row">${etq}</th><td class="num">${f(A)}</td><td class="num">${f(B)}</td></tr>`;
    const dx = (r) => `<ol>${r.diagnosticos.map((d) =>
      `<li><b>${esc(d.codigo)}</b> ${esc(d.descripcion || "")} (${num(d.casos)})</li>`).join("") || "<li>Sin datos</li>"}</ol>`;
    caja.innerHTML = `<table>
      <thead><tr><th></th><th>${esc(A.nombre)}</th><th>${esc(B.nombre)}</th></tr></thead><tbody>
      ${fila("Hospitalizaciones", (r) => num(r.indicadores.hospitalizaciones))}
      ${fila("Estancia promedio", (r) => `${dec(r.indicadores.estancia_promedio)} días`)}
      ${fila("Tasa de egreso", (r) => `${dec(r.indicadores.tasa_egreso)} %`)}
      ${fila("Mortalidad", (r) => `${dec(r.indicadores.mortalidad, 2)} %`)}
      <tr><th scope="row">Diagnósticos más frecuentes</th><td>${dx(A)}</td><td>${dx(B)}</td></tr>
      </tbody></table>`;
  } catch (e) {
    if (e.message !== "sesion") caja.innerHTML = `<p class="vacio">${esc(e.message)}</p>`;
  }
}

// ───────── Controles ─────────
$("filtro-anio").addEventListener("change", (e) => { estado.anio = e.target.value; cargar(); });
$("filtro-metrica").addEventListener("change", (e) => { estado.metrica = e.target.value; pintar(); });
document.querySelectorAll(".selector button").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".selector button").forEach((x) => x.classList.toggle("activo", x === b));
    estado.vista = b.dataset.vista;
    pintar();
  }));
$("btn-reintentar").addEventListener("click", cargar);

if (iniciarSesionUI()) { comparar(); cargar(); }
