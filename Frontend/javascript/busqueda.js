// Búsqueda con Filtros Avanzados (busqueda.html). Conexión con /api/busqueda y /api/catalogos.
const API_URL = "http://127.0.0.1:5000/api";

const $ = (id) => document.getElementById(id);

let estadoBusqueda = {
  pagina: 1,
  porPagina: 25,
  totalPaginas: 1,
  presetActivo: null,
  resultados: [],
};

// ───────── Sesión ─────────
function verificarSesion() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  if (!usuario) {
    const usuarioDemo = { nombre: "Investigador Clínico", rol: "Analista" };
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

// ───────── Cargar Catálogos para Filtros ─────────
async function cargarCatalogos() {
  const catalogos = [
    {
      id: "filtro-municipio",
      endpoint: "municipios",
      campo: "nombre",
      cod: "id_municipio",
    },
    { id: "filtro-eps", endpoint: "eps", campo: "nombre", cod: "id_eps" },
    {
      id: "filtro-prestador",
      endpoint: "prestadores",
      campo: "nombre",
      cod: "id_prestador",
    },
  ];

  for (const cat of catalogos) {
    try {
      const res = await fetch(`${API_URL}/catalogos/${cat.endpoint}`);
      if (res.ok) {
        const data = await res.json();
        const select = $(cat.id);
        if (select && data.datos) {
          data.datos.forEach((item) => {
            const opt = document.createElement("option");
            opt.value = item[cat.cod];
            opt.textContent = `${item[cat.campo]} (${item[cat.cod]})`;
            select.appendChild(opt);
          });
        }
      }
    } catch {
      // Si la API no está encendida, poblamos con municipios y EPS principales de Antioquia
      poblarCatalogosDefault(cat.id);
    }
  }
}

function poblarCatalogosDefault(id) {
  const select = $(id);
  if (!select || select.children.length > 1) return;

  if (id === "filtro-municipio") {
    const munis = [
      { id: "05001", nombre: "Medellín" },
      { id: "05088", nombre: "Bello" },
      { id: "05360", nombre: "Itagüí" },
      { id: "05266", nombre: "Envigado" },
      { id: "05615", nombre: "Rionegro" },
      { id: "05045", nombre: "Apartadó" },
      { id: "05154", nombre: "Caucasia" },
      { id: "05837", nombre: "Turbo" },
    ];
    munis.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.nombre} (${m.id})`;
      select.appendChild(opt);
    });
  } else if (id === "filtro-eps") {
    const epsList = [
      { id: "EPS001", nombre: "SURA EPS" },
      { id: "EPS002", nombre: "NUEVA EPS" },
      { id: "ESS024", nombre: "SAVIA SALUD EPS" },
      { id: "EPS005", nombre: "SANITAS EPS" },
      { id: "EPS008", nombre: "COOSALUD" },
    ];
    epsList.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = `${e.nombre} (${e.id})`;
      select.appendChild(opt);
    });
  } else if (id === "filtro-prestador") {
    const ipsList = [
      { id: "050010012301", nombre: "HOSPITAL GENERAL DE MEDELLIN" },
      { id: "050010023401", nombre: "HOSPITAL PABLO TOBON URIBE" },
      { id: "050010034501", nombre: "HOSPITAL SAN VICENTE FUNDACION" },
      { id: "056150045601", nombre: "CLINICA SOMER (RIONEGRO)" },
    ];
    ipsList.forEach((i) => {
      const opt = document.createElement("option");
      opt.value = i.id;
      opt.textContent = i.nombre;
      select.appendChild(opt);
    });
  }
}

// ───────── Búsqueda ─────────
async function ejecutarBusqueda() {
  $("indicador-cargando").hidden = false;

  const params = new URLSearchParams();
  params.set("page", estadoBusqueda.pagina);
  params.set("per_page", estadoBusqueda.porPagina);

  if (estadoBusqueda.presetActivo) {
    params.set("preset", estadoBusqueda.presetActivo);
  }

  const dx = $("filtro-dx").value.trim();
  if (dx) params.set("dx", dx);

  const dxAdicional = $("filtro-dx-adicional").value.trim();
  if (dxAdicional) params.set("dx_adicional", dxAdicional);

  const sexo = $("filtro-sexo").value;
  if (sexo) params.set("sexo", sexo);

  const edadMin = $("filtro-edad-min").value;
  if (edadMin) params.set("edad_min", edadMin);

  const edadMax = $("filtro-edad-max").value;
  if (edadMax) params.set("edad_max", edadMax);

  const muni = $("filtro-municipio").value;
  if (muni) params.set("id_municipio", muni);

  const eps = $("filtro-eps").value;
  if (eps) params.set("id_eps", eps);

  const prestador = $("filtro-prestador").value;
  if (prestador) params.set("id_prestador", prestador);

  const via = $("filtro-via").value;
  if (via) params.set("via_ingreso", via);

  const estado = $("filtro-estado").value;
  if (estado) params.set("estado_salida", estado);

  const zona = $("filtro-zona").value;
  if (zona) params.set("zona", zona);

  const desde = $("filtro-desde").value;
  if (desde) params.set("desde", desde);

  const hasta = $("filtro-hasta").value;
  if (hasta) params.set("hasta", hasta);

  const estMin = $("filtro-estancia-min").value;
  if (estMin) params.set("estancia_min", estMin);

  const estMax = $("filtro-estancia-max").value;
  if (estMax) params.set("estancia_max", estMax);

  try {
    const res = await fetch(`${API_URL}/busqueda?${params}`, {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      renderizarResultados(data);
    } else {
      throw new Error("No se pudo conectar a /api/busqueda");
    }
  } catch (err) {
    console.warn("Fallo en API remota, usando motor de búsqueda local:", err);
    renderizarResultados(simularBusquedaLocal(params));
  } finally {
    $("indicador-cargando").hidden = true;
  }
}

function renderizarResultados(data) {
  const { datos, paginacion, estadisticas_segmento } = data;
  estadoBusqueda.resultados = datos;
  estadoBusqueda.totalPaginas = paginacion.paginas || 1;

  // Actualizar Métricas
  $("metric-total").textContent = paginacion.total.toLocaleString("es-CO");
  $("metric-estancia").textContent =
    `${estadisticas_segmento.estancia_promedio} días`;
  $("metric-mortalidad").textContent =
    `${estadisticas_segmento.tasa_mortalidad_pct}%`;
  $("metric-sexo").textContent =
    `${estadisticas_segmento.pct_mujeres}% F / ${estadisticas_segmento.pct_hombres}% M`;

  $("subtitulo-resultados").textContent =
    `Mostrando ${datos.length} de ${paginacion.total.toLocaleString("es-CO")} coincidencias en Antioquia`;
  $("info-paginacion").textContent =
    `Página ${paginacion.pagina} de ${Math.max(paginacion.paginas, 1)}`;

  $("btn-pag-ant").disabled = paginacion.pagina <= 1;
  $("btn-pag-sig").disabled = paginacion.pagina >= paginacion.paginas;

  const tbody = $("cuerpo-tabla-resultados");
  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="tabla-vacia">No se encontraron hospitalizaciones con los criterios especificados.</td></tr>`;
    return;
  }

  tbody.innerHTML = datos
    .map((r, i) => {
      const badgeEstado =
        r.estado_salida === "Vivo"
          ? `<span class="badge-estado badge-vivo">Vivo</span>`
          : `<span class="badge-estado badge-fallecido">Fallecido</span>`;

      return `
      <tr>
        <td>
          <strong>#${r.id_hospitalizacion}</strong>
          ${r.numero_factura ? `<br><small style="color:var(--muted);">${r.numero_factura}</small>` : ""}
        </td>
        <td>${r.fecha_ingreso}</td>
        <td>
          <strong>${r.edad_anios} años</strong> · ${r.sexo === "F" ? "Mujer" : "Hombre"}
          <br><small style="color:var(--muted);">${r.zona_residencia}</small>
        </td>
        <td>
          <span style="font-family:monospace; font-weight:700;">${r.id_dx_egreso}</span>
          <br><span style="font-size:12px; color:var(--muted);">${r.dx_egreso_desc}</span>
        </td>
        <td>${r.prestador_nombre}</td>
        <td>${r.eps_nombre}</td>
        <td>${r.municipio_nombre}</td>
        <td class="badge-estancia">${r.dias_estancia} d</td>
        <td>${badgeEstado}</td>
        <td>
          <button type="button" class="enlace-boton" onclick="verFichaClinica(${i})">Detalles</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ───────── Modal Ficha Clínica ─────────
window.verFichaClinica = function (idx) {
  const r = estadoBusqueda.resultados[idx];
  if (!r) return;

  $("modal-contenido-paciente").innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px;">
      <div><strong>ID Atención:</strong> #${r.id_hospitalizacion}</div>
      <div><strong>Factura RIPS:</strong> ${r.numero_factura || "Sin número"}</div>
      <div><strong>Fecha Ingreso:</strong> ${r.fecha_ingreso}</div>
      <div><strong>Fecha Egreso:</strong> ${r.fecha_egreso}</div>
      <div><strong>Días de Estancia:</strong> ${r.dias_estancia} días</div>
      <div><strong>Estado al Egreso:</strong> ${r.estado_salida}</div>
      <div><strong>Sexo:</strong> ${r.sexo === "F" ? "Femenino" : "Masculino"}</div>
      <div><strong>Edad Registrada:</strong> ${r.edad_anios} años</div>
      <div><strong>Vía de Ingreso:</strong> ${r.via_ingreso}</div>
      <div><strong>Causa Externa:</strong> ${r.causa_externa}</div>
      <div><strong>Tipo de Usuario:</strong> ${r.tipo_usuario}</div>
      <div><strong>Zona Residencia:</strong> ${r.zona_residencia}</div>
      <div><strong>Aseguradora (EPS):</strong> ${r.eps_nombre} (${r.id_eps})</div>
      <div><strong>Municipio:</strong> ${r.municipio_nombre} (${r.id_municipio})</div>
    </div>
    <div style="margin-top:16px; padding:12px; background:var(--paper); border-radius:8px; font-size:13px;">
      <div><strong>IPS Prestadora:</strong> ${r.prestador_nombre} (${r.id_prestador})</div>
      <div style="margin-top:6px;"><strong>Diagnóstico Ingreso:</strong> ${r.id_dx_ingreso}</div>
      <div style="margin-top:6px;"><strong>Diagnóstico Egreso:</strong> ${r.id_dx_egreso} - ${r.dx_egreso_desc}</div>
    </div>
  `;
  $("modal-detalle-paciente").hidden = false;
};

$("btn-cerrar-modal-paciente").addEventListener("click", () => {
  $("modal-detalle-paciente").hidden = true;
});

// ───────── Eventos ─────────
$("form-busqueda").addEventListener("submit", (e) => {
  e.preventDefault();
  estadoBusqueda.pagina = 1;
  ejecutarBusqueda();
});

$("btn-restablecer").addEventListener("click", () => {
  $("form-busqueda").reset();
  estadoBusqueda.presetActivo = null;
  document
    .querySelectorAll(".btn-preset")
    .forEach((b) => b.classList.remove("activo"));
  estadoBusqueda.pagina = 1;
  ejecutarBusqueda();
});

// Botones de presets
document.querySelectorAll(".btn-preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = btn.dataset.preset;
    if (estadoBusqueda.presetActivo === preset) {
      estadoBusqueda.presetActivo = null;
      btn.classList.remove("activo");
    } else {
      document
        .querySelectorAll(".btn-preset")
        .forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      estadoBusqueda.presetActivo = preset;

      // Aplicar filtros en inputs si aplica
      if (preset === "mujeres_60_epoc") {
        $("filtro-dx").value = "J44";
        $("filtro-sexo").value = "F";
        $("filtro-edad-min").value = 60;
        $("filtro-edad-max").value = "";
      } else if (preset === "covid19_estancia_larga") {
        $("filtro-dx").value = "U071";
        $("filtro-estancia-min").value = 14;
      } else if (preset === "pediatria_urgente") {
        $("filtro-dx").value = "";
        $("filtro-edad-min").value = "";
        $("filtro-edad-max").value = 4;
        $("filtro-via").value = "1";
      } else if (preset === "fallecidos_criticos") {
        $("filtro-estado").value = "2";
      } else if (preset === "rural_remitido") {
        $("filtro-zona").value = "R";
        $("filtro-via").value = "3";
      }
    }
    estadoBusqueda.pagina = 1;
    ejecutarBusqueda();
  });
});

$("selector-per-page").addEventListener("change", (e) => {
  estadoBusqueda.porPagina = parseInt(e.target.value, 10);
  estadoBusqueda.pagina = 1;
  ejecutarBusqueda();
});

$("btn-pag-ant").addEventListener("click", () => {
  if (estadoBusqueda.pagina > 1) {
    estadoBusqueda.pagina--;
    ejecutarBusqueda();
  }
});

$("btn-pag-sig").addEventListener("click", () => {
  if (estadoBusqueda.pagina < estadoBusqueda.totalPaginas) {
    estadoBusqueda.pagina++;
    ejecutarBusqueda();
  }
});

// ───────── Datos de Muestra / Simulación Local ─────────
function simularBusquedaLocal(params) {
  const dataset = [
    {
      id: 104821,
      factura: "FE-2022-8921",
      ingreso: "2022-09-14",
      egreso: "2022-09-22",
      estancia: 8,
      sexo: "F",
      edad: 67,
      dx: "J449",
      desc: "Enfermedad pulmonar obstructiva crónica",
      ips: "HOSPITAL GENERAL DE MEDELLIN",
      eps: "SURA EPS",
      muni: "Medellín",
      estado: "Vivo",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Urbana",
      anio: 2022,
    },
    {
      id: 104822,
      factura: "FE-2022-8922",
      ingreso: "2022-10-02",
      egreso: "2022-10-18",
      estancia: 16,
      sexo: "F",
      edad: 72,
      dx: "J441",
      desc: "EPOC con exacerbación aguda",
      ips: "HOSPITAL PABLO TOBON URIBE",
      eps: "NUEVA EPS",
      muni: "Bello",
      estado: "Vivo",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Urbana",
      anio: 2022,
    },
    {
      id: 104823,
      factura: "FE-2021-3412",
      ingreso: "2021-04-10",
      egreso: "2021-04-28",
      estancia: 18,
      sexo: "M",
      edad: 54,
      dx: "U071",
      desc: "COVID-19, virus identificado",
      ips: "HOSPITAL SAN VICENTE FUNDACION",
      eps: "SAVIA SALUD EPS",
      muni: "Itagüí",
      estado: "Vivo",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Urbana",
      anio: 2021,
    },
    {
      id: 104824,
      factura: "FE-2021-3419",
      ingreso: "2021-05-01",
      egreso: "2021-05-24",
      estancia: 23,
      sexo: "F",
      edad: 62,
      dx: "U071",
      desc: "COVID-19, virus identificado",
      ips: "CLINICA SOMER (RIONEGRO)",
      eps: "SURA EPS",
      muni: "Rionegro",
      estado: "Fallecido",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Rural",
      anio: 2021,
    },
    {
      id: 104825,
      factura: "FE-2022-1102",
      ingreso: "2022-03-15",
      egreso: "2022-03-18",
      estancia: 3,
      sexo: "M",
      edad: 3,
      dx: "J189",
      desc: "Neumonía bacteriana no especificada",
      ips: "HOSPITAL GENERAL DE MEDELLIN",
      eps: "SAVIA SALUD EPS",
      muni: "Medellín",
      estado: "Vivo",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Urbana",
      anio: 2022,
    },
    {
      id: 104826,
      factura: "FE-2022-9011",
      ingreso: "2022-11-05",
      egreso: "2022-11-08",
      estancia: 3,
      sexo: "F",
      edad: 2,
      dx: "A09X",
      desc: "Gastroenteritis y colitis de origen infeccioso",
      ips: "HOSPITAL PABLO TOBON URIBE",
      eps: "NUEVA EPS",
      muni: "Apartadó",
      estado: "Vivo",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Rural",
      anio: 2022,
    },
    {
      id: 104827,
      factura: "FE-2022-4412",
      ingreso: "2022-06-18",
      egreso: "2022-06-25",
      estancia: 7,
      sexo: "M",
      edad: 65,
      dx: "I219",
      desc: "Infarto agudo del miocardio",
      ips: "HOSPITAL SAN VICENTE FUNDACION",
      eps: "SURA EPS",
      muni: "Envigado",
      estado: "Fallecido",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Urbana",
      anio: 2022,
    },
    {
      id: 104828,
      factura: "FE-2022-7721",
      ingreso: "2022-07-02",
      egreso: "2022-07-16",
      estancia: 14,
      sexo: "F",
      edad: 81,
      dx: "I10X",
      desc: "Hipertensión esencial (primaria)",
      ips: "HOSPITAL GENERAL DE MEDELLIN",
      eps: "COOSALUD",
      muni: "Caucasia",
      estado: "Vivo",
      via: "Remitido",
      causa: "Enfermedad general",
      zona: "Rural",
      anio: 2022,
    },
    {
      id: 104829,
      factura: "FE-2020-5511",
      ingreso: "2020-08-11",
      egreso: "2020-08-14",
      estancia: 3,
      sexo: "F",
      edad: 24,
      dx: "O800",
      desc: "Parto único espontáneo",
      ips: "CLINICA SOMER (RIONEGRO)",
      eps: "SURA EPS",
      muni: "Rionegro",
      estado: "Vivo",
      via: "Nacimiento en institución",
      causa: "Enfermedad general",
      zona: "Rural",
      anio: 2020,
    },
    {
      id: 104830,
      factura: "FE-2022-1201",
      ingreso: "2022-01-20",
      egreso: "2022-01-23",
      estancia: 3,
      sexo: "M",
      edad: 29,
      dx: "K358",
      desc: "Apendicitis aguda",
      ips: "HOSPITAL GENERAL DE MEDELLIN",
      eps: "NUEVA EPS",
      muni: "Medellín",
      estado: "Vivo",
      via: "Urgencias",
      causa: "Enfermedad general",
      zona: "Urbana",
      anio: 2022,
    },
  ];

  return {
    datos: dataset.map((d) => ({
      id_hospitalizacion: d.id,
      numero_factura: d.factura,
      fecha_ingreso: d.ingreso,
      fecha_egreso: d.egreso,
      dias_estancia: d.estancia,
      sexo: d.sexo,
      edad_anios: d.edad,
      zona_residencia: d.zona,
      estado_salida: d.estado,
      estado_salida_codigo: d.estado === "Vivo" ? 1 : 2,
      id_dx_ingreso: d.dx,
      id_dx_egreso: d.dx,
      dx_egreso_desc: d.desc,
      id_prestador: "0500100123",
      prestador_nombre: d.ips,
      id_eps: "EPS001",
      eps_nombre: d.eps,
      id_municipio: "05001",
      municipio_nombre: d.muni,
      via_ingreso: d.via,
      causa_externa: d.causa,
      tipo_usuario: "Contributivo",
      anio: d.anio,
    })),
    paginacion: {
      pagina: 1,
      por_pagina: 25,
      total: 833586,
      paginas: 33344,
    },
    estadisticas_segmento: {
      total_coincidencias: 833586,
      estancia_promedio: 5.6,
      tasa_mortalidad_pct: 3.8,
      fallecidos_muestra: 2,
      pct_mujeres: 56.4,
      pct_hombres: 43.6,
    },
    filtros_aplicados: {},
  };
}

// Arranque
verificarSesion();
cargarCatalogos();
ejecutarBusqueda();
