# BrickMaze TD (web)

Mazing tower defense. Nuxt 4 + Vue 3 + Tailwind 4, drawn on a 2D canvas. Client-only
(`ssr: false`), so the build is a folder of static files.

Ported from the React prototype made in AI Studio (kept in `../untitled`). The original
handover and roadmap is in [docs/handover-react-prototype.md](docs/handover-react-prototype.md);
its file paths describe the React layout, the table below is the current one.

## Commands

```bash
npm run dev         # dev server
npm run typecheck   # vue-tsc
npm test            # headless simulation tests (vitest)
npm run generate    # static build -> .output/public
```

Everything works offline once `node_modules` is installed: fonts are bundled from npm,
sounds are synthesised, sprites are drawn in code.

## Layout

| Path | What lives there |
| --- | --- |
| `app/game/domain/` | Pure rules: types, constants (towers, waves, difficulty), pathfinding, synergy, audio |
| `app/game/domain/simulation.ts` | The combat tick (creeps, towers, projectiles). No DOM, runs in tests |
| `app/game/engine/` | Canvas renderer and the procedural sprite atlas. Swap sprites here |
| `app/game/services/` | Profile save/load (localStorage today, API later) |
| `app/composables/useArenaMatch.ts` | One match: state, the frame loop, player actions |
| `app/composables/useProfile.ts`, `useMatchSetup.ts` | Profile and lobby choices shared between pages |
| `app/pages/index.vue`, `play.vue` | Lobby and arena |
| `app/components/{atoms,molecules,organisms,templates}` | UI, atomic design, auto-imported by file name |
| `tests/` | Vitest. `simulation.test.ts` shows how to play a wave headlessly with a seeded RNG |

## Notes

- Grid, towers and the simulation arrays are deliberately not deeply reactive (see the
  comment at the top of `useArenaMatch.ts`). Keep it that way for frame rate.
- Every tile action (keep, fuse, build, upgrade, move, sell, targeting) goes through the
  on-board `TileActionMenu`. `ContextInspectorRail` (and the phone bottom sheet) only shows
  details. Keep it that way so desktop and phone behave the same.
- `BuildControlDock` has one fixed height in every phase, so the board never resizes
  between steps. Put new per-phase info in the stage status strip, not in the dock.
- `TOWER_LIST` order is the shop order, the tile menu order and the number keys;
  `tests/ui-rules.test.ts` guards that.
- TypeScript is pinned to 6.x because `vue-tsc` does not run on TypeScript 7 yet.
- `noUncheckedIndexedAccess` is off in `nuxt.config.ts` for the ported game code.
- The lobby hero and emblem images were not part of the AI Studio download. Drop them in
  `public/images/brickmaze_hero.jpg` and `brickmaze_emblem.jpg`; until then a fallback shows.
