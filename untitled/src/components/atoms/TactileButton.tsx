import React from 'react';

export type TactileButtonVariant = 'primary' | 'amber' | 'secondary' | 'ghost' | 'danger';
export type TactileButtonSize = 'sm' | 'md' | 'lg';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TactileButtonVariant;
  size?: TactileButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<TactileButtonVariant, string> = {
  primary:
    'bg-emerald-600 text-white border-emerald-400/30 hover:bg-emerald-500 active:translate-y-px shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]',
  amber:
    'bg-amber-500 text-slate-950 font-semibold border-amber-300/40 hover:bg-amber-400 active:translate-y-px shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]',
  secondary:
    'bg-[#2A3545] text-slate-100 border-[#3D4E66] hover:bg-[#334155] active:translate-y-px shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)]',
  ghost:
    'bg-transparent text-slate-300 border-transparent hover:bg-white/5 hover:text-white',
  danger:
    'bg-red-600/90 text-white border-red-400/30 hover:bg-red-500 active:translate-y-px shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]',
};

const SIZE_CLASSES: Record<TactileButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm font-semibold',
};

export const TactileButton: React.FC<TactileButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...rest
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161B22]',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-y-0',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
};
