import React, { lazy } from 'react';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { SongsProvider } from '../games/melodiq';

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
    hasSettings?: boolean;
    nestedRoutes?: GameRouteDefinition[];
    standaloneRoutes?: GameRouteDefinition[];
}

const WerewolfGame = lazy(() => import('../games/werewolf').then(m => ({ default: m.WerewolfGame })));
const ImposterGame = lazy(() => import('../games/imposter').then(m => ({ default: m.ImposterGame })));
const MelodiqGame = lazy(() => import('../games/melodiq').then(m => ({ default: m.MelodiqGame })));
const MelodiqQueue = lazy(() => import('../games/melodiq').then(m => ({ default: m.MelodiqQueue })));
const MelodiqTV = lazy(() => import('../games/melodiq').then(m => ({ default: m.MelodiqTV })));

class GameRegistry {
    private games: GameDefinition[] = [
        {
            id: 'werewolf',
            route: 'games/werewolf',
            titleKey: 'games.werewolf.title',
            descriptionKey: 'games.werewolf.description',
            icon: <SportsEsportsIcon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#f48fb1',
            colorEnd: '#c2185b',
            hoverColor: '#c2185b',
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
            component: <ImposterGame />
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
        }
    ];

    getGames(): GameDefinition[] {
        return this.games;
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
