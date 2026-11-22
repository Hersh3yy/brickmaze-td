import { useCallback, useEffect, useState } from 'react';
import { ArenaMatchPage } from './components/pages/ArenaMatchPage';
import { TitleLobbyPage } from './components/pages/TitleLobbyPage';
import { BoardThemeId, DifficultyId, MapLayoutId, MatchSummary, PlayerProfile } from './domain/types';
import {
  applyMatchProgression,
  createDefaultProfile,
  profileRepository,
} from './services/profileRepository';

type ScreenView = 'LOBBY' | 'MATCH';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => createDefaultProfile());
  const [screen, setScreen] = useState<ScreenView>('LOBBY');
  const [selectedMap, setSelectedMap] = useState<MapLayoutId>('crossroad');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('standard');

  useEffect(() => {
    let mounted = true;
    profileRepository.loadProfile().then((loaded) => {
      if (mounted) setProfile(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectTheme = useCallback(
    async (themeId: BoardThemeId) => {
      if (!profile.unlockedThemes.includes(themeId)) return;
      const saved = await profileRepository.saveProfile({
        ...profile,
        selectedTheme: themeId,
      });
      setProfile(saved);
    },
    [profile]
  );

  const handleUpdateDisplayName = useCallback(
    async (displayName: string) => {
      const saved = await profileRepository.saveProfile({
        ...profile,
        displayName,
      });
      setProfile(saved);
    },
    [profile]
  );

  const handleImportCode = useCallback(async (code: string) => {
    const res = await profileRepository.importFromTransferCode(code);
    if (res.ok) {
      setProfile(res.profile);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  const handleRecordMatchEnd = useCallback(
    async (result: {
      won: boolean;
      difficulty: DifficultyId;
      wavesCleared: number;
      longestPath: number;
      synergiesCount: number;
      creepsDefeated: number;
    }): Promise<MatchSummary> => {
      const { updatedProfile, summary } = applyMatchProgression(profile, result);
      const saved = await profileRepository.saveProfile(updatedProfile);
      setProfile(saved);
      return summary;
    },
    [profile]
  );

  if (screen === 'MATCH') {
    return (
      <ArenaMatchPage
        profile={profile}
        mapLayout={selectedMap}
        difficulty={selectedDifficulty}
        onExitToLobby={() => setScreen('LOBBY')}
        onRecordMatchEnd={handleRecordMatchEnd}
      />
    );
  }

  return (
    <TitleLobbyPage
      profile={profile}
      transferCode={profileRepository.exportTransferCode(profile)}
      selectedMap={selectedMap}
      selectedDifficulty={selectedDifficulty}
      onSelectMap={setSelectedMap}
      onSelectDifficulty={setSelectedDifficulty}
      onSelectTheme={handleSelectTheme}
      onUpdateDisplayName={handleUpdateDisplayName}
      onImportCode={handleImportCode}
      onStartMatch={() => setScreen('MATCH')}
    />
  );
}
