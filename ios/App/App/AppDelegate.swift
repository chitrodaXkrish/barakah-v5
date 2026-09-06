import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let updateChecker = AppUpdateChecker()

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        DispatchQueue.main.async { [weak self] in
            self?.updateChecker.checkForUpdate()
        }
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        configuration.storyboard = UIStoryboard(name: "Main", bundle: nil)
        return configuration
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        updateChecker.checkForUpdate()
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}

private final class AppUpdateChecker {
    private let bundleIdentifier = "com.barakah.services"
    private let appStoreID = 6792232643
    private let appStoreURL = URL(string: "itms-apps://itunes.apple.com/app/id6792232643")!
    private var hasShownUpdatePrompt = false
    private var isChecking = false
    private var isPromptPending = false
    private var presentationRetryWorkItem: DispatchWorkItem?
    private var presentationRetryCount = 0
    private let maximumPresentationRetries = 20
    private let presentationRetryDelay: TimeInterval = 0.5

    func checkForUpdate() {
        guard !hasShownUpdatePrompt else { return }
        if isPromptPending {
            presentationRetryWorkItem?.cancel()
            presentationRetryWorkItem = nil
            presentationRetryCount = 0
            presentUpdateAlert()
            return
        }
        guard !isChecking else { return }
        guard let installedVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
              let installed = Version(installedVersion) else { return }

        isChecking = true
        let lookupURL = URL(string: "https://itunes.apple.com/lookup?id=\(appStoreID)")!
        var request = URLRequest(url: lookupURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 15

        URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
            guard let self else { return }

            let shouldPresent = Self.hasNewerVersion(
                in: data,
                than: installed,
                appStoreID: self.appStoreID,
                bundleIdentifier: self.bundleIdentifier
            )

            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                self.isChecking = false
                guard shouldPresent else { return }
                self.isPromptPending = true
                self.presentUpdateAlert()
            }
        }.resume()
    }

    private static func hasNewerVersion(in data: Data?, than installed: Version, appStoreID: Int, bundleIdentifier: String) -> Bool {
        guard let data,
              let response = try? JSONDecoder().decode(AppStoreLookupResponse.self, from: data),
              let results = response.results,
              let result = results.first(where: { $0.trackId == appStoreID && $0.bundleId == bundleIdentifier }),
              let storeVersion = Version(result.version) else { return false }

        return storeVersion > installed
    }

    private func presentUpdateAlert() {
        guard !hasShownUpdatePrompt, isPromptPending else { return }
        guard UIApplication.shared.applicationState == .active,
              let viewController = Self.topViewController(),
              viewController.viewIfLoaded?.window != nil else {
            schedulePresentationRetry()
            return
        }

        hasShownUpdatePrompt = true
        isPromptPending = false
        presentationRetryWorkItem?.cancel()
        presentationRetryWorkItem = nil
        presentationRetryCount = 0
        let alert = UIAlertController(
            title: "Update Available",
            message: "A new version of Barakah is available. Update now for the latest features and improvements.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Later", style: .cancel))
        alert.addAction(UIAlertAction(title: "Update", style: .default) { [appStoreURL] _ in
            UIApplication.shared.open(appStoreURL)
        })
        viewController.present(alert, animated: true)
    }

    private func schedulePresentationRetry() {
        guard !hasShownUpdatePrompt,
              isPromptPending,
              presentationRetryWorkItem == nil,
              presentationRetryCount < maximumPresentationRetries else { return }

        presentationRetryCount += 1
        let workItem = DispatchWorkItem { [weak self] in
            guard let self else { return }
            self.presentationRetryWorkItem = nil
            self.presentUpdateAlert()
        }
        presentationRetryWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + presentationRetryDelay, execute: workItem)
    }

    private static func topViewController(from viewController: UIViewController? = nil) -> UIViewController? {
        let rootViewController = viewController ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: { $0.isKeyWindow })?.rootViewController

        guard let rootViewController else { return nil }
        guard rootViewController.presentedViewController == nil else { return nil }
        if let navigationController = rootViewController as? UINavigationController {
            return topViewController(from: navigationController.visibleViewController)
        }
        if let tabBarController = rootViewController as? UITabBarController {
            return topViewController(from: tabBarController.selectedViewController)
        }
        return rootViewController
    }
}

private struct AppStoreLookupResponse: Decodable {
    let results: [AppStoreResult]?
}

private struct AppStoreResult: Decodable {
    let trackId: Int?
    let bundleId: String?
    let version: String

    enum CodingKeys: String, CodingKey {
        case trackId
        case bundleId
        case version
    }
}

private struct Version: Comparable {
    private let components: [Int]

    init?(_ value: String) {
        let parts = value.split(separator: ".")
        guard !parts.isEmpty else { return nil }

        var parsed: [Int] = []
        for part in parts {
            let numericPart = part.split(whereSeparator: { $0 == "-" || $0 == "(" }).first.map(String.init) ?? ""
            guard let number = Int(numericPart) else { return nil }
            parsed.append(number)
        }
        components = parsed
    }

    static func < (lhs: Version, rhs: Version) -> Bool {
        let count = max(lhs.components.count, rhs.components.count)
        for index in 0..<count {
            let left = index < lhs.components.count ? lhs.components[index] : 0
            let right = index < rhs.components.count ? rhs.components[index] : 0
            if left != right { return left < right }
        }
        return false
    }
}
