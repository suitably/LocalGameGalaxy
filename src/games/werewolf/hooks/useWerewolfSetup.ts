import { useState, useEffect } from 'react';
import type { Role, RoleDefinition } from '../logic/types';
import { DEFAULT_ROLES } from '../logic/defaultRoles';
import { isWerewolfRole } from '../logic/utils';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

interface WerewolfSetupSettings {
  enabledRoles?: Role[];
  numWerewolves?: number;
}

export function useWerewolfSetup(
  /** Only the count matters. */
  players: readonly unknown[],
  customRoles: RoleDefinition[],
  onStartGame: (roles: Role[]) => void,
  /** Only these roles can be dealt (room games); others stay saved but unused. */
  allowedRoles?: Role[],
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

  const usableRoles = allowedRoles
    ? enabledRoles.filter((role) => allowedRoles.includes(role))
    : enabledRoles;
  const allAvailableRoles = [...DEFAULT_ROLES, ...customRoles];
  const selectedWerewolfRolesCount = usableRoles.filter((id) =>
    isWerewolfRole(id, allAvailableRoles),
  ).length;
  const tooManyWerewolves = selectedWerewolfRolesCount > numWerewolves;
  // Villagers are added automatically; base werewolves fill up to numWerewolves.
  const baseWerewolvesToAdd = Math.max(0, numWerewolves - selectedWerewolfRolesCount);
  const totalRolesCount = usableRoles.length + baseWerewolvesToAdd;
  const tooManyRoles = totalRolesCount > players.length && players.length > 0;

  const handleStart = () => {
    const roles: Role[] = [...usableRoles];
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
