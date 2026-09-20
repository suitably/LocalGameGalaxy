import MicIcon from '@mui/icons-material/Mic';
import CasinoIcon from '@mui/icons-material/Casino';
import i18n from 'i18next';
import type { CompanionPluginDefinition } from './types';
import { MelodiqCompanionConfig } from './MelodiqCompanionConfig';
import { TabletopCompanionConfig } from './TabletopCompanionConfig';

export function getCompanionPlugins(): CompanionPluginDefinition[] {
    return [
        {
            id: 'melodiq',
            name: i18n.t('settings.companion_melodiq_name', 'MelodiQ Media & AI Companion'),
            gameId: 'melodiq',
            icon: <MicIcon color="primary" />,
            description: i18n.t('settings.companion_melodiq_desc', 'Audio-Separation (UVR MDX-Net), Whisper-AI Textextraktion, Song-Streaming und USDB-Integration.'),
            defaultPort: 3000,
            status: 'available',
            renderConfig: ({ autoFocusUsdb, onBackToGame }) => (
                <MelodiqCompanionConfig
                    autoFocusUsdb={autoFocusUsdb}
                    onBackToGame={onBackToGame}
                />
            ),
        },
        {
            id: 'tabletop',
            name: i18n.t('settings.companion_tabletop_name', 'Tabletop Asset & Sync Companion'),
            gameId: 'tabletop',
            icon: <CasinoIcon sx={{ color: '#ce93d8' }} />,
            description: i18n.t('settings.companion_tabletop_desc', 'Asset-Caching, TTS/PCIO Deck-Konvertierung und Physics-Sync für Tabletop-Simulationen.'),
            defaultPort: 3002,
            status: 'available',
            renderConfig: () => (
                <TabletopCompanionConfig />
            ),
        },
    ];
}
