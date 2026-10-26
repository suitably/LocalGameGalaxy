/**
 * Where menus and popovers of the stage controls mount: inside the fullscreen element while the
 * stage is in native full screen (anything outside it is not shown), else the page body.
 */
export const overlayContainer = () =>
  (document.fullscreenElement as HTMLElement | null) ?? document.body;
