import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cafepos.app',
  appName: 'Cafe POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
