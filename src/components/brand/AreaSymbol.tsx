import React from 'react';
import type { AreaId } from '../../lib/areas';

interface AreaSymbolProps {
  area: AreaId;
  /** Fill of the symbol. */
  color: string;
  /** Colour of cut-outs (pips, dots, card gaps); use the surface behind the symbol. */
  cut: string;
  size?: number;
}

/** Area symbols on a 64 grid, same shapes as design/brand/area-*.svg (DESIGN.md §8.2). */
export const AreaSymbol: React.FC<AreaSymbolProps> = ({ area, color, cut, size = 20 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
    {area === 'music' && (
      <>
        <circle cx="24" cy="44" r="10" fill={color} />
        <rect x="28" y="10" width="7" height="36" rx="3.5" fill={color} />
        <rect x="28" y="10" width="20" height="9" rx="4.5" fill={color} />
      </>
    )}
    {area === 'dice' && (
      <>
        <rect x="10" y="10" width="44" height="44" rx="11" fill={color} />
        {[22, 32, 42].map((p) => (
          <circle key={p} cx={p} cy={p} r="5" fill={cut} />
        ))}
      </>
    )}
    {area === 'cards' && (
      <>
        <rect
          x="10"
          y="12"
          width="28"
          height="40"
          rx="6"
          fill={color}
          stroke={cut}
          strokeWidth="4"
          transform="rotate(-12 24 32)"
        />
        <rect
          x="26"
          y="12"
          width="28"
          height="40"
          rx="6"
          fill={color}
          stroke={cut}
          strokeWidth="4"
          transform="rotate(10 40 32)"
        />
      </>
    )}
    {area === 'party' && (
      <>
        <rect x="8" y="10" width="48" height="34" rx="12" fill={color} />
        <path d="M16 40 L14 56 L32 42 Z" fill={color} />
        {[21, 32, 43].map((x) => (
          <circle key={x} cx={x} cy="27" r="4" fill={cut} />
        ))}
      </>
    )}
    {area === 'puzzle' &&
      [
        [9, 9],
        [35, 9],
        [9, 35],
        [35, 35],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="20"
          height="20"
          rx="5"
          fill={color}
          fillOpacity={i === 1 || i === 2 ? 0.45 : 1}
        />
      ))}
  </svg>
);
