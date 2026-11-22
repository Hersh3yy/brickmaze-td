import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SpeedAudioControlGroupProps {
  speed: 1 | 2 | 3;
  muted: boolean;
  onChangeSpeed: (s: 1 | 2 | 3) => void;
  onToggleMute: () => void;
}

export const SpeedAudioControlGroup: React.FC<SpeedAudioControlGroupProps> = ({
  speed,
  muted,
  onChangeSpeed,
  onToggleMute,
}) => {
  const speeds: (1 | 2 | 3)[] = [1, 2, 3];

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        role="group"
        aria-label="Simulation speed"
        className="inline-flex items-center bg-[#151B23] border border-[#2F3D51] rounded-md p-0.5"
      >
        {speeds.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChangeSpeed(s)}
            className={[
              'px-2 py-1 text-xs font-mono font-semibold rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer',
              speed === s
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100',
            ].join(' ')}
          >
            {s}x
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
        title={muted ? 'Unmute audio' : 'Mute audio'}
        className="p-2 rounded-md bg-[#1D2531] border border-[#2F3D51] text-slate-300 hover:text-white hover:bg-[#273244] transition-colors cursor-pointer shrink-0"
      >
        {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
};
