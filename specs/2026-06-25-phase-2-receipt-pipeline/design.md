# Design: Phase 2 — Receipt pipeline

Date: 2026-06-25
Status: Approved, pending implementation plan
Predecessor: Phase 1 (auth core), merged to `main`
Roadmap: [paperwork-app's specs/2026-06-24-paperwork-app-native-migration/design.md](https://github.com/HenryCordes/paperwork-app/blob/main/specs/2026-06-24-paperwork-app-native-migration/design.md)

## Problem

Phase 1 made the app usable (login, session, biometrics) but every feature
tab is still a placeholder. Receipt scanning is next per the roadmap — it's
the riskiest native subsystem (camera + document scanner + OCR), already
de-risked by the feasibility spike (crop/deskew confirmed working on a real
device; the only known issue, a document-scanner-plugin crash, was
simulator-specific). This phase promotes that validated approach to
production code in this repo.

## Scope

**In scope:**

- The native capture pipeline: document scanner (capture + crop/deskew) →
  OCR (text + bounding boxes) → file management (move scanned image to
  permanent storage with a generated filename).
- The full rule-based parsing engine (date/total/tax extraction), ported
  now even though no edit form consumes it yet — it's pure TypeScript with
  no native dependency, so there's no reason to gate it on Phase 4.
- A minimal real screen at the Kosten tab: scan → display extracted fields
  read-only. No editing, no save.
- `docs/RECEIPT_PARSING.md` and an `add-receipt-rule` skill for this repo —
  `AGENTS.md` already deferred these to "the phase that actually builds the
  rule engine in RN," which is this one.

**Out of scope, deferred to Phase 4:**

- The full Expense edit form (description, contact dropdown, manual
  field override, save-to-API) — Phase 4 builds this *on top of* the
  screen this phase produces, not from scratch.
- Document upload to the API (`/document` endpoint) — only meaningful once
  there's a save flow to attach it to.
- Tax-export filesystem usage — unrelated feature, not yet scheduled
  (carried over from Phase 1 design's follow-ups).

## Source behavior (what this phase ports)

Read from `paperwork-app`'s actual implementation:

- **Capture** (`useScan.ts`): `capacitor-document-scanner`, single document,
  saves to a native temp file.
- **OCR** (`useScan.ts`): `@capacitor-community/image-to-text`, returns text
  elements with coordinate bounds (`topLeft`/`topRight`/`bottomLeft`/`bottomRight`).
- **Preprocessing** (`receipt-parsing/preprocessing.ts`): cleans OCR text,
  detects European (comma) vs. US (period) decimal format, defaults to
  European.
- **Rule engine** (`receipt-parsing/rules/ruleEngine.ts`): per-field rule
  sets (date/total/tax) scored by priority (0–100) + confidence (0–1,
  weighted 30%), with a special "highest decimal value" boost (0.99) for
  total detection. Tabular BTW structure detection can emit both tax fields
  from one rule.
- **File management** (`useScan.ts`): moves the captured image to
  `Documents/Bonnen/bon_{sanitized_vendor}_{date}_{timestamp}.jpg`, deletes
  the original temp file (failure to delete is non-fatal).
- **Review UI** (`Edit/index.tsx`'s scan modal): shows the captured image,
  checkboxes for Datum/Totaalbedrag/BTW Laag 9%/BTW Hoog 21% (only shown if
  > 0), an "apply selected values" action, and a
  `"Geen gegevens gevonden — probeer opnieuw"` fallback when nothing is
  detected.

## Approach: faithful port for the pipeline, scoped-down UI

Native pipeline and parsing engine are ported faithfully, same as Phase 1's
auth core — no redesign without a concrete reason. The UI is intentionally
narrower than the source's: the source's scan flow feeds directly into an
edit form that doesn't exist here yet, so this phase's screen stops at
displaying parsed results, matching the Phase 4 boundary the roadmap already
draws.

Two decisions made during brainstorming, both because the parent migration
design left Phase 2's exact boundary with Phase 4 unstated:

- **Port the rule engine now, not in Phase 4.** It's pure, portable logic
  with its own fixture-based tests — porting it here keeps Phase 4's
  high-volume, subagent-dispatched screen work mechanical (pattern-following,
  no parsing-logic judgment calls mixed in), matching the migration design's
  token-economy strategy.
- **Replace the Kosten placeholder now, rather than building a throwaway
  debug screen.** Phase 4 extends this screen into the full edit form
  instead of starting over.

Library choices (`react-native-document-scanner-plugin`,
`@react-native-ml-kit/text-recognition`, `expo-file-system`) are already
locked in the migration design — not reopened here.

## File structure

| Source (paperwork-app) | This repo |
|---|---|
| `src/hooks/useScan.ts` | `src/hooks/scan/useScan.ts` — orchestrates the three services below |
| *(new)* | `src/hooks/scan/documentScanner.service.ts` — wraps `react-native-document-scanner-plugin` |
| *(new)* | `src/hooks/scan/ocr.service.ts` — wraps `@react-native-ml-kit/text-recognition`, adapts its result shape into the same `TextElement[]` (with bounding boxes) the parsing engine expects |
| *(new)* | `src/hooks/scan/fileManagement.service.ts` — wraps `expo-file-system`, same `Bonnen/` move-and-rename logic |
| `src/hooks/receipt-parsing/*` | same paths, same files — 1:1 mirror, pure logic unchanged |
| `src/__tests__/hooks/receipt-parsing/*Receipt.test.ts` | same paths — fixture tests ported |
| `src/pages/Expenses/Edit/index.tsx` (scan modal only) | `src/app/(drawer)/(tabs)/expenses.tsx` — replaces `PlaceholderScreen`, scan + read-only field display only |
| `docs/RECEIPT_PARSING.md` | same path, adapted to this repo's actual file layout |
| `.claude/skills/add-receipt-rule/` | same path, adapted paths |

## Data flow

User taps "Bon scannen" on the Kosten tab → `useScan().scan()` →
`documentScanner.service` captures + crops → `ocr.service` extracts text
elements → `receipt-parsing` engine selects best date/total/taxLow/taxHigh
per field → `fileManagement.service` moves the image to `Bonnen/` using the
parsed vendor/date for the filename → hook returns
`{ receiptInfo, imageUri }` → screen renders the image + extracted fields
read-only.

## Error handling

- Camera permission denied: Dutch message, no crash, no automatic retry.
- User cancels the scan: resolves to `null`, no error toast (not a failure).
- No fields detected: `"Geen gegevens gevonden — probeer opnieuw"`, ported
  verbatim, with a retry action.
- Unavailable on web: graceful degrade with a Dutch "niet beschikbaar"
  message — no dedicated web implementation, same precedent as Phase 1's
  biometrics (native module, no web equivalent).

## Testing

- `documentScanner.service`, `ocr.service`, `fileManagement.service`: unit
  tests mocking the native modules, same pattern as Phase 1's
  `biometrics.service.test.ts`.
- `receipt-parsing/*`: fixture-based regression tests ported from the
  source (real receipt mock data, asserted field-by-field).
- `useScan`: orchestration test mocking all three services + the parsing
  engine.
- `expenses.tsx`: RNTL test for the scan → display flow and the
  no-data-found path.
- No Detox/E2E this phase (Phase 6).

## Validation criteria

- Real-device test (per the migration design's post-Phase-2 dogfood
  checkpoint): scan an actual receipt on iPhone, confirm extracted
  date/total/tax match expectations and crop/deskew is visually correct.
- `npx tsc --noEmit` and `npm test` clean before any PR for this phase
  merges.

## Follow-ups (separate brainstorm/spec/plan cycles)

- Full Expense edit form + save-to-API + document upload (Phase 4).
- Tax-export filesystem usage (separate, not-yet-scheduled feature).
