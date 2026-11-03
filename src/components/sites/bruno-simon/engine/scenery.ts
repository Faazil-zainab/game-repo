import * as THREE from "three";
import { AREAS, PROJECTS, flagUrl } from "../data";

export const ISLAND_RADIUS = 112;
export const ROAD_RADIUS = 40;
export const AREA_RADIUS = 58;
const DEG = Math.PI / 180;

export function areaPosition(angleDeg: number, radius = AREA_RADIUS) {
  const a = angleDeg * DEG;
  return new THREE.Vector3(Math.sin(a) * radius, 0, Math.cos(a) * radius);
}

function flatNear(distance: number, inner: number, outer: number) {
  if (distance <= inner) return 1;
  if (distance >= outer) return 0;
  const t = (distance - inner) / (outer - inner);
  return 1 - t * t * (3 - 2 * t);
}

/** Rolling dunes, flattened under the ring road and every area pad. */
export function terrainHeight(x: number, z: number) {
  const dist = Math.hypot(x, z);
  const rolling =
    Math.sin(x * 0.055) * Math.cos(z * 0.05) * 1.1 +
    Math.sin((x + z) * 0.11) * 0.45 +
    Math.cos(x * 0.031 - z * 0.067) * 0.65;

  let flat = Math.max(
    flatNear(dist, 12, 26),
    flatNear(Math.abs(dist - ROAD_RADIUS), 7, 14),
  );
  for (const area of AREAS) {
    const p = areaPosition(area.angle, area.radius);
    flat = Math.max(flat, flatNear(Math.hypot(x - p.x, z - p.z), 10, 20));
  }
  return rolling * (1 - flat);
}

export function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  width = 512,
  height = 256,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function signTexture(
  text: string,
  options: { background?: string; color?: string; accent?: string; size?: number } = {},
) {
  const background = options.background ?? "#241e2a";
  const color = options.color ?? "#fff6ee";
  const accent = options.accent ?? "#ffceca";
  return makeCanvasTexture(
    (ctx, width, height) => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, width - 16, height - 16);
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${options.size ?? 96}px "Amatic SC", "Segoe UI", sans-serif`;
      ctx.fillText(text.toUpperCase(), width / 2, height / 2 + 4);
    },
    512,
    192,
  );
}

export function flagTexture(code: string) {
  const texture = new THREE.TextureLoader().load(flagUrl(code));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

export function buildSky() {
  const geometry = new THREE.SphereGeometry(620, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color("#63c5ef") },
      midColor: { value: new THREE.Color("#b9e4f2") },
      bottomColor: { value: new THREE.Color("#ffd8b4") },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        vec3 low = mix(bottomColor, midColor, smoothstep(-0.08, 0.28, h));
        vec3 col = mix(low, topColor, smoothstep(0.25, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.frustumCulled = false;
  return sky;
}

export function buildSun() {
  const texture = makeCanvasTexture((ctx, width, height) => {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, "rgba(255,247,214,1)");
    gradient.addColorStop(0.32, "rgba(255,225,166,0.95)");
    gradient.addColorStop(0.62, "rgba(255,190,140,0.28)");
    gradient.addColorStop(1, "rgba(255,180,140,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, 256, 256);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.setScalar(120);
  sprite.position.set(190, 170, -260);
  return sprite;
}

export function buildWater() {
  const group = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(900, 64),
    new THREE.MeshStandardMaterial({
      color: "#31bccb",
      roughness: 0.22,
      metalness: 0.25,
      transparent: true,
      opacity: 0.94,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -8.6;
  group.add(water);

  const deep = new THREE.Mesh(
    new THREE.CircleGeometry(1400, 64),
    new THREE.MeshStandardMaterial({ color: "#128a9e", roughness: 0.4 }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -9.2;
  group.add(deep);

  const foam = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND_RADIUS + 0.4, 0.5, 8, 200),
    new THREE.MeshBasicMaterial({ color: "#d7f8f3", transparent: true, opacity: 0.85 }),
  );
  foam.rotation.x = Math.PI / 2;
  foam.position.y = -7.7;
  group.add(foam);

  // Shallow turquoise shelf around the island adds depth without post-processing.
  const shallows = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS - 2, ISLAND_RADIUS + 22, 180),
    new THREE.MeshBasicMaterial({
      color: "#8af3e7",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shallows.rotation.x = -Math.PI / 2;
  shallows.position.y = -7.9;
  group.add(shallows);

  const glint = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS + 34, ISLAND_RADIUS + 36, 160),
    new THREE.MeshBasicMaterial({ color: "#c9fff8", transparent: true, opacity: 0.18 }),
  );
  glint.rotation.x = -Math.PI / 2;
  glint.position.y = -8.35;
  group.add(glint);

  return { group, water, foam };
}

export function buildTerrain() {
  const geometry = new THREE.CircleGeometry(ISLAND_RADIUS, 200, 0, Math.PI * 2);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors: number[] = [];
  const sand = new THREE.Color("#f2b07f");
  const lightSand = new THREE.Color("#ffcf9e");
  const grass = new THREE.Color("#a9c05c");
  const dryGrass = new THREE.Color("#c9c76a");
  const dirt = new THREE.Color("#de9a6a");

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, terrainHeight(x, z));
    const patch =
      Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.5 +
      Math.sin((x + z) * 0.09) * 0.5;
    const distance = Math.hypot(x, z);
    const color = new THREE.Color();
    if (patch > 0.2) color.copy(grass).lerp(dryGrass, patch);
    else if (distance > ISLAND_RADIUS * 0.82) color.copy(dirt);
    else color.copy(sand).lerp(lightSand, patch + 0.5);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.98,
      metalness: 0,
      flatShading: true,
    }),
  );
  mesh.receiveShadow = true;
  return mesh;
}

export function buildCliff() {
  const geometry = new THREE.CylinderGeometry(ISLAND_RADIUS + 0.2, 98, 30, 140, 3, true);
  const material = new THREE.MeshStandardMaterial({
    color: "#9b6f5f",
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -15;
  return mesh;
}

export function buildRoads() {
  const group = new THREE.Group();
  const roadMaterial = new THREE.MeshStandardMaterial({ color: "#eeb488", roughness: 0.92 });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: "#d78d61", roughness: 0.95 });
  const plazaMaterial = new THREE.MeshStandardMaterial({ color: "#f6c497", roughness: 0.9 });

  const ring = new THREE.Mesh(new THREE.RingGeometry(ROAD_RADIUS - 6.5, ROAD_RADIUS + 6.5, 160), roadMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.055;
  ring.receiveShadow = true;
  group.add(ring);

  for (const [inner, outer] of [
    [ROAD_RADIUS - 7.1, ROAD_RADIUS - 6.2],
    [ROAD_RADIUS + 6.2, ROAD_RADIUS + 7.1],
  ]) {
    const edge = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 160), edgeMaterial);
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.065;
    group.add(edge);
  }

  const plaza = new THREE.Mesh(new THREE.CircleGeometry(19, 64), plazaMaterial);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.05;
  plaza.receiveShadow = true;
  group.add(plaza);

  const plazaEdge = new THREE.Mesh(new THREE.RingGeometry(19, 20.1, 96), edgeMaterial);
  plazaEdge.rotation.x = -Math.PI / 2;
  plazaEdge.position.y = 0.06;
  group.add(plazaEdge);

  for (const area of AREAS) {
    const spoke = new THREE.Group();
    const pathInner = 19;
    const pathLength = Math.max(7, area.radius - 12 - pathInner);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(10, pathLength), roadMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.z = pathInner + pathLength / 2;
    path.position.y = 0.055;
    path.receiveShadow = true;
    spoke.add(path);

    const pad = new THREE.Mesh(new THREE.CircleGeometry(12, 48), plazaMaterial);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.052, area.radius);
    pad.receiveShadow = true;
    spoke.add(pad);

    const trim = new THREE.Mesh(new THREE.RingGeometry(12, 12.9, 64), edgeMaterial);
    trim.rotation.x = -Math.PI / 2;
    trim.position.set(0, 0.062, area.radius);
    spoke.add(trim);

    spoke.rotation.y = area.angle * DEG;
    group.add(spoke);
  }

  const dashGeometry = new THREE.BoxGeometry(0.35, 0.02, 2.6);
  const dashMaterial = new THREE.MeshBasicMaterial({ color: "#fff1dc" });
  const dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, 60);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
    matrix.compose(
      new THREE.Vector3(Math.sin(angle) * ROAD_RADIUS, 0.1, Math.cos(angle) * ROAD_RADIUS),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    dashes.setMatrixAt(i, matrix);
  }
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);

  return group;
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export function buildTree(scale = 1, foliage = "#ff769c") {
  const group = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#8a5b45", roughness: 1, flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 3.4, 6), trunkMaterial);
  trunk.position.y = 1.7;
  trunk.castShadow = true;
  group.add(trunk);

  const leafMaterial = new THREE.MeshStandardMaterial({ color: foliage, roughness: 0.95, flatShading: true });
  const blobs = [
    { x: 0, y: 4.1, z: 0, s: 2.3 },
    { x: 1.4, y: 3.5, z: 0.5, s: 1.5 },
    { x: -1.3, y: 3.6, z: -0.4, s: 1.6 },
    { x: 0.2, y: 3.4, z: -1.3, s: 1.3 },
  ];
  for (const blob of blobs) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(blob.s, 1), leafMaterial);
    leaf.position.set(blob.x, blob.y, blob.z);
    leaf.rotation.set(blob.x, blob.z, blob.y);
    leaf.userData.swayPhase = blob.x * 1.7 + blob.y * 0.6 + blob.z;
    leaf.userData.swayBaseZ = leaf.rotation.z;
    leaf.castShadow = true;
    group.add(leaf);
  }
  group.scale.setScalar(scale);
  return group;
}

export function buildPalm(scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.42, 5, 6),
    new THREE.MeshStandardMaterial({ color: "#a8704f", roughness: 1, flatShading: true }),
  );
  trunk.position.y = 2.5;
  trunk.rotation.z = 0.08;
  group.add(trunk);

  const leafMaterial = new THREE.MeshStandardMaterial({ color: "#7fbd57", roughness: 1, flatShading: true, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.4, 4), leafMaterial);
    leaf.position.y = 5;
    leaf.rotation.z = Math.PI / 2.6;
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.position.x = Math.sin((i / 7) * Math.PI * 2) * 1.1;
    leaf.position.z = Math.cos((i / 7) * Math.PI * 2) * 1.1;
    leaf.userData.swayPhase = i * 0.9;
    leaf.userData.swayBaseZ = leaf.rotation.z;
    group.add(leaf);
  }
  group.scale.setScalar(scale);
  return group;
}

export function buildBench() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#e0915f", roughness: 0.85, flatShading: true });
  const metal = new THREE.MeshStandardMaterial({ color: "#7b6f80", roughness: 0.8 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 1), wood);
  seat.position.y = 1;
  seat.castShadow = true;
  group.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 0.2), wood);
  back.position.set(0, 1.55, -0.45);
  back.rotation.x = -0.12;
  group.add(back);

  for (const x of [-1.35, 1.35]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.8), metal);
    leg.position.set(x, 0.5, 0);
    group.add(leg);
  }
  return group;
}

export function buildLamp(withLight = false) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: "#6c5a7a", roughness: 0.7, metalness: 0.25 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3.8, 8), metal);
  post.position.y = 1.9;
  post.castShadow = true;
  group.add(post);

  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.42, 0.9, 4),
    new THREE.MeshStandardMaterial({ color: "#ffd27a", emissive: "#ffb347", emissiveIntensity: 1.4, roughness: 0.6 }),
  );
  shade.position.y = 3.9;
  shade.rotation.y = Math.PI / 4;
  group.add(shade);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(1, 0.5, 4), metal);
  cap.position.y = 4.55;
  cap.rotation.y = Math.PI / 4;
  group.add(cap);

  if (withLight) {
    const light = new THREE.PointLight("#ffc06a", 9, 16, 1.8);
    light.position.y = 3.8;
    group.add(light);
  }
  return group;
}

export function buildTent(label: string, color = "#c21515") {
  const group = new THREE.Group();
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4, 2.4, 4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }),
  );
  roof.position.y = 4.6;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const poleMaterial = new THREE.MeshStandardMaterial({ color: "#4b3f52", roughness: 0.8 });
  for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6), poleMaterial);
    pole.position.set(x, 1.8, z);
    group.add(pole);
  }

  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 1.1, 1.2),
    new THREE.MeshStandardMaterial({ color: "#3b2f47", roughness: 0.9 }),
  );
  counter.position.set(0, 0.55, 2.2);
  counter.castShadow = true;
  group.add(counter);

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.3),
    new THREE.MeshStandardMaterial({
      map: signTexture(label, { background: "#1d1721", size: Math.max(34, 74 - label.length * 2) }),
      transparent: true,
    }),
  );
  board.position.set(0, 1.85, 2.82);
  group.add(board);

  return group;
}

export function buildObelisk() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: "#6f5a93", roughness: 0.85, flatShading: true });
  const glow = new THREE.MeshStandardMaterial({
    color: "#b58cff",
    emissive: "#8f5cff",
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.6, 0.8, 8), stone);
  base.position.y = 0.35;
  base.receiveShadow = true;
  group.add(base);

  const pool = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.25, 8), new THREE.MeshStandardMaterial({ color: "#5b7fd6", emissive: "#3f63b8", transparent: true, opacity: 0.9, roughness: 0.2 }));
  pool.position.y = 0.82;
  group.add(pool);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.1, 9.5, 4), stone);
  column.position.y = 5.6;
  column.rotation.y = Math.PI / 4;
  column.castShadow = true;
  group.add(column);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 4), glow);
  tip.position.y = 11.2;
  tip.rotation.y = Math.PI / 4;
  group.add(tip);

  for (const y of [1.6, 4.2, 7.4]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.08, 6, 4), glow);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = Math.PI / 4;
    ring.position.y = y;
    group.add(ring);
  }

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 1),
    new THREE.MeshStandardMaterial({ color: "#b7ffd2", emissive: "#57ffa8", emissiveIntensity: 2 }),
  );
  orb.position.set(-9, 2.2, -7);
  orb.name = "secret-orb";
  group.add(orb);

  const orbLight = new THREE.PointLight("#6affb7", 8, 14, 2);
  orbLight.position.copy(orb.position);
  group.add(orbLight);

  return { group, orb };
}

export function buildKeyboard() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.7, 6),
    new THREE.MeshStandardMaterial({ color: "#cfc8dd", roughness: 0.75 }),
  );
  base.position.y = 0.4;
  base.rotation.x = -0.06;
  base.castShadow = true;
  group.add(base);

  const keyMaterial = new THREE.MeshStandardMaterial({ color: "#efe9f7", roughness: 0.7 });
  const litMaterial = new THREE.MeshStandardMaterial({
    color: "#ffe57a",
    emissive: "#ffc93c",
    emissiveIntensity: 1.5,
  });
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 12; col++) {
      const lit = (row === 1 && col % 4 === 0) || (row === 2 && col % 5 === 0);
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 0.85), lit ? litMaterial : keyMaterial);
      key.position.set(-6.4 + col * 1.16, 0.88, -1.7 + row * 1.08);
      group.add(key);
    }
  }
  return group;
}

export function buildGamepad() {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: "#b9aecb", roughness: 0.8, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.3, 3.6), shell);
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  for (const x of [-3.4, 3.4]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 4.2, 8), shell);
    grip.position.set(x, 0.5, 0.7);
    grip.rotation.x = Math.PI / 2.2;
    grip.rotation.z = x > 0 ? -0.2 : 0.2;
    group.add(grip);
  }

  const buttonMaterial = new THREE.MeshStandardMaterial({
    color: "#ffe57a",
    emissive: "#ffc93c",
    emissiveIntensity: 1.6,
  });
  for (const [x, z] of [[-1.5, 0.2], [-0.6, 0.6], [-0.6, -0.2], [0.3, 0.2]]) {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 12), buttonMaterial);
    button.position.set(x, 1.6, z);
    group.add(button);
  }
  const dpad = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: "#5d5269" }));
  dpad.position.set(1.9, 1.6, 0);
  group.add(dpad);
  const dpad2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: "#5d5269" }));
  dpad2.position.set(1.9, 1.6, 0);
  group.add(dpad2);

  return group;
}

export function buildJoystick() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 2, 0.6, 10),
    new THREE.MeshStandardMaterial({ color: "#4b3f52", roughness: 0.9 }),
  );
  base.position.y = 0.3;
  group.add(base);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: "#8f7aa8", roughness: 0.6 }),
  );
  stick.position.y = 1.6;
  group.add(stick);
  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 1),
    new THREE.MeshStandardMaterial({ color: "#ffe57a", emissive: "#ffc93c", emissiveIntensity: 1.2 }),
  );
  ball.position.y = 2.8;
  group.add(ball);
  return group;
}

export function buildStartArch() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: "#5b4a63", roughness: 0.7 });
  for (const x of [-6, 6]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9, 0.7), metal);
    post.position.set(x, 4.5, 0);
    post.castShadow = true;
    group.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(13.4, 1.1, 1), metal);
  beam.position.y = 9;
  group.add(beam);

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: "#c6ff6b",
    emissive: "#9bff2e",
    emissiveIntensity: 2,
  });
  for (let i = 0; i < 3; i++) {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), lightMaterial);
    light.position.set(-1.6 + i * 1.6, 8.35, 0.3);
    group.add(light);
  }

  const checker = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 3),
    new THREE.MeshStandardMaterial({
      map: makeCanvasTexture((ctx, width) => {
        const size = width / 10;
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 10; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? "#f7ecff" : "#2a1830";
            ctx.fillRect(x * size, y * size, size, size);
          }
        }
      }, 480, 144),
      roughness: 0.9,
    }),
  );
  checker.rotation.x = -Math.PI / 2;
  checker.position.set(0, 0.075, 0);
  group.add(checker);

  return group;
}

export function buildAreaSign(label: string, accent = "#ffceca", background = "#201a28") {
  const group = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: "#4b3f52", roughness: 0.8 });
  for (const x of [-2.4, 2.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 6), postMaterial);
    post.position.set(x, 1.6, 0);
    post.castShadow = true;
    group.add(post);
  }

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 1.65),
    new THREE.MeshStandardMaterial({
      map: signTexture(label, { background, accent, size: 78 }),
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
  board.position.set(0, 3.35, 0.04);
  group.add(board);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(5.9, 1.95, 0.14),
    new THREE.MeshStandardMaterial({ color: "#2a2030", roughness: 0.85 }),
  );
  back.position.set(0, 3.35, -0.04);
  group.add(back);

  return group;
}

export function buildGear(color = "#ffc67b") {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.4,
    flatShading: true,
  });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 12), material);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.52), material);
    tooth.position.set(Math.sin(angle) * 1.35, Math.cos(angle) * 1.35, 0);
    tooth.rotation.z = -angle;
    group.add(tooth);
  }
  group.position.y = 2.2;
  return group;
}

export function buildTireStack() {
  const group = new THREE.Group();
  const tyreMaterial = new THREE.MeshStandardMaterial({ color: "#2b2433", roughness: 0.95 });
  const hubMaterial = new THREE.MeshStandardMaterial({ color: "#ff7b3d", roughness: 0.5 });
  for (let index = 0; index < 3; index++) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.3, 8, 16), tyreMaterial);
    tyre.rotation.x = Math.PI / 2;
    tyre.position.y = 0.35 + index * 0.6;
    tyre.castShadow = true;
    group.add(tyre);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10), hubMaterial);
  hub.position.y = 1.62;
  group.add(hub);
  return group;
}

export function buildWhisperWall() {  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(16, 6, 0.7),
    new THREE.MeshStandardMaterial({ color: "#c2153f", roughness: 0.85 }),
  );
  wall.position.y = 3.2;
  wall.castShadow = true;
  group.add(wall);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(17.4, 0.5, 1.1),
    new THREE.MeshStandardMaterial({ color: "#4b2a4f", roughness: 0.8 }),
  );
  frame.position.y = 6.3;
  group.add(frame);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.6),
    new THREE.MeshStandardMaterial({
      map: signTexture("Whispers", { background: "#2a1220", accent: "#ff8fb1", size: 110 }),
      transparent: true,
    }),
  );
  sign.position.set(0, 7.6, 0);
  group.add(sign);

  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1, 0),
    new THREE.MeshStandardMaterial({ color: "#ffe57a", emissive: "#ffb0ff", emissiveIntensity: 2.2 }),
  );
  star.position.set(0, 0.9, 2.5);
  star.rotation.z = Math.PI / 4;
  group.add(star);

  const light = new THREE.PointLight("#ff8fce", 10, 20, 2);
  light.position.set(0, 4, 4);
  group.add(light);

  return { group, wall };
}

export function buildClouds() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: "#fff6ec",
    roughness: 1,
    transparent: true,
    opacity: 0.94,
    flatShading: true,
  });
  const clouds: THREE.Group[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    const puffs = 4 + Math.floor(rand() * 3);
    for (let j = 0; j < puffs; j++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + rand() * 4, 1), material);
      puff.position.set((j - puffs / 2) * 6 + rand() * 3, rand() * 3, rand() * 5);
      puff.scale.y = 0.7;
      cloud.add(puff);
    }
    const angle = rand() * Math.PI * 2;
    const radius = 120 + rand() * 180;
    cloud.position.set(Math.sin(angle) * radius, 48 + rand() * 26, Math.cos(angle) * radius);
    cloud.userData.speed = 0.4 + rand() * 0.6;
    group.add(cloud);
    clouds.push(cloud);
  }
  return { group, clouds };
}

export function buildStars() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 160 + Math.random() * 260;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.7 - 30;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#fff1ff",
    size: 1.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  });
  return new THREE.Points(geometry, material);
}

export function buildBackdrop() {
  const texture = makeCanvasTexture(
    (ctx, width, height) => {
      ctx.fillStyle = "#1a1420";
      ctx.fillRect(0, 0, width, height);

      // Thin diagonal grid lines, like the source's landing backdrop.
      ctx.strokeStyle = "rgba(150, 84, 120, 0.35)";
      ctx.lineWidth = 1.2;
      for (let i = -height; i < width + height; i += 170) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + height, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, height);
        ctx.lineTo(i + height, 0);
        ctx.stroke();
      }

      const marks = [
        "rgba(154, 82, 128, 0.85)",
        "rgba(120, 70, 110, 0.7)",
        "rgba(190, 96, 140, 0.5)",
      ];
      let seed = 17;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 90; i++) {
        const x = rand() * width;
        const y = rand() * height;
        const size = 5 + rand() * 5;
        ctx.strokeStyle = marks[Math.floor(rand() * marks.length)];
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.stroke();
      }
    },
    1024,
    1024,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 3);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(520, 32, 16),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false }),
  );
  sphere.frustumCulled = false;
  return sphere;
}

export function buildScatter() {
  const group = new THREE.Group();
  let seed = 42;
  const rand = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  const grassMaterial = new THREE.MeshStandardMaterial({ color: "#adbd55", roughness: 1, flatShading: true });
  const grassGeometry = new THREE.ConeGeometry(0.42, 1.35, 4);
  const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 380);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let placed = 0;
  while (placed < 380) {
    const angle = rand() * Math.PI * 2;
    const radius = 23 + rand() * 86;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.abs(radius - ROAD_RADIUS) < 8) continue;
    if (AREAS.some((area) => {
      const p = areaPosition(area.angle, area.radius);
      return Math.hypot(x - p.x, z - p.z) < 14;
    })) continue;
    const size = 0.6 + rand() * 0.9;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
    scale.set(size, size, size);
    matrix.compose(new THREE.Vector3(x, terrainHeight(x, z) + 0.6 * size, z), quaternion, scale);
    grass.setMatrixAt(placed, matrix);
    placed++;
  }
  grass.instanceMatrix.needsUpdate = true;
  group.add(grass);

  const pebbleGeometry = new THREE.DodecahedronGeometry(0.4, 0);
  const pebbleMaterial = new THREE.MeshStandardMaterial({ color: "#d9a6a0", roughness: 1, flatShading: true });
  const pebbles = new THREE.InstancedMesh(pebbleGeometry, pebbleMaterial, 180);
  for (let i = 0; i < 180; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 12 + rand() * 96;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const size = 0.5 + rand() * 1.2;
    quaternion.setFromAxisAngle(new THREE.Vector3(rand(), 1, rand()).normalize(), rand() * Math.PI);
    scale.set(size, size * 0.7, size);
    matrix.compose(new THREE.Vector3(x, terrainHeight(x, z) + 0.1, z), quaternion, scale);
    pebbles.setMatrixAt(i, matrix);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  group.add(pebbles);

  // Low-poly flowers and bushes fill the island with a few extra instanced draw calls.
  const flowerMaterial = new THREE.MeshStandardMaterial({
    color: "#ffd36e",
    emissive: "#b86b00",
    emissiveIntensity: 0.25,
    roughness: 0.9,
    flatShading: true,
  });
  const flowers = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3, 0), flowerMaterial, 140);
  let flowerCount = 0;
  while (flowerCount < 140) {
    const angle = rand() * Math.PI * 2;
    const radius = 22 + rand() * 84;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.abs(radius - ROAD_RADIUS) < 7) continue;
    if (
      AREAS.some((area) => {
        const p = areaPosition(area.angle, area.radius);
        return Math.hypot(x - p.x, z - p.z) < 13;
      })
    ) {
      continue;
    }
    const size = 0.55 + rand() * 0.9;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
    scale.set(size, size, size);
    matrix.compose(new THREE.Vector3(x, terrainHeight(x, z) + 0.35 * size, z), quaternion, scale);
    flowers.setMatrixAt(flowerCount, matrix);
    flowerCount++;
  }
  flowers.instanceMatrix.needsUpdate = true;
  group.add(flowers);

  const bushMaterial = new THREE.MeshStandardMaterial({ color: "#7fae4d", roughness: 1, flatShading: true });
  const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.9, 0), bushMaterial, 70);
  let bushCount = 0;
  while (bushCount < 70) {
    const angle = rand() * Math.PI * 2;
    const radius = 25 + rand() * 80;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.abs(radius - ROAD_RADIUS) < 8) continue;
    if (
      AREAS.some((area) => {
        const p = areaPosition(area.angle, area.radius);
        return Math.hypot(x - p.x, z - p.z) < 14;
      })
    ) {
      continue;
    }
    const size = 0.65 + rand() * 0.75;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
    scale.set(size, size * 0.8, size);
    matrix.compose(new THREE.Vector3(x, terrainHeight(x, z) + 0.55 * size, z), quaternion, scale);
    bushes.setMatrixAt(bushCount, matrix);
    bushCount++;
  }
  bushes.instanceMatrix.needsUpdate = true;
  group.add(bushes);

  return group;
}

export function buildWhisperSprite(text: string, code: string) {
  const texture = makeCanvasTexture(
    (ctx, width, height) => {
      ctx.fillStyle = "#251f2b";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#ffceca";
      ctx.lineWidth = 5;
      ctx.strokeRect(6, 6, width - 12, height - 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.min(120, 900 / Math.max(1, text.length))}px "Amatic SC", "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text.slice(0, 30), width / 2, height / 2 - 12);
      ctx.font = "700 34px Nunito, sans-serif";
      ctx.fillStyle = "#ffceca";
      ctx.fillText(code.toUpperCase(), width - 54, height - 34);
    },
    640,
    200,
  );
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(8.4, 2.6, 1);
  return sprite;
}

export function buildProjectSigns() {
  const group = new THREE.Group();
  PROJECTS.forEach((project) => {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.6),
      new THREE.MeshStandardMaterial({
        map: signTexture(project.title, { background: "#2b2130", accent: project.accent, size: 68 }),
        transparent: true,
        side: THREE.DoubleSide,
      }),
    );
    sign.name = "project-sign";
    group.add(sign);
  });
  return group;
}
