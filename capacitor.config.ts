import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'game.scopa.mobile',
  appName: 'Scopa',
  webDir: 'dist',
  backgroundColor: '#0f3d2a',
  ios: { contentInset: 'never' },
  android: { allowMixedContent: false },
};

export default config;
