// ==========================================================================
// HealthView - Utilidades de interfaz compartidas (ui.js)
//  · HVNotificar: mensajes, confirmaciones y avisos con SweetAlert2.
//  · HVRoles: insignias de color para distinguir los roles.
// Requiere SweetAlert2 cargado antes (CDN). Si no carga, usa alert/confirm.
// ==========================================================================
(() => {
  const VERDE = "#285c4d";
  const ROJO = "#b42318";

  const escapar = (t) => {
    const d = document.createElement("div");
    d.textContent = t ?? "";
    return d.innerHTML;
  };
  const haySwal = () => typeof window.Swal !== "undefined";

  // ───────── Notificaciones ─────────
  const base = { confirmButtonColor: VERDE, cancelButtonColor: "#6b7a74", focusConfirm: true };

  const HVNotificar = {
    exito(texto, titulo = "¡Listo!") {
      if (!haySwal()) { alert(texto); return Promise.resolve(); }
      return Swal.fire({ ...base, icon: "success", title: titulo, text: texto, confirmButtonText: "Aceptar" });
    },
    error(texto, { titulo = "Ocurrió un problema", reintentar } = {}) {
      if (!haySwal()) { alert(texto); return Promise.resolve(); }
      return Swal.fire({
        ...base, icon: "error", title: titulo, text: texto,
        confirmButtonColor: ROJO,
        confirmButtonText: reintentar ? "Reintentar" : "Entendido",
        showCancelButton: Boolean(reintentar), cancelButtonText: "Cerrar",
      }).then((r) => { if (reintentar && r.isConfirmed) reintentar(); });
    },
    aviso(texto, titulo = "Atención") {
      if (!haySwal()) { alert(texto); return Promise.resolve(); }
      return Swal.fire({ ...base, icon: "warning", title: titulo, text: texto, confirmButtonText: "Entendido" });
    },
    info(texto, titulo = "Información") {
      if (!haySwal()) { alert(texto); return Promise.resolve(); }
      return Swal.fire({ ...base, icon: "info", title: titulo, text: texto, confirmButtonText: "Aceptar" });
    },
    // Aviso pequeño que se cierra solo (para confirmaciones leves)
    toast(texto, icono = "success") {
      if (!haySwal()) return Promise.resolve();
      return Swal.fire({
        toast: true, position: "top-end", icon: icono, title: texto,
        showConfirmButton: false, timer: 3500, timerProgressBar: true,
      });
    },
    // Devuelve Promise<boolean>
    confirmar({ titulo = "¿Estás seguro?", texto = "", confirmar = "Sí, continuar", peligro = false } = {}) {
      if (!haySwal()) return Promise.resolve(window.confirm(texto || titulo));
      return Swal.fire({
        ...base, icon: "question", title: titulo, text: texto,
        showCancelButton: true, confirmButtonText: confirmar, cancelButtonText: "Cancelar",
        confirmButtonColor: peligro ? ROJO : VERDE, reverseButtons: true,
      }).then((r) => r.isConfirmed);
    },
    // Devuelve Promise<string|null> con el rol elegido
    elegirRol(nombre, rolActual) {
      const roles = Object.keys(HVRoles.info);
      if (!haySwal()) {
        const v = window.prompt(`Rol para ${nombre} (${roles.join(", ")}):`, rolActual);
        return Promise.resolve(v && roles.includes(v.trim()) ? v.trim() : null);
      }
      return Swal.fire({
        ...base, title: "Cambiar rol",
        html: `Usuario: <b>${escapar(nombre)}</b><br>Rol actual: ${HVRoles.html(rolActual)}`,
        input: "select",
        inputOptions: Object.fromEntries(roles.map((r) => [r, `${r} — ${HVRoles.info[r].acceso}`])),
        inputValue: rolActual,
        showCancelButton: true, confirmButtonText: "Guardar rol", cancelButtonText: "Cancelar",
        reverseButtons: true,
      }).then((r) => (r.isConfirmed ? r.value : null));
    },
  };

  // ───────── Roles ─────────
  const HVRoles = {
    info: {
      Administrador: { clase: "rol-administrador", acceso: "Todos los módulos y administración" },
      Analista: { clase: "rol-analista", acceso: "Panel, mapa, búsqueda y reportes" },
      Investigador: { clase: "rol-investigador", acceso: "Panel y mapa" },
      Médico: { clase: "rol-medico", acceso: "Panel y alertas" },
    },
    clase(rol) {
      return HVRoles.info[rol]?.clase || "rol-otro";
    },
    html(rol) {
      const acceso = HVRoles.info[rol]?.acceso;
      const title = acceso ? ` title="${escapar(acceso)}"` : "";
      return `<span class="rol-badge ${HVRoles.clase(rol)}"${title}>${escapar(rol)}</span>`;
    },
    // Convierte un elemento cuyo texto es un rol en una insignia de color
    aplicar(el) {
      const rol = el.textContent.trim();
      if (!HVRoles.info[rol]) return;
      el.className = `rol-badge ${HVRoles.clase(rol)}`;
      el.title = HVRoles.info[rol].acceso;
    },
  };

  // Los scripts de cada página escriben el rol en #usuario-rol; lo marcamos al aparecer.
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("usuario-rol");
    if (!el) return;
    HVRoles.aplicar(el);
    new MutationObserver(() => HVRoles.aplicar(el)).observe(el, { childList: true, characterData: true, subtree: true });
  });

  window.HVNotificar = HVNotificar;
  window.HVRoles = HVRoles;
})();
