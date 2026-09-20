import type { ReactNode } from 'react';

export type CompanionPluginStatus = 'connected' | 'available' | 'planned';

export interface CompanionPluginDefinition {
    id: string;
    name: string;
    gameId: string;
    icon: ReactNode;
    description: string;
    defaultPort: number;
    status: CompanionPluginStatus;
    renderConfig: (props: { autoFocusUsdb?: boolean; onBackToGame?: () => void }) => ReactNode;
}
