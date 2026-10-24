import React, { useState } from 'react';
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { processOhHellRound } from '../logic/ohHellEngine';
import {
  createCardPlayers,
  formatSignedPoints,
  sumCountInputs,
  toCountMap,
} from '../logic/cardPlayers';
import type { CardPlayer } from '../logic/types';
import { CardGameHeader } from './common/CardGameHeader';
import { CardGameScoreSummary } from './common/CardGameScoreSummary';
import { CardPlayerScoreRow } from './common/CardPlayerScoreRow';
import { CardRoundTable, CardScoreHistoryDialog } from './common/CardScoreHistoryDialog';

interface OhHellGameViewProps {
  initialPlayers: string[];
  roundsSequence?: number[];
  onExit: () => void;
}

export const OhHellGameView: React.FC<OhHellGameViewProps> = ({
  initialPlayers,
  roundsSequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  onExit,
}) => {
  const { t } = useTranslation();

  const [players, setPlayers] = useState<CardPlayer[]>(() => createCardPlayers(initialPlayers));
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<'bidding' | 'tricks'>('bidding');
  const [currentBids, setCurrentBids] = useState<Record<string, string>>({});
  const [currentTricks, setCurrentTricks] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const cardsThisRound = roundsSequence[roundIdx] || 1;
  const isLastRound = roundIdx >= roundsSequence.length - 1;
  const totalBidsEntered = sumCountInputs(currentBids);
  const cardsLabel = t('games.cards.cards_count', 'Karten');

  const handleCompleteRound = () => {
    const result = processOhHellRound(players, {
      bids: toCountMap(players, currentBids),
      tricks: toCountMap(players, currentTricks),
      cardsCount: cardsThisRound,
    });

    setPlayers(result.updatedPlayers);
    setCurrentBids({});
    setCurrentTricks({});
    setPhase('bidding');
    if (!isLastRound) setRoundIdx((r) => r + 1);
  };

  const handleRestart = () => {
    setPlayers(createCardPlayers(initialPlayers));
    setRoundIdx(0);
    setPhase('bidding');
    setCurrentBids({});
    setCurrentTricks({});
  };

  const countInput = (
    label: string,
    value: string | undefined,
    onChange: (val: string) => void,
  ) => (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: 120 }}
      inputProps={{ min: '0', max: String(cardsThisRound) }}
    />
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 750, mx: 'auto', py: { xs: 1, sm: 2 } }}>
      <CardGameHeader
        roundLabel={`${t('games.cards.round', 'Runde')} ${roundIdx + 1}/${roundsSequence.length} (${cardsThisRound} ${cardsLabel})`}
        onExit={onExit}
        onRestart={handleRestart}
        onHistory={() => setHistoryOpen(true)}
      />

      <CardGameScoreSummary players={players} />

      {/* Phase indicator and total-bids hint */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.light' }}>
            {phase === 'bidding'
              ? `1. ${t('games.cards.phase_bidding', 'Stichansage (Vorhersage)')}`
              : `2. ${t('games.cards.phase_tricks', 'Ergebnis (Gemachte Stiche)')}`}
          </Typography>

          <Chip
            label={`${t('games.cards.total_bids', 'Gesamtansage')}: ${totalBidsEntered} / ${cardsThisRound} ${cardsLabel}`}
            size="small"
            color={totalBidsEntered === cardsThisRound ? 'warning' : 'info'}
            variant="outlined"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          />
        </Box>
      </Paper>

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {players.map((p) => (
          <CardPlayerScoreRow key={p.id}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {p.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('games.cards.current_score', 'Punktestand')}: <strong>{p.score}P</strong>
              </Typography>
            </Box>

            {phase === 'bidding' ? (
              countInput(t('games.cards.bid_label', 'Ansage'), currentBids[p.id], (val) =>
                setCurrentBids((prev) => ({ ...prev, [p.id]: val })),
              )
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={`${t('games.cards.bid_label', 'Ansage')}: ${currentBids[p.id] || 0}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                {countInput(t('games.cards.tricks_label', 'Stiche'), currentTricks[p.id], (val) =>
                  setCurrentTricks((prev) => ({ ...prev, [p.id]: val })),
                )}
              </Box>
            )}
          </CardPlayerScoreRow>
        ))}
      </Stack>

      {phase === 'bidding' ? (
        <Button
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          onClick={() => setPhase('tricks')}
          sx={{ py: 1.5 }}
        >
          {t('games.cards.continue_to_tricks', 'Ansagen fixieren & Runde spielen')}
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={handleCompleteRound}
          sx={{ py: 1.5 }}
        >
          {t('games.cards.complete_round', 'Runde auswerten')}
        </Button>
      )}

      <CardScoreHistoryDialog
        open={historyOpen}
        title={t('games.cards.score_table', 'Punktetabelle')}
        maxWidth="md"
        onClose={() => setHistoryOpen(false)}
      >
        <CardRoundTable
          players={players}
          roundCount={roundIdx + 1}
          leadingHeaders={[cardsLabel]}
          leadingCells={(rNum) => [roundsSequence[rNum]]}
          renderScore={(p, rNum) => {
            const bid = p.bids[rNum];
            const trick = p.tricksWon[rNum];
            if (bid === undefined || trick === undefined) return '-';
            return `${bid}/${trick} (${formatSignedPoints(p.roundScores[rNum])}P)`;
          }}
        />
      </CardScoreHistoryDialog>
    </Box>
  );
};
