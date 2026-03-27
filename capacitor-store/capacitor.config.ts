import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.getmypro.store',
  appName: 'GetMyPro Store',
  webDir: '../dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1A5FB8',
      showSpinner: false
    }
  }
};

export default config;
