import React from 'react';
import { SynergyInfo } from '../../domain/types';
import { BrickColorGlyph } from '../atoms/BrickColorGlyph';

interface SynergyLinkRowProps {
  synergy: SynergyInfo;
  active?: boolean;
}

export const SynergyLinkRow: React.FC<SynergyLinkRowProps> = ({ synergy, active = false }) => {
  return (
    <div className="flex items-start gap-2.5 py-1.5 border-b border-[#293446] last:border-b-0">
      <div className="flex items-center gap-1 pt-0.5 shrink-0">
        <BrickColorGlyph color={synergy.colors[0]} size="sm" />
        <span className="text-[10px] text-slate-500 font-mono">+</span>
        <BrickColorGlyph color={synergy.colors[1]} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-semibold ${active ? 'text-amber-300' : 'text-slate-200'}`}>
          {synergy.name}
        </div>
        <div className="text-[11px] text-slate-400 leading-snug">{synergy.shortEffect}</div>
      </div>
    </div>
  );
};
