// ==========================================================================
// HealthView - Sesión con JWT (auth.js)
// Se carga en el <head> de cada página, ANTES del script de la página:
//   <script src="../javascript/auth.js" data-requiere="admin"></script>
// data-requiere:  "admin"  -> solo rol Administrador
//                 "sesion" -> cualquier usuario autenticado
//                 "token"  -> token válido, aunque tenga clave temporal (cambiar-clave)
//                 (sin atributo) -> página pública (login): solo expone HVAuth
//
// IMPORTANTE: esto es control de INTERFAZ (evita mostrar pantallas que no
// corresponden). La seguridad real la aplica el backend, que valida el JWT y el
// rol en base de datos en cada petición.
// ==========================================================================
(function () {
  const API_URL = "http://127.0.0.1:5000/api";
  const K_TOKEN = "hv_token";
  const K_USUARIO = "usuario";
  const ROL_ADMIN = "Administrador";

  const fetchOriginal = window.fetch.bind(window);

  const token = () => sessionStorage.getItem(K_TOKEN);

  function usuario() {
    try {
      return JSON.parse(sessionStorage.getItem(K_USUARIO) || "null");
    } catch (e) {
      return null;
    }
  }

  function guardarSesion(nuevoToken, datosUsuario) {
    sessionStorage.setItem(K_TOKEN, nuevoToken);
    sessionStorage.setItem(K_USUARIO, JSON.stringify(datosUsuario));
  }

  function limpiarSesion() {
    sessionStorage.removeItem(K_TOKEN);
    sessionStorage.removeItem(K_USUARIO);
  }

  function decodificar(t) {
    try {
      const b64 = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(b64));
    } catch (e) {
      return null;
    }
  }

  function tokenVigente() {
    const t = token();
    if (!t) return false;
    const payload = decodificar(t);
    return !!payload && (!payload.exp || payload.exp * 1000 > Date.now());
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

  // Agrega "Authorization: Bearer <token>" a toda petición hacia la API y
  // devuelve al login si el servidor responde 401 (token ausente, vencido o inválido).
  window.fetch = async function (input, init) {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith(API_URL)) return fetchOriginal(input, init);

    const opciones = Object.assign({}, init);
    const cabeceras = new Headers(opciones.headers || {});
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
    token,
    usuario,
    guardarSesion,
    limpiarSesion,
    cerrarSesion,
    esAdmin: () => (usuario() || {}).rol === ROL_ADMIN,
  };

  // ───────── Guarda de página ─────────
  const requiere = document.currentScript && document.currentScript.dataset.requiere;
  if (!requiere) return;

  // Se oculta la página hasta confirmar la sesión, para que no se vea ni un instante.
  document.documentElement.style.visibility = "hidden";
  const mostrar = () => (document.documentElement.style.visibility = "");

  const u = usuario();
  if (!tokenVigente() || !u) return irALogin();
  if (requiere !== "token" && u.debe_cambiar_clave) return irA("cambiar-clave.html");
  if (requiere === "admin" && u.rol !== ROL_ADMIN) return irA("dashboard.html");

  // Confirmación con el servidor: el rol/estado reales vienen de la BD, no del navegador.
  fetch(`${API_URL}/auth/me`)
    .then(async (r) => {
      if (r.status === 401) return; // el interceptor ya redirigió al login
      if (!r.ok) return mostrar();
      const datos = await r.json();
      guardarSesion(token(), datos.usuario);
      if (requiere !== "token" && datos.usuario.debe_cambiar_clave) return irA("cambiar-clave.html");
      if (requiere === "admin" && datos.usuario.rol !== ROL_ADMIN) return irA("dashboard.html");
      mostrar();
    })
    // Si la API no responde se muestra la página, pero sin datos: el backend sigue protegiéndolos.
    .catch(mostrar);
})();
