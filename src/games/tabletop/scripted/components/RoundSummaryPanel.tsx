/**
 * Result of a round: who won, the hands and the scores [ID: COMP-TABLETOP-SCRIPT-SUMMARY]
 */
import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import type { RoundSummary } from '../logic/scriptTypes';
import type { ScriptTextFn } from '../hooks/useScriptText';
import { PlayingCard } from './PlayingCard';

interface RoundSummaryPanelProps {
  summary: RoundSummary;
  names: string[];
  text: ScriptTextFn;
  large?: boolean;
}

export const RoundSummaryPanel: React.FC<RoundSummaryPanelProps> = ({
  summary,
  names,
  text,
  large,
}) => (
  <Paper
    elevation={4}
    sx={{ p: large ? 3 : 2, borderRadius: 3, width: '100%', maxWidth: large ? 640 : 420 }}
  >
    <Typography variant={large ? 'h4' : 'h6'} fontWeight={800} textAlign="center">
      {text(summary.title)}
    </Typography>
    {summary.lines.map((line, i) => (
      <Typography key={i} textAlign="center" color="text.secondary">
        {text(line)}
      </Typography>
    ))}
    <Stack gap={0.75} mt={1.5}>
      {summary.rows.map((row) => (
        <Stack
          key={row.seat}
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 2,
            bgcolor:
              row.tone === 'bad'
                ? 'error.light'
                : row.tone === 'good'
                  ? 'success.light'
                  : 'action.hover',
            color: row.tone ? 'common.black' : 'text.primary',
          }}
        >
          <Typography fontWeight={800} noWrap sx={{ flex: 1, minWidth: 0 }}>
            {names[row.seat]}
          </Typography>
          {row.cards && (
            <Stack direction="row" gap={0.25}>
              {row.cards.map((card) => (
                <PlayingCard key={card} card={card} width={large ? 40 : 28} />
              ))}
            </Stack>
          )}
          {row.note && (
            <Typography variant="caption" fontWeight={700}>
              {text(row.note)}
            </Typography>
          )}
          <Box sx={{ minWidth: 36, textAlign: 'right', fontWeight: 800 }}>{text(row.value)}</Box>
        </Stack>
      ))}
    </Stack>
  </Paper>
);
