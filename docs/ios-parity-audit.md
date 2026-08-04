# Android → iOS parity audit

Audited revision: `015a473` (2026-08-04). Android is the reference native
implementation. The full repository history contains six commits; Android-native
changes occurred in `d3d0e00` and `946b88b` (with later Android version bumps).

## Full history disposition

| Revision | Android-related change | iOS disposition |
| --- | --- | --- |
| `54d82dc` | Initial Android Capacitor shell, launch assets, FileProvider and baseline web app | The later iOS shell supplies the matching Capacitor app, launch screen, icon and WebKit behavior. FileProvider has no iOS analogue because no native file-URI share flow is used. |
| `d3d0e00` | Native speech recognizer, microphone/camera/location permissions, recognition-service query, branded dark/light splash and icon assets | Speech bridge is compiled and registered; iOS privacy strings and iOS launch/icon assets are present. Android's service query has no iOS analogue. |
| `946b88b` | Capacitor Local Notifications installation, exact-alarm permission, OAuth callback intent filter, version bump and shared application changes | iOS SPM now links Local Notifications, uses the same callback scheme, and consumes shared web changes unchanged. iOS has no exact-alarm permission. |
| `774d7a9` | Android version bump and shared feature/auth/location/notification improvements | Shared TypeScript applies to iOS. Version is aligned to Android's current `1.0.19`/`19`. |
| `73e6f5e` | Android version bump and shared app improvements | Shared TypeScript applies to iOS; no additional Android-native feature was introduced. |
| `015a473` | First iOS project addition | Corrected by the changes documented here: plugin target membership, generated iOS package dependencies, safe cold-launch OAuth handling, and release version alignment. |

## Android changes and iOS equivalents

| Android reference change | iOS parity result |
| --- | --- |
| `NativeSpeechRecognitionPlugin` and `MainActivity.registerPlugin` | The existing Swift implementation is now compiled into the App target and registered through its `CAP_PLUGIN` bridge. It requests Speech and microphone permission and reliably cleans up its audio tap/session. |
| `RECORD_AUDIO` permission | `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` are present. |
| Camera manifest permission for Halal Scanner | `NSCameraUsageDescription` is present. The scanner uses WebKit's standards-based camera picker/`getUserMedia`, which is the iOS equivalent. |
| Fine/coarse location permissions | `NSLocationWhenInUseUsageDescription` is present. WebKit supplies the runtime prompt; the app does not request background location, so no background entitlement or Always-and-When-In-Use key is required. |
| `SCHEDULE_EXACT_ALARM` plus Local Notifications plugin | `@capacitor/local-notifications` is now linked through iOS SPM. iOS does not have an exact-alarm permission; its persisted local notification schedules are the platform equivalent. |
| OAuth `singleTask` activity and `com.barakah.services://auth/callback` intent filter | The same URL scheme is registered in `Info.plist`; `AppDelegate` forwards URL opens to Capacitor; AuthContext now handles both `appUrlOpen` and cold-launch `getLaunchUrl()` callbacks. |
| Capacitor App and Browser plugins | Both are linked through iOS SPM. Browser closes after the OAuth callback. |
| Android version `1.0.19` / code `19` | iOS marketing version and build number are `1.0.19` / `19`. |
| Android splash and launcher assets | iOS has launch storyboard plus light/dark splash images and an App Store-sized app icon asset. |
| Android FileProvider | No equivalent is necessary: this app performs browser/WebKit file selection and Supabase uploads, not native file URI sharing. iOS security-scoped picker access is handled by WebKit. |

## Feature checklist

- [x] Supabase email/password auth session persistence
- [x] Google OAuth and Apple OAuth via Capacitor Browser
- [x] Custom URL callback, warm-start and cold-start callback handling
- [x] Browser close after auth callback
- [x] Local storage and Supabase Storage uploads
- [x] WebKit camera barcode scanning and camera privacy text
- [x] Foreground location and location privacy text
- [x] Local prayer notifications and permission prompt
- [x] Capacitor App lifecycle and deep-link delivery
- [x] Capacitor Browser, WebView, splash assets, safe-area-aware WebView configuration
- [x] Keyboard, status bar, and splash behavior use Capacitor's platform defaults; no Android-specific override is applied
- [x] App lifecycle background/foreground delivery through Capacitor App
- [x] Android behavior preserved (iOS-only native project/config changes)

## File-by-file feature parity matrix

| Feature | Android | iOS | Status | Files changed |
| --- | --- | --- | --- | --- |
| Application host | `MainActivity` is a `BridgeActivity`; registers the custom speech plugin before bridge creation. | `CAPBridgeViewController` is the storyboard root; `AppDelegate` forwards URL/universal-link events. The speech bridge is now part of the target and self-registers through `CAP_PLUGIN`. | Parity | `ios/App/App.xcodeproj/project.pbxproj`, `ios/App/App/AppDelegate.swift` |
| App lifecycle | Android relies on Capacitor `BridgeActivity` lifecycle dispatch; it has no custom pause/resume code. | iOS relies on the matching Capacitor bridge/AppDelegate lifecycle dispatch; it has no custom background work. | Parity | — |
| Deep-link activation | `singleTask` activity with browsable `com.barakah.services://auth/*` filter. | `CFBundleURLTypes` registers the same scheme; AppDelegate forwards URLs; JS handles foreground and cold-launch callbacks. | Parity | `src/contexts/AuthContext.tsx` |
| Universal links | No HTTPS app-link intent filter (`autoVerify=false`), asset-links file, or domain is configured. | No Associated Domains entitlement or AASA file is configured. AppDelegate has Capacitor's standard universal-link forwarder for future use. | Not implemented on Android; correctly not invented on iOS | — |
| Supabase OAuth | Shared code requests Google/Apple OAuth with native callback URL and opens Capacitor Browser. | Same shared flow; `getLaunchUrl()` covers an OAuth callback that starts a terminated iOS app. | Parity | `src/contexts/AuthContext.tsx` |
| Google Sign-In | OAuth in Capacitor Browser; no Google Sign-In SDK or Android client configuration is checked in. | Same OAuth flow; no Google Sign-In iOS SDK is required. Google Cloud/Supabase configuration remains a release prerequisite. | Parity | — |
| Apple Sign-In | Shared Supabase Apple OAuth browser flow. | Same flow. This is not native `ASAuthorizationAppleIDProvider` on either platform, preserving the Android behavior. | Parity | — |
| Capacitor App plugin | Declared in generated Gradle settings/build dependencies. | Declared in generated Swift Package dependencies. | Parity | `ios/App/CapApp-SPM/Package.swift` |
| Capacitor Browser plugin | Declared in generated Gradle settings/build dependencies; used for OAuth. | Declared in generated Swift Package dependencies; uses `SFSafariViewController` for OAuth and iOS external links. | Parity | `ios/App/CapApp-SPM/Package.swift`, `src/lib/externalUrl.ts` |
| External URLs | Existing Android `window.open` path opens Maps and livestream links. | iOS native opens Maps, livestream, news and Sunnah links with Capacitor Browser, avoiding WKWebView `_blank` inconsistencies. Android/browser code retains `window.open`. | Parity | `src/lib/externalUrl.ts`, `src/pages/Places.tsx`, `src/pages/MakkahLive.tsx`, `src/pages/NewsDetail.tsx`, `src/pages/HadithBook.tsx` |
| Speech recognition | Custom Java plugin checks microphone permission, uses `SpeechRecognizer`, returns `{ text }`, and cleans up. | Custom Swift plugin requests Speech + microphone permissions, uses `SFSpeechRecognizer`/`AVAudioEngine`, returns `{ text }`, and now cleans up taps, tasks and audio session safely. | Parity | `ios/App/App/NativeSpeechRecognitionPlugin.swift`, `ios/App/App/NativeSpeechRecognitionPlugin.m`, `ios/App/App.xcodeproj/project.pbxproj`, `src/components/ChatAssistant.tsx` |
| Microphone / speech permissions | `RECORD_AUDIO` manifest permission plus plugin runtime prompt. | `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`, with native runtime prompts. | Platform equivalent | Existing `ios/App/App/Info.plist` |
| Camera / barcode scanner | `CAMERA` manifest permission; shared `html5-qrcode` uses WebView camera access. | `NSCameraUsageDescription`; shared `html5-qrcode` uses WKWebView camera access. | Platform equivalent | Existing `ios/App/App/Info.plist` |
| Photos / image uploads | Shared HTML file inputs and Supabase Storage; no Android Camera/Filesystem plugin. | Same HTML file inputs and Supabase Storage, with photo library privacy text. | Parity | Existing `ios/App/App/Info.plist` |
| Filesystem / FileProvider | Android declares a FileProvider, but no checked-in code invokes it or a Filesystem/share plugin. | No FileProvider analogue is needed; WebKit's picker supplies scoped file access for the same HTML upload flow. | Platform equivalent; no unimplemented user feature | — |
| Location | Fine/coarse location permissions; shared browser Geolocation watcher and reverse geocoding. | When-in-use location privacy text; same WebKit Geolocation watcher and reverse geocoding. No platform requests background location. | Platform equivalent | Existing `ios/App/App/Info.plist` |
| Local notifications | Local Notifications Capacitor plugin plus Android exact-alarm permission; schedules repeating prayer alerts. | Same Capacitor plugin via SPM. iOS persists scheduled local alerts without an exact-alarm permission; the app schedules only ten notifications, well below iOS's 64 pending limit. | Platform equivalent | `ios/App/CapApp-SPM/Package.swift` |
| Push notifications | Gradle conditionally applies Google Services only if a missing `google-services.json` exists. No Push Notifications plugin, Firebase messaging dependency, token registration, notification receiver, or sender exists. | No APNs entitlement/plugin/token flow, matching the absence of an Android feature. | Not implemented on Android; requires separate product/backend work | — |
| Network / offline | `INTERNET` permission; shared fetches and local cache fallbacks. | HTTPS networking allowed by default under ATS; same shared fetch/cache behavior. No network plugin is used on Android. | Platform equivalent | — |
| WebView / safe area | Capacitor Android WebView fills the activity; no custom inset behavior. | Capacitor WebView fills the bridge controller; `contentInset: automatic` applies iOS safe-area behavior. Existing CSS uses safe-area environment variables where bottom sheets need them. | Platform equivalent | `capacitor.config.ts` |
| Keyboard / status bar | Android activity handles keyboard/configuration changes; no Capacitor Keyboard or Status Bar plugin configuration exists. | Capacitor's native default WebView/keyboard/status-bar behavior is retained; no unsupported Android-specific setting is applied. | Parity | — |
| Splash screen / icon | Android 12 splash theme with light/dark, portrait/landscape splash assets; adaptive/round icons. | LaunchScreen storyboard with light/dark splash assets and App Store icon asset. | Platform equivalent | Existing `ios/App/App/Base.lproj/LaunchScreen.storyboard`, `ios/App/App/Assets.xcassets` |
| Build identity / release version | Application ID `com.barakah.services`; version `1.0.19` / code `19`; min SDK 24. | Bundle ID `com.barakah.services`; marketing version `1.0.19` / build `19`; iOS deployment target 15. | Platform equivalent | `ios/App/App.xcodeproj/project.pbxproj` |
| Native dependencies | Gradle includes Capacitor core, App, Browser and Local Notifications. | Swift Package includes Capacitor core, App, Browser and Local Notifications. No Podfile is required because this project uses Capacitor 8 SPM. | Parity | `ios/App/CapApp-SPM/Package.swift` |
| Entitlements / background modes | No manifest service/receiver requires a corresponding Apple entitlement or background mode. | No entitlement or background mode is required for current foreground work and persisted local notifications. | Parity | — |

## Deliberately not added

- Remote push is not implemented by Android: there is no Push Notifications
  Capacitor plugin, FCM dependency, token registration, or server sender in the
  reference app. The optional `google-services.json` Gradle hook alone does not
  constitute push support. Adding APNs/FCM would require backend and Apple
  credentials, so it cannot truthfully be marked as Android parity.
- Universal links are also not implemented by Android. A custom OAuth scheme is
  the existing cross-platform behavior.
- There is no native Google Maps SDK usage; the app uses web URLs and Leaflet,
  so no Google Maps iOS SDK/API-key configuration is needed.
- No native filesystem download/share implementation exists on Android. Web
  file input, browser downloads, and Supabase Storage remain cross-platform.

## Files modified for parity

- `capacitor.config.ts` — iOS scheme and safe-area WebView policy.
- `src/contexts/AuthContext.tsx` — native OAuth cold-launch callback support.
- `src/components/ChatAssistant.tsx` — lets the native speech plugin own its
  required dual permission flow, matching Android's native implementation.
- `ios/App/App/NativeSpeechRecognitionPlugin.swift` — lifecycle-safe speech
  cleanup.
- `ios/App/App.xcodeproj/project.pbxproj` — compiles the Swift/Objective-C
  Capacitor speech bridge and aligns release versions.
- `ios/App/CapApp-SPM/Package.swift` — generated by Capacitor; links App,
  Browser, and Local Notifications iOS packages.
- `ios/App/App/AppDelegate.swift` — documents Capacitor as the URL/lifecycle
  dispatcher while retaining its URL and universal-link forwarding.
- `docs/ios-parity-audit.md` — audit, checklist, verification and manual setup.

## Manual release requirements

1. In Supabase Auth, allow `com.barakah.services://auth/callback` exactly.
2. Configure Google OAuth's iOS client/bundle ID and authorize the Supabase
   redirect URL in Google Cloud Console. Configure Apple Sign In and its return
   URL in Apple Developer and Supabase before enabling the Apple button.
3. Select the production Apple Team and provisioning profile in Xcode, verify
   the bundle ID `com.barakah.services`, and archive on a real device.
4. Test camera, location, speech recognition, and local notifications on a
   physical iPhone; the simulator cannot validate all of them.
5. If remote push or universal links are later introduced, add the Push
   Notifications/Associated Domains capabilities, APNs keys, `applinks:` domain,
   hosted `apple-app-site-association`, and the corresponding backend support.

## Verification performed

- `npm run build` passed.
- `npx cap sync ios` passed and found App, Browser, and Local Notifications.
- `plutil -lint ios/App/App/Info.plist` passed.
- `git diff --check` passed.
- Native compilation was not run because this environment has Command Line
  Tools only; `xcodebuild` requires a full Xcode installation. The required
  Xcode device/archive verification remains manual.
