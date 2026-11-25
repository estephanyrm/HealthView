// Centro de Reportes y Exportación (reportes.html). Conexión con /api/reportes.
const API_URL = HVAuth.API_URL;

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
let solicitudReporte = 0;

function mensajeTabla(texto) {
  $("filas-reporte").innerHTML = `<tr><td colspan="7" class="tabla-vacia">${texto}</td></tr>`;
}

async function cargarReporte() {
  const { tipo, anio, limite } = estadoReportes;
  const endpointMap = {
    resumen_ejecutivo: "resumen",
    epidemiologico: "epidemiologico",
    prestadores: "prestadores",
    eps: "eps",
  };

  const endpoint = endpointMap[tipo] || "resumen";
  const params = new URLSearchParams({ limite });
  if (anio !== "todos") params.set("anio", anio);

  // Si el usuario cambia los filtros antes de que llegue la respuesta, solo se pinta la última
  const turno = ++solicitudReporte;
  estadoReportes.reporteActual = null;
  mensajeTabla("Generando el reporte… la primera consulta de cada combinación puede tardar unos segundos.");

  try {
    const res = await fetch(`${API_URL}/reportes/${endpoint}?${params}`, {
      credentials: "include",
    }).catch(() => {
      throw new Error("No se pudo conectar con el servidor. Verifica que la API esté encendida.");
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error?.mensaje || "No se pudo generar el reporte.");
    }
    if (turno !== solicitudReporte) return;
    renderizarReporte(data);
  } catch (err) {
    if (turno !== solicitudReporte) return;
    // Nunca se muestran datos inventados en un reporte clínico: se informa el error
    console.error("Fallo cargando el reporte:", err);
    mensajeTabla("No se pudo generar el reporte.");
    HVNotificar.error(err.message, { reintentar: cargarReporte });
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
  HVNotificar.toast(txt, "info");
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

// Inicialización
verificarSesion();
cargarReporte();
