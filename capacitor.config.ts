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
      serverClientId: "GOOGLE_SERVER_CLIENT_ID_PLACEHOLDER",
      iosClientId: "GOOGLE_IOS_CLIENT_ID_PLACEHOLDER",
      forceCodeForRefreshToken: true
    },
    KakaoLogin: {
      kakaoAppKey: "KAKAO_APP_KEY_PLACEHOLDER"
    },
    CapacitorNaverLogin: {
      clientId: "NAVER_CLIENT_ID_PLACEHOLDER",
      clientSecret: "NAVER_CLIENT_SECRET_PLACEHOLDER",
      clientName: "대똥단결",
      urlScheme: "toiletsharenaver"
    }
  }
};

export default config;
