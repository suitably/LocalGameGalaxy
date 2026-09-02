import React, { useState } from 'react';
import { Container } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { initCardsI18n } from './i18n';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import type { CardGameDefinition } from './logic/types';
import { CardsLobby } from './components/CardsLobby';
import { SchwimmenGameView } from './components/SchwimmenGameView';
import { OhHellGameView } from './components/OhHellGameView';
import { UniversalScoreView } from './components/UniversalScoreView';

export const CardsGame: React.FC = () => {
  initCardsI18n();
  const { t } = useTranslation();
  usePageTitle(t('games.cards.title', 'Kartenspiele'));
  useWakeLock(true);

  const [activeSession, setActiveSession] = useState<{
    game: CardGameDefinition;
    players: string[];
  } | null>(null);

  const handleStartGame = (game: CardGameDefinition, players: string[]) => {
    setActiveSession({ game, players });
  };

  const handleExitSession = () => {
    setActiveSession(null);
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 3 }, px: { xs: 1, sm: 2 } }}>
      {!activeSession ? (
        <CardsLobby onStartGame={handleStartGame} />
      ) : activeSession.game.trackerType === 'lives_elimination' ? (
        <SchwimmenGameView
          initialPlayers={activeSession.players}
          defaultLives={activeSession.game.defaultLives || 3}
          onExit={handleExitSession}
        />
      ) : activeSession.game.trackerType === 'bids_and_tricks' ? (
        <OhHellGameView
          initialPlayers={activeSession.players}
          roundsSequence={activeSession.game.scoringRules?.roundsSequence}
          onExit={handleExitSession}
        />
      ) : (
        <UniversalScoreView
          game={activeSession.game}
          initialPlayers={activeSession.players}
          onExit={handleExitSession}
        />
      )}
    </Container>
  );
};
