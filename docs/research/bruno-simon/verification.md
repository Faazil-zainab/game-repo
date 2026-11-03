# Verification — bruno-simon.com clone

Checked 2026-11-02 in local Chrome (WebGL enabled) against a live source session
captured on 2026-10-31.

- Source screenshots: `docs/design-references/source/`
- Local screenshots: `docs/design-references/local/`
  - `local-d-*.png` — desktop 1440×900
  - `local-m-*.png` — mobile 390×844
  - `verify-*.png` — interaction states (home prompt, map, whisper)

## Screenshot pairs

| State | Source | Local (desktop) | Local (mobile) |
| --- | --- | --- | --- |
| Intro / click to start | `source/bruno-live-1.png` | `local/local-d-1-intro.png` | `local/local-m-1-intro.png` |
| World after start | `source/bs-t45.png` | `local/local-d-2-world.png` | `local/local-m-2-world.png` |
| Area prompt | `source/bs2-d-prompt.png` | `local/verify-home-area.png` | — |
| Menu · Home | `source/bs2-d-menu-home.png` | `local/local-d-4-menu-home.png` | `local/local-m-4-menu-home.png` |
| Menu · Options | `source/bs2-d-menu-options.png` | `local/local-d-5-options.png` | `local/local-m-5-options.png` |
| Menu · Controls | `source/bs2-d-menu-controls.png` | `local/local-d-5-controls.png` | `local/local-m-5-controls.png` |
| Menu · Achievements | `source/bs2-d-menu-achievements.png` | `local/local-d-5-achievements.png` | `local/local-m-5-achievements.png` |
| Menu · Circuit | `source/bs2-d-menu-circuit.png` | `local/local-d-5-circuit.png` | `local/local-m-5-circuit.png` |
| Menu · Whispers | `source/bs2-d-menu-whispers.png` | `local/local-d-5-whispers.png` | `local/local-m-5-whispers.png` |
| Menu · Behind the scene | `source/bs2-d-menu-behindTheScene.png` | `local/local-d-5-behindTheScene.png` | `local/local-m-5-behindTheScene.png` |
| Map | — | `local/local-d-6-map.png` | `local/local-m-6-map.png` |

## Visual comparison

Matched:

- Split menu panel proportions (1000×600 desktop, 50/50), inset borders,
  tab strip, red close tab, icon sizing and the Amatic SC / Nunito type scale.
- Real preview artwork, tab icons, flags, reward images and the `#251f2b` /
  `#ffceca` palette.
- Intro copy, handwritten arrow, sound toggle, and the dark star-field /
  X-grid backdrop at both breakpoints.
- Area labels, Enter prompt, map layout with all seven pins and the player dot.
- Controls tables (keyboard / touch / gamepad), response rows and button
  styling with the "or" divider.
- Toasts and achievements use the source's frame, title and reward images.

Intentional differences:

- World geometry is procedural and reads as a stylised tribute: seven compact
  areas around one ring road instead of the source's full island. Landmark
  silhouettes (car, tents, obelisk, gamepad, keyboard, arch, wall) match in
  placement and colour, not in mesh detail.
- Intro orbits the landing diorama immediately; the source holds a ~40 s
  directed cinematic with a car drop.
- The map is opened by a button and pins teleport (an extra affordance); the
  source map only shows position.
- Mobile shows the same panels at 390×844 with a scaled panel and legible map
  labels; the source uses a slightly different mobile menu stack.

## Interaction checks

Automated run (`verify.js`) against `http://localhost:3000/`, no console errors:

| Check | Result |
| --- | --- |
| Intro shows no achievement toasts | 0 toasts |
| Intro prompt + sound toggle visible | `Click to start` |
| Click starts world, car drivable | passed |
| Map opens and teleports to Home | prompt `ENTER / Bruno's Home` |
| Enter opens the matching panel | `Bruno's Home` |
| Escape closes menu, works from focused input | passed |
| `L` toggles mute class | `bs-root is-muted` |
| Whisper post shows toast + achievement | `Whisper posted`, *Speak your mind* 1/1 |
| Progress survives reload | `localStorage["bruno-simon-clone-v1"]` |
| Map pin labels | Home, Workshop, Playground, Monument, Circuit, Whispers, Projects |
| No page/console errors | `errors: []` |

Manual checks: WASD/arrow driving, Shift boost, Space jump, Ctrl brake, drag
orbit, wheel zoom, options quality toggle, circuit restart and best-lap
persistence, achievements panel progress and reward reveal, all internal links
in Behind the scene.

## Animation polish

A second pass added motion that was missing from the first build. Captures:
`anim-1-accel.png`, `anim-2-turn.png`, `anim-3-brake.png`, `anim-4-air.png`,
`anim-5-land.png`, `anim-6-boost.png` in `docs/design-references/local/`.

| Area | Change |
| --- | --- |
| Car body | Body split from wheels into its own group; wheels stay grounded while the shell rolls into turns, pitches under acceleration/braking, bobs with speed, and settles on a spring after landings. |
| Landings | Vertical impact drives the body spring, a short camera shake and a dust burst; wheels keep individual suspension jiggle. |
| Collisions | Hard impacts add a body kick, camera shake and dust; a 0.4 s cooldown prevents repeat shakes while sliding along an obstacle. |
| Camera | Boost FOV widens toward 66°, the camera leans with steering, shakes on impacts, auto-centres 2.2 s after a manual drag, and reuses preallocated vectors. |
| Dust | Pooled 180-particle `THREE.Points` field with a small shader, emitted from the rear wheels while driving/braking and burst on landings/collisions. One draw call, zero per-frame allocations. |
| Scenery | Tree and palm foliage sway on cached references, whisper sprites bob, the water plane breathes and the foam ring pulses (replacing the old whole-water rotation hack). |
| Quality | Low quality now also halves dust emission, drops the shadow map to 1024², and resets the dust point scale with the pixel ratio. |
| Accessibility | `prefers-reduced-motion` removes camera shake, lowers sway and dust density, and stops the intro hint float animation. |

## Build gates

`npm run check` (lint + typecheck + build) passes. Lint reports only
`@next/next/no-img-element` warnings for the source UI artwork (`<img>` is used
deliberately to keep the exact source files and intrinsic sizing); typecheck and
build are clean.

## Remaining gaps

- Simplified terrain and vegetation count versus the source; no Rapier physics.
- No NPC traffic, music stages, weather, race ghosts or hydraulics.
- No server sync, live leaderboard or gamepad API support; those panels show
  honest local/offline states.
- `src/app/lab/` is an unlinked experiment that loads the original GLB/KTX
  bundles for comparison; it is not part of the cloned experience.
