(function () {
  const dataCounters = document.querySelectorAll("[data-count-up]");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  dataCounters.forEach((element) => {
    const target = Number(element.dataset.countUp);
    const numberFormat = new Intl.NumberFormat("es-CO", {
      useGrouping: element.dataset.countFormat !== "year",
    });

    if (!Number.isFinite(target)) {
      console.error("HealthView: a data counter has an invalid target.", element);
      return;
    }

    if (reducedMotion) {
      element.textContent = numberFormat.format(target);
      return;
    }

    const duration = 1400;
    let startedAt;
    element.textContent = numberFormat.format(0);

    function update(now) {
      startedAt ??= now;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const value = progress === 1 ? target : Math.floor(target * eased);

      element.textContent = numberFormat.format(value);

      if (progress < 1) {
        window.requestAnimationFrame(update);
      }
    }

    window.requestAnimationFrame(update);
  });

  const root = document.getElementById("metricas-react");

  if (!root || !window.React || !window.ReactDOM) {
    console.error("HealthView: React metrics could not be mounted.");
    return;
  }

  const h = window.React.createElement;
  const numberFormat = new Intl.NumberFormat("es-CO");
  const decimalFormat = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  function MetricCard({ label, target, suffix = "", decimals = 0 }) {
    const [value, setValue] = window.React.useState(0);

    window.React.useEffect(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setValue(target);
        return undefined;
      }

      const duration = 1400;
      const startedAt = performance.now();
      let frameId;

      function update(now) {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        setValue(progress === 1 ? target : target * eased);

        if (progress < 1) {
          frameId = window.requestAnimationFrame(update);
        }
      }

      frameId = window.requestAnimationFrame(update);
      return () => window.cancelAnimationFrame(frameId);
    }, [target]);

    const formattedValue =
      decimals > 0
        ? decimalFormat.format(value)
        : numberFormat.format(Math.floor(value));

    return h(
      "div",
      null,
      label,
      h("b", null, `${formattedValue}${suffix}`)
    );
  }

  const metrics = [
    { label: "Hospitalizaciones", target: 833586 },
    { label: "Estancia promedio", target: 4.8, suffix: " días", decimals: 1 },
  ];

  const application = window.ReactDOM.createRoot(root);
  application.render(
    h(
      window.React.Fragment,
      null,
      ...metrics.map((metric) =>
        h(MetricCard, { ...metric, key: metric.label })
      )
    )
  );
})();
