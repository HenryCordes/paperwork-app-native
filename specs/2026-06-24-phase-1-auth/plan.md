# Phase 1: Auth Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port paperwork-app's auth core (login, session management, biometric opt-in/login, secure storage) to paperwork-app-native, faithfully replicating behavior with RN/Expo-equivalent APIs.

**Architecture:** A data layer (axios + TanStack Query + secure storage) underneath an `AuthContext`/`useAuth` pair, a `useSessionManager` hook driving `AppState`-based timeout/re-auth, and a biometrics module (`expo-local-authentication`) consumed by a Login screen and two presentational components (`BiometricOptIn`, `BiometricLogin`). Faithful port of paperwork-app's architecture — same file roles, same flag-based concurrency control — with platform APIs swapped, not redesigned.

**Tech Stack:** Expo, React Native, TypeScript, `expo-secure-store`, `expo-local-authentication`, `@tanstack/react-query` 5, `axios`, Jest + React Native Testing Library.

## Global Constraints

- **Faithful port, not a redesign.** Same architecture as paperwork-app (`AuthContext` + `useAuth`, `useSessionManager`, biometrics service+hook), RN-equivalent platform APIs only.
- **Auth token storage: `expo-secure-store`**, not AsyncStorage (decided in design.md — a real security improvement over the source's plain `localStorage`, no new dependency since `expo-secure-store` is already required for biometric credentials).
- **`expo-secure-store` has no synchronous API.** Unlike the source's `localStorage`-backed synchronous `isAuthenticated()`, every storage read here is async. `AuthContext` exposes an `isLoading` flag that's `true` until the initial check resolves — consumers (the root redirect) must wait for it rather than assume a synchronous initial value.
- **Android skips automatic biometric login entirely** — ported as-is from the source's explicit `isPlatform("android")` checks (a workaround for a dialog-loop issue, not an oversight). Don't remove this without evidence `expo-local-authentication` doesn't have the same issue.
- **Secure storage's web fallback**: `Platform.OS === "web"` branches straight to `localStorage` — no new dependency.
- **No Claude/AI attribution** in any commit message.
- **No simulator launches** as part of automated verification — `npx tsc --noEmit` and `npm test` are the automated signal; manual device testing is the user's call.
- **Reset/PasswordReset are placeholders** in this phase (real screens, no API wiring) — deferred to Phase 4.
- **User-facing text is Dutch**, matching the source exactly where strings are ported.
- Never commit to `main`. Branch `phase-1-auth` already exists (created during brainstorming) — stay on it.
- Never push or open a PR without explicit user authorization — confirm before the final push/PR step specifically.

## File structure (end state after this phase)

```
paperwork-app-native/
  src/
    api/
      axiosInstance.ts          # shared axios instance, base URL from EXPO_PUBLIC_API_URL
      queryClient.ts            # QueryClient instance
      queryKeys.ts              # query key factories (auth.* to start)
      types.ts                  # ApiError + auth request/response types
      services/
        authService.ts          # login/logout/forgotPassword/etc — axios calls
    services/
      secureStorage.ts          # typed expo-secure-store wrapper + web fallback, the 7 storage keys
    contexts/
      AuthContext.tsx           # React Context + Provider
    hooks/
      useAuth.ts                 # login/logout/isAuthenticated/checkAuthentication/getCurrentUser
      useSessionManager.ts       # AppState-driven timeout + re-auth orchestration
      useToast.ts                 # minimal toast hook (the error-UI gap docs/STATE_MANAGEMENT.md flagged)
      biometrics/
        biometrics.types.ts       # BiometricType, BiometricAvailability, etc.
        biometrics.service.ts     # expo-local-authentication wrapper
        useBiometrics.ts          # hook over biometrics.service
    utils/
      bioMetricUtils.ts           # getBiometricName(type, upperCase?)
    components/
      BiometricOptIn.tsx           # RN port of the opt-in card
      BiometricLogin.tsx           # RN port of the biometric-login card
    app/
      login.tsx                    # top-level route, outside (drawer)
      reset.tsx                    # placeholder, outside (drawer)
      password-reset.tsx           # placeholder, outside (drawer)
      _layout.tsx                  # MODIFY: wrap in QueryClientProvider + AuthProvider, register login/reset/password-reset
      index.tsx                    # MODIFY: isAuthenticated ? "/dashboard" : "/login", gated on isLoading
      (drawer)/
        _layout.tsx                 # MODIFY: wire "Uitloggen" to real useAuth().logout()
```

---

## Task 1: API/data-layer bootstrap

**Files:**

- Create: `src/api/types.ts`
- Create: `src/api/axiosInstance.ts`
- Create: `src/api/queryClient.ts`
- Create: `src/api/queryKeys.ts`

**Interfaces:**

- Produces: `ApiError`, `User`, `LoginRequest`, `LoginResponse` types; a default-exported `axiosInstance` (configured `AxiosInstance`); a `queryClient` (configured `QueryClient`); `QueryKeys.auth.base/user()/token()/profile()`.

No test for this task — pure configuration, no behavior to assert (same reasoning as Phase 0's Expo-scaffold task). Task 3 (`authService`) exercises `axiosInstance` for real by mocking it.

- [ ] **Step 1: Install dependencies**

```bash
npm install @tanstack/react-query axios
```

- [ ] **Step 2: Create the shared types**

Create `src/api/types.ts`:

```ts
export interface ApiError {
  message: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
```

- [ ] **Step 3: Create the axios instance**

Create `src/api/axiosInstance.ts`:

```ts
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

export default axiosInstance;
```

`EXPO_PUBLIC_API_URL` is Expo's documented convention for client-exposed env vars (https://docs.expo.dev/guides/environment-variables/) — the RN equivalent of paperwork-app's Vite-specific `VITE_PAPERWORK_API_URL`. **Verification checkpoint:** confirm this convention is still current before relying on it; if it's changed, the fix is local to this one file.

- [ ] **Step 4: Create the query client**

Create `src/api/queryClient.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();
```

- [ ] **Step 5: Create the query keys**

Create `src/api/queryKeys.ts`:

```ts
const QueryKeys = {
  auth: {
    base: ["auth"] as const,
    user: () => [...QueryKeys.auth.base, "user"] as const,
    token: () => [...QueryKeys.auth.base, "token"] as const,
    profile: () => [...QueryKeys.auth.base, "profile"] as const,
  },
};

export default QueryKeys;
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

Expected: clean (nothing imports these yet, so this only confirms the new files themselves typecheck).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/api/types.ts src/api/axiosInstance.ts src/api/queryClient.ts src/api/queryKeys.ts
git commit -m "$(cat <<'EOF'
feat: add data-layer bootstrap (axios, query client, query keys)

Prerequisite for auth and every future API hook - paperwork-app-native
had no axios instance or TanStack Query setup at all until now.
Ported from paperwork-app's equivalent files unchanged except the
env var name (EXPO_PUBLIC_API_URL, Expo's convention, replacing
Vite's VITE_PAPERWORK_API_URL).
EOF
)"
```

---

## Task 2: Secure storage wrapper

**Files:**

- Create: `src/services/secureStorage.ts`
- Create: `src/__tests__/services/secureStorage.test.ts`

**Interfaces:**

- Produces: `secureStorage.getItem(key): Promise<string | null>`, `secureStorage.setItem(key, value): Promise<void>`, `secureStorage.removeItem(key): Promise<void>`. Exported key constants: `AUTH_TOKEN_KEY`, `RECENT_LOGOUT_KEY`, `SESSION_TIMEOUT_KEY`, `LAST_ACTIVE_KEY`, `AUTH_IN_PROGRESS_KEY`, `BIOMETRICS_ENABLED_KEY`, `BIOMETRICS_USERNAME_KEY`, `BIOMETRICS_PASSWORD_KEY` (all `string`). Every later task in this phase imports keys from here — no consumer defines its own key string.

- [ ] **Step 1: Install the dependency**

```bash
npx expo install expo-secure-store
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/services/secureStorage.test.ts`:

```ts
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { secureStorage } from "@/services/secureStorage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("secureStorage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("reads via SecureStore on native platforms", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("stored-value");
    const result = await secureStorage.getItem("some_key");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("some_key");
    expect(result).toBe("stored-value");
  });

  it("writes via SecureStore on native platforms", async () => {
    await secureStorage.setItem("some_key", "some_value");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "some_key",
      "some_value",
    );
  });

  it("removes via SecureStore on native platforms", async () => {
    await secureStorage.removeItem("some_key");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("some_key");
  });

  it("falls back to localStorage on web", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "web" });

    const store: Record<string, string> = {};
    (global as { localStorage?: Storage }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    } as unknown as Storage;

    await secureStorage.setItem("web_key", "web_value");
    expect(await secureStorage.getItem("web_key")).toBe("web_value");
    await secureStorage.removeItem("web_key");
    expect(await secureStorage.getItem("web_key")).toBeNull();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- secureStorage
```

Expected: FAIL — `Cannot find module '@/services/secureStorage'`.

- [ ] **Step 4: Implement**

Create `src/services/secureStorage.ts`:

```ts
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = { getItem, setItem, removeItem };

// Single source of truth for every key this app's auth cluster reads or
// writes — ported verbatim from paperwork-app's capacitor-secure-storage-plugin
// usage across useAuth.ts, useSessionManager.ts, and biometrics.service.ts.
// AUTH_TOKEN_KEY is new: paperwork-app keeps the token in plain localStorage
// under the literal string "authToken", not secure storage (see design.md's
// reasoning for moving it here).
export const AUTH_TOKEN_KEY = "auth_token";
export const RECENT_LOGOUT_KEY = "recent_logout";
export const SESSION_TIMEOUT_KEY = "session_timeout_minutes";
export const LAST_ACTIVE_KEY = "last_active_timestamp";
export const AUTH_IN_PROGRESS_KEY = "auth_in_progress";
export const BIOMETRICS_ENABLED_KEY = "biometrics_enabled";
const BIOMETRICS_CREDENTIALS_SERVER = "nl.paperwork.app.auth";
export const BIOMETRICS_USERNAME_KEY = `${BIOMETRICS_CREDENTIALS_SERVER}_username`;
export const BIOMETRICS_PASSWORD_KEY = `${BIOMETRICS_CREDENTIALS_SERVER}_password`;
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- secureStorage
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/services/secureStorage.ts src/__tests__/services/secureStorage.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add secure storage wrapper

Single typed wrapper around expo-secure-store plus a web fallback,
and the single source of truth for the 7 storage keys paperwork-app
spreads across three files (useAuth.ts, useSessionManager.ts,
biometrics.service.ts). Every later task in this phase imports keys
from here instead of redefining them.
EOF
)"
```

---

## Task 3: authService

**Files:**

- Create: `src/api/services/authService.ts`
- Create: `src/__tests__/api/services/authService.test.ts`

**Interfaces:**

- Consumes: `secureStorage`, `AUTH_TOKEN_KEY` (Task 2); `axiosInstance` (Task 1).
- Produces: `AuthService` class + `authService` singleton default export. `login(credentials: LoginRequest): Promise<LoginResponse>`, `logout(): Promise<void>`, `isAuthenticated(): Promise<boolean>` — both `logout` and `isAuthenticated` are **async** here (unlike the source's synchronous versions), since they go through `secureStorage`. Task 4 depends on this async contract.

Scoped to login/logout/isAuthenticated only — paperwork-app's `authService` also has `getProfile`/`forgotPassword`/`sendResetEmail`/`resetPassword`, but nothing in this phase calls them (Reset/PasswordReset are placeholders; profile fetching is Phase 4). Porting unused methods now would be dead code with no caller — add them when the screen that needs them is actually built.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/api/services/authService.test.ts`:

```ts
import { AuthService } from "@/api/services/authService";
import { secureStorage, AUTH_TOKEN_KEY } from "@/services/secureStorage";

jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  AUTH_TOKEN_KEY: "auth_token",
}));

describe("AuthService", () => {
  const mockAxios = { post: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("stores the token on success", async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          token: "abc123",
          user: { id: "1", email: "a@b.com", name: "A" },
        },
      });
      const service = new AuthService(mockAxios as never);

      const result = await service.login({
        email: "a@b.com",
        password: "pw",
      });

      expect(mockAxios.post).toHaveBeenCalledWith("auth/login", {
        email: "a@b.com",
        password: "pw",
      });
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        AUTH_TOKEN_KEY,
        "abc123",
      );
      expect(result.token).toBe("abc123");
    });

    it("throws the API's error message on failure", async () => {
      mockAxios.post.mockRejectedValue({
        response: { data: { message: "Inloggegevens onjuist" } },
      });
      const service = new AuthService(mockAxios as never);

      await expect(
        service.login({ email: "a@b.com", password: "wrong" }),
      ).rejects.toThrow("Inloggegevens onjuist");
    });

    it("falls back to a generic Dutch message when the API gives none", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new AuthService(mockAxios as never);

      await expect(
        service.login({ email: "a@b.com", password: "wrong" }),
      ).rejects.toThrow("Login mislukt");
    });
  });

  describe("logout", () => {
    it("removes the stored token", async () => {
      const service = new AuthService(mockAxios as never);
      await service.logout();
      expect(secureStorage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
    });
  });

  describe("isAuthenticated", () => {
    it("returns true when a token is stored", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue("abc123");
      const service = new AuthService(mockAxios as never);
      expect(await service.isAuthenticated()).toBe(true);
    });

    it("returns false when no token is stored", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
      const service = new AuthService(mockAxios as never);
      expect(await service.isAuthenticated()).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- authService
```

Expected: FAIL — `Cannot find module '@/api/services/authService'`.

- [ ] **Step 3: Implement**

Create `src/api/services/authService.ts`:

```ts
import { AxiosError, AxiosInstance } from "axios";

import { ApiError, LoginRequest, LoginResponse } from "../types";
import axiosInstance from "../axiosInstance";
import { secureStorage, AUTH_TOKEN_KEY } from "@/services/secureStorage";

export class AuthService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.axios.post<LoginResponse>(
        "auth/login",
        credentials,
      );

      if (response.data.token) {
        await secureStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Login mislukt";
      throw new Error(errorMessage);
    }
  }

  async logout(): Promise<void> {
    await secureStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await secureStorage.getItem(AUTH_TOKEN_KEY);
    return token !== null;
  }
}

export const authService = new AuthService(axiosInstance);

export default authService;
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- authService
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/api/services/authService.ts src/__tests__/api/services/authService.test.ts
git commit -m "$(cat <<'EOF'
feat: add authService (login/logout/isAuthenticated)

Same constructor-injected-axios, exported-singleton pattern as
paperwork-app's authService, scoped to what this phase actually
needs - getProfile/forgotPassword/sendResetEmail/resetPassword have
no caller yet (Reset/PasswordReset are placeholders this phase) and
aren't ported until something calls them.
EOF
)"
```

---

## Task 4: AuthContext + useAuth

**Files:**

- Create: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`
- Create: `src/__tests__/contexts/AuthContext.test.tsx`
- Create: `src/__tests__/hooks/useAuth.test.tsx`

**Interfaces:**

- Consumes: `authService` (Task 3); `secureStorage`, `RECENT_LOGOUT_KEY` (Task 2); `QueryKeys` (Task 1).
- Produces: `AuthProvider` (component), `useAuthContext()` returning `{ isAuthenticated: boolean, isLoading: boolean, checkAuthentication: () => Promise<boolean>, setAuthenticated: (value: boolean) => void }`. `useAuth()` returning `{ login: UseMutationResult<LoginResponse, Error, LoginRequest>, logout: () => Promise<void>, isAuthenticated: () => boolean, checkAuthentication: () => Promise<boolean>, getCurrentUser: () => User | undefined }`. Task 5 (`useSessionManager`) and Task 8 (Login screen) both consume `useAuth()`'s exact shape above.

- [ ] **Step 1: Write the failing AuthContext tests**

Create `src/__tests__/contexts/AuthContext.test.tsx`:

```tsx
import { renderHook, waitFor, act } from "@testing-library/react-native";

import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import authService from "@/api/services/authService";

jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn() },
}));

describe("AuthProvider", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("starts loading and resolves to authenticated when a token exists", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("resolves to unauthenticated when no token exists", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("setAuthenticated updates state synchronously", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setAuthenticated(true);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- AuthContext
```

Expected: FAIL — `Cannot find module '@/contexts/AuthContext'`.

- [ ] **Step 3: Implement AuthContext**

Create `src/contexts/AuthContext.tsx`:

```tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";

import authService from "@/api/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthentication: () => Promise<boolean>;
  setAuthenticated: (value: boolean) => void;
}

const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  checkAuthentication: async () => false,
  setAuthenticated: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthentication = useCallback(async (): Promise<boolean> => {
    const status = await authService.isAuthenticated();
    setIsAuthenticated(status);
    return status;
  }, []);

  const setAuthenticated = (value: boolean): void => {
    setIsAuthenticated(value);
  };

  // expo-secure-store has no synchronous read, unlike paperwork-app's
  // localStorage-backed check - isLoading gates consumers (the root
  // redirect, Task 9) until this resolves, so nothing flashes the wrong
  // screen on cold start.
  useEffect(() => {
    checkAuthentication().finally(() => setIsLoading(false));
  }, [checkAuthentication]);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      checkAuthentication,
      setAuthenticated,
    }),
    [isAuthenticated, isLoading, checkAuthentication],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => useContext(AuthContext);

export default AuthContext;
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- AuthContext
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing useAuth tests**

Create `src/__tests__/hooks/useAuth.test.tsx`:

```tsx
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/contexts/AuthContext";
import authService from "@/api/services/authService";
import { secureStorage } from "@/services/secureStorage";

jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn(), login: jest.fn(), logout: jest.fn() },
}));
jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  RECENT_LOGOUT_KEY: "recent_logout",
}));

function renderUseAuth() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe("useAuth", () => {
  beforeEach(() => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("logs in and flips isAuthenticated", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      token: "abc",
      user: { id: "1", email: "a@b.com", name: "A" },
    });

    const { result } = renderUseAuth();
    await waitFor(() => expect(result.current.isAuthenticated()).toBe(false));

    await act(async () => {
      await result.current.login.mutateAsync({
        email: "a@b.com",
        password: "pw",
      });
    });

    expect(result.current.isAuthenticated()).toBe(true);
    expect(result.current.getCurrentUser()).toEqual({
      id: "1",
      email: "a@b.com",
      name: "A",
    });
  });

  it("logs out, flips isAuthenticated, and sets the recent-logout flag", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      token: "abc",
      user: { id: "1", email: "a@b.com", name: "A" },
    });

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.login.mutateAsync({
        email: "a@b.com",
        password: "pw",
      });
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated()).toBe(false);
    expect(secureStorage.setItem).toHaveBeenCalledWith("recent_logout", "true");
    expect(authService.logout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

```bash
npm test -- useAuth
```

Expected: FAIL — `Cannot find module '@/hooks/useAuth'`.

- [ ] **Step 7: Implement useAuth**

Create `src/hooks/useAuth.ts`:

```ts
import {
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { LoginRequest, LoginResponse, User } from "@/api/types";
import authService from "@/api/services/authService";
import QueryKeys from "@/api/queryKeys";
import { useAuthContext } from "@/contexts/AuthContext";
import { secureStorage, RECENT_LOGOUT_KEY } from "@/services/secureStorage";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const authContext = useAuthContext();

  const login: UseMutationResult<LoginResponse, Error, LoginRequest> =
    useMutation({
      mutationFn: (credentials: LoginRequest) => authService.login(credentials),
      onSuccess: (data) => {
        authContext.setAuthenticated(true);
        queryClient.invalidateQueries({ queryKey: QueryKeys.auth.base });
        queryClient.setQueryData(QueryKeys.auth.user(), data.user);
      },
    });

  const logout = async () => {
    await authService.logout();

    // Don't clear biometric credentials on logout - only block automatic
    // biometric re-login until the next manual login or biometric attempt.
    await secureStorage.setItem(RECENT_LOGOUT_KEY, "true");

    authContext.setAuthenticated(false);

    queryClient.invalidateQueries({ queryKey: QueryKeys.auth.base });
    queryClient.removeQueries({ queryKey: QueryKeys.auth.user() });
  };

  const isAuthenticated = () => authContext.isAuthenticated;

  const checkAuthentication = () => authContext.checkAuthentication();

  const getCurrentUser = () =>
    queryClient.getQueryData<User>(QueryKeys.auth.user());

  return {
    login,
    logout,
    isAuthenticated,
    checkAuthentication,
    getCurrentUser,
  };
};

export default useAuth;
```

Drops one line from the source's `logout`: `queryClient.invalidateQueries({ queryKey: QueryKeys.expenses.base })`. `expenses` query keys don't exist in this repo yet (Phase 4) — nothing to invalidate. Add it back when Phase 4 introduces `QueryKeys.expenses`.

- [ ] **Step 8: Run to verify it passes**

```bash
npm test -- useAuth
```

Expected: PASS, 2 tests.

- [ ] **Step 9: Commit**

```bash
git add src/contexts/AuthContext.tsx src/hooks/useAuth.ts src/__tests__/contexts/AuthContext.test.tsx src/__tests__/hooks/useAuth.test.tsx
git commit -m "$(cat <<'EOF'
feat: add AuthContext and useAuth

Same shape as paperwork-app's pair, with one necessary change:
isAuthenticated's initial check is now async (expo-secure-store has
no sync read, unlike localStorage), so AuthContext exposes isLoading
to gate consumers until the check resolves.
EOF
)"
```

---

## Task 5: Biometrics module

**Files:**

- Create: `src/hooks/biometrics/biometrics.types.ts`
- Create: `src/hooks/biometrics/biometrics.service.ts`
- Create: `src/hooks/biometrics/useBiometrics.ts`
- Create: `src/utils/bioMetricUtils.ts`
- Create: `src/__tests__/hooks/biometrics/biometrics.service.test.ts`
- Create: `src/__tests__/utils/bioMetricUtils.test.ts`

**Interfaces:**

- Consumes: `secureStorage`, `BIOMETRICS_ENABLED_KEY`, `BIOMETRICS_USERNAME_KEY`, `BIOMETRICS_PASSWORD_KEY` (Task 2).
- Produces: `BiometricType` enum (`NONE`/`FINGERPRINT`/`FACE`/`IRIS`), `BiometricAvailability`/`BiometricCredentials`/`BiometricAuthOptions` types, `BiometricsService` class, `useBiometrics()` returning `UseBiometrics` (`checkAvailability`, `authenticate`, `saveCredentials`, `getCredentials`, `clearCredentials`, `isBiometricsEnabled`, `setBiometricsEnabled` — all the methods below, no `deleteCredentials`/`getBiometricType`, see note). `getBiometricName(type, upperCase?): string`. Tasks 6, 7, and 8 all consume `useBiometrics()`'s exact shape.

Two methods from paperwork-app's `biometrics.service.ts` are dropped, not ported: `deleteCredentials` (the source's own comment says it's "identical to clearCredentials," kept only for backward compatibility — no reason to carry that duplication over) and `getBiometricType` (always re-derivable from `checkAvailability()`'s result; no caller needs it as a separate call). Source's `useBiometrics` also held an `availability` state value that was set but never read by any consumer (`const [, setAvailability] = useState(...)` — the getter is discarded) — not ported, since it's genuinely dead state, not a behavior change.

- [ ] **Step 1: Install the dependency**

```bash
npx expo install expo-local-authentication
```

- [ ] **Step 2: Create the types (no test — pure type definitions)**

Create `src/hooks/biometrics/biometrics.types.ts`:

```ts
export enum BiometricType {
  NONE = "none",
  FINGERPRINT = "fingerprint",
  FACE = "face",
  IRIS = "iris",
}

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType?: BiometricType;
  canUseFaceID?: boolean;
  canUseFingerprint?: boolean;
  canUseIris?: boolean;
  error?: string;
}

export interface BiometricCredentials {
  username: string;
  password: string;
}

export interface BiometricAuthOptions {
  reason: string;
  title?: string;
  subtitle?: string;
  cancelTitle?: string;
  allowDeviceCredential?: boolean;
}

export interface UseBiometrics {
  checkAvailability: () => Promise<BiometricAvailability>;
  authenticate: (options: BiometricAuthOptions) => Promise<boolean>;
  saveCredentials: (credentials: BiometricCredentials) => Promise<boolean>;
  getCredentials: () => Promise<BiometricCredentials | null>;
  clearCredentials: () => Promise<void>;
  isBiometricsEnabled: () => Promise<boolean>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
}
```

- [ ] **Step 3: Write the failing service tests**

Create `src/__tests__/hooks/biometrics/biometrics.service.test.ts`:

```ts
import * as LocalAuthentication from "expo-local-authentication";

import { BiometricsService } from "@/hooks/biometrics/biometrics.service";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";
import {
  secureStorage,
  BIOMETRICS_USERNAME_KEY,
  BIOMETRICS_PASSWORD_KEY,
  BIOMETRICS_ENABLED_KEY,
} from "@/services/secureStorage";

jest.mock("expo-local-authentication");
jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  BIOMETRICS_USERNAME_KEY: "nl.paperwork.app.auth_username",
  BIOMETRICS_PASSWORD_KEY: "nl.paperwork.app.auth_password",
  BIOMETRICS_ENABLED_KEY: "biometrics_enabled",
}));

describe("BiometricsService", () => {
  const service = new BiometricsService();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkAvailability", () => {
    it("reports available with face type when hardware, enrollment, and face type are present", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(
        true,
      );
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(
        true,
      );
      (
        LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock
      ).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await service.checkAvailability();

      expect(result).toEqual({
        isAvailable: true,
        biometryType: BiometricType.FACE,
        canUseFaceID: true,
        canUseFingerprint: false,
        canUseIris: false,
      });
    });

    it("reports unavailable when there's no hardware", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(
        false,
      );
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(
        false,
      );
      (
        LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.checkAvailability();
      expect(result.isAvailable).toBe(false);
    });
  });

  describe("authenticate", () => {
    it("returns true on success", async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });
      expect(await service.authenticate({ reason: "test" })).toBe(true);
    });

    it("returns false on failure", async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: "user_cancel",
      });
      expect(await service.authenticate({ reason: "test" })).toBe(false);
    });
  });

  describe("credentials", () => {
    it("saves username and password", async () => {
      const saved = await service.saveCredentials({
        username: "a@b.com",
        password: "pw",
      });
      expect(saved).toBe(true);
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        BIOMETRICS_USERNAME_KEY,
        "a@b.com",
      );
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        BIOMETRICS_PASSWORD_KEY,
        "pw",
      );
    });

    it("returns null when either credential is missing", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce("a@b.com");
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      expect(await service.getCredentials()).toBeNull();
    });

    it("returns stored credentials when both exist", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce("a@b.com");
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce("pw");
      expect(await service.getCredentials()).toEqual({
        username: "a@b.com",
        password: "pw",
      });
    });
  });

  describe("enabled flag", () => {
    it("isBiometricsEnabled reflects the stored flag", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue("true");
      expect(await service.isBiometricsEnabled()).toBe(true);
    });

    it("setBiometricsEnabled stores the flag as a string", async () => {
      await service.setBiometricsEnabled(true);
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        BIOMETRICS_ENABLED_KEY,
        "true",
      );
    });
  });
});
```

- [ ] **Step 4: Run to verify it fails**

```bash
npm test -- biometrics.service
```

Expected: FAIL — `Cannot find module '@/hooks/biometrics/biometrics.service'`.

- [ ] **Step 5: Implement the service**

Create `src/hooks/biometrics/biometrics.service.ts`:

```ts
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

import {
  secureStorage,
  BIOMETRICS_ENABLED_KEY,
  BIOMETRICS_USERNAME_KEY,
  BIOMETRICS_PASSWORD_KEY,
} from "@/services/secureStorage";

import {
  BiometricAuthOptions,
  BiometricAvailability,
  BiometricCredentials,
  BiometricType,
} from "./biometrics.types";

function toAppBiometricType(
  types: LocalAuthentication.AuthenticationType[],
): BiometricType {
  if (
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  ) {
    return BiometricType.FACE;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return BiometricType.FINGERPRINT;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return BiometricType.IRIS;
  }
  return BiometricType.NONE;
}

export class BiometricsService {
  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometryType = toAppBiometricType(supportedTypes);

      return {
        isAvailable: hasHardware && isEnrolled,
        biometryType,
        canUseFaceID: biometryType === BiometricType.FACE,
        canUseFingerprint: biometryType === BiometricType.FINGERPRINT,
        canUseIris: biometryType === BiometricType.IRIS,
      };
    } catch (error) {
      return {
        isAvailable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async authenticate(options: BiometricAuthOptions): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.reason,
        cancelLabel: options.cancelTitle,
        disableDeviceFallback: options.allowDeviceCredential === false,
      });

      if (result.success) {
        return true;
      }

      // iOS system-cancel is retryable (paperwork-app treats it as
      // non-fatal so the OS can re-prompt); Android cancel of any kind is
      // not, consistent with Android being excluded from the automatic
      // biometric path throughout this phase.
      if (result.error === "system_cancel" && Platform.OS !== "android") {
        return false;
      }

      return false;
    } catch {
      return false;
    }
  }

  async saveCredentials(credentials: BiometricCredentials): Promise<boolean> {
    try {
      await secureStorage.setItem(
        BIOMETRICS_USERNAME_KEY,
        credentials.username,
      );
      await secureStorage.setItem(
        BIOMETRICS_PASSWORD_KEY,
        credentials.password,
      );
      return true;
    } catch {
      return false;
    }
  }

  async clearCredentials(): Promise<void> {
    await secureStorage.removeItem(BIOMETRICS_USERNAME_KEY);
    await secureStorage.removeItem(BIOMETRICS_PASSWORD_KEY);
  }

  async getCredentials(): Promise<BiometricCredentials | null> {
    const username = await secureStorage.getItem(BIOMETRICS_USERNAME_KEY);
    const password = await secureStorage.getItem(BIOMETRICS_PASSWORD_KEY);

    if (!username || !password) {
      return null;
    }

    return { username, password };
  }

  async isBiometricsEnabled(): Promise<boolean> {
    const value = await secureStorage.getItem(BIOMETRICS_ENABLED_KEY);
    return value === "true";
  }

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await secureStorage.setItem(
      BIOMETRICS_ENABLED_KEY,
      enabled ? "true" : "false",
    );
  }
}
```

**Verification checkpoint:** `expo-local-authentication`'s `authenticateAsync` options/result shape (`promptMessage`, `cancelLabel`, `disableDeviceFallback`, `result.success`, `result.error` string values like `"user_cancel"`/`"system_cancel"`) is this library's current documented API — check https://docs.expo.dev/versions/latest/sdk/local-authentication/ if a test fails on an unrecognized option or the error string doesn't match.

- [ ] **Step 6: Run to verify it passes**

```bash
npm test -- biometrics.service
```

Expected: PASS, 7 tests.

- [ ] **Step 7: Implement the hook (no separate test — pure pass-through, no branching logic; exercised indirectly by Tasks 6-8's tests)**

Create `src/hooks/biometrics/useBiometrics.ts`:

```ts
import { useCallback } from "react";

import { BiometricsService } from "./biometrics.service";
import {
  BiometricAuthOptions,
  BiometricAvailability,
  BiometricCredentials,
  UseBiometrics,
} from "./biometrics.types";

const biometricsService = new BiometricsService();

export const useBiometrics = (): UseBiometrics => {
  const checkAvailability = useCallback(
    (): Promise<BiometricAvailability> => biometricsService.checkAvailability(),
    [],
  );

  const authenticate = useCallback(
    (options: BiometricAuthOptions): Promise<boolean> =>
      biometricsService.authenticate(options),
    [],
  );

  const saveCredentials = useCallback(
    (credentials: BiometricCredentials): Promise<boolean> =>
      biometricsService.saveCredentials(credentials),
    [],
  );

  const getCredentials = useCallback(
    (): Promise<BiometricCredentials | null> =>
      biometricsService.getCredentials(),
    [],
  );

  const clearCredentials = useCallback(
    (): Promise<void> => biometricsService.clearCredentials(),
    [],
  );

  const isBiometricsEnabled = useCallback(
    (): Promise<boolean> => biometricsService.isBiometricsEnabled(),
    [],
  );

  const setBiometricsEnabled = useCallback(
    (enabled: boolean): Promise<void> =>
      biometricsService.setBiometricsEnabled(enabled),
    [],
  );

  return {
    checkAvailability,
    authenticate,
    saveCredentials,
    getCredentials,
    clearCredentials,
    isBiometricsEnabled,
    setBiometricsEnabled,
  };
};

export default useBiometrics;
```

- [ ] **Step 8: Write the failing bioMetricUtils test**

Create `src/__tests__/utils/bioMetricUtils.test.ts`:

```ts
import { Platform } from "react-native";

import { getBiometricName } from "@/utils/bioMetricUtils";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";

describe("getBiometricName", () => {
  afterEach(() => {
    Object.defineProperty(Platform, "OS", { get: () => "ios" });
  });

  it("returns FaceId on iOS for FACE", () => {
    Object.defineProperty(Platform, "OS", { get: () => "ios" });
    expect(getBiometricName(BiometricType.FACE)).toBe("FaceId");
  });

  it("returns a lowercase Dutch-context fallback on Android for FACE", () => {
    Object.defineProperty(Platform, "OS", { get: () => "android" });
    expect(getBiometricName(BiometricType.FACE)).toBe("face unlock");
  });

  it("respects the upperCase flag on Android for FINGERPRINT", () => {
    Object.defineProperty(Platform, "OS", { get: () => "android" });
    expect(getBiometricName(BiometricType.FINGERPRINT, true)).toBe(
      "Fingerprint Unlock",
    );
  });

  it("falls back to a generic name for NONE", () => {
    expect(getBiometricName(BiometricType.NONE)).toBe("biometrisch");
  });
});
```

- [ ] **Step 9: Run to verify it fails**

```bash
npm test -- bioMetricUtils
```

Expected: FAIL — `Cannot find module '@/utils/bioMetricUtils'`.

- [ ] **Step 10: Implement**

Create `src/utils/bioMetricUtils.ts`:

```ts
import { Platform } from "react-native";

import { BiometricType } from "@/hooks/biometrics/biometrics.types";

export const getBiometricName = (
  biometryType: BiometricType,
  upperCase?: boolean,
): string => {
  let androidFace = "face unlock";
  let androidFingerprint = "fingerprint unlock";
  let biometric = "biometrisch";

  if (upperCase) {
    androidFace = "Face Unlock";
    androidFingerprint = "Fingerprint Unlock";
    biometric = "Biometrisch";
  }

  if (biometryType === BiometricType.FACE) {
    return Platform.OS === "android" ? androidFace : "FaceId";
  }
  if (biometryType === BiometricType.FINGERPRINT) {
    return Platform.OS === "android" ? androidFingerprint : "TouchId";
  }
  return biometric;
};
```

- [ ] **Step 11: Run to verify it passes**

```bash
npm test -- bioMetricUtils
```

Expected: PASS, 4 tests.

- [ ] **Step 12: Commit**

```bash
git add src/hooks/biometrics src/utils/bioMetricUtils.ts src/__tests__/hooks/biometrics src/__tests__/utils/bioMetricUtils.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add biometrics module (expo-local-authentication)

Same service+hook split as paperwork-app's biometrics module,
@aparajita/capacitor-biometric-auth swapped for
expo-local-authentication. Drops deleteCredentials (source's own
comment: identical to clearCredentials) and getBiometricType
(re-derivable from checkAvailability) - both genuinely redundant,
not behavior changes.
EOF
)"
```

---

## Task 6: useSessionManager

**Files:**

- Create: `src/hooks/useSessionManager.ts`
- Create: `src/__tests__/hooks/useSessionManager.test.tsx`

**Interfaces:**

- Consumes: `useBiometrics()` (Task 5), `useAuth()` (Task 4), `getBiometricName` (Task 5), `secureStorage` + key constants (Task 2), `useRouter` from `expo-router`.
- Produces: `useSessionManager()` returning `{ sessionTimeoutMinutes: number, saveSessionTimeout: (minutes: number) => Promise<void>, updateLastActive: () => Promise<void> }`.

Ports paperwork-app's `useSessionManager.ts` with three platform-forced swaps: Capacitor's `App.addListener("appStateChange", ...)` (which delivers `{ isActive: boolean }`) becomes RN's `AppState.addEventListener("change", ...)` (which delivers a state string — `"active"`/`"background"`/`"inactive"`); `isPlatform("android")` becomes `Platform.OS === "android"`; `useIonRouter()` + `ionRouter.push("/login", "root")` becomes `useRouter()` + `router.replace("/login")`. The source's nested try/catch-per-storage-call is simplified throughout, since `secureStorage.getItem` returns `null` on a missing key instead of throwing (Task 2) — same behavior, less noise. The ~15 `console.log` calls in the source are not all ported; the behavior they're tracing is unchanged, only the logging verbosity.

`DEFAULT_SESSION_TIMEOUT = 15` is inlined as a local constant (paperwork-app keeps it in `src/common/versionConstants.ts`, which doesn't exist in this repo yet and isn't worth creating for one constant with no other consumer yet).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/hooks/useSessionManager.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

import { useSessionManager } from "@/hooks/useSessionManager";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { useAuth } from "@/hooks/useAuth";
import {
  secureStorage,
  LAST_ACTIVE_KEY,
  RECENT_LOGOUT_KEY,
  SESSION_TIMEOUT_KEY,
  AUTH_IN_PROGRESS_KEY,
} from "@/services/secureStorage";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/biometrics/useBiometrics");
jest.mock("@/hooks/useAuth");
jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  LAST_ACTIVE_KEY: "last_active_timestamp",
  RECENT_LOGOUT_KEY: "recent_logout",
  SESSION_TIMEOUT_KEY: "session_timeout_minutes",
  AUTH_IN_PROGRESS_KEY: "auth_in_progress",
}));

const mockReplace = jest.fn();
const mockLoginMutateAsync = jest.fn();
const mockAuthenticate = jest.fn();
const mockGetCredentials = jest.fn();
const mockIsBiometricsEnabled = jest.fn();
const mockCheckAvailability = jest.fn();

function mockStorage(values: Record<string, string | null>) {
  (secureStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key in values ? values[key] : null),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
  (useAuth as jest.Mock).mockReturnValue({
    login: { mutateAsync: mockLoginMutateAsync },
  });
  (useBiometrics as jest.Mock).mockReturnValue({
    isBiometricsEnabled: mockIsBiometricsEnabled,
    authenticate: mockAuthenticate,
    getCredentials: mockGetCredentials,
    checkAvailability: mockCheckAvailability,
  });
  mockStorage({});
});

describe("useSessionManager", () => {
  it("treats a session as timed out once elapsed time exceeds the stored timeout, and checks biometrics", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });
    mockIsBiometricsEnabled.mockResolvedValue(false);

    renderHook(() => useSessionManager());

    await waitFor(() => expect(mockIsBiometricsEnabled).toHaveBeenCalled());
  });

  it("does not treat a session as timed out within the window, and skips biometrics", async () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: fiveMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });

    renderHook(() => useSessionManager());

    await waitFor(() =>
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        LAST_ACTIVE_KEY,
        expect.any(String),
      ),
    );
    expect(mockIsBiometricsEnabled).not.toHaveBeenCalled();
  });

  it("never attempts biometric auth on Android, even after timeout", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "android" });

    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });

    renderHook(() => useSessionManager());
    await waitFor(() =>
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        AUTH_IN_PROGRESS_KEY,
        "true",
      ),
    );
    expect(mockIsBiometricsEnabled).not.toHaveBeenCalled();
    expect(mockAuthenticate).not.toHaveBeenCalled();

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });

  it("skips automatic biometric auth when the recent-logout flag is set", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
      [RECENT_LOGOUT_KEY]: "true",
    });

    renderHook(() => useSessionManager());

    await waitFor(() =>
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        AUTH_IN_PROGRESS_KEY,
        "true",
      ),
    );
    expect(mockIsBiometricsEnabled).not.toHaveBeenCalled();
  });

  it("logs back in with stored credentials after a successful biometric re-auth", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });
    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockGetCredentials.mockResolvedValue({
      username: "a@b.com",
      password: "pw",
    });
    mockCheckAvailability.mockResolvedValue({ biometryType: "face" });
    mockAuthenticate.mockResolvedValue(true);
    mockLoginMutateAsync.mockResolvedValue({ token: "abc", user: {} });

    renderHook(() => useSessionManager());

    await waitFor(() =>
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "pw",
      }),
    );
  });

  it("redirects to /login when biometric re-auth fails", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });
    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockGetCredentials.mockResolvedValue({
      username: "a@b.com",
      password: "pw",
    });
    mockCheckAvailability.mockResolvedValue({ biometryType: "face" });
    mockAuthenticate.mockResolvedValue(false);

    renderHook(() => useSessionManager());

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });
});
```

Scoped to the initial-mount check, which exercises the same `checkSessionTimeout`/`handleBiometricAuth` logic the `AppState` listener also calls — not separately re-testing the event-subscription wiring itself, since that would duplicate this coverage for no new signal.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- useSessionManager
```

Expected: FAIL — `Cannot find module '@/hooks/useSessionManager'`.

- [ ] **Step 3: Implement**

Create `src/hooks/useSessionManager.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useRouter } from "expo-router";

import { useBiometrics } from "./biometrics/useBiometrics";
import { useAuth } from "./useAuth";
import { BiometricType } from "./biometrics/biometrics.types";
import { getBiometricName } from "@/utils/bioMetricUtils";
import {
  secureStorage,
  LAST_ACTIVE_KEY,
  RECENT_LOGOUT_KEY,
  SESSION_TIMEOUT_KEY,
  AUTH_IN_PROGRESS_KEY,
} from "@/services/secureStorage";

// Ported from paperwork-app's src/common/versionConstants.ts.
const DEFAULT_SESSION_TIMEOUT = 15;

export const useSessionManager = () => {
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(
    DEFAULT_SESSION_TIMEOUT,
  );
  const {
    isBiometricsEnabled,
    authenticate,
    getCredentials,
    checkAvailability,
  } = useBiometrics();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const loadSessionTimeout = async () => {
      const stored = await secureStorage.getItem(SESSION_TIMEOUT_KEY);
      if (stored === null) {
        await secureStorage.setItem(
          SESSION_TIMEOUT_KEY,
          DEFAULT_SESSION_TIMEOUT.toString(),
        );
        setSessionTimeoutMinutes(DEFAULT_SESSION_TIMEOUT);
        return;
      }
      setSessionTimeoutMinutes(parseInt(stored, 10));
    };
    loadSessionTimeout();
  }, []);

  const updateLastActive = useCallback(async () => {
    await secureStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }, []);

  const checkSessionTimeout = useCallback(async (): Promise<boolean> => {
    const lastActiveValue = await secureStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActiveValue === null) {
      return false;
    }
    const lastActive = parseInt(lastActiveValue, 10);
    const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
    return Date.now() - lastActive > timeoutMs;
  }, [sessionTimeoutMinutes]);

  const saveSessionTimeout = useCallback(async (minutes: number) => {
    await secureStorage.setItem(SESSION_TIMEOUT_KEY, minutes.toString());
    setSessionTimeoutMinutes(minutes);
  }, []);

  const setAuthInProgress = useCallback(async (inProgress: boolean) => {
    await secureStorage.setItem(AUTH_IN_PROGRESS_KEY, inProgress.toString());
  }, []);

  const checkAuthInProgress = useCallback(async (): Promise<boolean> => {
    return (await secureStorage.getItem(AUTH_IN_PROGRESS_KEY)) === "true";
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    if (await checkAuthInProgress()) {
      return;
    }
    await setAuthInProgress(true);

    if (Platform.OS === "android") {
      return;
    }

    const recentLogout = await secureStorage.getItem(RECENT_LOGOUT_KEY);
    if (recentLogout === "true") {
      return;
    }

    if (!(await isBiometricsEnabled())) {
      return;
    }

    const credentials = await getCredentials();
    if (!credentials) {
      return;
    }

    const availability = await checkAvailability();
    const biometryType = availability.biometryType || BiometricType.NONE;

    const authenticated = await authenticate({
      reason: "Verifieer je identiteit om door te gaan",
      title: `${getBiometricName(biometryType, true)} login`,
      subtitle: `Login met ${getBiometricName(biometryType)}`,
      allowDeviceCredential: true,
    });

    if (authenticated) {
      await setAuthInProgress(false);
      await secureStorage.removeItem(RECENT_LOGOUT_KEY);

      try {
        await login.mutateAsync({
          email: credentials.username,
          password: credentials.password,
        });
        await updateLastActive();
      } catch {
        // Stored credentials no longer valid - fall through to manual
        // login rather than retrying silently.
      }
    } else {
      router.replace("/login");
      await setAuthInProgress(false);
    }
  }, [
    checkAuthInProgress,
    setAuthInProgress,
    isBiometricsEnabled,
    getCredentials,
    checkAvailability,
    authenticate,
    login,
    updateLastActive,
    router,
  ]);

  useEffect(() => {
    const handleAppStateChange = async (state: AppStateStatus) => {
      if (state === "active") {
        const hasTimedOut = await checkSessionTimeout();
        if (hasTimedOut) {
          if (Platform.OS !== "android") {
            handleBiometricAuth();
          }
        } else {
          updateLastActive();
        }
      } else {
        updateLastActive();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    const initialCheck = async () => {
      const hasTimedOut = await checkSessionTimeout();
      if (hasTimedOut) {
        if (Platform.OS !== "android") {
          handleBiometricAuth();
        }
      } else {
        updateLastActive();
      }
    };
    initialCheck();

    return () => {
      subscription.remove();
    };
  }, [checkSessionTimeout, handleBiometricAuth, updateLastActive]);

  useEffect(() => {
    secureStorage.removeItem(AUTH_IN_PROGRESS_KEY);
  }, []);

  return {
    sessionTimeoutMinutes,
    saveSessionTimeout,
    updateLastActive,
  };
};

export default useSessionManager;
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- useSessionManager
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSessionManager.ts src/__tests__/hooks/useSessionManager.test.tsx
git commit -m "$(cat <<'EOF'
feat: add useSessionManager

Faithful port of paperwork-app's session-timeout + biometric-reauth
orchestration. Three platform-forced swaps: RN AppState instead of
Capacitor's App listener, Platform.OS instead of isPlatform, and
expo-router's router.replace instead of useIonRouter. The
Android-skip and recent-logout-skip behaviors are unchanged - both
load-bearing, not incidental.
EOF
)"
```

---

## Task 7: BiometricOptIn + BiometricLogin components

**Files:**

- Create: `src/components/BiometricOptIn.tsx`
- Create: `src/components/BiometricLogin.tsx`
- Create: `src/__tests__/components/BiometricOptIn.test.tsx`
- Create: `src/__tests__/components/BiometricLogin.test.tsx`

**Interfaces:**

- Consumes: `useBiometrics()` (Task 5), `getBiometricName` (Task 5), `Colors`/`Spacing` (Phase 0's `theme.ts`).
- Produces: `BiometricOptIn({ username, password, onComplete, onCancel })` and `BiometricLogin({ onLoginSuccess, onCancel, autoPrompt? })`, both RN components. Task 8 (Login screen) renders both.

RN port of the two Ionic cards: `View`/`Text`/`Pressable`/`Switch` instead of `IonCard`/`IonButton`/`IonToggle`, styled with `StyleSheet` + theme tokens instead of inline Ionic CSS-variable styles. Icons (fingerprint/face glyphs in the source) are deliberately omitted from this first port — visual polish, not behavior; add them via `@expo/vector-icons/Ionicons` when the icon usage convention gets revisited, rather than guessing one now.

- [ ] **Step 1: Write the failing BiometricOptIn test**

Create `src/__tests__/components/BiometricOptIn.test.tsx`:

```tsx
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import { BiometricOptIn } from "@/components/BiometricOptIn";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";

jest.mock("@/hooks/biometrics/useBiometrics");

const mockCheckAvailability = jest.fn();
const mockSaveCredentials = jest.fn();
const mockSetBiometricsEnabled = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useBiometrics as jest.Mock).mockReturnValue({
    checkAvailability: mockCheckAvailability,
    saveCredentials: mockSaveCredentials,
    setBiometricsEnabled: mockSetBiometricsEnabled,
  });
});

describe("BiometricOptIn", () => {
  it("shows the unavailable message and calls onComplete(false) when biometrics aren't available", async () => {
    mockCheckAvailability.mockResolvedValue({ isAvailable: false });
    const onComplete = jest.fn();

    const { findByText } = render(
      <BiometricOptIn
        username="a@b.com"
        password="pw"
        onComplete={onComplete}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(await findByText("Doorgaan zonder biometrie"));
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it("saves credentials and enables biometrics when the user opts in", async () => {
    mockCheckAvailability.mockResolvedValue({
      isAvailable: true,
      canUseFaceID: true,
    });
    const onComplete = jest.fn();

    const { findByRole, findByText } = render(
      <BiometricOptIn
        username="a@b.com"
        password="pw"
        onComplete={onComplete}
        onCancel={jest.fn()}
      />,
    );

    fireEvent(await findByRole("switch"), "valueChange", true);
    fireEvent.press(await findByText("Doorgaan"));

    await waitFor(() =>
      expect(mockSaveCredentials).toHaveBeenCalledWith({
        username: "a@b.com",
        password: "pw",
      }),
    );
    expect(mockSetBiometricsEnabled).toHaveBeenCalledWith(true);
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it("does not save credentials when the user declines", async () => {
    mockCheckAvailability.mockResolvedValue({ isAvailable: true });
    const onComplete = jest.fn();

    const { findByText } = render(
      <BiometricOptIn
        username="a@b.com"
        password="pw"
        onComplete={onComplete}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(await findByText("Doorgaan"));

    expect(mockSaveCredentials).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- BiometricOptIn
```

Expected: FAIL — `Cannot find module '@/components/BiometricOptIn'`.

- [ ] **Step 3: Implement BiometricOptIn**

Create `src/components/BiometricOptIn.tsx`:

```tsx
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { Colors, Spacing } from "@/constants/theme";

interface BiometricOptInProps {
  username: string;
  password: string;
  onComplete: (enableBiometrics: boolean) => void;
  onCancel: () => void;
}

export function BiometricOptIn({
  username,
  password,
  onComplete,
  onCancel,
}: BiometricOptInProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { checkAvailability, saveCredentials, setBiometricsEnabled } =
    useBiometrics();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState(
    "Biometrische verificatie",
  );
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAvailability()
      .then((result) => {
        setBiometricAvailable(result.isAvailable);
        if (result.canUseFaceID) {
          setBiometricLabel("Face Recognition");
        } else if (result.canUseFingerprint) {
          setBiometricLabel("Fingerprint");
        }
      })
      .finally(() => setLoading(false));
  }, [checkAvailability]);

  const handleSavePreference = async () => {
    if (enableBiometrics) {
      await saveCredentials({ username, password });
      await setBiometricsEnabled(true);
    }
    onComplete(enableBiometrics);
  };

  if (loading) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
      >
        <Text style={{ color: colors.text }}>Biometrie controleren...</Text>
      </View>
    );
  }

  if (!biometricAvailable) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Biometrie niet beschikbaar
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          Je toestel ondersteunt geen biometrische verificatie of het is niet
          ingesteld.
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => onComplete(false)}
        >
          <Text style={styles.buttonText}>Doorgaan zonder biometrie</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {biometricLabel} inschakelen
        </Text>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary, fontSize: 20 }}>×</Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.textSecondary }}>
        Gebruik {biometricLabel} om snel en veilig in te loggen zonder je
        wachtwoord te typen.
      </Text>
      <View style={styles.row}>
        <Text style={{ color: colors.text }}>{biometricLabel} inschakelen</Text>
        <Switch value={enableBiometrics} onValueChange={setEnableBiometrics} />
      </View>
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSavePreference}
      >
        <Text style={styles.buttonText}>Doorgaan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- BiometricOptIn
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing BiometricLogin test**

Create `src/__tests__/components/BiometricLogin.test.tsx`:

```tsx
import { render, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { BiometricLogin } from "@/components/BiometricLogin";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";

jest.mock("@/hooks/biometrics/useBiometrics");

const mockAuthenticate = jest.fn();
const mockCheckAvailability = jest.fn();
const mockGetCredentials = jest.fn();
const mockIsBiometricsEnabled = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useBiometrics as jest.Mock).mockReturnValue({
    authenticate: mockAuthenticate,
    checkAvailability: mockCheckAvailability,
    getCredentials: mockGetCredentials,
    isBiometricsEnabled: mockIsBiometricsEnabled,
  });
});

describe("BiometricLogin", () => {
  it("calls onCancel immediately when biometrics aren't enabled", async () => {
    mockIsBiometricsEnabled.mockResolvedValue(false);
    const onCancel = jest.fn();

    render(<BiometricLogin onLoginSuccess={jest.fn()} onCancel={onCancel} />);

    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("auto-prompts on iOS and calls onLoginSuccess with stored credentials", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "ios" });

    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockCheckAvailability.mockResolvedValue({
      isAvailable: true,
      biometryType: "face",
    });
    mockAuthenticate.mockResolvedValue(true);
    mockGetCredentials.mockResolvedValue({
      username: "a@b.com",
      password: "pw",
    });
    const onLoginSuccess = jest.fn();

    render(
      <BiometricLogin onLoginSuccess={onLoginSuccess} onCancel={jest.fn()} />,
    );

    await waitFor(() =>
      expect(onLoginSuccess).toHaveBeenCalledWith("a@b.com", "pw"),
    );

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });

  it("does not auto-prompt on Android", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "android" });

    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockCheckAvailability.mockResolvedValue({
      isAvailable: true,
      biometryType: "fingerprint",
    });

    render(<BiometricLogin onLoginSuccess={jest.fn()} onCancel={jest.fn()} />);

    await waitFor(() => expect(mockCheckAvailability).toHaveBeenCalled());
    expect(mockAuthenticate).not.toHaveBeenCalled();

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });
});
```

- [ ] **Step 6: Run to verify it fails**

```bash
npm test -- BiometricLogin
```

Expected: FAIL — `Cannot find module '@/components/BiometricLogin'`.

- [ ] **Step 7: Implement BiometricLogin**

Create `src/components/BiometricLogin.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";
import { getBiometricName } from "@/utils/bioMetricUtils";
import { Colors, Spacing } from "@/constants/theme";

interface BiometricLoginProps {
  onLoginSuccess: (username: string, password: string) => void;
  onCancel: () => void;
  autoPrompt?: boolean;
}

export function BiometricLogin({
  onLoginSuccess,
  onCancel,
  autoPrompt = true,
}: BiometricLoginProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const {
    authenticate,
    checkAvailability,
    getCredentials,
    isBiometricsEnabled,
  } = useBiometrics();

  const [biometryType, setBiometryType] = useState<BiometricType>(
    BiometricType.NONE,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      const enabled = await isBiometricsEnabled();
      if (!enabled) {
        setLoading(false);
        onCancel();
        return;
      }

      const availability = await checkAvailability();
      if (!availability.isAvailable) {
        setError("Biometrische verificatie is niet beschikbaar op dit toestel");
        setLoading(false);
        return;
      }

      setBiometryType(availability.biometryType || BiometricType.NONE);
      setShowPrompt(true);
      setLoading(false);
    };
    checkStatus();
  }, [checkAvailability, isBiometricsEnabled, onCancel]);

  const handleAuthenticate = useCallback(async () => {
    setError(null);
    try {
      const authenticated = await authenticate({
        reason: "Log in op je Paperwork account",
        title: `${getBiometricName(biometryType, true)} login`,
        subtitle: `Login met ${getBiometricName(biometryType)}`,
        allowDeviceCredential: true,
      });

      if (authenticated) {
        const credentials = await getCredentials();
        if (credentials) {
          onLoginSuccess(credentials.username, credentials.password);
        } else {
          setError("Geen opgeslagen inloggegevens gevonden");
        }
      } else {
        setError("Biometrische verificatie mislukt of geannuleerd");
      }
    } catch {
      setError("Authenticatie mislukt");
    }
  }, [authenticate, biometryType, getCredentials, onLoginSuccess]);

  useEffect(() => {
    // Skip auto-prompt on Android - same dialog-loop avoidance as every
    // other Android exclusion in this phase.
    const shouldAutoPrompt = autoPrompt && Platform.OS !== "android";
    if (showPrompt && shouldAutoPrompt) {
      handleAuthenticate();
    }
  }, [showPrompt, autoPrompt, handleAuthenticate]);

  if (loading) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
      >
        <Text style={{ color: colors.text }}>Biometrie controleren...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Login met {getBiometricName(biometryType, true)}
      </Text>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleAuthenticate}
      >
        <Text style={styles.buttonText}>
          Gebruik {getBiometricName(biometryType, true)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
```

- [ ] **Step 8: Run to verify it passes**

```bash
npm test -- BiometricLogin
```

Expected: PASS, 3 tests.

- [ ] **Step 9: Commit**

```bash
git add src/components/BiometricOptIn.tsx src/components/BiometricLogin.tsx src/__tests__/components/BiometricOptIn.test.tsx src/__tests__/components/BiometricLogin.test.tsx
git commit -m "$(cat <<'EOF'
feat: add BiometricOptIn and BiometricLogin components

RN port of paperwork-app's two biometric cards - View/Text/Pressable/
Switch and theme tokens instead of Ionic components. Icons
deliberately omitted from this first pass (visual polish, not
behavior); add them when the icon convention gets revisited.
EOF
)"
```

---

## Task 8: Login screen

**Files:**

- Create: `src/hooks/useToast.ts`
- Create: `src/app/login.tsx`
- Create: `src/__tests__/app/login.test.tsx`

**Interfaces:**

- Consumes: `useAuth()` (Task 4), `useBiometrics()` (Task 5), `BiometricOptIn` (Task 7), `secureStorage`/`RECENT_LOGOUT_KEY` (Task 2), `Colors`/`Spacing` (Phase 0).
- Produces: `useToast()` returning `{ showToast: (message: string, type?: "error" | "success") => void }` — the error-UI pattern `docs/STATE_MANAGEMENT.md` flagged as not-yet-decided; this screen establishes it. Default-exported `Login` screen component at the `/login` route.

`useToast` is a minimal wrapper around RN's built-in `Alert.alert` — no new dependency, and a real, visible mechanism rather than a guess at what a future design system's toast component should look like. Revisit if/when this repo gets a real toast/banner component.

`handleDirectBiometricAuth` takes optional already-fetched `credentials`/`biometryType` parameters so the mount-triggered auto-auth path doesn't re-fetch what the mount effect just fetched — an optimization, not a behavior change from the source's two separate fetches.

- [ ] **Step 1: Implement useToast (no test — thin wrapper over `Alert.alert`, no branching logic)**

Create `src/hooks/useToast.ts`:

```ts
import { Alert } from "react-native";

type ToastType = "error" | "success";

export function useToast() {
  const showToast = (message: string, type: ToastType = "error") => {
    Alert.alert(type === "error" ? "Fout" : "Gelukt", message);
  };

  return { showToast };
}
```

- [ ] **Step 2: Write the failing Login screen tests**

Create `src/__tests__/app/login.test.tsx`:

```tsx
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import Login from "@/app/login";
import { AuthProvider } from "@/contexts/AuthContext";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import authService from "@/api/services/authService";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/biometrics/useBiometrics");
jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn(), login: jest.fn(), logout: jest.fn() },
}));
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockReplace = jest.fn();
const mockPush = jest.fn();

function renderLogin() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({
    replace: mockReplace,
    push: mockPush,
  });
  (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);
  (useBiometrics as jest.Mock).mockReturnValue({
    checkAvailability: jest.fn().mockResolvedValue({ isAvailable: false }),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    getCredentials: jest.fn().mockResolvedValue(null),
    authenticate: jest.fn(),
    saveCredentials: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    clearCredentials: jest.fn(),
  });
});

describe("Login screen", () => {
  it("shows a validation alert when fields are empty", async () => {
    const { getByTestId } = renderLogin();

    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Fout",
        "Vul alstublieft alle velden in",
      ),
    );
  });

  it("navigates to /dashboard after a successful login with no biometrics available", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      token: "abc",
      user: { id: "1", email: "a@b.com", name: "A" },
    });

    const { getByTestId } = renderLogin();

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "pw");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the API's error message on failed login", async () => {
    (authService.login as jest.Mock).mockRejectedValue(
      new Error("Inloggegevens onjuist"),
    );

    const { getByTestId } = renderLogin();

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "wrong");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith("Fout", "Inloggegevens onjuist"),
    );
  });
});
```

Rendered directly with test-local `QueryClientProvider`/`AuthProvider` rather than via `renderRouter` over the full app tree — Task 9 (not yet done at this point) is what wires those providers into the real root layout; this screen's own behavior doesn't need to wait for that.

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- login.test
```

Expected: FAIL — `Cannot find module '@/app/login'`.

- [ ] **Step 4: Implement the Login screen**

Create `src/app/login.tsx`:

```tsx
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { useToast } from "@/hooks/useToast";
import { BiometricOptIn } from "@/components/BiometricOptIn";
import {
  BiometricCredentials,
  BiometricType,
} from "@/hooks/biometrics/biometrics.types";
import { getBiometricName } from "@/utils/bioMetricUtils";
import { secureStorage, RECENT_LOGOUT_KEY } from "@/services/secureStorage";
import { Colors, Spacing } from "@/constants/theme";

export default function Login() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { showToast } = useToast();
  const { login } = useAuth();
  const {
    checkAvailability,
    isBiometricsEnabled,
    getCredentials,
    authenticate,
  } = useBiometrics();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showBiometricOptIn, setShowBiometricOptIn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [credentialsStored, setCredentialsStored] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(
    BiometricType.NONE,
  );
  const [isAfterLogout, setIsAfterLogout] = useState(false);

  const navigateToDashboard = () => {
    setEmail("");
    setPassword("");
    router.replace("/dashboard");
  };

  const handleBiometricLoginSuccess = async (
    username: string,
    password: string,
  ) => {
    try {
      setIsLoggingIn(true);
      const result = await login.mutateAsync({ email: username, password });

      if (!result.token) {
        showToast("Biometrische login mislukt", "error");
        return;
      }

      await secureStorage.removeItem(RECENT_LOGOUT_KEY);
      navigateToDashboard();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Biometrische login mislukt",
        "error",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDirectBiometricAuth = async (
    isManualTrigger: boolean,
    knownCredentials?: BiometricCredentials | null,
    knownBiometryType?: BiometricType,
  ) => {
    if (!isManualTrigger) {
      const recentLogout = await secureStorage.getItem(RECENT_LOGOUT_KEY);
      if (recentLogout === "true") {
        return;
      }
    }

    const credentials = knownCredentials ?? (await getCredentials());
    if (!credentials) {
      showToast("Geen opgeslagen inloggegevens gevonden", "error");
      return;
    }

    const type = knownBiometryType ?? biometricType;
    const authenticated = await authenticate({
      reason: "Log in op je Paperwork account",
      title: `${getBiometricName(type, true)} login`,
      subtitle: `Login met ${getBiometricName(type)}`,
      allowDeviceCredential: true,
    });

    if (authenticated) {
      await handleBiometricLoginSuccess(
        credentials.username,
        credentials.password,
      );
    }
  };

  // Run once on mount: check recent-logout, then biometric availability +
  // stored credentials, auto-triggering biometric login when everything
  // lines up (skipped on Android and immediately after logout) - same
  // gating as paperwork-app's LoginPage.
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const recentLogout = await secureStorage.getItem(RECENT_LOGOUT_KEY);
      const afterLogout = recentLogout === "true";
      if (!mounted) return;
      setIsAfterLogout(afterLogout);
      if (afterLogout) return;

      const availability = await checkAvailability();
      if (!mounted) return;
      setBiometricAvailable(availability.isAvailable);
      setBiometricType(availability.biometryType || BiometricType.NONE);

      const credentials = await getCredentials();
      if (!mounted) return;
      setCredentialsStored(credentials !== null);

      if (Platform.OS === "android" || !availability.isAvailable) {
        return;
      }

      const enabled = await isBiometricsEnabled();
      if (!mounted || !enabled || !credentials) {
        return;
      }

      handleDirectBiometricAuth(false, credentials, availability.biometryType);
    };

    initialize();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only on mount, mirroring paperwork-app's LoginPage; re-running on dependency changes would re-trigger automatic biometric login unexpectedly
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Vul alstublieft alle velden in", "error");
      return;
    }

    try {
      setIsLoggingIn(true);
      const result = await login.mutateAsync({ email, password });

      if (!result.token) {
        showToast("Login niet succesvol", "error");
        return;
      }

      await secureStorage.removeItem(RECENT_LOGOUT_KEY);

      if (biometricAvailable) {
        const enabled = await isBiometricsEnabled();
        const credentials = await getCredentials();

        if (!enabled || !credentials) {
          setShowBiometricOptIn(true);
          setIsLoggingIn(false);
          return;
        }
      }

      navigateToDashboard();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Een onverwachte fout is opgetreden tijdens het inloggen",
        "error",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (showBiometricOptIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <BiometricOptIn
          username={email}
          password={password}
          onComplete={navigateToDashboard}
          onCancel={navigateToDashboard}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Paperwork</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Email
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.textSecondary },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="Voer je e-mailadres in"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="login-email"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Wachtwoord
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.textSecondary },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="Voer je wachtwoord in"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          testID="login-password"
        />
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleLogin}
        disabled={isLoggingIn}
        testID="login-submit"
      >
        <Text style={styles.buttonText}>
          {isLoggingIn ? "Inloggen..." : "Login"}
        </Text>
      </Pressable>

      {isAfterLogout && biometricAvailable && credentialsStored && (
        <Pressable
          style={[
            styles.button,
            styles.outlineButton,
            { borderColor: colors.primary },
          ]}
          onPress={() => handleDirectBiometricAuth(true)}
        >
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Login met {getBiometricName(biometricType)}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push("/reset")}
        style={styles.forgotPassword}
      >
        <Text style={{ color: colors.textSecondary }}>
          Wachtwoord vergeten?{" "}
          <Text style={{ color: colors.primary }}>Wachtwoord wijzigen</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 14,
  },
  input: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: Spacing.three,
  },
});
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- login.test
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useToast.ts src/app/login.tsx src/__tests__/app/login.test.tsx
git commit -m "$(cat <<'EOF'
feat: add Login screen

Faithful port of paperwork-app's LoginPage - same validation,
biometric opt-in/auto-login gating, and Dutch copy. Adds useToast as
a thin Alert.alert wrapper, establishing the error-UI pattern
docs/STATE_MANAGEMENT.md flagged as undecided.
EOF
)"
```

---

## Task 9: Navigation wiring

**Files:**

- Create: `src/app/reset.tsx`
- Create: `src/app/password-reset.tsx`
- Modify: `src/app/_layout.tsx`
- Modify: `src/app/index.tsx`
- Modify: `src/app/(drawer)/_layout.tsx`
- Modify: `src/__tests__/dashboard.test.tsx`

**Interfaces:**

- Consumes: `queryClient` (Task 1), `AuthProvider`/`useAuthContext` (Task 4), `useSessionManager` (Task 6), `useAuth` (Task 4), `PlaceholderScreen` (Phase 0).

This is the task that makes every earlier task in this phase actually reachable from a cold app launch.

- [ ] **Step 1: Create the Reset/PasswordReset placeholders**

Create `src/app/reset.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function Reset() {
  return <PlaceholderScreen title="Wachtwoord wijzigen" />;
}
```

Create `src/app/password-reset.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function PasswordReset() {
  return <PlaceholderScreen title="Wachtwoord opnieuw instellen" />;
}
```

- [ ] **Step 2: Wire providers and routes into the root layout**

Replace the full contents of `src/app/_layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { useSessionManager } from "@/hooks/useSessionManager";

function SessionGate({ children }: { children: ReactNode }) {
  useSessionManager();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="reset" />
            <Stack.Screen name="password-reset" />
            <Stack.Screen name="(drawer)" />
          </Stack>
        </SessionGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Make the root redirect conditional on real auth state**

Replace the full contents of `src/app/index.tsx`:

```tsx
import { Redirect } from "expo-router";

import { useAuthContext } from "@/contexts/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return null;
  }

  return <Redirect href={isAuthenticated ? "/dashboard" : "/login"} />;
}
```

This replaces Phase 0's unconditional `<Redirect href="/dashboard" />` stub — the whole point of this phase.

- [ ] **Step 4: Wire the drawer's logout button to real auth**

In `src/app/(drawer)/_layout.tsx`, add the import:

```tsx
import { useAuth } from "@/hooks/useAuth";
```

Inside `CustomDrawerContent`, add the hook call alongside the existing `colors` line:

```tsx
const { logout } = useAuth();
```

Replace the "Uitloggen" `DrawerItem`'s `onPress`:

```tsx
<DrawerItem
  label="Uitloggen"
  icon={({ size }) => (
    <Ionicons name="log-out-outline" size={size} color={colors.danger} />
  )}
  labelStyle={{ color: colors.danger }}
  onPress={() => {
    logout();
  }}
/>
```

(Replaces the Phase 0 placeholder comment + no-op `onPress={() => {}}`.)

- [ ] **Step 5: Update the root-redirect test for real auth state**

Replace the full contents of `src/__tests__/dashboard.test.tsx`:

```tsx
import { renderRouter, screen } from "expo-router/testing-library";

import authService from "@/api/services/authService";

jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn(), login: jest.fn(), logout: jest.fn() },
}));
jest.mock("@/hooks/biometrics/useBiometrics", () => ({
  useBiometrics: () => ({
    checkAvailability: jest.fn().mockResolvedValue({ isAvailable: false }),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    getCredentials: jest.fn().mockResolvedValue(null),
    authenticate: jest.fn(),
    saveCredentials: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    clearCredentials: jest.fn(),
  }),
}));

describe("root redirect", () => {
  it("redirects to /login when not authenticated", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);
    renderRouter("src/app", { initialUrl: "/" });

    expect(await screen.findByTestId("login-submit")).toBeOnTheScreen();
  });

  it("redirects to /dashboard when authenticated", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    renderRouter("src/app", { initialUrl: "/" });

    expect(
      await screen.findByText(/Wordt in latere fase gemaakt/i),
    ).toBeOnTheScreen();
  });
});

it("renders the dashboard placeholder at /dashboard directly", async () => {
  (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
  renderRouter("src/app", { initialUrl: "/dashboard" });
  expect(
    await screen.findByText(/Wordt in latere fase gemaakt/i),
  ).toBeOnTheScreen();
});
```

This supersedes Phase 0's version of this file, which asserted an unconditional `/` → dashboard redirect — no longer true now that the redirect depends on real auth state. The `useBiometrics` mock prevents `SessionGate`'s `useSessionManager()` from making real native-module calls during this test.

- [ ] **Step 6: Run to verify everything passes**

```bash
npm test
```

Expected: PASS, all suites (Phase 0's `theme.test.ts` plus every test added in this phase).

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/app/reset.tsx src/app/password-reset.tsx src/app/_layout.tsx src/app/index.tsx "src/app/(drawer)/_layout.tsx" src/__tests__/dashboard.test.tsx
git commit -m "$(cat <<'EOF'
feat: wire auth into navigation

Root layout now provides QueryClientProvider + AuthProvider and runs
useSessionManager for the app's lifetime. index.tsx's redirect -
unconditional since Phase 0 - is now isAuthenticated ? /dashboard :
/login, gated on isLoading so nothing flashes the wrong screen on
cold start. Drawer's Uitloggen button calls real useAuth().logout()
instead of Phase 0's no-op. Reset/PasswordReset are placeholders,
deferred to Phase 4 per design.md.
EOF
)"
```

---

## Task 10: Final verification and push

**Files:** none

- [ ] **Step 1: Full verification sweep**

```bash
npx tsc --noEmit
npm test
```

Expected: typecheck clean, every test suite passing (Phase 0's + all of this phase's). No simulator launch — that's a manual, visual check; run `npx expo run:ios` yourself if/when you want to see the login/biometric-opt-in/logout flow in person.

- [ ] **Step 2: Confirm working tree is clean**

```bash
git status
```

Expected: clean working tree on branch `phase-1-auth`.

- [ ] **Step 3: Push and open a PR — ask the user first**

Confirm with the user before running:

```bash
git push -u origin phase-1-auth
gh pr create --base main --head phase-1-auth --title "Phase 1: auth core" --body "$(cat <<'EOF'
## Summary
- Data-layer bootstrap: axios instance, TanStack Query client, query keys (this repo had none until now).
- Secure storage wrapper (expo-secure-store + web fallback), single source of truth for all 7 storage keys.
- authService, AuthContext/useAuth, useSessionManager, biometrics module (expo-local-authentication) - faithful ports of paperwork-app's equivalents, RN/Expo platform APIs swapped in.
- BiometricOptIn/BiometricLogin components, Login screen, useToast (establishes the error-UI pattern docs/STATE_MANAGEMENT.md flagged as undecided).
- Navigation wiring: real auth-gated root redirect (replacing Phase 0's unconditional stub), real logout from the drawer.
- Reset/PasswordReset are placeholders, deferred to Phase 4 per design.md. Push notifications/badge and filesystem were split out of the original "Phase 1" scope during brainstorming - separate follow-on phases.

One forced deviation from a faithful port, documented in design.md: expo-secure-store has no synchronous read (paperwork-app's localStorage-backed isAuthenticated() does), so AuthContext exposes isLoading to gate consumers until the initial check resolves.

## Test plan
- [x] `npx tsc --noEmit` passes
- [x] `npm test` passes
- [ ] Manually verify on a real device: login with email/password, biometric opt-in appears (iOS), logout via drawer returns to /login, backgrounding past the session timeout and returning re-prompts
EOF
)"
```

- [ ] **Step 4: Report**

Summarize what Phase 1 produced and link the PR. Phase 1b (push notifications + badge) and Phase 2 (receipt pipeline) each get their own brainstorm/spec/plan cycle next.

---

## Self-review notes

- **Spec coverage:** design.md's scope (login, `AuthContext`/`useAuth`, `useSessionManager`, biometric opt-in/login, secure storage) maps to Tasks 2-9; the explicit exclusions (push/badge, filesystem, Reset/PasswordReset real implementation) are respected throughout, not silently dropped — each is named in at least one task's framing.
- **Dependency order corrected during drafting:** biometrics (Task 5) had to move before `useSessionManager` (Task 6), since the session manager consumes `useBiometrics`. Login screen (Task 8) is tested with manually-composed providers rather than `renderRouter`, specifically so it doesn't depend on Task 9's root-layout wiring landing first.
- **No placeholders** except the two screens explicitly designed to be placeholders (Reset/PasswordReset), which is the deliberate, design-doc-approved outcome, not an oversight.
- **Naming consistency:** `secureStorage`, the 8 key constants, `BiometricType`, `UseBiometrics`, and `useAuth()`'s return shape are spelled identically everywhere they're consumed across Tasks 2-9.
- **Documented, forced deviations from a faithful port** (both already called out at point of use, repeated here for visibility): `isLoading` on `AuthContext` (no sync storage read in RN); two genuinely dead methods dropped from the biometrics service (`deleteCredentials`, `getBiometricType`); one dead state value dropped from the source's `useBiometrics` (`availability`, set but never read). Everything else is a 1:1 port.
