import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material';

export interface LobbyPlayerItem {
  name: string;
  isRemote?: boolean;
}

export interface UseLobbyPlayersOptions {
  /**
   * LocalStorage key to persist player names across reloads.
   */
  storageKey: string;
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
   * Optional legacy storage keys to migrate from if storageKey is empty.
   */
  legacyStorageKeys?: string[];
}

export interface UseLobbyPlayersResult {
  players: LobbyPlayerItem[];
  addPlayer: (name: string, isRemote?: boolean) => boolean;
  removePlayer: (nameOrIndex: string | number) => void;
  togglePlayerRemote: (name: string) => void;
  setPlayers: React.Dispatch<React.SetStateAction<LobbyPlayerItem[]>>;
  hasMinPlayers: boolean;
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
