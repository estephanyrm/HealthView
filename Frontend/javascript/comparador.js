const selectorAnio = document.getElementById("filtro-anio");
const selectorA = document.getElementById("municipio-a");
const selectorB = document.getElementById("municipio-b");
const resultado = document.getElementById("resultado-comparacion");
const errorPanel = document.getElementById("aviso-error");
let municipios = [];

const nombreDe = (m) => m.nombre || `Municipio ${m.id_municipio}`;

async function cargarMunicipios() {
  errorPanel.hidden = true;
  // /api/mapa puede tardar la primera vez (luego queda en caché): se avisa en vez de dejar la lista vacía
  [selectorA, selectorB].forEach((s) => {
    s.disabled = true;
    s.options[0].textContent = "Cargando municipios…";
  });
  resultado.innerHTML = "<p>Cargando datos de los municipios… la primera consulta puede tardar unos segundos.</p>";
  try {
    const respuesta = await fetch(`${API_URL}/mapa/comparador/municipios?anio=${encodeURIComponent(selectorAnio.value)}`, {
      credentials: "include",
    });
    if (respuesta.status === 401) {
      sessionStorage.removeItem("usuario");
      window.location.replace("login.html");
      return;
    }
    if (respuesta.status === 403) {
      window.location.replace("dashboard.html?acceso=denegado");
      return;
    }
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos.error?.mensaje || "No se pudieron cargar los municipios.");
    }
    municipios = datos.municipios;

    if (!selectorAnio.dataset.cargado) {
      datos.filtros.anios_disponibles.forEach((anio) => selectorAnio.add(new Option(anio, anio)));
      selectorAnio.dataset.cargado = "true";
    }
    [selectorA, selectorB].forEach((selector) => {
      const seleccionado = selector.value;
      selector.replaceChildren(new Option("Selecciona un municipio", ""));
      [...municipios]
        // Primero los municipios con nombre (orden alfabético); al final los que no tienen nombre en la BD
        .sort((a, b) => {
          const sa = nombreDe(a).startsWith("Municipio sin nombre"), sb = nombreDe(b).startsWith("Municipio sin nombre");
          return sa - sb || nombreDe(a).localeCompare(nombreDe(b), "es");
        })
        .forEach((municipio) =>
          selector.add(new Option(`${nombreDe(municipio)} (${municipio.hospitalizaciones.toLocaleString("es-CO")})`, municipio.id_municipio)));
      selector.value = seleccionado;
    });
    comparar();
  } catch (error) {
    resultado.innerHTML = "<p>No se pudieron cargar los municipios.</p>";
    document.getElementById("aviso-error-texto").textContent =
      error instanceof TypeError
        ? "No se pudo conectar con el servidor. Verifica que la API esté encendida."
        : error.message;
    errorPanel.hidden = false;
  } finally {
    [selectorA, selectorB].forEach((s) => {
      s.disabled = false;
      s.options[0].textContent = "Selecciona un municipio";
    });
  }
}

function comparar() {
  const a = municipios.find((municipio) => municipio.id_municipio === selectorA.value);
  const b = municipios.find((municipio) => municipio.id_municipio === selectorB.value);
  if (!a || !b) {
    resultado.textContent = "Selecciona los dos municipios para ver el resultado.";
    return;
  }
  if (a.id_municipio === b.id_municipio) {
    resultado.textContent = "Selecciona dos municipios diferentes.";
    return;
  }

  const formato = (valor, decimales = 0) =>
    Number(valor).toLocaleString("es-CO", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  const tarjeta = (municipio) => `
        <article class="tarjeta">
          <h2>${escapar(nombreDe(municipio))}</h2>
          <p class="subtitulo">${escapar(municipio.departamento || "")} · código ${escapar(municipio.id_municipio)}</p>
          <p>Hospitalizaciones: <strong>${formato(municipio.hospitalizaciones)}</strong></p>
          <p>Estancia promedio: <strong>${formato(municipio.estancia_promedio, 1)} días</strong></p>
          <p>Mortalidad: <strong>${formato(municipio.mortalidad, 2)} %</strong></p>
        </article>`;
  // Diferencias de A respecto a B
  const dif = (va, vb, dec, unidad) => {
    const d = va - vb;
    const signo = d > 0 ? "+" : d < 0 ? "−" : "±";
    return `${signo}${formato(Math.abs(d), dec)}${unidad}`;
  };
  const veces = b.hospitalizaciones ? (a.hospitalizaciones / b.hospitalizaciones) : null;
  resultado.innerHTML = `${tarjeta(a)}${tarjeta(b)}
        <article class="tarjeta">
          <h2>Diferencia (A − B)</h2>
          <p class="subtitulo">${escapar(nombreDe(a))} frente a ${escapar(nombreDe(b))}</p>
          <p>Hospitalizaciones: <strong>${dif(a.hospitalizaciones, b.hospitalizaciones, 0, "")}</strong>${
            veces ? ` (${formato(veces, 2)} veces)` : ""}</p>
          <p>Estancia promedio: <strong>${dif(a.estancia_promedio, b.estancia_promedio, 1, " días")}</strong></p>
          <p>Mortalidad: <strong>${dif(a.mortalidad, b.mortalidad, 2, " pts")}</strong></p>
        </article>`;
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (caracter) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter],
  );
}

selectorAnio.addEventListener("change", cargarMunicipios);
selectorA.addEventListener("change", comparar);
selectorB.addEventListener("change", comparar);
document.getElementById("btn-reintentar").addEventListener("click", cargarMunicipios);
cargarMunicipios();
