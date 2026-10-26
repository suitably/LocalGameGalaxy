/* eslint-disable react-refresh/only-export-components -- context file exports provider plus hooks */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { GameSettingsSheet } from '../components/settings/GameSettingsSheet';
import type { GameSettingsViewer } from '../lib/gameSettingsTypes';
import type { GameDefinition } from '../lib/gameRegistry';

export interface GameSettingsHostOptions {
  /** Which sections the game wants to show; default 'host'. */
  audience?: GameSettingsViewer;
  /** Called when the sheet closes (e.g. to reload config the sections changed). */
  onClose?: () => void;
}

interface GameSettingsContextType {
  openGameSettings: () => void;
  closeGameSettings: () => void;
  registerHost: (options: GameSettingsHostOptions) => () => void;
}

const GameSettingsContext = createContext<GameSettingsContextType | undefined>(undefined);

interface GameSettingsProviderProps {
  children: ReactNode;
  /** Resolves the registry game for a pathname (injected to avoid a context ↔ registry import cycle). */
  resolveGame: (pathname: string) => GameDefinition | undefined;
}

export const GameSettingsProvider: React.FC<GameSettingsProviderProps> = ({
  children,
  resolveGame,
}) => {
  const { pathname } = useLocation();
  const game = resolveGame(pathname);
  // Open only for the route it was opened on: navigating away closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const [audience, setAudience] = useState<GameSettingsViewer>('host');
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  const onCloseRef = useRef<(() => void) | undefined>(undefined);

  const closeGameSettings = useCallback(() => {
    setOpenPath(null);
    onCloseRef.current?.();
  }, []);

  const openGameSettings = useCallback(() => setOpenPath(pathnameRef.current), []);

  const registerHost = useCallback((options: GameSettingsHostOptions) => {
    onCloseRef.current = options.onClose;
    setAudience(options.audience ?? 'host');
    return () => {
      onCloseRef.current = undefined;
      setAudience('host');
    };
  }, []);

  const value = useMemo(
    () => ({ openGameSettings, closeGameSettings, registerHost }),
    [openGameSettings, closeGameSettings, registerHost],
  );

  return (
    <GameSettingsContext.Provider value={value}>
      {children}
      {game?.settings && (
        <GameSettingsSheet
          open={open}
          onClose={closeGameSettings}
          titleKey={game.titleKey}
          sections={game.settings.sections}
          audience={audience}
        />
      )}
    </GameSettingsContext.Provider>
  );
};

export const useGameSettings = (): Pick<
  GameSettingsContextType,
  'openGameSettings' | 'closeGameSettings'
> => {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) throw new Error('useGameSettings must be used within a GameSettingsProvider');
  return ctx;
};

/** A game registers its audience and close callback while mounted. */
export function useGameSettingsHost({ audience, onClose }: GameSettingsHostOptions = {}): void {
  const ctx = useContext(GameSettingsContext);
  const registerHost = ctx?.registerHost;
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(
    () => registerHost?.({ audience, onClose: () => closeRef.current?.() }),
    [registerHost, audience],
  );
}
