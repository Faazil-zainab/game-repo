# Source brief — bruno-simon.com

Inspected 2026-10-31 at desktop 1440×900 and mobile 390×844 using a real Chrome
session (WebGL enabled). Screenshots in `docs/design-references/`.

## Source → local route map

| Source URL | Local route | Owner |
| --- | --- | --- |
| `https://bruno-simon.com/` | `/` | `src/app/page.tsx` → `src/components/sites/bruno-simon/BrunoSite.tsx` |

The source is a single-page WebGL experience. Its "pages" are menu panels and
world areas, not separate URLs, so the clone keeps one route and reproduces the
panel/state model.

| Menu panel | World area | Local component |
| --- | --- | --- |
| Home | landing diorama / spawn | `BrunoSite` intro + `engine/world.ts` |
| Options | lamp + bench workshop | Options panel |
| Controls | giant gamepad & keyboard | Controls panel (3 tabs) |
| Achievements | obelisk monument + secret orb | Achievements panel |
| Circuit | start arch + ring road | Circuit panel + lap timer |
| Whispers | message wall | Whispers panel + `addWhisper` |
| Behind the scene | — | Behind the scene panel |

## What the source does

1. Boots into a dark "space" diorama: a small sand disc, red low-poly jeep,
   bench, lamp, pink tree, stars, glowing rim and a hand-written
   **CLICK TO START** prompt with a sound toggle. This lasts ~40 s of camera
   orbit before the prompt appears.
2. Clicking starts a cinematic that drops the car onto a bright, low-poly
   island (peach sand, pink trees, teal water, colourful project tents).
3. Driving is arcade physics: WASD/arrows, Shift boost, Ctrl/B brake, Space
   jump, Enter interact. Camera follows; drag orbits; wheel zooms.
4. Menu (hamburger, top right) opens a 1000×600 split panel: 7 icon tabs on
   top of the right half, preview image left, scrolling content right.
   A red close tab sits at the top right; map trigger sits below the menu
   trigger.
5. Areas around the island open the matching panel when you drive close and
   press Enter. Achievements, whispers and circuit scores would normally sync
   to a server; the source itself shows "Server currently offline" states.
6. UI tokens measured from the source:
   - Amatic SC 700 for titles (2.5 rem; 1.7 rem subsection), Nunito 400/700/900.
   - Panel background `radial-gradient(ellipse at top left, #251f2b, #1d1721)`.
   - Peach `#ffceca`, success green `#d5ff95`, danger `#ff6a7c`, orange `#ffc67b`.
   - Split panel 1000×600, 50/50, 25px/40px content padding, 3px inset borders
     at 35% opacity, 44×50px tabs, 58px buttons, 8px radii.
   - Page root at 20px base font, 18px ≤520px, 16px ≤440px.

## Assets reused from the source

Downloaded into `public/sites/bruno-simon/` (32 files, ~357 KB plus music):

| Source path | Local path | Use |
| --- | --- | --- |
| `ui/*.svg` | `ui/` | nav icons, close, map, audio, lock, warning |
| `ui/previews/*.webp` | `ui/previews/` | menu preview panel |
| `ui/achievements/rewards/*.webp` | `ui/achievements/rewards/` | reward row |
| `ui/flags/*.webp` | `ui/flags/` | whisper + preview flag |
| `fonts/Pally-Medium.woff2` | `fonts/` | kept for parity (not used in UI) |
| `static/sounds/musics/Baguira.mp3` | `audio/baguira.mp3` | CC0 music, looped, mutable |
| Google Fonts Amatic SC / Nunito | `next/font` | headings and body |

## Rebuild decisions

- **3D is reimplemented**, not copied: procedural island height field, ring
  road, plaza, cliff/water, trees, tents, obelisk, gamepad/keyboard sculptures,
  start arch, whispers wall, clouds and stars. No GLB/KTX bundles are reused.
- Car, wheels, steering, suspension tilt, jump, boost, camera orbit, collisions
  and the lap gate are hand-written in `engine/world.ts`.
- All seven panels use the source's real copy (home intro, controls tables,
  whisper rules, behind-the-scene links) and the real preview artwork.
- Server features are replaced with honest local states: "Server currently
  offline", local best lap, localStorage whispers/achievements. No fake
  leaderboard.
- Options panel renders `WebGL` instead of the source's `WebGPU` because the
  clone uses a WebGL renderer; the source's `Server: Pending` becomes `Local`.
- Achievements are functional and persist in `localStorage`:
  leave the landing area, visit every area, inspect 8 project tents, hit
  100 km/h, find the hidden orb, post a whisper.
- Score/lap: restart from the Circuit panel, cross the start arch, complete a
  lap around the ring road; best lap is stored locally.
- The map trigger opens a full-screen map; selecting a pin teleports the car
  there. This is an extra affordance (the source map is read-only) added so the
  larger areas can be reviewed without a long drive, and it is called out here.
- Menu and intro share the dark X/grid backdrop because the source shows its
  menu over the dark landing scene, not over the bright island.

## Known gaps

- The source's full island (13 areas, buildings, NPC traffic, music stages,
  weather, race ghosts) is far larger than this rebuild. The clone keeps 7
  drivable areas with simplified geometry.
- Source uses Rapier physics + instanced vegetation; the clone uses an arcade
  model and ~30 individual trees for clarity.
- The source's intro is a ~40 s directed cinematic ending in a car drop; the
  clone uses a shorter orbit around the landing diorama.
- Mobile driving in the source is one-finger steering; the clone uses a
  left-side drag joystick with auto camera on the right side.
- No server sync, leaderboard, gamepad support or hydraulics.

## Final state

- Animation polish: the car body is separated from its wheels for roll, pitch,
  suspension bob and landing bounce; the camera leans, widens FOV on boost,
  shakes on impacts and auto-centres after a drag; a pooled point-sprite dust
  field trails the rear wheels and bursts on landings/collisions; foliage,
  whispers, water and foam animate from cached references.
- Verification notes and local screenshots live in
  `docs/research/bruno-simon/verification.md` and
  `docs/design-references/local/`.
- `src/app/lab/` is an unlinked experiment that loads the original GLB/texture
  bundles from `public/sites/bruno-simon/world/` for side-by-side comparison.
  It is not part of the cloned experience and `/` never links to it.
- `npm run dev` serves the experience at `/`; `npm run check` runs lint,
  typecheck and build.
