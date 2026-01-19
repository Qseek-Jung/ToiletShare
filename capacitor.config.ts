import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toilet.korea',
  appName: '대똥단결',
  webDir: 'dist',
  // FIX: Webview background #38bdf8 to match splash (seamless startup)
  // Note: contentInset: 'never' in ios config prevents this blue from showing as gaps
  backgroundColor: "#38bdf8",
  ios: {
    // FIX: vital to prevent iOS from shifting content down when keyboard opens
    contentInset: 'never',
    // FIX: Use 'http' scheme (standard for Capacitor) - User must register 'http://localhost'
    scheme: 'http'
  },
  server: {
    allowNavigation: [
      "*.youtube.com",
      "*.ytimg.com",
      "www.youtube.com",
      "*.google.com",
      "*.googleapis.com"
    ]
  },

  plugins: {
    Keyboard: {
      // FIX: Prevent native scroll view resizing flickering
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      backgroundColor: "#38bdf8", // FIXED: Splash stays Blue
      launchShowDuration: 3000,
      launchAutoHide: true,
      androidStyleGravity: 'CENTER',
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "889382704312-28t3jni1q6qtsv3qo690ievb3u74v0n3.apps.googleusercontent.com",
      iosClientId: "889382704312-kqfbm68u4c55f06lfn3sasc2aiiv3ceb.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    KakaoLogin: {
      kakaoAppKey: "954f8caae336cb83506cad28e1de2e19"
    },
    CapacitorNaverLogin: {
      clientId: "44PTd3BMDQvsMLU_oLVy",
      clientSecret: "4mMuTwBFw1",
      clientName: "대똥단결",
      urlScheme: "toiletsharenaver"
    }
  }
};

export default config;
