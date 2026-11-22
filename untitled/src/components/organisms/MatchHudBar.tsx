import React from 'react';
import { ArrowLeft, Play, Skull } from 'lucide-react';
import { DIFFICULTY_DEFS, MAX_WAVES } from '../../domain/constants';
import { DifficultyId, GamePhase } from '../../domain/types';
import { TactileButton } from '../atoms/TactileButton';
import { TabularMetricValue } from '../atoms/TabularMetricValue';
import { SpeedAudioControlGroup } from '../molecules/SpeedAudioControlGroup';

interface MatchHudBarProps {
  wave: number;
  difficulty: DifficultyId;
  endlessMode: boolean;
  lives: number;
  gold: number;
  pathLength: number;
  phase: GamePhase;
  speed: 1 | 2 | 3;
  muted: boolean;
  onChangeSpeed: (s: 1 | 2 | 3) => void;
  onToggleMute: () => void;
  onSendWave: () => void;
  onExitToLobby: () => void;
}

export const MatchHudBar: React.FC<MatchHudBarProps> = ({
  wave,
  difficulty,
  endlessMode,
  lives,
  gold,
  pathLength,
  phase,
  speed,
  muted,
  onChangeSpeed,
  onToggleMute,
  onSendWave,
  onExitToLobby,
}) => {
  const canSendWave = phase === 'BUILD_MANAGE';
  const isBossWave = wave % 5 === 0;
  const diffLabel = DIFFICULTY_DEFS[difficulty].label;
  const waveSubtext = isBossWave
    ? 'BOSS'
    : endlessMode
      ? 'Endless'
      : difficulty !== 'standard'
        ? diffLabel
        : undefined;

  return (
    <header className="flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-2 px-3 sm:px-5 py-2 bg-[#1D2531] border-b border-[#2F3D51] shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onExitToLobby}
          title="Return to Lobby"
          className="p-2 sm:p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Return to Lobby"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="hidden sm:inline font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          BrickMaze TD
        </span>
      </div>

      <div className="order-3 md:order-2 w-full md:w-auto flex items-center justify-between md:justify-center gap-3 sm:gap-5 pt-1 md:pt-0 border-t border-[#283446] md:border-t-0">
        <TabularMetricValue
          label="Wave"
          value={endlessMode ? `${wave}` : `${wave}/${MAX_WAVES}`}
          subtext={waveSubtext}
          accentClass={isBossWave ? 'text-rose-400' : 'text-slate-100'}
        />
        <span aria-hidden="true" className="h-4 w-px bg-[#2F3D51] shrink-0" />
        <TabularMetricValue
          label="Lives"
          value={lives}
          accentClass={lives <= 5 ? 'text-rose-400' : 'text-emerald-400'}
        />
        <span aria-hidden="true" className="h-4 w-px bg-[#2F3D51] shrink-0" />
        <TabularMetricValue label="Gold" value={`${gold}g`} accentClass="text-amber-300" />
        <span aria-hidden="true" className="h-4 w-px bg-[#2F3D51] shrink-0" />
        <TabularMetricValue
          label="Path"
          value={`${pathLength}`}
          subtext="t"
          accentClass="text-sky-300"
        />
      </div>

      <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3 shrink-0">
        <SpeedAudioControlGroup
          speed={speed}
          muted={muted}
          onChangeSpeed={onChangeSpeed}
          onToggleMute={onToggleMute}
        />
        <TactileButton
          variant={isBossWave ? 'danger' : 'primary'}
          size="sm"
          disabled={!canSendWave}
          onClick={onSendWave}
          title={
            canSendWave
              ? isBossWave
                ? 'Launch Boss Wave (Space)'
                : 'Send next wave (Space)'
              : 'Finish brick draft first'
          }
        >
          {isBossWave ? (
            <Skull className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span className="hidden sm:inline">
            {phase === 'COMBAT'
              ? isBossWave
                ? `Boss W${wave}`
                : `Wave ${wave}`
              : isBossWave
                ? `Send Boss W${wave}`
                : `Send Wave ${wave}`}
          </span>
          <span className="sm:hidden">
            {phase === 'COMBAT' ? `W${wave}` : isBossWave ? `Boss` : `Send`}
          </span>
        </TactileButton>
      </div>
    </header>
  );
};
