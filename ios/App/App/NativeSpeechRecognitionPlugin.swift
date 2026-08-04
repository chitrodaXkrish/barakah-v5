import Foundation
import Capacitor
import Speech
import AVFoundation

@objc(NativeSpeechRecognitionPlugin)
public class NativeSpeechRecognitionPlugin: CAPPlugin, SFSpeechRecognizerDelegate {
    
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private var activeCall: CAPPluginCall?
    
    @objc func start(_ call: CAPPluginCall) {
        let language = call.getString("language") ?? "en-US"
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: language))
        speechRecognizer?.delegate = self
        
        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            call.reject("Speech recognition is not available on this iOS device.")
            return
        }
        
        SFSpeechRecognizer.requestAuthorization { authStatus in
            DispatchQueue.main.async {
                switch authStatus {
                case .authorized:
                    self.requestMicrophonePermission(call)
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
    
    private func requestMicrophonePermission(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                if granted {
                    self.startRecording(call)
                } else {
                    call.reject("Microphone permission was denied.")
                }
            }
        }
    }
    
    private func startRecording(_ call: CAPPluginCall) {
        if audioEngine.isRunning {
            audioEngine.stop()
            recognitionRequest?.endAudio()
        }
        
        activeCall = call
        
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
        
        recognitionRequest.shouldReportPartialResults = false
        
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest, resultHandler: { result, error in
            var isFinal = false
            
            if let result = result {
                let text = result.bestTranscription.formattedString
                isFinal = result.isFinal
                if isFinal {
                    self.resolveActiveCall(["text": text])
                }
            }
            
            if error != nil || isFinal {
                self.audioEngine.stop()
                inputNode.removeTap(onBus: 0)
                
                self.recognitionRequest = nil
                self.recognitionTask = nil
                
                if let error = error {
                    // Ignore the user cancellation error
                    if (error as NSError).code != 207 {
                        self.rejectActiveCall("Could not transcribe audio: \(error.localizedDescription)")
                    }
                }
            }
        })
        
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { (buffer: AVAudioPCMBuffer, when: AVAudioTime) in
            self.recognitionRequest?.append(buffer)
        }
        
        audioEngine.prepare()
        
        do {
            try audioEngine.start()
        } catch {
            rejectActiveCall("Audio engine failed to start.")
        }
    }
    
    @objc func stop(_ call: CAPPluginCall) {
        if audioEngine.isRunning {
            audioEngine.stop()
            recognitionRequest?.endAudio()
            rejectActiveCall("Voice input stopped.")
        }
        call.resolve()
    }
    
    private func resolveActiveCall(_ data: [String: Any]) {
        if let call = activeCall {
            call.resolve(data)
            activeCall = nil
        }
    }
    
    private func rejectActiveCall(_ message: String) {
        if let call = activeCall {
            call.reject(message)
            activeCall = nil
        }
    }
}
