package com.toiletshare.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.navercorp.nid.NaverIdLoginSDK;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize Naver Login SDK
        // Using resources from strings.xml
        NaverIdLoginSDK.INSTANCE.initialize(
                this,
                getString(R.string.naver_client_id),
                getString(R.string.naver_client_secret),
                getString(R.string.naver_client_name));

        // Log Kakao Key Hash
        // Kakao Hash debug removed for production flow
    }
}
