# Naveyo Documents

This local Expo module exposes one serializable operation:

```text
analyzeDocument(fileUri, { maxPages })
→ { extractedText, pagesAnalyzed, evidence[], draft }
```

The implementation reads embedded PDF text first, then runs Vision OCR only for pages without usable text. `NSDataDetector` extracts local addresses, dates and links; deterministic matching also records flight numbers. The returned `draft` always carries confirmation fields and is never persisted as a confirmed reservation by this module.

The current repository does not yet include `expo-modules-core` as a direct JavaScript dependency or a generated iOS development build. The adapter therefore resolves the native module through the runtime-provided `NaveyoDocuments` seam and fails explicitly when it is used outside an iOS development build. The next native build must install the local module pod and expose that runtime seam before device testing.
