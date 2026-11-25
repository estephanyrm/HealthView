(function () {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reducedMotion) {
    return;
  }

  const bloquesDeTexto =
    "h1, h2, h3, p, li, a, button, .mods > div, .role, .person, .facts > div, footer .wrap > span";

  function iniciarEscritura() {
    const caracteresPorBloque = new Map();
    const filtro = {
      acceptNode(nodo) {
        const elemento = nodo.parentElement;
        if (
          !elemento ||
          !nodo.textContent.trim() ||
          elemento.closest(
            "script, style, noscript, canvas, .page-loader, #metricas-react, [data-count-up], [aria-hidden='true']"
          ) ||
          !elemento.closest(bloquesDeTexto)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    };
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      filtro
    );
    const nodosTexto = [];
    while (walker.nextNode()) {
      nodosTexto.push(walker.currentNode);
    }

    nodosTexto.forEach((nodo) => {
      const bloque = nodo.parentElement.closest(bloquesDeTexto);
      // Un solo contenedor por texto: así, dentro de elementos flex
      // (etiquetas, botones) las letras no se separan ni pierden espacios.
      const fragmento = document.createElement("span");
      fragmento.className = "texto-escribiendo";
      const caracteres = [];

      Array.from(nodo.textContent).forEach((caracter) => {
        if (/\s/u.test(caracter)) {
          fragmento.append(document.createTextNode(caracter));
          return;
        }
        const letra = document.createElement("span");
        letra.className = "letra-escribiendo";
        letra.textContent = caracter;
        caracteres.push(letra);
        fragmento.append(letra);
      });

      nodo.replaceWith(fragmento);
      if (caracteres.length) {
        caracteresPorBloque.set(
          bloque,
          (caracteresPorBloque.get(bloque) || []).concat(caracteres)
        );
      }
    });

    function escribirBloque(bloque, letras) {
      bloque.classList.add("escribiendo");
      letras.forEach((letra, indice) => {
        window.setTimeout(() => letra.classList.add("visible"), indice * 18);
      });
      window.setTimeout(
        () => bloque.classList.remove("escribiendo"),
        letras.length * 18 + 450
      );
    }

    if (!("IntersectionObserver" in window)) {
      caracteresPorBloque.forEach((letras, bloque) =>
        escribirBloque(bloque, letras)
      );
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          observador.unobserve(entrada.target);
          escribirBloque(
            entrada.target,
            caracteresPorBloque.get(entrada.target) || []
          );
        });
      },
      { threshold: 0.1 }
    );
    caracteresPorBloque.forEach((_, bloque) => observador.observe(bloque));
  }

  document.addEventListener("healthview:page-ready", iniciarEscritura, {
    once: true,
  });

  const targets = document.querySelectorAll(
    "header .brand, header nav a, main .hero .wrap > div, main .preview h3, main .pk > div, main section .wrap > h2, main section .wrap > .lead, main section .split > div, main .solution, main .problem > li, main section .mods > div, main section .roles > .role, main section .facts > div, main section .about-logo, main section .team > .person, main section .team + p, main .cta .wrap > *, footer .wrap > span"
  );

  if (!targets.length) {
    return;
  }

  const groupIndexes = new WeakMap();
  document.documentElement.classList.add("reveal-ready");

  targets.forEach((element) => {
    const group =
      element.closest("section, .hero, .cta, header, footer") ||
      element.parentElement;
    const index = groupIndexes.get(group) || 0;
    groupIndexes.set(group, index + 1);
    element.dataset.reveal = "";
    element.style.setProperty(
      "--reveal-delay",
      `${Math.min(index, 7) * 55}ms`
    );
  });

  function updateVisibility() {
    targets.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      const isInViewport = bounds.bottom > 0 && bounds.top < window.innerHeight;
      element.classList.toggle("is-visible", isInViewport);
    });
  }

  window.addEventListener("scroll", updateVisibility, {
    passive: true,
  });
  window.addEventListener("resize", updateVisibility, {
    passive: true,
  });
  updateVisibility();
})();