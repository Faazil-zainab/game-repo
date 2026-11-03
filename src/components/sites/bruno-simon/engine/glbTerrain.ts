import * as THREE from "three";

export interface TerrainSpawn {
  x: number;
  z: number;
  height: number;
}

export interface TerrainDiagnostics {
  resolution: number;
  cellCount: number;
  validCellCount: number;
  coverage: number;
  triangleCount: number;
  topFacingTriangleCount: number;
  minHeight: number;
  maxHeight: number;
}

/**
 * A compact, precomputed height lookup for the loaded GLB. It samples only
 * upward-facing triangles once during loading; gameplay never raycasts the
 * full GLB or allocates temporary vectors per frame.
 */
export class GLBTerrainSampler {
  private readonly resolution: number;
  private readonly bounds: THREE.Box3;
  private readonly cellWidth: number;
  private readonly cellDepth: number;
  private readonly weightedHeights: Float64Array;
  private readonly weights: Float64Array;
  private readonly counts: Uint32Array;
  private readonly minHeights: Float32Array;
  private readonly maxHeights: Float32Array;
  private heightOffset = 0;
  private triangleCount = 0;
  private topFacingTriangleCount = 0;

  private constructor(bounds: THREE.Box3, resolution: number) {
    this.bounds = bounds.clone();
    this.resolution = resolution;
    this.cellWidth = bounds.getSize(new THREE.Vector3()).x / resolution;
    this.cellDepth = bounds.getSize(new THREE.Vector3()).z / resolution;
    this.weightedHeights = new Float64Array(resolution * resolution);
    this.weights = new Float64Array(resolution * resolution);
    this.counts = new Uint32Array(resolution * resolution);
    this.minHeights = new Float32Array(resolution * resolution).fill(Infinity);
    this.maxHeights = new Float32Array(resolution * resolution).fill(-Infinity);
  }

  static fromObject(root: THREE.Object3D, resolution = 128) {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    if (size.x <= 0 || size.z <= 0) {
      throw new Error("The GLB has no horizontal surface to sample.");
    }

    const sampler = new GLBTerrainSampler(bounds, resolution);
    sampler.collectTopFacingTriangles(root);
    return sampler;
  }

  private collectTopFacingTriangles(root: THREE.Object3D) {
    const pointA = new THREE.Vector3();
    const pointB = new THREE.Vector3();
    const pointC = new THREE.Vector3();
    const edgeAB = new THREE.Vector3();
    const edgeAC = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const position = object.geometry.getAttribute("position");
      if (!position) return;
      const index = object.geometry.index;
      const triangleCount = index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);
      this.triangleCount += triangleCount;

      for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        const indexOffset = triangle * 3;
        const indexA = index ? index.getX(indexOffset) : indexOffset;
        const indexB = index ? index.getX(indexOffset + 1) : indexOffset + 1;
        const indexC = index ? index.getX(indexOffset + 2) : indexOffset + 2;

        pointA.set(position.getX(indexA), position.getY(indexA), position.getZ(indexA)).applyMatrix4(object.matrixWorld);
        pointB.set(position.getX(indexB), position.getY(indexB), position.getZ(indexB)).applyMatrix4(object.matrixWorld);
        pointC.set(position.getX(indexC), position.getY(indexC), position.getZ(indexC)).applyMatrix4(object.matrixWorld);

        edgeAB.subVectors(pointB, pointA);
        edgeAC.subVectors(pointC, pointA);
        faceNormal.crossVectors(edgeAB, edgeAC);
        const doubleArea = faceNormal.length();
        if (doubleArea <= 1e-7 || faceNormal.y / doubleArea < 0.5) continue;

        this.topFacingTriangleCount += 1;
        const centerX = (pointA.x + pointB.x + pointC.x) / 3;
        const centerY = (pointA.y + pointB.y + pointC.y) / 3;
        const centerZ = (pointA.z + pointB.z + pointC.z) / 3;
        const cellX = Math.floor((centerX - this.bounds.min.x) / this.cellWidth);
        const cellZ = Math.floor((centerZ - this.bounds.min.z) / this.cellDepth);
        if (cellX < 0 || cellX >= this.resolution || cellZ < 0 || cellZ >= this.resolution) continue;

        const cell = cellZ * this.resolution + cellX;
        const area = doubleArea * 0.5;
        this.weightedHeights[cell] += centerY * area;
        this.weights[cell] += area;
        this.counts[cell] += 1;
        this.minHeights[cell] = Math.min(this.minHeights[cell], pointA.y, pointB.y, pointC.y);
        this.maxHeights[cell] = Math.max(this.maxHeights[cell], pointA.y, pointB.y, pointC.y);
      }
    });
  }

  setHeightOffset(offset: number) {
    this.heightOffset = offset;
  }

  sample(x: number, z: number): number | null {
    if (x < this.bounds.min.x || x > this.bounds.max.x || z < this.bounds.min.z || z > this.bounds.max.z) {
      return null;
    }

    const gridX = (x - this.bounds.min.x) / this.cellWidth - 0.5;
    const gridZ = (z - this.bounds.min.z) / this.cellDepth - 0.5;
    const baseX = Math.floor(gridX);
    const baseZ = Math.floor(gridZ);
    const fractionX = gridX - baseX;
    const fractionZ = gridZ - baseZ;
    const nearestX = Math.round(gridX);
    const nearestZ = Math.round(gridZ);

    if (!this.isValidCell(nearestX, nearestZ)) return null;

    let weightedHeight = 0;
    let totalWeight = 0;
    for (let dz = 0; dz <= 1; dz += 1) {
      for (let dx = 0; dx <= 1; dx += 1) {
        const cellX = baseX + dx;
        const cellZ = baseZ + dz;
        if (!this.isValidCell(cellX, cellZ)) continue;
        const weight = (dx === 0 ? 1 - fractionX : fractionX) * (dz === 0 ? 1 - fractionZ : fractionZ);
        const cell = cellZ * this.resolution + cellX;
        weightedHeight += (this.weightedHeights[cell] / this.weights[cell]) * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0.2 ? weightedHeight / totalWeight + this.heightOffset : null;
  }

  findSafeSpawn(preferredX = 0, preferredZ = 0): TerrainSpawn | null {
    let best: TerrainSpawn | null = null;
    let bestScore = Infinity;

    for (let z = 1; z < this.resolution - 1; z += 1) {
      for (let x = 1; x < this.resolution - 1; x += 1) {
        const neighbors = [];
        let density = 0;
        for (let dz = -1; dz <= 1; dz += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const cellX = x + dx;
            const cellZ = z + dz;
            if (!this.isValidCell(cellX, cellZ)) continue;
            const cell = cellZ * this.resolution + cellX;
            neighbors.push(cell);
            density += this.counts[cell];
          }
        }
        if (neighbors.length < 9) continue;

        let minimum = Infinity;
        let maximum = -Infinity;
        for (const cell of neighbors) {
          minimum = Math.min(minimum, this.minHeights[cell]);
          maximum = Math.max(maximum, this.maxHeights[cell]);
        }
        const variation = maximum - minimum;
        if (variation > 1.8) continue;

        const worldX = this.bounds.min.x + (x + 0.5) * this.cellWidth;
        const worldZ = this.bounds.min.z + (z + 0.5) * this.cellDepth;
        const height = this.sample(worldX, worldZ);
        if (height === null) continue;

        const distance = Math.hypot(worldX - preferredX, worldZ - preferredZ);
        const score = distance + variation * 4 - Math.min(density, 500) / 1000;
        if (score < bestScore) {
          bestScore = score;
          best = { x: worldX, z: worldZ, height };
        }
      }
    }

    return best;
  }

  diagnostics(): TerrainDiagnostics {
    let validCellCount = 0;
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    for (let cell = 0; cell < this.weights.length; cell += 1) {
      if (!this.weights[cell]) continue;
      validCellCount += 1;
      const height = this.weightedHeights[cell] / this.weights[cell];
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }
    return {
      resolution: this.resolution,
      cellCount: this.weights.length,
      validCellCount,
      coverage: validCellCount / this.weights.length,
      triangleCount: this.triangleCount,
      topFacingTriangleCount: this.topFacingTriangleCount,
      minHeight: minHeight + this.heightOffset,
      maxHeight: maxHeight + this.heightOffset,
    };
  }

  private isValidCell(x: number, z: number) {
    return x >= 0 && x < this.resolution && z >= 0 && z < this.resolution && this.weights[z * this.resolution + x] > 0;
  }
}
