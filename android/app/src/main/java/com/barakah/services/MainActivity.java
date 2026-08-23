package com.barakah.services;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSpeechRecognitionPlugin.class);
        super.onCreate(savedInstanceState);

        // Register the Firebase Analytics ↔ WebView bridge.
        // JavaScript running in the Capacitor WebView can now call:
        //   window.AnalyticsWebInterface.logEvent(name, jsonParams)
        //   window.AnalyticsWebInterface.setUserProperty(name, value)
        // The JS side (src/lib/firebase.ts) checks for this object before calling
        // and skips the Firebase Web JS SDK on Android to prevent duplicate events.
        getBridge().getWebView().addJavascriptInterface(
            new AnalyticsWebInterface(this),
            "AnalyticsWebInterface"
        );
    }
}

