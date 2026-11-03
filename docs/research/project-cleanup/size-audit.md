# Project Size Audit

**Project:** `ai-website-cloner-template`  
**Path:** `C:\Users\Faazil\Desktop\game portfolio\ai-website-cloner-template`  
**Audit snapshot:** 2026-11-03  
**Scope:** Recursive scan of all files, including hidden files, `.git`, `.next`, and `node_modules`.

The size baseline was measured before these audit reports were written, so the reports themselves are intentionally excluded from the original-size snapshot.

## Safety boundary

This phase only inspected files and wrote this report. No project file was deleted, moved, or quarantined. Environment-file contents were not read or printed.

The audit used:

- Recursive file and folder size measurement.
- SHA-256 comparison for duplicate candidates and all public GLB/audio/PDF assets.
- Static reference searches across `src/`, `public/`, `scripts/`, `package.json`, configuration, and documentation.
- Inspection of package scripts, Next.js configuration, and the existing QA evidence.

## Total project size

| Scope | Files | Bytes | MiB | GiB |
|---|---:|---:|---:|---:|
| Entire project, including `.git`, `.next`, and `node_modules` | 41,685 | 1,550,417,249 | 1,478.18 | 1.444 |

The largest removable area is generated `.next/` output. The second largest area is the active `node_modules/` installation, which is intentionally not proposed for deletion in this audit.

## Folder-wise sizes

### Top-level folders

| Folder | Files | Bytes | MiB | Classification |
|---|---:|---:|---:|---|
| `.next/` | 2,411 | 616,996,374 | 588.414 | Generated build/dev output |
| `node_modules/` | 38,998 | 550,861,514 | 525.342 | Active installed dependencies; preserve |
| `public/` | 88 | 339,193,153 | 323.383 | Portfolio assets and diagnostics |
| `docs/` | 103 | 40,835,773 | 38.948 | Research and evidence; preserve |
| `.git/` | 26 | 1,553,787 | 1.482 | Repository metadata; preserve |
| `src/` | 20 | 311,445 | 0.297 | Application source; preserve |
| `.agents/` | 3 | 13,101 | 0.012 | Agent workflow; preserve |
| `.github/` | 8 | 6,802 | 0.006 | Repository automation; preserve |
| `scripts/` | 2 | 1,241 | 0.001 | Standalone launcher; preserve |
| `.claude/` | 1 | 460 | 0.000 | Agent bridge; preserve |

### Important second-level folders

| Folder | Files | Bytes | MiB |
|---|---:|---:|---:|
| `.next/standalone/` | 1,342 | 359,657,318 | 342.996 |
| `public/models/` | 4 | 327,092,888 | 311.940 |
| `node_modules/next/` | 8,531 | 184,776,163 | 176.218 |
| `.next/dev/` | 698 | 151,200,065 | 144.196 |
| `node_modules/@next/` | 63 | 106,307,539 | 101.383 |
| `.next/cache/` | 168 | 94,521,973 | 90.143 |
| `docs/design-references/` | 64 | 40,569,387 | 38.690 |
| `node_modules/lucide-react/` | 3,916 | 25,269,092 | 24.098 |
| `node_modules/typescript/` | 132 | 23,625,066 | 22.530 |
| `node_modules/three/` | 1,277 | 21,030,536 | 20.056 |
| `public/sites/bruno-simon/` | 79 | 11,886,733 | 11.336 |

## Largest 50 files

The following list includes generated copies because the requested audit covers the entire folder.

| # | Bytes | MiB | File |
|---:|---:|---:|---|
| 1 | 137,914,580 | 131.526 | `.next/standalone/public/models/surpra mk.glb` |
| 2 | 137,914,580 | 131.526 | `public/models/surpra mk.glb` |
| 3 | 106,188,800 | 101.269 | `node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` |
| 4 | 80,200,092 | 76.485 | `public/models/optimized/surpra mk.optimized.glb` |
| 5 | 80,200,092 | 76.485 | `.next/standalone/public/models/optimized/surpra mk.optimized.glb` |
| 6 | 66,976,984 | 63.874 | `public/models/quest-island.glb` |
| 7 | 66,976,984 | 63.874 | `.next/standalone/public/models/quest-island.glb` |
| 8 | 42,001,232 | 40.055 | `public/models/optimized/quest-island.optimized.glb` |
| 9 | 42,001,232 | 40.055 | `.next/standalone/public/models/optimized/quest-island.optimized.glb` |
| 10 | 41,565,767 | 39.642 | `.next/dev/cache/turbopack/v16.3.5-ca2c75eb/00000213.sst` |
| 11 | 29,269,570 | 27.914 | `.next/dev/cache/turbopack/v16.3.5-ca2c75eb/00000214.sst` |
| 12 | 18,614,784 | 17.750 | `node_modules/@img/sharp-win32-x64/lib/libvips-42.dll` |
| 13 | 11,957,304 | 11.402 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000067.sst` |
| 14 | 11,933,707 | 11.381 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000004.sst` |
| 15 | 9,497,600 | 9.058 | `node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node` |
| 16 | 9,193,299 | 8.773 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000003.sst` |
| 17 | 9,113,572 | 8.691 | `node_modules/typescript/lib/typescript.js` |
| 18 | 9,066,411 | 8.648 | `node_modules/@ts-morph/common/dist/typescript.js` |
| 19 | 8,464,302 | 8.073 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000006.sst` |
| 20 | 8,456,812 | 8.065 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000021.sst` |
| 21 | 8,236,438 | 7.851 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000001.sst` |
| 22 | 8,212,373 | 7.829 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000002.sst` |
| 23 | 6,213,092 | 5.925 | `node_modules/typescript/lib/_tsc.js` |
| 24 | 6,201,600 | 5.914 | `public/sites/bruno-simon/audio/baguira.mp3` |
| 25 | 6,201,600 | 5.914 | `.next/standalone/public/sites/bruno-simon/audio/baguira.mp3` |
| 26 | 5,574,488 | 5.316 | `node_modules/lucide-react/dist/cjs/lucide-react.js.map` |
| 27 | 5,297,650 | 5.052 | `node_modules/next/dist/compiled/next-server/app-page-turbo-experimental.runtime.dev.js.map` |
| 28 | 5,291,333 | 5.046 | `node_modules/next/dist/compiled/next-server/app-page-experimental.runtime.dev.js.map` |
| 29 | 5,249,397 | 5.006 | `node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js.map` |
| 30 | 5,243,106 | 4.997 | `node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js.map` |
| 31 | 4,301,622 | 4.103 | `node_modules/next/dist/server/capsize-font-metrics.json` |
| 32 | 4,301,622 | 4.103 | `.next/standalone/node_modules/next/dist/server/capsize-font-metrics.json` |
| 33 | 4,077,108 | 3.889 | `node_modules/next/dist/compiled/next-server/app-page-experimental.runtime.prod.js.map` |
| 34 | 4,075,862 | 3.888 | `node_modules/next/dist/compiled/next-server/app-page-turbo-experimental.runtime.prod.js.map` |
| 35 | 4,042,808 | 3.855 | `node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js.map` |
| 36 | 4,041,566 | 3.854 | `node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.prod.js.map` |
| 37 | 3,364,783 | 3.209 | `.next/dev/cache/turbopack/v16.3.5-ca2c75eb/00000005.sst` |
| 38 | 3,364,570 | 3.209 | `.next/server/chunks/ssr/node_modules_three_build_three_module_1e1-6l6.js.map` |
| 39 | 3,286,220 | 3.134 | `public/sites/bruno-simon/world/areas.glb` |
| 40 | 3,286,220 | 3.134 | `.next/standalone/public/sites/bruno-simon/world/areas.glb` |
| 41 | 3,231,232 | 3.082 | `node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node` |
| 42 | 2,971,607 | 2.833 | `node_modules/next/dist/compiled/next-devtools/index.js.map` |
| 43 | 2,966,500 | 2.828 | `.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_090k2jm.js.map` |
| 44 | 2,961,988 | 2.824 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000052.sst` |
| 45 | 2,582,707 | 2.463 | `node_modules/next/dist/compiled/webpack/bundle5.js` |
| 46 | 2,470,199 | 2.356 | `.next/dev/static/chunks/node_modules_three_build_three_core_18d0oq6.js.map` |
| 47 | 2,470,070 | 2.356 | `.next/dev/server/chunks/ssr/node_modules_three_build_three_core_1f-_0ke.js.map` |
| 48 | 2,395,777 | 2.284 | `.next/cache/turbopack/v16.3.5-ca2c75eb/00000274.sst` |
| 49 | 2,390,925 | 2.280 | `node_modules/three/build/three.webgpu.nodes.js` |
| 50 | 2,270,882 | 2.166 | `node_modules/lucide-react/dynamic.d.ts` |

## Duplicate candidates

### Confirmed exact duplicates

SHA-256 comparison found that `.next/standalone/public/` contains byte-for-byte copies of the public assets, including all four model files, the audio file, the resume, the UI assets, and the original world bundle. These are generated standalone staging copies, not independent source assets. They are covered by the proposed `.next/` cleanup candidate.

The four source model files have distinct hashes:

| File | Bytes | SHA-256 |
|---|---:|---|
| `public/models/quest-island.glb` | 66,976,984 | `220B05C7564D6BDF6CA6AAB20E7926D05F5F8B7EBBB5DE4F0ADD8CD959E51DE5` |
| `public/models/surpra mk.glb` | 137,914,580 | `CEE09A9673BBE5CFF0392F4C8BE5F24E9EFCA6A6C2388DE00BA7482F227CA507` |
| `public/models/optimized/quest-island.optimized.glb` | 42,001,232 | `955BF323EF43C09CCAC7A9E8D66F73F57E01C240CDFF4EA169EC835603ED9E81` |
| `public/models/optimized/surpra mk.optimized.glb` | 80,200,092 | `704B31A1102B6504B579BA8E2704A84537B723F0AC321D7E8860314F77CF6902` |

No duplicate GLB was found within `public/`. The only duplicates in the source-oriented scope outside generated output are seven zero-byte `.gitkeep` placeholders; removing them would save no space and is not recommended.

## Runtime reference findings

### Confirmed application assets

- `world.ts` loads optimized island and Supra models first, then the original models as explicit fallbacks.
- `public/models/quest-island.glb` must be preserved.
- `public/models/surpra mk.glb` must be preserved.
- `public/models/optimized/quest-island.optimized.glb` must be preserved.
- `public/models/optimized/surpra mk.optimized.glb` must be preserved.
- `audio.ts` loads `public/sites/bruno-simon/audio/baguira.mp3`.
- `data.ts` and `BrunoSite.tsx` reference the resume, navigation icons, preview artwork, flags, reward artwork, audio controls, map, and other UI assets.
- `src/app/lab/LabView.tsx` is an existing route and references `terrain.png`, `terrain.glb`, `areas.glb`, `scenery.glb`, and `default.glb` from `public/sites/bruno-simon/world/`.

### Unreferenced world-bundle files

The following 22 files are not referenced by the current `src/` or package scripts. They total **388,660 bytes**. Because the `/lab` route is documented as an original-world inspection experiment, these are marked for confirmation rather than safe deletion:

`playgroundVisual.glb`, `slabs.png`, `poleLights.glb`, `lanterns.glb`, `bushesReferences.glb`, `birchTreesReferences.glb`, `oakTreesReferences.glb`, `flowersReferences.glb`, `cherryTreesReferences.glb`, `benches.glb`, `overlayPattern.png`, `fences.glb`, `gamepadXboxLabel.png`, `glyphs.png`, `mouseKeyboardLabel.png`, `touchLabel.png`, `cherryTreesVisual.glb`, `oakTreesVisual.glb`, `birchTreesVisual.glb`, `respawns.glb`, `sound.png`, and `palette.png`.

## Generated, temporary, and debugging findings

| Item | Bytes | Finding |
|---|---:|---|
| `.next/` | 616,996,374 | Generated Next.js build, standalone staging, development cache, diagnostics, and logs. Reproducible from the source and package lock. |
| `tsconfig.tsbuildinfo` | 232,358 | TypeScript incremental build metadata; ignored by `.gitignore` and reproducible. |
| `inspect2.js` | 3,115 | Debug GLB inspection script with a hard-coded absolute path and a documented syntax error; no package-script or source reference. |
| `inspect_glb.js` | 7,046 | Debug GLB inspection script; no package-script or source reference. Existing QA records its lint issues. |
| `public/glb-inspector.html` | 16,730 | Standalone diagnostic page that loads the original island model; no application reference. It is a public diagnostic URL if intentionally retained. |
| `node_modules/` | 550,861,514 | Active installation. Do not delete automatically; package restoration would need separate verification and explicit approval. |

No `out/`, `coverage/`, `.turbo/`, `build/`, `dist/`, Python `__pycache__/`, `.pyc`, or root temporary log directories were found. `.next/dev/logs/next-development.log` exists only inside the generated `.next/` tree.

## Dependency findings

The direct dependency scan confirms active use of `@base-ui/react`, `class-variance-authority`, `clsx`, `next`, `react`, `react-dom`, `tailwind-merge`, `three`, and `tw-animate-css`. `@tailwindcss/postcss`, ESLint, Tailwind, and TypeScript are used by project tooling/configuration.

`lucide-react` did not appear in application source imports. It is therefore an **unused-dependency candidate**, but no dependency was removed or proposed as safe to remove: `package.json` and `package-lock.json` changes would require a separate package-level review, and installed size is not safely attributable without reinstall testing.

## Files and folders that must be preserved

- All of `src/`, including the `/lab` route and portfolio data.
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, Tailwind-related configuration, `.gitignore`, and environment templates/configuration.
- All four required model files and all assets confirmed by runtime references.
- `public/faazil-resume.pdf`.
- Existing fonts, icons, favicon, and portfolio UI artwork.
- `docs/research/bruno-simon/`.
- `docs/design-references/local/` and existing source/reference screenshots.
- README, AGENTS, security, contribution, changelog, license, and other essential documentation.
- Active `node_modules/` unless a separate restore-and-validation decision is approved.

## Audit conclusion

The primary safe size reduction is reproducible `.next/` output: **616,996,374 bytes (588.414 MiB)**. Adding the TypeScript metadata and the three unreferenced diagnostic files gives a proposed low-risk reduction of **617,255,623 bytes (588.661 MiB)**, or **39.81%** of the current folder size. The cleanup plan records this proposal and keeps the unreferenced world bundle separate for confirmation.
