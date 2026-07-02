import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.localgamegalaxy.melodiq',
  appName: 'Nexumia',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#121212",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#121212",
      overlaysWebView: false,
    }
  }
};

export default config;
