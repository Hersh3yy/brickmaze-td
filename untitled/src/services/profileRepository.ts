import { BOARD_THEMES, DIFFICULTY_DEFS, getXpForNextLevel } from '../domain/constants';
import { BoardThemeId, DifficultyId, MatchSummary, PlayerProfile } from '../domain/types';

/**
 * Laravel-Ready Persistence Contract.
 * Swap `LocalProfileRepository` with a `LaravelApiProfileRepository` calling
 * GET/PUT `/api/profiles/{profileId}` once the Laravel backend is live.
 */
export interface ProfileRepository {
  loadProfile(): Promise<PlayerProfile>;
  saveProfile(profile: PlayerProfile): Promise<PlayerProfile>;
  importFromTransferCode(code: string): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }>;
  exportTransferCode(profile: PlayerProfile): string;
}

const STORAGE_KEY = 'brickmaze_td_profile_v1';

function randomChunk(len: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function generateProfileId(): string {
  return `BRICK-${randomChunk(4)}-${randomChunk(4)}`;
}

export function computeUnlockedThemes(level: number): BoardThemeId[] {
  return (Object.keys(BOARD_THEMES) as BoardThemeId[]).filter(
    (id) => BOARD_THEMES[id].unlockLevel <= level
  );
}

export function createDefaultProfile(): PlayerProfile {
  const id = generateProfileId();
  return {
    profileId: id,
    displayName: `Builder #${Math.floor(100 + Math.random() * 899)}`,
    xp: 0,
    level: 1,
    selectedTheme: 'toybox_slate',
    unlockedThemes: ['toybox_slate'],
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      highestWave: 0,
      longestMazePath: 0,
      synergiesTriggered: 0,
      totalCreepsDefeated: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function applyMatchProgression(
  profile: PlayerProfile,
  result: {
    won: boolean;
    difficulty: DifficultyId;
    wavesCleared: number;
    longestPath: number;
    synergiesCount: number;
    creepsDefeated: number;
  }
): { updatedProfile: PlayerProfile; summary: MatchSummary } {
  const diffMult = DIFFICULTY_DEFS[result.difficulty]?.xpMult ?? 1;
  const rawXp =
    result.wavesCleared * 24 +
    Math.floor(result.longestPath * 1.2) +
    result.synergiesCount * 14 +
    (result.won ? 220 : 0);
  const xpEarned = Math.round(rawXp * diffMult);

  let xp = profile.xp + xpEarned;
  let level = profile.level;
  const startLevel = profile.level;

  while (xp >= getXpForNextLevel(level)) {
    xp -= getXpForNextLevel(level);
    level += 1;
  }

  const unlockedThemes = computeUnlockedThemes(level);

  const updatedProfile: PlayerProfile = {
    ...profile,
    xp,
    level,
    unlockedThemes,
    stats: {
      gamesPlayed: profile.stats.gamesPlayed + 1,
      gamesWon: profile.stats.gamesWon + (result.won ? 1 : 0),
      highestWave: Math.max(profile.stats.highestWave, result.wavesCleared),
      longestMazePath: Math.max(profile.stats.longestMazePath, result.longestPath),
      synergiesTriggered: profile.stats.synergiesTriggered + result.synergiesCount,
      totalCreepsDefeated: profile.stats.totalCreepsDefeated + result.creepsDefeated,
    },
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedProfile,
    summary: {
      won: result.won,
      difficulty: result.difficulty,
      wavesCleared: result.wavesCleared,
      longestPath: result.longestPath,
      synergiesCount: result.synergiesCount,
      creepsDefeated: result.creepsDefeated,
      xpEarned,
      leveledUp: level > startLevel,
      newLevel: level,
    },
  };
}

function quickChecksum(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((encoded.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeProfileTransferCode(profile: PlayerProfile): string {
  const compact = {
    v: 1,
    id: profile.profileId,
    n: profile.displayName.slice(0, 24),
    x: profile.xp,
    l: profile.level,
    t: profile.selectedTheme,
    s: [
      profile.stats.gamesPlayed,
      profile.stats.gamesWon,
      profile.stats.highestWave,
      profile.stats.longestMazePath,
      profile.stats.synergiesTriggered,
      profile.stats.totalCreepsDefeated,
    ],
  };
  const payload = toBase64Url(JSON.stringify(compact));
  const sum = quickChecksum(payload);
  return `BM1-${sum}-${payload}`;
}

export function decodeProfileTransferCode(
  rawCode: string
): { ok: true; profile: PlayerProfile } | { ok: false; error: string } {
  const trimmed = rawCode.trim();
  const match = /^BM1-([0-9A-F]{4})-([A-Za-z0-9\-_]+)$/i.exec(trimmed);
  if (!match) {
    return { ok: false, error: 'Invalid code format. Expected a BM1-XXXX-... transfer string.' };
  }

  const [, expectedSum, payload] = match;
  if (quickChecksum(payload) !== expectedSum.toUpperCase()) {
    return { ok: false, error: 'Transfer code checksum failed. Please check you copied the full string.' };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload));
    if (!parsed || parsed.v !== 1 || typeof parsed.id !== 'string' || !Array.isArray(parsed.s)) {
      return { ok: false, error: 'Corrupted profile payload.' };
    }
    const level = Math.max(1, Math.min(99, Math.floor(Number(parsed.l) || 1)));
    const unlockedThemes = computeUnlockedThemes(level);
    const requestedTheme = parsed.t as BoardThemeId;
    const selectedTheme = unlockedThemes.includes(requestedTheme) ? requestedTheme : 'toybox_slate';

    const profile: PlayerProfile = {
      profileId: parsed.id.slice(0, 24),
      displayName: String(parsed.n || 'Builder').slice(0, 24),
      xp: Math.max(0, Math.floor(Number(parsed.x) || 0)),
      level,
      selectedTheme,
      unlockedThemes,
      stats: {
        gamesPlayed: Math.max(0, Math.floor(Number(parsed.s[0]) || 0)),
        gamesWon: Math.max(0, Math.floor(Number(parsed.s[1]) || 0)),
        highestWave: Math.max(0, Math.floor(Number(parsed.s[2]) || 0)),
        longestMazePath: Math.max(0, Math.floor(Number(parsed.s[3]) || 0)),
        synergiesTriggered: Math.max(0, Math.floor(Number(parsed.s[4]) || 0)),
        totalCreepsDefeated: Math.max(0, Math.floor(Number(parsed.s[5]) || 0)),
      },
      updatedAt: new Date().toISOString(),
    };

    return { ok: true, profile };
  } catch {
    return { ok: false, error: 'Unable to decode transfer code.' };
  }
}

class LocalProfileRepository implements ProfileRepository {
  public async loadProfile(): Promise<PlayerProfile> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayerProfile;
        if (parsed && parsed.profileId && parsed.stats) {
          const level = Math.max(1, parsed.level || 1);
          const unlockedThemes = computeUnlockedThemes(level);
          return {
            ...parsed,
            level,
            unlockedThemes,
            selectedTheme: unlockedThemes.includes(parsed.selectedTheme)
              ? parsed.selectedTheme
              : 'toybox_slate',
          };
        }
      }
    } catch {
      // Fallback to creating a fresh profile
    }
    const fresh = createDefaultProfile();
    await this.saveProfile(fresh);
    return fresh;
  }

  public async saveProfile(profile: PlayerProfile): Promise<PlayerProfile> {
    const stamped: PlayerProfile = {
      ...profile,
      unlockedThemes: computeUnlockedThemes(profile.level),
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    } catch {
      // Ignore storage quota errors cleanly
    }
    return stamped;
  }

  public async importFromTransferCode(
    code: string
  ): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
    const decoded = decodeProfileTransferCode(code);
    if (!decoded.ok) return decoded;
    const saved = await this.saveProfile(decoded.profile);
    return { ok: true, profile: saved };
  }

  public exportTransferCode(profile: PlayerProfile): string {
    return encodeProfileTransferCode(profile);
  }
}

export const profileRepository: ProfileRepository = new LocalProfileRepository();
