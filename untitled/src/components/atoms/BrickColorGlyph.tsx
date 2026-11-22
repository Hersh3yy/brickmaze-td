import React from 'react';
import { BRICK_COLORS } from '../../domain/constants';
import { BrickColor } from '../../domain/types';

interface BrickColorGlyphProps {
  color: BrickColor;
  secondaryColor?: BrickColor;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE_MAP = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

export const BrickColorGlyph: React.FC<BrickColorGlyphProps> = ({
  color,
  secondaryColor,
  size = 'md',
  showLabel = false,
}) => {
  const primary = BRICK_COLORS[color];
  const secondary = secondaryColor ? BRICK_COLORS[secondaryColor] : null;
  const isDouble = Boolean(secondaryColor && secondaryColor === color);

  const backgroundStyle =
    secondary && !isDouble
      ? `linear-gradient(135deg, ${primary.hex} 50%, ${secondary.hex} 50%)`
      : primary.hex;

  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      <span
        aria-hidden="true"
        style={{
          background: backgroundStyle,
          borderColor: isDouble ? '#FDE047' : primary.darkHex,
          boxShadow: isDouble
            ? `inset 0 0 0 1px #FEF08A, 0 0 0 1px ${primary.darkHex}`
            : `inset 2px 2px 0 ${primary.lightHex}55, inset -2px -2px 0 rgba(0,0,0,0.35)`,
        }}
        className={[
          'inline-flex items-center justify-center rounded-[3px] border font-mono font-bold text-white select-none shrink-0',
          SIZE_MAP[size],
        ].join(' ')}
      >
        <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
          {isDouble ? '×2' : secondary ? '★' : primary.glyph}
        </span>
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
          {isDouble
            ? `Double ${primary.elementName} (×2)`
            : secondary
              ? `${primary.elementName} + ${secondary.elementName}`
              : primary.elementName}
        </span>
      )}
    </span>
  );
};
