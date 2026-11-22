import React from 'react';
import { Skull } from 'lucide-react';
import { GamePhase } from '../../domain/types';

interface PhaseStatusLabelProps {
  phase: GamePhase;
  bricksRemaining: number;
  relocating: boolean;
  bossPreview?: { name: string; hp: number; count: number } | null;
}

export const PhaseStatusLabel: React.FC<PhaseStatusLabelProps> = ({
  phase,
  bricksRemaining,
  relocating,
  bossPreview,
}) => {
  let title = '';
  let detail = '';
  let accent = 'text-amber-300';

  if (relocating && phase !== 'COMBAT') {
    title = 'Move Tower';
    detail = 'Click any empty brick · Esc to cancel';
    accent = 'text-emerald-300';
  } else {
    switch (phase) {
      case 'BUILD_PLACE':
        title = `Place ${bricksRemaining} Brick${bricksRemaining === 1 ? '' : 's'}`;
        detail = 'Click open tiles or replant empty gray walls';
        accent = 'text-amber-300';
        break;
      case 'BUILD_PICK':
        title = 'Keep 1 Brick or Fuse';
        detail = 'Others harden into gray walls';
        accent = 'text-sky-300';
        break;
      case 'BUILD_MANAGE':
        title = 'Build & Move Towers';
        detail = 'Ready for next wave';
        accent = 'text-emerald-300';
        break;
      case 'COMBAT':
        title = bossPreview ? `Boss Fight · ${bossPreview.name}` : 'Wave Active';
        detail = 'Click gray walls to delete (10g)';
        accent = 'text-rose-300';
        break;
      case 'VICTORY':
        title = 'Victory';
        detail = 'All 30 waves cleared';
        accent = 'text-emerald-300';
        break;
      case 'GAME_OVER':
        title = 'Game Over';
        detail = 'Out of lives';
        accent = 'text-rose-400';
        break;
    }
  }

  const showBossAlert =
    bossPreview &&
    (phase === 'BUILD_PLACE' || phase === 'BUILD_PICK' || phase === 'BUILD_MANAGE');

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-xs font-semibold whitespace-nowrap shrink-0 ${accent}`}>
        {title}
      </span>
      {showBossAlert ? (
        <>
          <span aria-hidden="true" className="text-slate-600 shrink-0">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 truncate">
            <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">
              Boss Incoming: {bossPreview.count > 1 ? `${bossPreview.count}× ` : ''}
              {bossPreview.name} ({bossPreview.hp.toLocaleString()} HP)
            </span>
          </span>
        </>
      ) : (
        <>
          <span aria-hidden="true" className="hidden sm:inline text-slate-600 shrink-0">
            ·
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 truncate">{detail}</span>
        </>
      )}
    </div>
  );
};
