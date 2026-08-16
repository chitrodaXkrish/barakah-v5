import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override var preferredStatusBarStyle: UIStatusBarStyle {
        .lightContent
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AppleSignInPlugin())
        view.backgroundColor = UIColor(red: 0.47, green: 0.21, blue: 0.10, alpha: 1.0)
        webView?.backgroundColor = .clear
        webView?.isOpaque = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.minimumZoomScale = 1.0
        webView?.scrollView.maximumZoomScale = 1.0
        webView?.scrollView.bouncesZoom = false
    }
}
