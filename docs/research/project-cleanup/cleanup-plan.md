# Project Cleanup Plan

**Project:** `ai-website-cloner-template`  
**Audit basis:** `docs/research/project-cleanup/size-audit.md`  
**Plan status:** Awaiting approval  
**Deletion status:** No files have been deleted or quarantined.

## Proposed cleanup

Every item below was checked against source imports, package scripts, dynamic asset paths, CSS/HTML references, Next.js configuration, fallback paths, and documentation references before classification.

### Safe to delete after approval

| File or folder | Size | Reason | Risk | Recommendation |
|---|---:|---|---|---|
| `.next/` | 616,996,374 bytes | Reproducible Next.js build output, standalone staging, dev cache, diagnostics, and logs. `.gitignore` already excludes it. | Low; local generated output will be absent until the next build. | Delete after a successful source validation, or quarantine the whole folder first. |
| `tsconfig.tsbuildinfo` | 232,358 bytes | Reproducible TypeScript incremental metadata; ignored by `.gitignore`. | Low; typecheck regenerates it. | Delete or quarantine. |
| `inspect2.js` | 3,115 bytes | Unreferenced temporary GLB inspection script with a hard-coded local path and an existing syntax error. | Low; no runtime/package-script reference. | Quarantine rather than permanently delete initially. |
| `inspect_glb.js` | 7,046 bytes | Unreferenced temporary GLB inspection script; only documented as completed inspection/debug evidence. | Low; no runtime/package-script reference. | Quarantine rather than permanently delete initially. |
| `public/glb-inspector.html` | 16,730 bytes | Unreferenced diagnostic page for manually inspecting the original island GLB. | Low for the portfolio; removes the optional `/glb-inspector.html` diagnostic URL. | Quarantine unless that diagnostic URL is still wanted. |

**Low-risk proposal total:** **617,255,623 bytes (588.661 MiB, 39.81% of the current folder).**

### Requires confirmation

| File or folder | Size | Reason | Risk | Recommendation |
|---|---:|---|---|---|
| Unreferenced files in `public/sites/bruno-simon/world/` listed below | 388,660 bytes | Not referenced by the current source or package scripts, but they are part of the documented original-world inspection bundle for `/lab`. | Medium; future inspection work or undocumented browser use could depend on them. | Keep unless the `/lab` experiment and its complete source bundle are explicitly reduced. If approved, quarantine only this listed subset. |
| Direct dependency `lucide-react` | Installed folder: 25,269,092 bytes; package-level size is not safely attributable | No application source import was found. It may still be part of template/tooling expectations. | Medium; requires `package.json`/lockfile changes and reinstall validation. | Separate dependency review; do not remove during file cleanup. |
| `node_modules/` | 550,861,514 bytes | Active installed dependencies. It is large but reproducible from the lockfile. | High for the current working copy; deleting it changes the development environment and requires reinstall verification. | Preserve for this cleanup. |

The world-bundle confirmation subset is:

`playgroundVisual.glb`, `slabs.png`, `poleLights.glb`, `lanterns.glb`, `bushesReferences.glb`, `birchTreesReferences.glb`, `oakTreesReferences.glb`, `flowersReferences.glb`, `cherryTreesReferences.glb`, `benches.glb`, `overlayPattern.png`, `fences.glb`, `gamepadXboxLabel.png`, `glyphs.png`, `mouseKeyboardLabel.png`, `touchLabel.png`, `cherryTreesVisual.glb`, `oakTreesVisual.glb`, `birchTreesVisual.glb`, `respawns.glb`, `sound.png`, and `palette.png`.

If this subset is also approved, the estimated reduction becomes **617,644,283 bytes (589.031 MiB, 39.84%)**. This estimate excludes `node_modules/` and all preserved portfolio assets.

### Must preserve

| File or folder | Size or scope | Reason | Risk | Recommendation |
|---|---:|---|---|---|
| `src/` | 311,445 bytes | Application source, routes, portfolio content, 3D runtime, and `/lab`. | Critical | Preserve. |
| `public/models/quest-island.glb` | 66,976,984 bytes | Original island loading fallback. | Critical | Preserve. |
| `public/models/surpra mk.glb` | 137,914,580 bytes | Original Supra loading fallback. | Critical | Preserve. |
| `public/models/optimized/quest-island.optimized.glb` | 42,001,232 bytes | Active optimized island model. | Critical | Preserve. |
| `public/models/optimized/surpra mk.optimized.glb` | 80,200,092 bytes | Active optimized Supra model. | Critical | Preserve. |
| `public/sites/bruno-simon/{ui,audio,fonts,favicons}` | 6,643,667 bytes | Runtime UI, audio, font, favicon, and portfolio artwork. | Critical | Preserve. |
| `public/sites/bruno-simon/world/{terrain.png,terrain.glb,areas.glb,scenery.glb,default.glb}` | 4,854,406 bytes | Directly loaded by the existing `/lab` route. | High | Preserve. |
| `public/faazil-resume.pdf` | 196,802 bytes | Portfolio resume link and download. | Critical | Preserve. |
| `docs/research/bruno-simon/` | 182,893 bytes | Existing research reports and evidence. | High | Preserve. |
| `docs/design-references/local/` and `docs/design-references/source/` | 39,828,007 bytes combined | Existing screenshots and design evidence. | High | Preserve. |
| `package.json`, `package-lock.json`, configs, documentation, `.agents/`, `.claude/`, `.github/`, `.git/` | Project infrastructure | Required for development, build, repository, and project continuity. | Critical | Preserve. |

## Reference checks completed

- Optimized island path: `/models/optimized/quest-island.optimized.glb`.
- Island fallback path: `/models/quest-island.glb`.
- Optimized Supra path: `/models/optimized/surpra%20mk.optimized.glb`.
- Supra fallback path: `/models/surpra%20mk.glb`.
- Audio path: `/sites/bruno-simon/audio/baguira.mp3`.
- Resume path: `/faazil-resume.pdf`.
- `/lab` world paths: `terrain.png`, `terrain.glb`, `areas.glb`, `scenery.glb`, and `default.glb`.
- No package script references `inspect2.js`, `inspect_glb.js`, or `public/glb-inspector.html`.
- No application source, CSS, or HTML reference points to the proposed diagnostic files.
- SHA-256 comparison found the four source models are distinct; generated standalone copies are exact copies inside `.next/`.
- Existing QA evidence records the inspector-script lint errors and confirms the optimized/original fallback paths.

## Execution procedure after approval

1. Recheck the candidate paths and sizes immediately before changing anything.
2. Create a quarantine folder outside the application runtime tree, with a manifest containing original paths, sizes, and SHA-256 hashes.
3. Move only approved files/folders into quarantine; do not use a broad recursive wildcard command.
4. Run the requested typecheck, build, and lint commands.
5. Start the production server and verify the homepage, optimized models, original fallback paths, resume, and portfolio assets.
6. Produce `cleanup-report.md` with measured before/after sizes, exact quarantined/deleted paths, validation results, and remaining large files.

## Approval boundary

This plan stops before deletion or quarantine. Approval should identify whether it covers:

- The low-risk generated/debug set only; and/or
- The separately listed unreferenced world-bundle subset.

No cleanup action will be taken from this plan until approval is provided.
