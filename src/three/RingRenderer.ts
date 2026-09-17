/**
 * Imperative three.js scene for the ring viewer.
 *
 * Deliberately framework-free: React owns when this is created, told about new
 * assets and destroyed, and nothing else. Keeping the render loop out of React
 * means a metal change never re-runs an effect that could tear down the canvas.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createEnvironmentTextures } from "./studioEnvironment";
import type { Metal, ViewName } from "@/types/ring";
import { applyMetalColor, createMaterial } from "./ringMaterials";
import { loadPartGeometry, pruneGeometryCache, type RingPartSource } from "./ringGeometry";

export type ViewerMode = "360" | "engraving" | ViewName;

/**
 * Every ring is rescaled so its largest dimension is exactly this many world
 * units. The source models are in metres — a band measures about 0.021 across —
 * which would sit inside the default camera near plane and makes any hand-tuned
 * constant (thickness, distance, damping) meaningless. Normalising once here
 * lets every other number in this file be a plain readable value.
 */
const MODEL_SIZE = 2;

/** Camera framing per UI mode: azimuth/polar in degrees, plus a zoom multiplier. */
const CAMERA_PRESETS: Record<ViewerMode, { azimuth: number; polar: number; zoom: number }> = {
  "360": { azimuth: 35, polar: 72, zoom: 1 },
  angle: { azimuth: 35, polar: 72, zoom: 1 },
  front: { azimuth: 0, polar: 72, zoom: 1 },
  side: { azimuth: 90, polar: 72, zoom: 1 },
  top: { azimuth: 0, polar: 18, zoom: 1 },
  // The engraving sits on the inner face of the band, so move in close.
  engraving: { azimuth: 90, polar: 72, zoom: 0.62 },
};

const BACKDROP_DISTANCE = 12;

/** Studio sweep matching the CSS .viewer-stage gradient. */
function createBackdropTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size * 0.51,
      size * 0.47,
      0,
      size * 0.51,
      size * 0.47,
      size * 0.72,
    );
    gradient.addColorStop(0, "#fffdf9");
    gradient.addColorStop(0.48, "#f7f3eb");
    gradient.addColorStop(1, "#e9e2d6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class RingRenderer {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly ring = new THREE.Group();
  private readonly backdrop: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly environment: THREE.Texture;
  private readonly gemEnvironment: THREE.CubeTexture;
  private readonly resizeObserver: ResizeObserver;

  private readonly metalMaterials: THREE.MeshPhysicalMaterial[] = [];
  private readonly liveMaterials: THREE.Material[] = [];

  private metal: Metal;
  private mode: ViewerMode = "360";
  private frameRadius = 1;
  private readonly targetPosition = new THREE.Vector3();
  private settlingCamera = false;
  private userHasInteracted = false;
  private running = true;
  private disposed = false;
  private animationHandle = 0;
  /** Bumped on every setParts call so a superseded load can bail out. */
  private generation = 0;

  constructor(container: HTMLElement, metal: Metal) {
    this.container = container;
    this.metal = metal;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearAlpha(0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Khronos PBR Neutral, not ACES. ACES is a film curve: it desaturates as it
    // rolls off, so a bright gold highlight slides toward white and the whole
    // band reads as pale cream. PBR Neutral was designed for product viewing and
    // holds hue into the highlights, which is what keeps gold looking like gold.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    // The transmission buffer is a full extra scene render. Half resolution is
    // invisible through a refracting stone and roughly halves its cost.
    this.renderer.transmissionResolutionScale = 0.5;
    this.renderer.domElement.className = "glb-model";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, 6);

    // Image-based lighting does all the work here: the metal samples the
    // prefiltered map through three's PBR shader, the stones sample the sharp
    // cubemap through their own.
    const environment = createEnvironmentTextures(this.renderer);
    this.environment = environment.pbr;
    this.gemEnvironment = environment.gem;
    this.scene.environment = this.environment;

    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: createBackdropTexture(),
        // Not tone mapped, so it lands on exactly the CSS gradient colours.
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.backdrop.position.set(0, 0, -BACKDROP_DISTANCE);
    this.backdrop.renderOrder = -1;
    // Parented to the camera so it always fills frame, and inside the scene so
    // the transmission pass includes it — without a backdrop to refract, the
    // diamonds sample empty space and read as dark grey glass.
    this.camera.add(this.backdrop);
    this.scene.add(this.camera);
    this.scene.add(this.ring);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.85;
    this.controls.autoRotateSpeed = 1.1;
    this.controls.addEventListener("start", () => {
      this.userHasInteracted = true;
      this.settlingCamera = false;
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    // TEMP DEBUG (?debugEnv=1): show the raw gem cubemap. The backdrop plane is
    // parented to the camera and covers the whole frustum, so it must be hidden
    // or it hides scene.background entirely.
    if (typeof location !== "undefined" && location.search.includes("debugEnv=1")) {
      this.backdrop.visible = false;
      this.ring.visible = false;
      this.scene.background = this.gemEnvironment;
      this.scene.backgroundIntensity = Number(
        new URLSearchParams(location.search).get("envGain") ?? "1",
      );
    }

    this.animationHandle = requestAnimationFrame(this.tick);
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);

    // Keep the backdrop exactly covering the frustum at its fixed depth.
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const backdropHeight = 2 * Math.tan(vFov / 2) * BACKDROP_DISTANCE;
    this.backdrop.scale.set(backdropHeight * this.camera.aspect, backdropHeight, 1);

    this.applyCameraPreset(true);
  }

  /**
   * Replace the model. Resolves once the new ring is on screen, or immediately
   * and silently if a newer setParts call has already superseded this one.
   */
  async setParts(parts: RingPartSource[]): Promise<void> {
    const generation = ++this.generation;
    const loaded = await Promise.all(parts.map((part) => loadPartGeometry(part.url, part.role)));
    if (this.disposed || generation !== this.generation) return;

    this.clearRing();

    const group = new THREE.Group();
    parts.forEach((part, index) => {
      const entry = loaded[index];
      if (!entry) return;
      const material = createMaterial(part.role, this.metal, this.gemEnvironment);
      this.liveMaterials.push(material);
      if (material instanceof THREE.MeshPhysicalMaterial) this.metalMaterials.push(material);
      const mesh = new THREE.Mesh(entry.geometry, material);
      // The node transform lives here rather than in the attribute buffers; see
      // RingPartGeometry for why baking it would destroy the quantised metal.
      mesh.applyMatrix4(entry.matrix);
      group.add(mesh);
    });

    // Normalise: recentre on the union bounds and scale to MODEL_SIZE. Done on
    // the union rather than per part so head and band keep their alignment.
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z) || 1;
    const scale = MODEL_SIZE / largest;
    group.position.copy(center).multiplyScalar(-scale);
    group.scale.setScalar(scale);

    this.ring.add(group);
    this.frameRadius = (bounds.getBoundingSphere(new THREE.Sphere()).radius || 1) * scale;

    pruneGeometryCache(parts.map((part) => part.url));
    this.applyCameraPreset(true);
  }

  /** Dispose meshes and materials, but not geometry — that belongs to the cache. */
  private clearRing(): void {
    this.ring.clear();
    this.liveMaterials.forEach((material) => material.dispose());
    this.liveMaterials.length = 0;
    this.metalMaterials.length = 0;
  }

  setMetal(metal: Metal): void {
    if (metal === this.metal) return;
    this.metal = metal;
    this.metalMaterials.forEach((material) => applyMetalColor(material, metal));
  }

  setMode(mode: ViewerMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    // An explicit view choice overrides a previous manual drag.
    this.userHasInteracted = false;
    this.applyCameraPreset(false);
  }

  /**
   * Point the camera at the preset for the current mode. `immediate` snaps
   * (first load, resize); otherwise the loop eases across so switching views
   * reads as a move rather than a cut.
   */
  private applyCameraPreset(immediate: boolean): void {
    const preset = CAMERA_PRESETS[this.mode];
    // Distance that fits the bounding sphere in the vertical *and* horizontal
    // field of view — without the aspect term a narrow container crops the ring.
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fit = this.frameRadius / Math.sin(Math.min(vFov, hFov) / 2);
    const distance = (fit * 1.12) / preset.zoom;

    const spherical = new THREE.Spherical(
      distance,
      THREE.MathUtils.degToRad(preset.polar),
      THREE.MathUtils.degToRad(preset.azimuth),
    );
    this.targetPosition.setFromSpherical(spherical);

    this.controls.minDistance = distance * 0.45;
    this.controls.maxDistance = distance * 2.2;

    if (immediate || this.userHasInteracted) {
      this.camera.position.copy(this.targetPosition);
      this.settlingCamera = false;
    } else {
      this.settlingCamera = true;
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /** Pause the loop when the canvas is offscreen or the tab is hidden. */
  setRunning(running: boolean): void {
    this.running = running;
  }

  private readonly tick = (): void => {
    this.animationHandle = requestAnimationFrame(this.tick);
    if (!this.running || this.disposed) return;

    if (this.settlingCamera) {
      this.camera.position.lerp(this.targetPosition, 0.12);
      if (this.camera.position.distanceTo(this.targetPosition) < this.frameRadius * 0.002) {
        this.camera.position.copy(this.targetPosition);
        this.settlingCamera = false;
      }
    }

    this.controls.autoRotate =
      this.mode === "360" && !this.userHasInteracted && !this.settlingCamera;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationHandle);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.clearRing();
    this.backdrop.geometry.dispose();
    this.backdrop.material.map?.dispose();
    this.backdrop.material.dispose();
    this.environment.dispose();
    this.gemEnvironment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
