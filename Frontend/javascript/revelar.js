(function () {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reducedMotion) {
    return;
  }

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
