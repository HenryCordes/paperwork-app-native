# Phase 5 — Emails (rich text) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Emails feature (List / Details / Edit) at parity with the source Ionic app, replacing TinyMCE with `@10play/tentap-editor` and dropping alignment + table editing.

**Architecture:** Port the emails data layer (types / service / hooks / query keys) 1:1 into the native conventions, then build the three screens mirroring the phase-4 `invoices` exemplars. All tentap usage is isolated behind two small wrapper components (`EmailBodyEditor`, `EmailBodyViewer`) so screens stay testable and the WebView dependency has a single import site.

**Tech Stack:** Expo / React Native 0.85, expo-router, TanStack Query, `@10play/tentap-editor` (+ `react-native-webview`), Jest + React Native Testing Library.

## Global Constraints

- TypeScript strict; `any` is forbidden (`unknown` + narrowing if needed).
- All user-facing text is **Dutch**.
- Styling uses `StyleSheet.create()` + `Colors`/`Spacing` from `@/constants/theme` with `useColorScheme()` branching. No inline color literals except `#ffffff` on filled buttons (established pattern).
- Routing is expo-router file-based; screens live under `src/app/`.
- Every task ends green on `npm test`, `npm run typecheck`, `npm run lint`.
- Commits follow Conventional Commits, imperative subject. **No AI attribution / Co-Authored-By lines.**
- Emails `body` is HTML end-to-end; do not transform it.

---

### Task 1: Install tentap-editor and confirm the API surface

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `package.json` jest `transformIgnorePatterns` (allow tentap + webview to transform)

**Interfaces:**
- Produces: the `@10play/tentap-editor` package and its `react-native-webview` peer, available to import in Task 4.

- [ ] **Step 1: Install the editor and its native peer**

Run:
```bash
cd /Users/henry/Projects/devartist/paperwork-app-native
npx expo install @10play/tentap-editor react-native-webview
```
`expo install` picks versions compatible with the installed Expo SDK.

- [ ] **Step 2: Confirm the exact API against the installed types**

Read the installed type definitions and confirm these named exports and members exist (versions drift — verify, do not assume):
```bash
grep -rE "useEditorBridge|useEditorContent|RichText|Toolbar|DEFAULT_TOOLBAR_ITEMS|setImage|injectCSS|getHTML" \
  node_modules/@10play/tentap-editor/lib/typescript 2>/dev/null | head -40
```
Confirm: `useEditorBridge(options)`, `useEditorContent(editor, { type: "html" })`, `<RichText editor>`, `<Toolbar editor>`, and on the editor bridge instance: `injectCSS(css, tag)`, `setImage(src)`, `getHTML()`. If a name differs in this version, adjust Task 4 to match the real export.

- [ ] **Step 3: Allow tentap + webview through the Jest transform**

In `package.json`, extend the first `transformIgnorePatterns` entry so the package list includes `@10play/tentap-editor` and `react-native-webview`:
```json
"/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|react-native-gifted-charts|gifted-charts-core|@10play/tentap-editor|react-native-webview))",
```

- [ ] **Step 4: Verify the app still typechecks and tests pass**

Run: `npm run typecheck && npm test`
Expected: PASS (no code uses tentap yet; this only proves the install and jest config are clean).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add @10play/tentap-editor and react-native-webview"
```

> **Dev-client rebuild required.** `react-native-webview` is native code. Before the Emails screens run on device, the dev client must be rebuilt: `npx expo prebuild` then `npm run ios` / `npm run android` (or a new EAS dev build). Metro fast-refresh alone will not pick up the new native module. Flag this to the user at execution time.

---

### Task 2: Emails data layer — types, query keys, service

**Files:**
- Create: `src/api/types/emails.ts`
- Modify: `src/api/queryKeys.ts`
- Create: `src/api/services/emailsService.ts`
- Test: `src/__tests__/api/services/emailsService.test.ts`

**Interfaces:**
- Produces:
  - Types `Email`, `EmailsResponse`, `EmailDetailResponse`, `EmailsQueryParams`, `EmailCreateUpdateRequest`.
  - `QueryKeys.emails.base` / `.list(offset?)` / `.detail(id?)`.
  - `EmailsService` class + default `emailsService` instance with:
    `getEmails(params?): Promise<EmailsResponse>`,
    `getEmailById(id?): Promise<EmailDetailResponse>`,
    `createOrUpdateEmail(data): Promise<EmailDetailResponse>`,
    `deleteEmail(id): Promise<{ success: boolean }>`,
    `sendEmail(data): Promise<EmailDetailResponse>`.

- [ ] **Step 1: Create the types (verbatim port)**

`src/api/types/emails.ts`:
```typescript
export interface Email {
  _id: string;
  send: boolean;
  emailDate: string;
  subject: string;
  body: string;
  invoiceId?: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  owner: string;
  createdAt: string;
  tenantId: string;
  emailNumber: number;
  __v?: number;
  id?: string;
}

export interface EmailsResponse {
  success: boolean;
  data: {
    docs: Email[];
    totalDocs: number;
    offset: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
  };
}

export interface EmailDetailResponse {
  success: boolean;
  data: Email;
}

export interface EmailsQueryParams {
  offset?: number;
  limit?: number;
  page?: number;
}

export interface EmailCreateUpdateRequest {
  _id?: string;
  send: boolean;
  emailDate: string;
  subject: string;
  body: string;
  invoiceId?: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  emailNumber: number;
}
```

- [ ] **Step 2: Add the emails query keys**

In `src/api/queryKeys.ts`, add an `emails` group (place it after `invoices`):
```typescript
  emails: {
    base: ["emails"] as const,
    list: (offset?: number) => [...QueryKeys.emails.base, "list", offset] as const,
    detail: (id?: string) => [...QueryKeys.emails.base, "detail", id] as const,
  },
```

- [ ] **Step 3: Write the failing service test**

`src/__tests__/api/services/emailsService.test.ts`:
```typescript
import { EmailsService } from "@/api/services/emailsService";
import { EmailCreateUpdateRequest } from "@/api/types/emails";

describe("EmailsService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

  afterEach(() => jest.clearAllMocks());

  const makeEmailData = (
    overrides: Partial<EmailCreateUpdateRequest> = {},
  ): EmailCreateUpdateRequest => ({
    send: false,
    emailDate: "2026-01-01",
    subject: "Onderwerp",
    body: "<p>Hoi</p>",
    contactId: "c1",
    contactName: "Acme BV",
    contactEmail: "a@b.nl",
    emailNumber: 42,
    ...overrides,
  });

  describe("getEmails", () => {
    it("requests the emails endpoint with the given params", async () => {
      const response = { success: true, data: { docs: [] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);

      const result = await service.getEmails({ offset: 20, limit: 5 });

      expect(mockAxios.get).toHaveBeenCalledWith("emails", {
        params: { offset: 20, limit: 5 },
      });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new EmailsService(mockAxios as never);
      await expect(service.getEmails()).rejects.toThrow("Fout bij ophalen emails");
    });
  });

  describe("getEmailById", () => {
    it('throws without calling axios when id is "create"', async () => {
      const service = new EmailsService(mockAxios as never);
      await expect(service.getEmailById("create")).rejects.toThrow(
        "Geen geldig email ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it("fetches the detail for a real id", async () => {
      const response = { success: true, data: makeEmailData() };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);

      const result = await service.getEmailById("e1");

      expect(mockAxios.get).toHaveBeenCalledWith("email/e1");
      expect(result).toEqual(response);
    });
  });

  describe("createOrUpdateEmail", () => {
    it("posts to the email endpoint", async () => {
      const response = { success: true, data: makeEmailData() };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);
      const data = makeEmailData();

      const result = await service.createOrUpdateEmail(data);

      expect(mockAxios.post).toHaveBeenCalledWith("email", data);
      expect(result).toEqual(response);
    });

    it("uses the 'bijwerken' fallback when _id is present", async () => {
      mockAxios.post.mockRejectedValue(new Error("x"));
      const service = new EmailsService(mockAxios as never);
      await expect(
        service.createOrUpdateEmail(makeEmailData({ _id: "e1" })),
      ).rejects.toThrow("Fout bij bijwerken email");
    });

    it("uses the 'aanmaken' fallback when _id is absent", async () => {
      mockAxios.post.mockRejectedValue(new Error("x"));
      const service = new EmailsService(mockAxios as never);
      await expect(service.createOrUpdateEmail(makeEmailData())).rejects.toThrow(
        "Fout bij aanmaken email",
      );
    });
  });

  describe("deleteEmail", () => {
    it("calls DELETE on the email endpoint", async () => {
      mockAxios.delete.mockResolvedValue({});
      const service = new EmailsService(mockAxios as never);

      const result = await service.deleteEmail("e1");

      expect(mockAxios.delete).toHaveBeenCalledWith("/email/e1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("sendEmail", () => {
    it("posts to the send endpoint", async () => {
      const response = { success: true, data: makeEmailData() };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);
      const data = makeEmailData();

      const result = await service.sendEmail(data);

      expect(mockAxios.post).toHaveBeenCalledWith("/email/send", data);
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.post.mockRejectedValue(new Error("x"));
      const service = new EmailsService(mockAxios as never);
      await expect(service.sendEmail(makeEmailData())).rejects.toThrow(
        "Fout bij verzenden email",
      );
    });
  });
});
```

- [ ] **Step 2b: Run the test to verify it fails**

Run: `npm test -- emailsService`
Expected: FAIL with "Cannot find module '@/api/services/emailsService'".

- [ ] **Step 3: Implement the service**

`src/api/services/emailsService.ts`:
```typescript
import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  EmailsResponse,
  EmailsQueryParams,
  EmailDetailResponse,
  EmailCreateUpdateRequest,
} from "../types/emails";
import axiosInstance from "../axiosInstance";

export class EmailsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getEmails(
    params: EmailsQueryParams = { offset: 0, limit: 10 },
  ): Promise<EmailsResponse> {
    try {
      const response = await this.axios.get<EmailsResponse>("emails", { params });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen emails");
    }
  }

  async getEmailById(id?: string): Promise<EmailDetailResponse> {
    if (!id || id === "create") {
      throw new Error("Geen geldig email ID opgegeven");
    }
    try {
      const response = await this.axios.get<EmailDetailResponse>(`email/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen email details",
      );
    }
  }

  async createOrUpdateEmail(
    data: EmailCreateUpdateRequest,
  ): Promise<EmailDetailResponse> {
    try {
      const response = await this.axios.post<EmailDetailResponse>("email", data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const operation = data._id ? "bijwerken" : "aanmaken";
      throw new Error(
        axiosError.response?.data?.message || `Fout bij ${operation} email`,
      );
    }
  }

  async deleteEmail(id: string): Promise<{ success: boolean }> {
    try {
      await this.axios.delete(`/email/${id}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verwijderen email",
      );
    }
  }

  async sendEmail(data: EmailCreateUpdateRequest): Promise<EmailDetailResponse> {
    try {
      const response = await this.axios.post<EmailDetailResponse>("/email/send", data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verzenden email",
      );
    }
  }
}

export const emailsService = new EmailsService(axiosInstance);

export default emailsService;
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- emailsService && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/types/emails.ts src/api/queryKeys.ts src/api/services/emailsService.ts src/__tests__/api/services/emailsService.test.ts
git commit -m "feat: add emails data types, query keys, and service"
```

---

### Task 3: Emails hooks

**Files:**
- Create: `src/hooks/useEmails.ts`
- Test: `src/__tests__/hooks/useEmails.test.tsx`

**Interfaces:**
- Consumes: `emailsService`, `QueryKeys.emails`, the emails types (Task 2).
- Produces: `useEmailsList(params)`, `useEmailById(id?)`, `useCreateOrUpdateEmail()`, `useDeleteEmail()`, `useSendEmail()`.

- [ ] **Step 1: Write the failing hook test**

`src/__tests__/hooks/useEmails.test.tsx` (mirror `useInvoices.test.tsx`; assert list forwards params, `useEmailById` is disabled for `"create"`, and mutations call the service + invalidate `QueryKeys.emails.base`):
```typescript
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import {
  useEmailsList,
  useEmailById,
  useCreateOrUpdateEmail,
  useDeleteEmail,
  useSendEmail,
} from "@/hooks/useEmails";
import emailsService from "@/api/services/emailsService";
import QueryKeys from "@/api/queryKeys";

jest.mock("@/api/services/emailsService", () => ({
  __esModule: true,
  default: {
    getEmails: jest.fn(),
    getEmailById: jest.fn(),
    createOrUpdateEmail: jest.fn(),
    deleteEmail: jest.fn(),
    sendEmail: jest.fn(),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => jest.clearAllMocks());

it("useEmailsList forwards params to the service", async () => {
  (emailsService.getEmails as jest.Mock).mockResolvedValue({ success: true, data: { docs: [] } });
  const client = new QueryClient();
  renderHook(() => useEmailsList({ offset: 0, limit: 10 }), { wrapper: wrapper(client) });
  await waitFor(() =>
    expect(emailsService.getEmails).toHaveBeenCalledWith({ offset: 0, limit: 10 }),
  );
});

it("useEmailById is disabled for the create sentinel", () => {
  const client = new QueryClient();
  renderHook(() => useEmailById("create"), { wrapper: wrapper(client) });
  expect(emailsService.getEmailById).not.toHaveBeenCalled();
});

it("useCreateOrUpdateEmail invalidates the emails base key on success", async () => {
  (emailsService.createOrUpdateEmail as jest.Mock).mockResolvedValue({ success: true, data: {} });
  const client = new QueryClient();
  const spy = jest.spyOn(client, "invalidateQueries");
  const { result } = renderHook(() => useCreateOrUpdateEmail(), { wrapper: wrapper(client) });

  result.current.mutate({
    send: false, emailDate: "2026-01-01", subject: "s", body: "<p></p>",
    contactId: "c1", contactName: "n", contactEmail: "e", emailNumber: 1,
  });

  await waitFor(() =>
    expect(spy).toHaveBeenCalledWith({ queryKey: QueryKeys.emails.base }),
  );
});

it("useDeleteEmail invalidates the emails base key on success", async () => {
  (emailsService.deleteEmail as jest.Mock).mockResolvedValue({ success: true });
  const client = new QueryClient();
  const spy = jest.spyOn(client, "invalidateQueries");
  const { result } = renderHook(() => useDeleteEmail(), { wrapper: wrapper(client) });

  result.current.mutate("e1");

  await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: QueryKeys.emails.base }));
});

it("useSendEmail calls the service", async () => {
  (emailsService.sendEmail as jest.Mock).mockResolvedValue({ success: true, data: {} });
  const client = new QueryClient();
  const { result } = renderHook(() => useSendEmail(), { wrapper: wrapper(client) });

  result.current.mutate({
    send: true, emailDate: "2026-01-01", subject: "s", body: "<p></p>",
    contactId: "c1", contactName: "n", contactEmail: "e", emailNumber: 1,
  });

  await waitFor(() => expect(emailsService.sendEmail).toHaveBeenCalled());
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- useEmails`
Expected: FAIL with "Cannot find module '@/hooks/useEmails'".

- [ ] **Step 3: Implement the hooks**

`src/hooks/useEmails.ts` (mirror `useInvoices.ts`; note `useEmailById` uses `QueryKeys.emails.detail`):
```typescript
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import emailsService from "@/api/services/emailsService";
import QueryKeys from "@/api/queryKeys";
import {
  EmailCreateUpdateRequest,
  EmailDetailResponse,
  EmailsQueryParams,
  EmailsResponse,
} from "@/api/types/emails";

export const useEmailsList = (
  params: EmailsQueryParams,
): UseQueryResult<EmailsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.emails.list(params.offset),
    queryFn: () => emailsService.getEmails(params),
  });
};

export const useEmailById = (
  id: string | undefined,
): UseQueryResult<EmailDetailResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.emails.detail(id ?? "create"),
    queryFn: () => emailsService.getEmailById(id),
    enabled: !!id && id !== "create",
  });
};

export const useCreateOrUpdateEmail = (): UseMutationResult<
  EmailDetailResponse,
  Error,
  EmailCreateUpdateRequest
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailCreateUpdateRequest) => emailsService.createOrUpdateEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    },
  });
};

export const useDeleteEmail = (): UseMutationResult<{ success: boolean }, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailsService.deleteEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    },
  });
};

export const useSendEmail = (): UseMutationResult<
  EmailDetailResponse,
  Error,
  EmailCreateUpdateRequest
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailCreateUpdateRequest) => emailsService.sendEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    },
  });
};
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- useEmails && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEmails.ts src/__tests__/hooks/useEmails.test.tsx
git commit -m "feat: add emails query and mutation hooks"
```

---

### Task 4: tentap wrapper components (editor + read-only viewer)

**Files:**
- Create: `src/components/EmailBodyEditor.tsx`
- Create: `src/components/EmailBodyViewer.tsx`

**Interfaces:**
- Consumes: `@10play/tentap-editor` (Task 1).
- Produces:
  - `EmailBodyEditor` — `{ initialContent: string; onChange: (html: string) => void }`. Renders the tentap editor + default toolbar + a Dutch "Afbeelding invoegen" button that inserts an image by URL.
  - `EmailBodyViewer` — `{ html: string }`. Renders the HTML read-only via the same engine.

> **Design note — toolbar scope.** The default `<Toolbar>` from `TenTapStartKit` already excludes alignment and tables (no bridges for them exist), which is exactly the descoped set. It exposes bold/italic/headings/lists/link/undo-redo plus a few extras (underline, strike, code, blockquote). We use the default toolbar rather than hand-curating `DEFAULT_TOOLBAR_ITEMS` (an unstable internal array) — this satisfies the hard requirement (no align, no tables) without coupling to tentap internals. Image insertion is added as an explicit URL button because tentap's default toolbar has no image control. This is a minor deviation from the design's exact button list; see the plan handoff note.

> **Testability.** These two components wrap a WebView that cannot mount under jsdom. They have no unit test; they are verified on-device (Task 8 checklist) and are mocked in the screen tests (Tasks 5-7). Keep them thin so all logic worth testing lives in the screens.

- [ ] **Step 1: Implement the editor wrapper**

`src/components/EmailBodyEditor.tsx`:
```tsx
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import {
  RichText,
  Toolbar,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";

import { Colors, Spacing } from "@/constants/theme";

interface EmailBodyEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
}

export function EmailBodyEditor({ initialContent, onChange }: EmailBodyEditorProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialContent || "<p></p>",
  });

  const html = useEditorContent(editor, { type: "html" });

  // Push live HTML up to the form. useEditorContent returns undefined until the
  // WebView bundle is ready; ignore that first undefined so we don't clobber
  // the form's initial value.
  useEffect(() => {
    if (html !== undefined) {
      onChange(html);
    }
  }, [html, onChange]);

  // Match the source app's dark/light editor surface. injectCSS re-applies on
  // every scheme change (keyed 'theme' so it replaces rather than stacks).
  useEffect(() => {
    editor.injectCSS(
      `body { background-color: ${colors.background}; color: ${colors.text}; }`,
      "theme",
    );
  }, [editor, colors.background, colors.text]);

  const insertImage = () => {
    const url = imageUrl.trim();
    if (url) {
      editor.setImage(url);
    }
    setImageUrl("");
    setImageModalOpen(false);
  };

  return (
    <View style={styles.container} testID="email-body-editor">
      <RichText editor={editor} style={styles.rich} />
      <Toolbar editor={editor} />
      <Pressable
        testID="insert-image-button"
        style={[styles.imageButton, { borderColor: colors.border }]}
        onPress={() => setImageModalOpen(true)}
      >
        <Text style={{ color: colors.primary }}>Afbeelding invoegen</Text>
      </Pressable>

      <Modal transparent visible={imageModalOpen} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.modalLabel, { color: colors.text }]}>Afbeelding-URL</Text>
            <TextInput
              testID="image-url-input"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              placeholder="https://..."
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setImageModalOpen(false)}>
                <Text style={{ color: colors.textSecondary }}>Annuleren</Text>
              </Pressable>
              <Pressable testID="image-url-confirm" onPress={insertImage}>
                <Text style={{ color: colors.primary }}>Invoegen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 300, gap: Spacing.two },
  rich: { minHeight: 240 },
  imageButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    padding: Spacing.four,
  },
  modalCard: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  modalLabel: { fontSize: 14 },
  input: { borderBottomWidth: 1, paddingVertical: Spacing.two, fontSize: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.four },
});
```

- [ ] **Step 2: Implement the read-only viewer**

`src/components/EmailBodyViewer.tsx`:
```tsx
import { useEffect } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import { RichText, useEditorBridge } from "@10play/tentap-editor";

import { Colors } from "@/constants/theme";

interface EmailBodyViewerProps {
  html: string;
}

export function EmailBodyViewer({ html }: EmailBodyViewerProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const editor = useEditorBridge({
    editable: false,
    initialContent: html || "<p></p>",
  });

  useEffect(() => {
    editor.injectCSS(
      `body { background-color: ${colors.background}; color: ${colors.text}; }`,
      "theme",
    );
  }, [editor, colors.background, colors.text]);

  return (
    <View style={styles.container} testID="email-body-viewer">
      <RichText editor={editor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 160 },
});
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. (No new test — see the testability note.)

- [ ] **Step 4: Commit**

```bash
git add src/components/EmailBodyEditor.tsx src/components/EmailBodyViewer.tsx
git commit -m "feat: add tentap email body editor and read-only viewer"
```

---

### Task 5: Emails List screen

**Files:**
- Modify: `src/app/(drawer)/(tabs)/emails.tsx` (replace the placeholder)
- Test: `src/__tests__/app/(drawer)/(tabs)/emails.test.tsx`

**Interfaces:**
- Consumes: `useEmailsList` (Task 3), `emailsService.getEmails`, `QueryKeys.emails`, `Card`, `Fab`.

- [ ] **Step 1: Write the failing screen test**

`src/__tests__/app/(drawer)/(tabs)/emails.test.tsx` (mirror `invoices.test.tsx`):
```typescript
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Emails from "@/app/(drawer)/(tabs)/emails";
import { useEmailsList } from "@/hooks/useEmails";
import emailsService from "@/api/services/emailsService";
import QueryKeys from "@/api/queryKeys";
import type { Email, EmailsResponse } from "@/api/types/emails";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/useEmails");
jest.mock("@/api/services/emailsService", () => ({
  __esModule: true,
  default: { getEmails: jest.fn() },
}));

const mockPush = jest.fn();

function renderScreen() {
  const client = new QueryClient();
  return {
    ...render(
      <QueryClientProvider client={client}>
        <Emails />
      </QueryClientProvider>,
    ),
    client,
  };
}

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    _id: "e1",
    send: false,
    emailDate: "2026-01-15",
    subject: "Offerte",
    body: "<p>Hoi</p>",
    contactId: "c1",
    contactName: "Acme BV",
    contactEmail: "a@b.nl",
    owner: "o1",
    createdAt: "2026-01-15",
    tenantId: "t1",
    emailNumber: 42,
    ...overrides,
  };
}

function makeListResponse(
  docs: Email[],
  overrides: Partial<EmailsResponse["data"]> = {},
): EmailsResponse {
  return {
    success: true,
    data: {
      docs, totalDocs: docs.length, offset: 0, limit: 10, totalPages: 1,
      page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false,
      prevPage: null, nextPage: null, ...overrides,
    },
  };
}

function mockList(overrides: Partial<ReturnType<typeof useEmailsList>>) {
  (useEmailsList as jest.Mock).mockReturnValue({
    data: undefined, isLoading: false, isError: false, error: null, ...overrides,
  });
}

describe("Emails List screen", () => {
  beforeEach(() => (useRouter as jest.Mock).mockReturnValue({ push: mockPush }));
  afterEach(() => jest.clearAllMocks());

  it("renders a card per email with its key fields and status badge", () => {
    mockList({ data: makeListResponse([makeEmail()]) });
    const { getByText } = renderScreen();
    expect(getByText("#42 - Offerte")).toBeTruthy();
    expect(getByText("Concept")).toBeTruthy();
  });

  it("shows the sent badge for a sent email", () => {
    mockList({ data: makeListResponse([makeEmail({ send: true })]) });
    const { getByText } = renderScreen();
    expect(getByText("Verzonden")).toBeTruthy();
  });

  it("shows the Dutch empty state", () => {
    mockList({ data: makeListResponse([]) });
    expect(renderScreen().getByText("Geen emails gevonden")).toBeTruthy();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockList({ isError: true, error: new Error("network down") });
    expect(renderScreen().getByText(/network down/)).toBeTruthy();
  });

  it("filters by search text (subject and contact)", () => {
    mockList({
      data: makeListResponse([
        makeEmail({ _id: "e1", subject: "Offerte", emailNumber: 1 }),
        makeEmail({ _id: "e2", subject: "Herinnering", contactName: "Beta", emailNumber: 2 }),
      ]),
    });
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("Zoek emails..."), "Herinnering");
    expect(getByText("#2 - Herinnering")).toBeTruthy();
    expect(queryByText("#1 - Offerte")).toBeNull();
  });

  it("navigates to details on card press", () => {
    mockList({ data: makeListResponse([makeEmail({ _id: "e42" })]) });
    fireEvent.press(renderScreen().getByText("#42 - Offerte"));
    expect(mockPush).toHaveBeenCalledWith("/emails/e42");
  });

  it("navigates to the create route from the FAB", () => {
    mockList({ data: makeListResponse([]) });
    fireEvent.press(renderScreen().getByTestId("emails-fab"));
    expect(mockPush).toHaveBeenCalledWith("/emails/edit/create");
  });

  it("loads the next page on endReached when hasNextPage is true", async () => {
    mockList({ data: makeListResponse([makeEmail({ _id: "e1" })], { hasNextPage: true }) });
    (emailsService.getEmails as jest.Mock).mockResolvedValue(
      makeListResponse([makeEmail({ _id: "e2", emailNumber: 99, subject: "Tweede" })]),
    );
    const { getByTestId, findByText } = renderScreen();
    fireEvent(getByTestId("emails-list"), "endReached");
    expect(await findByText("#99 - Tweede")).toBeTruthy();
    expect(emailsService.getEmails).toHaveBeenCalledWith({ offset: 10, limit: 10 });
  });

  it("invalidates the emails query on pull to refresh", async () => {
    mockList({ data: makeListResponse([makeEmail()]) });
    const { getByTestId, client } = renderScreen();
    const spy = jest.spyOn(client, "invalidateQueries");
    fireEvent(getByTestId("emails-list"), "refresh");
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: QueryKeys.emails.base }));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- "emails.test"`
Expected: FAIL (placeholder screen has no search/list/badge).

- [ ] **Step 3: Implement the List screen**

`src/app/(drawer)/(tabs)/emails.tsx` (mirror `invoices.tsx`; badge color from `success`/`warning` tokens):
```tsx
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import QueryKeys from "@/api/queryKeys";
import emailsService from "@/api/services/emailsService";
import { Email } from "@/api/types/emails";
import { Card } from "@/components/Card";
import { Fab } from "@/components/Fab";
import { Colors, Spacing } from "@/constants/theme";
import { useEmailsList } from "@/hooks/useEmails";

const LIMIT = 10;

function filterEmails(emails: Email[], search: string): Email[] {
  if (search.trim() === "") {
    return emails;
  }
  const q = search.toLowerCase();
  return emails.filter(
    (email) =>
      email.subject?.toLowerCase().includes(q) ||
      email.contactName?.toLowerCase().includes(q) ||
      email.contactEmail?.toLowerCase().includes(q) ||
      email.emailNumber?.toString().includes(q),
  );
}

export default function Emails() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const { data, isLoading, isError, error } = useEmailsList({ offset: 0, limit: LIMIT });

  useEffect(() => {
    if (data?.data.docs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing locally-accumulated pagination state from the query result; loadMore appends pages the query cache itself doesn't track.
      setAllEmails(data.data.docs);
      setHasNextPage(data.data.hasNextPage);
      setPage(0);
    }
  }, [data]);

  const filteredEmails = filterEmails(allEmails, searchText);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    setIsRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasNextPage || isLoadingMoreRef.current) {
      return;
    }
    isLoadingMoreRef.current = true;
    try {
      const nextPage = page + 1;
      const offset = nextPage * LIMIT;
      const response = await emailsService.getEmails({ offset, limit: LIMIT });
      setHasNextPage(response.data.hasNextPage);
      if (response.data.docs.length > 0) {
        setAllEmails((current) => [...current, ...response.data.docs]);
        setPage(nextPage);
      }
    } finally {
      isLoadingMoreRef.current = false;
    }
  };

  const renderEmail = ({ item }: { item: Email }) => (
    <Pressable onPress={() => router.push(`/emails/${item._id}`)}>
      <Card testID="email-card" bordered style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>
          #{item.emailNumber} - {item.subject}
        </Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Ontvanger</Text>
          <Text style={{ color: colors.text }}>{item.contactName || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Email</Text>
          <Text style={{ color: colors.text }}>{item.contactEmail || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Datum</Text>
          <Text style={{ color: colors.text }}>
            {new Date(item.emailDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            testID={`email-badge-${item._id}`}
            style={[
              styles.badge,
              { backgroundColor: item.send ? colors.success : colors.warning },
            ]}
          >
            {item.send ? "Verzonden" : "Concept"}
          </Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View
      testID="emails-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TextInput
        testID="emails-search"
        style={[styles.search, { backgroundColor: colors.backgroundElement, color: colors.text }]}
        placeholder="Zoek emails..."
        placeholderTextColor={colors.textSecondary}
        value={searchText}
        onChangeText={setSearchText}
      />

      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van emails: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : filteredEmails.length === 0 ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Geen emails gevonden
        </Text>
      ) : (
        <FlatList
          testID="emails-list"
          data={filteredEmails}
          keyExtractor={(item) => item._id}
          renderItem={renderEmail}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      <Fab
        testID="emails-fab"
        accessibilityLabel="Nieuwe email toevoegen"
        onPress={() => router.push("/emails/edit/create")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  search: { borderRadius: 8, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  message: { textAlign: "center", marginTop: Spacing.four },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  card: { gap: Spacing.half },
  title: { fontWeight: "600", marginBottom: Spacing.one },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
});
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `npm test -- "emails.test" && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(drawer)/(tabs)/emails.tsx" "src/__tests__/app/(drawer)/(tabs)/emails.test.tsx"
git commit -m "feat: replace Emails placeholder with the list screen"
```

---

### Task 6: Emails Details screen

**Files:**
- Create: `src/app/emails/[id].tsx`
- Test: `src/__tests__/app/emails/[id].test.tsx`

**Interfaces:**
- Consumes: `useEmailById`, `useDeleteEmail`, `useSendEmail` (Task 3), `EmailBodyViewer` (Task 4), `Card`.

- [ ] **Step 1: Write the failing test (mock the viewer + expo-router)**

`src/__tests__/app/emails/[id].test.tsx`:
```typescript
import { fireEvent, render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import EmailDetails from "@/app/emails/[id]";
import { useEmailById, useDeleteEmail, useSendEmail } from "@/hooks/useEmails";
import type { Email } from "@/api/types/emails";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "e1" }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock("@/hooks/useEmails");
jest.mock("@/components/EmailBodyViewer", () => ({
  EmailBodyViewer: ({ html }: { html: string }) => {
    const { Text } = require("react-native");
    return <Text testID="viewer">{html}</Text>;
  },
}));

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    _id: "e1", send: false, emailDate: "2026-01-15", subject: "Offerte",
    body: "<p>Hallo wereld</p>", contactId: "c1", contactName: "Acme BV",
    contactEmail: "a@b.nl", owner: "o1", createdAt: "2026-01-15",
    tenantId: "t1", emailNumber: 42, ...overrides,
  };
}

function renderScreen() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailDetails />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  (useDeleteEmail as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (useSendEmail as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
});
afterEach(() => jest.clearAllMocks());

it("renders the email metadata and body via the viewer", () => {
  (useEmailById as jest.Mock).mockReturnValue({
    data: { success: true, data: makeEmail() }, isLoading: false, isError: false, error: null,
  });
  const { getByText, getByTestId } = renderScreen();
  expect(getByText("Acme BV")).toBeTruthy();
  expect(getByText("a@b.nl")).toBeTruthy();
  expect(getByTestId("viewer").props.children).toBe("<p>Hallo wereld</p>");
});

it("shows a Dutch error when loading fails", () => {
  (useEmailById as jest.Mock).mockReturnValue({
    data: undefined, isLoading: false, isError: true, error: new Error("boom"),
  });
  expect(renderScreen().getByText(/boom/)).toBeTruthy();
});

it("calls sendEmail when Verzenden is pressed", () => {
  const mutate = jest.fn();
  (useSendEmail as jest.Mock).mockReturnValue({ mutate, isPending: false });
  (useEmailById as jest.Mock).mockReturnValue({
    data: { success: true, data: makeEmail() }, isLoading: false, isError: false, error: null,
  });
  fireEvent.press(renderScreen().getByText("Verzenden"));
  expect(mutate).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- "emails/\[id\].test"`
Expected: FAIL with "Cannot find module '@/app/emails/[id]'".

- [ ] **Step 3: Implement the Details screen**

`src/app/emails/[id].tsx` (mirror `invoices/[id].tsx`; render body with `EmailBodyViewer`, keep the delete `Alert` + header actions + a "Verzenden" button):
```tsx
import { useLayoutEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useEmailById, useDeleteEmail, useSendEmail } from "@/hooks/useEmails";
import { Card } from "@/components/Card";
import { EmailBodyViewer } from "@/components/EmailBodyViewer";
import { Colors, Spacing } from "@/constants/theme";
import { EmailCreateUpdateRequest } from "@/api/types/emails";

export default function EmailDetails() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, error } = useEmailById(id);
  const email = data?.data;
  const deleteMutation = useDeleteEmail();
  const sendEmail = useSendEmail();

  const handleDeletePress = () => {
    Alert.alert(
      "Email verwijderen",
      "Weet je zeker dat je deze email wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id, { onSuccess: () => router.back() }),
        },
      ],
    );
  };

  const handleSend = () => {
    if (!email) {
      return;
    }
    const payload: EmailCreateUpdateRequest = {
      _id: email._id,
      send: email.send,
      emailDate: email.emailDate,
      subject: email.subject,
      body: email.body,
      invoiceId: email.invoiceId,
      contactId: email.contactId,
      contactName: email.contactName,
      contactEmail: email.contactEmail,
      emailNumber: email.emailNumber,
    };
    sendEmail.mutate(payload, {
      onError: (err: Error) =>
        Alert.alert("Fout", err.message || "Fout bij verzenden email"),
      onSuccess: () => Alert.alert("Verzonden", "Email succesvol verstuurd!"),
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: email ? `Email #${email.emailNumber}` : "Email details",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
      headerRight: () =>
        email ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Bewerken"
              onPress={() => router.push(`/emails/edit/${id}`)}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable accessibilityLabel="Verwijderen" onPress={handleDeletePress}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleDeletePress is recreated each render but its identity isn't a meaningful dependency here
  }, [navigation, email, colors.primary, colors.danger, colors.background, colors.text, id]);

  return (
    <ScrollView
      testID="email-details-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van email: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : email ? (
        <>
          <Card bordered style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>
              #{email.emailNumber} - {email.subject}
            </Text>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Ontvanger</Text>
              <Text style={{ color: colors.text }}>{email.contactName || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Email</Text>
              <Text style={{ color: colors.text }}>{email.contactEmail || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Datum</Text>
              <Text style={{ color: colors.text }}>
                {new Date(email.emailDate).toLocaleDateString("nl-NL")}
              </Text>
            </View>
            {email.invoiceId ? (
              <Pressable onPress={() => router.push(`/invoices/${email.invoiceId}`)}>
                <Text style={{ color: colors.primary }}>Bekijk factuur</Text>
              </Pressable>
            ) : null}
          </Card>

          <Card bordered style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Email inhoud</Text>
            <EmailBodyViewer html={email.body} />
          </Card>

          <Pressable
            testID="email-send-button"
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            disabled={sendEmail.isPending}
          >
            <Text style={styles.buttonText}>
              {sendEmail.isPending ? "Verzenden..." : "Verzenden"}
            </Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.three },
  message: { textAlign: "center", marginTop: Spacing.four },
  card: { gap: Spacing.one },
  title: { fontWeight: "600", marginBottom: Spacing.one, fontSize: 16 },
  sectionTitle: { fontWeight: "600", marginBottom: Spacing.two, fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: Spacing.three },
  button: { borderRadius: 8, paddingVertical: Spacing.three, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "600" },
});
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `npm test -- "emails/\[id\].test" && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/emails/[id].tsx" "src/__tests__/app/emails/[id].test.tsx"
git commit -m "feat: add Emails details screen with read-only body"
```

---

### Task 7: Emails Edit/Create screen

**Files:**
- Create: `src/app/emails/edit/[id].tsx`
- Test: `src/__tests__/app/emails/edit/[id].test.tsx`

**Interfaces:**
- Consumes: `useEmailById`, `useCreateOrUpdateEmail`, `useSendEmail` (Task 3), `useContactsList`, `useInvoicesList`, `Dropdown`, `EmailBodyEditor` (Task 4).

- [ ] **Step 1: Write the failing test (mock the editor + pickers)**

`src/__tests__/app/emails/edit/[id].test.tsx`:
```typescript
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import EmailEdit from "@/app/emails/edit/[id]";
import { useEmailById, useCreateOrUpdateEmail, useSendEmail } from "@/hooks/useEmails";
import { useContactsList } from "@/hooks/useContacts";
import { useInvoicesList } from "@/hooks/useInvoices";

let mockId = "create";
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("@/hooks/useEmails");
jest.mock("@/hooks/useContacts");
jest.mock("@/hooks/useInvoices");
jest.mock("@/components/EmailBodyEditor", () => ({
  EmailBodyEditor: ({ onChange }: { onChange: (html: string) => void }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable testID="mock-editor" onPress={() => onChange("<p>Body</p>")}>
        <Text>editor</Text>
      </Pressable>
    );
  },
}));

function renderScreen() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailEdit />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockId = "create";
  (useEmailById as jest.Mock).mockReturnValue({ data: undefined });
  (useContactsList as jest.Mock).mockReturnValue({
    data: { data: { docs: [
      { _id: "c1", typeName: "Bedrijf", companyName: "Acme BV",
        firstName: "", lastName: "", emailAddress: "a@b.nl" },
    ] } },
    isError: false,
  });
  (useInvoicesList as jest.Mock).mockReturnValue({ data: { data: { docs: [] } } });
  (useCreateOrUpdateEmail as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (useSendEmail as jest.Mock).mockReturnValue({ mutate: jest.fn() });
});
afterEach(() => jest.clearAllMocks());

it("blocks save and shows validation errors when required fields are empty", () => {
  const mutate = jest.fn();
  (useCreateOrUpdateEmail as jest.Mock).mockReturnValue({ mutate });
  const { getByTestId, getByText } = renderScreen();

  fireEvent.press(getByTestId("email-save-button"));

  expect(getByText("Onderwerp is verplicht")).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
});

it("saves a valid new email with the editor's HTML body", async () => {
  const mutate = jest.fn();
  (useCreateOrUpdateEmail as jest.Mock).mockReturnValue({ mutate });
  const { getByTestId, getByPlaceholderText } = renderScreen();

  fireEvent.changeText(getByPlaceholderText("Onderwerp van de email"), "Offerte");
  fireEvent.press(getByTestId("contact-dropdown"));
  fireEvent.press(getByTestId("mock-editor")); // sets body
  fireEvent.changeText(getByTestId("email-date-input"), "2026-02-01");
  // select the contact from the dropdown modal
  fireEvent.press(getByTestId("contact-dropdown"));

  fireEvent.press(getByTestId("email-save-button"));

  await waitFor(() =>
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Offerte", body: "<p>Body</p>", contactId: "c1" }),
      expect.anything(),
    ),
  );
});
```

> The contact-selection interaction depends on the `Dropdown` modal internals; if the two-step press proves flaky, drive selection by calling the option directly (see `contacts/edit` tests for the established pattern). Keep the assertion on the `mutate` payload.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- "emails/edit"`
Expected: FAIL with "Cannot find module '@/app/emails/edit/[id]'".

- [ ] **Step 3: Implement the Edit screen**

`src/app/emails/edit/[id].tsx` (mirror `invoices/edit/[id].tsx`; info Card with fields + Verzonden `Switch`, content Card with `EmailBodyEditor`, Dutch validation, Opslaan + Verzenden):
```tsx
import { useEffect, useLayoutEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import {
  useEmailById,
  useCreateOrUpdateEmail,
  useSendEmail,
} from "@/hooks/useEmails";
import { useContactsList } from "@/hooks/useContacts";
import { useInvoicesList } from "@/hooks/useInvoices";
import { Dropdown } from "@/components/Dropdown";
import { EmailBodyEditor } from "@/components/EmailBodyEditor";
import { EmailCreateUpdateRequest } from "@/api/types/emails";
import { Colors, Spacing } from "@/constants/theme";

function contactLabel(contact: {
  typeName: string;
  firstName: string;
  lastName: string;
  companyName: string;
}): string {
  return contact.typeName === "Particulier"
    ? `${contact.lastName}, ${contact.firstName}`
    : contact.companyName;
}

const defaultEmail: Omit<EmailCreateUpdateRequest, "emailNumber"> = {
  send: false,
  emailDate: new Date().toISOString().split("T")[0],
  subject: "",
  body: "",
  invoiceId: "",
  contactId: "",
  contactName: "",
  contactEmail: "",
};

export default function EmailEdit() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "create";

  const [formData, setFormData] = useState<EmailCreateUpdateRequest>({
    ...defaultEmail,
    emailNumber: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: emailData } = useEmailById(id);
  const { data: contactsData, isError: isContactsError } = useContactsList();
  const { data: invoicesData } = useInvoicesList({ offset: 0, limit: 100 });
  const createOrUpdate = useCreateOrUpdateEmail();
  const sendEmail = useSendEmail();

  useEffect(() => {
    if (isNew) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed create-mode defaults + a random email number (parity with source)
      setFormData({
        ...defaultEmail,
        emailNumber: Math.floor(1000 + Math.random() * 9000),
      });
      return;
    }
    if (emailData?.data) {
      const email = emailData.data;
      setFormData({
        _id: email._id,
        send: email.send,
        emailDate: email.emailDate,
        subject: email.subject,
        body: email.body,
        invoiceId: email.invoiceId ?? "",
        contactId: email.contactId,
        contactName: email.contactName,
        contactEmail: email.contactEmail,
        emailNumber: email.emailNumber,
      });
    }
  }, [emailData, isNew]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: isNew ? "Nieuwe Email" : "Email Bewerken",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
    });
  }, [navigation, isNew, colors.background, colors.text, colors.primary]);

  const contacts = contactsData?.data.docs ?? [];
  const invoices = invoicesData?.data.docs ?? [];

  const contactOptions = contacts.map((contact) => ({
    value: contact._id,
    label: contactLabel(contact),
  }));

  const invoiceOptions = [{ value: "", label: "Geen factuur" }].concat(
    invoices.map((invoice) => ({
      value: invoice._id,
      label: `#${invoice.invoiceNumber} - ${invoice.contactName}`,
    })),
  );

  const handleSelectContact = (contactId: string) => {
    const contact = contacts.find((c) => c._id === contactId);
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        contactId,
        contactName: contactLabel(contact),
        contactEmail: contact.emailAddress ?? "",
      }));
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.subject.trim()) next.subject = "Onderwerp is verplicht";
    if (!formData.contactId) next.contactId = "Contactpersoon is verplicht";
    if (!formData.emailDate) next.emailDate = "Datum is verplicht";
    if (!formData.body.trim()) next.body = "Email inhoud is verplicht";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }
    setSaveError(null);
    createOrUpdate.mutate(
      { ...formData, ...(isNew ? {} : { _id: id }) },
      {
        onSuccess: () => router.back(),
        onError: (err: Error) => setSaveError(err.message || "Fout bij opslaan van email"),
      },
    );
  };

  const handleSend = () => {
    if (!validate()) {
      return;
    }
    setSaveError(null);
    sendEmail.mutate(
      { ...formData, ...(isNew ? {} : { _id: id }) },
      {
        onSuccess: () => router.back(),
        onError: (err: Error) => setSaveError(err.message || "Fout bij verzenden van email"),
      },
    );
  };

  return (
    <ScrollView
      testID="email-edit-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email nummer</Text>
        <TextInput
          testID="email-number-input"
          style={[styles.input, { color: colors.textSecondary, borderColor: colors.textSecondary }]}
          value={String(formData.emailNumber)}
          editable={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Onderwerp</Text>
        <TextInput
          testID="email-subject-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.subject}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, subject: text }))}
          placeholder="Onderwerp van de email"
          placeholderTextColor={colors.textSecondary}
        />
        {errors.subject ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.subject}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Contactpersoon</Text>
        <Dropdown
          testID="contact-dropdown"
          label="Contactpersoon"
          value={formData.contactId}
          options={contactOptions}
          onSelect={handleSelectContact}
        />
        {isContactsError ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            Fout bij het laden van contacten
          </Text>
        ) : null}
        {errors.contactId ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.contactId}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Datum</Text>
        <TextInput
          testID="email-date-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.emailDate}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, emailDate: text }))}
          placeholder="JJJJ-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
        {errors.emailDate ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.emailDate}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Gekoppelde factuur (optioneel)
        </Text>
        <Dropdown
          testID="invoice-dropdown"
          label="Gekoppelde factuur"
          value={formData.invoiceId ?? ""}
          options={invoiceOptions}
          onSelect={(value) => setFormData((prev) => ({ ...prev, invoiceId: value }))}
        />
      </View>

      <View style={[styles.field, styles.toggleRow]}>
        <Text style={[styles.label, { color: colors.text }]}>Verzonden</Text>
        <Switch
          testID="email-send-toggle"
          value={formData.send}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, send: value }))}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bericht</Text>
        <EmailBodyEditor
          initialContent={formData.body}
          onChange={(body) => setFormData((prev) => ({ ...prev, body }))}
        />
        {errors.body ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.body}</Text>
        ) : null}
      </View>

      {saveError ? (
        <Text style={[styles.error, { color: colors.danger }]}>{saveError}</Text>
      ) : null}

      <Pressable
        testID="email-save-button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.buttonText}>{isNew ? "Toevoegen" : "Opslaan"}</Text>
      </Pressable>
      <Pressable
        testID="email-send-submit"
        style={[styles.button, { backgroundColor: colors.secondary }]}
        onPress={handleSend}
      >
        <Text style={styles.buttonText}>Verzenden</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.three },
  field: { gap: Spacing.one },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14 },
  sectionTitle: { fontWeight: "600", fontSize: 15 },
  input: { borderBottomWidth: 1, paddingVertical: Spacing.two, fontSize: 16 },
  error: { fontSize: 12 },
  button: { borderRadius: 8, paddingVertical: Spacing.three, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "600" },
});
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `npm test -- "emails/edit" && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/emails/edit/[id].tsx" "src/__tests__/app/emails/edit/[id].test.tsx"
git commit -m "feat: add Emails edit/create screen with tentap editor"
```

---

### Task 8: Full-suite gate + on-device verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS, no emails files skipped.

- [ ] **Step 2: Rebuild the dev client and verify on device**

Run:
```bash
npx expo prebuild
npm run ios   # and/or: npm run android
```
Manually verify (dark and light mode):
- List renders, search filters, pull-to-refresh, infinite scroll, FAB opens create.
- Create: type subject, pick contact (name + email populate), set date, write body with bold/italic/heading/list/link, insert an image by URL, toggle Verzonden, Opslaan returns to the list with the new email present.
- Edit an existing email: body loads into the editor, edits persist on Opslaan.
- Details: body renders formatted (read-only) matching what was composed; "Bekijk factuur" appears only when an invoice is linked; delete confirms and removes; Verzenden shows the success alert.
- Confirm the editor surface colors match the source app in both schemes.

- [ ] **Step 3: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** to run the final gate and choose merge / PR.

---

## Self-review notes

- **Spec coverage:** data layer (Task 2-3), List/Details/Edit (Task 5-7), tentap integration + descope (Task 4), Details read-only render (Task 4/6), date-as-TextInput deviation (Task 7), tests (every task), rebuild + device check (Task 1/8) — all mapped.
- **Deviation carried from design:** the editor uses the default `<Toolbar>` (structurally excludes align/tables) rather than a hand-curated button list, plus an explicit image-URL button. Flagged in Task 4 and the handoff.
- **Type consistency:** service method is `sendEmail` (renamed from source's `useSendEmail`); hook is `useSendEmail`; both used consistently in Tasks 3/6/7. `EmailBodyEditor`/`EmailBodyViewer` prop names match between Task 4 and Tasks 6/7.
