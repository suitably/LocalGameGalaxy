/**
 * API key permission flags shown in the admin UI [ID: LIB-ADMIN-PERMISSION-FLAGS]
 */
import type { ApiKeyPermissions } from '../hooks/useServerApiKeys';

type PermissionFlag = keyof ApiKeyPermissions;

/** Order, label key and colour of every flag; also used for the chips in `ApiKeyTable`. */
export const PERMISSION_FLAGS: ReadonlyArray<{
  flag: PermissionFlag;
  labelKey: string;
  color: 'warning' | 'error' | 'primary';
}> = [
  { flag: 'allowManagement', labelKey: 'server.admin.perm_manage', color: 'warning' },
  { flag: 'allowSongDeletion', labelKey: 'server.admin.perm_delete', color: 'error' },
  { flag: 'allowTabletopSaves', labelKey: 'server.admin.perm_tabletop_saves', color: 'primary' },
  {
    flag: 'allowTabletopTemplates',
    labelKey: 'server.admin.perm_tabletop_templates',
    color: 'primary',
  },
];

export const NO_PERMISSIONS: ApiKeyPermissions = {
  allowManagement: false,
  allowSongDeletion: false,
  allowTabletopSaves: false,
  allowTabletopTemplates: false,
};

/** Copies only the flags (an `ApiKey` also carries its token). */
export const pickPermissions = (source: ApiKeyPermissions): ApiKeyPermissions => ({
  allowManagement: source.allowManagement === true,
  allowSongDeletion: source.allowSongDeletion === true,
  allowTabletopSaves: source.allowTabletopSaves === true,
  allowTabletopTemplates: source.allowTabletopTemplates === true,
});
