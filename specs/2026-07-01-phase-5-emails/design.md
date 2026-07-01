# Design: Phase 5 — Emails (rich text)

Date: 2026-07-01
Status: Approved (design)
Roadmap: [../../../paperwork-app/specs/2026-06-24-paperwork-app-native-migration/design.md](../../../paperwork-app/specs/2026-06-24-paperwork-app-native-migration/design.md) — Phase 5

## Problem

The Emails feature is the last CRUD area of the source Ionic app not yet
migrated to `paperwork-app-native`. It is the one screen with a rich-text
requirement: the source composes an email `body` as HTML with TinyMCE and
renders it back with `dangerouslySetInnerHTML`. React Native has neither
TinyMCE nor `dangerouslySetInnerHTML`, so this phase both ports the standard
list/details/edit trio and introduces the app's first rich-text editor.

## Goals

- Full parity with the source Emails feature (List / Details / Edit), minus the
  two rich-text features formally descoped in the migration design doc
  (alignment + tables).
- Layout and styling follow the source, realized through the phase-4 native
  exemplars (`invoices` trio) so the Emails screens are consistent with the
  rest of the migrated app.
- Introduce `@10play/tentap-editor` as the rich-text solution, with a single
  HTML rendering path shared between the editor and the read-only viewer.

## Non-goals

- **No alignment or table editing** in the rich-text editor. Descoped in the
  roadmap; the source toolbar's `alignleft/center/right/justify` and `table`
  buttons are dropped.
- **No backend changes.** Same `emails` / `email` / `email/send` endpoints,
  same HTML `body` contract.
- **No calendar date picker.** The phase-4 native exemplars standardized on a
  plain `TextInput` with a `JJJJ-MM-DD` placeholder; Emails follows that rather
  than reintroduce the source's `IonDatetime`.

## Decisions

### Rich-text editor: `@10play/tentap-editor`

Fixed by the migration design doc. tentap is a WebView-based editor built on
TipTap that emits HTML, so the `body` field stays HTML and round-trips through
edit -> save -> details unchanged — backend-compatible with no data migration.
Its default bridge set has no alignment or table support (the reason those are
descoped). Toolbar scope carried over from the source's TinyMCE toolbar minus
the descoped buttons: **bold, italic, headings, bullet list, numbered list,
link, image, undo/redo**. Image insertion is URL-based, matching the source's
TinyMCE image plugin.

Adding tentap pulls in `react-native-webview`, a native module not currently in
the app. This makes the existing dev client stale: an `expo prebuild` +
dev-client rebuild is required before the Emails screens run on device. Flagged
in the plan.

### Details HTML rendering: tentap read-only

The Details screen renders the stored HTML `body` with tentap's `RichText` in
`editable={false}` mode rather than adding a second HTML renderer
(`react-native-render-html`, effectively unmaintained) or hand-rolling a
WebView. Reusing the editor's own rendering engine gives WYSIWYG parity between
compose and view and adds no dependency beyond tentap itself.

Note that the read-only viewer is a **sanitizing** renderer, not a passthrough:
tentap parses the stored HTML into the TipTap schema, so any markup outside the
configured bridge set (scripts, event handlers, iframes, and the descoped
alignment/tables) is dropped on both compose and view. Keep it that way — do not
replace it with a raw `WebView source={{ html }}`, which would render stored
HTML unsanitized.

### Data layer: 1:1 port, native conventions

Types are framework-agnostic and copied verbatim. Service is class-based
mirroring `invoicesService` (same endpoints, Dutch error messages preserved).
Hooks mirror the source `useEmails` behavior and cache invalidation, adapted to
the native TanStack Query + query-key-factory pattern.

## Components

### Data layer

- `src/api/types/emails.ts` — `Email`, `EmailsResponse`,
  `EmailDetailResponse`, `EmailsQueryParams`, `EmailCreateUpdateRequest`
  (copied verbatim from source).
- `src/api/services/emailsService.ts` — `EmailsService` class:
  `getEmails`, `getEmailById`, `createOrUpdateEmail`, `deleteEmail`,
  `sendEmail`. Endpoints: `GET emails`, `GET email/:id`, `POST email`,
  `DELETE /email/:id`, `POST /email/send`.
- `src/hooks/useEmails.ts` — `useEmailsList`, `useEmailById`,
  `useCreateOrUpdateEmail`, `useDeleteEmail`, `useSendEmail`.
- `src/api/queryKeys.ts` — add `emails` group: `base`, `list(params)`,
  `detail(id)`.

### Screens

- **List** — `src/app/(drawer)/(tabs)/emails.tsx` (replaces the placeholder).
  Mirrors `invoices.tsx`: search `TextInput`, `FlatList` with `onEndReached`
  pagination + pull-to-refresh, `Card` per email (`#nummer - onderwerp`,
  ontvanger/email/datum rows, Verzonden/Concept badge), `Fab` ->
  `/emails/edit/create`. Search matches source fields: subject, contactName,
  contactEmail, emailNumber.
- **Details** — `src/app/emails/[id].tsx`. Mirrors `invoices/[id].tsx`: header
  Bewerken/Verwijderen actions (`Alert` delete confirm), metadata `Card`
  (ontvanger, email, datum, optional "Bekijk factuur" link when `invoiceId`
  set), a `Card` rendering `body` via tentap `RichText` `editable={false}`, and
  a "Verzenden" button.
- **Edit/Create** — `src/app/emails/edit/[id].tsx`. Mirrors
  `invoices/edit/[id].tsx`: info `Card` (email-nummer read-only, onderwerp
  `TextInput`, contact `Dropdown`, datum `TextInput`, optional invoice
  `Dropdown`, Verzonden toggle) + content `Card` hosting the tentap editor with
  the scoped toolbar. Dutch validation (onderwerp / contact / datum / body
  required). "Opslaan" + "Verzenden" actions.

## Data flow

1. List loads page 0 via `useEmailsList`, accumulates further pages locally on
   `onEndReached` (same pattern as `invoices.tsx`), filters client-side by
   search text.
2. Tapping a card -> Details (`/emails/:id`), which loads via `useEmailById`
   and renders the HTML body read-only.
3. Bewerken / Fab -> Edit (`/emails/edit/:id` or `/emails/edit/create`).
   `useEmailById` hydrates the form for edits; create mode seeds a random
   email number (parity with source). tentap emits HTML into `body`.
4. Opslaan -> `useCreateOrUpdateEmail`; Verzenden -> `useSendEmail`. Both
   invalidate the emails list (and detail) query keys and navigate back.
5. Verwijderen -> `useDeleteEmail`, invalidates the list, navigates back.

## Error handling

- Service methods wrap Axios errors into `Error` with the server message or a
  Dutch fallback (mirrors `invoicesService`).
- Screens surface load errors as inline Dutch text (`colors.danger`) and save
  errors inline on the Edit screen, matching the phase-4 exemplars. Delete uses
  a native `Alert` confirm.

## Testing

RNTL tests under `src/__tests__/`, following the phase-4 `renderRouter`
pattern:

- List: renders emails, filters on search, paginates.
- Details: renders body, delete confirm flow.
- Edit: validates required fields, saves, sends.

The tentap `RichText` renders in a WebView that can't mount in jsdom, so a jest
mock for `@10play/tentap-editor` is added (a simple stand-in exposing the
editor value) so the Edit/Details tests run headless.

## Deviations from source

1. TinyMCE -> `@10play/tentap-editor`; alignment + tables dropped (roadmap
   decision).
2. Details renders HTML via tentap read-only instead of
   `dangerouslySetInnerHTML`.
3. Date field is a `TextInput` (JJJJ-MM-DD), not a calendar picker (established
   phase-4 native convention).

## Validation criteria

- Emails List / Details / Edit reach functional parity with the source, minus
  alignment/table editing.
- Dark and light mode match the source's color intent (theme tokens +
  `useColorScheme` branching, including the editor content style).
- `tsc --noEmit`, ESLint, and Jest pass before the phase is marked done.
- An internal EAS/dev-client build (with the new native module) verifies the
  editor on a real device.
