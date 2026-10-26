import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import App from './App';
import { ColorModeProvider } from './context/ColorModeProvider';
import { TitleProvider } from './context/TitleContext';
import { LayoutProvider } from './context/LayoutContext';
import { GameSettingsProvider } from './context/GameSettingsContext';
import { gameRegistry } from './lib/gameRegistry';
import { SettingsProvider } from './games/melodiq';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/figtree';
import './i18n';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-register service worker for PWA offline capabilities and update management
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('PWA update available, will refresh automatically.');
  },
  onOfflineReady() {
    console.log('PWA is ready to work offline.');
  },
});

import { SafeArea } from 'capacitor-plugin-safe-area';

const initSafeArea = async () => {
  try {
    const { insets } = await SafeArea.getSafeAreaInsets();
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
    }
    SafeArea.addListener('safeAreaChanged', (data) => {
      for (const [key, value] of Object.entries(data.insets)) {
        document.documentElement.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
      }
    });
  } catch (e) {
    console.warn('SafeArea plugin not available (probably running in browser)', e);
  }
};
initSafeArea();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ColorModeProvider>
        <CssBaseline />
        <SettingsProvider>
          <TitleProvider>
            <LayoutProvider>
              <GameSettingsProvider resolveGame={(path) => gameRegistry.findGameByPath(path)}>
                <React.Suspense fallback={null}>
                  <App />
                </React.Suspense>
              </GameSettingsProvider>
            </LayoutProvider>
          </TitleProvider>
        </SettingsProvider>
      </ColorModeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
