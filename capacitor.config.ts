import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toilet.korea',
  appName: '대똥단결',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    scheme: 'capacitor'
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
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "889382704312-28t3jni1q6qtsv3qo690ievb3u74v0n3.apps.googleusercontent.com",
      iosClientId: "889382704312-28t3jni1q6qtsv3qo690ievb3u74v0n3.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    KakaoLogin: {
      kakaoAppKey: "d5a9498cedf6ffb73e6d6ca18ac82abf"
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
