// ==========================================================================
// HealthView - Sesión con JWT y permisos por rol (auth.js)
//  · Expone window.HVAuth (API_URL, token, usuario, guardarSesion, cerrarSesion, puedeVer…).
//  · Adjunta "Authorization: Bearer <JWT>" a todo fetch() dirigido a la API.
//  · Aplica la matriz de permisos por rol (la misma que muestra Configuración):
//      - oculta en toda la página los enlaces a módulos que el rol no puede abrir;
//      - si la página no está permitida para el rol, redirige al Panel con un aviso.
//  · data-requiere en el <script>: "sesion" (cualquier rol con sesión), "admin" o
//    "token" (solo exige token: cambio de contraseña temporal). Sin data-requiere no
//    se protege la página (login), pero igualmente se ocultan los enlaces no permitidos.
// La seguridad real la aplica la API, que valida el JWT y el rol en cada petición.
// ==========================================================================
(function () {
  const API_URL = window.HV_API_URL || "http://127.0.0.1:5000/api";
  const K_TOKEN = "hv_token";
  const K_TOKEN_ANTIGUO = "token"; // nombre usado por versiones anteriores
  const K_USUARIO = "usuario";
  const ROL_ADMIN = "Administrador";
  const fetchOriginal = window.fetch.bind(window);

  // ───────── Matriz de permisos (debe coincidir con la API) ─────────
  const ADMIN = "Administrador", ANALISTA = "Analista", INVESTIGADOR = "Investigador", MEDICO = "Médico";
  const TODOS = [ADMIN, ANALISTA, INVESTIGADOR, MEDICO];
  const PERMISOS = {
    "dashboard.html": TODOS,                          // Panel inteligente
    "tendencias.html": [ADMIN, ANALISTA],
    "mapa.html": [ADMIN, ANALISTA, INVESTIGADOR],     // Mapa epidemiológico
    "alertas.html": [ADMIN, MEDICO],
    "busqueda.html": [ADMIN, ANALISTA],               // Búsqueda y filtros
    "reportes.html": [ADMIN, ANALISTA],
    "comparador.html": [ADMIN],                       // Comparador y predicción
    "prediccion.html": [ADMIN],
    "modulos.html": [ADMIN],
    "usuarios.html": [ADMIN],                         // Usuarios, registros y configuración
    "crear-usuario.html": [ADMIN],
    "registros.html": [ADMIN],
    "configuracion.html": [ADMIN],
  };
  const paginaDe = (ruta) => String(ruta || "").split(/[?#]/)[0].split("/").pop();
  const puedeVer = (pagina, rol) => !PERMISOS[pagina] || PERMISOS[pagina].includes(rol);

  // ───────── Sesión ─────────
  if (!sessionStorage.getItem(K_TOKEN) && sessionStorage.getItem(K_TOKEN_ANTIGUO)) {
    sessionStorage.setItem(K_TOKEN, sessionStorage.getItem(K_TOKEN_ANTIGUO));
    sessionStorage.removeItem(K_TOKEN_ANTIGUO);
  }
  const token = () => sessionStorage.getItem(K_TOKEN);

  function usuario() {
    try {
      return JSON.parse(sessionStorage.getItem(K_USUARIO) || "null");
    } catch (error) {
      sessionStorage.removeItem(K_USUARIO);
      return null;
    }
  }

  function guardarSesion(nuevoToken, datosUsuario) {
    if (nuevoToken) sessionStorage.setItem(K_TOKEN, nuevoToken);
    if (datosUsuario) sessionStorage.setItem(K_USUARIO, JSON.stringify(datosUsuario));
  }

  function limpiarSesion() {
    [K_TOKEN, K_TOKEN_ANTIGUO, K_USUARIO].forEach((k) => sessionStorage.removeItem(k));
  }

  function decodificar(jwt) {
    try {
      const base64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(base64));
    } catch (error) {
      return null;
    }
  }

  function tokenVigente() {
    const jwt = token();
    if (!jwt) return false;
    const payload = decodificar(jwt);
    return Boolean(payload && (!payload.exp || payload.exp * 1000 > Date.now()));
  }

  function irA(pagina) {
    document.documentElement.style.visibility = "hidden";
    window.location.replace(pagina);
  }

  function irALogin() {
    limpiarSesion();
    irA("login.html");
  }

  function cerrarSesion() {
    fetchOriginal(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    })
      .catch(() => {})
      .finally(irALogin);
  }

  // ───────── fetch con JWT automático ─────────
  window.fetch = async function (input, init) {
    const url = String(input instanceof Request ? input.url : input instanceof URL ? input.href : input);
    if (!url.startsWith(API_URL)) return fetchOriginal(input, init);

    const opciones = Object.assign({}, init);
    const cabeceras = new Headers(opciones.headers || (input instanceof Request ? input.headers : {}));
    if (token() && !cabeceras.has("Authorization")) {
      cabeceras.set("Authorization", `Bearer ${token()}`);
    }
    opciones.headers = cabeceras;

    const respuesta = await fetchOriginal(input, opciones);
    if (respuesta.status === 401 && !url.startsWith(`${API_URL}/auth/login`)) {
      irALogin();
    }
    return respuesta;
  };

  window.HVAuth = {
    API_URL,
    ROL_ADMIN,
    PERMISOS,
    token,
    usuario,
    guardarSesion,
    limpiarSesion,
    cerrarSesion,
    esAdmin: () => (usuario() || {}).rol === ROL_ADMIN,
    puedeVer: (pagina) => puedeVer(paginaDe(pagina), (usuario() || {}).rol),
  };

  // ───────── Vista según el rol ─────────
  // Oculta todos los enlaces internos a módulos no permitidos (menú lateral y contenido)
  function aplicarVistaPorRol() {
    const rol = (usuario() || {}).rol;
    if (!rol) return;
    document.querySelectorAll("a[href]").forEach((enlace) => {
      const destino = paginaDe(enlace.getAttribute("href"));
      if (PERMISOS[destino] && !puedeVer(destino, rol)) enlace.hidden = true;
    });
    // Grupo "Administración" del menú: solo para Administrador
    const grupoAdmin = document.getElementById("nav-admin");
    if (grupoAdmin) grupoAdmin.hidden = rol !== ROL_ADMIN;
    // Títulos de grupo del menú que quedaron sin enlaces visibles
    document.querySelectorAll(".sidebar-group").forEach((grupo) => {
      const visibles = [...grupo.querySelectorAll("a[href]")].some((a) => !a.hidden);
      grupo.hidden = !visibles;
    });
    // Aviso al llegar redirigido por falta de permisos
    if (new URLSearchParams(location.search).get("acceso") === "denegado") {
      history.replaceState(null, "", location.pathname);
      const texto = "Tu rol no tiene acceso a ese módulo. Te llevamos al Panel inteligente.";
      if (window.HVNotificar) HVNotificar.toast(texto, "warning");
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarVistaPorRol);
  } else {
    aplicarVistaPorRol();
  }

  // ───────── Protección de la página ─────────
  const requiere = document.currentScript && document.currentScript.dataset.requiere;
  const paginaActual = paginaDe(window.location.pathname);
  const actual = usuario();

  // Páginas internas cargadas sin data-requiere (versiones antiguas): se protegen igual
  if (!requiere) {
    if (PERMISOS[paginaActual] && actual && !puedeVer(paginaActual, actual.rol)) {
      irA("dashboard.html?acceso=denegado");
    }
    return;
  }

  const sinPermiso = (rol) =>
    (requiere === "admin" && rol !== ROL_ADMIN) ||
    (requiere !== "token" && !puedeVer(paginaActual, rol));

  document.documentElement.style.visibility = "hidden";
  const mostrar = () => (document.documentElement.style.visibility = "");

  if (!tokenVigente() || !actual) return irALogin();
  if (requiere !== "token" && actual.debe_cambiar_clave) return irA("cambiar-clave.html");
  if (sinPermiso(actual.rol)) return irA("dashboard.html?acceso=denegado");

  // El rol se confirma con la API (pudo cambiar mientras la sesión estaba abierta)
  fetch(`${API_URL}/auth/me`)
    .then(async (respuesta) => {
      if (respuesta.status === 401) return;
      if (!respuesta.ok) return mostrar();
      const datos = await respuesta.json();
      guardarSesion(token(), datos.usuario);
      if (requiere !== "token" && datos.usuario.debe_cambiar_clave) {
        return irA("cambiar-clave.html");
      }
      if (sinPermiso(datos.usuario.rol)) {
        return irA("dashboard.html?acceso=denegado");
      }
      aplicarVistaPorRol();
      mostrar();
    })
    .catch(mostrar);
})();
