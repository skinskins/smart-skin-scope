import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monapp.mobile',
  appName: 'smart-skin-scope',
  webDir: 'dist',
  plugins: {
    HealthKit: {
      enabled: true
    }
  }
};

export default config;