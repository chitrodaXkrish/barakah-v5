package com.barakah.services;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSpeechRecognitionPlugin.class);
        super.onCreate(savedInstanceState);

        View rootView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, insets) -> {
            applyAndroidInsetsToWebView(insets);
            return insets;
        });
        ViewCompat.requestApplyInsets(rootView);
    }

    @Override
    public void onResume() {
        super.onResume();
        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            ViewCompat.requestApplyInsets(rootView);
        }
    }

    private void applyAndroidInsetsToWebView(WindowInsetsCompat windowInsets) {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        Insets navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
        Insets statusBars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
        float density = getResources().getDisplayMetrics().density;
        int navigationBottomCssPx = Math.round(navigationBars.bottom / density);
        int statusTopCssPx = Math.round(statusBars.top / density);

        String javascript =
            "(() => {" +
                "const root = document.documentElement;" +
                "root.style.setProperty('--android-navigation-bar-inset-bottom', '" + navigationBottomCssPx + "px');" +
                "root.style.setProperty('--android-status-bar-inset-top', '" + statusTopCssPx + "px');" +
                "window.dispatchEvent(new CustomEvent('barakah:android-insets', { detail: {" +
                    "navigationBottom: " + navigationBottomCssPx + "," +
                    "statusTop: " + statusTopCssPx +
                "} }));" +
            "})();";

        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(javascript, null));
    }
}
