import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { AREAS, PROJECTS, type AchievementId, type AreaId } from "../data";
import {
  AREA_RADIUS,
  ISLAND_RADIUS,
  areaPosition,
  buildAreaSign,
  buildBench,
  buildBackdrop,
  buildCliff,
  buildClouds,
  buildGamepad,
  buildGear,
  buildJoystick,
  buildKeyboard,
  buildLamp,
  buildObelisk,
  buildRoads,
  buildScatter,
  buildSky,
  buildStars,
  buildStartArch,
  buildSun,
  buildTent,
  buildTerrain,
  buildTireStack,
  buildTree,
  buildWater,
  buildWhisperSprite,
  buildWhisperWall,
  makeCanvasTexture,
  signTexture,
  terrainHeight,
} from "./scenery";
import { buildAILab, type AILab } from "./lab";
import { DustField } from "./dust";
import { GLBTerrainSampler } from "./glbTerrain";

type GLBProgressHandler = (progress: number) => void;
const ISLAND_MODEL_URL = "/models/optimized/quest-island.optimized.glb";
const ISLAND_FALLBACK_MODEL_URL = "/models/quest-island.glb";
const SUPRA_MODEL_URL = "/models/optimized/surpra%20mk.optimized.glb";
const SUPRA_FALLBACK_MODEL_URL = "/models/surpra%20mk.glb";

/** Load the primary island without changing or duplicating its source assets. */
const loadGLBIsland = (onProgress?: GLBProgressHandler): Promise<GLTF> => {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    const load = (url: string, allowFallback: boolean) => {
      loader.load(
        url,
        resolve,
        (xhr) => {
          if (xhr.total > 0) onProgress?.(Math.min(1, xhr.loaded / xhr.total));
        },
        (error) => {
          if (allowFallback) {
            onProgress?.(0);
            load(ISLAND_FALLBACK_MODEL_URL, false);
          } else {
            reject(error);
          }
        },
      );
    };
    load(ISLAND_MODEL_URL, true);
  });
};

const loadSupraModel = (onProgress?: GLBProgressHandler): Promise<GLTF> => {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    const load = (url: string, allowFallback: boolean) => {
      loader.load(
        url,
        resolve,
        (xhr) => {
          if (xhr.total > 0) onProgress?.(Math.min(1, xhr.loaded / xhr.total));
        },
        (error) => {
          if (allowFallback) {
            onProgress?.(0);
            load(SUPRA_FALLBACK_MODEL_URL, false);
          } else {
            reject(error);
          }
        },
      );
    };
    load(SUPRA_MODEL_URL, true);
  });
};

export interface TickState {
  x: number;
  z: number;
  heading: number;
  speed: number;
  kmh: number;
  area: AreaId | null;
  racing: boolean;
  lapMs: number;
  odometer: number;
}

export interface WorldCallbacks {
  onTick: (state: TickState) => void;
  onAreaChange: (area: AreaId | null) => void;
  onProject: (index: number) => void;
  onAchievement: (id: AchievementId) => void;
  onLap: (ms: number) => void;
  onReady: () => void;
  onLoadProgress?: (progress: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class BrunoWorld {
  private canvas: HTMLCanvasElement;
  private callbacks: WorldCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private timer = new THREE.Timer();
  private raf = 0;

  private worldGroup = new THREE.Group();
  private introGroup = new THREE.Group();
  private car = new THREE.Group();
  private carBody = new THREE.Group();
  private wheels: { group: THREE.Group; steer: boolean }[] = [];
  private clouds: THREE.Group[] = [];
  private whisperGroup = new THREE.Group();
  private whisperSprites: THREE.Sprite[] = [];
  private swaying: THREE.Mesh[] = [];
  private spinning: THREE.Object3D[] = [];
  private orb: THREE.Mesh | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private water: THREE.Mesh | null = null;
  private foam: THREE.Mesh | null = null;
  private introGlow: THREE.Mesh | null = null;
  private carShadow: THREE.Mesh | null = null;
  private dust: DustField | null = null;
  private lab: AILab | null = null;
  private dustAccumulator = 0;
  private readonly areaPositions = new Map<AreaId, THREE.Vector3>();
  private circuitPosition = new THREE.Vector3();

  private phase: "intro" | "playing" = "intro";
  private disposed = false;
  private paused = false;
  private quality: "high" | "low" = "high";

  private heading = Math.PI;
  private speed = 0;
  private vertical = 0;
  private verticalVelocity = 0;
  private steer = 0;
  private odometer = 0;
  private lastTickEmit = 0;

  private camYaw = 0;
  private camPitch = 0;
  private camDistance = 14;
  private introAngle = 0;

  private previousSpeed = 0;
  private carBodyBounce = 0;
  private carBodyBounceVelocity = 0;
  private cameraShake = 0;
  private collisionCooldown = 0;
  private lastDragAt = 0;
  private reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private desiredCamera = new THREE.Vector3();
  private cameraLook = new THREE.Vector3();
  private orbWorld = new THREE.Vector3();
  private terrainSampler: GLBTerrainSampler | null = null;
  private usingGLB = false;
  private currentGround = 0;
  private spawnPosition = new THREE.Vector3(0, 0, 24);
  private islandBounds = new THREE.Box3();
  private supraModel: THREE.Object3D | null = null;

  private keys = new Set<string>();
  private pointerDrag: { id: number; x: number; y: number } | null = null;
  private touchDrive: { id: number; x: number; y: number; dx: number; dy: number } | null = null;

  private area: AreaId | null = null;
  private visited = new Set<AreaId>();
  private projectVisited = new Set<number>();
  private projectPositions: THREE.Vector3[] = [];

  private raceStart: number | null = null;
  private lapStart = 0;
  private lastGate = false;
  private lastLapOdometer = 0;
  private secretFound = false;
  private speedAwarded = false;
  private started = false;

  private resizeHandler = () => this.resize();
  private keyDownHandler = (event: KeyboardEvent) => this.handleKey(event, true);
  private keyUpHandler = (event: KeyboardEvent) => this.handleKey(event, false);
  private pointerDownHandler = (event: PointerEvent) => this.handlePointerDown(event);
  private pointerMoveHandler = (event: PointerEvent) => this.handlePointerMove(event);
  private pointerUpHandler = (event: PointerEvent) => this.handlePointerUp(event);
  private wheelHandler = (event: WheelEvent) => this.handleWheel(event);
  private visibilityHandler = () => {
    if (!document.hidden) this.timer.update();
  };

  constructor(canvas: HTMLCanvasElement, callbacks: WorldCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 1500);
    this.camera.position.set(0, 12, 34);

    this.scene.background = new THREE.Color("#1b1422");
    this.scene.fog = new THREE.FogExp2("#ffd9b8", 0.0032);

    this.scene.add(this.worldGroup, this.introGroup, this.car);
    this.buildCar();
    this.car.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name !== "car-shadow") {
        object.castShadow = false;
      }
    });

    // The intro is independent from the island source and is available in
    // both the GLB and procedural fallback paths.
    this.buildIntro();
    this.collectSway(this.introGroup);

    const loadStartedAt = performance.now();
    const supraLoadStartedAt = performance.now();
    let islandProgress = 0;
    let supraProgress = 0;
    let environmentReady = false;
    let carReady = false;
    let readyEmitted = false;
    const emitProgress = () => callbacks.onLoadProgress?.(islandProgress * 0.33 + supraProgress * 0.67);
    const finishLoading = () => {
      if (environmentReady && carReady && !readyEmitted) {
        readyEmitted = true;
        callbacks.onReady();
      }
    };

    loadGLBIsland((progress) => {
      islandProgress = progress;
      emitProgress();
    })
      .then((gltf) => {
        if (this.disposed) {
          this.disposeDetachedObject(gltf.scene);
          return;
        }
        // Shared environment systems are initialized exactly once. The
        // procedural island itself is added only by the fallback path.
        this.worldGroup.add(gltf.scene);
        this.applyGLBTransform(gltf.scene, loadStartedAt);
        // Build landmarks after sampling so their Y positions follow the
        // measured GLB surface, including the elevated outer plateaus.
        this.buildWorld(false);
        islandProgress = 1;
        environmentReady = true;
        emitProgress();
        finishLoading();
      })
      .catch((error) => {
        if (this.disposed) return;
        console.error("Failed to load GLB island; using procedural fallback:", error);
        this.usingGLB = false;
        this.terrainSampler = null;
        this.buildWorld(true);
        islandProgress = 1;
        environmentReady = true;
        emitProgress();
        finishLoading();
      });

    loadSupraModel((progress) => {
      supraProgress = progress;
      emitProgress();
    })
      .then((gltf) => {
        if (this.disposed) {
          this.disposeDetachedObject(gltf.scene);
          return;
        }
        this.installSupraModel(gltf, supraLoadStartedAt);
        supraProgress = 1;
        carReady = true;
        emitProgress();
        finishLoading();
      })
      .catch((error) => {
        if (this.disposed) return;
        console.error("Failed to load Supra model; using procedural car fallback:", error);
        supraProgress = 1;
        carReady = true;
        emitProgress();
        finishLoading();
      });

    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("keydown", this.keyDownHandler, { passive: false });
    window.addEventListener("keyup", this.keyUpHandler);
    canvas.addEventListener("pointerdown", this.pointerDownHandler);
    window.addEventListener("pointermove", this.pointerMoveHandler);
    window.addEventListener("pointerup", this.pointerUpHandler);
    window.addEventListener("wheel", this.wheelHandler, { passive: true });
    document.addEventListener("visibilitychange", this.visibilityHandler);

    this.timer.connect(document);
    this.animate();
  }

  /** Apply measured transforms and prepare the one-time GLB ground sampler. */
  private applyGLBTransform(glbScene: THREE.Group, loadStartedAt: number) {
    glbScene.updateMatrixWorld(true);
    const sourceBounds = new THREE.Box3().setFromObject(glbScene);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const horizontalSize = Math.max(sourceSize.x, sourceSize.z);

    if (!Number.isFinite(horizontalSize) || horizontalSize <= 0) {
      throw new Error("The GLB has no measurable horizontal geometry.");
    }

    const scale = 224 / horizontalSize;
    glbScene.scale.setScalar(scale);
    glbScene.updateMatrixWorld(true);

    const scaledBounds = new THREE.Box3().setFromObject(glbScene);
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    const centerOffset = new THREE.Vector3(-scaledCenter.x, 0, -scaledCenter.z);
    glbScene.position.x += centerOffset.x;
    glbScene.position.z += centerOffset.z;
    glbScene.updateMatrixWorld(true);

    const terrainSampler = GLBTerrainSampler.fromObject(glbScene);
    const spawn = terrainSampler.findSafeSpawn();
    let groundOffset = 0;
    if (spawn) {
      // The verified flat surface is the reference plane for the existing car
      // physics. This is measured from the sampler, never from the lowest vertex.
      groundOffset = -spawn.height;
      glbScene.position.y += groundOffset;
      glbScene.updateMatrixWorld(true);
      terrainSampler.setHeightOffset(groundOffset);
      this.terrainSampler = terrainSampler;
      this.spawnPosition.set(spawn.x, 0, spawn.z);
      this.currentGround = terrainSampler.sample(spawn.x, spawn.z) ?? 0;
    } else {
      console.warn("[BrunoWorld] No stable GLB driving surface was found; car movement is disabled on this environment.");
      this.terrainSampler = null;
    }
    this.usingGLB = true;
    this.islandBounds.setFromObject(glbScene);

    let meshCount = 0;
    let nodeCount = 0;
    glbScene.traverse((object) => {
      nodeCount += 1;
      if (object instanceof THREE.Mesh) meshCount += 1;
    });

    if (process.env.NODE_ENV === "development") {
      const finalBounds = new THREE.Box3().setFromObject(glbScene);
      console.info("[BrunoWorld] GLB island loaded", {
        loadMs: Math.round(performance.now() - loadStartedAt),
        bounds: {
          min: finalBounds.min.toArray(),
          max: finalBounds.max.toArray(),
        },
        dimensions: finalBounds.getSize(new THREE.Vector3()).toArray(),
        scale,
        centerOffset: centerOffset.toArray(),
        meshCount,
        nodeCount,
        groundSurface: spawn
          ? {
              sampler: terrainSampler.diagnostics(),
              sourceHeight: spawn.height,
              appliedVerticalOffset: groundOffset,
              spawn: this.spawnPosition.toArray(),
            }
          : "not found",
      });
    }
  }

  private installSupraModel(gltf: GLTF, loadStartedAt: number) {
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    const sourceBounds = new THREE.Box3().setFromObject(model);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const longAxis = Math.max(sourceSize.x, sourceSize.z);

    if (!Number.isFinite(longAxis) || longAxis <= 0) {
      throw new Error("The Supra model has no measurable dimensions.");
    }

    // The asset's measured long axis is local X. Rotate that axis onto the
    // game's local Z driving axis while keeping the existing car root intact.
    const targetLength = 4.6;
    const scale = targetLength / longAxis;
    const visualRoot = new THREE.Group();
    visualRoot.name = "supra-visual";
    visualRoot.rotation.y = Math.PI / 2;
    model.scale.setScalar(scale);
    model.position.set(
      -(sourceBounds.min.x + sourceBounds.max.x) * scale * 0.5,
      -sourceBounds.min.y * scale,
      -(sourceBounds.min.z + sourceBounds.max.z) * scale * 0.5,
    );
    model.updateMatrixWorld(true);
    visualRoot.add(model);

    this.removeProceduralCarVisuals();
    this.carBody.add(visualRoot);
    this.supraModel = visualRoot;
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = this.quality === "high";
      object.receiveShadow = true;
      object.frustumCulled = true;
    });

    if (process.env.NODE_ENV === "development") {
      const finalBounds = new THREE.Box3().setFromObject(visualRoot);
      let meshCount = 0;
      let nodeCount = 0;
      let textureCount = 0;
      const textures = new Set<THREE.Texture>();
      model.traverse((object) => {
        nodeCount += 1;
        if (!(object instanceof THREE.Mesh)) return;
        meshCount += 1;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            if (material.map) textures.add(material.map);
            if (material.normalMap) textures.add(material.normalMap);
            if (material.roughnessMap) textures.add(material.roughnessMap);
            if (material.metalnessMap) textures.add(material.metalnessMap);
          }
        }
      });
      textureCount = textures.size;
      console.info("[BrunoWorld] Supra model loaded", {
        url: SUPRA_MODEL_URL,
        loadAndParseMs: Math.round(performance.now() - loadStartedAt),
        sourceDimensions: sourceSize.toArray(),
        finalDimensions: finalBounds.getSize(new THREE.Vector3()).toArray(),
        scale,
        orientationRadians: Math.PI / 2,
        bounds: { min: finalBounds.min.toArray(), max: finalBounds.max.toArray() },
        meshCount,
        nodeCount,
        textureCount,
        wheelHierarchy: "combined mesh; no separate wheel objects",
        animations: gltf.animations.length,
      });
    }
  }

  private removeProceduralCarVisuals() {
    for (const wheel of this.wheels) {
      wheel.group.removeFromParent();
      this.disposeObject(wheel.group);
    }
    this.wheels = [];
    this.disposeObject(this.carBody);
    this.carBody.clear();
  }

  private disposeObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  private disposeDetachedObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const collectTexture = (texture: THREE.Texture | null | undefined) => {
      if (texture) textures.add(texture);
    };

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) {
        materials.add(material);
        if (material instanceof THREE.MeshStandardMaterial) {
          collectTexture(material.map);
          collectTexture(material.alphaMap);
          collectTexture(material.aoMap);
          collectTexture(material.emissiveMap);
          collectTexture(material.normalMap);
          collectTexture(material.roughnessMap);
          collectTexture(material.metalnessMap);
        } else if (material instanceof THREE.MeshBasicMaterial) {
          collectTexture(material.map);
          collectTexture(material.alphaMap);
        }
      }
    });

    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
  }

  /* ---------------------------------------------------------------- */
  /* Construction                                                      */
  /* ---------------------------------------------------------------- */

  private buildWorld(includeProceduralIsland = true) {
    const world = this.worldGroup;
    world.add(buildSky(), buildSun());

    for (const area of AREAS) {
      const position = this.areaWorldPosition(area, includeProceduralIsland);
      this.areaPositions.set(area.id, position);
      if (area.id === "circuit") {
        const gateOffset = new THREE.Vector3(0, 0, -4).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          area.angle * (Math.PI / 180),
        );
        this.circuitPosition.copy(position).add(gateOffset);
      }
    }

    const hemi = new THREE.HemisphereLight("#fff3dd", "#8d7a68", 1.15);
    world.add(hemi);

    const fill = new THREE.DirectionalLight("#b9dcff", 0.32);
    fill.position.set(-70, 52, -58);
    world.add(fill);

    const sun = new THREE.DirectionalLight("#ffe6c5", 1.9);
    sun.position.set(75, 105, 42);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 260;
    sun.shadow.bias = -0.0004;
    world.add(sun);
    world.add(sun.target);
    this.sunLight = sun;

    const { group: waterGroup, water, foam } = buildWater();
    world.add(waterGroup);
    water.name = "water";
    this.water = water;
    this.foam = foam;

    if (includeProceduralIsland) {
      world.add(buildCliff(), buildTerrain(), buildRoads(), buildScatter());
    }

    const { group: cloudGroup, clouds } = buildClouds();
    this.clouds = clouds;
    world.add(cloudGroup);

    this.buildLandmarks();
    world.add(this.whisperGroup);
    this.addDefaultWhispers();

    this.dust = new DustField();
    this.dust.setPixelRatio(this.renderer.getPixelRatio());
    world.add(this.dust.points);
  }

  private areaWorldPosition(area: (typeof AREAS)[number], includeProceduralIsland: boolean) {
    const position = includeProceduralIsland
      ? areaPosition(area.angle, area.radius)
      : new THREE.Vector3(area.worldPosition.x, 0, area.worldPosition.z);
    if (!includeProceduralIsland) position.y = this.sampleGround(position.x, position.z) ?? 0;
    return position;
  }

  private collectSway(root: THREE.Object3D) {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh && typeof object.userData.swayPhase === "number") {
        this.swaying.push(object);
      }
    });
  }

  private buildLandmarks() {
    const world = this.worldGroup;
    const accents: Record<AreaId, string> = {
      home: "#ffceca",
      options: "#ffc67b",
      controls: "#c6ff6b",
      achievements: "#b58cff",
      circuit: "#c6ff6b",
      whispers: "#ff8fb1",
      projects: "#ffceca",
      lab: "#4ad9ff",
    };

    for (const area of AREAS) {
      const position = this.areaPositions.get(area.id) ?? this.areaWorldPosition(area, true);
      const group = new THREE.Group();
      group.position.copy(position);
      group.rotation.y = area.angle * (Math.PI / 180);

      if (area.id === "home") {
        const tree = buildTree(1.15, "#ff6f95");
        tree.position.set(-5.5, 0, 2.5);
        group.add(tree);
        const bench = buildBench();
        bench.position.set(1.6, 0, -1.4);
        bench.rotation.y = 0.25;
        group.add(bench);
        const lamp = buildLamp(false);
        lamp.position.set(-2.5, 0, -2.8);
        group.add(lamp);

        const welcome = new THREE.Mesh(
          new THREE.PlaneGeometry(7.6, 2.4),
          new THREE.MeshStandardMaterial({
            map: signTexture("Mohamed Faazil", { background: "#2a2030", accent: "#ffceca", size: 58 }),
            transparent: true,
            side: THREE.DoubleSide,
          }),
        );
        welcome.position.set(0, 3.8, 6.5);
        group.add(welcome);

        const roleSign = new THREE.Mesh(
          new THREE.PlaneGeometry(7.2, 1.5),
          new THREE.MeshStandardMaterial({
            map: signTexture("AI & Full Stack Developer", {
              background: "#201a26",
              accent: "#4ad9ff",
              size: 42,
            }),
            transparent: true,
            side: THREE.DoubleSide,
          }),
        );
        roleSign.position.set(0, 2.35, 6.62);
        group.add(roleSign);
      }

      if (area.id === "options") {
        for (const [x, z] of [[-4, -1], [4.5, 1.5]]) {
          const lamp = buildLamp(true);
          lamp.position.set(x, 0, z);
          group.add(lamp);
        }
        const bench = buildBench();
        bench.position.set(0, 0, -3);
        bench.rotation.y = Math.PI;
        group.add(bench);
        const bench2 = buildBench();
        bench2.position.set(0, 0, 3);
        group.add(bench2);
        const toolbox = new THREE.Mesh(
          new THREE.BoxGeometry(3, 1.2, 1.5),
          new THREE.MeshStandardMaterial({ color: "#c21515", roughness: 0.7 }),
        );
        toolbox.position.set(5, 0.6, -3.5);
        group.add(toolbox);

        // A slowly turning gear gives the Workshop an instantly readable silhouette.
        const gear = buildGear("#ffc67b");
        gear.position.set(-5.5, 2.3, 3.6);
        gear.rotation.y = -0.4;
        gear.userData.spin = 0.35;
        group.add(gear);
        this.spinning.push(gear);
      }

      if (area.id === "controls") {
        const keyboard = buildKeyboard();
        keyboard.position.set(0, 0, -2);
        keyboard.rotation.y = 0.5;
        group.add(keyboard);
        const gamepad = buildGamepad();
        gamepad.position.set(0, 0.2, 6);
        gamepad.rotation.y = -0.35;
        group.add(gamepad);
        const joystick = buildJoystick();
        joystick.position.set(9, 0, 2);
        group.add(joystick);
        const joystick2 = buildJoystick();
        joystick2.position.set(-8, 0, 5);
        group.add(joystick2);
      }

      if (area.id === "achievements") {
        const { group: obelisk, orb } = buildObelisk();
        obelisk.position.set(0, 0, 2);
        group.add(obelisk);
        this.orb = orb;

        const plaques = [
          "OCI AI Foundations",
          "Front-End Development",
          "PHP & MySQL",
          "MongoDB Training",
        ];
        plaques.forEach((label, index) => {
          const angle = (index / plaques.length) * Math.PI * 2 + Math.PI / 4;
          const plinth = new THREE.Group();
          plinth.position.set(Math.sin(angle) * 6.7, 0, Math.cos(angle) * 6.7 + 2);
          plinth.rotation.y = angle + Math.PI;
          const base = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 1.1, 0.8),
            new THREE.MeshStandardMaterial({ color: "#5f4c83", roughness: 0.85, flatShading: true }),
          );
          base.position.y = 0.55;
          base.castShadow = true;
          plinth.add(base);
          const plaque = new THREE.Mesh(
            new THREE.PlaneGeometry(2.35, 0.8),
            new THREE.MeshStandardMaterial({
              map: signTexture(label, {
                background: "#241a38",
                accent: "#b58cff",
                size: label.length > 16 ? 26 : 34,
              }),
              transparent: true,
              side: THREE.DoubleSide,
            }),
          );
          plaque.position.set(0, 1.25, 0.42);
          plinth.add(plaque);
          group.add(plinth);
        });
      }

      if (area.id === "circuit") {
        const arch = buildStartArch();
        arch.position.set(0, 0, -4);
        group.add(arch);
        for (const [x, z] of [[-9, 8], [10, 7], [-11, -8]]) {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.6, 1.2, 8),
            new THREE.MeshStandardMaterial({ color: "#ff7b3d", emissive: "#ff5a1f", emissiveIntensity: 0.5 }),
          );
          cone.position.set(x, 0.6, z);
          group.add(cone);
        }
        for (const [x, z] of [[-8, -7], [9, -7], [11, 9]]) {
          const stack = buildTireStack();
          stack.position.set(x, 0, z);
          group.add(stack);
        }
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(9, 2),
          new THREE.MeshStandardMaterial({
            map: signTexture("Start / Finish", { background: "#231a2b", accent: "#c6ff6b", size: 64 }),
            transparent: true,
            side: THREE.DoubleSide,
          }),
        );
        banner.position.set(0, 6.4, -4);
        group.add(banner);
      }

      if (area.id === "whispers") {
        const { group: wallGroup } = buildWhisperWall();
        wallGroup.position.set(0, 0, 2);
        group.add(wallGroup);
        const tree = buildTree(0.9, "#ff9fb8");
        tree.position.set(-10, 0, -4);
        group.add(tree);
        for (const [x, z] of [[-7, 8], [8, 8]]) {
          const lamp = buildLamp(false);
          lamp.position.set(x, 0, z);
          group.add(lamp);
        }
      }

      if (area.id === "projects") {
        PROJECTS.forEach((project, index) => {
          const tent = buildTent(project.title, index % 2 === 0 ? project.accent : "#5a2a6b");
          const column = index % 3;
          const row = Math.floor(index / 3);
          const x = (column - 1) * 9;
          const z = (row - 0.5) * 9;
          tent.position.set(x, 0, z);
          tent.rotation.y = Math.PI;
          group.add(tent);

          const local = new THREE.Vector3(x, 0, z).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            area.angle * (Math.PI / 180),
          );
          this.projectPositions.push(position.clone().add(local));
        });

        const arch = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 8, 2.6),
          new THREE.MeshStandardMaterial({
            map: signTexture("Projects", { background: "#2a2030", accent: "#ffceca", size: 70 }),
            color: "#ffffff",
          }),
        );
        arch.position.set(0, 4, 14);
        group.add(arch);

        for (const [x, z] of [[-12, 6], [12, 6]]) {
          const lamp = buildLamp(true);
          lamp.position.set(x, 0, z);
          group.add(lamp);
        }
      }

      if (area.id === "lab") {
        const lab = buildAILab();
        group.add(lab.group);
        this.lab = lab;
      }

      if (area.id !== "lab") {
        const sign = buildAreaSign(area.label, accents[area.id]);
        sign.position.set(7.5, 0, 8.5);
        sign.rotation.y = Math.PI;
        group.add(sign);
      }

      world.add(group);
    }

    // Landmark trees scattered around the island.
    // Note: Procedural tree placement removed since GLB replaces the island environment.
    // The Meshy GLB model includes the island's vegetation.
    // Trees would be duplicated if placed here.

    // Big painted letters on the central plaza.
    const letters = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 9),
      new THREE.MeshBasicMaterial({
        map: makeCanvasTexture((ctx, width, height) => {
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = "#ff5f92";
          ctx.font = '700 220px "Amatic SC", "Segoe UI", sans-serif';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("FAAZIL", width / 2, height / 2);
        }, 1024, 256),
        transparent: true,
        opacity: 0.9,
      }),
    );
    letters.rotation.x = -Math.PI / 2;
    letters.position.set(0, 0.09, -2);
    world.add(letters);
  }

  private obstacles: { x: number; z: number; r: number }[] = [];

  private buildIntro() {
    const intro = this.introGroup;
    intro.add(buildBackdrop());
    intro.add(buildStars());

    intro.add(new THREE.HemisphereLight("#ffd9c8", "#3a2340", 1.25));

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 10.4, 0.8, 64),
      new THREE.MeshStandardMaterial({ color: "#ffc69a", roughness: 0.9, flatShading: true }),
    );
    disc.position.y = -0.4;
    disc.receiveShadow = true;
    intro.add(disc);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(11, 0.16, 8, 120),
      new THREE.MeshBasicMaterial({ color: "#ffb0c4" }),
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.05;
    intro.add(glow);
    this.introGlow = glow;

    const introLight = new THREE.PointLight("#ffc49b", 80, 60, 1.8);
    introLight.position.set(-6, 12, 8);
    intro.add(introLight);

    const rim = new THREE.PointLight("#ff7aa2", 50, 40, 2);
    rim.position.set(8, 6, -8);
    intro.add(rim);

    const tree = buildTree(1.2, "#ff6f95");
    tree.position.set(-4.6, 0, -3.4);
    intro.add(tree);

    const bench = buildBench();
    bench.position.set(1.8, 0, -3.6);
    bench.rotation.y = -0.3;
    intro.add(bench);

    const lamp = buildLamp(false);
    lamp.position.set(-7.4, 0, 1.4);
    intro.add(lamp);

    const pebble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: "#e6a4c6", roughness: 1, flatShading: true }),
    );
    pebble.position.set(5.5, 0.3, 3.2);
    intro.add(pebble);
  }

  private buildCar() {
    const car = this.car;
    const body = new THREE.Group();
    body.name = "car-body";
    car.add(body);
    this.carBody = body;
    const red = new THREE.MeshStandardMaterial({ color: "#d92b2b", roughness: 0.35, metalness: 0.25 });
    const dark = new THREE.MeshStandardMaterial({ color: "#2a2430", roughness: 0.7 });
    const glass = new THREE.MeshStandardMaterial({ color: "#6f8ea8", roughness: 0.15, metalness: 0.6 });
    const chrome = new THREE.MeshStandardMaterial({ color: "#c9c3d1", roughness: 0.3, metalness: 0.8 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 4.6), red);
    chassis.position.y = 0.95;
    chassis.castShadow = true;
    body.add(chassis);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.45, 1.35), red);
    hood.position.set(0, 1.4, 1.6);
    hood.castShadow = true;
    body.add(hood);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.1, 2.2), red);
    cabin.position.set(0, 1.7, -0.35);
    cabin.castShadow = true;
    body.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.7, 0.16), glass);
    windshield.position.set(0, 1.85, 0.78);
    body.add(windshield);

    for (const side of [-1, 1]) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 1.5), glass);
      window.position.set(side * 1.17, 1.85, -0.4);
      body.add(window);
    }

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.12), glass);
    rearGlass.position.set(0, 1.85, -1.48);
    body.add(rearGlass);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.34, 0.5), dark);
    bumper.position.set(0, 0.75, 2.35);
    bumper.castShadow = true;
    body.add(bumper);

    const rearBumper = bumper.clone();
    rearBumper.position.z = -2.35;
    body.add(rearBumper);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.22), chrome);
    grille.position.set(0, 1.12, 2.33);
    body.add(grille);

    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: "#fff0b8",
      emissive: "#ffc85a",
      emissiveIntensity: 2.4,
    });
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.16), headlightMaterial);
      light.position.set(side * 0.82, 1.3, 2.32);
      body.add(light);

      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.26, 0.12),
        new THREE.MeshStandardMaterial({ color: "#ff6a5a", emissive: "#ff2a1a", emissiveIntensity: 1.8 }),
      );
      tail.position.set(side * 0.86, 1.25, -2.33);
      body.add(tail);
    }

    const rollBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.16), dark);
    rollBar.position.set(0, 2.42, -0.9);
    body.add(rollBar);
    for (const x of [-1.05, 1.05]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), dark);
      bar.position.set(x, 2.16, -0.9);
      body.add(bar);
    }

    const wheelGeometry = new THREE.CylinderGeometry(0.62, 0.62, 0.46, 14);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: "#241f29", roughness: 0.95 });
    const hubMaterial = new THREE.MeshStandardMaterial({ color: "#b9aecb", roughness: 0.4, metalness: 0.6 });
    const offsets: [number, number, boolean][] = [
      [-1.32, 1.55, true],
      [1.32, 1.55, true],
      [-1.32, -1.5, false],
      [1.32, -1.5, false],
    ];
    for (const [x, z, front] of offsets) {
      const group = new THREE.Group();
      group.position.set(x, 0.66, z);
      const tyre = new THREE.Mesh(wheelGeometry, wheelMaterial);
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      group.add(tyre);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 10), hubMaterial);
      hub.rotation.z = Math.PI / 2;
      group.add(hub);
      car.add(group);
      this.wheels.push({ group, steer: front });
    }

    car.position.set(0, 0.15, 2.2);
    car.rotation.y = Math.PI;
    car.scale.setScalar(0.92);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 20),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    shadow.name = "car-shadow";
    car.add(shadow);
    this.carShadow = shadow;
  }

  private addDefaultWhispers() {
    const defaults = [
      { text: "Nice ride!", code: "fr" },
      { text: "Hello from Tokyo", code: "jp" },
      { text: "Three.js rocks", code: "us" },
    ];
    defaults.forEach((item, index) => {
      const sprite = buildWhisperSprite(item.text, item.code);
      const wall = this.areaPositions.get("whispers") ?? areaPosition(257, AREA_RADIUS);
      sprite.position.set(wall.x - 5 + index * 5, wall.y + 4.2 + (index % 2) * 2.4, wall.z + 2.6);
      sprite.userData.baseY = sprite.position.y;
      this.whisperGroup.add(sprite);
      this.whisperSprites.push(sprite);
    });
  }

  private sampleGround(x: number, z: number): number | null {
    if (this.terrainSampler) return this.terrainSampler.sample(x, z);
    if (this.usingGLB) return null;
    if (Math.hypot(x, z) > ISLAND_RADIUS) return null;
    return terrainHeight(x, z);
  }

  private sampleCarGround(x: number, z: number, heading: number): number | null {
    const center = this.sampleGround(x, z);
    if (center === null || !this.terrainSampler) return center;

    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);
    const halfWidth = 1.25;
    const halfLength = 1.9;
    const frontLeft = this.sampleGround(
      x + forwardX * halfLength - rightX * halfWidth,
      z + forwardZ * halfLength - rightZ * halfWidth,
    );
    const frontRight = this.sampleGround(
      x + forwardX * halfLength + rightX * halfWidth,
      z + forwardZ * halfLength + rightZ * halfWidth,
    );
    const rearLeft = this.sampleGround(
      x - forwardX * halfLength - rightX * halfWidth,
      z - forwardZ * halfLength - rightZ * halfWidth,
    );
    const rearRight = this.sampleGround(
      x - forwardX * halfLength + rightX * halfWidth,
      z - forwardZ * halfLength + rightZ * halfWidth,
    );
    if (frontLeft === null || frontRight === null || rearLeft === null || rearRight === null) return null;
    return center;
  }

  private placeCarAt(x: number, z: number, heading: number) {
    const previousHeading = this.heading;
    this.heading = heading;
    const ground = this.sampleCarGround(x, z, heading);
    if (ground === null) {
      this.heading = previousHeading;
      return false;
    }
    this.currentGround = ground;
    this.car.position.set(x, ground + 0.15, z);
    this.car.rotation.y = heading;
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  private resetDynamics() {
    this.previousSpeed = 0;
    this.carBodyBounce = 0;
    this.carBodyBounceVelocity = 0;
    this.cameraShake = 0;
    this.dustAccumulator = 0;
    this.dust?.clear();
    this.carBody.position.set(0, 0, 0);
    this.carBody.rotation.set(0, 0, 0);
  }

  startExperience() {
    if (this.phase === "playing") return;
    this.phase = "playing";
    this.started = true;
    this.introGroup.visible = false;
    this.worldGroup.visible = true;
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2("#ffd9b8", 0.0032);
    const spawnX = this.usingGLB ? this.spawnPosition.x : 0;
    const spawnZ = this.usingGLB ? this.spawnPosition.z : 24;
    if (!this.placeCarAt(spawnX, spawnZ, Math.PI)) {
      console.warn("[BrunoWorld] Car spawn is outside the verified driving surface.");
    }
    this.speed = 0;
    this.vertical = 0;
    this.verticalVelocity = 0;
    this.resetDynamics();
    this.camYaw = 0;
    this.camPitch = 0;
    this.snapCamera();
    this.callbacks.onAreaChange(null);
  }

  setPaused(value: boolean) {
    this.paused = value;
    if (!value) {
      this.timer.update();
      this.timer.getDelta();
    }
  }

  setQuality(value: "high" | "low") {
    this.quality = value;
    const high = value === "high";
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 1.75) : 1);
    this.dust?.setPixelRatio(this.renderer.getPixelRatio());
    if (this.dust) this.dust.intensity = high ? 1 : 0.4;
    if (this.sunLight) {
      this.sunLight.shadow.mapSize.setScalar(high ? 2048 : 1024);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
      this.sunLight.shadow.needsUpdate = true;
    }
    if (this.lab) {
      this.lab.particleGroup.visible = high;
      this.lab.beacon.intensity = high ? 34 : 18;
    }
    if (this.supraModel) {
      this.supraModel.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = high;
      });
    }
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ("needsUpdate" in material) material.needsUpdate = true;
      }
    });
  }

  respawn() {
    const home = this.usingGLB ? this.spawnPosition : areaPosition(0, 32);
    this.placeCarAt(home.x, home.z, Math.PI);
    this.speed = 0;
    this.vertical = 0;
    this.verticalVelocity = 0;
    this.resetDynamics();
    this.snapCamera();
  }

  resetWorld() {
    this.respawn();
    this.raceStart = null;
    this.lapStart = 0;
    this.visited.clear();
    this.projectVisited.clear();
    this.odometer = 0;
    this.lastLapOdometer = 0;
    this.callbacks.onTick(this.buildTickState());
  }

  teleportTo(areaId: AreaId) {
    const area = AREAS.find((item) => item.id === areaId);
    if (!area) return;
    const angle = area.angle * (Math.PI / 180);
    const position = this.areaPositions.get(area.id) ?? areaPosition(area.angle, area.radius);
    if (!this.placeCarAt(position.x, position.z, angle)) return;
    this.speed = 0;
    this.vertical = 0;
    this.verticalVelocity = 0;
    this.resetDynamics();
    this.snapCamera();
    this.callbacks.onAreaChange(area.id);
  }

  restartRace() {
    const area = AREAS.find((item) => item.id === "circuit");
    if (!area) return;
    const angle = area.angle * (Math.PI / 180);
    const position = this.areaPositions.get(area.id) ?? areaPosition(area.angle, area.radius);
    if (!this.placeCarAt(position.x, position.z, angle + Math.PI / 2)) return;
    this.speed = 0;
    this.vertical = 0;
    this.verticalVelocity = 0;
    this.resetDynamics();
    this.snapCamera();
    const now = performance.now();
    this.raceStart = now;
    this.lapStart = now;
    this.lastLapOdometer = this.odometer;
  }

  endRace() {
    this.raceStart = null;
    this.lapStart = 0;
  }

  getRaceTime() {
    if (this.raceStart === null) return 0;
    return performance.now() - this.lapStart;
  }

  addWhisper(text: string, code: string) {
    const sprite = buildWhisperSprite(text, code);
    const wall = this.areaPositions.get("whispers") ?? areaPosition(257, AREA_RADIUS);
    const index = this.whisperSprites.length;
    sprite.position.set(
      wall.x - 6 + (index % 5) * 3,
      wall.y + 3.6 + Math.floor(index / 5) * 2.2 + 1.6,
      wall.z + 2.8,
    );
    sprite.userData.baseY = sprite.position.y;
    this.whisperGroup.add(sprite);
    this.whisperSprites.push(sprite);
  }

  isStarted() {
    return this.started;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.timer.dispose();
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    window.removeEventListener("pointermove", this.pointerMoveHandler);
    window.removeEventListener("pointerup", this.pointerUpHandler);
    window.removeEventListener("wheel", this.wheelHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandler);
    this.dust?.clear();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    const collectTexture = (texture: THREE.Texture | null | undefined) => {
      if (texture) textures.add(texture);
    };

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        if (object.geometry) geometries.add(object.geometry);
      }
      if (object instanceof THREE.Sprite) collectTexture(object.material.map);
      if (!(object instanceof THREE.Mesh)) return;
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) {
        materials.add(material);
        if (material instanceof THREE.MeshStandardMaterial) {
          collectTexture(material.map);
          collectTexture(material.alphaMap);
          collectTexture(material.aoMap);
          collectTexture(material.emissiveMap);
          collectTexture(material.normalMap);
          collectTexture(material.roughnessMap);
          collectTexture(material.metalnessMap);
        } else if (material instanceof THREE.MeshBasicMaterial) {
          collectTexture(material.map);
          collectTexture(material.alphaMap);
          collectTexture(material.aoMap);
        } else if (material instanceof THREE.SpriteMaterial) {
          collectTexture(material.map);
        }
      }
    });

    this.sunLight?.shadow.map?.dispose();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  private handleKey(event: KeyboardEvent, down: boolean) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    const key = event.key.toLowerCase();
    const controlled = [
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      " ",
      "w",
      "a",
      "s",
      "d",
      "shift",
      "control",
    ];
    if (controlled.includes(key) && this.phase === "playing") event.preventDefault();
    if (down) this.keys.add(key);
    else this.keys.delete(key);
  }

  private handlePointerDown(event: PointerEvent) {
    if (!this.started) return;
    if (event.pointerType === "touch") {
      if (event.clientX < window.innerWidth * 0.55) {
        this.touchDrive = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
        this.touchDrive.dx = 0;
        this.touchDrive.dy = 0;
      } else {
        this.pointerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }
    } else {
      this.pointerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }

  private handlePointerMove(event: PointerEvent) {
    if (this.touchDrive && this.touchDrive.id === event.pointerId) {
      this.touchDrive.dx = clamp((event.clientX - this.touchDrive.x) / 70, -1, 1);
      this.touchDrive.dy = clamp((event.clientY - this.touchDrive.y) / 70, -1, 1);
      return;
    }
    if (this.pointerDrag && this.pointerDrag.id === event.pointerId) {
      const dx = event.clientX - this.pointerDrag.x;
      const dy = event.clientY - this.pointerDrag.y;
      this.pointerDrag.x = event.clientX;
      this.pointerDrag.y = event.clientY;
      this.camYaw -= dx * 0.005;
      this.camPitch = clamp(this.camPitch + dy * 0.02, -3, 9);
      this.lastDragAt = performance.now();
    }
  }

  private handlePointerUp(event: PointerEvent) {
    if (this.touchDrive && this.touchDrive.id === event.pointerId) this.touchDrive = null;
    if (this.pointerDrag && this.pointerDrag.id === event.pointerId) this.pointerDrag = null;
  }

  private handleWheel(event: WheelEvent) {
    if (!this.started) return;
    this.camDistance = clamp(this.camDistance + event.deltaY * 0.012, 8, 26);
  }

  /* ---------------------------------------------------------------- */
  /* Simulation                                                        */
  /* ---------------------------------------------------------------- */

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    if (document.hidden) return;
    this.timer.update();
    const delta = Math.min(this.timer.getDelta(), 0.05);

    if (this.phase === "intro") {
      this.introAngle += delta * 0.18;
      const portrait = window.innerWidth < 620;
      const radius = portrait ? 27 : 24;
      this.camera.position.set(
        Math.sin(this.introAngle) * radius,
        (portrait ? 11 : 9.5) + Math.sin(this.introAngle * 0.7) * 1.2,
        Math.cos(this.introAngle) * radius,
      );
      this.camera.lookAt(0, portrait ? 1.6 : 3.2, 0);
      this.car.rotation.y = Math.PI + Math.sin(this.introAngle * 0.6) * 0.08;
    } else {
      if (!this.paused) this.updateCar(delta);
      this.updateCamera(delta);
    }

    this.updateAmbient(delta);
    if (this.dust && this.phase === "playing" && !this.paused) this.dust.update(delta);
    this.renderer.render(this.scene, this.camera);

    const now = performance.now();
    if (now - this.lastTickEmit > 100) {
      this.lastTickEmit = now;
      this.callbacks.onTick(this.buildTickState());
    }
  };

  private updateCar(delta: number) {
    let throttle = 0;
    let steerInput = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) throttle += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) throttle -= 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) steerInput -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) steerInput += 1;

    if (this.touchDrive) {
      throttle += -this.touchDrive.dy;
      steerInput += this.touchDrive.dx;
    }
    throttle = clamp(throttle, -1, 1);
    steerInput = clamp(steerInput, -1, 1);
    this.steer = lerp(this.steer, steerInput, 1 - Math.exp(-delta * 8));

    const boosting = this.keys.has("shift");
    const braking = this.keys.has("control") || this.keys.has("b");
    const maxSpeed = boosting ? 44 : 29;
    const acceleration = boosting ? 22 : 13;

    if (throttle > 0) this.speed += acceleration * throttle * delta;
    else if (throttle < 0) this.speed += 18 * throttle * delta;

    if (braking) this.speed -= Math.sign(this.speed) * 32 * delta;
    if (Math.abs(this.speed) > maxSpeed) this.speed = lerp(this.speed, maxSpeed, 1 - Math.exp(-delta * 2));
    if (throttle === 0 && !braking) this.speed *= 1 - 1.1 * delta;
    if (Math.abs(this.speed) < 0.05) this.speed = 0;

    const longitudinalAccel = (this.speed - this.previousSpeed) / Math.max(delta, 1 / 240);
    this.previousSpeed = this.speed;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - delta);

    const speedFactor = clamp(Math.abs(this.speed) / 9, 0, 1);
    const direction = this.speed < 0 ? -1 : 1;
    this.heading += this.steer * 1.9 * speedFactor * direction * delta;

    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const previousX = this.car.position.x;
    const previousZ = this.car.position.z;
    const previousGround = this.currentGround;
    this.car.position.x += forwardX * this.speed * delta;
    this.car.position.z += forwardZ * this.speed * delta;
    this.odometer += Math.abs(this.speed) * delta;

    if (!this.terrainSampler && !this.usingGLB) {
      const distance = Math.hypot(this.car.position.x, this.car.position.z);
      if (distance > ISLAND_RADIUS - 9) {
        const scale = (ISLAND_RADIUS - 9) / distance;
        this.car.position.x *= scale;
        this.car.position.z *= scale;
        this.speed *= 0.85;
      }
    }

    for (const obstacle of this.obstacles) {
      const dx = this.car.position.x - obstacle.x;
      const dz = this.car.position.z - obstacle.z;
      const dist = Math.hypot(dx, dz);
      if (dist < obstacle.r && dist > 0.001) {
        const push = (obstacle.r - dist) / dist;
        this.car.position.x += dx * push;
        this.car.position.z += dz * push;
        this.speed *= 0.97;
        if (this.collisionCooldown <= 0 && Math.abs(this.speed) > 5) {
          this.collisionCooldown = 0.4;
          this.cameraShake = Math.max(this.cameraShake, 0.16);
          this.carBodyBounceVelocity -= 0.55;
          this.spawnDustBurst(9, 0.8);
        }
      }
    }

    const nextGround = this.sampleCarGround(this.car.position.x, this.car.position.z, this.heading);
    if (nextGround === null) {
      this.car.position.x = previousX;
      this.car.position.z = previousZ;
      this.currentGround = previousGround;
      this.speed *= 0.85;
    } else {
      this.currentGround = nextGround;
    }

    const ground = this.currentGround;
    const jump = this.keys.has(" ");
    if (jump && this.vertical <= 0) {
      this.verticalVelocity = 8.6;
      this.keys.delete(" ");
    }
    if (this.vertical > 0 || this.verticalVelocity > 0) {
      this.verticalVelocity -= 24 * delta;
      this.vertical += this.verticalVelocity * delta;
      if (this.vertical <= 0) {
        const impact = -this.verticalVelocity;
        this.vertical = 0;
        this.verticalVelocity = 0;
        if (impact > 3) {
          this.carBodyBounceVelocity -= Math.min(impact, 18) * 0.04;
          this.cameraShake = Math.max(this.cameraShake, Math.min(0.24, impact * 0.016));
          this.spawnDustBurst(10 + Math.floor(impact), 0.9);
        }
      }
    }

    this.car.position.y = ground + 0.15 + this.vertical;
    this.car.rotation.y = this.heading;

    this.carBodyBounceVelocity +=
      (-this.carBodyBounce * 120 - this.carBodyBounceVelocity * 14) * delta;
    this.carBodyBounce += this.carBodyBounceVelocity * delta;
    this.carBodyBounce = clamp(this.carBodyBounce, -0.38, 0.22);

    const bodyBob = Math.sin(this.odometer * 2.2) * 0.014 * speedFactor;
    this.carBody.position.y = this.carBodyBounce + bodyBob;

    const targetRoll = -this.steer * speedFactor * 0.14;
    this.carBody.rotation.z = lerp(
      this.carBody.rotation.z,
      targetRoll,
      1 - Math.exp(-delta * 5),
    );
    const targetPitch = clamp(
      -longitudinalAccel * 0.0035 - this.speed * 0.0009 - this.verticalVelocity * 0.004,
      -0.12,
      0.12,
    );
    this.carBody.rotation.x = lerp(
      this.carBody.rotation.x,
      targetPitch,
      1 - Math.exp(-delta * 6),
    );

    const wheelSpin = this.speed * delta * 2.2;
    this.wheels.forEach((wheel, index) => {
      wheel.group.rotation.x += wheelSpin;
      wheel.group.rotation.y = wheel.steer ? this.steer * 0.5 : 0;
      wheel.group.position.y =
        0.66 + Math.sin(this.odometer * 2.6 + index * 1.7) * 0.012 * speedFactor;
    });

    if (Math.abs(this.speed) > 1.5 && this.vertical < 0.15) {
      this.emitDust(delta, speedFactor, braking);
    }

    if (this.carShadow) this.carShadow.visible = this.vertical < 4;

    this.updateAreas();
    this.updateRace();
  }

  private emitDust(delta: number, speedFactor: number, braking: boolean) {
    const dust = this.dust;
    if (!dust) return;
    const rate =
      (Math.abs(this.speed) * 4.2 + (braking ? 50 : 0)) *
      speedFactor *
      dust.intensity *
      (this.reduceMotion ? 0.5 : 1);
    this.dustAccumulator += delta * rate;
    if (this.dustAccumulator < 1) return;

    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);

    while (this.dustAccumulator >= 1) {
      this.dustAccumulator -= 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const localX = side * 1.12;
      const localZ = -1.85;
      const x = this.car.position.x + rightX * localX + forwardX * localZ;
      const z = this.car.position.z + rightZ * localX + forwardZ * localZ;
      const back = 0.7 + speedFactor * 1.2;
      dust.spawn(
        x + (Math.random() - 0.5) * 0.4,
        this.car.position.y + 0.22,
        z + (Math.random() - 0.5) * 0.4,
        -forwardX * back + rightX * (Math.random() - 0.5) * 0.8,
        0.6 + Math.random() * 1.2,
        -forwardZ * back + rightZ * (Math.random() - 0.5) * 0.8,
        1.4 + Math.random() * 1.1,
        0.55 + Math.random() * 0.35,
      );
    }
  }

  private spawnDustBurst(count: number, strength: number) {
    const dust = this.dust;
    if (!dust) return;
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);
    const amount = Math.max(2, Math.round(count * (this.reduceMotion ? 0.5 : 1)));

    for (let i = 0; i < amount; i++) {
      const side = Math.random() * 2 - 1;
      const back = Math.random() * 2 - 0.4;
      const x = this.car.position.x + rightX * side * 1.3 - forwardX * back;
      const z = this.car.position.z + rightZ * side * 1.3 - forwardZ * back;
      dust.spawn(
        x,
        this.car.position.y + 0.08,
        z,
        rightX * (Math.random() - 0.5) * 3 * strength - forwardX * Math.random() * 2,
        0.7 + Math.random() * 1.4,
        rightZ * (Math.random() - 0.5) * 3 * strength - forwardZ * Math.random() * 2,
        1.65 + Math.random() * 1.3,
        0.55 + Math.random() * 0.5,
      );
    }
  }

  private updateAreas() {
    let closest: AreaId | null = null;
    let closestDistance = Infinity;
    for (const area of AREAS) {
      const position = this.areaPositions.get(area.id);
      if (!position) continue;
      const distance = Math.hypot(this.car.position.x - position.x, this.car.position.z - position.z);
      if (distance < area.triggerRadius && distance < closestDistance) {
        closest = area.id;
        closestDistance = distance;
      }
    }
    if (closest !== this.area) {
      this.area = closest;
      if (closest) this.visited.add(closest);
      this.callbacks.onAreaChange(closest);
    }

    for (let index = 0; index < this.projectPositions.length; index++) {
      if (this.projectVisited.has(index)) continue;
      const position = this.projectPositions[index];
      const distance = Math.hypot(this.car.position.x - position.x, this.car.position.z - position.z);
      if (distance < 9) {
        this.projectVisited.add(index);
        this.callbacks.onProject(index);
      }
    }

    if (this.orb && !this.secretFound) {
      this.orb.getWorldPosition(this.orbWorld);
      if (this.car.position.distanceTo(this.orbWorld) < 5.5) {
        this.secretFound = true;
        this.callbacks.onAchievement("secret");
      }
    }

    if (!this.speedAwarded && Math.abs(this.speed) * 3.6 >= 100) {
      this.speedAwarded = true;
      this.callbacks.onAchievement("speed");
    }
  }

  private updateRace() {
    const distance = Math.hypot(
      this.car.position.x - this.circuitPosition.x,
      this.car.position.z - this.circuitPosition.z,
    );
    const inside = distance < 9;
    if (inside && !this.lastGate && Math.abs(this.speed) > 2) {
      const now = performance.now();
      if (this.raceStart === null) {
        this.raceStart = now;
        this.lapStart = now;
        this.lastLapOdometer = this.odometer;
      } else if (this.odometer - this.lastLapOdometer > 160) {
        this.callbacks.onLap(now - this.lapStart);
        this.lapStart = now;
        this.lastLapOdometer = this.odometer;
      }
    }
    this.lastGate = inside;
  }

  private updateCamera(delta: number) {
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);

    if (!this.pointerDrag && this.started && performance.now() - this.lastDragAt > 2200) {
      if (Math.abs(this.speed) > 2) this.camYaw *= Math.exp(-delta * 0.8);
    }

    const yaw = this.heading + Math.PI + this.camYaw;
    const distance = this.camDistance;
    const height = 5.6 + this.camPitch + distance * 0.16;
    const lean = this.steer * clamp(Math.abs(this.speed) / 24, 0, 1) * 1.15;

    this.desiredCamera.set(
      this.car.position.x + Math.sin(yaw) * distance + rightX * lean,
      this.car.position.y + height,
      this.car.position.z + Math.cos(yaw) * distance + rightZ * lean,
    );

    const factor = 1 - Math.exp(-delta * 4.2);
    this.camera.position.lerp(this.desiredCamera, factor);

    this.cameraLook.set(
      this.car.position.x + forwardX * 3.4 + rightX * lean * 0.6,
      this.car.position.y + 2.1,
      this.car.position.z + forwardZ * 3.4 + rightZ * lean * 0.6,
    );
    this.camera.lookAt(this.cameraLook);

    const targetFov =
      56 + (this.keys.has("shift") && this.speed > 12 ? 10 * clamp(this.speed / 40, 0, 1) : 0);
    if (Math.abs(targetFov - this.camera.fov) > 0.01) {
      this.camera.fov = lerp(this.camera.fov, targetFov, 1 - Math.exp(-delta * 3));
      this.camera.updateProjectionMatrix();
    }

    if (this.cameraShake > 0.001 && !this.reduceMotion) {
      const time = performance.now() * 0.001;
      this.camera.position.x += Math.sin(time * 61.7) * this.cameraShake;
      this.camera.position.y += Math.sin(time * 77.3 + 1.4) * this.cameraShake * 0.7;
      this.camera.position.z += Math.cos(time * 53.1) * this.cameraShake * 0.6;
      this.cameraShake *= Math.exp(-delta * 6.5);
    } else {
      this.cameraShake = 0;
    }
  }

  private snapCamera() {
    const yaw = this.heading + Math.PI + this.camYaw;
    const distance = this.camDistance;
    this.camera.position.set(
      this.car.position.x + Math.sin(yaw) * distance,
      this.car.position.y + 5.6 + this.camPitch + distance * 0.16,
      this.car.position.z + Math.cos(yaw) * distance,
    );
    this.camera.lookAt(this.car.position.x, this.car.position.y + 2.1, this.car.position.z);
  }

  private updateAmbient(delta: number) {
    const time = performance.now() * 0.001;

    if (this.water) this.water.position.y = -8.6 + Math.sin(time * 0.35) * 0.05;
    if (this.foam) {
      this.foam.scale.setScalar(1 + Math.sin(time * 0.9) * 0.003);
      const material = this.foam.material as THREE.MeshBasicMaterial;
      material.opacity = 0.78 + Math.sin(time * 1.3) * 0.1;
    }

    const sway = this.reduceMotion ? 0.008 : 0.035;
    for (const mesh of this.swaying) {
      const phase = (mesh.userData.swayPhase as number) ?? 0;
      const base = (mesh.userData.swayBaseZ as number) ?? 0;
      mesh.rotation.z = base + Math.sin(time * 1.05 + phase) * sway;
    }

    for (const object of this.spinning) {
      const speed = (object.userData.spin as number) ?? 0.3;
      object.rotation.z += delta * speed * (this.reduceMotion ? 0.2 : 1);
    }

    this.whisperSprites.forEach((sprite, index) => {
      const base = (sprite.userData.baseY as number) ?? sprite.position.y;
      sprite.position.y = base + Math.sin(time * 0.9 + index * 0.7) * 0.08;
    });

    for (const cloud of this.clouds) {
      const speed = (cloud.userData.speed as number) ?? 0.5;
      cloud.position.x += delta * speed;
      if (cloud.position.x > 320) cloud.position.x = -320;
    }

    const lab = this.lab;
    if (lab) {
      const motion = this.reduceMotion ? 0.25 : this.quality === "high" ? 1 : 0.55;
      lab.core.rotation.set(time * 0.45, time * 0.75, time * 0.25);
      lab.rings[0].rotation.z = time * 0.55 * motion;
      lab.rings[1].rotation.z = -time * 0.42 * motion;
      lab.neural.rotation.y = time * 0.28 * motion;

      for (let index = 0; index < lab.floaters.length; index++) {
        const floater = lab.floaters[index];
        const baseY = (floater.userData.baseY as number) ?? 3;
        const phase = (floater.userData.phase as number) ?? 0;
        const spin = (floater.userData.spin as number) ?? 0.3;
        floater.position.y = baseY + Math.sin(time * 0.8 + phase) * 0.3 * motion;
        floater.rotation.y = time * spin * motion + phase;
        floater.rotation.x = phase * 0.5 + time * spin * 0.4 * motion;
      }

      for (let index = 0; index < lab.holograms.length; index++) {
        const hologram = lab.holograms[index];
        const phase = (hologram.userData.phase as number) ?? 0;
        hologram.position.y =
          ((hologram.userData.baseY as number) ?? 4) + Math.sin(time * 1.1 + phase) * 0.08 * motion;
      }
      for (let index = 0; index < lab.screens.length; index++) {
        lab.screens[index].opacity = 0.72 + Math.sin(time * 1.7 + index * 1.3) * 0.12 * motion;
      }

      lab.particleGroup.rotation.y = time * 0.08 * motion;
      lab.particleGroup.position.y = 0.6 + Math.sin(time * 0.55) * 0.25 * motion;
      lab.beacon.intensity = (this.quality === "high" ? 34 : 18) + Math.sin(time * 2.1) * 5;
    }

    if (this.phase === "intro") {
      this.car.position.y = 0.02 + Math.sin(time * 1.4) * 0.012;
      if (this.introGlow) this.introGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.004);
    }
  }

  private buildTickState(): TickState {
    return {
      x: this.car.position.x,
      z: this.car.position.z,
      heading: this.heading,
      speed: Math.abs(this.speed),
      kmh: Math.abs(this.speed) * 3.6,
      area: this.area,
      racing: this.raceStart !== null,
      lapMs: this.raceStart === null ? 0 : performance.now() - this.lapStart,
      odometer: this.odometer,
    };
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.quality === "high" ? Math.min(window.devicePixelRatio, 1.75) : 1,
    );
  }
}
