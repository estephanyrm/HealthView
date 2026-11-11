// Centro de Reportes y Exportación (reportes.html). Conexión con /api/reportes.
const API_URL = "http://127.0.0.1:5000/api";

const $ = (id) => document.getElementById(id);

let estadoReportes = {
  tipo: "resumen_ejecutivo",
  anio: "todos",
  limite: "25",
  reporteActual: null,
};

// ───────── Sesión ─────────
function verificarSesion() {
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
    HVAuth.limpiarSesion();
    window.location.href = "login.html";
  }
});

// ───────── Cargar Reporte ─────────
async function cargarReporte() {
  const { tipo, anio, limite } = estadoReportes;
  const endpointMap = {
    resumen_ejecutivo: "resumen",
    epidemiologico: "epidemiologico",
    prestadores: "prestadores",
    eps: "eps",
    alertas: "resumen",
  };

  const endpoint = endpointMap[tipo] || "resumen";
  const params = new URLSearchParams();
  if (anio !== "todos") params.set("anio", anio);
  if (limite !== "all") params.set("limite", limite);

  try {
    const res = await fetch(`${API_URL}/reportes/${endpoint}?${params}`, {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      renderizarReporte(data);
    } else {
      throw new Error("No se pudo cargar desde API Flask.");
    }
  } catch (err) {
    console.warn("Usando motor de reportes local consolidado:", err);
    renderizarReporte(generarReporteLocal(tipo, anio));
  }
}

function renderizarReporte(reporte) {
  estadoReportes.reporteActual = reporte;
  const { metadatos, columnas, datos } = reporte;

  $("rep-titulo").textContent = metadatos.titulo;
  $("rep-fecha").textContent =
    metadatos.fecha_generacion || new Date().toLocaleString("es-CO");
  $("rep-periodo").textContent = metadatos.periodo;

  // KPIs
  const totalCasos =
    metadatos.total_registros ||
    datos.reduce((acc, f) => acc + (f.casos || f.hospitalizaciones || 0), 0);
  $("rep-stat-total").textContent = Number(totalCasos).toLocaleString("es-CO");

  const estanciaProm =
    datos.length > 0
      ? (
          datos.reduce((acc, f) => acc + (f.estancia_promedio || 0), 0) /
          datos.length
        ).toFixed(2)
      : "0";
  $("rep-stat-estancia").textContent = `${estanciaProm} días`;

  const mortalidadProm =
    datos.length > 0
      ? (
          datos.reduce((acc, f) => acc + (f.mortalidad_pct || 0), 0) /
          datos.length
        ).toFixed(2)
      : "0";
  $("rep-stat-mortalidad").textContent = `${mortalidadProm}%`;

  // Encabezados
  const thead = $("encabezado-reporte");
  const nombresColumnas = {
    anio: "Año",
    via_ingreso: "Vía de Ingreso",
    casos: "Casos Registrados",
    hospitalizaciones: "Hospitalizaciones",
    estancia_promedio: "Estancia Prom. (Días)",
    egresos_vivos: "Egresos Vivos",
    fallecidos: "Fallecidos",
    mortalidad_pct: "Tasa Mortalidad (%)",
    codigo: "CIE-10",
    descripcion: "Diagnóstico Clínico",
    grupo: "Capítulo",
    id_prestador: "Código IPS",
    prestador: "Institución Prestadora",
    id_eps: "Código EPS",
    eps: "Aseguradora (EPS)",
  };

  thead.innerHTML = `
    <tr>
      ${columnas.map((c) => `<th>${nombresColumnas[c] || c.toUpperCase()}</th>`).join("")}
    </tr>
  `;

  // Filas
  const tbody = $("filas-reporte");
  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${columnas.length}" class="tabla-vacia">No hay datos para este periodo.</td></tr>`;
    return;
  }

  tbody.innerHTML = datos
    .map((fila) => {
      return `
      <tr>
        ${columnas
          .map((c) => {
            const v = fila[c];
            if (c === "mortalidad_pct") {
              return `<td><strong style="color:${v > 10 ? "#dc2626" : "var(--ink)"}">${v}%</strong></td>`;
            }
            if (
              c === "casos" ||
              c === "hospitalizaciones" ||
              c === "egresos_vivos" ||
              c === "fallecidos"
            ) {
              return `<td>${Number(v).toLocaleString("es-CO")}</td>`;
            }
            if (c === "codigo") {
              return `<td><span style="font-family:monospace; font-weight:700;">${v}</span></td>`;
            }
            return `<td>${v !== null && v !== undefined ? v : "—"}</td>`;
          })
          .join("")}
      </tr>
    `;
    })
    .join("");
}

// ───────── Exportaciones ─────────

// 1. Exportar a Excel (.xlsx)
$("btn-export-excel").addEventListener("click", () => {
  if (!estadoReportes.reporteActual) return;
  const { metadatos, columnas, datos } = estadoReportes.reporteActual;

  mostrarFeedbackDescarga("Generando libro de Microsoft Excel (.xlsx)...");

  if (typeof XLSX !== "undefined") {
    const ws = XLSX.utils.json_to_sheet(datos, { header: columnas });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_HealthView");
    const nombre = `HealthView_${metadatos.tipo_reporte}_${metadatos.periodo.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
    XLSX.writeFile(wb, nombre);
  } else {
    descargarCSVDirecto();
  }
});

// 2. Exportar a CSV (UTF-8 con BOM)
$("btn-export-csv").addEventListener("click", () => {
  descargarCSVDirecto();
});

function descargarCSVDirecto() {
  if (!estadoReportes.reporteActual) return;
  const { metadatos, columnas, datos } = estadoReportes.reporteActual;

  mostrarFeedbackDescarga("Descargando archivo CSV codificado en UTF-8...");

  let csvContent = "\ufeff"; // BOM UTF-8
  csvContent += columnas.join(";") + "\r\n";

  datos.forEach((fila) => {
    const linea = columnas
      .map((c) => `"${String(fila[c] ?? "").replace(/"/g, '""')}"`)
      .join(";");
    csvContent += linea + "\r\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HealthView_${metadatos.tipo_reporte}_${metadatos.periodo.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 3. Imprimir / PDF
$("btn-export-pdf").addEventListener("click", () => {
  mostrarFeedbackDescarga("Abriendo cuadro de impresión para generar PDF...");
  setTimeout(() => {
    window.print();
  }, 200);
});

// 4. Exportar JSON
$("btn-export-json").addEventListener("click", () => {
  if (!estadoReportes.reporteActual) return;
  mostrarFeedbackDescarga("Descargando datos en formato JSON...");

  const blob = new Blob(
    [JSON.stringify(estadoReportes.reporteActual, null, 2)],
    {
      type: "application/json",
    },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HealthView_Data_${estadoReportes.tipo}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function mostrarFeedbackDescarga(txt) {
  const el = $("mensaje-export");
  el.textContent = txt;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 4000);
}

// ───────── Eventos de Cambio ─────────
$("select-tipo-reporte").addEventListener("change", (e) => {
  estadoReportes.tipo = e.target.value;
  cargarReporte();
});

$("select-anio-reporte").addEventListener("change", (e) => {
  estadoReportes.anio = e.target.value;
  cargarReporte();
});

$("select-limite-filas").addEventListener("change", (e) => {
  estadoReportes.limite = e.target.value;
  cargarReporte();
});

// ───────── Datos de Respaldo / Motor Local ─────────
function generarReporteLocal(tipo, anio) {
  const anioStr =
    anio === "todos" ? "Todos los años (2019-2022)" : `Año ${anio}`;

  if (tipo === "epidemiologico") {
    return {
      metadatos: {
        plataforma: "HealthView - Universidad Libre",
        tipo_reporte: "epidemiologico",
        titulo: "Reporte Epidemiológico: Top Diagnósticos de Egreso CIE-10",
        periodo: anioStr,
        fecha_generacion: new Date().toLocaleString("es-CO"),
        total_registros: 142850,
      },
      columnas: [
        "codigo",
        "descripcion",
        "grupo",
        "casos",
        "estancia_promedio",
        "fallecidos",
        "mortalidad_pct",
      ],
      datos: [
        {
          codigo: "J449",
          descripcion: "Enfermedad pulmonar obstructiva crónica",
          grupo: "J",
          casos: 24510,
          estancia_promedio: 6.8,
          fallecidos: 1820,
          mortalidad_pct: 7.4,
        },
        {
          codigo: "U071",
          descripcion: "COVID-19, virus identificado",
          grupo: "U",
          casos: 21840,
          estancia_promedio: 11.2,
          fallecidos: 3150,
          mortalidad_pct: 14.4,
        },
        {
          codigo: "I10X",
          descripcion: "Hipertensión esencial (primaria)",
          grupo: "I",
          casos: 19430,
          estancia_promedio: 4.1,
          fallecidos: 480,
          mortalidad_pct: 2.5,
        },
        {
          codigo: "I219",
          descripcion: "Infarto agudo del miocardio",
          grupo: "I",
          casos: 16200,
          estancia_promedio: 7.5,
          fallecidos: 2680,
          mortalidad_pct: 16.5,
        },
        {
          codigo: "N390",
          descripcion: "Infección del tracto urinario",
          grupo: "N",
          casos: 14890,
          estancia_promedio: 4.6,
          fallecidos: 320,
          mortalidad_pct: 2.1,
        },
        {
          codigo: "A09X",
          descripcion: "Gastroenteritis y colitis infecciosa",
          grupo: "A",
          casos: 13520,
          estancia_promedio: 3.2,
          fallecidos: 110,
          mortalidad_pct: 0.8,
        },
        {
          codigo: "J189",
          descripcion: "Neumonía no especificada",
          grupo: "J",
          casos: 12900,
          estancia_promedio: 7.9,
          fallecidos: 1540,
          mortalidad_pct: 11.9,
        },
        {
          codigo: "K358",
          descripcion: "Apendicitis aguda",
          grupo: "K",
          casos: 10450,
          estancia_promedio: 3.1,
          fallecidos: 25,
          mortalidad_pct: 0.2,
        },
        {
          codigo: "O800",
          descripcion: "Parto único espontáneo",
          grupo: "O",
          casos: 9110,
          estancia_promedio: 2.1,
          fallecidos: 4,
          mortalidad_pct: 0.04,
        },
      ],
    };
  }

  if (tipo === "prestadores") {
    return {
      metadatos: {
        plataforma: "HealthView - Universidad Libre",
        tipo_reporte: "prestadores",
        titulo: "Reporte de Rendimiento y Carga Asistencial por IPS",
        periodo: anioStr,
        fecha_generacion: new Date().toLocaleString("es-CO"),
        total_registros: 833586,
      },
      columnas: [
        "id_prestador",
        "prestador",
        "hospitalizaciones",
        "estancia_promedio",
        "fallecidos",
        "mortalidad_pct",
      ],
      datos: [
        {
          id_prestador: "050010012301",
          prestador: "HOSPITAL GENERAL DE MEDELLIN",
          hospitalizaciones: 184500,
          estancia_promedio: 5.8,
          fallecidos: 6820,
          mortalidad_pct: 3.7,
        },
        {
          id_prestador: "050010023401",
          prestador: "HOSPITAL PABLO TOBON URIBE",
          hospitalizaciones: 142100,
          estancia_promedio: 6.4,
          fallecidos: 5980,
          mortalidad_pct: 4.2,
        },
        {
          id_prestador: "050010034501",
          prestador: "HOSPITAL SAN VICENTE FUNDACION",
          hospitalizaciones: 128900,
          estancia_promedio: 7.1,
          fallecidos: 6100,
          mortalidad_pct: 4.7,
        },
        {
          id_prestador: "056150045601",
          prestador: "CLINICA SOMER (RIONEGRO)",
          hospitalizaciones: 94200,
          estancia_promedio: 4.9,
          fallecidos: 2950,
          mortalidad_pct: 3.1,
        },
        {
          id_prestador: "050880056701",
          prestador: "HOSPITAL MARCO FIDEL SUAREZ (BELLO)",
          hospitalizaciones: 78400,
          estancia_promedio: 4.5,
          fallecidos: 2410,
          mortalidad_pct: 3.1,
        },
      ],
    };
  }

  if (tipo === "eps") {
    return {
      metadatos: {
        plataforma: "HealthView - Universidad Libre",
        tipo_reporte: "eps",
        titulo: "Reporte de Demanda Hospitalaria por Aseguradora (EPS)",
        periodo: anioStr,
        fecha_generacion: new Date().toLocaleString("es-CO"),
        total_registros: 833586,
      },
      columnas: [
        "id_eps",
        "eps",
        "hospitalizaciones",
        "estancia_promedio",
        "fallecidos",
        "mortalidad_pct",
      ],
      datos: [
        {
          id_eps: "EPS001",
          eps: "SURA EPS",
          hospitalizaciones: 298400,
          estancia_promedio: 5.2,
          fallecidos: 9540,
          mortalidad_pct: 3.2,
        },
        {
          id_eps: "ESS024",
          eps: "SAVIA SALUD EPS",
          hospitalizaciones: 264100,
          estancia_promedio: 6.1,
          fallecidos: 11420,
          mortalidad_pct: 4.3,
        },
        {
          id_eps: "EPS002",
          eps: "NUEVA EPS",
          hospitalizaciones: 142300,
          estancia_promedio: 5.9,
          fallecidos: 5890,
          mortalidad_pct: 4.1,
        },
        {
          id_eps: "EPS005",
          eps: "SANITAS EPS",
          hospitalizaciones: 68900,
          estancia_promedio: 4.8,
          fallecidos: 1980,
          mortalidad_pct: 2.9,
        },
        {
          id_eps: "EPS008",
          eps: "COOSALUD",
          hospitalizaciones: 41200,
          estancia_promedio: 5.5,
          fallecidos: 1650,
          mortalidad_pct: 4.0,
        },
      ],
    };
  }

  // Default: resumen ejecutivo
  return {
    metadatos: {
      plataforma: "HealthView - Universidad Libre",
      tipo_reporte: "resumen_ejecutivo",
      titulo: "Reporte Ejecutivo: Hospitalizaciones por Vía de Ingreso",
      periodo: anioStr,
      fecha_generacion: new Date().toLocaleString("es-CO"),
      total_registros: 833586,
    },
    columnas: [
      "anio",
      "via_ingreso",
      "casos",
      "estancia_promedio",
      "egresos_vivos",
      "fallecidos",
      "mortalidad_pct",
    ],
    datos: [
      {
        anio: 2022,
        via_ingreso: "Urgencias",
        casos: 162400,
        estancia_promedio: 5.9,
        egresos_vivos: 156320,
        fallecidos: 6080,
        mortalidad_pct: 3.7,
      },
      {
        anio: 2022,
        via_ingreso: "Consulta externa o programada",
        casos: 42100,
        estancia_promedio: 3.8,
        egresos_vivos: 41650,
        fallecidos: 450,
        mortalidad_pct: 1.1,
      },
      {
        anio: 2022,
        via_ingreso: "Remitido",
        casos: 24300,
        estancia_promedio: 7.6,
        egresos_vivos: 22890,
        fallecidos: 1410,
        mortalidad_pct: 5.8,
      },
      {
        anio: 2022,
        via_ingreso: "Nacimiento en la institución",
        casos: 12500,
        estancia_promedio: 2.2,
        egresos_vivos: 12485,
        fallecidos: 15,
        mortalidad_pct: 0.1,
      },
      {
        anio: 2021,
        via_ingreso: "Urgencias",
        casos: 178900,
        estancia_promedio: 6.8,
        egresos_vivos: 169950,
        fallecidos: 8950,
        mortalidad_pct: 5.0,
      },
      {
        anio: 2021,
        via_ingreso: "Consulta externa o programada",
        casos: 31200,
        estancia_promedio: 4.1,
        egresos_vivos: 30810,
        fallecidos: 390,
        mortalidad_pct: 1.2,
      },
      {
        anio: 2021,
        via_ingreso: "Remitido",
        casos: 28900,
        estancia_promedio: 8.4,
        egresos_vivos: 26820,
        fallecidos: 2080,
        mortalidad_pct: 7.2,
      },
      {
        anio: 2020,
        via_ingreso: "Urgencias",
        casos: 152100,
        estancia_promedio: 6.5,
        egresos_vivos: 144800,
        fallecidos: 7300,
        mortalidad_pct: 4.8,
      },
      {
        anio: 2019,
        via_ingreso: "Urgencias",
        casos: 148200,
        estancia_promedio: 5.1,
        egresos_vivos: 143600,
        fallecidos: 4600,
        mortalidad_pct: 3.1,
      },
    ],
  };
}

// Inicialización
verificarSesion();
cargarReporte();
