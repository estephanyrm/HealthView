const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const selectorAnio = document.getElementById("filtro-anio");
const errorPanel = document.getElementById("aviso-error");
let grafica;

async function cargarTendencias() {
  errorPanel.hidden = true;
  const parametros = new URLSearchParams({ anio: selectorAnio.value });

  try {
    const respuesta = await fetch(`${API_URL}/dashboard?${parametros}`, {
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
      throw new Error(datos.error?.mensaje || "No se pudieron cargar las tendencias.");
    }

    for (const anio of datos.filtros.anios_disponibles) {
      if (![...selectorAnio.options].some((opcion) => opcion.value === String(anio))) {
        selectorAnio.add(new Option(anio, anio));
      }
    }
    const series = datos.mensual;
    const conjuntos = series.map((serie) => ({
      label: String(serie.anio),
      data: serie.meses,
      borderColor: serie.anio === Number(selectorAnio.value) ? "#285c4d" : "#8fb3a5",
      backgroundColor: "transparent",
      tension: 0.25,
    }));

    if (grafica) grafica.destroy();
    grafica = new Chart(document.getElementById("grafica-tendencias"), {
      type: "line",
      data: { labels: MESES, datasets: conjuntos },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        scales: { y: { beginAtZero: true } },
      },
    });
  } catch (error) {
    document.getElementById("aviso-error-texto").textContent =
      error instanceof TypeError
        ? "No se pudo conectar con el servidor. Verifica que la API esté encendida."
        : error.message;
    errorPanel.hidden = false;
  }
}

selectorAnio.addEventListener("change", cargarTendencias);
document.getElementById("btn-reintentar").addEventListener("click", cargarTendencias);
cargarTendencias();
