/**
 * Where menus and popovers of the stage controls mount: inside an element in native full screen
 * (anything outside it is not shown), else the page body. Immersive view puts the whole page in
 * full screen, so the body is inside it.
 */
export const overlayContainer = () => {
  const full = document.fullscreenElement as HTMLElement | null;
  return full && full !== document.documentElement ? full : document.body;
};
