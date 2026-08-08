import Foundation
import UniformTypeIdentifiers
import UIKit

final class NaveyoShareViewController: UIViewController {
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    handleShare()
  }

  private func handleShare() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem else {
      finish()
      return
    }
    guard let provider = item.attachments?.first else {
      finish()
      return
    }

    let identifiers = provider.registeredTypeIdentifiers
    let preferred = identifiers.first { identifier in
      identifier == UTType.pdf.identifier || identifier == UTType.image.identifier || identifier == UTType.text.identifier || identifier == UTType.url.identifier
    } ?? identifiers.first
    guard let identifier = preferred else {
      finish()
      return
    }

    if identifier == UTType.pdf.identifier || identifier == UTType.image.identifier {
      provider.loadFileRepresentation(forTypeIdentifier: identifier) { [weak self] url, error in
        guard let self else { return }
        if let url, error == nil {
          do {
            _ = try NaveyoShareStore.saveFile(from: url, fileName: url.lastPathComponent, mimeType: identifier)
            self.openNaveyo()
          } catch {
            self.finish()
          }
        } else {
          self.loadText(provider: provider, identifier: identifier)
        }
      }
      return
    }
    loadText(provider: provider, identifier: identifier)
  }

  private func loadText(provider: NSItemProvider, identifier: String) {
    provider.loadItem(forTypeIdentifier: identifier, options: nil) { [weak self] item, error in
      guard let self, error == nil else { self?.finish(); return }
      let text: String?
      if let value = item as? String { text = value }
      else if let url = item as? URL { text = url.absoluteString }
      else if let data = item as? Data { text = String(data: data, encoding: .utf8) }
      else { text = nil }
      guard let text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        self.finish()
        return
      }
      do {
        _ = try NaveyoShareStore.saveText(text, fileName: nil, mimeType: identifier)
        self.openNaveyo()
      } catch {
        self.finish()
      }
    }
  }

  private func openNaveyo() {
    DispatchQueue.main.async {
      let url = URL(string: "naveyo:///imports")!
      self.extensionContext?.open(url) { [weak self] _ in self?.finish() }
    }
  }

  private func finish() {
    DispatchQueue.main.async { self.extensionContext?.completeRequest(returningItems: nil) }
  }
}
