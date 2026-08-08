import Foundation
import UniformTypeIdentifiers
import UIKit

final class NaveyoShareViewController: UIViewController {
  private let statusLabel = UILabel()
  private let openButton = UIButton(type: .system)
  private var didHandleShare = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    statusLabel.textAlignment = .center
    statusLabel.numberOfLines = 0
    statusLabel.text = "Préparation de l’import…"
    openButton.translatesAutoresizingMaskIntoConstraints = false
    openButton.setTitle("Ouvrir Naveyo", for: .normal)
    openButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    openButton.addTarget(self, action: #selector(openNaveyo), for: .touchUpInside)
    openButton.isHidden = true
    view.addSubview(statusLabel)
    view.addSubview(openButton)
    NSLayoutConstraint.activate([
      statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
      statusLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
      statusLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -24),
      openButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      openButton.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 20)
    ])
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    guard !didHandleShare else { return }
    didHandleShare = true
    handleShare()
  }

  private func handleShare() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let provider = item.attachments?.first else {
      showError()
      return
    }
    let identifiers = provider.registeredTypeIdentifiers
    let preferred = identifiers.first { identifier in
      identifier == UTType.pdf.identifier || identifier == UTType.image.identifier || identifier == UTType.text.identifier || identifier == UTType.url.identifier
    } ?? identifiers.first
    guard let identifier = preferred else {
      showError()
      return
    }

    if identifier == UTType.pdf.identifier || identifier == UTType.image.identifier {
      provider.loadFileRepresentation(forTypeIdentifier: identifier) { [weak self] url, error in
        guard let self else { return }
        if let url, error == nil {
          do {
            _ = try NaveyoShareStore.saveFile(from: url, fileName: url.lastPathComponent, mimeType: identifier)
            self.showReady()
          } catch {
            self.showError()
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
      guard let self, error == nil else { self?.showError(); return }
      let text: String?
      if let value = item as? String { text = value }
      else if let url = item as? URL { text = url.absoluteString }
      else if let data = item as? Data { text = String(data: data, encoding: .utf8) }
      else { text = nil }
      guard let text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        self.showError()
        return
      }
      do {
        _ = try NaveyoShareStore.saveText(text, fileName: nil, mimeType: identifier)
        self.showReady()
      } catch {
        self.showError()
      }
    }
  }

  private func showReady() {
    DispatchQueue.main.async {
      self.statusLabel.text = "Document enregistré dans Naveyo.\nOuvrez l’application pour choisir le Voyage et lancer l’analyse."
      self.openButton.isHidden = false
    }
  }

  private func showError() {
    DispatchQueue.main.async {
      self.statusLabel.text = "Impossible d’enregistrer ce document dans Naveyo."
    }
  }

  @objc private func openNaveyo() {
    DispatchQueue.main.async {
      let url = URL(string: "naveyo:///imports")!
      self.extensionContext?.open(url) { [weak self] opened in
        guard let self else { return }
        if opened {
          self.finish()
        } else {
          self.statusLabel.text = "Ouvrez Naveyo depuis l’écran d’accueil pour choisir le Voyage."
        }
      }
    }
  }

  private func finish() {
    DispatchQueue.main.async { self.extensionContext?.completeRequest(returningItems: nil) }
  }
}
