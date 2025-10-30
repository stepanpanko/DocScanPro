import Foundation
import UIKit
import CoreImage
import React

@objc(ImageFilters)
class ImageFilters: NSObject {
    let ctx = CIContext(options: nil)

    private func ciFilterFor(filter: String, autoContrast: Bool) -> ([CIFilter]) {
        var filters: [CIFilter] = []
        
        // Auto adjust (exposure/contrast) if requested
        if autoContrast {
            // We'll approximate with CIExposureAdjust(0) + CIColorControls(contrast 1.1)
            if let c = CIFilter(name: "CIColorControls") {
                c.setValue(1.0, forKey: kCIInputSaturationKey)
                c.setValue(1.1, forKey: kCIInputContrastKey)
                filters.append(c)
            }
        }

        switch filter {
        case "grayscale":
            if let mono = CIFilter(name: "CIPhotoEffectMono") {
                filters.append(mono)
            }
        case "bw":
            // grayscale + simple threshold
            if let mono = CIFilter(name: "CIPhotoEffectMono") {
                filters.append(mono)
            }
            // emulate threshold via CIColorMatrix clamping
            if let m = CIFilter(name: "CIColorMatrix") {
                // Boost contrast-ish. This is a crude threshold; good enough for preview
                m.setValue(CIVector(x: 1.2, y: 1.2, z: 1.2, w: 0), forKey: "inputRVector")
                m.setValue(CIVector(x: 1.2, y: 1.2, z: 1.2, w: 0), forKey: "inputGVector")
                m.setValue(CIVector(x: 1.2, y: 1.2, z: 1.2, w: 0), forKey: "inputBVector")
                filters.append(m)
            }
        default:
            break
        }
        return filters
    }

    private func rotate(image: UIImage, degrees: Int) -> UIImage {
        guard degrees % 360 != 0 else { return image }
        let radians = CGFloat(degrees) * .pi / 180
        var newSize = CGRect(origin: .zero, size: image.size)
            .applying(CGAffineTransform(rotationAngle: radians)).integral.size
        // Keep scale
        newSize = CGSize(width: floor(newSize.width), height: floor(newSize.height))
        UIGraphicsBeginImageContextWithOptions(newSize, true, image.scale)
        guard let ctx = UIGraphicsGetCurrentContext() else { return image }
        ctx.translateBy(x: newSize.width/2, y: newSize.height/2)
        ctx.rotate(by: radians)
        image.draw(in: CGRect(x: -image.size.width/2, y: -image.size.height/2, width: image.size.width, height: image.size.height))
        let out = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return out ?? image
    }

    @objc(process:options:resolver:rejecter:)
    func process(_ src: String,
                 options: NSDictionary,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
        // options: { filter: string, rotation: number, autoContrast: bool }
        let filter = (options["filter"] as? String) ?? "color"
        let rotation = (options["rotation"] as? NSNumber)?.intValue ?? 0
        let autoC = (options["autoContrast"] as? NSNumber)?.boolValue ?? false

        guard let ui = UIImage(contentsOfFile: src) else {
            resolve(src) // fallback
            return
        }

        let rotated = rotate(image: ui, degrees: rotation)

        guard let input = CIImage(image: rotated) else {
            resolve(src)
            return
        }

        var current = input
        let fs = ciFilterFor(filter: filter, autoContrast: autoC)
        for f in fs {
            f.setValue(current, forKey: kCIInputImageKey)
            if let out = f.outputImage {
                current = out
            }
        }

        // Render to JPEG
        guard let cg = ctx.createCGImage(current, from: current.extent) else {
            resolve(src)
            return
        }
        let out = UIImage(cgImage: cg, scale: rotated.scale, orientation: .up)

        guard let data = out.jpegData(compressionQuality: 0.9) else {
            resolve(src)
            return
        }
        let outURL = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("preview-\(UUID().uuidString).jpg")
        do {
            try data.write(to: outURL, options: .atomic)
            resolve(outURL.path)
        } catch {
            resolve(src)
        }
    }

    @objc static func requiresMainQueueSetup() -> Bool { false }
}
