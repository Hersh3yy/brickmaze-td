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
    // One tower alone does not hold wave 1 (by design since the Nov 2026 tuning); it must still kill some.
    expect(res.kills).toBeGreaterThan(0)
    expect(res.kills + leaked).toBe(def.count)
    expect(res.gold).toBe(res.kills * def.bounty + def.clearBonus)
  })
})

describe('fresh targeting', () => {
  function fireOnce(targeting: 'first' | 'fresh') {
    const grid = createInitialGrid('crossroad')
    const path = computeMazePath(grid, 'crossroad').path
    const spot = { x: path[6]!.x, y: path[6]!.y + 1 }
    grid[spot.y]![spot.x] = { x: spot.x, y: spot.y, kind: 'ACTIVE_BRICK', color: 'green' }

    const sim = createSimState(path.length)
    const creep = (id: string, pathIndex: number, poisoned: boolean) => {
      const tile = path[pathIndex]!
      return {
        id, wave: 1, trait: 'normal' as const,
        x: tile.x * 36 + 18, y: tile.y * 36 + 18,
        path, pathIndex, hp: 500, maxHp: 500, speed: 0, armor: 0, bounty: 1,
        slowTimer: poisoned ? 2 : 0, slowFactor: poisoned ? 0.35 : 0,
        poisonTimer: poisoned ? 3 : 0, poisonDps: poisoned ? 5 : 0,
        burnTimer: 0, burnDps: 0, shredTimer: 0, animTime: 0, radius: 8,
      }
    }
    // The creep further along is already poisoned; the one behind it is clean.
    sim.creeps.push(creep('ahead-poisoned', 7, true), creep('behind-clean', 5, false))

    const t = tower('t1', 'repeater', spot.x, spot.y)
    t.targeting = targeting
    const world: SimWorld = {
      grid, phase: 'COMBAT', wave: 1, difficulty: 'standard', endlessMode: false,
      lives: 20, gold: 0, towers: [t], path, speed: 1,
    }
    stepSimulation(sim, world, 1 / 60, 0, {}, mulberry32(1))
    return sim.projectiles[0]?.targetId
  }

  it('first targets the front creep even when it is already poisoned', () => {
    expect(fireOnce('first')).toBe('ahead-poisoned')
  })

  it('fresh skips the poisoned creep and spreads venom to the clean one', () => {
    expect(fireOnce('fresh')).toBe('behind-clean')
  })
})

describe('wave specials', () => {
  it('schedules rally every 3rd wave and escorts in between, never on boss waves', () => {
    expect(getWaveDefinition(3).modifier).toBe('rally')
    expect(getWaveDefinition(4).modifier).toBe('escort')
    expect(getWaveDefinition(5).modifier).toBeUndefined()
    expect(getWaveDefinition(15).modifier).toBeUndefined()
    expect(getWaveDefinition(2).modifier).toBeUndefined()
    // Armored waves (3, 8, 13, 18, 23, 28) never get heroes on top.
    expect(getWaveDefinition(13).modifier).toBeUndefined()
    expect(getWaveDefinition(28).modifier).toBeUndefined()
  })

  function startWave(wave: number) {
    const grid = createInitialGrid('crossroad')
    const path = computeMazePath(grid, 'crossroad').path
    const sim = createSimState(path.length)
    const total = beginWave(sim, wave, 'standard')
    const world: SimWorld = {
      grid, phase: 'COMBAT', wave, difficulty: 'standard', endlessMode: false,
      lives: 20, gold: 0, towers: [], path, speed: 1,
    }
    // Spawn the whole wave without anyone shooting.
    for (let step = 0; step < 60 * 60 && sim.spawnQueueLeft > 0; step++) {
      stepSimulation(sim, world, 1 / 60, step * 16, {}, mulberry32(3))
    }
    return { sim, world, total }
  }

  it('escort waves add a vanguard first and a warden last, with 2.5x health', () => {
    const def = getWaveDefinition(4)
    const { sim, total } = startWave(4)
    expect(total).toBe(def.count + 2)
    const spawnedInOrder = [...sim.creeps].sort((a, b) => b.pathIndex - a.pathIndex)
    expect(spawnedInOrder[0]!.hero).toBe('vanguard')
    expect(spawnedInOrder.at(-1)!.hero).toBe('warden')
    expect(spawnedInOrder[0]!.maxHp).toBe(def.hp * 2.5)
  })

  it('rally waves make the rest of the wave 2% tougher per kill, capped at +40%', () => {
    const { sim, world } = startWave(3)
    const [victim, ...rest] = sim.creeps
    const before = rest.map((c) => c.maxHp)
    // Poison the first creep to death on the next step.
    victim!.hp = 0.01
    victim!.poisonTimer = 1
    victim!.poisonDps = 100
    stepSimulation(sim, world, 1 / 60, 99999, {}, mulberry32(4))
    rest.forEach((c, i) => expect(c.maxHp).toBeCloseTo(before[i]! * 1.02, 5))
    expect(sim.rallyMult).toBeCloseTo(1.02, 5)

    // Kill 30 more: the bonus adds up and stops at +40%.
    for (let k = 0; k < 30 && sim.creeps.length > 1; k++) {
      const c = sim.creeps[0]!
      c.hp = 0.01
      c.poisonTimer = 1
      c.poisonDps = 100
      stepSimulation(sim, world, 1 / 60, 99999 + k, {}, mulberry32(5 + k))
    }
    expect(sim.rallyMult).toBeLessThanOrEqual(1.4 + 1e-9)
  })
})
