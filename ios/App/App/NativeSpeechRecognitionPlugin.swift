import Foundation
import Capacitor
import Speech
import AVFoundation

@objc(NativeSpeechRecognitionPlugin)
public class NativeSpeechRecognitionPlugin: CAPPlugin, CAPBridgedPlugin, SFSpeechRecognizerDelegate {
    public let identifier = "NativeSpeechRecognitionPlugin"
    public let jsName = "NativeSpeechRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]
    
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private var activeCall: CAPPluginCall?
    private var isAudioTapInstalled = false
    private var latestTranscript = ""
    private var silenceFinishWorkItem: DispatchWorkItem?
    private var noSpeechWorkItem: DispatchWorkItem?
    
    @objc func start(_ call: CAPPluginCall) {
        if activeCall != nil {
            call.reject("Voice input is already active.")
            return
        }

        cleanupRecognition()
        let language = call.getString("language") ?? "en-US"
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: language))
        speechRecognizer?.delegate = self

        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            call.reject("Speech recognition is not available on this iOS device.")
            return
        }

        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                if !granted {
                    call.reject("Microphone permission was denied.")
                    return
                }

                SFSpeechRecognizer.requestAuthorization { authStatus in
                    DispatchQueue.main.async {
                        switch authStatus {
                        case .authorized:
                            self.startRecording(call)
                        case .denied:
                            call.reject("Speech recognition permission was denied.")
                        case .restricted:
                            call.reject("Speech recognition is restricted on this device.")
                        case .notDetermined:
                            call.reject("Speech recognition permission not determined.")
                        @unknown default:
                            call.reject("Unknown authorization status.")
                        }
                    }
                }
            }
        }
    }
    
    private func startRecording(_ call: CAPPluginCall) {
        activeCall = call
        latestTranscript = ""
        
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            rejectActiveCall("Failed to setup audio session.")
            return
        }
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        
        let inputNode = audioEngine.inputNode
        guard let recognitionRequest = recognitionRequest else {
            rejectActiveCall("Unable to create a recognition request.")
            return
        }
        
        recognitionRequest.shouldReportPartialResults = true
        
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest, resultHandler: { result, error in
            DispatchQueue.main.async {
                var isFinal = false

                if let result = result {
                    let text = result.bestTranscription.formattedString
                    self.latestTranscript = text
                    isFinal = result.isFinal
                    self.notifyListeners("speechResult", data: [
                        "text": text,
                        "isFinal": isFinal
                    ])

                    if isFinal {
                        self.resolveActiveCall(["text": text])
                    } else {
                        self.scheduleSilenceFinish()
                    }
                }

                if error != nil || isFinal {
                    if let error = error {
                        // Ignore the user cancellation error
                        if (error as NSError).code != 207 {
                            self.rejectActiveCall("Could not transcribe audio: \(error.localizedDescription)")
                        }
                    }
                    self.cleanupRecognition()
                }
            }
        })
        
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { (buffer: AVAudioPCMBuffer, when: AVAudioTime) in
            self.recognitionRequest?.append(buffer)
        }
        isAudioTapInstalled = true
        
        audioEngine.prepare()
        
        do {
            try audioEngine.start()
            scheduleNoSpeechTimeout()
        } catch {
            rejectActiveCall("Audio engine failed to start.")
        }
    }
    
    @objc func stop(_ call: CAPPluginCall) {
        let transcript = latestTranscript.trimmingCharacters(in: .whitespacesAndNewlines)

        if activeCall != nil {
            activeCall?.resolve(["text": transcript])
            activeCall = nil
        }

        cleanupRecognition()
        call.resolve(["text": transcript])
    }

    private func scheduleSilenceFinish() {
        silenceFinishWorkItem?.cancel()
        noSpeechWorkItem?.cancel()
        noSpeechWorkItem = nil

        let workItem = DispatchWorkItem { [weak self] in
            guard let self = self, self.activeCall != nil else { return }
            let transcript = self.latestTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
            if !transcript.isEmpty {
                self.resolveActiveCall(["text": transcript])
            }
        }

        silenceFinishWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: workItem)
    }

    private func scheduleNoSpeechTimeout() {
        noSpeechWorkItem?.cancel()

        let workItem = DispatchWorkItem { [weak self] in
            guard let self = self, self.activeCall != nil else { return }
            let transcript = self.latestTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
            if transcript.isEmpty {
                self.activeCall?.resolve(["text": ""])
                self.activeCall = nil
                self.cleanupRecognition()
            }
        }

        noSpeechWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: workItem)
    }
    
    private func resolveActiveCall(_ data: [String: Any]) {
        if let call = activeCall {
            call.resolve(data)
            activeCall = nil
        }
        cleanupRecognition()
    }
    
    private func rejectActiveCall(_ message: String) {
        if let call = activeCall {
            call.reject(message)
            activeCall = nil
        }
        cleanupRecognition()
    }

    private func cleanupRecognition() {
        silenceFinishWorkItem?.cancel()
        silenceFinishWorkItem = nil
        noSpeechWorkItem?.cancel()
        noSpeechWorkItem = nil
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        if isAudioTapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            isAudioTapInstalled = false
        }
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        latestTranscript = ""
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            // Ignore inactive-session cleanup failures.
        }
    }
}
