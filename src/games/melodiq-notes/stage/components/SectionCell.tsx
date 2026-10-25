import type { ReactNode } from 'react';
import { Box, ButtonBase } from '@mui/material';

const scoreColor = (v: number) =>
  v >= 0.85 ? 'success.main' : v >= 0.55 ? 'warning.main' : 'error.main';

interface SectionCellProps {
  label: ReactNode;
  ariaLabel: string;
  /** How sure the player was (0..1); null draws no rating (no notes played yet, or no notes at all). */
  score: number | null;
  /** Section without notes: drawn faint. */
  empty?: boolean;
  active?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** One cell of the section strip. */
export function SectionCell({
  label,
  ariaLabel,
  score,
  empty,
  active,
  expanded,
  disabled,
  onClick,
}: SectionCellProps) {
  return (
    <ButtonBase
      aria-label={ariaLabel}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      sx={{
        position: 'relative',
        height: 28,
        borderRadius: 2,
        border: 1,
        overflow: 'hidden',
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: active ? 'text.primary' : 'text.secondary',
        opacity: empty ? 0.45 : 1,
      }}
    >
      {score !== null && (
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.3, bgcolor: scoreColor(score) }} />
      )}
      <span style={{ position: 'relative' }}>{label}</span>
    </ButtonBase>
  );
}

/** Thin playhead line over a strip row; `progress` is 0..1 or null to hide it. */
export function Playhead({ progress }: { progress: number | null }) {
  if (progress === null) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        top: -3,
        bottom: -3,
        width: 2,
        borderRadius: 2,
        bgcolor: 'text.primary',
        left: `calc(${progress * 100}% - 1px)`,
        pointerEvents: 'none',
      }}
    />
  );
}
