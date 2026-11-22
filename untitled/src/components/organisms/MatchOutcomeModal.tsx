import React from 'react';
import { Infinity as InfinityIcon, RotateCcw, Trophy } from 'lucide-react';
import { DIFFICULTY_DEFS } from '../../domain/constants';
import { MatchSummary } from '../../domain/types';
import { TactileButton } from '../atoms/TactileButton';

interface MatchOutcomeModalProps {
  summary: MatchSummary;
  onContinueEndless?: () => void;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export const MatchOutcomeModal: React.FC<MatchOutcomeModalProps> = ({
  summary,
  onContinueEndless,
  onPlayAgain,
  onReturnLobby,
}) => {
  const diffLabel = DIFFICULTY_DEFS[summary.difficulty]?.label ?? 'Standard';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-[#1D2531] border border-[#3A4D66] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#2D3A4D]">
          <div className="flex items-center gap-2.5">
            {summary.won && <Trophy className="w-5 h-5 text-amber-400 shrink-0" />}
            <h2
              id="outcome-modal-title"
              className={`text-xl font-bold ${
                summary.won ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {summary.won ? 'Maze Mastered — Victory!' : 'Maze Breached — Game Over'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {diffLabel} Difficulty ·{' '}
            {summary.won
              ? 'All 30 waves conquered. Push your labyrinth further in Endless Mode or start a fresh layout.'
              : 'Your defenses fell, but every wave cleared earned permanent Architect XP.'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-400">Waves Cleared</div>
              <div className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                {summary.wavesCleared}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Longest Maze Path</div>
              <div className="font-mono text-lg font-bold text-sky-300 tabular-nums">
                {summary.longestPath} tiles
              </div>
            </div>
            <div>
              <div className="text-slate-400">Creeps Eliminated</div>
              <div className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                {summary.creepsDefeated}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Synergy Circuits</div>
              <div className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                {summary.synergiesCount}
              </div>
            </div>
          </div>

          <div className="py-3 px-4 rounded-md bg-[#141A22] border border-[#2C394C] flex items-center justify-between">
            <span className="text-xs text-slate-300">Architect XP Earned</span>
            <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
              +{summary.xpEarned} XP
              {summary.leveledUp ? ` · Rank ${summary.newLevel}!` : ''}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {summary.won && onContinueEndless && (
              <TactileButton variant="amber" fullWidth onClick={onContinueEndless}>
                <InfinityIcon className="w-4 h-4" />
                <span>Continue Endless Mode</span>
              </TactileButton>
            )}
            <TactileButton variant="primary" fullWidth onClick={onPlayAgain}>
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </TactileButton>
            <TactileButton variant="ghost" fullWidth onClick={onReturnLobby}>
              Return to Lobby
            </TactileButton>
          </div>
        </div>
      </div>
    </div>
  );
};
