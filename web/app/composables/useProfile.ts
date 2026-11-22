import type {
  BoardThemeId,
  DifficultyId,
  MatchSummary,
  PlayerProfile,
} from '~/game/domain/types';
import {
  applyMatchProgression,
  createDefaultProfile,
  profileRepository,
} from '~/game/services/profileRepository';

export interface MatchEndResult {
  won: boolean;
  difficulty: DifficultyId;
  wavesCleared: number;
  longestPath: number;
  synergiesCount: number;
  creepsDefeated: number;
}

// Shared player profile (rank, XP, themes, stats). Persistence goes through
// profileRepository, so swapping LocalStorage for an API later only touches that file.
export function useProfile() {
  const profile = useState<PlayerProfile>('profile', () => createDefaultProfile());
  const loaded = useState<boolean>('profile-loaded', () => false);

  const transferCode = computed(() => profileRepository.exportTransferCode(profile.value));

  async function ensureLoaded(): Promise<void> {
    if (loaded.value) return;
    loaded.value = true;
    profile.value = await profileRepository.loadProfile();
  }

  async function selectTheme(themeId: BoardThemeId): Promise<void> {
    if (!profile.value.unlockedThemes.includes(themeId)) return;
    profile.value = await profileRepository.saveProfile({
      ...profile.value,
      selectedTheme: themeId,
    });
  }

  async function updateDisplayName(displayName: string): Promise<void> {
    profile.value = await profileRepository.saveProfile({
      ...profile.value,
      displayName,
    });
  }

  async function importCode(code: string): Promise<{ ok: boolean; error?: string }> {
    const res = await profileRepository.importFromTransferCode(code);
    if (res.ok) {
      profile.value = res.profile;
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }

  /** Start over: wipes rank, XP, themes and stats and saves a brand-new profile. */
  async function resetProfile(): Promise<void> {
    profile.value = await profileRepository.saveProfile(createDefaultProfile());
  }

  async function recordMatchEnd(result: MatchEndResult): Promise<MatchSummary> {
    const { updatedProfile, summary } = applyMatchProgression(profile.value, result);
    profile.value = await profileRepository.saveProfile(updatedProfile);
    return summary;
  }

  return {
    profile,
    transferCode,
    ensureLoaded,
    selectTheme,
    updateDisplayName,
    importCode,
    resetProfile,
    recordMatchEnd,
  };
}
