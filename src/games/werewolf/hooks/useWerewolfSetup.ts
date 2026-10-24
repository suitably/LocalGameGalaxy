import { useState, useEffect } from 'react';
import type { Player, Role, RoleDefinition } from '../logic/types';
import { DEFAULT_ROLES } from '../logic/defaultRoles';
import { isWerewolfRole } from '../logic/utils';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

interface WerewolfSetupSettings {
  enabledRoles?: Role[];
  numWerewolves?: number;
}

export function useWerewolfSetup(
  players: Player[],
  customRoles: RoleDefinition[],
  onStartGame: (roles: Role[]) => void,
) {
  const [enabledRoles, setEnabledRoles] = useState<Role[]>(() => {
    const parsed = storage.getJson<WerewolfSetupSettings | null>(
      STORAGE_KEYS.WEREWOLF_SETTINGS,
      null,
    );
    return parsed?.enabledRoles ?? ['WITCH', 'SEER'];
  });
  const [numWerewolves, setNumWerewolves] = useState(() => {
    const parsed = storage.getJson<WerewolfSetupSettings | null>(
      STORAGE_KEYS.WEREWOLF_SETTINGS,
      null,
    );
    return parsed?.numWerewolves ?? 1;
  });

  useEffect(() => {
    storage.setJson(STORAGE_KEYS.WEREWOLF_SETTINGS, { enabledRoles, numWerewolves });
  }, [enabledRoles, numWerewolves]);

  const toggleRole = (role: Role) => {
    setEnabledRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const allAvailableRoles = [...DEFAULT_ROLES, ...customRoles];
  const selectedWerewolfRolesCount = enabledRoles.filter((id) =>
    isWerewolfRole(id, allAvailableRoles),
  ).length;
  const tooManyWerewolves = selectedWerewolfRolesCount > numWerewolves;
  // Villagers are added automatically; base werewolves fill up to numWerewolves.
  const baseWerewolvesToAdd = Math.max(0, numWerewolves - selectedWerewolfRolesCount);
  const totalRolesCount = enabledRoles.length + baseWerewolvesToAdd;
  const tooManyRoles = totalRolesCount > players.length && players.length > 0;

  const handleStart = () => {
    const roles: Role[] = [...enabledRoles];
    for (let i = 0; i < baseWerewolvesToAdd; i++) roles.push('WEREWOLF');
    while (roles.length < players.length) roles.push('VILLAGER');
    onStartGame(roles.slice(0, players.length));
  };

  return {
    enabledRoles,
    numWerewolves,
    setNumWerewolves,
    toggleRole,
    handleStart,
    tooManyRoles,
    tooManyWerewolves,
  };
}
