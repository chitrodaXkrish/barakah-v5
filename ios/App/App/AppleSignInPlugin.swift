import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit

@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var currentCall: CAPPluginCall?
    private var rawNonce: String?

    @objc func authorize(_ call: CAPPluginCall) {
        self.currentCall = call

        let rawNonce = call.getString("nonce") ?? self.randomNonceString()
        self.rawNonce = rawNonce
        let hashedNonce = self.sha256(rawNonce)

        DispatchQueue.main.async {
            let appleIDProvider = ASAuthorizationAppleIDProvider()
            let request = appleIDProvider.createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = hashedNonce

            let authorizationController = ASAuthorizationController(authorizationRequests: [request])
            authorizationController.delegate = self
            authorizationController.presentationContextProvider = self
            authorizationController.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? UIWindow()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let currentCall = self.currentCall else { return }

        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
            guard let identityTokenData = appleIDCredential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                currentCall.reject("Unable to fetch identity token")
                return
            }

            var givenName: String? = nil
            var familyName: String? = nil

            if let nameComponents = appleIDCredential.fullName {
                givenName = nameComponents.givenName
                familyName = nameComponents.familyName
            }

            currentCall.resolve([
                "identityToken": identityToken,
                "rawNonce": self.rawNonce ?? "",
                "email": appleIDCredential.email ?? "",
                "givenName": givenName ?? "",
                "familyName": familyName ?? ""
            ])
        } else {
            currentCall.reject("Invalid credential type")
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let currentCall = self.currentCall else { return }
        let nsError = error as NSError
        if nsError.code == ASAuthorizationError.canceled.rawValue {
            currentCall.reject("User canceled Apple Sign In", "CANCELED")
        } else {
            currentCall.reject(error.localizedDescription)
        }
    }

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }
        return String(nonce)
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}
