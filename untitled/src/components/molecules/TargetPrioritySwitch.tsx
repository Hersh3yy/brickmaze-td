import React from 'react';
import { TargetingMode } from '../../domain/types';

interface TargetPrioritySwitchProps {
  value: TargetingMode;
  onChange: (mode: TargetingMode) => void;
}

const MODES: { id: TargetingMode; label: string }[] = [
  { id: 'first', label: 'First' },
  { id: 'strongest', label: 'Strongest' },
  { id: 'closest', label: 'Closest' },
];

export const TargetPrioritySwitch: React.FC<TargetPrioritySwitchProps> = ({
  value,
  onChange,
}) => {
  return (
    <div
      role="group"
      aria-label="Tower targeting priority"
      className="grid grid-cols-3 gap-1 p-1 bg-[#141921] border border-[#2C384B] rounded-md"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={[
            'px-2 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap cursor-pointer',
            value === m.id
              ? 'bg-[#2E3C52] text-amber-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};
