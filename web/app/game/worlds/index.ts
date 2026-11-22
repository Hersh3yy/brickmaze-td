import { shallowRef } from 'vue';
import type { CreepTrait, HeroRole, WaveDefinition } from '../domain/types';
import { brickLab } from './brickLab';
import { lightsOut } from './lightsOut';
import type { WorldDefinition } from './types';

export type { WorldDefinition } from './types';

/** Every World the player can pick, in menu order. */
export const WORLDS = {
  brick_lab: brickLab,
  lights_out: lightsOut,
} as const satisfies Record<string, WorldDefinition>;

export type WorldId = keyof typeof WORLDS;
export const WORLD_LIST = Object.keys(WORLDS) as WorldId[];
export const DEFAULT_WORLD: WorldId = 'brick_lab';

const STORAGE_KEY = 'brickmaze.world';

function readSavedWorld(): WorldId {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved && saved in WORLDS) return saved as WorldId;
  } catch {
    // Private mode or blocked storage: fall back to the default World.
  }
  return DEFAULT_WORLD;
}

/**
 * The active World. A shallowRef so Vue templates and computeds that read it update when
 * the player switches; the renderer and atlas read it each frame and notice the change
 * by id. Switch Worlds from the menu, not mid-match: labels computed during a match
 * (ammo names, fusion options) keep the World they were made with.
 */
const active = shallowRef<WorldDefinition>(WORLDS[readSavedWorld()]);

export function activeWorld(): WorldDefinition {
  return active.value;
}

export function activeWorldRef() {
  return active;
}

export function setWorld(id: WorldId) {
  if (!(id in WORLDS)) return;
  active.value = WORLDS[id];
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, id);
  } catch {
    // Not saved; the choice still applies for this session.
  }
}

/** Display name for a wave: its trait's name, or the boss name for that boss wave. */
export function waveTitle(def: Pick<WaveDefinition, 'wave' | 'trait'>, world = active.value): string {
  if (def.trait === 'boss') {
    const list = world.text.bosses;
    const index = Math.max(0, Math.floor(def.wave / 5) - 1);
    return list[Math.min(list.length - 1, index)] ?? 'Boss';
  }
  return world.text.waves[def.trait as Exclude<CreepTrait, 'boss'>];
}

export function heroName(role: HeroRole, world = active.value): string {
  return world.text.heroes[role];
}
