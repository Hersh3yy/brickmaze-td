import React from 'react';
import { RefreshCw, Sparkles, Undo2 } from 'lucide-react';
import { TOWER_LIST } from '../../domain/constants';
import {
  BrickColor,
  GamePhase,
  PlacedTurnEntry,
  TowerType,
  TurnFusionOption,
} from '../../domain/types';
import { BrickColorGlyph } from '../atoms/BrickColorGlyph';
import { ProgressTrackBar } from '../atoms/ProgressTrackBar';
import { TactileButton } from '../atoms/TactileButton';
import { DraftBrickSlot } from '../molecules/DraftBrickSlot';
import { TurretShopCard } from '../molecules/TurretShopCard';

interface BuildControlDockProps {
  phase: GamePhase;
  draftQueue: BrickColor[];
  placedTurnCoords: PlacedTurnEntry[];
  rerollsRemaining: number;
  fusionOptions: TurnFusionOption[];
  gold: number;
  placingTowerType: TowerType | null;
  creepsRemaining: number;
  waveTotalCreeps: number;
  onRerollDraft: () => void;
  onUndoLastBrick: () => void;
  onPickTurnBrick: (index: number) => void;
  onFuseTurnPair: (option: TurnFusionOption) => void;
  onSelectTowerType: (type: TowerType) => void;
}

export const BuildControlDock: React.FC<BuildControlDockProps> = ({
  phase,
  draftQueue,
  placedTurnCoords,
  rerollsRemaining,
  fusionOptions,
  gold,
  placingTowerType,
  creepsRemaining,
  waveTotalCreeps,
  onRerollDraft,
  onUndoLastBrick,
  onPickTurnBrick,
  onFuseTurnPair,
  onSelectTowerType,
}) => {
  if (phase === 'BUILD_PLACE') {
    const placedCount = placedTurnCoords.length;

    return (
      <footer className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1D2531] border-t border-[#2F3D51] flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto max-w-full pb-0.5">
          {draftQueue.map((color, idx) => {
            const state =
              idx < placedCount ? 'placed' : idx === placedCount ? 'next' : 'queued';
            return <DraftBrickSlot key={`${idx}-${color}`} index={idx} color={color} state={state} />;
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <TactileButton
            variant="secondary"
            size="sm"
            disabled={placedCount === 0}
            onClick={onUndoLastBrick}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </TactileButton>
          <TactileButton
            variant="amber"
            size="sm"
            disabled={rerollsRemaining <= 0 || placedCount > 0}
            onClick={onRerollDraft}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reroll ({rerollsRemaining})</span>
          </TactileButton>
        </div>
      </footer>
    );
  }

  if (phase === 'BUILD_PICK') {
    return (
      <footer className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1D2531] border-t border-[#2F3D51] flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto max-w-full pb-0.5">
          {draftQueue.map((color, idx) => (
            <DraftBrickSlot
              key={`${idx}-${color}`}
              index={idx}
              color={color}
              state="pickable"
              onPick={() => onPickTurnBrick(idx)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <TactileButton variant="ghost" size="sm" onClick={onUndoLastBrick}>
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </TactileButton>
          {fusionOptions.slice(0, 2).map((opt) => (
            <TactileButton
              key={opt.id}
              variant="amber"
              size="sm"
              onClick={() => onFuseTurnPair(opt)}
              title={opt.description}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <BrickColorGlyph
                color={opt.colors[0]}
                secondaryColor={opt.colors[1]}
                size="sm"
              />
              <span>Fuse: {opt.name}</span>
            </TactileButton>
          ))}
        </div>
      </footer>
    );
  }

  return (
    <footer className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1D2531] border-t border-[#2F3D51] space-y-2 shrink-0">
      {phase === 'COMBAT' && (
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-xs font-mono text-slate-300 tabular-nums whitespace-nowrap shrink-0">
            Creeps: {creepsRemaining}/{waveTotalCreeps}
          </span>
          <ProgressTrackBar
            value={waveTotalCreeps - creepsRemaining}
            max={Math.max(1, waveTotalCreeps)}
            fillClass="bg-emerald-500"
            heightClass="h-1.5"
            ariaLabel="Wave defeat progress"
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {TOWER_LIST.map((tType) => (
          <TurretShopCard
            key={tType}
            type={tType}
            gold={gold}
            selected={placingTowerType === tType}
            disabled={phase === 'VICTORY' || phase === 'GAME_OVER'}
            onSelect={onSelectTowerType}
          />
        ))}
      </div>
    </footer>
  );
};
