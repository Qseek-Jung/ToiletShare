package com.toiletshare.app;

import android.app.Application;
import com.kakao.sdk.common.KakaoSdk;

public class GlobalApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize Kakao SDK
        KakaoSdk.init(this, "954f8caae336cb83506cad28e1de2e19");
    }
}
