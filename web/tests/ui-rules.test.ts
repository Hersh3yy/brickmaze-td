import { describe, expect, it } from 'vitest'
import { TOWER_DEFS, TOWER_LIST } from '~/game/domain/constants'

describe('tower hotkeys', () => {
  it('match the order the shop and tile menu show', () => {
    TOWER_LIST.forEach((type, idx) => {
      expect(TOWER_DEFS[type].hotkey).toBe(String(idx + 1))
    })
  })
})
