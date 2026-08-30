import i18n from '../../../i18n';
import { playerAssignment } from './playerAssignment';
import type { GuessArtGameRecord, GuessArtRound } from './types';

export interface ShouldNotifyParams {
  game: GuessArtGameRecord;
  round: GuessArtRound | null;
  isRemoteEvent: boolean;
  isInitialGameStart?: boolean;
  activeGameScreenId?: string | null;
  isDocumentVisible?: boolean;
}

export interface TurnNotificationDecision {
  shouldNotify: boolean;
  reason: string;
  activePlayerName?: string;
  actionType?: 'draw' | 'guess';
}

class GuessArtNotificationService {
  private lastNotifiedKey: string | null = null;
  private lastNotifiedTimestamp = 0;

  public isPermissionGranted(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission === 'denied') {
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Pure evaluation function to decide if an OS/browser notification should be dispatched.
   */
  public evaluateTurnNotification(params: ShouldNotifyParams): TurnNotificationDecision {
    const {
      game,
      round,
      isRemoteEvent,
      isInitialGameStart = false,
      activeGameScreenId = null,
      isDocumentVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
    } = params;

    if (!game || !round) {
      return { shouldNotify: false, reason: 'missing_game_or_round' };
    }

    if (isInitialGameStart) {
      return { shouldNotify: false, reason: 'initial_game_start' };
    }

    // Never notify if the action was locally triggered on this device
    if (!isRemoteEvent) {
      return { shouldNotify: false, reason: 'local_action_handoff' };
    }

    if (game.status === 'completed' || round.status === 'completed') {
      return { shouldNotify: false, reason: 'game_completed' };
    }

    // Determine active drawer and guesser
    const drawerIdx = game.players.findIndex((p) => p.id === round.drawnById);
    const effDrawerIdx = drawerIdx >= 0 ? drawerIdx : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
    const effGuesserIdx = (effDrawerIdx + 1) % (game.players.length || 1);

    const activeDrawerObj = game.players[effDrawerIdx];
    const activeGuesserObj = game.players[effGuesserIdx];

    const isDrawingOrSelecting = game.status === 'drawing' || game.status === 'selecting' || round.status === 'drawing' || round.status === 'selecting';
    const isGuessing = game.status === 'guessing' || round.status === 'guessing';

    let activePlayer = isDrawingOrSelecting ? activeDrawerObj : isGuessing ? activeGuesserObj : null;
    let actionType: 'draw' | 'guess' | undefined = isDrawingOrSelecting ? 'draw' : isGuessing ? 'guess' : undefined;

    if (!activePlayer || !actionType) {
      return { shouldNotify: false, reason: 'no_active_player' };
    }

    // Check if the active player is local to this device
    const isTurnLocal = playerAssignment.isPlayerLocal(game.id, activePlayer.id, false);
    if (!isTurnLocal) {
      return { shouldNotify: false, reason: 'turn_not_for_local_player' };
    }

    // If ALL players in the game are local (pass & play on same device), do not send notifications
    const allPlayersLocal = game.players.length > 0 && game.players.every((p) => playerAssignment.isPlayerLocal(game.id, p.id, false));
    if (allPlayersLocal) {
      return { shouldNotify: false, reason: 'all_players_local_pass_and_play' };
    }

    // If the game is already in active foreground on this screen and the document is visible,
    // the UI updates live in real-time, so suppress redundant OS popup.
    if (activeGameScreenId === game.id && isDocumentVisible) {
      return { shouldNotify: false, reason: 'already_visible_in_foreground' };
    }

    return {
      shouldNotify: true,
      reason: 'remote_turn_received',
      activePlayerName: activePlayer.name,
      actionType,
    };
  }

  /**
   * Dispatches a notification if evaluation passes.
   */
  public async notifyTurnIfEligible(params: ShouldNotifyParams): Promise<boolean> {
    if (!this.isPermissionGranted()) {
      return false;
    }

    const decision = this.evaluateTurnNotification(params);
    if (!decision.shouldNotify || !decision.actionType) {
      return false;
    }

    const gameId = params.game.id;
    const roundId = params.round?.id || `${params.game.roundNumber}`;
    const status = params.round?.status || params.game.status;
    const notificationKey = `${gameId}_${roundId}_${status}_${decision.actionType}`;
    const now = Date.now();

    // Prevent duplicate notification within 10 seconds for same turn
    if (this.lastNotifiedKey === notificationKey && now - this.lastNotifiedTimestamp < 10000) {
      return false;
    }

    this.lastNotifiedKey = notificationKey;
    this.lastNotifiedTimestamp = now;

    const playerName = decision.activePlayerName || (i18n.t('guessart.you', 'Du') as string);
    const title = i18n.t('guessart.notificationTitle', 'GuessArt: Du bist dran!') as string;
    const body =
      decision.actionType === 'draw'
        ? (i18n.t('guessart.notificationDrawBody', {
            name: playerName,
            defaultValue: `${playerName}, du bist jetzt an der Reihe zum Zeichnen!`,
          }) as string)
        : (i18n.t('guessart.notificationGuessBody', {
            name: playerName,
            defaultValue: `${playerName}, du bist jetzt an der Reihe zum Raten!`,
          }) as string);

    const tag = `guessart-${gameId}`;
    const icon = '/pwa/icon_full.png';

    // Prefer ServiceWorker showNotification for Android PWA / mobile Chrome reliability
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon,
          tag,
          data: {
            url: `${window.location.origin}${window.location.pathname}#/games/guessart?gameId=${gameId}`,
          },
        });
        return true;
      } catch (err) {
        console.warn('[GuessArtNotificationService] SW notification failed, falling back to Notification constructor:', err);
      }
    }

    // Fallback to standard Notification constructor
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification(title, {
          body,
          icon,
          tag,
        });
        return true;
      } catch (err) {
        console.warn('[GuessArtNotificationService] Notification constructor failed:', err);
      }
    }

    return false;
  }
}

export const guessArtNotificationService = new GuessArtNotificationService();
