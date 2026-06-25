# Phase 2: Receipt Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port paperwork-app's receipt-scan pipeline (document scanner + OCR + rule-based field extraction) to paperwork-app-native, and replace the Kosten tab's placeholder with a minimal scan-and-display screen.

**Architecture:** Three new native-wrapper services (`documentScanner.service`, `ocr.service`, `fileManagement.service`) under `src/hooks/scan/`, orchestrated by `useScan.ts`. The rule-based parsing engine (`src/hooks/receipt-parsing/`) is a verbatim, framework-agnostic port — zero native or React dependency, confirmed by inspecting every import in the source. `expenses.tsx` consumes `useScan()` and renders the result read-only.

**Tech Stack:** Expo, React Native, TypeScript, `react-native-document-scanner-plugin`, `@react-native-ml-kit/text-recognition`, `expo-file-system` (class-based `File`/`Directory`/`Paths` API, SDK 54+), Jest + React Native Testing Library.

## Global Constraints

- **Faithful port for the pipeline; scoped-down UI.** Per design.md: no edit form, no save-to-API in this phase — `expenses.tsx` displays scan results read-only. Phase 4 extends this screen.
- **The receipt-parsing engine is copied verbatim via `cp` from `paperwork-app`, not retyped.** Confirmed via `grep` that none of its 15 files import anything beyond their own siblings (no Capacitor, no React, no Ionic) — it is pure, portable logic. Retyping ~5,000 lines into this plan would add no value over citing the exact source path each step copies from. **Two exceptions, found during implementation, not during planning:** (1) `preprocessing.ts` and `rules/totalRules.ts` both import `src/utils/numberUtils.ts` — one level outside the `receipt-parsing/` folder, missed because the original verification only grepped for Capacitor/Ionic/React patterns, not all out-of-folder relative imports. That file is also a verbatim, zero-dependency copy (confirmed byte-identical to source, no imports of its own) and is now part of Task 1's file list below. (2) 4 of the 15 files (`preprocessing.ts`, `rules/dateRules.ts`, `rules/totalRules.ts`, `rules/taxRules.ts`) gate debug-only `console.log` calls behind `import.meta.env.VITE_APP_DEBUG_MODE` (11 occurrences total) — a Vite-specific syntax Jest's transform doesn't support, so the ported tests fail at runtime, not on an assertion. Task 1 now includes one mechanical substitution after copying: `import.meta.env.VITE_APP_DEBUG_MODE` → `process.env.EXPO_PUBLIC_APP_DEBUG_MODE`, the same Vite→Expo env-var convention swap Phase 1 already established for `VITE_PAPERWORK_API_URL` → `EXPO_PUBLIC_API_URL`. Behavior is identical (an env-gated debug-logging flag); only the access syntax changes.
- **`bridge.ts` and `useScanDocument.ts` are dead code — not ported.** `useScanDocument.ts` is a never-imported mock-data stub (confirmed: zero importers anywhere in `paperwork-app` besides itself); `bridge.ts` exists only to re-export for that dead hook. Porting either would be porting unreachable code.
- **The 18 ported fixture/detector tests use Vitest's `describe`/`it`/`expect` imported from `"vitest"`.** This repo's Jest exposes the same three as ambient globals (matching every existing test here, e.g. `secureStorage.test.ts`) — the only required edit is deleting the `vitest` import line per file.
- **Dutch user-facing text and Dutch number formatting, even where the source isn't.** `useScan.ts`'s OCR-failure messages are in English in the source (an inconsistency, not a deliberate behavior) and its scan-review modal uses bare `.toFixed(2)` (period decimal) rather than the Dutch comma-decimal format `AGENTS.md` mandates everywhere else. Both are corrected during the port, matching how Phase 1 chose `expo-secure-store` over replicating `localStorage`'s weaker security — a real improvement, not a faithful bug-for-bug copy, where this repo's own standard is stricter than the source.
- **Library APIs below are verified against current docs/source, not assumed.** Where a detail couldn't be confirmed (exact `cornerPoints` ordering, exact sync/async signatures on `expo-file-system`'s new classes), a verification checkpoint says so explicitly — same pattern Phase 1 used for `expo-local-authentication`.
- **No simulator/device launches as part of automated verification.** `npx tsc --noEmit` and `npm test` are the automated signal; the real-device scan test (design.md's validation criteria) is the user's call, done after this plan's tasks are merged.
- **No Claude/AI attribution** in any commit message.
- Never commit to `main`. Branch `phase-2-receipt-pipeline` already exists (created during brainstorming) — stay on it.
- Never push or open a PR without explicit user authorization.

## File structure (end state after this phase)

```
paperwork-app-native/
  src/
    hooks/
      receipt-parsing/            # ported verbatim from paperwork-app (15 files)
        preprocessing.ts          # imports ../../utils/numberUtils.ts - see below
        utils.ts
        taxDetection.ts
        types.ts
        index.ts
        dateDetection.ts
        totalDetection.ts
        utils/spatialAnalysis.ts
        rules/
          totalRules.ts
          types.ts
          dateRules.ts
          ruleEngine.ts
          conditionFactory.ts
          index.ts
          taxRules.ts
      scan/
        scan.types.ts              # ScanResult
        documentScanner.service.ts # react-native-document-scanner-plugin wrapper
        ocr.service.ts             # @react-native-ml-kit/text-recognition wrapper + adapter
        fileManagement.service.ts  # expo-file-system wrapper (Bonnen/ move+rename)
        useScan.ts                 # orchestrates the three services + receipt-parsing
    utils/
      numberUtils.ts                # ported verbatim - dependency of preprocessing.ts and rules/totalRules.ts, missed in the original plan (out-of-folder import)
      currency.ts                  # formatCurrency() - Dutch comma-decimal formatting
    app/
      (drawer)/(tabs)/
        expenses.tsx                # MODIFY: replaces PlaceholderScreen
    __tests__/
      hooks/
        receipt-parsing/            # ported, vitest import line stripped (18 files)
        scan/
          documentScanner.service.test.ts
          ocr.service.test.ts
          fileManagement.service.test.ts
          useScan.test.tsx
      mockData/                     # ported verbatim (11 *ReceiptMockData.ts files)
      utils/
        currency.test.ts
      app/(drawer)/(tabs)/
        expenses.test.tsx
  docs/
    RECEIPT_PARSING.md              # new, adapted from paperwork-app's doc
  .claude/
    skills/
      add-receipt-rule/
        SKILL.md                    # new, adapted from paperwork-app's skill
  AGENTS.md                         # MODIFY: documentation index gets a Receipt parsing row
  app.json                          # MODIFY: react-native-document-scanner-plugin config plugin
```

---

## Task 1: Port the receipt-parsing engine, its fixture tests, and mock data

**Files:**

- Create: `src/hooks/receipt-parsing/{preprocessing.ts,utils.ts,taxDetection.ts,types.ts,index.ts,dateDetection.ts,totalDetection.ts}`
- Create: `src/hooks/receipt-parsing/utils/spatialAnalysis.ts`
- Create: `src/hooks/receipt-parsing/rules/{totalRules.ts,types.ts,dateRules.ts,ruleEngine.ts,conditionFactory.ts,index.ts,taxRules.ts}`
- Create: `src/utils/numberUtils.ts` (dependency of `preprocessing.ts` and `rules/totalRules.ts`, one level outside `receipt-parsing/` — missed in the original file list, see Global Constraints)
- Create: `src/__tests__/mockData/{burgerKingReceiptMockData.ts,roccaReceiptMockData.ts,superNatuurReceiptMockData.ts,mcdonaldsReceiptMockData.ts,praxisReceiptMockData.ts,expertReceiptMockData.ts,kruidvatReceiptMockData.ts,artisjokReceiptMockData.ts,kwalitariaReceiptMockData.ts,albertHeijnXLReceiptMockData.ts,primeraReceiptMockData.ts}`
- Create: `src/__tests__/hooks/receipt-parsing/{mcdonaldsReceipt.test.ts,ruleEngine.test.ts,taxLineMatcher.test.ts,taxDetection.test.ts,expertReceipt.test.ts,dateDetection.test.ts,kwalitariaReceipt.test.ts,totalDetection.test.ts,artisjokReceipt.test.ts,praxisReceipt.test.ts,superNatuurReceipt.test.ts,brummensFriethuisReceipt.test.ts,primeraReceipt.test.ts,roccaReceipt.test.ts,kruitvatReceipt.test.ts,realWorldReceipt.test.ts,burgerKingReceipt.test.ts,albertHeijnXLReceipt.test.ts}`

**Interfaces:**

- Produces: `ReceiptInfo { date: Date; total: number; taxLow: number; taxHigh: number }` and `TextElement { text: string; topLeft?/topRight?/bottomLeft?/bottomRight?: [number, number] }` (`receipt-parsing/types.ts`); `extractReceiptInfo(elements: TextElement[], useRuleEngine = true, debugMode = false): ReceiptInfo` (`receipt-parsing/index.ts`, default `useRuleEngine = true`). Task 5 (`useScan`) consumes `extractReceiptInfo` and both types.

Every file here is copied byte-for-byte from `paperwork-app` — confirmed via `grep -rl -i -E "capacitor|ionic|from \"react|from 'react" src/hooks/receipt-parsing/` in `paperwork-app` returning no matches. The only files in the source `receipt-parsing/` folder NOT copied: `bridge.ts` (re-exports for a dead hook, see Global Constraints).

- [ ] **Step 1: Copy the engine source files verbatim**

```bash
cd /Users/henry/Projects/devartist/paperwork-app-native
mkdir -p src/hooks/receipt-parsing/rules src/hooks/receipt-parsing/utils

for f in preprocessing.ts utils.ts taxDetection.ts types.ts index.ts dateDetection.ts totalDetection.ts; do
  cp ../paperwork-app/src/hooks/receipt-parsing/"$f" src/hooks/receipt-parsing/"$f"
done

cp ../paperwork-app/src/hooks/receipt-parsing/utils/spatialAnalysis.ts \
   src/hooks/receipt-parsing/utils/spatialAnalysis.ts

for f in totalRules.ts types.ts dateRules.ts ruleEngine.ts conditionFactory.ts index.ts taxRules.ts; do
  cp ../paperwork-app/src/hooks/receipt-parsing/rules/"$f" src/hooks/receipt-parsing/rules/"$f"
done

# preprocessing.ts and rules/totalRules.ts both import this — one level
# outside receipt-parsing/, easy to miss with a folder-scoped grep.
cp ../paperwork-app/src/utils/numberUtils.ts src/utils/numberUtils.ts
```

- [ ] **Step 2: Copy mock data verbatim**

```bash
mkdir -p src/__tests__/mockData

for f in burgerKingReceiptMockData.ts roccaReceiptMockData.ts superNatuurReceiptMockData.ts \
         mcdonaldsReceiptMockData.ts praxisReceiptMockData.ts expertReceiptMockData.ts \
         kruidvatReceiptMockData.ts artisjokReceiptMockData.ts kwalitariaReceiptMockData.ts \
         albertHeijnXLReceiptMockData.ts primeraReceiptMockData.ts; do
  cp ../paperwork-app/src/__tests__/mockData/"$f" src/__tests__/mockData/"$f"
done
```

- [ ] **Step 3: Copy the fixture/detector tests and adapt them for Jest**

```bash
mkdir -p src/__tests__/hooks/receipt-parsing

for f in mcdonaldsReceipt.test.ts ruleEngine.test.ts taxLineMatcher.test.ts taxDetection.test.ts \
         expertReceipt.test.ts dateDetection.test.ts kwalitariaReceipt.test.ts totalDetection.test.ts \
         artisjokReceipt.test.ts praxisReceipt.test.ts superNatuurReceipt.test.ts \
         brummensFriethuisReceipt.test.ts primeraReceipt.test.ts roccaReceipt.test.ts \
         kruitvatReceipt.test.ts realWorldReceipt.test.ts burgerKingReceipt.test.ts \
         albertHeijnXLReceipt.test.ts; do
  cp ../paperwork-app/src/__tests__/hooks/receipt-parsing/"$f" src/__tests__/hooks/receipt-parsing/"$f"
done

# Jest provides describe/it/test/expect as ambient globals - drop the
# Vitest import line each copied file starts with.
for f in src/__tests__/hooks/receipt-parsing/*.test.ts; do
  sed -i '' '/^import.*from ["'"'"']vitest["'"'"'];\?$/d' "$f"
done
```

- [ ] **Step 3b: Swap the one Vite-specific debug flag for its Expo equivalent**

4 files reference `import.meta.env.VITE_APP_DEBUG_MODE` to gate debug-only `console.log` calls — a Vite-only syntax Jest can't transform, so the ported tests fail at runtime (not on an assertion) until this is fixed. Same env-var-convention swap Phase 1 already made for the API URL:

```bash
for f in src/hooks/receipt-parsing/preprocessing.ts \
         src/hooks/receipt-parsing/rules/dateRules.ts \
         src/hooks/receipt-parsing/rules/totalRules.ts \
         src/hooks/receipt-parsing/rules/taxRules.ts; do
  sed -i '' 's/import\.meta\.env\.VITE_APP_DEBUG_MODE/process.env.EXPO_PUBLIC_APP_DEBUG_MODE/g' "$f"
done

grep -rn "import.meta" src/hooks/receipt-parsing/ || echo "clean: no import.meta references remain"
```

Expected: the `grep` finds nothing (or prints the "clean" echo).

- [ ] **Step 4: Verify nothing was missed and every test passes unchanged**

```bash
grep -rl "vitest" src/__tests__/hooks/receipt-parsing/ || echo "clean: no vitest references remain"
npx tsc --noEmit
npm test -- receipt-parsing
```

Expected: the `grep` prints nothing (or the explicit "clean" echo if it exits non-zero on no match); `tsc` is clean; all 18 ported test files pass with no changes to their assertions — they test the engine against frozen fixture data, not live OCR output, so copying introduces no behavior change.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/receipt-parsing src/utils/numberUtils.ts src/__tests__/hooks/receipt-parsing src/__tests__/mockData
git commit -m "$(cat <<'EOF'
feat: port receipt-parsing rule engine from paperwork-app

Verbatim port - confirmed via grep that none of these 15 files import
anything beyond their own siblings (no Capacitor/Ionic/React), so this
is pure logic with zero native dependency. bridge.ts and
useScanDocument.ts are excluded: both are dead code in the source
(useScanDocument.ts has zero importers anywhere in paperwork-app).
The 18 ported tests needed one mechanical edit each - dropping the
Vitest import, since this repo's Jest exposes describe/it/expect as
globals already.
EOF
)"
```

---

## Task 2: `documentScanner.service` — capture + crop/deskew

**Files:**

- Create: `src/hooks/scan/documentScanner.service.ts`
- Create: `src/__tests__/hooks/scan/documentScanner.service.test.ts`
- Modify: `app.json`

**Interfaces:**

- Produces: `DocumentScanResult { imagePath: string }`, `scanDocument(): Promise<DocumentScanResult | null>` (`null` on user cancel or an empty result — not an error). Task 5 (`useScan`) consumes this exact signature.

API verified against [the package's README](https://github.com/WebsiteBeaver/react-native-document-scanner-plugin): `DocumentScanner.scanDocument(options?)` returns `Promise<{ scannedImages: string[], status: 'success' | 'cancel' }>`. `maxNumDocuments` is documented as **Android-only**.

**Verification checkpoint:** design.md calls for a distinct Dutch message on camera-permission denial, separate from the silent user-cancel path. The docs consulted don't say whether a denied permission surfaces as a rejected promise (caught by `useScan`'s generic Dutch error) or as `status: 'cancel'` (indistinguishable from a real cancel, so silent). Confirm which one during the design's on-device validation step; if it's the latter and a distinct message is genuinely needed, the fix is a platform permission pre-check here, not a redesign.

- [ ] **Step 1: Install the dependency and configure the Expo plugin**

```bash
npx expo install react-native-document-scanner-plugin
```

Add the plugin to `app.json`'s `plugins` array (after `"expo-secure-store"`), with a Dutch permission rationale:

```json
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ],
      "expo-secure-store",
      [
        "react-native-document-scanner-plugin",
        {
          "cameraPermission": "Paperwork heeft toegang tot je camera nodig om bonnen te kunnen scannen."
        }
      ]
    ],
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/hooks/scan/documentScanner.service.test.ts`:

```ts
import DocumentScanner from "react-native-document-scanner-plugin";

import { scanDocument } from "@/hooks/scan/documentScanner.service";

jest.mock("react-native-document-scanner-plugin", () => ({
  __esModule: true,
  default: { scanDocument: jest.fn() },
}));

describe("scanDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the first scanned image path on success", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: ["/tmp/scan1.jpg"],
      status: "success",
    });

    expect(await scanDocument()).toEqual({ imagePath: "/tmp/scan1.jpg" });
  });

  it("returns null when the user cancels", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: [],
      status: "cancel",
    });

    expect(await scanDocument()).toBeNull();
  });

  it("returns null if there are no scanned images despite a success status", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: [],
      status: "success",
    });

    expect(await scanDocument()).toBeNull();
  });

  it("passes maxNumDocuments: 1 to limit the capture to one document", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: ["/tmp/scan1.jpg"],
      status: "success",
    });

    await scanDocument();

    expect(DocumentScanner.scanDocument).toHaveBeenCalledWith({
      maxNumDocuments: 1,
    });
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- documentScanner.service
```

Expected: FAIL — `Cannot find module '@/hooks/scan/documentScanner.service'`.

- [ ] **Step 4: Implement**

Create `src/hooks/scan/documentScanner.service.ts`:

```ts
import DocumentScanner from "react-native-document-scanner-plugin";

export interface DocumentScanResult {
  imagePath: string;
}

export async function scanDocument(): Promise<DocumentScanResult | null> {
  // maxNumDocuments is Android-only per the library's docs - iOS's own
  // scanner UI already limits a session to one capture, ported from
  // paperwork-app's useScan.ts which sets the same option for the same
  // reason ("prevent multiple scans").
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    maxNumDocuments: 1,
  });

  if (status === "cancel" || scannedImages.length === 0) {
    return null;
  }

  return { imagePath: scannedImages[0] };
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- documentScanner.service
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Verify the native config**

```bash
npx expo prebuild --clean
```

Expected: completes without error; this confirms the plugin's config is well-formed. (Building/running on a real device is the user's call, per Global Constraints.)

- [ ] **Step 7: Commit**

```bash
git add app.json src/hooks/scan/documentScanner.service.ts src/__tests__/hooks/scan/documentScanner.service.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add documentScanner.service (react-native-document-scanner-plugin)

Wraps the validated capture+crop/deskew flow from the feasibility
spike as production code. maxNumDocuments: 1 is ported from
paperwork-app's useScan.ts unchanged - same single-capture intent,
though the library docs note this option is Android-only.
EOF
)"
```

---

## Task 3: `ocr.service` — text recognition + spatial adapter

**Files:**

- Create: `src/hooks/scan/ocr.service.ts`
- Create: `src/__tests__/hooks/scan/ocr.service.test.ts`

**Interfaces:**

- Consumes: `TextElement` (Task 1, `@/hooks/receipt-parsing/types`).
- Produces: `recognizeText(imagePath: string): Promise<TextElement[]>`. Task 5 (`useScan`) consumes this exact signature.

API verified against [the package's `index.ts`](https://github.com/a7medev/react-native-ml-kit/blob/main/text-recognition/index.ts): `TextRecognition.recognize(uri)` returns `{ text, blocks: TextBlock[] }`; each `TextBlock` has `lines: TextLine[]`; each `TextLine` has `text`, an optional `frame`, and an optional `cornerPoints: readonly [Point, Point, Point, Point]` where `Point = { x: number; y: number }`.

**Verification checkpoint:** the four `cornerPoints` are documented as a 4-tuple but their *order* isn't spelled out in the README. This implementation assumes the standard Android ML Kit convention — clockwise from top-left: `[topLeft, topRight, bottomRight, bottomLeft]`. Confirm this against a real scan during the design's on-device validation step; if the order is different, the fix is local to `toTextElement` below.

- [ ] **Step 1: Install the dependency**

```bash
npx expo install @react-native-ml-kit/text-recognition
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/hooks/scan/ocr.service.test.ts`:

```ts
import TextRecognition from "@react-native-ml-kit/text-recognition";

import { recognizeText } from "@/hooks/scan/ocr.service";

jest.mock("@react-native-ml-kit/text-recognition", () => ({
  __esModule: true,
  default: { recognize: jest.fn() },
}));

describe("recognizeText", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("flattens blocks/lines into TextElements with mapped corner points", async () => {
    (TextRecognition.recognize as jest.Mock).mockResolvedValue({
      text: "Totaal 12,50",
      blocks: [
        {
          text: "Totaal 12,50",
          lines: [
            {
              text: "Totaal 12,50",
              cornerPoints: [
                { x: 1, y: 2 },
                { x: 10, y: 2 },
                { x: 10, y: 5 },
                { x: 1, y: 5 },
              ],
            },
          ],
        },
      ],
    });

    expect(await recognizeText("/tmp/scan1.jpg")).toEqual([
      {
        text: "Totaal 12,50",
        topLeft: [1, 2],
        topRight: [10, 2],
        bottomLeft: [1, 5],
        bottomRight: [10, 5],
      },
    ]);
  });

  it("flattens multiple blocks and multiple lines per block, in order", async () => {
    (TextRecognition.recognize as jest.Mock).mockResolvedValue({
      text: "A B",
      blocks: [
        { text: "A", lines: [{ text: "A" }] },
        { text: "B", lines: [{ text: "B1" }, { text: "B2" }] },
      ],
    });

    const result = await recognizeText("/tmp/scan1.jpg");

    expect(result.map((e) => e.text)).toEqual(["A", "B1", "B2"]);
  });

  it("omits corner fields when a line has no cornerPoints", async () => {
    (TextRecognition.recognize as jest.Mock).mockResolvedValue({
      text: "x",
      blocks: [{ text: "x", lines: [{ text: "x" }] }],
    });

    expect(await recognizeText("/tmp/scan1.jpg")).toEqual([{ text: "x" }]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- ocr.service
```

Expected: FAIL — `Cannot find module '@/hooks/scan/ocr.service'`.

- [ ] **Step 4: Implement**

Create `src/hooks/scan/ocr.service.ts`:

```ts
import TextRecognition, {
  TextLine,
} from "@react-native-ml-kit/text-recognition";

import { TextElement } from "@/hooks/receipt-parsing/types";

function toTextElement(line: TextLine): TextElement {
  if (!line.cornerPoints) {
    return { text: line.text };
  }

  // Standard Android ML Kit order: clockwise from top-left. See this
  // file's verification checkpoint in the Phase 2 plan if a real scan
  // shows otherwise.
  const [topLeft, topRight, bottomRight, bottomLeft] = line.cornerPoints;

  return {
    text: line.text,
    topLeft: [topLeft.x, topLeft.y],
    topRight: [topRight.x, topRight.y],
    bottomLeft: [bottomLeft.x, bottomLeft.y],
    bottomRight: [bottomRight.x, bottomRight.y],
  };
}

export async function recognizeText(imagePath: string): Promise<TextElement[]> {
  const result = await TextRecognition.recognize(imagePath);
  return result.blocks.flatMap((block) => block.lines.map(toTextElement));
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- ocr.service
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/scan/ocr.service.ts src/__tests__/hooks/scan/ocr.service.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add ocr.service (@react-native-ml-kit/text-recognition)

Flattens ML Kit's block/line hierarchy into the flat TextElement[]
the ported receipt-parsing engine expects, mapping its cornerPoints
4-tuple onto our topLeft/topRight/bottomLeft/bottomRight fields - a
direct mapping, not an approximation, since ML Kit already returns
real corner points rather than an axis-aligned rect.
EOF
)"
```

---

## Task 4: `fileManagement.service` — move scan into permanent storage

**Files:**

- Create: `src/hooks/scan/fileManagement.service.ts`
- Create: `src/__tests__/hooks/scan/fileManagement.service.test.ts`

**Interfaces:**

- Consumes: `ReceiptInfo`, `TextElement` (Task 1).
- Produces: `moveScannedImage(sourcePath: string, textElements: TextElement[], receiptInfo: ReceiptInfo): Promise<string>` — returns the final `uri` on success, or `sourcePath` unchanged on web or if the move fails (non-fatal, matching the source's "continue with temp path if move fails"). Task 5 (`useScan`) consumes this exact signature.

API verified against [Expo's FileSystem docs](https://docs.expo.dev/versions/latest/sdk/filesystem/) (SDK 54+ class-based API): `Paths.document` is a `Directory`; `new Directory(parent, name)` / `directory.create({ intermediates: true })`; `new File(parent, name)` or `new File(uri)`; `file.move(destination: File | Directory): Promise<void>` (passing a `File` as the destination moves *and* renames in one call — no separate `.rename()` needed); `file.uri` reflects the post-move location.

**Verification checkpoint:** the docs consulted didn't confirm whether `directory.create()` is sync or returns a `Promise`. This implementation treats it as synchronous; if `tsc` or a real run disagrees, add an `await` — the fix is local to this one call.

- [ ] **Step 1: Install the dependency**

```bash
npx expo install expo-file-system
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/hooks/scan/fileManagement.service.test.ts`:

```ts
import { Platform } from "react-native";
import { Directory, File } from "expo-file-system";

import { moveScannedImage } from "@/hooks/scan/fileManagement.service";

jest.mock("expo-file-system", () => ({
  Paths: { document: "mock-document-dir" },
  Directory: jest.fn(),
  File: jest.fn(),
}));

const textElements = [{ text: "McDonald's Amersfoort" }];
const receiptInfo = {
  date: new Date("2026-06-25"),
  total: 12.5,
  taxLow: 0,
  taxHigh: 2.18,
};

describe("moveScannedImage", () => {
  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { get: () => "ios" });
  });

  it("moves the scanned file into the Bonnen directory and returns its uri", async () => {
    const move = jest.fn().mockResolvedValue(undefined);
    (File as unknown as jest.Mock).mockImplementation(() => ({
      move,
      uri: "file:///docs/Bonnen/bon_mcdonalds_amersfoort_20260625_123.jpg",
    }));
    (Directory as unknown as jest.Mock).mockImplementation(() => ({
      exists: false,
      create: jest.fn(),
    }));

    const result = await moveScannedImage(
      "/tmp/scan1.jpg",
      textElements,
      receiptInfo,
    );

    expect(move).toHaveBeenCalled();
    expect(result).toBe(
      "file:///docs/Bonnen/bon_mcdonalds_amersfoort_20260625_123.jpg",
    );
  });

  it("creates the Bonnen directory only if it doesn't already exist", async () => {
    const create = jest.fn();
    (File as unknown as jest.Mock).mockImplementation(() => ({
      move: jest.fn().mockResolvedValue(undefined),
      uri: "unused",
    }));
    (Directory as unknown as jest.Mock).mockImplementation(() => ({
      exists: true,
      create,
    }));

    await moveScannedImage("/tmp/scan1.jpg", textElements, receiptInfo);

    expect(create).not.toHaveBeenCalled();
  });

  it("returns the source path unchanged on web", async () => {
    Object.defineProperty(Platform, "OS", { get: () => "web" });

    const result = await moveScannedImage(
      "/tmp/scan1.jpg",
      textElements,
      receiptInfo,
    );

    expect(result).toBe("/tmp/scan1.jpg");
  });

  it("falls back to the source path if the move fails", async () => {
    (File as unknown as jest.Mock).mockImplementation(() => ({
      move: jest.fn().mockRejectedValue(new Error("disk full")),
      uri: "unused",
    }));
    (Directory as unknown as jest.Mock).mockImplementation(() => ({
      exists: true,
      create: jest.fn(),
    }));

    const result = await moveScannedImage(
      "/tmp/scan1.jpg",
      textElements,
      receiptInfo,
    );

    expect(result).toBe("/tmp/scan1.jpg");
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- fileManagement.service
```

Expected: FAIL — `Cannot find module '@/hooks/scan/fileManagement.service'`.

- [ ] **Step 4: Implement**

Create `src/hooks/scan/fileManagement.service.ts`:

```ts
import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";

import { ReceiptInfo, TextElement } from "@/hooks/receipt-parsing/types";

const RECEIPTS_DIRECTORY_NAME = "Bonnen";

// Ported from paperwork-app's useScan.ts: the vendor name is just the
// first OCR text element, not a detected "vendor" field - the source
// never built real vendor detection, and this filename is informational
// only (not parsed back), so that's preserved as-is.
function buildFileName(
  textElements: TextElement[],
  receiptInfo: ReceiptInfo,
): string {
  const vendor = textElements[0]?.text || "onbekend";
  const sanitizedVendor = vendor
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 30);

  const date = receiptInfo.date
    ? receiptInfo.date.toISOString().split("T")[0].replace(/-/g, "")
    : new Date().toISOString().split("T")[0].replace(/-/g, "");

  return `bon_${sanitizedVendor}_${date}_${Date.now()}.jpg`;
}

export async function moveScannedImage(
  sourcePath: string,
  textElements: TextElement[],
  receiptInfo: ReceiptInfo,
): Promise<string> {
  if (Platform.OS === "web") {
    return sourcePath;
  }

  try {
    const receiptsDir = new Directory(Paths.document, RECEIPTS_DIRECTORY_NAME);
    if (!receiptsDir.exists) {
      receiptsDir.create({ intermediates: true });
    }

    const destination = new File(
      receiptsDir,
      buildFileName(textElements, receiptInfo),
    );
    await new File(sourcePath).move(destination);

    return destination.uri;
  } catch {
    // Non-fatal, matching paperwork-app's useScan.ts: continue with the
    // original (temp) path rather than losing the scan over a storage error.
    return sourcePath;
  }
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- fileManagement.service
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/scan/fileManagement.service.ts src/__tests__/hooks/scan/fileManagement.service.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add fileManagement.service (expo-file-system)

Ports paperwork-app's Bonnen/-folder move-and-rename logic onto
expo-file-system's SDK 54+ class-based File/Directory API. A failed
move falls back to the original temp path, same non-fatal handling
as the source - losing the folder organization is preferable to
losing the scan.
EOF
)"
```

---

## Task 5: `useScan` — orchestration hook

**Files:**

- Create: `src/hooks/scan/scan.types.ts`
- Create: `src/hooks/scan/useScan.ts`
- Create: `src/__tests__/hooks/scan/useScan.test.tsx`

**Interfaces:**

- Consumes: `scanDocument` (Task 2), `recognizeText` (Task 3), `moveScannedImage` (Task 4), `extractReceiptInfo` (Task 1).
- Produces: `ScanResult { imageUri: string; receiptInfo: ReceiptInfo }` (`scan.types.ts`); `useScan()` returning `{ scan: () => Promise<ScanResult | null>, isScanning: boolean, scanError: string | null }`. Task 6 (`expenses.tsx`) consumes this exact shape.

- [ ] **Step 1: Create the result type (no test — pure type definition)**

Create `src/hooks/scan/scan.types.ts`:

```ts
import { ReceiptInfo } from "@/hooks/receipt-parsing/types";

export interface ScanResult {
  imageUri: string;
  receiptInfo: ReceiptInfo;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/hooks/scan/useScan.test.tsx`:

```tsx
import { renderHook, act } from "@testing-library/react-native";

import { useScan } from "@/hooks/scan/useScan";
import { scanDocument } from "@/hooks/scan/documentScanner.service";
import { recognizeText } from "@/hooks/scan/ocr.service";
import { moveScannedImage } from "@/hooks/scan/fileManagement.service";
import { extractReceiptInfo } from "@/hooks/receipt-parsing";

jest.mock("@/hooks/scan/documentScanner.service");
jest.mock("@/hooks/scan/ocr.service");
jest.mock("@/hooks/scan/fileManagement.service");
jest.mock("@/hooks/receipt-parsing", () => ({
  extractReceiptInfo: jest.fn(),
}));

describe("useScan", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the parsed receipt and the moved image uri on success", async () => {
    (scanDocument as jest.Mock).mockResolvedValue({
      imagePath: "/tmp/scan1.jpg",
    });
    (recognizeText as jest.Mock).mockResolvedValue([
      { text: "Totaal 12,50" },
    ]);
    (extractReceiptInfo as jest.Mock).mockReturnValue({
      date: new Date("2026-06-25"),
      total: 12.5,
      taxLow: 0,
      taxHigh: 2.18,
    });
    (moveScannedImage as jest.Mock).mockResolvedValue(
      "file:///Bonnen/bon.jpg",
    );

    const { result } = renderHook(() => useScan());

    let scanResult;
    await act(async () => {
      scanResult = await result.current.scan();
    });

    expect(scanResult).toEqual({
      imageUri: "file:///Bonnen/bon.jpg",
      receiptInfo: {
        date: new Date("2026-06-25"),
        total: 12.5,
        taxLow: 0,
        taxHigh: 2.18,
      },
    });
    expect(result.current.scanError).toBeNull();
    expect(result.current.isScanning).toBe(false);
  });

  it("returns null without an error when the user cancels", async () => {
    (scanDocument as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useScan());

    let scanResult;
    await act(async () => {
      scanResult = await result.current.scan();
    });

    expect(scanResult).toBeNull();
    expect(result.current.scanError).toBeNull();
  });

  it("sets a Dutch error message when OCR or parsing throws", async () => {
    (scanDocument as jest.Mock).mockResolvedValue({
      imagePath: "/tmp/scan1.jpg",
    });
    (recognizeText as jest.Mock).mockRejectedValue(new Error("ocr failed"));

    const { result } = renderHook(() => useScan());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanError).toBe(
      "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
    );
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- useScan
```

Expected: FAIL — `Cannot find module '@/hooks/scan/useScan'`.

- [ ] **Step 4: Implement**

Create `src/hooks/scan/useScan.ts`:

```ts
import { useCallback, useState } from "react";

import { scanDocument } from "./documentScanner.service";
import { recognizeText } from "./ocr.service";
import { moveScannedImage } from "./fileManagement.service";
import { extractReceiptInfo } from "@/hooks/receipt-parsing";
import { ScanResult } from "./scan.types";

export function useScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<ScanResult | null> => {
    setIsScanning(true);
    setScanError(null);

    try {
      const scanned = await scanDocument();
      if (!scanned) {
        // User cancelled - not a failure, nothing to report.
        return null;
      }

      const textElements = await recognizeText(scanned.imagePath);
      const receiptInfo = extractReceiptInfo(textElements);
      const imageUri = await moveScannedImage(
        scanned.imagePath,
        textElements,
        receiptInfo,
      );

      return { imageUri, receiptInfo };
    } catch {
      setScanError(
        "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
      );
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scan, isScanning, scanError };
}

export default useScan;
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- useScan
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/scan/scan.types.ts src/hooks/scan/useScan.ts src/__tests__/hooks/scan/useScan.test.tsx
git commit -m "$(cat <<'EOF'
feat: add useScan orchestration hook

Ports paperwork-app's useScan.ts capture -> OCR -> parse -> file-move
sequence over the three new service wrappers. One deliberate behavior
change: OCR/parsing failures now surface a single Dutch message
(the source mixes English and Dutch across its error paths) - the
minimal scan screen this phase ships has one error state regardless
of which step failed, so a single message is what's actually shown.
EOF
)"
```

---

## Task 6: `expenses.tsx` — replace the Kosten placeholder

**Files:**

- Create: `src/utils/currency.ts`
- Create: `src/__tests__/utils/currency.test.ts`
- Modify: `src/app/(drawer)/(tabs)/expenses.tsx`
- Create: `src/__tests__/app/(drawer)/(tabs)/expenses.test.tsx`

**Interfaces:**

- Produces: `formatCurrency(value: number): string` (Dutch comma-decimal, two fixed decimals). Used by this screen now; every future money-displaying screen (Phase 4's Expenses/Invoices/Taxes, Phase 3's Dashboard) reuses it rather than re-deriving Dutch formatting per-screen.
- Consumes: `useScan()` (Task 5), `formatCurrency` (this task), `Colors`/`Spacing` (Phase 0's `theme.ts`).

The source's scan-review modal displays amounts with bare `.toFixed(2)` (period decimal) — a gap against this repo's own "Dutch format everywhere" rule (`AGENTS.md`), not a behavior worth preserving. `formatCurrency` closes it from this screen's first use, rather than copying the gap forward.

- [ ] **Step 1: Write the failing currency tests**

Create `src/__tests__/utils/currency.test.ts`:

```ts
import { formatCurrency } from "@/utils/currency";

describe("formatCurrency", () => {
  it("formats with a comma decimal separator", () => {
    expect(formatCurrency(12.5)).toBe("12,50");
  });

  it("formats whole numbers with two decimals", () => {
    expect(formatCurrency(0)).toBe("0,00");
  });

  it("uses a period thousands separator above 1000", () => {
    expect(formatCurrency(1234.5)).toBe("1.234,50");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- currency
```

Expected: FAIL — `Cannot find module '@/utils/currency'`.

- [ ] **Step 3: Implement**

Create `src/utils/currency.ts`:

```ts
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- currency
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing screen test**

Create `src/__tests__/app/(drawer)/(tabs)/expenses.test.tsx`:

```tsx
import { render, fireEvent } from "@testing-library/react-native";

import Expenses from "@/app/(drawer)/(tabs)/expenses";
import { useScan } from "@/hooks/scan/useScan";

jest.mock("@/hooks/scan/useScan");

describe("Expenses (Kosten) screen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the extracted fields after a successful scan", async () => {
    const scan = jest.fn().mockResolvedValue({
      imageUri: "file:///Bonnen/bon.jpg",
      receiptInfo: {
        date: new Date("2026-06-25"),
        total: 12.5,
        taxLow: 0,
        taxHigh: 2.18,
      },
    });
    (useScan as jest.Mock).mockReturnValue({
      scan,
      isScanning: false,
      scanError: null,
    });

    const { findByText, getByText } = render(<Expenses />);
    fireEvent.press(getByText("Bon scannen"));

    expect(await findByText(/Totaalbedrag: €12,50/)).toBeTruthy();
    expect(await findByText(/BTW Hoog \(21%\): €2,18/)).toBeTruthy();
  });

  it("hides a tax field when it's zero", async () => {
    const scan = jest.fn().mockResolvedValue({
      imageUri: "file:///Bonnen/bon.jpg",
      receiptInfo: {
        date: new Date("2026-06-25"),
        total: 12.5,
        taxLow: 0,
        taxHigh: 2.18,
      },
    });
    (useScan as jest.Mock).mockReturnValue({
      scan,
      isScanning: false,
      scanError: null,
    });

    const { findByText, queryByText, getByText } = render(<Expenses />);
    fireEvent.press(getByText("Bon scannen"));

    await findByText(/Totaalbedrag/);
    expect(queryByText(/BTW Laag/)).toBeNull();
  });

  it("shows the Dutch error message when scanning fails", async () => {
    const scan = jest.fn().mockResolvedValue(null);
    (useScan as jest.Mock).mockReturnValue({
      scan,
      isScanning: false,
      scanError:
        "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
    });

    const { findByText, getByText } = render(<Expenses />);
    fireEvent.press(getByText("Bon scannen"));

    expect(
      await findByText(
        "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
      ),
    ).toBeTruthy();
  });

  it("disables the scan button while scanning", () => {
    (useScan as jest.Mock).mockReturnValue({
      scan: jest.fn(),
      isScanning: true,
      scanError: null,
    });

    const { getByText } = render(<Expenses />);

    expect(getByText("Bon scannen...")).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

```bash
npm test -- expenses
```

Expected: FAIL — `Cannot find module '@/app/(drawer)/(tabs)/expenses'` (the placeholder import doesn't export the fields these tests render).

- [ ] **Step 7: Implement**

Replace `src/app/(drawer)/(tabs)/expenses.tsx`:

```tsx
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useScan } from "@/hooks/scan/useScan";
import { ScanResult } from "@/hooks/scan/scan.types";
import { formatCurrency } from "@/utils/currency";
import { Colors, Spacing } from "@/constants/theme";

export default function Expenses() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { scan, isScanning, scanError } = useScan();
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    const scanResult = await scan();
    setResult(scanResult);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleScan}
        disabled={isScanning}
      >
        <Text style={styles.buttonText}>
          {isScanning ? "Bon scannen..." : "Bon scannen"}
        </Text>
      </Pressable>

      {scanError ? (
        <Text style={[styles.message, { color: colors.text }]}>
          {scanError}
        </Text>
      ) : null}

      {result ? (
        <View style={styles.resultCard}>
          <Image source={{ uri: result.imageUri }} style={styles.preview} />
          <Text style={{ color: colors.text }}>
            Datum: {result.receiptInfo.date.toLocaleDateString("nl-NL")}
          </Text>
          <Text style={{ color: colors.text }}>
            Totaalbedrag: €{formatCurrency(result.receiptInfo.total)}
          </Text>
          {result.receiptInfo.taxLow > 0 ? (
            <Text style={{ color: colors.text }}>
              BTW Laag (9%): €{formatCurrency(result.receiptInfo.taxLow)}
            </Text>
          ) : null}
          {result.receiptInfo.taxHigh > 0 ? (
            <Text style={{ color: colors.text }}>
              BTW Hoog (21%): €{formatCurrency(result.receiptInfo.taxHigh)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!result && !scanError && !isScanning ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Scan een bon om de gegevens automatisch te herkennen.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  message: {
    textAlign: "center",
  },
  resultCard: {
    width: "100%",
    gap: Spacing.two,
    alignItems: "center",
  },
  preview: {
    width: 200,
    height: 260,
    borderRadius: 8,
  },
});
```

- [ ] **Step 8: Run to verify it passes**

```bash
npm test -- expenses
```

Expected: PASS, 4 tests.

- [ ] **Step 9: Run the full suite and typecheck**

```bash
npx tsc --noEmit
npm test
```

Expected: both clean — this is the first task that integrates every piece from Tasks 1-5.

- [ ] **Step 10: Commit**

```bash
git add src/utils/currency.ts src/__tests__/utils/currency.test.ts "src/app/(drawer)/(tabs)/expenses.tsx" "src/__tests__/app/(drawer)/(tabs)/expenses.test.tsx"
git commit -m "$(cat <<'EOF'
feat: replace Kosten placeholder with scan-and-display screen

Minimal by design: scan -> read-only date/total/tax display, no edit
or save (Phase 4 builds the real form on top of this screen instead
of starting over, per design.md). Adds formatCurrency for Dutch
comma-decimal formatting, closing a gap the source app's own
scan-review modal has (bare toFixed(2)) against this repo's own
"Dutch format everywhere" rule.
EOF
)"
```

---

## Task 7: Docs and skill follow-through

**Files:**

- Create: `docs/RECEIPT_PARSING.md`
- Create: `.claude/skills/add-receipt-rule/SKILL.md`
- Modify: `AGENTS.md`

**Interfaces:** none — documentation only, no test (matches Phase 0's precedent for doc-only tasks: nothing to assert).

`AGENTS.md` already deferred this exact doc and skill: "Receipt parsing has no doc yet — it's deferred to the phase that actually builds the rule engine in RN." This is that phase.

- [ ] **Step 1: Create the receipt-parsing doc**

Create `docs/RECEIPT_PARSING.md`:

```markdown
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
```

- [ ] **Step 2: Create the skill**

Create `.claude/skills/add-receipt-rule/SKILL.md`:

```markdown
---
name: add-receipt-rule
description: Use when changing receipt/OCR parsing in this project — "add a receipt rule", "parse this receipt", "merchant X isn't detected", "fix date/total/tax detection". Enforces the rule-based + spatial-analysis approach and a fixture-based regression test, since this is the app's highest-regression-risk domain.
---

# Add a receipt-parsing rule

Add or change a rule in the rule-based parser and ship a fixture-based regression
test in the same change. See
[docs/RECEIPT_PARSING.md](../../../docs/RECEIPT_PARSING.md). Read an existing test
first — e.g. `src/__tests__/hooks/receipt-parsing/mcdonaldsReceipt.test.ts` and a
detector test like `totalDetection.test.ts` — and copy the pattern.

## Checklist

1. **Write the failing test first.** Add a `*Receipt.test.ts` (or extend a
   detector test) under `src/__tests__/hooks/receipt-parsing/` using a
   **real-world** receipt fixture (mock data in `src/__tests__/mockData/`).
   Assert the dates/totals/tax the parser should produce. Run
   `npm test -- receipt-parsing` and watch it fail for the right reason.
2. **Implement the rule** in `src/hooks/receipt-parsing/`. Use spatial
   analysis (line/column structure via `utils/spatialAnalysis.ts`), not naive
   string scanning. Use constants for domain values — no magic strings.
3. **Run `npm test -- receipt-parsing`** — the new test passes and no
   existing receipt-parsing test regresses.
4. Keep parsing logic in `src/hooks/receipt-parsing/`; do not leak it into
   the scan screen or `src/hooks/scan/`.
```

- [ ] **Step 3: Update `AGENTS.md`'s documentation index**

In `AGENTS.md`, find this row in the Documentation Index table:

```markdown
| Native functionality | [docs/NATIVE.md](docs/NATIVE.md) | Camera, scanner, OCR, secure storage, biometric, push, badge |
```

Add a new row directly after it:

```markdown
| Receipt parsing | [docs/RECEIPT_PARSING.md](docs/RECEIPT_PARSING.md) | Changing the OCR rule engine, detectors, or merchant-specific handling |
```

Then delete this paragraph, which the new doc makes obsolete:

```markdown
Receipt parsing has no doc yet — it's deferred to the phase that actually
builds the rule engine in RN, since paperwork-app's `RECEIPT_PARSING.md`
documents specific detector/rule-engine internals that don't exist here
yet and a guess now would just be wrong later.
```

- [ ] **Step 4: Commit**

```bash
git add docs/RECEIPT_PARSING.md .claude/skills/add-receipt-rule/SKILL.md AGENTS.md
git commit -m "$(cat <<'EOF'
docs: add RECEIPT_PARSING.md and the add-receipt-rule skill

Fulfills the placeholder AGENTS.md already left for this: "deferred
to the phase that actually builds the rule engine in RN." Adapted
from paperwork-app's equivalents with this repo's actual paths
(src/hooks/scan/, src/hooks/receipt-parsing/) and test command
(npm test, not npm run test.unit).
EOF
)"
```

---

## Validation (after all tasks, per design.md)

- [ ] Run the full suite once more end-to-end: `npx tsc --noEmit && npm test`.
- [ ] Real-device test (not automated, user's call): `npx expo prebuild --clean && npx expo run:ios` (or `run:android`), scan an actual receipt, confirm the extracted date/total/tax are correct and the crop/deskew looks right. Pay particular attention to the three verification checkpoints flagged above: OCR's `cornerPoints` order (Task 3), `expo-file-system`'s `create()` sync/async (Task 4), and whether denying camera permission shows any message at all (Task 2) — all three are exactly the kind of thing that only shows up against a real scan.
