import { playerAssignment } from './playerAssignment';
import { buildTurnNotificationMessage, localNotificationPresenter } from '../../../lib/notifications';
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
  activePlayerId?: string;
  actorName?: string;
  actionType?: 'draw' | 'guess';
}

class GuessArtNotificationService {
  private notifiedTurnKeys: Set<string> = new Set();
  private locallyDrawnRoundIds: Set<string> = new Set();

  public markRoundDrawnLocally(roundId?: string | null): void {
    if (roundId) {
      this.locallyDrawnRoundIds.add(roundId);
      if (this.locallyDrawnRoundIds.size > 100) {
        const first = this.locallyDrawnRoundIds.values().next().value;
        if (first) this.locallyDrawnRoundIds.delete(first);
      }
    }
  }

  public wasRoundDrawnLocally(roundId?: string | null): boolean {
    if (!roundId) return false;
    return this.locallyDrawnRoundIds.has(roundId);
  }

  public clearHistory(): void {
    this.notifiedTurnKeys.clear();
    this.locallyDrawnRoundIds.clear();
  }

  public isPermissionGranted(): boolean {
    return localNotificationPresenter.hasPermission();
  }

  public async requestPermission(): Promise<boolean> {
    const res = await localNotificationPresenter.requestPermission();
    return res === 'granted';
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

    // In round 1, the drawer (Host) is already on the screen setting up the game.
    // Never send a drawer turn notification for round 1.
    const isSelecting = game.status === 'selecting' || round.status === 'selecting';
    const isGuessing = game.status === 'guessing' || round.status === 'guessing';

    if (round.roundNumber === 1 && isSelecting) {
      return { shouldNotify: false, reason: 'round_1_drawer_setup' };
    }

    // Determine active drawer and guesser
    const drawerIdx = game.players.findIndex((p) => p.id === round.drawnById);
    const effDrawerIdx = drawerIdx >= 0 ? drawerIdx : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
    const guesserIdx = round.guesserId ? game.players.findIndex((p) => p.id === round.guesserId) : -1;
    const effGuesserIdx = guesserIdx >= 0 ? guesserIdx : (effDrawerIdx + 1) % (game.players.length || 1);

    const activeDrawerObj = game.players[effDrawerIdx];
    const activeGuesserObj = game.players[effGuesserIdx];

    const activePlayer = isSelecting ? activeDrawerObj : isGuessing ? activeGuesserObj : null;
    const actionType: 'draw' | 'guess' | undefined = isSelecting ? 'draw' : isGuessing ? 'guess' : undefined;

    if (!activePlayer || !actionType) {
      return { shouldNotify: false, reason: 'no_active_player' };
    }

    // For guessing, require that the round is actively in guessing status
    if (actionType === 'guess' && round.status !== 'guessing') {
      return { shouldNotify: false, reason: 'drawing_not_submitted_yet' };
    }

    // If the turn or round was played under a temporary claim ("lass mich hier spielen"),
    // no notifications should be sent to anyone:
    if (round.temporaryClaim || playerAssignment.isTurnClaimedTemporarily(game.id, activePlayer.id)) {
      return { shouldNotify: false, reason: 'turn_claimed_temporarily' };
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

    // Never notify a player to guess their own drawing!
    if (actionType === 'guess' && round.drawnById && activePlayer.id === round.drawnById) {
      return { shouldNotify: false, reason: 'drawing_drawn_by_same_player' };
    }

    // If the game is already in active foreground on this screen and the document is visible,
    // the UI updates live in real-time, so suppress redundant OS popup.
    if (activeGameScreenId === game.id && isDocumentVisible) {
      return { shouldNotify: false, reason: 'already_visible_in_foreground' };
    }

    const actorName =
      actionType === 'guess'
        ? (round.drawnById ? game.players.find((p) => p.id === round.drawnById)?.name : activeDrawerObj?.name)
        : (round.guesserId ? game.players.find((p) => p.id === round.guesserId)?.name : undefined);

    return {
      shouldNotify: true,
      reason: 'remote_turn_received',
      activePlayerName: activePlayer.name,
      activePlayerId: activePlayer.id,
      actorName,
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

    // Prevent duplicate notification for the exact same turn transition
    if (this.notifiedTurnKeys.has(notificationKey)) {
      return false;
    }

    this.notifiedTurnKeys.add(notificationKey);
    if (this.notifiedTurnKeys.size > 100) {
      // Keep set bounded
      const first = this.notifiedTurnKeys.values().next().value;
      if (first) this.notifiedTurnKeys.delete(first);
    }

    const message = buildTurnNotificationMessage({
      gameType: 'guessart',
      gameName: params.game.name,
      gameId,
      actionType: decision.actionType,
      actorName: decision.actorName,
      targetPlayerName: decision.activePlayerName,
      targetPlayerId: decision.activePlayerId,
    });

    return localNotificationPresenter.showNotification({
      title: message.title,
      body: message.body,
      tag: message.tag,
      icon: message.icon,
      url: message.url,
      data: { url: message.url },
    });
  }
}

export const guessArtNotificationService = new GuessArtNotificationService();
