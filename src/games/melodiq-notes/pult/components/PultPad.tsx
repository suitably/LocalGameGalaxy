/**
 * On-screen instrument of a pult: an octave of keys, the strings or the drum pads [ID: GAME-MELODIQ-NOTES-PULT-PAD]
 */
import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { STRING_TUNINGS, type InstrumentKind } from '../../../../modules/music-score';
import { DRUM_LANE_META, type StageView } from '../../stage/logic/instruments';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B', 'C'];
const BLACK = new Set([1, 3, 6, 8, 10]);

interface PadProps {
  label: string;
  color?: string;
  dark?: boolean;
  onHit: () => void;
}

function Pad({ label, color, dark, onHit }: PadProps) {
  return (
    <ButtonBase
      onPointerDown={(e) => {
        e.preventDefault();
        onHit();
      }}
      sx={{
        minHeight: 72,
        borderRadius: 2,
        border: 2,
        borderColor: color ?? 'divider',
        bgcolor: dark ? 'text.primary' : 'background.paper',
        color: dark ? 'background.paper' : 'text.primary',
        fontWeight: 700,
        touchAction: 'none',
        userSelect: 'none',
        '&:active': { opacity: 0.6 },
      }}
    >
      {label}
    </ButtonBase>
  );
}

interface PultPadProps {
  view: StageView;
  inst: InstrumentKind;
  octaveBase: number;
  onLane: (lane: number) => void;
}

export const PultPad: React.FC<PultPadProps> = ({ view, inst, octaveBase, onLane }) => {
  const { t } = useTranslation();
  if (view === 'pitch')
    return (
      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
        {t('games.melodiq_notes.pult.sing_hint')}
      </Typography>
    );
  let pads: PadProps[];
  if (view === 'keys')
    pads = NOTE_NAMES.map((label, i) => ({
      label,
      dark: BLACK.has(i),
      onHit: () => onLane(octaveBase + i),
    }));
  else if (view === 'strings')
    pads = (STRING_TUNINGS[inst]?.strings ?? []).map((label, i) => ({
      label,
      onHit: () => onLane(i),
    }));
  else
    pads = DRUM_LANE_META.map((d, i) => ({
      label: t(`games.melodiq_notes.stage.drums.${d.id}`),
      color: d.color,
      onHit: () => onLane(i),
    }));
  const cols = view === 'keys' ? 'repeat(auto-fill, minmax(56px, 1fr))' : 'repeat(2, 1fr)';
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: cols, gap: 1 }}>
      {pads.map((p, i) => (
        <Pad key={i} {...p} />
      ))}
    </Box>
  );
};
