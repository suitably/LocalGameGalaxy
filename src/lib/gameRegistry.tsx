import React, { lazy, type ComponentType } from 'react';
import SportsEsportsIcon from '@mui/icons-material/SportsEsportsRounded';
import PersonSearchIcon from '@mui/icons-material/PersonSearchRounded';
import GraphicEqIcon from '@mui/icons-material/GraphicEqRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import PaletteIcon from '@mui/icons-material/PaletteRounded';
import CelebrationIcon from '@mui/icons-material/CelebrationRounded';
import GridViewIcon from '@mui/icons-material/GridViewRounded';
import AbcIcon from '@mui/icons-material/AbcRounded';
import Grid4x4Icon from '@mui/icons-material/Grid4x4Rounded';
import StyleIcon from '@mui/icons-material/StyleRounded';
import TableBarIcon from '@mui/icons-material/TableBarRounded';
import AdsClickIcon from '@mui/icons-material/AdsClickRounded';
import AutoStoriesIcon from '@mui/icons-material/AutoStoriesRounded';
import PianoIcon from '@mui/icons-material/PianoRounded';
import { SongsProvider } from '../games/melodiq';

export type GameCategory =
  'all' | 'dice' | 'drawing' | 'music' | 'social_deduction' | 'cards' | 'party' | 'puzzle';

export interface GameRouteDefinition {
  path: string;
  component: React.ReactNode;
}

export interface GameDefinition {
  id: string;
  route: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  category: GameCategory;
  hasSettings?: boolean;
  nestedRoutes?: GameRouteDefinition[];
  standaloneRoutes?: GameRouteDefinition[];
}

/** Maps a named export of a lazily imported module to the `default` export `lazy` expects. */
const pick =
  <K extends string>(name: K) =>
  (mod: Record<K, ComponentType>) => ({ default: mod[name] });

const WerewolfGame = lazy(() => import('../games/werewolf').then(pick('WerewolfGame')));
const ImposterGame = lazy(() => import('../games/imposter').then(pick('ImposterGame')));
const MelodiqGame = lazy(() => import('../games/melodiq').then(pick('MelodiqGame')));
const MelodiqNotesGame = lazy(() =>
  import('../games/melodiq-notes').then(pick('MelodiqNotesGame')),
);
const MelodiqQueue = lazy(() => import('../games/melodiq').then(pick('MelodiqQueue')));
const MelodiqTV = lazy(() => import('../games/melodiq').then(pick('MelodiqTV')));
const QwixxGame = lazy(() => import('../games/qwixx').then(pick('QwixxGame')));
const KnisterGame = lazy(() => import('../games/knister').then(pick('KnisterGame')));
const GuessArtGame = lazy(() => import('../games/guessart').then(pick('GuessArtGame')));
const StorytellerGame = lazy(() => import('../games/storyteller').then(pick('StorytellerGame')));
const CardsGame = lazy(() => import('../games/cards').then(pick('CardsGame')));
const WordleGame = lazy(() => import('../games/wordle').then(pick('WordleGame')));
const SudokuGame = lazy(() => import('../games/sudoku').then(pick('SudokuGame')));
const PartyLobby = lazy(() => import('../features/party/PartyLobby').then(pick('PartyLobby')));
const TabletopGame = lazy(() => import('../games/tabletop').then(pick('TabletopGame')));
const KniffelGame = lazy(() => import('../games/kniffel').then(pick('KniffelGame')));
const DartsGame = lazy(() => import('../games/darts').then(pick('DartsGame')));

class GameRegistry {
  private games: GameDefinition[] = [
    {
      id: 'darts',
      route: 'games/darts',
      titleKey: 'games.darts.title',
      descriptionKey: 'games.darts.description',
      icon: <AdsClickIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'party',
      hasSettings: true,
      component: <DartsGame />,
    },
    {
      id: 'qwixx',
      route: 'games/qwixx',
      titleKey: 'games.qwixx.title',
      descriptionKey: 'games.qwixx.description',
      icon: <CasinoIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'dice',
      component: <QwixxGame />,
    },
    {
      id: 'knister',
      route: 'games/knister',
      titleKey: 'games.knister.title',
      descriptionKey: 'games.knister.description',
      icon: <GridViewIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'dice',
      component: <KnisterGame />,
    },
    {
      id: 'kniffel',
      route: 'games/kniffel',
      titleKey: 'games.kniffel.title',
      descriptionKey: 'games.kniffel.description',
      icon: <CasinoIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'dice',
      component: <KniffelGame />,
    },
    {
      id: 'guessart',
      route: 'games/guessart',
      titleKey: 'games.guessart.title',
      descriptionKey: 'games.guessart.description',
      icon: <PaletteIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'drawing',
      component: <GuessArtGame />,
    },
    {
      id: 'storyteller',
      route: 'games/storyteller',
      titleKey: 'games.storyteller.title',
      descriptionKey: 'games.storyteller.description',
      icon: <AutoStoriesIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'party',
      component: <StorytellerGame />,
    },
    {
      id: 'cards',
      route: 'games/cards',
      titleKey: 'games.cards.title',
      descriptionKey: 'games.cards.description',
      icon: <StyleIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'cards',
      component: <CardsGame />,
    },
    {
      id: 'melodiq',
      route: 'games/melodiq',
      titleKey: 'games.melodiq.title',
      descriptionKey: 'games.melodiq.description',
      icon: <GraphicEqIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'music',
      component: <MelodiqGame />,
      hasSettings: true,
      nestedRoutes: [
        {
          path: 'games/melodiq/queue',
          component: (
            <SongsProvider>
              <MelodiqQueue />
            </SongsProvider>
          ),
        },
      ],
      standaloneRoutes: [
        {
          path: '/games/melodiq/tv',
          component: <MelodiqTV />,
        },
      ],
    },
    {
      id: 'melodiq-notes',
      route: 'games/melodiq-notes',
      titleKey: 'games.melodiq_notes.title',
      descriptionKey: 'games.melodiq_notes.description',
      icon: <PianoIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'music',
      component: <MelodiqNotesGame />,
    },
    {
      id: 'werewolf',
      route: 'games/werewolf',
      titleKey: 'games.werewolf.title',
      descriptionKey: 'games.werewolf.description',
      icon: <SportsEsportsIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'social_deduction',
      component: <WerewolfGame />,
    },
    {
      id: 'imposter',
      route: 'games/imposter',
      titleKey: 'games.imposter.title',
      descriptionKey: 'games.imposter.description',
      icon: <PersonSearchIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'social_deduction',
      component: <ImposterGame />,
    },
    {
      id: 'party',
      route: 'party',
      titleKey: 'games.party.title',
      descriptionKey: 'games.party.description',
      icon: <CelebrationIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'party',
      component: <PartyLobby />,
    },
    {
      id: 'wordle',
      route: 'games/wordle',
      titleKey: 'games.wordle.title',
      descriptionKey: 'games.wordle.description',
      icon: <AbcIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'puzzle',
      component: <WordleGame />,
    },
    {
      id: 'sudoku',
      route: 'games/sudoku',
      titleKey: 'games.sudoku.title',
      descriptionKey: 'games.sudoku.description',
      icon: <Grid4x4Icon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'puzzle',
      component: <SudokuGame />,
    },
    {
      id: 'tabletop',
      route: 'games/tabletop',
      titleKey: 'games.tabletop.title',
      descriptionKey: 'games.tabletop.description',
      icon: <TableBarIcon sx={{ fontSize: 72, mb: 2 }} />,
      category: 'cards',
      component: <TabletopGame />,
    },
  ];

  getGames(): GameDefinition[] {
    return this.games;
  }

  getGamesByCategory(category: GameCategory): GameDefinition[] {
    if (category === 'all') return this.games;
    return this.games.filter((g) => g.category === category);
  }

  findGameByPath(pathname: string): GameDefinition | undefined {
    const clean = pathname.replace(/^\//, '');
    return this.games.find((g) => {
      if (clean.startsWith(g.route)) return true;
      if (g.nestedRoutes?.some((nr) => clean.startsWith(nr.path.replace(/^\//, '')))) return true;
      if (g.standaloneRoutes?.some((sr) => clean.startsWith(sr.path.replace(/^\//, ''))))
        return true;
      return false;
    });
  }
}

export const gameRegistry = new GameRegistry();
