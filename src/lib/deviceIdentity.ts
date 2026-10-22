/**
 * Stable id of this device/browser profile [ID: LIB-DEVICE-IDENTITY]
 *
 * Created once and kept in storage. It says which player seats this device plays; unlike the
 * ntfy topic it never changes when notification settings change.
 */
import { storage, STORAGE_KEYS } from './storage';
import { generateUUID } from './uuid';

export function getDeviceId(): string {
  let id = storage.get(STORAGE_KEYS.DEVICE_ID);
  if (!id) {
    id = `dev_${generateUUID()}`;
    storage.set(STORAGE_KEYS.DEVICE_ID, id);
  }
  return id;
}
