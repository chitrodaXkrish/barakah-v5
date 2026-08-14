iOS App Store Publish Checklist

1) Local prerequisites
- macOS with Xcode installed (latest stable Xcode).
- Apple Developer Team membership and account access.
- App Store Connect access for the app record.

2) Build & Signing
- Open `ios/App/App.xcodeproj` in Xcode.
- Set the target `Team` and ensure `Bundle Identifier` = `com.barakah.services`.
- In Signing & Capabilities, enable capabilities you need (Push, Associated Domains, Background Modes).
- Ensure `App.entitlements` is referenced by the target if you add Associated Domains.

- Run locally to update dependencies and iOS project:

```bash
npm install
npm run build
npx cap sync ios
```

3) Push Notifications (optional)
- Create an APNs key in Apple Developer and upload to your server or Firebase.
- Add "Push Notifications" capability and ensure the server stores device tokens.

4) OAuth
- Ensure Supabase contains `com.barakah.services://auth/callback` in allowed redirect URLs.
- For Google OAuth, add an iOS OAuth client with your bundle ID and the correct redirect URI.

5) Device Testing
- Build and run on a physical device.
- Test: OAuth cold/warm launches, local notifications, push (if enabled), speech recognition, camera, file uploads.

6) Archive & Upload
- Product → Archive. Use Organizer to upload to App Store Connect.
- Or use `xcodebuild archive` and `xcodebuild -exportArchive` with `exportOptions.plist`.

7) App Store Connect
- Create App record, fill metadata, privacy, screenshots, and App Privacy answers for microphone/camera/location.
- Submit to TestFlight, verify, and then submit for review.

Notes
- This repo includes `exportOptions.plist` at the project root for `xcodebuild` exports.
- The iOS SPM configuration includes Capacitor App, Browser, LocalNotifications, and Push packages.
- Some steps require Apple Developer console credentials which cannot be automated from this environment.
