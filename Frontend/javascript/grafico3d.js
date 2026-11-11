(function () {
  const container = document.getElementById("three-container");
  const status = document.getElementById("capacity-status");
  const toggles = Array.from(document.querySelectorAll(".layer-toggle"));

  if (!container || !status) {
    return;
  }

  function showUnavailable(message) {
    status.textContent = message;
    toggles.forEach((toggle) => {
      toggle.disabled = true;
    });
  }

  if (!window.THREE) {
    showUnavailable("No se pudo cargar la visualización 3D.");
    console.error("HealthView: Three.js did not load; the 3D visualization is unavailable.");
    return;
  }

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  const layers = [
    { name: "Urgencias", color: 0xff8291, height: 1.45 },
    { name: "Hospitalización", color: 0xf5ca67, height: 0 },
    { name: "UCI", color: 0x71d5ae, height: -1.45 },
  ];

  layers.forEach((layer, layerIndex) => {
    camera.layers.enable(layerIndex);

    const positions = [];
    const basePositions = [];
    const phases = [];
    const count = 220;

    for (let index = 0; index < count; index += 1) {
      const x = THREE.MathUtils.randFloat(-7, 7);
      const y = layer.height + THREE.MathUtils.randFloat(-0.55, 0.55);
      const z = THREE.MathUtils.randFloat(-0.8, 0.8) + (layerIndex - 1) * 0.7;
      positions.push(x, y, z);
      basePositions.push(x, y, z);
      phases.push(Math.random() * Math.PI * 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      color: layer.color,
      size: 0.11,
      transparent: true,
      opacity: 0.88,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.layers.set(layerIndex);
    points.userData.basePositions = basePositions;
    points.userData.phases = phases;
    points.userData.layerIndex = layerIndex;
    scene.add(points);
  });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    showUnavailable("La visualización 3D no está disponible en este navegador.");
    console.error("HealthView: WebGL renderer initialization failed.", error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x102b28, 0);
  container.appendChild(renderer.domElement);

  function updateStatus() {
    const visibleLayers = toggles
      .filter((toggle) => toggle.getAttribute("aria-pressed") === "true")
      .map((toggle) => toggle.textContent.trim());
    const visibleText = visibleLayers.length
      ? `Capas visibles: ${visibleLayers.join(", ")}.`
      : "Todas las capas están ocultas.";
    status.textContent = `${visibleText} Visualización ilustrativa; no representa datos de ocupación en tiempo real.`;
  }

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const layerIndex = Number(toggle.dataset.layer);
      const isVisible = toggle.getAttribute("aria-pressed") === "true";
      camera.layers[isVisible ? "disable" : "enable"](layerIndex);
      toggle.setAttribute("aria-pressed", String(!isVisible));
      updateStatus();
    });
  });

  function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();
  updateStatus();

  const clock = new THREE.Clock();
  const motionScale = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 1;

  renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();

    scene.children.forEach((points) => {
      const positions = points.geometry.attributes.position;
      const basePositions = points.userData.basePositions;
      const phases = points.userData.phases;
      const layerIndex = points.userData.layerIndex;

      for (let index = 0; index < phases.length; index += 1) {
        const offset = index * 3;
        positions.array[offset] =
          basePositions[offset] +
          Math.sin(elapsed * 0.45 + phases[index]) * 0.08 * motionScale;
        positions.array[offset + 1] =
          basePositions[offset + 1] +
          Math.sin(elapsed * 0.7 + phases[index]) * 0.16 * motionScale;
      }

      positions.needsUpdate = true;
      points.rotation.y = Math.sin(elapsed * 0.16 + layerIndex) * 0.035 * motionScale;
    });

    renderer.render(scene, camera);
  });
})();