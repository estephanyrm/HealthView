// Tarjetas del equipo (Quiénes somos): clic o Enter/Espacio para girar y ver la foto.
(function () {
  document.querySelectorAll(".person").forEach(function (person) {
    var card = person.querySelector(".person__card");
    var front = person.querySelector(".person__front");
    var back = person.querySelector(".person__back");
    if (!card || !front || !back) return;

    function girar() {
      var volteada = person.classList.toggle("is-flipped");
      // La cara oculta no recibe foco ni la leen los lectores de pantalla.
      front.inert = volteada;
      back.inert = !volteada;
      card.setAttribute(
        "aria-label",
        volteada
          ? "Foto de la persona. Presiona Enter para volver."
          : card.dataset.label
      );
    }

    card.dataset.label = card.getAttribute("aria-label");

    card.addEventListener("click", function (e) {
      // Los enlaces (GitHub, LinkedIn) funcionan normal, sin girar la tarjeta.
      if (e.target.closest("a")) return;
      girar();
    });

    card.addEventListener("keydown", function (e) {
      if (e.target !== card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        girar();
      }
    });
  });
})();