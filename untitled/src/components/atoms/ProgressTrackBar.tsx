import React from 'react';

interface ProgressTrackBarProps {
  value: number;
  max: number;
  fillClass?: string;
  heightClass?: string;
  ariaLabel: string;
}

export const ProgressTrackBar: React.FC<ProgressTrackBarProps> = ({
  value,
  max,
  fillClass = 'bg-amber-400',
  heightClass = 'h-2',
  ariaLabel,
}) => {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      className={`w-full overflow-hidden rounded-sm bg-[#12171E] border border-[#2D3A4D] ${heightClass}`}
    >
      <div
        className={`h-full transition-all duration-200 ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
