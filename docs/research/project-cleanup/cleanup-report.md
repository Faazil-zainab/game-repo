# Project Cleanup Report

**Project:** `ai-website-cloner-template`  
**Cleanup date:** 2026-11-03  
**Audit baseline:** `docs/research/project-cleanup/size-audit.md`  
**Cleanup plan:** `docs/research/project-cleanup/cleanup-plan.md`

## Result

The approved unrelated/generated files were moved to a quarantine folder outside the project. No portfolio source, required asset, resume, research report, or design-reference screenshot was deleted.

Permanent deletions: **0**  
Quarantined initial cleanup set: **27 items, 617,644,283 bytes**  
Quarantined post-validation regenerated output: **`.next/` and `tsconfig.tsbuildinfo`**  
Quarantine manifest: `C:\Users\Faazil\Desktop\game portfolio\ai-website-cloner-template-quarantine-20261103-095919\quarantine-manifest.csv`

## Size comparison

| Measurement | Bytes | MiB | GiB |
|---|---:|---:|---:|
| Original audit baseline | 1,550,417,249 | 1,478.18 | 1.444 |
| Final project after cleanup, including this report | 932,799,200 | 889.587 | 0.869 |
| Net space saved | 617,618,049 | 589.006 | 0.575 |
| Percentage reduction | 39.84% | — | — |

The original baseline was captured before the cleanup reports were created. The final project measurement includes the audit, plan, and this report; therefore the net reduction is slightly lower than the quarantined-byte total.

## Files quarantined

### Generated and temporary files

- `.next/` from the initial audit snapshot.
- The production-build `.next/` regenerated during validation.
- `tsconfig.tsbuildinfo` from the initial snapshot and post-validation regeneration.

### Debugging and inspection files

- `inspect2.js`
- `inspect_glb.js`
- `public/glb-inspector.html`

### Confirmed unreferenced `/lab` world-bundle subset

The approved 22 files were quarantined individually after reference checks:

`playgroundVisual.glb`, `slabs.png`, `poleLights.glb`, `lanterns.glb`, `bushesReferences.glb`, `birchTreesReferences.glb`, `oakTreesReferences.glb`, `flowersReferences.glb`, `cherryTreesReferences.glb`, `benches.glb`, `overlayPattern.png`, `fences.glb`, `gamepadXboxLabel.png`, `glyphs.png`, `mouseKeyboardLabel.png`, `touchLabel.png`, `cherryTreesVisual.glb`, `oakTreesVisual.glb`, `birchTreesVisual.glb`, `respawns.glb`, `sound.png`, and `palette.png`.

## Files preserved

- All `src/` application code, including `/` and `/lab` routes.
- `package.json`, `package-lock.json`, all project configuration, documentation, and repository metadata.
- Original and optimized island and Supra GLBs.
- Runtime UI assets, audio, font, favicon, and required `/lab` assets.
- `public/faazil-resume.pdf`.
- `docs/research/bruno-simon/`.
- `docs/design-references/local/` and `docs/design-references/source/`.
- Active `node_modules/`.

SHA-256 verification after cleanup confirmed the preserved primary assets remain unchanged:

| Asset | SHA-256 |
|---|---|
| `public/models/quest-island.glb` | `220B05C7564D6BDF6CA6AAB20E7926D05F5F8B7EBBB5DE4F0ADD8CD959E51DE5` |
| `public/models/surpra mk.glb` | `CEE09A9673BBE5CFF0392F4C8BE5F24E9EFCA6A6C2388DE00BA7482F227CA507` |
| `public/models/optimized/quest-island.optimized.glb` | `955BF323EF43C09CCAC7A9E8D66F73F57E01C240CDFF4EA169EC835603ED9E81` |
| `public/models/optimized/surpra mk.optimized.glb` | `704B31A1102B6504B579BA8E2704A84537B723F0AC321D7E8860314F77CF6902` |

## Validation results

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run build` | Passed; routes `/` and `/lab` generated |
| `npm run lint` | Passed with 0 errors and 16 existing `@next/next/no-img-element` warnings |
| Production server | Started successfully on `127.0.0.1:3100` |

## Production verification

All checks returned HTTP 200 before the validation build output was quarantined:

- Homepage `/`
- Optimized island model
- Original island fallback model
- Optimized Supra model
- Original Supra fallback model
- Resume PDF
- Portfolio audio
- Portfolio UI artwork
- Required `/lab` assets
- `/lab` route

The optimized-first and original-fallback paths remain present in `src/components/sites/bruno-simon/engine/world.ts`. The `/lab` route's five directly referenced world assets were preserved.

## Remaining largest files

The remaining large files are intentional portfolio models and active dependencies:

| Size | File |
|---:|---|
| 137,914,580 bytes | `public/models/surpra mk.glb` |
| 106,188,800 bytes | `node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` |
| 80,200,092 bytes | `public/models/optimized/surpra mk.optimized.glb` |
| 66,976,984 bytes | `public/models/quest-island.glb` |
| 42,001,232 bytes | `public/models/optimized/quest-island.optimized.glb` |
| 18,614,784 bytes | `node_modules/@img/sharp-win32-x64/lib/libvips-42.dll` |
| 9,497,600 bytes | `node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node` |
| 9,113,572 bytes | `node_modules/typescript/lib/typescript.js` |
| 6,201,600 bytes | `public/sites/bruno-simon/audio/baguira.mp3` |

## Limitations

- The files are quarantined rather than permanently destroyed, so they remain recoverable outside the project.
- The final project does not retain `.next/`; running `npm run build` or `npm run dev` will regenerate it.
- Browser-level WebGL parsing and interaction were not automated; HTTP smoke checks and the existing QA evidence were used.
- `node_modules/` and the direct dependency list were not altered.
