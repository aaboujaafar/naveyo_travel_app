import ExpoModulesCore
import Foundation
import PDFKit
import UIKit
import Vision

#if canImport(FoundationModels)
import FoundationModels
#endif

public class NaveyoDocumentsModule: Module {
  private let maxBytes = 25 * 1024 * 1024
  private let maxPages = 50

  public func definition() -> ModuleDefinition {
    Name("NaveyoDocuments")

    AsyncFunction("analyzeDocument") { (fileUri: String, options: [String: Any]?) async throws -> [String: Any] in
      try await self.analyze(fileUri: fileUri, options: options)
    }

    AsyncFunction("listPendingShareImports") { () -> [[String: Any]] in
      NaveyoShareStore.list()
    }

    AsyncFunction("removePendingShareImport") { (id: String) in
      NaveyoShareStore.remove(id: id)
    }
  }

  private func analyze(fileUri: String, options: [String: Any]?) async throws -> [String: Any] {
    guard let url = URL(string: fileUri), url.isFileURL else { throw DocumentError.invalidUri }
    let values = try url.resourceValues(forKeys: [.fileSizeKey])
    guard let fileSize = values.fileSize, fileSize > 0, fileSize <= maxBytes else { throw DocumentError.fileTooLarge }

    let requestedPages = options?["maxPages"] as? Int ?? maxPages
    guard requestedPages > 0, requestedPages <= maxPages else { throw DocumentError.invalidPageLimit }

    let pageTexts: [(Int, String)]
    if let pdf = PDFDocument(url: url) {
      let pageCount = pdf.pageCount
      guard pageCount > 0, pageCount <= maxPages else { throw DocumentError.invalidPageLimit }
      let count = min(pageCount, requestedPages)
      pageTexts = try (0..<count).map { index in
        let page = pdf.page(at: index)
        let embedded = page?.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !embedded.isEmpty { return (index + 1, embedded) }
        guard let page, let image = page.thumbnail(of: CGSize(width: 1600, height: 2200), for: .mediaBox).cgImage else { return (index + 1, "") }
        return (index + 1, try recognizeText(image: image))
      }
    } else {
      guard let image = UIImage(contentsOfFile: url.path), let cgImage = image.cgImage else { throw DocumentError.unsupportedDocument }
      pageTexts = [(1, try recognizeText(image: cgImage))]
    }

    let fullText = pageTexts.map { $0.1 }.joined(separator: "\n")
    let evidence = detectEvidence(in: pageTexts)
    let fallbackDraft: [String: Any] = [
      "type": inferType(from: fullText),
      "title": title(from: fullText),
      "provider": provider(from: fullText),
      "reference": evidence.first(where: { $0["kind"] as? String == "flightNumber" })?["value"] as? String ?? NSNull(),
      "confidence": evidence.isEmpty ? "low" : "medium",
      "fieldsRequiringConfirmation": ["type", "title", "provider", "reference", "start", "end", "venue", "origin", "destination"]
    ]
    let draft = await LocalReservationExtractor.extract(text: fullText, fallback: fallbackDraft) ?? fallbackDraft
    return ["extractedText": String(fullText.prefix(20_000)), "pagesAnalyzed": pageTexts.count, "evidence": evidence, "draft": draft]
  }

  private func recognizeText(image: CGImage) throws -> String {
    var result = ""
    let request = VNRecognizeTextRequest { request, error in
      guard error == nil, let observations = request.results as? [VNRecognizedTextObservation] else { return }
      result = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    return result
  }

  private func detectEvidence(in pages: [(Int, String)]) -> [[String: Any]] {
    var result: [[String: Any]] = []
    let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.address.rawValue | NSTextCheckingResult.CheckingType.date.rawValue | NSTextCheckingResult.CheckingType.link.rawValue)
    for (page, text) in pages {
      detector?.enumerateMatches(in: text, range: NSRange(text.startIndex..., in: text)) { match, _, _ in
        guard let match else { return }
        let kind: String
        if match.resultType == .address { kind = "address" } else if match.resultType == .date { kind = "date" } else { kind = "text" }
        result.append(["kind": kind, "value": match.range.location == NSNotFound ? "" : (text as NSString).substring(with: match.range), "page": page])
      }
      let flightPattern = #"\b[A-Z]{2}\s?\d{1,4}\b"#
      if let regex = try? NSRegularExpression(pattern: flightPattern) {
        regex.enumerateMatches(in: text, range: NSRange(text.startIndex..., in: text)) { match, _, _ in
          guard let match else { return }
          result.append(["kind": "flightNumber", "value": (text as NSString).substring(with: match.range), "page": page])
        }
      }
    }
    return Array(result.prefix(200))
  }

  private func inferType(from text: String) -> String { text.range(of: #"\b(AF|BA|LH|KL|A3)\s?\d{1,4}\b"#, options: .regularExpression) != nil ? "flight" : "other" }
  private func title(from text: String) -> String { String(text.split(separator: "\n").first ?? "Document").prefix(120).description }
  private func provider(from text: String) -> String? { text.split(separator: "\n").first.map(String.init) }
}

private enum DocumentError: Error { case invalidUri, fileTooLarge, invalidPageLimit, unsupportedDocument }
