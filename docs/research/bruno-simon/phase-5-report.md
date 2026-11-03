# Phase 5 performance report

## Optimizations implemented

Optimized copies were created in `public/models/optimized/`:

- `surpra mk.optimized.glb`: mesh simplification with attribute-aware
  position/normal/UV preservation, targeting 65% of the original index count;
  simplifier error was `0.000101`. Embedded textures were resized to 2048/1024
  limits and encoded as WebP.
- `quest-island.optimized.glb`: geometry unchanged; embedded textures were
  resized to 2048/1024 limits and encoded as WebP.

`world.ts` loads the optimized copies and falls back to the original GLBs if an
optimized request fails. The terrain sampler continues to operate on the
island geometry, and the original GLBs remain available and unmodified.

## Before / after measurements

Both runs used fresh Chrome profiles, the same 1440x900 fallback browser mode,
the same ready-state workload and a 60-second frame sample. The environment
does not expose a visible hardware-accelerated Chrome/GPU page, so frame-time
comparisons are directional only.

| Metric | Before | After | Result |
| --- | ---: | ---: | --- |
| Combined model bytes | 204.9 MB | 122.2 MB | 40.4% smaller |
| Ready time | 63.8 s | 31.4 s | 50.8% lower |
| Renderer triangles | 9.61 M | 6.73 M | 29.9% lower |
| Draw calls | 239 | 239 | unchanged |
| Geometry entries | 371 | 291 | 21.6% lower |
| Texture entries | 49 | 37 | 24.5% lower |
| JS heap used | 350.3 MB | 320.5 MB | 8.5% lower |
| Average frame time | 62.16 ms | 151.22 ms | inconclusive/noisy fallback |
| Average FPS | 16.09 | 6.61 | inconclusive/noisy fallback |
| Worst frame | 137.5 ms | 266.8 ms | inconclusive/noisy fallback |

The final development console log directly reported `17,627 ms` for optimized
island load/parse/sampler initialization and `39,776 ms` for optimized Supra
load/parse. A direct original-asset parse log was not captured before edits,
so no unsupported parse-time percentage is claimed.

The fallback frame result is worse in the final run and is not reported as a
performance improvement. The asset-size, renderer triangle, geometry-entry,
texture-entry, heap and loading improvements are directly measured. Texture
memory in bytes remains an estimate because the browser did not expose GPU
memory counters.

## Regression verification

The optimized browser session verified:

- Optimized island and Supra requests completed.
- Vehicle movement and terrain grounding.
- Jump and landing.
- Camera/world playing state.
- All eight map markers and exact coordinate transforms.
- Existing portfolio area prompts.
- No console errors.

Evidence:

- `docs/research/bruno-simon/phase-5-final.json`
- `docs/research/bruno-simon/phase-5-load-logs.json`
- `docs/research/bruno-simon/phase-5-regression.json`
- `docs/design-references/local/phase5-optimized-world.png`
- `docs/design-references/local/phase5-optimized-map.png`

## Validation

`npm run typecheck` and the changed-file ESLint check were run during the
implementation. The full project checks are run again before completion.

## Remaining limitations

- Hardware-accelerated visible Chrome could not be provided by this environment,
  so FPS and 1% low results need confirmation on the target i3 laptop.
- The island geometry and terrain sampler resolution were intentionally left
  unchanged to preserve collision and placement behavior.
- Draw calls were not reduced because the measured count did not change with
  the asset optimization.
