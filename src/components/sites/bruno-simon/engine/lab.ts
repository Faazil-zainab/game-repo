import * as THREE from "three";
import { AI_PROJECTS } from "../data";
import { makeCanvasTexture, signTexture } from "./scenery";

export interface AILab {
  group: THREE.Group;
  core: THREE.Mesh;
  rings: THREE.Mesh[];
  holograms: THREE.Mesh[];
  floaters: THREE.Mesh[];
  terminals: THREE.Group;
  neural: THREE.Group;
  particles: THREE.Points;
  particleGroup: THREE.Group;
  beacon: THREE.PointLight;
  screens: THREE.MeshBasicMaterial[];
}

/**
 * A compact, low-poly research facility built from shared primitives.
 * Everything that animates is cached on the returned object so the world
 * loop never has to traverse the lab scene graph.
 */
export function buildAILab(): AILab {
  const group = new THREE.Group();
  group.name = "ai-lab";

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: "#2a4f70",
    emissive: "#0b1f33",
    emissiveIntensity: 0.55,
    roughness: 0.8,
    metalness: 0.15,
    flatShading: true,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: "#5c4a8a",
    emissive: "#170f2b",
    emissiveIntensity: 0.5,
    roughness: 0.65,
    metalness: 0.2,
    flatShading: true,
  });
  const lightMetal = new THREE.MeshStandardMaterial({
    color: "#7d9bbd",
    emissive: "#0d2035",
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.25,
    flatShading: true,
  });
  const glowCyan = new THREE.MeshStandardMaterial({
    color: "#a9fbff",
    emissive: "#25d9ff",
    emissiveIntensity: 2.2,
    roughness: 0.25,
    metalness: 0.15,
  });
  const glowPink = new THREE.MeshStandardMaterial({
    color: "#ffd6fb",
    emissive: "#ff3fd8",
    emissiveIntensity: 1.9,
    roughness: 0.3,
    metalness: 0.1,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: "#8ff1ff",
    emissive: "#2fd3ff",
    emissiveIntensity: 1,
    roughness: 0.12,
    metalness: 0.45,
    transparent: true,
    opacity: 0.42,
  });
  const screenMaterials: THREE.MeshBasicMaterial[] = [];

  // Platform + glowing rim.
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(10, 10.6, 0.6, 8), baseMaterial);
  platform.position.y = 0.3;
  platform.receiveShadow = true;
  platform.castShadow = true;
  group.add(platform);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(9.7, 0.14, 6, 8), glowCyan);
  rim.rotation.x = Math.PI / 2;
  rim.rotation.z = Math.PI / 8;
  rim.position.y = 0.64;
  group.add(rim);

  const innerPad = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.12, 8), metalMaterial);
  innerPad.position.y = 0.68;
  innerPad.receiveShadow = true;
  group.add(innerPad);

  // Glowing approach path, pointing back toward the ring road.
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 12),
    new THREE.MeshBasicMaterial({ color: "#1a6e91", transparent: true, opacity: 0.75 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.09, -15.2);
  group.add(path);

  const pathLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 11.2),
    new THREE.MeshBasicMaterial({ color: "#5ef2ff", transparent: true, opacity: 0.85 }),
  );
  pathLine.rotation.x = -Math.PI / 2;
  pathLine.position.set(0, 0.1, -15.2);
  group.add(pathLine);

  // Central hexagonal research tower.
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 7.2, 6), baseMaterial);
  tower.position.y = 4.2;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const towerBand = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 1.35, 6), glassMaterial);
  towerBand.position.y = 5.35;
  group.add(towerBand);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 3.5, 1.2, 6), lightMetal);
  crown.position.y = 8.35;
  crown.castShadow = true;
  group.add(crown);

  const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(2.7, 1), glassMaterial);
  dome.position.y = 9.5;
  dome.scale.y = 0.62;
  dome.castShadow = true;
  group.add(dome);

  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.17, 4.6, 0.12), index % 2 === 0 ? glowCyan : glowPink);
    strip.position.set(Math.sin(angle) * 3.36, 4.1, Math.cos(angle) * 3.36);
    strip.rotation.y = angle;
    group.add(strip);
  }

  // Holographic "AI" marker above the tower.
  const aiTexture = makeCanvasTexture(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#bff9ff";
      ctx.font = '700 170px "Amatic SC", "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#36e6ff";
      ctx.shadowBlur = 28;
      ctx.fillText("AI", width / 2, height / 2);
    },
    512,
    256,
  );
  const aiSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 1.9),
    new THREE.MeshBasicMaterial({
      map: aiTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  aiSign.position.set(0, 11.4, 0);
  group.add(aiSign);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), glowCyan);
  core.position.set(0, 11.1, 0);
  group.add(core);

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.09, 6, 28), glowPink);
  ringA.position.set(0, 11.1, 0);
  ringA.rotation.x = Math.PI / 2.4;
  group.add(ringA);

  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.07, 6, 28), glowCyan);
  ringB.position.set(0, 11.1, 0);
  ringB.rotation.x = Math.PI / 1.7;
  ringB.rotation.y = Math.PI / 3;
  group.add(ringB);

  const beacon = new THREE.PointLight("#45e9ff", 34, 42, 1.8);
  beacon.position.set(0, 10.4, 0);
  group.add(beacon);

  // Soft wash that keeps the approach side readable while the sun is behind it.
  const wash = new THREE.PointLight("#59d8ff", 55, 30, 1.5);
  wash.position.set(0, 5, -11);
  group.add(wash);

  // Server wings.
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 3.4), metalMaterial);
    wing.position.set(side * 6.3, 1.45, 1.1);
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);

    const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.24, 3.8), lightMetal);
    wingRoof.position.set(side * 6.3, 2.63, 1.1);
    group.add(wingRoof);

    for (let rack = 0; rack < 2; rack++) {
      const server = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.65, 1.5), baseMaterial);
      server.position.set(side * (5.3 + rack * 1.55), 2.7, 0.8);
      server.castShadow = true;
      group.add(server);

      for (let led = 0; led < 3; led++) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.07, 0.04),
          led === 1 ? glowPink : glowCyan,
        );
        strip.position.set(side * (5.3 + rack * 1.55), 2.25 + led * 0.32, 1.57);
        group.add(strip);
      }
    }
  }

  // Floating geometry orbiting the facility.
  const floaters: THREE.Mesh[] = [];
  const floaterGeometry = new THREE.OctahedronGeometry(0.55, 0);
  const floaterMaterials = [glowCyan, glowPink, lightMetal];
  for (let index = 0; index < 9; index++) {
    const angle = (index / 9) * Math.PI * 2;
    const radius = 7.2 + (index % 3) * 0.9;
    const floater = new THREE.Mesh(floaterGeometry, floaterMaterials[index % 3]);
    floater.position.set(Math.sin(angle) * radius, 3.1 + (index % 4) * 0.85, Math.cos(angle) * radius);
    floater.rotation.set(angle, angle * 0.7, angle * 0.3);
    floater.userData.baseY = floater.position.y;
    floater.userData.phase = angle;
    floater.userData.spin = 0.35 + (index % 4) * 0.12;
    group.add(floater);
    floaters.push(floater);
  }

  // Holographic data screens.
  const holograms: THREE.Mesh[] = [];
  const hologramTextures = [
    makeCanvasTexture((ctx, width, height) => drawNeuralScreen(ctx, width, height), 512, 256),
    makeCanvasTexture((ctx, width, height) => drawChartScreen(ctx, width, height), 512, 256),
    makeCanvasTexture((ctx, width, height) => drawCodeScreen(ctx, width, height), 512, 256),
  ];
  const screenPositions = [
    { x: -5.6, y: 4.1, z: -2.6, ry: 0.5 },
    { x: 5.6, y: 4.1, z: -2.6, ry: -0.5 },
    { x: 0, y: 5.1, z: -4.6, ry: 0 },
  ];
  screenPositions.forEach((position, index) => {
    const material = new THREE.MeshBasicMaterial({
      map: hologramTextures[index],
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    screenMaterials.push(material);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), material);
    screen.position.set(position.x, position.y, position.z);
    screen.rotation.y = position.ry;
    screen.userData.baseY = position.y;
    screen.userData.phase = index * 1.4;
    group.add(screen);
    holograms.push(screen);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.85, 2.05, 0.08), metalMaterial);
    frame.position.set(position.x, position.y, position.z - 0.06);
    frame.rotation.y = position.ry;
    group.add(frame);
  });

  // Neural network visualisation on the front lawn.
  const neural = new THREE.Group();
  neural.position.set(0, 0.95, -6.2);
  group.add(neural);

  const nodePositions: THREE.Vector3[] = [];
  for (let layer = 0; layer < 3; layer++) {
    for (let row = 0; row < 4; row++) {
      nodePositions.push(
        new THREE.Vector3((layer - 1) * 1.35, 0.7 + row * 0.22, (row - 1.5) * 0.42 + layer * 0.18),
      );
    }
  }
  const nodeGeometry = new THREE.SphereGeometry(0.11, 8, 6);
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: "#74f4ff" });
  const nodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodePositions.length);
  const nodeMatrix = new THREE.Matrix4();
  nodePositions.forEach((position, index) => {
    nodeMatrix.makeTranslation(position.x, position.y, position.z);
    nodes.setMatrixAt(index, nodeMatrix);
  });
  nodes.instanceMatrix.needsUpdate = true;
  neural.add(nodes);

  const linePoints: number[] = [];
  for (let layer = 0; layer < 2; layer++) {
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        if ((a + b + layer) % 3 !== 0) continue;
        const from = nodePositions[layer * 4 + a];
        const to = nodePositions[(layer + 1) * 4 + b];
        linePoints.push(from.x, from.y, from.z, to.x, to.y, to.z);
      }
    }
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePoints, 3));
  neural.add(
    new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({ color: "#3bd7ff", transparent: true, opacity: 0.55 }),
    ),
  );

  const neuralBase = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.5, 0.32, 8), lightMetal);
  neuralBase.position.set(0, 0.16, -6.2);
  neuralBase.castShadow = true;
  group.add(neuralBase);

  // Interactive project terminals. The UI handles project selection; the
  // terminals give each project a physical presence in the world.
  const terminals = new THREE.Group();
  AI_PROJECTS.forEach((project, index) => {
    const angle = (index / AI_PROJECTS.length) * Math.PI * 2 + Math.PI / 4;
    const radius = 7.1;
    const kiosk = new THREE.Group();
    kiosk.position.set(Math.sin(angle) * radius, 0.75, Math.cos(angle) * radius);
    kiosk.rotation.y = angle + Math.PI;

    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.55), metalMaterial);
    stand.position.y = 0.85;
    stand.castShadow = true;
    kiosk.add(stand);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 0.78),
      new THREE.MeshStandardMaterial({
        map: signTexture(project.title, {
          background: "#041a29",
          accent: project.accent,
          size: 66,
        }),
        emissive: project.accent,
        emissiveIntensity: 0.55,
        roughness: 0.4,
      }),
    );
    screen.position.set(0, 1.08, 0.29);
    kiosk.add(screen);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.05, 0.05), glowCyan);
    glow.position.set(0, 1.56, 0.31);
    kiosk.add(glow);

    terminals.add(kiosk);
  });
  group.add(terminals);

  // Entrance sign.
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 1.8),
    new THREE.MeshStandardMaterial({
      map: signTexture("AI Lab", { background: "#041b2b", accent: "#4ad9ff", size: 92 }),
      emissive: "#0e7f9c",
      emissiveIntensity: 0.8,
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
  sign.position.set(0, 3.2, -8.8);
  sign.rotation.y = Math.PI;
  group.add(sign);

  // Gateway posts so the sign reads as an entrance rather than a floating panel.
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.18), metalMaterial);
    post.position.set(side * 2.7, 1.6, -8.8);
    post.castShadow = true;
    group.add(post);

    const postGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.06), glowCyan);
    postGlow.position.set(side * 2.7, 1.7, -8.7);
    group.add(postGlow);
  }

  // Soft cyan crystals around the rim.
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2 + 0.25;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.1, 5), glowCyan);
    crystal.position.set(Math.sin(angle) * 9.1, 1.1, Math.cos(angle) * 9.1);
    crystal.rotation.z = (index % 2 === 0 ? 1 : -1) * 0.18;
    group.add(crystal);
  }

  // Particles: one draw call, animated by rotating the parent group.
  const particleCount = 150;
  const particlePositions = new Float32Array(particleCount * 3);
  let seed = 1234;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  for (let index = 0; index < particleCount; index++) {
    const angle = random() * Math.PI * 2;
    const radius = 2.4 + random() * 8.2;
    particlePositions[index * 3] = Math.sin(angle) * radius;
    particlePositions[index * 3 + 1] = 0.8 + random() * 9.6;
    particlePositions[index * 3 + 2] = Math.cos(angle) * radius;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: "#7df4ff",
      size: 0.16,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  const particleGroup = new THREE.Group();
  particleGroup.position.y = 0.6;
  particleGroup.add(particles);
  group.add(particleGroup);

  return {
    group,
    core,
    rings: [ringA, ringB],
    holograms,
    floaters,
    terminals,
    neural,
    particles,
    particleGroup,
    beacon,
    screens: screenMaterials,
  };
}

function drawNeuralScreen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(3, 24, 38, 0.7)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(65, 226, 255, 0.22)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  const points = [
    [70, 190],
    [150, 120],
    [235, 160],
    [320, 82],
    [410, 128],
    [470, 58],
  ] as const;
  ctx.strokeStyle = "#54e8ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#ff6ce2";
  for (const [x, y] of points) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#9af7ff";
  ctx.font = '700 34px "Nunito", sans-serif';
  ctx.fillText("NEURAL CORE", 24, 40);
}

function drawChartScreen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(18, 8, 36, 0.72)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ff74e7";
  ctx.font = '700 34px "Nunito", sans-serif';
  ctx.fillText("MODEL METRICS", 24, 40);
  const bars = [0.3, 0.55, 0.42, 0.78, 0.62, 0.9, 0.7];
  bars.forEach((value, index) => {
    const barHeight = value * 150;
    ctx.fillStyle = index % 2 === 0 ? "#3ee6ff" : "#ff74e7";
    ctx.fillRect(32 + index * 64, height - 30 - barHeight, 38, barHeight);
  });
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, height - 28);
  ctx.lineTo(width - 24, height - 28);
  ctx.stroke();
}

function drawCodeScreen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(5, 28, 30, 0.72)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#8dffb0";
  ctx.font = '700 34px "Nunito", sans-serif';
  ctx.fillText("AGENT TRACE", 24, 40);
  const lines = [
    "inspect project",
    "plan multi-file edit",
    "validate changes",
    "capture evidence",
    "repair failure",
  ];
  lines.forEach((line, index) => {
    ctx.fillStyle = index % 2 === 0 ? "#bff9ff" : "#9de2b0";
    ctx.font = '700 24px "Nunito", sans-serif';
    ctx.fillText(`> ${line}`, 30, 90 + index * 30);
  });
}
