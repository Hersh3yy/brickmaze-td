import React from 'react';

interface TabularMetricValueProps {
  label: string;
  value: string | number;
  subtext?: string;
  accentClass?: string;
}

export const TabularMetricValue: React.FC<TabularMetricValueProps> = ({
  label,
  value,
  subtext,
  accentClass = 'text-slate-100',
}) => {
  return (
    <div className="flex flex-col leading-tight shrink-0">
      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-sm font-bold tabular-nums whitespace-nowrap ${accentClass}`}>
          {value}
        </span>
        {subtext && (
          <span className="font-mono text-[11px] tabular-nums text-slate-400 whitespace-nowrap">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
