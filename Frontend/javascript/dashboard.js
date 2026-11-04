// Panel inteligente: pide /api/dashboard y dibuja indicadores y gráficas.
const API_URL = "http://127.0.0.1:5000/api";

// Paleta (coincide con base.css)
const VERDE = "#285c4d";
const VERDE_CLARO = "#8fb3a5";
const DORADO = "#d4a94b";
const GRIS = "#52665f";
const LINEA = "#e3e8e2";
const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const num = (n) => Number(n).toLocaleString("es-CO");
const dec = (n, d = 1) =>
  Number(n).toLocaleString("es-CO", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const $ = (id) => document.getElementById(id);

const estado = { anio: "todos", dx: "egreso", municipio: "", eps: "", graficas: {} };

Chart.defaults.font.family = '"Segoe UI", sans-serif';
Chart.defaults.color = GRIS;

// ───────── Sesión ─────────
function iniciarSesionUI() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  if (!usuario) {
    window.location.href = "login.html";
    return false;
  }
  $("usuario-nombre").textContent = usuario.nombre;
  $("usuario-rol").textContent = usuario.rol;
  $("nav-admin").hidden = usuario.rol !== "Administrador";
  return true;
}

$("btn-salir").addEventListener("click", async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    sessionStorage.removeItem("usuario");
    window.location.href = "login.html";
  }
});

// ───────── Datos ─────────
async function cargar() {
  document.body.classList.add("cargando");
  $("aviso-error").hidden = true;
  try {
    const params = new URLSearchParams({ anio: estado.anio, dx: estado.dx });
    if (estado.municipio) params.set("municipio", estado.municipio);
    if (estado.eps) params.set("eps", estado.eps);
    const r = await fetch(`${API_URL}/dashboard?${params}`, {
      credentials: "include",
    });
    if (r.status === 401 || r.status === 403) {
      sessionStorage.removeItem("usuario");
      window.location.href = "login.html";
      return;
    }
    const datos = await r.json();
    if (!r.ok)
      throw new Error(
        datos.error?.mensaje || "No se pudieron cargar los datos.",
      );
    pintar(datos);
  } catch (e) {
    $("aviso-error-texto").textContent =
      e instanceof TypeError
        ? "No se pudo conectar con el servidor. Verifica que la API esté encendida."
        : e.message;
    $("aviso-error").hidden = false;
  } finally {
    document.body.classList.remove("cargando");
  }
}

function pintar(d) {
  llenarFiltroAnios(d.filtros.anios_disponibles);
  pintarKpis(d.indicadores, d.variacion_vs_anio_anterior);
  pintarMensual(d.mensual, d.filtros.anio);
  pintarDiagnosticos(d.diagnosticos);
  pintarPiramide(d.edad_sexo);
  pintarVias(d.vias_ingreso);
}

// ───────── Filtro de año ─────────
function llenarFiltroAnios(anios) {
  const select = $("filtro-anio");
  if (select.options.length === 1) {
    anios.forEach((a) => select.add(new Option(a, a)));
    select.value = estado.anio;
  }
  $("nota-periodo").textContent =
    estado.anio === "todos"
      ? `${anios[0]} – ${anios[anios.length - 1]}`
      : `Comparado con ${estado.anio - 1}`;
}

$("filtro-anio").addEventListener("change", (e) => {
  estado.anio = e.target.value;
  cargar();
});

// ───────── Filtros de municipio y EPS (listas desde /api/catalogos) ─────────
async function llenarCatalogo(nombre, selectId) {
  try {
    const r = await fetch(`${API_URL}/catalogos/${nombre}`, { credentials: "include" });
    const { datos } = await r.json();
    const select = $(selectId);
    datos.forEach((d) => {
      const id = d.id_municipio ?? d.id_eps;
      select.add(new Option(d.nombre, id));
    });
  } catch {
    /* si falla, el filtro queda solo con "Todos" */
  }
}

function alCambiarFiltro() {
  estado.municipio = $("filtro-municipio").value;
  estado.eps = $("filtro-eps").value;
  $("btn-limpiar").hidden = !(estado.municipio || estado.eps);
  cargar();
}
$("filtro-municipio").addEventListener("change", alCambiarFiltro);
$("filtro-eps").addEventListener("change", alCambiarFiltro);
$("btn-limpiar").addEventListener("click", () => {
  $("filtro-municipio").value = "";
  $("filtro-eps").value = "";
  alCambiarFiltro();
});

// ───────── Indicadores ─────────
// bajaEsBueno: para estancia y mortalidad, que baje es positivo.
function delta(idEl, valor, texto, bajaEsBueno) {
  const el = $(idEl);
  if (valor === null || valor === undefined) {
    el.textContent = "";
    return;
  }
  const clase =
    valor === 0 ? "neutro" : valor < 0 === bajaEsBueno ? "" : "malo";
  const signo = valor > 0 ? "▲" : valor < 0 ? "▼" : "•";
  el.innerHTML = `<span class="delta ${clase}">${signo} ${texto}</span> vs ${estado.anio - 1}`;
}

function pintarKpis(k, v) {
  $("kpi-hosp").textContent = num(k.hospitalizaciones);
  $("kpi-estancia").innerHTML =
    `${dec(k.estancia_promedio)}<small>días</small>`;
  $("kpi-egreso").innerHTML = `${dec(k.tasa_egreso)}<small>%</small>`;
  $("kpi-mortalidad").innerHTML = `${dec(k.mortalidad)}<small>%</small>`;

  delta(
    "delta-hosp",
    v?.hospitalizaciones_pct,
    `${dec(Math.abs(v?.hospitalizaciones_pct ?? 0))} %`,
    false,
  );
  delta(
    "delta-estancia",
    v?.estancia_promedio,
    `${dec(Math.abs(v?.estancia_promedio ?? 0), 2)} días`,
    true,
  );
  delta(
    "delta-egreso",
    v?.tasa_egreso,
    `${dec(Math.abs(v?.tasa_egreso ?? 0), 2)} pts`,
    false,
  );
  delta(
    "delta-mortalidad",
    v?.mortalidad,
    `${dec(Math.abs(v?.mortalidad ?? 0), 2)} pts`,
    true,
  );
  // Hospitalizar más no es "bueno" ni "malo": se muestra en neutro
  const h = $("delta-hosp").querySelector(".delta");
  if (h) h.className = "delta neutro";
}

// ───────── Gráfica mensual ─────────
function reemplazar(nombre, config) {
  estado.graficas[nombre]?.destroy();
  estado.graficas[nombre] = new Chart($(nombre), config);
}

const ejes = {
  x: { grid: { display: false }, border: { color: LINEA } },
  y: {
    beginAtZero: true,
    grid: { color: LINEA },
    border: { display: false },
    ticks: { callback: (v) => num(v) },
  },
};

function pintarMensual(series, anio) {
  if (anio) {
    // Un solo año: barras; el mes pico va en dorado y una línea marca el promedio mensual.
    const datos = series[0].meses;
    const max = Math.max(...datos);
    const promedio = datos.reduce((a, b) => a + b, 0) / 12;
    $("titulo-mensual").textContent = `Hospitalizaciones por mes · ${anio}`;
    $("sub-mensual").textContent =
      `Pico en ${MESES[datos.indexOf(max)]} (${num(max)}). La línea punteada es el promedio mensual.`;
    reemplazar("graf-mensual", {
      type: "bar",
      data: {
        labels: MESES,
        datasets: [
          {
            label: "Hospitalizaciones",
            data: datos,
            borderRadius: 6,
            maxBarThickness: 34,
            backgroundColor: datos.map((n) => (n === max ? DORADO : VERDE)),
          },
          {
            type: "line",
            label: "Promedio mensual",
            data: Array(12).fill(Math.round(promedio)),
            borderColor: GRIS,
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: ejes,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${num(c.parsed.y)}`,
            },
          },
        },
      },
    });
  } else {
    // Todos los años: una línea por año para comparar temporadas.
    const colores = [VERDE_CLARO, DORADO, "#5f8f7e", VERDE];
    $("titulo-mensual").textContent = "Hospitalizaciones por mes";
    $("sub-mensual").textContent =
      "Una línea por año, para comparar temporadas de mayor demanda.";
    reemplazar("graf-mensual", {
      type: "line",
      data: {
        labels: MESES,
        datasets: series.map((s, i) => ({
          label: s.anio,
          data: s.meses,
          borderColor: colores[i % colores.length],
          backgroundColor: colores[i % colores.length],
          borderWidth: i === series.length - 1 ? 3 : 2,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: ejes,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 8 },
          },
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${num(c.parsed.y)}`,
            },
          },
        },
      },
    });
  }
}

// ───────── Diagnósticos (barras HTML: más legibles que un canvas) ─────────
function pintarDiagnosticos(lista) {
  const ul = $("lista-dx");
  if (!lista.length) {
    ul.innerHTML = '<li class="vacio">Sin diagnósticos para este periodo.</li>';
    return;
  }
  const max = lista[0].casos;
  ul.innerHTML = lista
    .map((d) => {
      const nombre = d.descripcion ? `<i>${esc(d.descripcion)}</i>` : "";
      return `<li>
      <div class="dx-fila" title="${esc(d.descripcion || d.codigo)} · Estancia promedio ${dec(d.estancia_promedio)} días">
        <span class="dx-nombre"><b>${esc(d.codigo)}</b>${nombre}</span>
        <span class="dx-cifra"><b>${num(d.casos)}</b> · ${dec(d.porcentaje)} %</span>
        <span class="dx-barra"><span style="width:${((100 * d.casos) / max).toFixed(1)}%"></span></span>
      </div></li>`;
    })
    .join("");
}

const esc = (t) =>
  String(t).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

document.querySelectorAll(".selector button").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll(".selector button")
      .forEach((x) => x.classList.toggle("activo", x === b));
    estado.dx = b.dataset.dx;
    cargar();
  }),
);

// ───────── Pirámide edad / sexo ─────────
function pintarPiramide(filas) {
  const etiquetas = filas.map((f) => f.grupo);
  const max = Math.max(...filas.flatMap((f) => [f.hombres, f.mujeres]), 1);
  reemplazar("graf-piramide", {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Hombres",
          data: filas.map((f) => -f.hombres),
          backgroundColor: VERDE,
          borderRadius: 4,
        },
        {
          label: "Mujeres",
          data: filas.map((f) => f.mujeres),
          backgroundColor: DORADO,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          min: -max * 1.1,
          max: max * 1.1,
          grid: { color: LINEA },
          border: { display: false },
          ticks: { callback: (v) => num(Math.abs(v)) },
        },
        y: {
          stacked: true,
          reverse: true,
          grid: { display: false },
          border: { color: LINEA },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 8 },
        },
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label}: ${num(Math.abs(c.parsed.x))}`,
          },
        },
      },
    },
  });
}

// ───────── Vía de ingreso ─────────
function pintarVias(filas) {
  const total = filas.reduce((a, f) => a + f.casos, 0) || 1;
  reemplazar("graf-vias", {
    type: "doughnut",
    data: {
      labels: filas.map((f) => f.via),
      datasets: [
        {
          data: filas.map((f) => f.casos),
          backgroundColor: [VERDE, DORADO, VERDE_CLARO, "#c9d6cf"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "right",
          labels: { usePointStyle: true, boxWidth: 8, padding: 14 },
        },
        tooltip: {
          callbacks: {
            label: (c) =>
              `${c.label}: ${num(c.parsed)} (${dec((100 * c.parsed) / total)} %)`,
          },
        },
      },
    },
  });
}

$("btn-reintentar").addEventListener("click", cargar);

if (iniciarSesionUI()) {
  llenarCatalogo("municipios", "filtro-municipio");
  llenarCatalogo("eps", "filtro-eps");
  cargar();
}
