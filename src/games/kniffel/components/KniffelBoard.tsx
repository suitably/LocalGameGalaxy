import React, { useState } from 'react';
import { Box, Typography, Paper, Button, Modal } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { KniffelPlayer, KniffelCategory, KniffelScores } from '../logic/types';
import { getUpperSectionSum, getUpperSectionBonus, getLowerSectionSum, getTotalScore } from '../logic/kniffelScoring';
import { Die3D } from '../../../components/games/Die3D';

interface KniffelBoardProps {
  players: KniffelPlayer[];
  activePlayerIndex: number;
  possibleScores: Record<KniffelCategory, number>;
  rollCount: number;
  onScoreCategory: (category: KniffelCategory, score: number) => void;
  disabled?: boolean;
}

export const KniffelBoard: React.FC<KniffelBoardProps> = ({
  players,
  activePlayerIndex,
  possibleScores,
  rollCount,
  onScoreCategory,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [selectedCell, setSelectedCell] = useState<{ category: KniffelCategory; playerIdx: number } | null>(null);

  const handleCellClick = (category: KniffelCategory, playerIdx: number) => {
    if (disabled || playerIdx !== activePlayerIndex || rollCount === 0) return;
    const player = players[playerIdx];
    if (player.scores[category] !== null && category !== 'kniffel_bonus') return; // Already scored, unless it's bonus

    // For Kniffel bonus, we only allow scoring if they already have a Kniffel, and they rolled another one (possibleScores.kniffel_bonus > 0)
    if (category === 'kniffel_bonus') {
       if (player.scores.kniffel === null || player.scores.kniffel === 0) return;
       if (possibleScores.kniffel_bonus === 0) return;
    }

    setSelectedCell({ category, playerIdx });
  };

  const handleScoreConfirm = (score: number) => {
    if (selectedCell) {
      onScoreCategory(selectedCell.category, score);
    }
    setSelectedCell(null);
  };

  const renderCell = (category: KniffelCategory, playerIdx: number) => {
    const player = players[playerIdx];
    const score = player.scores[category];
    const isActive = playerIdx === activePlayerIndex;
    const isScored = score !== null;
    let displayValue = isScored ? String(score) : '–';

    if (category === 'kniffel_bonus' && score !== null) {
      displayValue = String(score * 50);
    }

    const isClickable = !disabled && isActive && !isScored && rollCount > 0;

    // Highlight possible score if clickable
    const highlightPotential = isClickable && possibleScores[category] > 0;

    return (
      <Box
        onClick={() => handleCellClick(category, playerIdx)}
        sx={{
          flex: 1,
          textAlign: 'center',
          p: 1,
          bgcolor: isScored ? 'rgba(255,255,255,0.1)' : highlightPotential ? 'rgba(255,213,79,0.2)' : 'transparent',
          color: isScored ? 'text.primary' : highlightPotential ? 'warning.main' : 'text.disabled',
          cursor: isClickable ? 'pointer' : 'default',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          fontWeight: isScored ? 'bold' : 'normal',
          '&:hover': isClickable ? { bgcolor: 'rgba(255,255,255,0.2)' } : {},
          minWidth: 50
        }}
      >
        {displayValue}
      </Box>
    );
  };

  const Row = ({ label, hint, category, dieFace }: { label: string; hint: string; category: KniffelCategory; dieFace?: number }) => (
    <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', alignItems: 'center' }}>
      <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
        {dieFace && <Die3D value={dieFace} sx={{ width: 24, height: 24, fontSize: '1rem', minWidth: 24 }} />}
        <Box>
          <Typography variant="body2" fontWeight="bold">{label}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{hint}</Typography>
        </Box>
      </Box>
      {players.map((_, idx) => (
        <React.Fragment key={idx}>{renderCell(category, idx)}</React.Fragment>
      ))}
    </Box>
  );

  const SumRow = ({ label, values }: { label: string, values: (number | string)[] }) => (
    <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.2)' }}>
      <Box sx={{ flex: 2, p: 1 }}>
        <Typography variant="body2" fontWeight="bold">{label}</Typography>
      </Box>
      {values.map((val, idx) => (
        <Box key={idx} sx={{ flex: 1, textAlign: 'center', p: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
          {val}
        </Box>
      ))}
    </Box>
  );

  return (
    <Paper sx={{ bgcolor: '#0E211B', color: '#F2EDE1', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.2)', bgcolor: '#16342B' }}>
        <Box sx={{ flex: 2, p: 1 }} />
        {players.map((p, idx) => (
          <Box key={p.id} sx={{ flex: 1, textAlign: 'center', p: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', color: idx === activePlayerIndex ? '#E3B268' : 'inherit' }}>
            <Typography variant="subtitle2" fontWeight="bold">{p.name}</Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{getTotalScore(p.scores)}</Typography>
          </Box>
        ))}
      </Box>

      {/* Upper Section */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', px: 1, py: 0.5 }}>
        <Typography variant="caption" sx={{ letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(242,237,225,0.5)' }}>
          {t('games.kniffel.upper_section', 'Oberer Teil')}
        </Typography>
      </Box>
      <Row label={t('games.kniffel.cat.ones', 'Einser')} hint={t('games.kniffel.hint.ones', 'Summe aller Einsen')} category="ones" dieFace={1} />
      <Row label={t('games.kniffel.cat.twos', 'Zweier')} hint={t('games.kniffel.hint.twos', 'Summe aller Zweien')} category="twos" dieFace={2} />
      <Row label={t('games.kniffel.cat.threes', 'Dreier')} hint={t('games.kniffel.hint.threes', 'Summe aller Dreien')} category="threes" dieFace={3} />
      <Row label={t('games.kniffel.cat.fours', 'Vierer')} hint={t('games.kniffel.hint.fours', 'Summe aller Vieren')} category="fours" dieFace={4} />
      <Row label={t('games.kniffel.cat.fives', 'Fünfer')} hint={t('games.kniffel.hint.fives', 'Summe aller Fünfen')} category="fives" dieFace={5} />
      <Row label={t('games.kniffel.cat.sixes', 'Sechser')} hint={t('games.kniffel.hint.sixes', 'Summe aller Sechsen')} category="sixes" dieFace={6} />

      <SumRow label={t('games.kniffel.subtotal', 'Zwischensumme')} values={players.map(p => getUpperSectionSum(p.scores))} />
      <SumRow label={t('games.kniffel.bonus', 'Bonus ab 63')} values={players.map(p => getUpperSectionBonus(p.scores) ? '+35' : '0')} />
      <SumRow label={t('games.kniffel.upper_total', 'Summe oben')} values={players.map(p => getUpperSectionSum(p.scores) + getUpperSectionBonus(p.scores))} />

      {/* Lower Section */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', px: 1, py: 0.5 }}>
        <Typography variant="caption" sx={{ letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(242,237,225,0.5)' }}>
          {t('games.kniffel.lower_section', 'Unterer Teil')}
        </Typography>
      </Box>
      <Row label={t('games.kniffel.cat.three_of_a_kind', 'Dreierpasch')} hint={t('games.kniffel.hint.three_of_a_kind', 'Alle Augen zählen')} category="three_of_a_kind" />
      <Row label={t('games.kniffel.cat.four_of_a_kind', 'Viererpasch')} hint={t('games.kniffel.hint.four_of_a_kind', 'Alle Augen zählen')} category="four_of_a_kind" />
      <Row label={t('games.kniffel.cat.full_house', 'Full House')} hint={t('games.kniffel.hint.full_house', '3 + 2 gleiche · 25')} category="full_house" />
      <Row label={t('games.kniffel.cat.small_straight', 'Kleine Straße')} hint={t('games.kniffel.hint.small_straight', '4 in Folge · 30')} category="small_straight" />
      <Row label={t('games.kniffel.cat.large_straight', 'Große Straße')} hint={t('games.kniffel.hint.large_straight', '5 in Folge · 40')} category="large_straight" />
      <Row label={t('games.kniffel.cat.kniffel', 'Kniffel')} hint={t('games.kniffel.hint.kniffel', '5 gleiche · 50')} category="kniffel" />
      <Row label={t('games.kniffel.cat.chance', 'Chance')} hint={t('games.kniffel.hint.chance', 'Alle Augen zählen')} category="chance" />

      {/* Kniffel Bonus row, custom logic because it can be clicked multiple times */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', alignItems: 'center' }}>
        <Box sx={{ flex: 2, p: 1 }}>
          <Typography variant="body2" fontWeight="bold">{t('games.kniffel.cat.kniffel_bonus', 'Kniffel-Bonus')}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{t('games.kniffel.hint.kniffel_bonus', 'Jeder weitere · 50')}</Typography>
        </Box>
        {players.map((p, idx) => {
          const s = p.scores.kniffel_bonus;
          const display = s ? `${s}x (50)` : '–';
          const canScoreBonus = !disabled && idx === activePlayerIndex && rollCount > 0 && p.scores.kniffel !== null && p.scores.kniffel > 0 && possibleScores.kniffel_bonus > 0;
          return (
            <Box
              key={idx}
              onClick={() => {
                if (canScoreBonus) {
                  onScoreCategory('kniffel_bonus', 50);
                }
              }}
              sx={{
                flex: 1, textAlign: 'center', p: 1, borderLeft: '1px solid rgba(255,255,255,0.1)',
                cursor: canScoreBonus ? 'pointer' : 'default',
                bgcolor: canScoreBonus ? 'rgba(255,213,79,0.2)' : 'transparent',
                color: canScoreBonus ? 'warning.main' : 'inherit'
              }}
            >
              {display}
            </Box>
          );
        })}
      </Box>

      <SumRow label={t('games.kniffel.lower_total', 'Summe unten')} values={players.map(p => getLowerSectionSum(p.scores))} />

      {/* Score Modal */}
      <Modal open={!!selectedCell} onClose={() => setSelectedCell(null)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 300, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4, borderRadius: 2
        }}>
          {selectedCell && (
            <>
              <Typography variant="h6" mb={2}>
                {t(`games.kniffel.cat.${selectedCell.category}`, selectedCell.category)}
              </Typography>
              <Typography variant="body2" mb={3} color="text.secondary">
                {players[selectedCell.playerIdx].name}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleScoreConfirm(possibleScores[selectedCell.category])}
                >
                  {possibleScores[selectedCell.category]} {t('games.kniffel.points', 'Punkte eintragen')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleScoreConfirm(0)}
                >
                  {t('games.kniffel.strike', 'Streichen (0)')}
                </Button>
                <Button variant="text" onClick={() => setSelectedCell(null)}>
                  {t('common.cancel', 'Abbrechen')}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

    </Paper>
  );
};
