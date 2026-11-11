(function () {
  const canvas = document.getElementById("bg-canvas-3d");

  if (!canvas) {
    console.error('HealthView: canvas with id "bg-canvas-3d" was not found.');
    return;
  }

  if (!window.THREE) {
    console.error("HealthView: Three.js did not load; the 3D background is unavailable.");
    return;
  }

  const THREE = window.THREE;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 24;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
  } catch (error) {
    console.error("HealthView: WebGL renderer initialization failed.", error);
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const keyLight = new THREE.DirectionalLight(0xb9e8ff, 1.1);
  keyLight.position.set(-5, 8, 12);
  scene.add(keyLight);

  const accentLight = new THREE.PointLight(0x8d82ff, 0.7, 45);
  accentLight.position.set(8, -4, 6);
  scene.add(accentLight);

  const group = new THREE.Group();
  scene.add(group);

  const palette = [0x3679b8, 0x26a6a1, 0x51447e, 0xb65f70, 0x4a91b0];
  const geometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.OctahedronGeometry(0.75, 0),
    new THREE.IcosahedronGeometry(0.72, 0),
    new THREE.CylinderGeometry(0.55, 0.72, 1, 5, 1),
  ];
  const objects = [];
  const objectCount = 46;

  for (let index = 0; index < objectCount; index += 1) {
    const scale = THREE.MathUtils.randFloat(0.22, 0.68);
    const geometry = geometries[index % geometries.length];
    const material = new THREE.MeshPhongMaterial({
      color: palette[index % palette.length],
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.34, 0.62),
      shininess: 55,
      specular: 0xb8e6ff,
      flatShading: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.userData.normalizedX = THREE.MathUtils.randFloat(-0.54, 0.54);
    mesh.userData.normalizedY = THREE.MathUtils.randFloat(-0.48, 0.48);
    mesh.userData.baseZ = THREE.MathUtils.randFloat(-14, 7);
    mesh.userData.baseY = 0;
    mesh.userData.phase = Math.random() * Math.PI * 2;
    mesh.userData.floatSpeed = THREE.MathUtils.randFloat(0.35, 0.85);
    mesh.userData.floatAmplitude = THREE.MathUtils.randFloat(0.12, 0.48);
    mesh.userData.rotationSpeed = new THREE.Vector3(
      THREE.MathUtils.randFloat(-0.24, 0.24),
      THREE.MathUtils.randFloat(-0.24, 0.24),
      THREE.MathUtils.randFloat(-0.16, 0.16)
    );

    mesh.scale.setScalar(scale);
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    group.add(mesh);
    objects.push(mesh);
  }

  const pointer = { x: 0, y: 0 };
  const targetRotation = { x: 0, y: 0 };
  const scroll = { progress: 0 };

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    objects.forEach((mesh) => {
      const depth = camera.position.z - mesh.userData.baseZ;
      const visibleHeight =
        2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth;

      mesh.position.x =
        mesh.userData.normalizedX * visibleHeight * aspect;
      mesh.userData.baseY = mesh.userData.normalizedY * visibleHeight;
      mesh.position.y = mesh.userData.baseY;
      mesh.position.z = mesh.userData.baseZ;
    });

    if (reducedMotion) {
      renderer.render(scene, camera);
    }
  }

  function onMouseMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  }

  function onScroll() {
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    scroll.progress =
      scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;

    if (reducedMotion) {
      group.rotation.x = scroll.progress * 0.1;
      group.rotation.y = scroll.progress * 0.24;
      camera.position.y = -scroll.progress * 2.2;
      camera.position.z = 24 - scroll.progress * 2.5;
      camera.rotation.x = scroll.progress * 0.045;
      renderer.render(scene, camera);
    }
  }

  function animate() {
    if (reducedMotion) {
      renderer.render(scene, camera);
      return;
    }

    requestAnimationFrame(animate);

    const elapsed = performance.now() * 0.001;
    targetRotation.x = pointer.y * 0.055 + scroll.progress * 0.1;
    targetRotation.y = pointer.x * 0.075 + scroll.progress * 0.24;
    group.rotation.x += (targetRotation.x - group.rotation.x) * 0.025;
    group.rotation.y += (targetRotation.y - group.rotation.y) * 0.025;
    camera.position.y += (-scroll.progress * 2.2 - camera.position.y) * 0.025;
    camera.position.z += (24 - scroll.progress * 2.5 - camera.position.z) * 0.025;
    camera.rotation.x += (scroll.progress * 0.045 - camera.rotation.x) * 0.025;

    objects.forEach((mesh) => {
      const { phase, floatSpeed, floatAmplitude, rotationSpeed, baseY } =
        mesh.userData;

      mesh.position.y =
        baseY + Math.sin(elapsed * floatSpeed + phase) * floatAmplitude;
      mesh.rotation.x += rotationSpeed.x * 0.01;
      mesh.rotation.y += rotationSpeed.y * 0.01;
      mesh.rotation.z += rotationSpeed.z * 0.01;
    });

    renderer.render(scene, camera);
  }

  if (!reducedMotion) {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  onScroll();
  resize();
  animate();
})();
