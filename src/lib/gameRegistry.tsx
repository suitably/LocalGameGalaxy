import React, { lazy } from 'react';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import CasinoIcon from '@mui/icons-material/Casino';
import PaletteIcon from '@mui/icons-material/Palette';
import CelebrationIcon from '@mui/icons-material/Celebration';
import StyleIcon from '@mui/icons-material/Style';
import GridViewIcon from '@mui/icons-material/GridView';
import { SongsProvider } from '../games/melodiq';

export type GameCategory = 'all' | 'dice' | 'drawing' | 'music' | 'social_deduction' | 'cards' | 'party';

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
    colorStart: string;
    colorEnd: string;
    hoverColor: string;
    component: React.ReactNode;
    category: GameCategory;
    hasSettings?: boolean;
    nestedRoutes?: GameRouteDefinition[];
    standaloneRoutes?: GameRouteDefinition[];
}

const WerewolfGame = lazy(() => import('../games/werewolf').then(m => ({ default: m.WerewolfGame })));
const ImposterGame = lazy(() => import('../games/imposter').then(m => ({ default: m.ImposterGame })));
const MelodiqGame = lazy(() => import('../games/melodiq').then(m => ({ default: m.MelodiqGame })));
const MelodiqQueue = lazy(() => import('../games/melodiq').then(m => ({ default: m.MelodiqQueue })));
const MelodiqTV = lazy(() => import('../games/melodiq').then(m => ({ default: m.MelodiqTV })));
const QwixxGame = lazy(() => import('../games/qwixx').then(m => ({ default: m.QwixxGame })));
const KnisterGame = lazy(() => import('../games/knister').then(m => ({ default: m.KnisterGame })));
const GuessArtGame = lazy(() => import('../games/guessart').then(m => ({ default: m.GuessArtGame })));
const CardsGame = lazy(() => import('../games/cards').then(m => ({ default: m.CardsGame })));
const PartyLobby = lazy(() => import('../features/party/PartyLobby').then(m => ({ default: m.PartyLobby })));

class GameRegistry {
    private games: GameDefinition[] = [
        {
            id: 'qwixx',
            route: 'games/qwixx',
            titleKey: 'games.qwixx.title',
            descriptionKey: 'games.qwixx.description',
            icon: <CasinoIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#ffb74d',
            colorEnd: '#f57c00',
            hoverColor: '#f57c00',
            category: 'dice',
            component: <QwixxGame />
        },
        {
            id: 'knister',
            route: 'games/knister',
            titleKey: 'games.knister.title',
            descriptionKey: 'games.knister.description',
            icon: <GridViewIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#ffa726',
            colorEnd: '#e65100',
            hoverColor: '#e65100',
            category: 'dice',
            component: <KnisterGame />
        },
        {
            id: 'guessart',
            route: 'games/guessart',
            titleKey: 'games.guessart.title',
            descriptionKey: 'games.guessart.description',
            icon: <PaletteIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#80deea',
            colorEnd: '#00838f',
            hoverColor: '#00838f',
            category: 'drawing',
            component: <GuessArtGame />
        },
        {
            id: 'cards',
            route: 'games/cards',
            titleKey: 'games.cards.title',
            descriptionKey: 'games.cards.description',
            icon: <StyleIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#4dd0e1',
            colorEnd: '#00838f',
            hoverColor: '#00838f',
            category: 'cards',
            component: <CardsGame />
        },
        {
            id: 'melodiq',
            route: 'games/melodiq',
            titleKey: 'games.melodiq.title',
            descriptionKey: 'games.melodiq.description',
            icon: <GraphicEqIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#90caf9',
            colorEnd: '#1e88e5',
            hoverColor: '#1e88e5',
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
                    )
                }
            ],
            standaloneRoutes: [
                {
                    path: '/games/melodiq/tv',
                    component: <MelodiqTV />
                }
            ]
        },
        {
            id: 'werewolf',
            route: 'games/werewolf',
            titleKey: 'games.werewolf.title',
            descriptionKey: 'games.werewolf.description',
            icon: <SportsEsportsIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#f48fb1',
            colorEnd: '#c2185b',
            hoverColor: '#c2185b',
            category: 'social_deduction',
            component: <WerewolfGame />
        },
        {
            id: 'imposter',
            route: 'games/imposter',
            titleKey: 'games.imposter.title',
            descriptionKey: 'games.imposter.description',
            icon: <PersonSearchIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#a5d6a7',
            colorEnd: '#2e7d32',
            hoverColor: '#2e7d32',
            category: 'social_deduction',
            component: <ImposterGame />
        },
        {
            id: 'party',
            route: 'party',
            titleKey: 'games.party.title',
            descriptionKey: 'games.party.description',
            icon: <CelebrationIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#ce93d8',
            colorEnd: '#7b1fa2',
            hoverColor: '#7b1fa2',
            category: 'party',
            component: <PartyLobby />
        }
    ];

    getGames(): GameDefinition[] {
        return this.games;
    }

    getGamesByCategory(category: GameCategory): GameDefinition[] {
        if (category === 'all') return this.games;
        return this.games.filter(g => g.category === category);
    }

    findGameByPath(pathname: string): GameDefinition | undefined {
        const cleanPath = pathname.replace(/^\//, '');
        return this.games.find(g => 
            cleanPath.startsWith(g.route) || 
            (g.nestedRoutes || []).some(nr => cleanPath.startsWith(nr.path.replace(/^\//, ''))) ||
            (g.standaloneRoutes || []).some(sr => cleanPath.startsWith(sr.path.replace(/^\//, '')))
        );
    }
}

export const gameRegistry = new GameRegistry();
