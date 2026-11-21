import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personallearningos.app',
  appName: 'Personal Learning OS',
  webDir: 'out',
  android: { allowMixedContent: false, backgroundColor: '#0f172a' },
  server: { androidScheme: 'https' },
};
export default config;
