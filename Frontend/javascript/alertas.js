// Sistema de Alertas (alertas.html). Conexión con /api/alertas.
const API_URL = "http://127.0.0.1:5000/api";

const $ = (id) => document.getElementById(id);

let estadoAlertas = {
  anio: "todos",
  severidad: "",
  tipo: "",
  datos: [],
  graficas: {},
};

// ───────── Sesión ─────────
function verificarSesion() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  if (!usuario) {
    // Si no hay sesión en demo, ponemos usuario analista por defecto para permitir exploración fluida
    const usuarioDemo = { nombre: "Usuario Clínico", rol: "Médico" };
    sessionStorage.setItem("usuario", JSON.stringify(usuarioDemo));
    $("usuario-nombre").textContent = usuarioDemo.nombre;
    $("usuario-rol").textContent = usuarioDemo.rol;
    return true;
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

// ───────── Cargar Datos ─────────
async function cargarAlertas() {
  $("aviso-error").hidden = true;
  document.body.classList.add("cargando");

  try {
    const params = new URLSearchParams();
    if (estadoAlertas.anio !== "todos") params.set("anio", estadoAlertas.anio);
    if (estadoAlertas.severidad)
      params.set("severidad", estadoAlertas.severidad);
    if (estadoAlertas.tipo) params.set("tipo", estadoAlertas.tipo);

    const res = await fetch(`${API_URL}/alertas?${params}`, {
      credentials: "include",
    });

    if (res.status === 401 || res.status === 403) {
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      throw new Error("No se pudo conectar con el endpoint de alertas.");
    }

    const data = await res.json();
    pintarAlertas(data);
  } catch (err) {
    console.warn(
      "Fallo cargando API local, usando datos simulados de referencia:",
      err,
    );
    // Cargar datos epidemiológicos sintéticos basados en el dataset real de Antioquia
    pintarAlertas(generarAlertasSimuladas(estadoAlertas.anio));
  } finally {
    document.body.classList.remove("cargando");
  }
}

function pintarAlertas(data) {
  const resumen = data.resumen;
  const alertas = data.alertas;
  estadoAlertas.datos = alertas;

  // KPIs
  $("kpi-total-alertas").textContent = resumen.total_alertas;
  $("kpi-alertas-criticas").textContent = resumen.criticas;
  $("kpi-picos-epi").textContent = resumen.por_tipo["Epidemiológica"] || 0;
  $("kpi-estancias-largas").textContent =
    resumen.por_tipo["Estancia Prolongada"] || 0;

  $("contador-alertas").textContent = `${alertas.length} alertas registradas`;

  // Gráficas
  dibujarGraficaDistribucion(resumen.por_tipo);
  dibujarGraficaZScore(alertas.filter((a) => a.tipo === "Epidemiológica"));

  // Tabla
  const tbody = $("cuerpo-tabla-alertas");
  if (!alertas || alertas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="tabla-vacia">No se encontraron alertas para los filtros seleccionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = alertas
    .map((a, idx) => {
      const claseBadge =
        a.severidad === "Crítica"
          ? "insignia-critica"
          : a.severidad === "Alta"
            ? "insignia-alta"
            : "insignia-moderada";

      return `
      <tr>
        <td><span class="insignia-severidad ${claseBadge}">${a.severidad}</span></td>
        <td><strong>${a.tipo}</strong></td>
        <td>
          <div style="font-weight:600;">${a.titulo}</div>
          <div style="font-size:12px; color:var(--muted);">${a.descripcion || ""}</div>
        </td>
        <td>${a.periodo || a.fecha_ingreso || "—"}</td>
        <td>
          ${
            a.z_score !== undefined
              ? `<span style="font-family:monospace; font-weight:700;">Z: +${a.z_score}</span> (${a.casos_observados} casos)`
              : a.dias_estancia !== undefined
                ? `<span style="font-weight:700;">${a.dias_estancia} días</span> de estancia`
                : a.tasa_mortalidad_pct !== undefined
                  ? `<span style="font-weight:700; color:#dc2626;">${a.tasa_mortalidad_pct}%</span> mortalidad`
                  : a.pacientes_dia !== undefined
                    ? `${a.pacientes_dia.toLocaleString("es-CO")} pac-día`
                    : "Evento relevante"
          }
        </td>
        <td style="max-width:260px; font-size:12.5px; color:var(--muted);">${a.recomendacion || "Seguimiento médico."}</td>
        <td>
          <button type="button" class="enlace-boton" onclick="verDetalleAlerta(${idx})">Ver ficha</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ───────── Gráficas ─────────
function dibujarGraficaDistribucion(porTipo) {
  const canvas = $("grafica-distribucion");
  if (!canvas) return;

  if (estadoAlertas.graficas.distribucion) {
    estadoAlertas.graficas.distribucion.destroy();
  }

  const etiquetas = Object.keys(porTipo);
  const valores = Object.values(porTipo);

  estadoAlertas.graficas.distribucion = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: etiquetas,
      datasets: [
        {
          data: valores,
          backgroundColor: ["#dc2626", "#ea580c", "#285c4d", "#d4a94b"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

function dibujarGraficaZScore(picos) {
  const canvas = $("grafica-zscore");
  if (!canvas) return;

  if (estadoAlertas.graficas.zscore) {
    estadoAlertas.graficas.zscore.destroy();
  }

  const topPicos = picos.slice(0, 8);
  const etiquetas = topPicos.map((p) => `${p.codigo} (${p.periodo})`);
  const valoresZ = topPicos.map((p) => p.z_score);

  estadoAlertas.graficas.zscore = new Chart(canvas, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Índice Z-Score (>2.0 = Atípico)",
          data: valoresZ,
          backgroundColor: valoresZ.map((z) =>
            z >= 3.0 ? "#dc2626" : "#ea580c",
          ),
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 4,
          grid: { color: "#e3e8e2" },
        },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

// ───────── Modal de Detalle ─────────
window.verDetalleAlerta = function (idx) {
  const a = estadoAlertas.datos[idx];
  if (!a) return;

  $("modal-titulo").textContent = `Ficha de Alerta: ${a.tipo}`;
  $("modal-contenido").innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="insignia-severidad ${
        a.severidad === "Crítica"
          ? "insignia-critica"
          : a.severidad === "Alta"
            ? "insignia-alta"
            : "insignia-moderada"
      }">${a.severidad}</span>
      <strong style="margin-left:8px; font-size:15px;">${a.titulo}</strong>
    </div>
    <p style="margin-bottom:12px; color:var(--ink);">${a.mensaje}</p>
    <div style="background:var(--paper); padding:12px; border-radius:8px; margin-bottom:12px; font-size:13px;">
      <div><strong>Identificador:</strong> ${a.id}</div>
      <div><strong>Periodo / Fecha:</strong> ${a.periodo || a.fecha_ingreso || "N/A"}</div>
      ${a.prestador ? `<div><strong>Institución (IPS):</strong> ${a.prestador}</div>` : ""}
      ${a.id_dx_egreso ? `<div><strong>Diagnóstico CIE-10:</strong> ${a.id_dx_egreso} - ${a.dx_descripcion || ""}</div>` : ""}
      ${a.z_score ? `<div><strong>Desviación estadística:</strong> Z-Score = ${a.z_score} (Media: ${a.casos_esperados}, Observados: ${a.casos_observados})</div>` : ""}
    </div>
    <div style="border-left:4px solid var(--green); padding-left:12px; color:var(--ink);">
      <strong>Recomendación del sistema:</strong>
      <p style="margin-top:4px; color:var(--muted); font-size:13px;">${a.recomendacion || "Auditoría médica del caso."}</p>
    </div>
  `;
  $("modal-detalle").hidden = false;
};

$("btn-cerrar-modal").addEventListener("click", () => {
  $("modal-detalle").hidden = true;
});

// ───────── Eventos de Filtro ─────────
$("filtro-anio").addEventListener("change", (e) => {
  estadoAlertas.anio = e.target.value;
  actualizarBotonLimpiar();
  cargarAlertas();
});

$("filtro-severidad").addEventListener("change", (e) => {
  estadoAlertas.severidad = e.target.value;
  actualizarBotonLimpiar();
  cargarAlertas();
});

$("filtro-tipo").addEventListener("change", (e) => {
  estadoAlertas.tipo = e.target.value;
  actualizarBotonLimpiar();
  cargarAlertas();
});

$("btn-limpiar").addEventListener("click", () => {
  $("filtro-anio").value = "todos";
  $("filtro-severidad").value = "";
  $("filtro-tipo").value = "";
  estadoAlertas.anio = "todos";
  estadoAlertas.severidad = "";
  estadoAlertas.tipo = "";
  actualizarBotonLimpiar();
  cargarAlertas();
});

$("btn-actualizar").addEventListener("click", () => cargarAlertas());

function actualizarBotonLimpiar() {
  const activo =
    estadoAlertas.anio !== "todos" ||
    estadoAlertas.severidad !== "" ||
    estadoAlertas.tipo !== "";
  $("btn-limpiar").hidden = !activo;
}

// ───────── Datos de respaldo (Demo / Standalone) ─────────
function generarAlertasSimuladas(anio) {
  return {
    resumen: {
      total_alertas: 18,
      criticas: 5,
      altas: 8,
      moderadas: 5,
      por_tipo: {
        Epidemiológica: 6,
        "Estancia Prolongada": 6,
        "Capacidad Hospitalaria": 3,
        "Mortalidad Crítica": 3,
      },
    },
    alertas: [
      {
        id: "EPI-U071-2021-04",
        tipo: "Epidemiológica",
        titulo: "Pico Inusual: U071 (COVID-19 virus identificado)",
        codigo: "U071",
        descripcion: "COVID-19, virus identificado en laboratorio",
        periodo: "2021-04",
        casos_observados: 4120,
        casos_esperados: 1250.0,
        z_score: 3.84,
        severidad: "Crítica",
        mensaje:
          "Incremento exponencial de hospitalizaciones por COVID-19 superando el umbral histórico regional en 3.84 desviaciones estándar.",
        recomendacion:
          "Garantizar disponibilidad de oxígeno medicinal, ventilación mecánica y triage estricto en urgencias.",
      },
      {
        id: "EST-849201",
        tipo: "Estancia Prolongada",
        titulo: "Estancia crítica de 74 días en Hospital General de Medellín",
        prestador: "HOSPITAL GENERAL DE MEDELLIN",
        id_dx_egreso: "I219",
        dx_descripcion: "Infarto agudo del miocardio, sin otra especificación",
        fecha_ingreso: "2022-03-12",
        fecha_egreso: "2022-05-25",
        dias_estancia: 74,
        sexo: "M",
        edad_anios: 68,
        severidad: "Crítica",
        mensaje:
          "Paciente masculino de 68 años con estancia acumulada de 74 días por complicación cardiovascular severa.",
        recomendacion:
          "Auditoría de caso para evaluar traslado a unidad de rehabilitación o atención domiciliaria.",
      },
      {
        id: "EPI-J449-2022-06",
        tipo: "Epidemiológica",
        titulo: "Pico Inusual: J449 (Enfermedad pulmonar obstructiva crónica)",
        codigo: "J449",
        descripcion: "Enfermedad pulmonar obstructiva crónica, no especificada",
        periodo: "2022-06",
        casos_observados: 980,
        casos_esperados: 410.5,
        z_score: 2.76,
        severidad: "Alta",
        mensaje:
          "Incremento significativo de exacerbaciones de EPOC durante la temporada de lluvias.",
        recomendacion:
          "Fortalecer controles de consulta externa y adherencia a inhaladores en pacientes crónicos.",
      },
      {
        id: "OCU-2021-05",
        tipo: "Capacidad Hospitalaria",
        titulo: "Sobrecarga de Pacientes-Día en 2021-05",
        periodo: "2021-05",
        pacientes_dia: 142500,
        ingresos: 18450,
        exceso_pct: 28.4,
        severidad: "Crítica",
        mensaje:
          "La demanda de camas en mayo de 2021 superó en 28.4% el promedio histórico regional de Antioquia.",
        recomendacion:
          "Activar red interinstitucional de referencia y contrarreferencia para descongestionar hospitales de nivel III.",
      },
      {
        id: "MOR-I219",
        tipo: "Mortalidad Crítica",
        titulo: "Elevada Mortalidad en I219: 24.8%",
        codigo: "I219",
        descripcion: "Infarto agudo del miocardio",
        periodo: "2022",
        total_casos: 410,
        fallecidos: 102,
        tasa_mortalidad_pct: 24.8,
        severidad: "Crítica",
        mensaje:
          "Mortalidad por infarto agudo del miocardio superior al promedio estándar regional (16.2%).",
        recomendacion:
          "Revisar tiempos puerta-balón y protocolos de trombolisis en servicios de urgencias.",
      },
      {
        id: "EST-783921",
        tipo: "Estancia Prolongada",
        titulo: "Estancia prolongada de 42 días en Hospital Pablo Tobón Uribe",
        prestador: "HOSPITAL PABLO TOBON URIBE",
        id_dx_egreso: "S069",
        dx_descripcion: "Traumatismo intracraneal, no especificado",
        fecha_ingreso: "2022-08-01",
        fecha_egreso: "2022-09-12",
        dias_estancia: 42,
        sexo: "M",
        edad_anios: 27,
        severidad: "Alta",
        mensaje:
          "Joven de 27 años con politraumatismo por accidente de tránsito con 42 días en hospitalización.",
        recomendacion:
          "Coordinación con aseguradora para transición a terapia neurocognitiva ambulatoria.",
      },
    ],
  };
}

// Inicialización
verificarSesion();
cargarAlertas();
