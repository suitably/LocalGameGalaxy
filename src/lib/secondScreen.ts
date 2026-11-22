/**
 * Second screen (TV) helpers [ID: LIB-SECOND-SCREEN]
 *
 * A TV shows a game by opening a screen URL in its own browser (smart-TV browser, laptop on
 * HDMI, second device), which joins the room over the network like any other client. The
 * W3C Presentation API is only an extra shortcut: desktop Chrome/Edge can cast any https page
 * to a Chromecast (1-UA mode); Chrome on Android only presents registered Cast receiver apps
 * and Android WebView (Capacitor) has no Presentation API, so both get the URL/QR flow only.
 * Background: docs/reports/2026-11-21-tv-second-screen.md.
 */
import { Capacitor } from '@capacitor/core';
import { PUBLIC_APP_URL } from './publicAppUrl';

/** Facts about the current runtime that decide how a TV can be reached. */
export interface ScreenPlatform {
  /** Capacitor app: its origin (`https://localhost`) is not reachable from a TV. */
  native: boolean;
  /** Android user agent (Chrome on Android cannot present arbitrary pages). */
  android: boolean;
  /** Phone or tablet: a second browser window would only be another tab on the same screen. */
  mobile: boolean;
  /** `window.PresentationRequest` exists. */
  hasPresentationApi: boolean;
  /** `window.location.origin` of this page. */
  origin: string;
}

/** Origin a TV can open: the hosted app for the native shell, else this page's origin. */
export function screenOrigin(platform: Pick<ScreenPlatform, 'native' | 'origin'>): string {
  return platform.native ? PUBLIC_APP_URL : platform.origin;
}

/** Absolute URL of an app route (`/games/...?...`) for a TV browser. */
export function buildScreenUrl(
  route: string,
  platform: Pick<ScreenPlatform, 'native' | 'origin'>,
): string {
  return `${screenOrigin(platform).replace(/\/+$/, '')}/${route.replace(/^\/+/, '')}`;
}

/** Whether casting through the Presentation API can work at all on this platform. */
export function canTryPresentation(platform: ScreenPlatform): boolean {
  return platform.hasPresentationApi && !platform.native && !platform.android;
}

/** Ways this device can put a screen URL on a TV, in the order the dialog offers them. */
export type ScreenOption = 'cast' | 'window' | 'share' | 'mirror';

/**
 * Which options the "Show on TV" dialog offers.
 * `mirrorSafe`: this device itself shows only public content (table-only host), so mirroring
 * the whole screen to the TV reveals nothing private.
 */
export function screenOptions(
  platform: ScreenPlatform,
  { canShare, mirrorSafe }: { canShare: boolean; mirrorSafe: boolean },
): ScreenOption[] {
  const options: ScreenOption[] = [];
  if (canTryPresentation(platform)) options.push('cast');
  if (!platform.native && !platform.mobile) options.push('window');
  if (canShare && (platform.native || platform.mobile)) options.push('share');
  if (mirrorSafe && (platform.native || platform.mobile)) options.push('mirror');
  return options;
}

/** Opens the screen URL in its own browser window (to drag onto a TV or second monitor). */
export function openScreenWindow(url: string): boolean {
  return window.open(url, 'nexumia-tv', 'popup,width=1280,height=720') !== null;
}

/** Reads the current runtime (browser only). */
export function currentScreenPlatform(): ScreenPlatform {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  return {
    native: Capacitor.isNativePlatform(),
    android: /Android/i.test(ua),
    mobile: /Android|iPhone|iPad|iPod|Mobi/i.test(ua),
    hasPresentationApi: typeof window !== 'undefined' && 'PresentationRequest' in window,
    origin: typeof window === 'undefined' ? '' : window.location.origin,
  };
}

interface MinimalPresentationRequest {
  start(): Promise<unknown>;
}
type PresentationRequestCtor = new (urls: string[]) => MinimalPresentationRequest;

/**
 * Starts casting `url` through the Presentation API (browser device picker).
 * Rejects when the API is missing, no screen is found or the user cancels.
 */
export async function presentOnScreen(url: string): Promise<void> {
  const Ctor = (window as unknown as { PresentationRequest?: PresentationRequestCtor })
    .PresentationRequest;
  if (!Ctor) throw new Error('Presentation API not available');
  await new Ctor([url]).start();
}
