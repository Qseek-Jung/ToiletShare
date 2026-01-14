import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toilet.korea',
  appName: '대똥단결',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    scheme: 'https'
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

  // ========================================
  // ROLLBACK: Uncomment below to switch back to remote web app mode
  // ========================================
  // server: {
  //   url: 'https://toiletshare.pages.dev',
  //   cleartext: true,
  //   androidScheme: 'https',
  //   allowNavigation: [
  //     "*.google.com",
  //     "*.googleapis.com",
  //     "*.naver.com",
  //     "*.kakao.com",
  //     "*.kakao.co.kr",
  //     "accounts.google.com"
  //   ]
  // },

  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "889382704312-kqfbm68u4c55f06lfn3sasc2aiiv3ceb.apps.googleusercontent.com",
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
