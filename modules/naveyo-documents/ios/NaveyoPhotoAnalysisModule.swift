import ExpoModulesCore
import Photos
import UIKit
import Vision

/// On-device reading and analysis of camera-roll photos for the travel album: nothing leaves the iPhone.
public class NaveyoPhotoAnalysisModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NaveyoPhotoAnalysis")

    /// Ids come in shooting order. For each photo: position, favourite, iOS burst, a
    /// small JPEG for display and, when asked, a Vision score and similarity group.
    /// Runs off the JavaScript thread, and never downloads from iCloud.
    AsyncFunction("readAlbumPhotos") { (ids: [String], analyze: Bool, similarity: Double) -> [[String: Any]] in
      let fetched = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
      var assets: [String: PHAsset] = [:]
      fetched.enumerateObjects { asset, _, _ in assets[asset.localIdentifier] = asset }

      let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("album-thumbnails", isDirectory: true)
      try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)

      var results: [[String: Any]] = []
      var previousPrint: VNFeaturePrintObservation?
      var group = 0
      for id in ids {
        guard let asset = assets[id] else { continue }
        var result: [String: Any] = ["id": id, "isFavorite": asset.isFavorite]
        if let location = asset.location {
          result["latitude"] = location.coordinate.latitude
          result["longitude"] = location.coordinate.longitude
        }
        if let burst = asset.burstIdentifier {
          result["burstId"] = burst
          result["burstPick"] = asset.burstSelectionTypes.contains(.userPick) || asset.burstSelectionTypes.contains(.autoPick)
        }

        guard let image = self.image(for: asset) else {
          previousPrint = nil
          results.append(result)
          continue
        }
        let file = folder.appendingPathComponent(self.fileName(for: id))
        if !FileManager.default.fileExists(atPath: file.path), let data = UIImage(cgImage: image).jpegData(compressionQuality: 0.8) {
          try? data.write(to: file)
        }
        result["thumbnailUri"] = file.absoluteString

        if analyze {
          let handler = VNImageRequestHandler(cgImage: image, options: [:])
          // Each request may be unsupported (e.g. on the simulator): the others still count.
          if #available(iOS 18.0, *) {
            let aesthetics = VNCalculateImageAestheticsScoresRequest()
            try? handler.perform([aesthetics])
            if let scores = aesthetics.results?.first {
              result["score"] = Double(scores.overallScore)
              result["utility"] = scores.isUtility
            }
          }
          let printRequest = VNGenerateImageFeaturePrintRequest()
          try? handler.perform([printRequest])
          if let print = printRequest.results?.first {
            var distance: Float = .greatestFiniteMagnitude
            if let previous = previousPrint { try? previous.computeDistance(&distance, to: print) }
            if Double(distance) > similarity { group += 1 }
            result["similarGroup"] = group
            previousPrint = print
          } else {
            previousPrint = nil
          }
        }
        results.append(result)
      }
      return results
    }
  }

  /// A 512 px rendering, local only: a photo kept in iCloud is skipped rather than downloaded.
  private func image(for asset: PHAsset) -> CGImage? {
    let options = PHImageRequestOptions()
    options.isSynchronous = true
    options.isNetworkAccessAllowed = false
    options.deliveryMode = .highQualityFormat
    options.resizeMode = .fast
    var result: CGImage?
    PHImageManager.default().requestImage(for: asset, targetSize: CGSize(width: 512, height: 512), contentMode: .aspectFit, options: options) { image, _ in
      result = image?.cgImage
    }
    return result
  }

  private func fileName(for id: String) -> String {
    let safe = id.map { $0.isLetter || $0.isNumber ? String($0) : "_" }.joined()
    return "\(safe).jpg"
  }
}
