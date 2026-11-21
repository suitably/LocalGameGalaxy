/**
 * Which game-menu entries the running table shows in the global header, in order.
 * An entry is offered only when its view passes the callback (host-only entries stay off phones).
 */
export const HEADER_MENU_ENTRIES = [
  { key: 'onBackToLobby', labelKey: 'party.backToLobby' },
  { key: 'onOpenRules', labelKey: 'games.tabletop.rulesButton' },
  { key: 'onOpenSaves', labelKey: 'games.tabletop.saves.title' },
  { key: 'onOpenTableSettings', labelKey: 'games.tabletop.editor.table' },
  { key: 'onExportJson', labelKey: 'games.tabletop.export_json' },
  { key: 'onRestart', labelKey: 'games.tabletop.restart' },
] as const;

export type HeaderMenuKey = (typeof HEADER_MENU_ENTRIES)[number]['key'];

/** Keys of the entries whose callback is set, in menu order. */
export function headerMenuKeys(
  actions: Partial<Record<HeaderMenuKey, (() => void) | undefined>>,
): HeaderMenuKey[] {
  return HEADER_MENU_ENTRIES.filter(({ key }) => Boolean(actions[key])).map(({ key }) => key);
}
