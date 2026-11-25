const API_URL = "http://127.0.0.1:5000/api";

document.getElementById("btn-salir").addEventListener("click", async () => {
  try {
    const respuesta = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!respuesta.ok) {
      throw new Error("No se pudo cerrar la sesión en el servidor.");
    }
  } catch (error) {
    console.error(error);
  } finally {
    sessionStorage.removeItem("usuario");
    window.location.href = "login.html";
  }
});
