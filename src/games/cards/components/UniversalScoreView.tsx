import React, { useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useTranslation } from 'react-i18next';
import { createCardPlayers, formatSignedPoints } from '../logic/cardPlayers';
import type { CardGameDefinition, CardPlayer } from '../logic/types';
import { ModernScoreAdjuster } from './ModernScoreAdjuster';
import { CardGameHeader } from './common/CardGameHeader';
import { CardGameScoreSummary } from './common/CardGameScoreSummary';
import { CardRoundTable, CardScoreHistoryDialog } from './common/CardScoreHistoryDialog';

interface UniversalScoreViewProps {
  game: CardGameDefinition;
  initialPlayers: string[];
  onExit: () => void;
}

export const UniversalScoreView: React.FC<UniversalScoreViewProps> = ({
  initialPlayers,
  onExit,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [players, setPlayers] = useState<CardPlayer[]>(() => createCardPlayers(initialPlayers));
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentDeltas, setCurrentDeltas] = useState<Record<string, number>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [roundSnapshots, setRoundSnapshots] = useState<CardPlayer[][]>([]);

  const handleDeltaChange = (playerId: string, val: number) => {
    setCurrentDeltas((prev) => ({ ...prev, [playerId]: val }));
  };

  const handleApplyRoundScores = () => {
    // Save snapshot for undo
    setRoundSnapshots((prev) => [...prev, players]);

    setPlayers((prev) =>
      prev.map((p) => {
        const delta = currentDeltas[p.id] || 0;
        return { ...p, score: p.score + delta, roundScores: [...p.roundScores, delta] };
      }),
    );
    setCurrentDeltas({});
    setRoundNumber((r) => r + 1);
  };

  const handleUndo = () => {
    if (roundSnapshots.length === 0) return;
    setPlayers(roundSnapshots[roundSnapshots.length - 1]);
    setRoundSnapshots((prev) => prev.slice(0, -1));
    setRoundNumber((r) => Math.max(1, r - 1));
    setCurrentDeltas({});
  };

  const handleRestart = () => {
    setPlayers(createCardPlayers(initialPlayers));
    setRoundNumber(1);
    setCurrentDeltas({});
    setRoundSnapshots([]);
  };

  const totalDeltasNonZero = Object.values(currentDeltas).some((d) => d !== 0);
  const roundLabel = `${t('games.cards.round', 'Runde')} ${roundNumber}`;

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', py: { xs: 1, sm: 2 } }}>
      <CardGameHeader
        roundLabel={roundLabel}
        onExit={onExit}
        onRestart={handleRestart}
        onUndo={roundSnapshots.length > 0 ? handleUndo : undefined}
        onHistory={roundNumber > 1 ? () => setHistoryOpen(true) : undefined}
      />

      <CardGameScoreSummary players={players} />

      <Stack spacing={2} sx={{ mb: 3 }}>
        {players.map((p) => (
          <ModernScoreAdjuster
            key={p.id}
            playerName={p.name}
            currentTotal={p.score}
            delta={currentDeltas[p.id] || 0}
            onChange={(val) => handleDeltaChange(p.id, val)}
            accentColor={theme.palette.piece.orange}
          />
        ))}
      </Stack>

      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        startIcon={<CheckCircleRoundedIcon />}
        onClick={handleApplyRoundScores}
        disabled={!totalDeltasNonZero && roundNumber > 1}
        sx={{ py: 1.5, fontSize: '1.05rem' }}
      >
        {t('games.cards.complete_round', 'Runde auswerten')} ({roundLabel})
      </Button>

      <CardScoreHistoryDialog
        open={historyOpen}
        title={t('games.cards.round_history', 'Rundenhistorie')}
        onClose={() => setHistoryOpen(false)}
      >
        <CardRoundTable
          players={players}
          roundCount={roundNumber - 1}
          renderScore={(p, rIdx) => {
            const scoreVal = p.roundScores[rIdx];
            return scoreVal !== undefined ? `${formatSignedPoints(scoreVal)}P` : '-';
          }}
        />
      </CardScoreHistoryDialog>
    </Box>
  );
};
