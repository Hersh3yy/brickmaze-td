import React from 'react';
import { BRICK_COLORS } from '../../domain/constants';
import { BrickColor } from '../../domain/types';
import { BrickColorGlyph } from '../atoms/BrickColorGlyph';

interface DraftBrickSlotProps {
  index: number;
  color: BrickColor;
  state: 'next' | 'queued' | 'placed' | 'pickable';
  onPick?: () => void;
}

export const DraftBrickSlot: React.FC<DraftBrickSlotProps> = ({
  index,
  color,
  state,
  onPick,
}) => {
  const meta = BRICK_COLORS[color];
  const isInteractive = state === 'pickable' && Boolean(onPick);

  const baseClass = [
    'flex items-center gap-2.5 px-3 py-2 rounded-md border text-left transition-all duration-150 min-w-[152px]',
    state === 'next'
      ? 'bg-[#283344] border-amber-400/80 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]'
      : state === 'pickable'
        ? 'bg-[#283344] border-sky-400 hover:bg-[#314056] hover:border-amber-300 cursor-pointer'
        : state === 'placed'
          ? 'bg-[#1A212C] border-[#2C3748] opacity-65'
          : 'bg-[#1D2531] border-[#2D394B]',
  ].join(' ');

  const content = (
    <>
      <BrickColorGlyph color={color} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
            {meta.elementName}
          </span>
          <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
            {state === 'next'
              ? 'Next'
              : state === 'pickable'
                ? 'Keep'
                : state === 'placed'
                  ? 'Placed'
                  : `#${index + 1}`}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {color === 'yellow' ? 'Speed & Chain' : color === 'red' ? 'DMG & Splash' : 'Slow & DoT'}
        </div>
      </div>
    </>
  );

  if (isInteractive) {
    return (
      <button type="button" onClick={onPick} className={baseClass}>
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
};
