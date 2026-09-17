/**
 * Real-time 3D ring studio: renderer, jewellery lighting, camera presets and
 * orbit controls around the procedural ring from ringGeometry.ts.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Metal } from "@/types/ring";
import { buildRing, disposeGroup, type RingGeometryConfig } from "./ringGeometry";

export type StudioView = "360" | "engraving" | "front" | "side" | "top" | "angle";

export type StudioConfig = RingGeometryConfig & { metal: Metal };

export interface RingStudio {
  setConfiguration(config: StudioConfig): void;
  setView(view: StudioView): void;
  dispose(): void;
}

const METAL_LOOK: Record<Metal, { color: string; roughness: number }> = {
  "White Gold": { color: "#e4e5e7", roughness: 0.13 },
  "Yellow Gold": { color: "#f1c46e", roughness: 0.15 },
  "Rose Gold": { color: "#eeae93", roughness: 0.15 },
};

/** Spherical camera angles in degrees: azimuth from +Z towards +X, polar from +Y. */
const VIEWS: Record<StudioView, { azimuth: number; polar: number }> = {
  "360": { azimuth: 38, polar: 70 },
  angle: { azimuth: 42, polar: 58 },
  front: { azimuth: 0, polar: 86 },
  side: { azimuth: 90, polar: 86 },
  top: { azimuth: 0, polar: 14 },
  engraving: { azimuth: 70, polar: 80 },
};

/**
 * Studio environment for reflections, modelled on a jewellery light tent: a
 * bright, softly graded room with a few dark flags. Polished metal then reads
 * bright with crisp contrast lines, and diamond facets flash white and dark.
 */
function createEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();

  const roomGeometry = new THREE.SphereGeometry(60, 48, 24);
  const colors: number[] = [];
  const position = roomGeometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const t = (position.getY(i) / 60 + 1) / 2; // 0 at the floor, 1 at the ceiling
    const v = 0.38 + 0.62 * Math.pow(t, 0.8);
    colors.push(v, v * 0.985, v * 0.96);
  }
  roomGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  scene.add(
    new THREE.Mesh(
      roomGeometry,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }),
    ),
  );

  const panel = (w: number, h: number, intensity: number, at: THREE.Vector3) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(intensity, intensity, intensity),
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.copy(at);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };

  // Soft boxes
  panel(70, 40, 4, new THREE.Vector3(0, 52, 0));
  panel(22, 60, 2.6, new THREE.Vector3(-46, 10, 24));
  panel(22, 60, 2.6, new THREE.Vector3(46, 10, 24));
  panel(50, 14, 2, new THREE.Vector3(0, 10, -52));
  // Dark flags give the metal defined edges instead of a flat grey mirror.
  panel(16, 70, 0.02, new THREE.Vector3(-40, 0, -34));
  panel(16, 70, 0.02, new THREE.Vector3(40, 0, -34));
  panel(90, 10, 0.05, new THREE.Vector3(0, -12, 55));
  // Small hot spots for diamond sparkle.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    panel(4, 4, 10, new THREE.Vector3(Math.cos(a) * 42, 26 + (i % 2) * 10, Math.sin(a) * 42));
  }

  return bakeEnvironment(renderer, scene);
}

/**
 * High-contrast environment used only by diamonds: a near-black room with many
 * small, very bright lights, so facets alternate between white flashes and
 * dark reflections like a real stone instead of reading as flat white.
 */
function createSparkleEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.18, 0.18, 0.195),
        side: THREE.BackSide,
      }),
    ),
  );
  const light = (w: number, h: number, intensity: number, at: THREE.Vector3, tint = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(tint[0]! * intensity, tint[1]! * intensity, tint[2]! * intensity),
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.copy(at);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  light(80, 50, 4, new THREE.Vector3(0, 55, 0));
  light(60, 30, 2.5, new THREE.Vector3(0, 10, 55));
  light(60, 30, 2, new THREE.Vector3(0, 10, -55));
  // Dark flags keep contrast between facets.
  light(10, 60, 0.01, new THREE.Vector3(-35, 0, 42));
  light(10, 60, 0.01, new THREE.Vector3(38, 0, -40));
  light(70, 12, 0.01, new THREE.Vector3(0, -30, 45));
  light(14, 45, 0.01, new THREE.Vector3(45, 20, 30));
  light(14, 45, 0.01, new THREE.Vector3(-45, 20, -30));
  light(40, 8, 0.01, new THREE.Vector3(0, 40, -40));
  // Pseudo-random ring of bright points at several heights; faint tints hint at fire.
  const tints = [
    [1, 1, 1],
    [1, 0.92, 0.8],
    [0.85, 0.92, 1],
    [1, 1, 1],
  ];
  for (let i = 0; i < 28; i++) {
    const a = i * 2.39996; // golden angle spreads the points evenly
    const y = -20 + ((i * 37) % 70);
    const r = Math.sqrt(Math.max(0, 55 * 55 - y * y));
    light(
      3 + (i % 3) * 2,
      3 + (i % 2) * 3,
      12,
      new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
      tints[i % 4],
    );
  }
  light(12, 50, 4, new THREE.Vector3(-50, 5, 10));
  light(12, 50, 4, new THREE.Vector3(50, 5, -10));
  return bakeEnvironment(renderer, scene);
}

function bakeEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.01).texture;
  pmrem.dispose();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
  return texture;
}

function createShadowTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(40, 32, 20, 0.42)");
  gradient.addColorStop(0.45, "rgba(40, 32, 20, 0.16)");
  gradient.addColorStop(1, "rgba(40, 32, 20, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const geometryKey = (c: StudioConfig) =>
  [
    c.ringStyle,
    c.sideSetting,
    c.crownSetting,
    c.diamondShape,
    c.centerDiamondSize,
    c.ringSize,
  ].join("|");

export function createRingStudio(container: HTMLElement): RingStudio {
  // Throws when WebGL is unavailable; the caller falls back to the illustration.
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "ring-canvas";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const environment = createEnvironment(renderer);
  scene.environment = environment;

  const camera = new THREE.PerspectiveCamera(28, 1, 1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.6;
  controls.maxPolarAngle = Math.PI * 0.66;
  controls.autoRotateSpeed = 1.6;

  // A little direct light adds sparkle on top of the environment reflections.
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(20, 40, 30);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
  fill.position.set(-30, 10, -20);
  scene.add(fill);

  const metal = new THREE.MeshStandardMaterial({ metalness: 1, envMapIntensity: 1.25 });
  const sparkle = createSparkleEnvironment(renderer);
  const diamond = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0,
    envMap: sparkle,
    envMapIntensity: 2,
    flatShading: true,
    iridescence: 0.35,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [250, 650],
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xf7f9ff,
    metalness: 1,
    roughness: 0.02,
    envMap: sparkle,
    envMapIntensity: 2,
    flatShading: true,
  });

  const shadowTexture = createShadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  let ring: THREE.Group | null = null;
  let currentKey = "";
  let view: StudioView = "360";
  let distance = 80;
  const target = new THREE.Vector3();
  let animation: { from: THREE.Spherical; to: THREE.Spherical; start: number } | null = null;
  let userInteracting = false;

  const sphericalFor = (v: StudioView) =>
    new THREE.Spherical(
      distance,
      THREE.MathUtils.degToRad(VIEWS[v].polar),
      THREE.MathUtils.degToRad(VIEWS[v].azimuth),
    );

  const currentSpherical = () =>
    new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));

  const animateTo = (to: THREE.Spherical) => {
    animation = { from: currentSpherical(), to, start: performance.now() };
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const onStart = () => {
    userInteracting = true;
    animation = null;
    controls.autoRotate = false;
  };
  const onEnd = () => {
    userInteracting = false;
  };
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);

  let frameId = 0;
  const loop = (now: number) => {
    frameId = requestAnimationFrame(loop);
    if (animation && !userInteracting) {
      const t = Math.min(1, (now - animation.start) / 750);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      let dTheta = animation.to.theta - animation.from.theta;
      dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
      const s = new THREE.Spherical(
        THREE.MathUtils.lerp(animation.from.radius, animation.to.radius, e),
        THREE.MathUtils.lerp(animation.from.phi, animation.to.phi, e),
        animation.from.theta + dTheta * e,
      );
      camera.position.setFromSpherical(s).add(controls.target);
      if (t >= 1) {
        animation = null;
        controls.autoRotate = view === "360";
      }
    }
    controls.update();
    renderer.render(scene, camera);
  };
  frameId = requestAnimationFrame(loop);

  return {
    setConfiguration(config) {
      const look = METAL_LOOK[config.metal];
      metal.color.set(look.color);
      metal.roughness = look.roughness;

      const nextKey = geometryKey(config);
      if (nextKey === currentKey) return;
      const firstBuild = currentKey === "";
      currentKey = nextKey;

      if (ring) {
        scene.remove(ring);
        disposeGroup(ring);
      }
      ring = buildRing(config, { metal, diamond, accent });
      scene.add(ring);

      // Frame the ring: centre on its bounds and size the camera distance to fit.
      const box = new THREE.Box3().setFromObject(ring);
      const size = box.getSize(new THREE.Vector3());
      box.getCenter(target);
      const radius = Math.max(size.x, size.y, size.z) * 0.62;
      distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.05;
      controls.minDistance = distance * 0.55;
      controls.maxDistance = distance * 1.8;

      shadow.position.set(0, box.min.y - 0.05, 0);
      shadow.scale.set(size.x * 1.5, size.z * 3.2, 1);

      if (firstBuild) {
        controls.target.copy(target);
        camera.position.setFromSpherical(sphericalFor(view)).add(target);
        controls.autoRotate = view === "360";
      } else {
        // Keep the current angle but re-centre smoothly on the new ring.
        const s = currentSpherical();
        controls.target.copy(target);
        camera.position.setFromSpherical(new THREE.Spherical(distance, s.phi, s.theta)).add(target);
      }
    },

    setView(next) {
      view = next;
      controls.autoRotate = false;
      if (currentKey) animateTo(sphericalFor(next));
    },

    dispose() {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      if (ring) disposeGroup(ring);
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      shadowTexture.dispose();
      metal.dispose();
      diamond.dispose();
      accent.dispose();
      environment.dispose();
      sparkle.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
