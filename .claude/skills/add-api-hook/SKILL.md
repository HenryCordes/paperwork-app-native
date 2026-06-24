---
name: add-api-hook
description: Use when adding data fetching or mutation in this project — "add a hook", "fetch X", "new query", "new mutation", "call the API for Y". Enforces the service + hook pattern, the query-key factory, error/loading states, and cache invalidation.
---

# Add an API hook

Add server-state access through the **service + hook** pattern — ported
from paperwork-app largely unchanged, since TanStack Query + axios is the
same on both. Never call axios from a component.

Until this repo has its own established pair, read paperwork-app's
`src/api/services/expensesService.ts` and `src/hooks/useExpenses.ts` for
the reference pattern.

## Checklist

1. **Types** — add request/response interfaces to `src/api/types/<entity>.ts`
   (no `any`). Shared cross-cutting types (e.g. `ApiError`) go in
   `src/api/types.ts`.
2. **Service** — create `src/api/services/<entity>Service.ts`: a class
   receiving the shared `axiosInstance` via constructor injection,
   exporting a pre-built singleton as the default. Methods wrap axios
   calls in try/catch and throw an `Error` with a Dutch, user-safe
   message. One file per domain entity.
3. **Query keys** — add an entry to `src/api/queryKeys.ts`: a `base`
   tuple plus `list(offset)`/`detail(id)` factories. Reuse existing keys;
   invalidate via the relevant factory rather than inventing a parallel
   scheme.
4. **Hook** — add `src/hooks/use<Entity>.ts`: `useQuery` for reads,
   `useMutation` for writes. On mutation success, invalidate the
   narrowest relevant query key.
5. **Test** — add a unit test under `src/__tests__/` mirroring the source
   path, mocking the service; run `npm test`.

Note: the error-UI surface isn't decided yet for this repo (paperwork-app
uses `IonToast`; this app has no toast/banner component yet). Until a
screen establishes the pattern, surface errors however the calling screen
already does and flag the inconsistency — don't invent a new convention
inside a hook.
