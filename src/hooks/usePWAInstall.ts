import { useState, useEffect, useCallback } from 'react';

// Interface for BeforeInstallPromptEvent according to W3C Web App Manifest spec
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  isStandalone: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isInstalled: boolean;
  installApp: () => Promise<boolean>;
  showIOSGuide: boolean;
  setShowIOSGuide: (show: boolean) => void;
}

export const usePWAInstall = (): PWAInstallState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(isStandalone);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  const isIOS = typeof window !== 'undefined' &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window as unknown as { MSStream?: boolean }).MSStream;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('LocalGameGalaxy PWA was installed successfully.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (isIOS) {
      setShowIOSGuide(true);
      return false;
    }

    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error during PWA installation:', err);
      return false;
    }
  }, [deferredPrompt, isIOS]);

  return {
    isStandalone,
    isInstallable: !!deferredPrompt || (isIOS && !isStandalone),
    isIOS,
    isInstalled,
    installApp,
    showIOSGuide,
    setShowIOSGuide,
  };
};
