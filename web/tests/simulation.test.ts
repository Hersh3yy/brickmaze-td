import { describe, expect, it } from 'vitest'
import { DIFFICULTY_DEFS, getWaveDefinition } from '~/game/domain/constants'
import { computeMazePath, createInitialGrid } from '~/game/domain/pathfinding'
import { beginWave, createSimState, stepSimulation } from '~/game/domain/simulation'
import type { SimWorld } from '~/game/domain/simulation'
import type { DifficultyId, GridCell, Tower, TowerType } from '~/game/domain/types'

// Small seeded PRNG so every run of a test is identical.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function tower(id: string, type: TowerType, x: number, y: number): Tower {
  return {
    id, type, level: 1, x, y, targeting: 'first',
    angle: 0, cooldown: 0, recoil: 0, muzzleFlash: 0,
    totalDamage: 0, kills: 0, investedGold: 0,
  }
}

/** Plays one wave headlessly at 60 steps per simulated second and reports the outcome. */
function runWave(opts: { wave: number; difficulty: DifficultyId; grid: GridCell[][]; towers: Tower[] }) {
  const path = computeMazePath(opts.grid, 'crossroad')
  const sim = createSimState(path.length)
  const world: SimWorld = {
    grid: opts.grid,
    phase: 'COMBAT',
    wave: opts.wave,
    difficulty: opts.difficulty,
    endlessMode: false,
    lives: DIFFICULTY_DEFS[opts.difficulty].startingLives,
    gold: 0,
    towers: opts.towers,
    path: path.path,
    speed: 1,
  }
  const rng = mulberry32(42)
  let cleared = false
  beginWave(sim, opts.wave, opts.difficulty)

  const dt = 1 / 60
  for (let step = 0; step < 60 * 600 && !cleared && world.lives > 0; step++) {
    stepSimulation(sim, world, dt, step * dt * 1000, {
      waveCleared: () => { cleared = true },
      defeat: () => { sim.matchEnded = true },
    }, rng)
  }
  return { cleared, lives: world.lives, gold: world.gold, kills: sim.totalKills }
}

describe('combat simulation', () => {
  it('leaks the whole wave when nothing defends the path', () => {
    const def = getWaveDefinition(1, 'standard')
    const res = runWave({ wave: 1, difficulty: 'standard', grid: createInitialGrid('crossroad'), towers: [] })
    expect(res.kills).toBe(0)
    expect(res.lives).toBe(DIFFICULTY_DEFS.standard.startingLives - def.count)
  })

  it('accounts for every creep: killed or leaked, with matching gold', () => {
    const grid = createInitialGrid('crossroad')
    const start = computeMazePath(grid, 'crossroad').path[4]!
    // Put a red brick on an open tile right beside the early path and mount a Repeater on it.
    const spot = [
      { x: start.x, y: start.y + 1 },
      { x: start.x, y: start.y - 1 },
    ].find((c) => grid[c.y]?.[c.x]?.kind === 'OPEN')!
    grid[spot.y]![spot.x] = { x: spot.x, y: spot.y, kind: 'ACTIVE_BRICK', color: 'red' }

    const def = getWaveDefinition(1, 'standard')
    const res = runWave({
      wave: 1, difficulty: 'standard', grid, towers: [tower('t1', 'repeater', spot.x, spot.y)],
    })
    const leaked = DIFFICULTY_DEFS.standard.startingLives - res.lives
    expect(res.cleared).toBe(true)
    expect(res.kills).toBeGreaterThanOrEqual(10)
    expect(res.kills + leaked).toBe(def.count)
    expect(res.gold).toBe(res.kills * def.bounty + def.clearBonus)
  })
})
