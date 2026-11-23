import React, { useState } from 'react';
import { Box, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { darkTokens } from '../../../themeTokens';
import {
  getJudgementPalette,
  JUDGEMENT_PALETTES,
  judgementLabel,
  setJudgementPalette,
} from '../stage/logic/judgementStyle';

const SHOWN = ['perfect', 'good', 'miss'] as const;

/** Colour-blind palette for the judgements on the stage; the glyphs are always shown (#699). */
export const JudgementPaletteSetting: React.FC = () => {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.judgement_palette.${key}`);
  const [palette, setPalette] = useState(getJudgementPalette);
  const colors = JUDGEMENT_PALETTES[palette];

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {k('title')}
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={palette === 'colorblind'}
            onChange={(e) => {
              const next = e.target.checked ? 'colorblind' : 'standard';
              setJudgementPalette(next);
              setPalette(next);
            }}
          />
        }
        label={k('colorblind')}
      />
      <Typography variant="body2" color="text.secondary">
        {k('hint')}
      </Typography>
      {/* preview on the stage's background: the stage is always dark */}
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        flexWrap="wrap"
        sx={{ mt: 1, px: 1.5, py: 1, borderRadius: 1, bgcolor: darkTokens.bg.canvas }}
      >
        {SHOWN.map((kind) => (
          <Typography key={kind} fontWeight={800} sx={{ color: colors[kind] }}>
            {judgementLabel(kind, t(`games.melodiq_notes.stage.judgement.${kind}`))}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
};
