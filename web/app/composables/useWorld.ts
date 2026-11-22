import { activeWorldRef } from '~/game/worlds';

/**
 * The active World (names, sprites, board looks) as a reactive ref. In templates use it
 * directly (`world.text.towers[type].name`); in script code read `world.value`.
 */
export function useWorld() {
  return activeWorldRef();
}
