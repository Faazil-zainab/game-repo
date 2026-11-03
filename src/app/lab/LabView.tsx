"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const BASE = "/sites/bruno-simon/world";

async function buildTerrainTexture() {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = `${BASE}/terrain.png`;
  });
  const size = img.width;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, size, size);
  const d = data.data;
  const stops = [
    { at: 0.1, c: [255, 169, 78] },
    { at: 0.3, c: [91, 194, 185] },
    { at: 0.9, c: [19, 55, 95] },
  ];
  const sample = (t: number) => {
    if (t <= stops[0].at) return stops[0].c;
    if (t >= stops[stops.length - 1].at) return stops[stops.length - 1].c;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t >= a.at && t <= b.at) {
        const f = (t - a.at) / (b.at - a.at);
        return a.c.map((v, k) => v + (b.c[k] - v) * f);
      }
    }
    return stops[0].c;
  };
  const grass = [184, 182, 46];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const base = sample(1 - b);
    const out = base.map((v, k) => v * (1 - g) + grass[k] * g);
    d[i] = out[0];
    d[i + 1] = out[1];
    d[i + 2] = out[2];
    d[i + 3] = 255;
    void r;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export default function LabView() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a1836);
    scene.fog = new THREE.FogExp2(0x3a2044, 0.0045);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(39.5, 14, 68);
    camera.lookAt(39.5, 0, 30);

    scene.add(new THREE.HemisphereLight(0xffc9a8, 0x241a3a, 2.4));
    const sun = new THREE.DirectionalLight(0xffb28a, 2.8);
    sun.position.set(70, 90, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.far = 300;
    scene.add(sun);

    const loader = new GLTFLoader();
    const load = (file: string) =>
      new Promise<THREE.Group>((resolve, reject) => {
        loader.load(`${BASE}/${file}`, (g) => resolve(g.scene), undefined, reject);
      });

    (async () => {
      try {
        const [terrain, areas, scenery, vehicle, tex] = await Promise.all([
          load("terrain.glb"),
          load("areas.glb"),
          load("scenery.glb"),
          load("default.glb"),
          buildTerrainTexture(),
        ]);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
        terrain.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            (o as THREE.Mesh).material = mat;
            (o as THREE.Mesh).receiveShadow = true;
          }
        });
        scene.add(terrain);

        areas.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            (o as THREE.Mesh).castShadow = true;
            (o as THREE.Mesh).receiveShadow = true;
          }
        });
        scene.add(areas);
        scenery.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            (o as THREE.Mesh).castShadow = true;
            (o as THREE.Mesh).receiveShadow = true;
          }
        });
        scene.add(scenery);

        vehicle.position.set(39.5, 1.2, 37.8);
        vehicle.rotation.y = Math.PI;
        scene.add(vehicle);
        console.log("LOADED");
      } catch (e) {
        console.log("LOAD ERROR", e);
      }
    })();

    let raf = 0;
    const tick = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className="h-screen w-screen" />;
}
