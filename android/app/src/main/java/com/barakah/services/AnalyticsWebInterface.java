package com.barakah.services;

import android.content.Context;
import android.os.Bundle;
import android.webkit.JavascriptInterface;

import com.google.firebase.analytics.FirebaseAnalytics;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;

/**
 * AnalyticsWebInterface
 *
 * Bridges Firebase Analytics events from the Capacitor WebView (JavaScript)
 * to the native Android FirebaseAnalytics SDK.
 *
 * Registered in MainActivity as "AnalyticsWebInterface" so JavaScript can call:
 *   window.AnalyticsWebInterface.logEvent(name, jsonParams)
 *   window.AnalyticsWebInterface.setUserProperty(name, value)
 *
 * The JavaScript layer (src/lib/firebase.ts) checks for window.AnalyticsWebInterface
 * before calling and only uses this bridge on Android; it does NOT initialise the
 * Firebase Web JS SDK on Android to prevent duplicate events.
 *
 * See: https://firebase.google.com/docs/analytics/webview
 */
public class AnalyticsWebInterface {

    private final FirebaseAnalytics mAnalytics;

    public AnalyticsWebInterface(Context context) {
        mAnalytics = FirebaseAnalytics.getInstance(context);
    }

    /**
     * Called from JavaScript via window.AnalyticsWebInterface.logEvent(name, jsonString).
     *
     * @param name       Firebase Analytics event name (e.g. "screen_view", "login")
     * @param jsonParams JSON-encoded event parameters, e.g. {"firebase_screen":"Home"}
     */
    @JavascriptInterface
    public void logEvent(String name, String jsonParams) {
        if (name == null || name.isEmpty()) return;

        Bundle bundle = bundleFromJson(jsonParams);
        mAnalytics.logEvent(name, bundle);
    }

    /**
     * Called from JavaScript via window.AnalyticsWebInterface.setUserProperty(name, value).
     * Used to attach the Supabase user ID to analytics sessions.
     */
    @JavascriptInterface
    public void setUserProperty(String name, String value) {
        if (name == null || name.isEmpty()) return;
        mAnalytics.setUserProperty(name, value);
    }

    /**
     * Converts a JSON string into an Android Bundle for FirebaseAnalytics.
     * Handles String, Long (integers), and Double (floating point) values.
     */
    private Bundle bundleFromJson(String jsonParams) {
        Bundle bundle = new Bundle();
        if (jsonParams == null || jsonParams.isEmpty()) return bundle;

        try {
            JSONObject json = new JSONObject(jsonParams);
            Iterator<String> keys = json.keys();

            while (keys.hasNext()) {
                String key = keys.next();
                Object value = json.get(key);

                if (value instanceof String) {
                    bundle.putString(key, (String) value);
                } else if (value instanceof Integer) {
                    bundle.putLong(key, ((Integer) value).longValue());
                } else if (value instanceof Long) {
                    bundle.putLong(key, (Long) value);
                } else if (value instanceof Double) {
                    bundle.putDouble(key, (Double) value);
                } else if (value instanceof Boolean) {
                    // Firebase Analytics doesn't support boolean; convert to string
                    bundle.putString(key, value.toString());
                }
                // Nested objects/arrays are not supported by Firebase Analytics params;
                // skip them silently.
            }
        } catch (JSONException e) {
            // Malformed JSON — return empty bundle rather than crashing
        }

        return bundle;
    }
}
