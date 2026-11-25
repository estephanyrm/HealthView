const selectorAnio = document.getElementById("filtro-anio");
const selectorA = document.getElementById("municipio-a");
const selectorB = document.getElementById("municipio-b");
const resultado = document.getElementById("resultado-comparacion");
const errorPanel = document.getElementById("aviso-error");
let municipios = [];

async function cargarMunicipios() {
  errorPanel.hidden = true;
  try {
    const respuesta = await fetch(`${API_URL}/mapa?anio=${encodeURIComponent(selectorAnio.value)}`, {
      credentials: "include",
    });
    if (respuesta.status === 401) {
      sessionStorage.removeItem("usuario");
      window.location.replace("login.html");
      return;
    }
    if (respuesta.status === 403) {
      window.location.replace("dashboard.html");
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
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        .forEach((municipio) => selector.add(new Option(municipio.nombre, municipio.id_municipio)));
      selector.value = seleccionado;
    });
    comparar();
  } catch (error) {
    HVNotificar.error(
      error instanceof TypeError
        ? "No se pudo conectar con el servidor. Verifica que la API esté encendida."
        : error.message,
      { reintentar: cargarMunicipios },
    );
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
  resultado.innerHTML = [a, b]
    .map(
      (municipio) => `
        <article class="tarjeta">
          <h2>${escapar(municipio.nombre)}</h2>
          <p>Hospitalizaciones: <strong>${formato(municipio.hospitalizaciones)}</strong></p>
          <p>Estancia promedio: <strong>${formato(municipio.estancia_promedio, 1)} días</strong></p>
          <p>Mortalidad: <strong>${formato(municipio.mortalidad, 2)} %</strong></p>
        </article>`,
    )
    .join("");
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
