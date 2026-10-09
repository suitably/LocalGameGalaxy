import { storage } from '../storage';

export const createPlayerAssignment = (storagePrefix: string) => {
  return {
    getLocalPlayerIds(gameId: string): string[] {
      const list = storage.getJson<string[]>(`${storagePrefix}${gameId}`, []);
      return Array.isArray(list) ? list : [];
    },

    setLocalPlayerIds(gameId: string, playerIds: string[]): void {
      storage.setJson(`${storagePrefix}${gameId}`, playerIds);
    },

    addLocalPlayerId(gameId: string, playerId: string): void {
      const current = this.getLocalPlayerIds(gameId);
      if (!current.includes(playerId)) {
        this.setLocalPlayerIds(gameId, [...current, playerId]);
      }
    },

    removeLocalPlayerId(gameId: string, playerId: string): void {
      const current = this.getLocalPlayerIds(gameId);
      this.setLocalPlayerIds(gameId, current.filter((id) => id !== playerId));
    },

    isPlayerLocal(gameId: string, playerId: string, fallbackAllLocal = false): boolean {
      const localIds = this.getLocalPlayerIds(gameId);
      if (localIds.length === 0) {
        return fallbackAllLocal;
      }
      return localIds.includes(playerId);
    },
  };
};

export const isGameBaseSnapshotNewer = (snapshotGame: any, existingGame: any): boolean | null => {
  if (snapshotGame.name !== existingGame.name) return true;
  if (
    snapshotGame.players &&
    existingGame.players &&
    JSON.stringify(
      snapshotGame.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        ntfyTopic: p.ntfyTopic,
        relayUrl: p.relayUrl,
        notificationMethod: p.notificationMethod,
      })),
    ) !==
      JSON.stringify(
        existingGame.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          ntfyTopic: p.ntfyTopic,
          relayUrl: p.relayUrl,
          notificationMethod: p.notificationMethod,
        })),
      )
  ) {
    return true;
  }

  const snapTime = new Date(snapshotGame.updatedAt || 0).getTime();
  const existTime = new Date(existingGame.updatedAt || 0).getTime();
  if (snapTime > existTime) return true;
  return null;
};

export const mergePlayerProfiles = (
  snapshotPlayers: any[],
  existingPlayers: any[],
  gameId: string,
  isPlayerLocal: (gameId: string, playerId: string, fallbackAllLocal: boolean) => boolean,
): any[] => {
  return snapshotPlayers.map((incomingP) => {
    const existingP = existingPlayers.find((p) => p.id === incomingP.id);
    const isExistingLocal = existingP ? isPlayerLocal(gameId, existingP.id, false) : false;
    return {
      ...existingP,
      ...incomingP,
      ntfyTopic: isExistingLocal
        ? existingP?.ntfyTopic || incomingP.ntfyTopic
        : incomingP.ntfyTopic || existingP?.ntfyTopic,
      relayUrl: isExistingLocal
        ? existingP?.relayUrl || incomingP.relayUrl
        : incomingP.relayUrl || existingP?.relayUrl,
      notificationMethod: isExistingLocal
        ? existingP?.notificationMethod || incomingP.notificationMethod
        : incomingP.notificationMethod || existingP?.notificationMethod,
    };
  });
};

export const hasPlayerChannelUpdates = (
  snapshotPlayers: any[],
  existingPlayers: any[],
  gameId: string,
  isPlayerLocal: (gameId: string, playerId: string, fallbackAllLocal: boolean) => boolean,
): boolean => {
  return snapshotPlayers.some((incomingP) => {
    const existingP = existingPlayers.find((p) => p.id === incomingP.id);
    if (!existingP) return false;
    const isExistingLocal = isPlayerLocal(gameId, existingP.id, false);
    if (isExistingLocal) return false; // Never overwrite local player channels via snapshot
    return (
      (incomingP.ntfyTopic && incomingP.ntfyTopic !== existingP.ntfyTopic) ||
      (incomingP.relayUrl && incomingP.relayUrl !== existingP.relayUrl) ||
      (incomingP.notificationMethod && incomingP.notificationMethod !== existingP.notificationMethod)
    );
  });
};
