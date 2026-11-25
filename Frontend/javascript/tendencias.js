const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const selectorAnio = document.getElementById("filtro-anio");
const errorPanel = document.getElementById("aviso-error");
let grafica;

async function cargarTendencias() {
  errorPanel.hidden = true;
  const parametros = new URLSearchParams({ anio: selectorAnio.value });

  try {
    const respuesta = await fetch(`${API_URL}/dashboard/tendencias?${parametros}`, {
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
      throw new Error(datos.error?.mensaje || "No se pudieron cargar las tendencias.");
    }

    for (const anio of datos.filtros.anios_disponibles) {
      if (![...selectorAnio.options].some((opcion) => opcion.value === String(anio))) {
        selectorAnio.add(new Option(anio, anio));
      }
    }
    const series = datos.mensual;
    // Un color distinto por año; si se elige un año, ese se resalta y los demás se atenúan
    const COLORES = ["#285c4d", "#d4a94b", "#5b8def", "#c2410c", "#7c3aed", "#0f766e"];
    const elegido = selectorAnio.value === "todos" ? null : Number(selectorAnio.value);
    const conjuntos = series.map((serie, i) => {
      const color = COLORES[i % COLORES.length];
      const atenuado = elegido !== null && serie.anio !== elegido;
      return {
        label: String(serie.anio),
        data: serie.meses,
        borderColor: atenuado ? `${color}40` : color,
        backgroundColor: atenuado ? `${color}40` : color,
        borderWidth: atenuado ? 1.5 : 3,
        pointRadius: atenuado ? 0 : 3,
        tension: 0.25,
      };
    });
    document.getElementById("sub-tendencias").textContent = elegido
      ? `Se resalta ${elegido}; los demás años quedan atenuados como referencia.`
      : "Compara el volumen mensual de hospitalizaciones entre los años disponibles.";
    document.getElementById("tipo-tendencias").textContent =
      "Gráfica de líneas: una serie por año (eje X: meses, eje Y: hospitalizaciones).";

    if (grafica) grafica.destroy();
    grafica = new Chart(document.getElementById("grafica-tendencias"), {
      type: "line",
      data: { labels: MESES, datasets: conjuntos },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        scales: { y: { beginAtZero: true, title: { display: true, text: "Hospitalizaciones" } } },
        plugins: { legend: { labels: { usePointStyle: true } } },
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
