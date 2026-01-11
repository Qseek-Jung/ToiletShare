import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toilet.korea',
  appName: '대똥단결',
  webDir: 'dist',
  ios: {
    contentInset: 'always'
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
      serverClientId: "889382704312-28t3jni1q6qtsv3qo690ievb3u74v0n3.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    KakaoLogin: {
      kakaoAppKey: "954f8caae336cb83506cad28e1de2e19"
    },
    CapacitorNaverLogin: {
      clientId: "44PTd3BMDQvsMLU_oLVy",
      clientSecret: "4mMuTwBFw1",
      clientName: "대똥단결",
      urlScheme: "naver44PTd3BMDQvsMLU_oLVy"
    }
  }
};

export default config;
