import React from 'react';
import { TOWER_DEFS } from '../../domain/constants';
import { TowerType } from '../../domain/types';

interface TurretShopCardProps {
  type: TowerType;
  gold: number;
  selected: boolean;
  disabled: boolean;
  onSelect: (type: TowerType) => void;
}

const WeaponPixelIcon: React.FC<{ type: TowerType }> = ({ type }) => {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 16 16"
      className="shrink-0"
      style={{ shapeRendering: 'crispEdges' }}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" fill="#0F172A" />
      <rect x="3" y="3" width="10" height="10" fill="#334155" />
      {type === 'repeater' && (
        <>
          <rect x="4" y="4" width="6" height="8" fill="#64748B" />
          <rect x="5" y="5" width="4" height="6" fill="#CBD5E1" />
          <rect x="10" y="4" width="5" height="2" fill="#E2E8F0" />
          <rect x="10" y="10" width="5" height="2" fill="#E2E8F0" />
        </>
      )}
      {type === 'cannon' && (
        <>
          <rect x="3" y="4" width="7" height="8" fill="#64748B" />
          <rect x="4" y="5" width="5" height="6" fill="#94A3B8" />
          <rect x="9" y="5" width="6" height="6" fill="#1E293B" />
          <rect x="10" y="6" width="4" height="2" fill="#E2E8F0" />
        </>
      )}
      {type === 'pulse' && (
        <>
          <rect x="4" y="4" width="8" height="8" fill="#64748B" />
          <rect x="5" y="5" width="6" height="6" fill="#0F172A" />
          <rect x="6" y="6" width="4" height="4" fill="#FDE047" />
          <rect x="7" y="2" width="2" height="2" fill="#CBD5E1" />
          <rect x="7" y="12" width="2" height="2" fill="#CBD5E1" />
          <rect x="2" y="7" width="2" height="2" fill="#CBD5E1" />
          <rect x="12" y="7" width="2" height="2" fill="#CBD5E1" />
        </>
      )}
      {type === 'sniper' && (
        <>
          <rect x="3" y="5" width="6" height="6" fill="#64748B" />
          <rect x="4" y="6" width="4" height="4" fill="#CBD5E1" />
          <rect x="9" y="6" width="7" height="4" fill="#94A3B8" />
          <rect x="10" y="7" width="6" height="2" fill="#F8FAFC" />
        </>
      )}
    </svg>
  );
};

export const TurretShopCard: React.FC<TurretShopCardProps> = ({
  type,
  gold,
  selected,
  disabled,
  onSelect,
}) => {
  const def = TOWER_DEFS[type];
  const canAfford = gold >= def.cost;
  const isLocked = disabled || !canAfford;

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onSelect(type)}
      title={def.description}
      className={[
        'flex items-center gap-3 px-3.5 py-2 rounded-md border text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
        selected
          ? 'bg-[#2C3A4E] border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'
          : isLocked
            ? 'bg-[#19202B] border-[#283344] opacity-50 cursor-not-allowed'
            : 'bg-[#202937] border-[#324054] hover:bg-[#273244] hover:border-[#495D7A] cursor-pointer',
      ].join(' ')}
    >
      <WeaponPixelIcon type={type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-100 truncate">{def.name}</span>
          <span
            className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
              canAfford ? 'text-amber-300' : 'text-rose-400'
            }`}
          >
            {def.cost}g
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[11px] text-slate-400 truncate">{def.shortRole}</span>
          <span className="font-mono text-[10px] text-slate-500">[{def.hotkey}]</span>
        </div>
      </div>
    </button>
  );
};
