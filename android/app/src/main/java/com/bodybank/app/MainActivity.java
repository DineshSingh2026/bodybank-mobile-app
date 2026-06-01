package com.bodybank.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Auto-grant camera / microphone permissions when web content requests
        // them via navigator.mediaDevices.getUserMedia (e.g. the AI Trainer
        // live-camera flow). Without this override the WebView silently
        // denies, and the page falls through to its "Allow camera in browser
        // settings" error — which is misleading inside an app.
        //
        // The Android runtime permission (declared in AndroidManifest) is
        // still requested by the system the first time the camera is used,
        // so the end user remains in control.
        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }
        });
    }
}
