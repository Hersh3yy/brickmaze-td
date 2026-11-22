import React, { useState } from 'react';
import { Lock, Play, User } from 'lucide-react';
import {
  BOARD_THEMES,
  BRICK_COLORS,
  BRICK_COLOR_LIST,
  DIFFICULTY_DEFS,
  DIFFICULTY_LIST,
  MAP_LAYOUTS,
  getProfilePerks,
  getXpForNextLevel,
} from '../../domain/constants';
import { BoardThemeId, DifficultyId, MapLayoutId, PlayerProfile } from '../../domain/types';
import { BrickColorGlyph } from '../atoms/BrickColorGlyph';
import { ProgressTrackBar } from '../atoms/ProgressTrackBar';
import { TactileButton } from '../atoms/TactileButton';
import { ProfileTransferModal } from '../organisms/ProfileTransferModal';
import { LobbyShellTemplate } from '../templates/LobbyShellTemplate';

const HERO_IMAGE = '/src/assets/images/brickmaze_hero_diorama_1795175678900.jpg';
const EMBLEM_IMAGE = '/src/assets/images/brickmaze_emblem_icon_1795175678005.jpg';

interface TitleLobbyPageProps {
  profile: PlayerProfile;
  transferCode: string;
  selectedMap: MapLayoutId;
  selectedDifficulty: DifficultyId;
  onSelectMap: (id: MapLayoutId) => void;
  onSelectDifficulty: (id: DifficultyId) => void;
  onSelectTheme: (id: BoardThemeId) => void;
  onUpdateDisplayName: (name: string) => void;
  onImportCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onStartMatch: () => void;
}

export const TitleLobbyPage: React.FC<TitleLobbyPageProps> = ({
  profile,
  transferCode,
  selectedMap,
  selectedDifficulty,
  onSelectMap,
  onSelectDifficulty,
  onSelectTheme,
  onUpdateDisplayName,
  onImportCode,
  onStartMatch,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [emblemFailed, setEmblemFailed] = useState(false);

  const nextXp = getXpForNextLevel(profile.level);
  const perks = getProfilePerks(profile.level);

  const header = (
    <header className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#1C2430] border-b border-[#2D3A4D]">
      <div className="flex items-center gap-3 shrink-0">
        {!emblemFailed ? (
          <img
            src={EMBLEM_IMAGE}
            alt="BrickMaze TD emblem"
            referrerPolicy="no-referrer"
            onError={() => setEmblemFailed(true)}
            className="w-8 h-8 rounded-[4px] object-cover border border-[#3B4C65] pixel-canvas shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-[4px] bg-amber-500/20 border border-amber-400/50 flex items-center justify-center font-mono text-xs font-bold text-amber-300 shrink-0">
            BM
          </div>
        )}
        <span className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          BrickMaze TD
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-5 text-sm text-slate-300">
        <span className="whitespace-nowrap shrink-0">
          {profile.displayName} · Rank {profile.level}
        </span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap shrink-0">
          Best Wave {profile.stats.highestWave}
        </span>
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <TactileButton variant="secondary" size="sm" onClick={() => setProfileOpen(true)}>
          <User className="w-3.5 h-3.5" />
          <span>Profile & Code</span>
        </TactileButton>
      </div>
    </header>
  );

  const heroVisual = (
    <div className="flex flex-col h-full rounded-lg overflow-hidden bg-[#1D2531] border border-[#2F3D51]">
      <div className="relative flex-1 min-h-[220px] sm:min-h-[280px] bg-[#12171E] overflow-hidden">
        {!heroImgFailed ? (
          <img
            src={HERO_IMAGE}
            alt="Top-down pixel art plastic brick tower defense maze diorama"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1D2531] to-[#11161D] p-8 text-center">
            <span className="font-display text-2xl font-bold text-slate-200">
              BrickMaze TD Tactical Baseplate
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161B22] via-[#161B22]/45 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 space-y-2">
          <h1
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white max-w-xl"
            style={{ textWrap: 'balance' }}
          >
            Weapons on Top. Elemental Bricks Underneath.
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed">
            Draft 4 elemental bricks each turn to build your maze. Mount Repeaters, Cannons, Pulses, or Rail Snipers—and watch the brick color transform their ammo into Lightning, Fire, or Venom.
          </p>
        </div>
      </div>

      <div className="px-6 py-4 bg-[#1A212C] border-t border-[#2D3A4D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 max-w-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Rank {profile.level}</span>
            <span className="font-mono text-slate-400 tabular-nums">
              {profile.xp} / {nextXp} XP
            </span>
          </div>
          <ProgressTrackBar
            value={profile.xp}
            max={nextXp}
            fillClass="bg-amber-400"
            heightClass="h-1.5"
            ariaLabel="Profile rank progress"
          />
        </div>
        <div className="text-xs text-slate-400">
          Perks: <span className="text-emerald-300 font-medium">{perks.perkSummary.join(' · ')}</span>
        </div>
      </div>
    </div>
  );

  const activeDiff = DIFFICULTY_DEFS[selectedDifficulty];

  const setupPanel = (
    <div className="flex flex-col justify-between h-full rounded-lg bg-[#1D2531] border border-[#2F3D51] p-4 sm:p-6 space-y-5">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">01. Difficulty</h2>
            <span className="font-mono text-[11px] text-emerald-300 tabular-nums">
              {Math.round(activeDiff.xpMult * 100)}% XP
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#141A22] border border-[#2C384B] rounded-md">
            {DIFFICULTY_LIST.map((diffId) => {
              const d = DIFFICULTY_DEFS[diffId];
              const active = selectedDifficulty === diffId;
              return (
                <button
                  key={diffId}
                  type="button"
                  onClick={() => onSelectDifficulty(diffId)}
                  className={[
                    'min-h-[40px] px-2 py-2 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                    active
                      ? diffId === 'brutal'
                        ? 'bg-rose-500/20 text-rose-200 border border-rose-400/60'
                        : diffId === 'hard'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
                          : 'bg-[#283548] text-white border border-amber-400/70'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent',
                  ].join(' ')}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">{activeDiff.tagline}</p>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2C384B]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">02. Map</h2>
            <span className="text-xs text-slate-400">24×16 · 30 Waves</span>
          </div>
          <div className="space-y-2">
            {(Object.keys(MAP_LAYOUTS) as MapLayoutId[]).map((id) => {
              const map = MAP_LAYOUTS[id];
              const active = selectedMap === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectMap(id)}
                  className={[
                    'w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-md border transition-colors cursor-pointer',
                    active
                      ? 'bg-[#283548] border-amber-400 text-slate-100'
                      : 'bg-[#171E28] border-[#2C384B] text-slate-300 hover:bg-[#1F2937]',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{map.name}</span>
                    <span className="font-mono text-[11px] text-amber-300">{map.difficulty}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{map.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2C384B]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">03. Board Theme</h2>
            <span className="text-xs text-slate-400">Cosmetic</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((themeId) => {
              const t = BOARD_THEMES[themeId];
              const unlocked = profile.unlockedThemes.includes(themeId);
              const active = profile.selectedTheme === themeId;
              return (
                <button
                  key={themeId}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectTheme(themeId)}
                  className={[
                    'flex items-center justify-between gap-2 px-3 py-2 min-h-[40px] rounded-md border text-xs transition-colors',
                    active
                      ? 'bg-[#283548] border-amber-400 text-slate-100 font-semibold cursor-pointer'
                      : unlocked
                        ? 'bg-[#171E28] border-[#2C384B] text-slate-300 hover:bg-[#1F2937] cursor-pointer'
                        : 'bg-[#141920] border-[#242E3D] text-slate-500 opacity-65 cursor-not-allowed',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-[2px] border border-white/20 shrink-0"
                      style={{ backgroundColor: t.cellFill }}
                    />
                    <span className="truncate">{t.name}</span>
                  </span>
                  {!unlocked && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] shrink-0">
                      <Lock className="w-3 h-3" />
                      Lv.{t.unlockLevel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <TactileButton variant="primary" size="lg" fullWidth onClick={onStartMatch}>
          <Play className="w-4 h-4 fill-current" />
          <span>Start {activeDiff.label} Match</span>
        </TactileButton>
      </div>
    </div>
  );

  const footerRules = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-100">01. Towers = Weapon Types</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Repeater (rapid bolts), Cannon (arcing blast), Pulse (360° shockwave), and Rail Sniper (pierces armor). Move any weapon freely between waves.
        </p>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-100">02. Bricks = Projectile Ammo</h3>
        <div className="space-y-1.5">
          {BRICK_COLOR_LIST.map((c) => (
            <div key={c} className="inline-flex items-center gap-2 text-xs text-slate-300 mr-4">
              <BrickColorGlyph color={c} size="sm" />
              <span>{BRICK_COLORS[c].bonusShort}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-100">03. Replant & Zoom</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Replant new bricks directly over empty gray walls so you never run out of room, and zoom in up to 225% to watch the pixel-art combat up close.
        </p>
      </div>
    </div>
  );

  return (
    <LobbyShellTemplate
      header={header}
      heroVisual={heroVisual}
      setupPanel={setupPanel}
      footerRules={footerRules}
      modal={
        profileOpen ? (
          <ProfileTransferModal
            profile={profile}
            transferCode={transferCode}
            onClose={() => setProfileOpen(false)}
            onUpdateDisplayName={onUpdateDisplayName}
            onImportCode={onImportCode}
          />
        ) : undefined
      }
    />
  );
};
