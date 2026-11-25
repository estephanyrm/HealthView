const API_URL = HVAuth.API_URL;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const modulo = params.get("modulo") || "tendencias";
const usuario = HVAuth.usuario();
let grafica;
let solicitudComparador = 0;

const configuraciones = {
  tendencias: {
    titulo: "Tendencias hospitalarias",
    descripcion: "Explora la variación mensual de hospitalizaciones y compara temporadas entre los años registrados.",
    panel: "panel-tendencias",
  },
  comparador: {
    titulo: "Comparador de indicadores",
    descripcion: "Compara dos periodos con indicadores agregados directamente desde los registros hospitalarios.",
    panel: "panel-comparador",
  },
  prediccion: {
    titulo: "Predicción exploratoria",
    descripcion: "Consulta una extrapolación lineal transparente para explorar posibles cambios de volumen. No constituye una predicción clínica.",
    panel: "panel-prediccion",
  },
  configuracion: {
    titulo: "Configuración y accesos",
    descripcion: "Consulta tu perfil, revisa el alcance de tu rol y administra la seguridad de tu cuenta.",
    panel: "panel-configuracion",
  },
};

function mostrarError(mensaje) {
  HVNotificar.error(mensaje);
}

async function pedirDashboard(anio) {
  const respuesta = await fetch(`${API_URL}/dashboard?anio=${anio}`, {
    credentials: "include",
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.error?.mensaje || "No se pudieron cargar los indicadores.");
  }
  return datos;
}

function campoAnio(id, etiqueta, valor) {
  return `<label>${etiqueta}<select id="${id}">${[2019, 2020, 2021, 2022]
    .map((anio) => `<option value="${anio}" ${anio === valor ? "selected" : ""}>${anio}</option>`)
    .join("")}</select></label>`;
}

function prepararModulo() {
  const config = configuraciones[modulo] || configuraciones.tendencias;
  $("titulo-modulo").textContent = config.titulo;
  $("miga-modulo").textContent = config.titulo;
  $("descripcion-modulo").textContent = config.descripcion;
  $(config.panel).hidden = false;
  document.querySelector(`[data-modulo="${modulo}"]`)?.classList.add("activo");

  if (modulo === "comparador") {
    $("controles-modulo").innerHTML =
      campoAnio("periodo-a", "Periodo A", 2019) +
      campoAnio("periodo-b", "Periodo B", 2022);
    $("controles-modulo").addEventListener("change", compararPeriodos);
    compararPeriodos();
  } else if (modulo === "tendencias" || modulo === "prediccion") {
    cargarSeries();
  } else {
    mostrarPerfil();
  }
}

async function cargarSeries() {
  try {
    const datos = await pedirDashboard("todos");
    if (modulo === "tendencias") dibujarTendencias(datos.mensual);
    else dibujarPrediccion(datos.mensual);
  } catch (error) {
    mostrarError(error.message);
  }
}

function dibujarTendencias(series) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  grafica?.destroy();
  grafica = new Chart($("grafica-tendencias"), {
    type: "line",
    data: {
      labels: meses,
      datasets: series.map((item, index) => ({
        label: String(item.anio),
        data: item.meses,
        borderColor: ["#285c4d", "#d4a94b", "#6b8f82", "#7895ad"][index % 4],
        backgroundColor: "transparent",
        borderWidth: 2.5,
        tension: 0.28,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { position: "bottom" } },
    },
  });
}

async function compararPeriodos() {
  const solicitud = ++solicitudComparador;
  const anioA = $("periodo-a").value;
  const anioB = $("periodo-b").value;
  $("comparador-anio-a").textContent = anioA;
  $("comparador-anio-b").textContent = anioB;
  try {
    const [a, b] = await Promise.all([pedirDashboard(anioA), pedirDashboard(anioB)]);
    if (solicitud !== solicitudComparador) return;
    const metricas = [
      ["Hospitalizaciones", "hospitalizaciones", (v) => Number(v).toLocaleString("es-CO"), (v) => Number(v).toLocaleString("es-CO")],
      ["Estancia promedio", "estancia_promedio", (v) => `${Number(v).toFixed(2)} días`, (v) => `${Number(v).toFixed(2)} días`],
      ["Tasa de egreso", "tasa_egreso", (v) => `${Number(v).toFixed(2)} %`, (v) => `${Number(v).toFixed(2)} pp`],
      ["Mortalidad", "mortalidad", (v) => `${Number(v).toFixed(2)} %`, (v) => `${Number(v).toFixed(2)} pp`],
    ];
    $("tabla-comparador").innerHTML = metricas.map(([titulo, campo, formato, formatoDiferencia]) => {
      const valorA = a.indicadores[campo];
      const valorB = b.indicadores[campo];
      const diferencia = Number(valorB) - Number(valorA);
      return `<tr><th>${titulo}</th><td>${formato(valorA)}</td><td>${formato(valorB)}</td><td>${formatoDiferencia(diferencia)}</td></tr>`;
    }).join("");
    $("aviso-modulo").hidden = true;
  } catch (error) {
    if (solicitud !== solicitudComparador) return;
    mostrarError(error.message);
  }
}

function dibujarPrediccion(series) {
  const anuales = series.map((s) => ({
    anio: s.anio,
    total: s.meses.reduce((total, mes) => total + mes, 0),
  })).sort((a, b) => a.anio - b.anio);
  if (anuales.length < 2) {
    mostrarError("Se necesitan al menos dos años con datos para calcular una extrapolación.");
    return;
  }
  const cambios = anuales.slice(1).map((actual, i) => actual.total - anuales[i].total);
  const promedioCambio = cambios.reduce((suma, cambio) => suma + cambio, 0) / cambios.length;
  const proyeccion = Math.max(0, Math.round(anuales.at(-1).total + promedioCambio));
  $("nota-prediccion").textContent =
    `Extrapolación de referencia para ${anuales.at(-1).anio + 1}: ${proyeccion.toLocaleString("es-CO")} hospitalizaciones. Extiende la tendencia del último año disponible; no es un pronóstico actualizado, no incorpora estacionalidad ni factores externos y no debe usarse para decisiones clínicas.`;
  grafica?.destroy();
  grafica = new Chart($("grafica-prediccion"), {
    type: "bar",
    data: {
      labels: [...anuales.map((a) => String(a.anio)), `${anuales.at(-1).anio + 1} (estimación)`],
      datasets: [{
        label: "Hospitalizaciones",
        data: [...anuales.map((a) => a.total), proyeccion],
        backgroundColor: [...anuales.map(() => "#285c4d"), "#d4a94b"],
        borderRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
  });
}

function mostrarPerfil() {
  $("perfil-nombre").textContent = usuario?.nombre || "—";
  $("perfil-correo").textContent = usuario?.correo || "—";
  $("perfil-rol").textContent = usuario?.rol || "—";
  $("descripcion-permisos").textContent = usuario?.rol === "Administrador"
    ? "Tu rol permite administrar cuentas y registros, además de consultar los módulos de análisis."
    : "Tu rol permite consultar los módulos de análisis. La administración de usuarios y la modificación de registros se reservan al administrador.";
  $("enlace-usuarios").hidden = usuario?.rol !== "Administrador";
}

$("btn-salir").addEventListener("click", () => HVAuth.cerrarSesion());
if (usuario) {
  $("usuario-nombre").textContent = usuario.nombre;
  $("usuario-rol").textContent = usuario.rol;
  $("nav-admin").hidden = usuario.rol !== HVAuth.ROL_ADMIN;
  prepararModulo();
}
