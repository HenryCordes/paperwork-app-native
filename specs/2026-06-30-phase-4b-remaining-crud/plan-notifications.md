# Notifications Implementation Plan (Phase 4b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a leaner plan.** For the per-step rhythm and shared Global Constraints, **follow [the Expenses exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md) exactly.** Read the source page directly.

**Goal:** Build the single Notifications List screen at parity with `paperwork-app/src/pages/Notifications/List/index.tsx`. **Screen only** — the data layer already exists from Phase 1b.

**Architecture:** The cheapest section. `src/hooks/useNotifications.ts` already provides `useNotificationsList`, `useUnreadCount`, `useMarkAsRead`, `useMarkAllAsRead`, `useDeleteNotification`, `useMarkAsReceived` against a complete `notificationsService`. This agent builds only the `FlatList` screen on top of those hooks — read/unread card styling, per-item mark-read + delete, and a "mark all read" header action.

**Tech Stack:** Expo, RN, TypeScript, `expo-router`, `@tanstack/react-query`, Jest + RNTL. No new libraries.

## Global Constraints

- Inherit the exemplar's Global Constraints verbatim.
- **Base commit:** fork from the Phase 4b foundation commit. (This section adds no query keys — the notifications namespace already exists.)
- **Owned files only.** Touches `app/(drawer)/(tabs)/notifications.tsx` and its `__tests__` mirror. **Do not modify** `hooks/useNotifications.ts`, `api/services/notificationsService.ts`, or `api/types/notifications.ts` — they are complete and shared with the push-notification receiver; consume them as-is. If a genuine gap appears, stop and flag it rather than editing shared notification code.
- Notifications is a drawer-reachable screen that also renders the persistent tab strip (per the parent roadmap's nav shape).
- Branch isolation; no `main` commit; no push/PR without authorization; no AI attribution.

## Source references (read directly)

- `paperwork-app/src/pages/Notifications/List/index.tsx` — the card layout, read/unread styling, mark-read and delete affordances, the "mark all read" action, and the empty/loading/error copy.
- `src/hooks/useNotifications.ts` (this repo) — the exact hook signatures to consume (already built; do not re-derive).

---

## Task 1: Notifications List screen

**Files:** Modify `app/(drawer)/(tabs)/notifications.tsx` (replace the 5-line placeholder) + create its `__tests__` mirror.

**Interfaces:** Consumes (read-only, already built) `useNotificationsList`, `useMarkAsRead`, `useMarkAllAsRead`, `useDeleteNotification`. Optionally `useUnreadCount` for a header count if the source shows one.

**Test coverage:**
- Renders a card per notification with title/body/relative-time, and visually distinct read vs unread styling (assert via a testID or style prop, matching the source's unread treatment).
- Dutch empty state ("geen notificaties" — confirm the source's exact copy) and Dutch error state.
- A per-item mark-read action calls `useMarkAsRead().mutate({ notificationId, read })` with the right args.
- A per-item delete action calls `useDeleteNotification().mutate(id)` (with the source's confirm step if it has one).
- A "mark all read" header action calls `useMarkAllAsRead().mutate()`.
- `FlatList` + `RefreshControl` pull-to-refresh, mirroring the exemplar's list conventions. Use the existing query's invalidation (the hooks already invalidate `QueryKeys.notifications.base` on success) rather than manual refetch.

---

## Validation (after all tasks)

- [ ] `npx tsc --noEmit && npm test` green for the Notifications files; the existing `useNotifications` tests are untouched and still passing.
- [ ] On-device: receive/seed a notification, see it as unread, mark it read (styling flips), mark-all-read, delete one, pull-to-refresh — and confirm the tab badge/unread count stays consistent with the push-notification receiver.
