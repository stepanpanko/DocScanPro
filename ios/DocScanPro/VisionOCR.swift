import Vision
import UIKit
import React
import ImageIO

extension CGImagePropertyOrientation {
  init(_ ui: UIImage.Orientation) {
    switch ui {
    case .up: self = .up
    case .down: self = .down
    case .left: self = .left
    case .right: self = .right
    case .upMirrored: self = .upMirrored
    case .downMirrored: self = .downMirrored
    case .leftMirrored: self = .leftMirrored
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}

@objc(VisionOCR)
class VisionOCR: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(recognize:resolver:rejecter:)
  func recognize(_ imagePath: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    func url(from path: String) -> URL? {
      if path.hasPrefix("file://") { return URL(string: path) }
      return URL(fileURLWithPath: path)
    }
    
    // Load image (normalize file URL vs plain path)
    guard let u = url(from: imagePath) else {
      reject("E_IMAGE_URL", "Invalid image path", nil)
      return
    }
    guard let image = UIImage(contentsOfFile: u.path) else {
      reject("E_IMAGE_LOAD", "Failed to load image at path: \(u.path)", nil)
      return
    }
    
    guard let cgImage = image.cgImage else {
      reject("E_IMAGE_CG", "Failed to get CGImage", nil)
      return
    }
    
    // Use pixel size with scale; avoid premature Int rounding
    let imgW = CGFloat(cgImage.width)
    let imgH = CGFloat(cgImage.height)
    
    // Create Vision request
    let request = VNRecognizeTextRequest { (request, error) in
      if let error = error {
        reject("E_VISION", "Vision failed: \(error.localizedDescription)", error)
        return
      }
      
      guard let observations = request.results as? [VNRecognizedTextObservation] else {
        reject("E_NO_RESULTS", "No text observations found", nil)
        return
      }
      
      var words: [[String: Any]] = []
      
      for observation in observations {
        guard let candidate = observation.topCandidates(1).first else { continue }
        let text = candidate.string
        
        // Vision uses normalized coordinates (0-1) with origin at bottom-left
        // We need pixel coordinates with origin at top-left
        let boundingBox = observation.boundingBox
        
        // Convert normalized (0-1) to pixels
        // keep as CGFloat, convert to Int only in payload
        let x = boundingBox.minX * imgW
        let y = (1.0 - boundingBox.maxY) * imgH // Flip Y axis
        let width = boundingBox.width * imgW
        let height = boundingBox.height * imgH
        
        words.append([
          "text": text,
          "x": Int(round(x)),
          "y": Int(round(y)),
          "width": Int(round(width)),
          "height": Int(round(height)),
          "conf": candidate.confidence
        ])
      }
      
      let result: [String: Any] = [
        "imgW": Int(imgW),
        "imgH": Int(imgH),
        "words": words
      ]
      
      resolve(result)
    }
    
    // Configure request
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    
    // Execute request
    DispatchQueue.global(qos: .userInitiated).async {
      let orientation = CGImagePropertyOrientation(image.imageOrientation)
      let handler = VNImageRequestHandler(cgImage: cgImage,
                                          orientation: orientation,
                                          options: [:])
      do {
        try handler.perform([request])
      } catch {
        DispatchQueue.main.async {
          reject("E_VISION_PERFORM", "Failed to perform Vision request: \(error.localizedDescription)", error)
        }
      }
    }
  }
}
