/**
 * Mau-Mau: one device, pass and play, hidden hands [ID: UI-MAUMAU-GAME]
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout } from '../../components/Layout/GameLayout';
import { usePageTitle } from '../../context/TitleContext';
import { HandoverCover } from '../../modules/pass-and-play';
import { MauMauRoundSummary } from './components/MauMauRoundSummary';
import { MauMauSetup } from './components/MauMauSetup';
import { MauMauTable } from './components/MauMauTable';
import { initMauMauI18n } from './i18n';
import { useMauMauGame } from './hooks/useMauMauGame';

// Register translations at module load so the first render already has them.
initMauMauI18n();

export const MauMauGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.maumau.title', 'Mau-Mau'));

  const { game, coverFor, start, act, reveal, restart } = useMauMauGame();

  if (!game) {
    return (
      <GameLayout maxWidth="sm">
        <MauMauSetup onStart={start} />
      </GameLayout>
    );
  }

  const covered = coverFor ? game.players.find((p) => p.id === coverFor) : undefined;

  let body: React.ReactNode;
  if (covered) {
    // The table is not rendered at all while covered, so the hand is never in the DOM.
    body = <HandoverCover player={{ id: covered.id, name: covered.name }} onReveal={reveal} />;
  } else if (game.phase === 'round_over') {
    body = (
      <MauMauRoundSummary
        game={game}
        onNextRound={() => act({ type: 'next_round' })}
        onRestart={restart}
      />
    );
  } else {
    body = <MauMauTable game={game} onAct={act} />;
  }

  return <GameLayout maxWidth="md">{body}</GameLayout>;
};
