import Foundation

#if canImport(FoundationModels)
import FoundationModels

@available(iOS 26.0, *)
@Generable
private struct ReservationExtraction {
  @Guide(description: "Reservation kind: accommodation, flight, train, ferry, activity, or other.")
  var type: String
  @Guide(description: "A short human-readable title for the reservation.")
  var title: String
  @Guide(description: "The airline, hotel, rail operator, ferry company, or activity provider.")
  var provider: String
  @Guide(description: "The booking reference, confirmation code, or ticket number. Empty if absent.")
  var reference: String
  @Guide(description: "Start date and time exactly as printed, normalized to ISO-like local form YYYY-MM-DD or YYYY-MM-DDTHH:mm. Empty if absent.")
  var startLocal: String
  @Guide(description: "IANA timezone explicitly printed or safely inferable from the document. Empty if absent.")
  var startTimeZone: String
  @Guide(description: "End date and time exactly as printed, normalized to ISO-like local form YYYY-MM-DD or YYYY-MM-DDTHH:mm. Empty if absent.")
  var endLocal: String
  @Guide(description: "IANA timezone explicitly printed or safely inferable from the document. Empty if absent.")
  var endTimeZone: String
  @Guide(description: "Venue name and complete address. Empty if absent.")
  var venue: String
  @Guide(description: "Origin airport, station, or port. Empty if absent.")
  var origin: String
  @Guide(description: "Destination airport, station, or port. Empty if absent.")
  var destination: String
}
#endif

enum LocalReservationExtractor {
  static func extract(text: String, fallback: [String: Any]) async -> [String: Any]? {
    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return fallback }

    #if canImport(FoundationModels)
    if #available(iOS 26.0, *), SystemLanguageModel.default.isAvailable {
      do {
        let session = LanguageModelSession(instructions: """
          You extract travel reservation data from OCR text.
          Never invent a value. Return an empty string when the text does not contain the value.
          Preserve printed dates and times, and do not infer a timezone from the phone.
          Distinguish flight origin and destination from hotel or meeting addresses.
          The result is a draft only and always requires human confirmation.
          """)
        let response = try await session.respond(
          to: "Extract the reservation from this document text:\n\n\(String(text.prefix(16_000)))",
          generating: ReservationExtraction.self
        )
        return response.content.asDraft(fallback: fallback)
      } catch {
        return nil
      }
    }
    #endif

    return nil
  }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
private extension ReservationExtraction {
  func asDraft(fallback: [String: Any]) -> [String: Any] {
    var draft = fallback
    let normalizedType = ["accommodation", "flight", "train", "ferry", "activity", "other"].contains(type.lowercased()) ? type.lowercased() : nil
    setIfPresent(&draft, key: "type", value: normalizedType)
    setIfPresent(&draft, key: "title", value: title)
    setIfPresent(&draft, key: "provider", value: provider)
    setIfPresent(&draft, key: "reference", value: reference)
    setIfPresent(&draft, key: "venue", value: placeReference(venue))
    setIfPresent(&draft, key: "origin", value: placeReference(origin, kind: "origin"))
    setIfPresent(&draft, key: "destination", value: placeReference(destination, kind: "destination"))
    setIfPresent(&draft, key: "start", value: localDateTime(local: startLocal, timeZone: startTimeZone))
    setIfPresent(&draft, key: "end", value: localDateTime(local: endLocal, timeZone: endTimeZone.isEmpty ? startTimeZone : endTimeZone))
    draft["confidence"] = "high"
    draft["fieldsRequiringConfirmation"] = ["type", "title", "provider", "reference", "start", "end", "venue", "origin", "destination"]
    return draft
  }

  func setIfPresent(_ draft: inout [String: Any], key: String, value: Any?) {
    guard let value, !valueIsEmpty(value) else { return }
    draft[key] = value
  }

  func valueIsEmpty(_ value: Any) -> Bool {
    if let string = value as? String { return string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    return false
  }

  func localDateTime(local: String, timeZone: String) -> [String: String]? {
    guard !local.isEmpty, !timeZone.isEmpty else { return nil }
    return ["local": local, "timeZone": timeZone]
  }

  func placeReference(_ value: String, kind: String = "venue") -> [String: String]? {
    let cleaned = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cleaned.isEmpty else { return nil }
    return ["kind": kind, "label": cleaned]
  }
}
#endif
