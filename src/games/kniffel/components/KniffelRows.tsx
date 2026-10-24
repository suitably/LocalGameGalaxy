import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { KniffelCategory, KniffelPlayer } from '../logic/types';
import type { KniffelRowDef } from '../logic/kniffelRows';
import { Die3D } from '../../../components/games/Die3D';
import { pieceTint } from '../../../lib/pieceTint';
import { gridLine, potentialFill, scoreNumberSx } from './kniffelBoardStyles';

const rowSx = { display: 'flex', alignItems: 'center', borderBottom: gridLine } as const;

export const KniffelSectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <Box sx={{ px: 1, py: 0.5, bgcolor: 'action.hover' }}>
    <Typography
      variant="caption"
      sx={{ letterSpacing: 2, textTransform: 'uppercase', color: 'text.secondary' }}
    >
      {label}
    </Typography>
  </Box>
);

interface LabelCellProps {
  label: string;
  hint: string;
  dieFace?: number;
}

const KniffelLabelCell: React.FC<LabelCellProps> = ({ label, hint, dieFace }) => (
  <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
    {dieFace && (
      <Die3D value={dieFace} sx={{ width: 24, height: 24, fontSize: '1rem', minWidth: 24 }} />
    )}
    <Box>
      <Typography variant="body2" fontWeight="bold">
        {label}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: 'none', sm: 'block' } }}
      >
        {hint}
      </Typography>
    </Box>
  </Box>
);

interface ScoreCellProps {
  playerIdx: number;
  /** Rendered text, or null for an empty cell. */
  value: string | null;
  clickable: boolean;
  highlight: boolean;
  onClick: () => void;
}

export const KniffelScoreCell: React.FC<ScoreCellProps> = ({
  playerIdx,
  value,
  clickable,
  highlight,
  onClick,
}) => {
  const scored = value !== null;
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        minWidth: 50,
        p: 1,
        textAlign: 'center',
        borderLeft: gridLine,
        cursor: clickable ? 'pointer' : 'default',
        fontWeight: scored ? 'bold' : 'normal',
        color: highlight ? 'warning.main' : scored ? 'text.primary' : 'text.disabled',
        bgcolor: (theme) =>
          highlight ? potentialFill(theme) : scored ? pieceTint(theme, playerIdx) : 'transparent',
        '&:hover': clickable ? { bgcolor: 'action.hover' } : {},
        ...scoreNumberSx,
      }}
    >
      {value ?? '–'}
    </Box>
  );
};

interface RowProps {
  def: KniffelRowDef;
  players: KniffelPlayer[];
  renderCell: (cat: KniffelCategory, idx: number) => React.ReactNode;
}

export const KniffelRow: React.FC<RowProps> = ({ def, players, renderCell }) => {
  const { t } = useTranslation();
  return (
    <Box sx={rowSx}>
      <KniffelLabelCell
        label={t(`games.kniffel.cat.${def.category}`, def.label)}
        hint={t(`games.kniffel.hint.${def.category}`, def.hint)}
        dieFace={def.dieFace}
      />
      {players.map((p, idx) => (
        <React.Fragment key={p.id}>{renderCell(def.category, idx)}</React.Fragment>
      ))}
    </Box>
  );
};

export const KniffelSumRow: React.FC<{ label: string; values: (number | string)[] }> = ({
  label,
  values,
}) => (
  <Box sx={{ ...rowSx, bgcolor: 'action.hover' }}>
    <Box sx={{ flex: 2, p: 1 }}>
      <Typography variant="body2" fontWeight="bold">
        {label}
      </Typography>
    </Box>
    {values.map((val, idx) => (
      <Box
        key={idx}
        sx={{
          flex: 1,
          minWidth: 50,
          textAlign: 'center',
          p: 1,
          borderLeft: gridLine,
          fontWeight: 'bold',
          ...scoreNumberSx,
        }}
      >
        {val}
      </Box>
    ))}
  </Box>
);

interface BonusRowProps {
  players: KniffelPlayer[];
  canScore: (playerIdx: number) => boolean;
  onClick: (playerIdx: number) => void;
}

/** Extra-Kniffel bonus: custom row because it can be scored several times. */
export const KniffelBonusRow: React.FC<BonusRowProps> = ({ players, canScore, onClick }) => {
  const { t } = useTranslation();
  return (
    <Box sx={rowSx}>
      <KniffelLabelCell
        label={t('games.kniffel.cat.kniffel_bonus', 'Kniffel-Bonus')}
        hint={t('games.kniffel.hint.kniffel_bonus', 'Jeder weitere · 50')}
      />
      {players.map((p, idx) => {
        const count = p.scores.kniffel_bonus;
        const can = canScore(idx);
        return (
          <KniffelScoreCell
            key={p.id}
            playerIdx={idx}
            value={count ? `${count}x (50)` : null}
            clickable={can}
            highlight={can}
            onClick={() => onClick(idx)}
          />
        );
      })}
    </Box>
  );
};
