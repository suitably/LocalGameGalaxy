import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material';

export interface LobbyPlayerItem {
  name: string;
  isRemote?: boolean;
}

/** An old per-game roster key; `remoteAfterFirst` marks every player but the first as remote. */
export type RosterMigrationSource = string | { key: string; remoteAfterFirst?: boolean };

export interface UseLobbyPlayersOptions {
  /**
   * Initial default players if no saved players exist.
   * Can be strings or LobbyPlayerItem objects.
   */
  defaultPlayers?: (string | LobbyPlayerItem)[];
  /**
   * Minimum required players (default: 2).
   */
  minPlayers?: number;
  /**
   * Optional maximum number of players.
   */
  maxPlayers?: number;
  /**
   * The game's old roster keys, read once (in order) while the shared roster
   * (`STORAGE_KEYS.LOBBY_PLAYERS`) does not exist yet. Never written or deleted.
   */
  migrateFrom?: RosterMigrationSource[];
}

export interface UseLobbyPlayersResult {
  players: LobbyPlayerItem[];
  addPlayer: (name: string, isRemote?: boolean) => boolean;
  removePlayer: (nameOrIndex: string | number) => void;
  togglePlayerRemote: (name: string) => void;
  setPlayers: React.Dispatch<React.SetStateAction<LobbyPlayerItem[]>>;
  hasMinPlayers: boolean;
  /** `minPlayers ≤ players ≤ maxPlayers`; the shared roster can hold more than this game allows. */
  hasValidCount: boolean;
  canAddMore: boolean;
  minPlayers: number;
  maxPlayers?: number;
}

export interface PlayerManagerCardProps {
  players: LobbyPlayerItem[];
  onAddPlayer: (name: string, isRemote?: boolean) => boolean | void;
  onRemovePlayer: (name: string, index?: number) => void;
  onToggleRemote?: (name: string) => void;
  minPlayers?: number;
  maxPlayers?: number;
  title?: string;
  description?: string;
  placeholder?: string;
  cardVariant?: 'elevation' | 'outlined';
  sx?: SxProps<Theme>;
  headerRight?: ReactNode;
}
