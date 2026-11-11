(function () {
  const header = document.querySelector("header.nav");
  const links = Array.from(
    document.querySelectorAll("header nav a[data-section-link]")
  );
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!header || !links.length || !sections.length) {
    return;
  }

  function updateActiveLink() {
    const marker = window.scrollY + header.offsetHeight + 48;
    let activeSection = null;

    sections.forEach((section) => {
      if (section.getBoundingClientRect().top + window.scrollY <= marker) {
        activeSection = section;
      }
    });

    links.forEach((link) => {
      const isActive =
        activeSection !== null &&
        link.getAttribute("href") === `#${activeSection.id}`;

      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  let updatePending = false;
  function scheduleUpdate() {
    if (updatePending) {
      return;
    }

    updatePending = true;
    window.requestAnimationFrame(() => {
      updatePending = false;
      updateActiveLink();
    });
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("hashchange", scheduleUpdate);
  links.forEach((link) => link.addEventListener("click", scheduleUpdate));
  updateActiveLink();
})();
