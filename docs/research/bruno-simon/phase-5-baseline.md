# Phase 5 performance baseline

Measured on 2026-11-02 in Chrome `headless=new` with `--enable-gpu` from a
fresh user-data directory at 1440x900. A visible desktop and `chrome://gpu`
were unavailable in this environment, so hardware acceleration could not be
verified. FPS and frame-time values are fallback measurements, not laptop-
representative GPU results.

Workload:

1. Cold-load `http://127.0.0.1:3000/`.
2. Wait until the loading overlay is gone and the intro is ready.
3. Start the experience.
4. Measure 60 seconds of idle playing-world frames.
5. Read renderer, terrain, heap, resource and console diagnostics.

## Original assets

| Asset | Bytes | Geometry |
| --- | ---: | ---: |
| `quest-island.glb` | 66,976,984 | 1,376,682 triangles |
| `surpra mk.glb` | 137,914,580 | 4,108,458 triangles |
| Combined | 204,891,564 | 5,485,140 source triangles |

Estimated uncompressed geometry buffers from the GLB accessors: approximately
161.0 MB combined. Estimated RGBA8 texture memory with mipmaps is approximately
408 MB; this is an estimate, not a browser-reported allocation.

## Baseline measurements

| Metric | Baseline |
| --- | ---: |
| Loading screen to ready | 63,844 ms |
| Direct island load/parse/sampler log | Not captured in baseline run |
| Direct Supra load/parse log | Not captured in baseline run |
| Island resource decoded bytes | 66,976,984 |
| Supra resource decoded bytes | 137,914,580 |
| Renderer triangles | 9,608,726 |
| Draw calls | 239 |
| Renderer geometry entries | 371 |
| Renderer texture entries | 49 |
| Average frame time | 62.16 ms |
| Average FPS | 16.09 |
| 95th percentile frame | 86.8 ms |
| 99th percentile frame / fallback 1% low | 116.7 ms / 8.57 FPS |
| Worst frame | 137.5 ms |
| JS heap used | 350,309,415 bytes |
| Terrain sampler valid cells | 11,852 / 16,384 |
| Terrain sampler triangles | 1,376,682 |

The largest measured costs were the full Supra geometry/textures, the full
island texture payload, and the one-time main-thread GLB parsing plus terrain
sampling. Draw-call count was stable at 239, so draw-call reduction was not
selected as the first optimization.

Raw measurement: `docs/research/bruno-simon/phase-5-baseline.json`.

The existing development logger was not wired into the first baseline capture,
so direct per-asset parse values are intentionally marked unavailable rather
than inferred from network duration.
