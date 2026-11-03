# Phase 4 coordinate plan

## Source and transform

The plan uses the same transform and `GLBTerrainSampler` rules as
`engine/world.ts`:

- Source horizontal GLB dimensions are normalized to a 224-unit span.
- The transformed bounds are approximately `X[-105.91, 105.91]` and
  `Z[-112, 112]`.
- The 128x128 sampler reports 11,852 valid cells and 576,412 upward-facing
  triangles.
- Each candidate was checked with the sampler at the center and across a
  12x12-unit footprint. Candidate height variation stayed below 1.8 units.
- The world samples the final GLB height offset for each landmark, so the
  landmark base follows the actual island surface rather than assuming Y=0.

## World placements

Coordinates are world-space `(x, z)` values after the GLB transform. `Home`
is the welcome/About destination and also contains the existing Contact card.
`Workshop` is the existing Skills and Experience destination.

| Existing area | Portfolio role | X | Z | Surface result |
| --- | --- | ---: | ---: | --- |
| Home | About Me + Contact | -7 | 7 | central plateau; valid, low-variation approach |
| Workshop | Skills + Experience | 17 | 6 | central plateau; valid, low-variation approach |
| Playground | Controls | 8 | -6 | central plateau; valid approach footprint |
| Monument | Achievements | 0 | -28 | central plateau; valid, low-variation approach |
| Circuit | Racing | -20 | -25 | central plateau; valid, low-variation approach |
| Whisper Wall | Whisper wall | -15 | 26 | central plateau; valid approach footprint |
| Projects | Project showcase | -69 | -36 | elevated outer plateau; valid approach footprint |
| AI Lab | AI projects | 76 | 51 | elevated outer plateau; valid, low-variation approach |

Projects and AI Lab deliberately use the two verified outer plateaus so the
portfolio has destinations beyond the central driving area. Their landmark Y
positions are sampled independently from the GLB. The map uses the same X/Z
values directly, so no radial conversion can drift a marker away from its
world destination.

## Navigation behavior

Area triggers, map travel, project terminal triggers, race gate tracking, and
whisper sprites all read the shared area positions. Existing car movement and
sampler collision checks remain unchanged.
