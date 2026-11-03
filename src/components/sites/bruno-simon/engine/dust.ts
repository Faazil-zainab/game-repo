import * as THREE from "three";

const vertexShader = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  uniform float uScale;

  void main() {
    vLife = aLife;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (uScale / max(1.0, -viewPosition.z));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vLife;

  void main() {
    if (vLife <= 0.001) discard;
    vec2 offset = gl_PointCoord - 0.5;
    float radius = length(offset);
    if (radius > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, radius);
    gl_FragColor = vec4(uColor, soft * min(1.0, vLife * 1.9) * 0.32);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Fixed-size pool of soft dust/spray puffs rendered as a single Points draw call.
 * Particles are simulated on the CPU, which keeps the allocation count at zero
 * during normal driving.
 */
export class DustField {
  readonly points: THREE.Points;
  intensity = 1;

  private readonly count: number;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly sizes: Float32Array;
  private readonly positionAttribute: THREE.BufferAttribute;
  private readonly lifeAttribute: THREE.BufferAttribute;
  private readonly material: THREE.ShaderMaterial;
  private cursor = 0;
  private activeCount = 0;

  constructor(count = 180) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.positions[i * 3 + 1] = -999;
      this.sizes[i] = 0.9;
    }

    const geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3).setUsage(
      THREE.DynamicDrawUsage,
    );
    this.lifeAttribute = new THREE.BufferAttribute(this.life, 1).setUsage(
      THREE.DynamicDrawUsage,
    );
    geometry.setAttribute("position", this.positionAttribute);
    geometry.setAttribute("aLife", this.lifeAttribute);
    geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color("#ffe7c8").convertSRGBToLinear() },
        uScale: { value: 260 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.name = "dust-field";
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.points.visible = false;
  }

  setPixelRatio(ratio: number) {
    this.material.uniforms.uScale.value = Math.max(1, ratio) * 175;
  }

  spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    lifetime: number,
  ) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const offset = index * 3;
    const wasInactive = this.life[index] <= 0;
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
    this.velocities[offset] = vx;
    this.velocities[offset + 1] = vy;
    this.velocities[offset + 2] = vz;
    this.life[index] = 1;
    this.maxLife[index] = Math.max(0.15, lifetime);
    this.sizes[index] = size;
    if (wasInactive) this.activeCount++;
    this.points.visible = true;
    (this.points.geometry.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
    this.lifeAttribute.needsUpdate = true;
    this.positionAttribute.needsUpdate = true;
  }

  update(delta: number) {
    let changed = false;
    const damping = Math.exp(-delta * 1.7);

    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= delta / this.maxLife[i];
      changed = true;

      if (this.life[i] <= 0) {
        this.life[i] = 0;
        this.activeCount--;
        this.positions[i * 3 + 1] = -999;
        continue;
      }

      const offset = i * 3;
      this.velocities[offset] *= damping;
      this.velocities[offset + 1] = this.velocities[offset + 1] * damping + 0.55 * delta;
      this.velocities[offset + 2] *= damping;
      this.positions[offset] += this.velocities[offset] * delta;
      this.positions[offset + 1] += this.velocities[offset + 1] * delta;
      this.positions[offset + 2] += this.velocities[offset + 2] * delta;
    }

    if (changed) {
      this.positionAttribute.needsUpdate = true;
      this.lifeAttribute.needsUpdate = true;
      if (this.activeCount === 0) this.points.visible = false;
    }
  }

  clear() {
    this.activeCount = 0;
    for (let i = 0; i < this.count; i++) {
      this.life[i] = 0;
      this.positions[i * 3 + 1] = -999;
    }
    this.points.visible = false;
    this.lifeAttribute.needsUpdate = true;
    this.positionAttribute.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
