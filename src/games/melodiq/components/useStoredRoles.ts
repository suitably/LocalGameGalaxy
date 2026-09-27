import { storage, STORAGE_KEYS } from '../../../lib/storage';

export const getRoleForDevice = (deviceId?: string) => {
    if (!deviceId) return 'singer';
    const storedRoles = storage.getJson<Record<string, string>>(STORAGE_KEYS.MELODIQ_CLIENT_ROLES, {});
    return storedRoles[deviceId] || 'singer';
};
