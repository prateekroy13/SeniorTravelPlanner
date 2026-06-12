import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { API_BASE_URL as API_BASE, AUTH_ORIGIN } from "@/constants/api";

WebBrowser.maybeCompleteAuthSession();

const AUTH_KEY = "@seniortravel_auth";

// No custom-scheme redirect is used for OAuth completion.
// In Expo Go on Android, the app's custom scheme (mobile://) is NOT registered by
// the OS — only exp:// is. Using mobile:// as a redirect causes the browser to
// hang with no app to handle the intent.
// Instead, the background poll detects the session and calls dismissBrowser().

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signingIn: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithData: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  hasGoogleClientId: boolean;
  redirectUri: string;
  guestMode: boolean;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

async function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.google?.accounts) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

function makeSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function mapToAuthUser(data: any): AuthUser {
  return {
    id: String(data.id ?? data.sub ?? Math.random()),
    name: data.name ?? "Traveler",
    email: data.email ?? "",
    avatar: data.picture,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  // guestMode lets the user browse the app without a Google account.
  // It is in-memory only (not persisted) so it resets on each app open.
  const [guestMode, setGuestMode] = useState(false);
  const enterGuestMode = () => setGuestMode(true);

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const hasGoogleClientId = !!googleClientId;
  const isWeb = Platform.OS === "web";

  const redirectUri = isWeb ? "" : `${API_BASE}/api/auth/google-callback`;

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    finally {
      setIsLoading(false);
    }
  };

  const saveUser = async (data: any) => {
    const authUser = mapToAuthUser(data);
    setUser(authUser);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  };

  // ── Web: server-side OAuth via new browser tab + polling ────────────────────
  //
  // Previous approach used Google Identity Services (GIS) popup which requires
  // the page origin to be in Google Console "Authorized JavaScript Origins".
  // That fails in the dev preview (ephemeral domain) and is fragile in iframes.
  //
  // This approach uses the same server-side flow as native:
  //  1. Open /api/auth/google-initiate in a new tab
  //  2. User signs in → callback stores session in PostgreSQL
  //  3. Poll /api/auth/session/:id every second until found or tab is closed
  //  4. saveUser() → user is logged in
  //
  // Works on any origin — no JS-origin registration required.
  const signInWithGoogleWeb = async () => {
    if (!googleClientId) throw new Error("Google Client ID not configured");
    setSigningIn(true);

    const sessionId = makeSessionId();
    // AUTH_ORIGIN is always the production server: it hosts the registered
    // Google callback and the canonical session store (PostgreSQL).
    // Polling the dev server would never find the session because the
    // production and dev deployments use separate databases.
    const initiateUrl =
      `${AUTH_ORIGIN}/api/auth/google-initiate` +
      `?session_id=${encodeURIComponent(sessionId)}` +
      `&client_id=${encodeURIComponent(googleClientId)}`;

    const newTab = window.open(initiateUrl, "_blank");
    if (!newTab) {
      setSigningIn(false);
      throw new Error("popup_blocked");
    }

    let resolvedUser: any = null;

    for (let i = 0; i < 120 && !resolvedUser; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const r = await fetch(`${AUTH_ORIGIN}/api/auth/session/${sessionId}`);
        if (r.ok) {
          const data = await r.json();
          if (data?.email) resolvedUser = data;
        }
      } catch {
        // network hiccup — keep trying
      }
      // If user closed the tab, give it a 3-second grace then bail
      if (newTab.closed && !resolvedUser) {
        for (let g = 0; g < 3 && !resolvedUser; g++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const r = await fetch(`${AUTH_ORIGIN}/api/auth/session/${sessionId}`);
            if (r.ok) {
              const data = await r.json();
              if (data?.email) resolvedUser = data;
            }
          } catch {}
        }
        break;
      }
    }

    if (!newTab.closed) newTab.close();
    setSigningIn(false);
    if (resolvedUser?.email) {
      await saveUser(resolvedUser);
    }
  };

  // ── Native (iOS/Android): post-close session fetch ───────────────────────────
  //
  // Flow:
  //  1. App generates a session_id and opens /api/auth/google-initiate in a CCT
  //  2. User signs in → Google redirects to /api/auth/google-callback
  //  3. Callback page stores user data in PostgreSQL, shows "Signed in! Close window"
  //     — NO custom-scheme redirect (mobile:// is unregistered in Expo Go on Android)
  //  4. User closes the browser (or it auto-closes)
  //  5. On Android, JS is SUSPENDED while CCT is open — polling is useless then.
  //     Instead, we fetch the session immediately after openAuthSessionAsync returns,
  //     since the data was stored in the DB during the browser session.
  //  6. Retry a few times in case of a brief network delay.
  const signInWithGoogleNative = async () => {
    if (!googleClientId) throw new Error("Google Client ID not configured");
    setSigningIn(true);

    const sessionId = makeSessionId();
    const initiateUrl =
      `${API_BASE}/api/auth/google-initiate` +
      `?session_id=${encodeURIComponent(sessionId)}` +
      `&client_id=${encodeURIComponent(googleClientId)}`;

    // Open the Chrome Custom Tab. JS is suspended on Android while it is open.
    // When this resolves (any reason: user closed it, sign-in done, etc.)
    // the session should already be in the DB — we fetch it immediately below.
    await WebBrowser.openAuthSessionAsync(initiateUrl);

    // JS resumes here. Try fetching the session with retries (up to ~10 seconds).
    // The session was stored in DB while the browser was open. One-time use: the
    // first successful fetch deletes it.
    let resolvedUser: any = null;
    for (let attempt = 0; attempt < 10 && !resolvedUser; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1000));
      try {
        const r = await fetch(`${API_BASE}/api/auth/session/${sessionId}`);
        if (r.ok) {
          const data = await r.json();
          if (data?.email) resolvedUser = data;
        } else if (r.status === 404 && attempt === 0) {
          // Session not found on first try — user may have closed before finishing.
          // Still retry a few times in case of slight race.
        }
      } catch {
        // Network hiccup — retry
      }
    }

    setSigningIn(false);
    if (resolvedUser?.email) {
      await saveUser(resolvedUser);
    }
    // Dismissed without completing sign-in — no error, just no user set
  };

  const signInWithGoogle = isWeb ? signInWithGoogleWeb : signInWithGoogleNative;

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  // Exposed so that the auth-done route can complete sign-in when the
  // exps:// redirect navigates via Expo Router instead of being intercepted
  // by openAuthSessionAsync.
  const loginWithData = async (data: any) => {
    if (data?.email) await saveUser(data);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signingIn, loginWithData, signInWithGoogle, signOut, hasGoogleClientId, redirectUri, guestMode, enterGuestMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
