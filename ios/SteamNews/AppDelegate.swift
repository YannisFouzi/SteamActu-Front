import UIKit
import UserNotifications
import React
import React_RCTLinking
import React_RCTAppDelegate
import ReactAppDependencyProvider
import RNBootSplash

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {
  private let iosNewsCategoryId = "steam_news_actions"
  private let unfollowActionId = "unfollow-game"

  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "SteamNews"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]
    configureNotificationActions()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

  override func customize(_ rootView: RCTRootView!) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }

  private func currentNotificationLanguage() -> String {
    let preferredLanguage =
      Bundle.main.preferredLocalizations.first ??
      Locale.preferredLanguages.first ??
      "fr"

    return preferredLanguage.lowercased().hasPrefix("en") ? "en" : "fr"
  }

  private func localizedUnfollowActionTitle() -> String {
    return currentNotificationLanguage() == "en"
      ? "Unfollow this game"
      : "Ne plus suivre ce jeu"
  }

  private func configureNotificationActions() {
    let unfollowAction = UNNotificationAction(
      identifier: unfollowActionId,
      title: localizedUnfollowActionTitle(),
      options: []
    )

    let newsCategory = UNNotificationCategory(
      identifier: iosNewsCategoryId,
      actions: [unfollowAction],
      intentIdentifiers: [],
      options: []
    )

    let center = UNUserNotificationCenter.current()
    center.delegate = self
    center.setNotificationCategories([newsCategory])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    guard response.actionIdentifier == unfollowActionId else {
      completionHandler()
      return
    }

    let userInfo = response.notification.request.content.userInfo

    // Extraire steamId et appId depuis le payload FCM
    // Les donnees FCM sont dans userInfo directement ou dans userInfo["data"]
    let steamId = userInfo["steamId"] as? String
      ?? (userInfo["data"] as? [String: Any])?["steamId"] as? String
    let appId = userInfo["appId"] as? String
      ?? (userInfo["data"] as? [String: Any])?["appId"] as? String

    guard let steamId = steamId, let appId = appId,
          !steamId.isEmpty, !appId.isEmpty else {
      NSLog("[FCM] iOS unfollow: steamId ou appId manquant dans le payload")
      completionHandler()
      return
    }

    NSLog("[FCM] iOS unfollow: steamId=%@, appId=%@", steamId, appId)

    #if DEBUG
    let baseUrl = "http://192.168.0.36:5000/api"
    #else
    let baseUrl = "https://steamactu-back-production.up.railway.app/api"
    #endif

    guard let url = URL(string: "\(baseUrl)/users/\(steamId)/follow/\(appId)") else {
      NSLog("[FCM] iOS unfollow: URL invalide")
      completionHandler()
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    request.timeoutInterval = 15

    let task = URLSession.shared.dataTask(with: request) { _, urlResponse, error in
      if let error = error {
        NSLog("[FCM] iOS unfollow erreur: %@", error.localizedDescription)
      } else if let httpResponse = urlResponse as? HTTPURLResponse {
        if (200...299).contains(httpResponse.statusCode) {
          NSLog("[FCM] iOS unfollow OK (status %d)", httpResponse.statusCode)
        } else {
          NSLog("[FCM] iOS unfollow echec (status %d)", httpResponse.statusCode)
        }
      }
      completionHandler()
    }
    task.resume()
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
