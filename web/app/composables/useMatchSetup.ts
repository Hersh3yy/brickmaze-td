import type { DifficultyId, MapLayoutId } from '~/game/domain/types';

// What the lobby picked, so /play knows which map and difficulty to start.
export function useMatchSetup() {
  const selectedMap = useState<MapLayoutId>('match-setup-map', () => 'crossroad');
  const selectedDifficulty = useState<DifficultyId>('match-setup-difficulty', () => 'standard');

  return { selectedMap, selectedDifficulty };
}
