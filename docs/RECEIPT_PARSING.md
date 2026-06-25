# Receipt Parsing

> Read this when changing OCR/receipt parsing: the rule engine, detectors, or
> merchant-specific handling.

## Approach

- OCR output is processed with a **rule-based** approach. Parsing logic lives
  in `src/hooks/receipt-parsing/` (tests mirror it in
  `src/__tests__/hooks/receipt-parsing/`), ported 1:1 from `paperwork-app` —
  it's pure TypeScript with no native or UI dependency.
- The native capture pipeline (`src/hooks/scan/`) wraps the document scanner
  and OCR, adapts their output into this module's `TextElement[]` shape, and
  hands it to `extractReceiptInfo()` — this module has no knowledge of the
  camera, the OCR library, or the screen that calls it.
- Use **spatial analysis** (`utils/spatialAnalysis.ts`) to understand receipt
  structure (line positions, columns) rather than naive string scanning.
- Handle different receipt formats with dedicated **detection rules**
  (`rules/dateRules.ts`, `rules/totalRules.ts`, `rules/taxRules.ts`).
- Parse dates, totals, and tax amounts with **specialized detectors**
  (`dateDetection.ts`, `totalDetection.ts`, `taxDetection.ts`).

## Testing (non-negotiable for this domain)

- Every parsing change ships with a fixture-based regression test using a
  **real-world** receipt example, placed in
  `src/__tests__/hooks/receipt-parsing/`, with its OCR fixture data in
  `src/__tests__/mockData/`.
- Existing tests follow a `*Receipt.test.ts` naming pattern (e.g.
  `mcdonaldsReceipt.test.ts`) plus detector-level tests
  (`dateDetection.test.ts`, `totalDetection.test.ts`, `taxDetection.test.ts`,
  `ruleEngine.test.ts`). Read one before adding a new one.
- Use constants for domain values; no magic strings in detection logic.

The `add-receipt-rule` skill scaffolds a rule + its regression test.
