(() => {
  window.healthViewAuthorized = false;

  const permisos = {
    "dashboard.html": ["Administrador", "Analista", "Investigador", "Médico"],
    "mapa.html": ["Administrador", "Analista", "Investigador"],
    "busqueda.html": ["Administrador", "Analista"],
    "reportes.html": ["Administrador", "Analista"],
    "alertas.html": ["Administrador", "Médico"],
    "tendencias.html": ["Administrador", "Analista"],
    "comparador.html": ["Administrador"],
    "prediccion.html": ["Administrador"],
    "usuarios.html": ["Administrador"],
    "crear-usuario.html": ["Administrador"],
    "registros.html": ["Administrador"],
    "configuracion.html": ["Administrador"],
  };
  const pagina = window.location.pathname.split("/").pop();
  let usuario;

  try {
    usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  } catch {
    sessionStorage.removeItem("usuario");
  }

  if (!usuario) {
    window.location.replace("login.html");
    return;
  }

  if (!permisos[pagina] || !permisos[pagina].includes(usuario.rol)) {
    const paginaInicio = permisos["dashboard.html"].includes(usuario.rol)
      ? "dashboard.html"
      : "login.html";
    window.location.replace(paginaInicio);
    return;
  }

  const nombre = document.getElementById("usuario-nombre");
  const rol = document.getElementById("usuario-rol");
  if (nombre) nombre.textContent = usuario.nombre;
  if (rol) rol.textContent = usuario.rol;

  document.querySelectorAll("nav a[href]").forEach((enlace) => {
    const destino = enlace.getAttribute("href").split("/").pop();
    const rolesPermitidos = permisos[destino];
    if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
      enlace.hidden = true;
    }
  });

  const navegacionAdmin = document.getElementById("nav-admin");
  if (navegacionAdmin) {
    navegacionAdmin.hidden = usuario.rol !== "Administrador";
  }
  window.healthViewAuthorized = true;
})();
