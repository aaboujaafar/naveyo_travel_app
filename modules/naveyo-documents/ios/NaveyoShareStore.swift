import Foundation

enum NaveyoShareStore {
  static let appGroupIdentifier = "group.com.naveyo.app"
  private static let directoryName = "pending-share-imports"

  static func saveFile(from sourceURL: URL, fileName: String, mimeType: String?) throws -> [String: Any] {
    let id = UUID().uuidString.lowercased()
    let destination = try directoryURL().appendingPathComponent("\(id)-\(safeFileName(fileName))")
    try FileManager.default.copyItem(at: sourceURL, to: destination)
    return try saveManifest(id: id, kind: "file", fileName: fileName, mimeType: mimeType, uri: destination.absoluteString, text: nil)
  }

  static func saveText(_ text: String, fileName: String?, mimeType: String?) throws -> [String: Any] {
    let id = UUID().uuidString.lowercased()
    let destination = try directoryURL().appendingPathComponent("\(id).txt")
    try Data(text.utf8).write(to: destination, options: .atomic)
    return try saveManifest(id: id, kind: "text", fileName: fileName, mimeType: mimeType, uri: destination.absoluteString, text: text)
  }

  static func list() -> [[String: Any]] {
    guard let directory = try? directoryURL(),
          let files = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) else { return [] }
    return files.filter { $0.pathExtension == "json" }.compactMap { url in
      guard let data = try? Data(contentsOf: url),
            let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
      return value
    }.sorted { ($0["createdAt"] as? String ?? "") > ($1["createdAt"] as? String ?? "") }
  }

  static func updateStatus(id: String, status: String, error: String? = nil) {
    guard let directory = try? directoryURL() else { return }
    let manifest = directory.appendingPathComponent("\(id).json")
    guard var value = try? JSONSerialization.jsonObject(with: (try? Data(contentsOf: manifest)) ?? Data()) as? [String: Any] else { return }
    value["status"] = status
    if let error { value["error"] = String(error.prefix(500)) } else { value.removeValue(forKey: "error") }
    if let data = try? JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .withoutEscapingSlashes]) {
      try? data.write(to: manifest, options: .atomic)
    }
  }

  static func remove(id: String) {
    guard let directory = try? directoryURL() else { return }
    let manifest = directory.appendingPathComponent("\(id).json")
    if let value = try? JSONSerialization.jsonObject(with: Data(contentsOf: manifest)) as? [String: Any],
       let uri = value["uri"] as? String,
       let fileURL = URL(string: uri) {
      try? FileManager.default.removeItem(at: fileURL)
    }
    try? FileManager.default.removeItem(at: manifest)
  }

  private static func saveManifest(id: String, kind: String, fileName: String?, mimeType: String?, uri: String, text: String?) throws -> [String: Any] {
    let value: [String: Any] = [
      "id": id,
      "kind": kind,
      "fileName": fileName ?? NSNull(),
      "mimeType": mimeType ?? NSNull(),
      "uri": uri,
      "text": text ?? NSNull(),
      "status": "new",
      "createdAt": ISO8601DateFormatter().string(from: Date())
    ]
    let data = try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .withoutEscapingSlashes])
    try data.write(to: try directoryURL().appendingPathComponent("\(id).json"), options: .atomic)
    return value
  }

  private static func directoryURL() throws -> URL {
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) else { throw ShareStoreError.appGroupUnavailable }
    let directory = container.appendingPathComponent(directoryName, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  private static func safeFileName(_ value: String) -> String {
    let name = URL(fileURLWithPath: value).lastPathComponent
    return name.isEmpty ? "shared-document" : name.replacingOccurrences(of: "/", with: "-")
  }
}

enum ShareStoreError: Error {
  case appGroupUnavailable
}
