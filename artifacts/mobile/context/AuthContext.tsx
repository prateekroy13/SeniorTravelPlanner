import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH_KEY = "@seniortravel_auth";

// EXPO_PUBLIC_DOMAIN is baked in at build time:
//   dev  → REPLIT_DEV_DOMAIN  (janeway.replit.dev — valid HTTP server)
//   prod → REPLIT_INTERNAL_APP_DOMAIN (senior-travel-planner.replit.app — valid HTTP server)
// NOTE: seniortravel.replit.app is the Expo delivery domain and returns 404 for HTTP.
const API_DOMAIN =
  process.env.EXPO_PUBLIC_DOMAIN || "senior-travel-planner.replit.app";
const API_BASE = `https://${API_DOMAIN}`;

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

  // ── Web: uses Google Identity Services (popup) ──────────────────────────────
  const signInWithGoogleWeb = async () => {
    if (!googleClientId) throw new Error("Google Client ID not configured");
    setSigningIn(true);
    try {
      await loadGoogleIdentityServices();
      await new Promise<void>((resolve, reject) => {
        const tokenClient = window.google!.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "email profile openid",
          callback: async (resp: any) => {
            if (resp.error) {
              setSigningIn(false);
              reject(new Error(resp.error));
              return;
            }
            try {
              const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              const data = await res.json();
              await saveUser(data);
              resolve();
            } catch (e) {
              setSigningIn(false);
              reject(e);
            }
          },
        });
        tokenClient.requestAccessToken();
      });
    } catch (e) {
      setSigningIn(false);
      throw e;
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
      value={{ user, isLoading, signingIn, loginWithData, signInWithGoogle, signOut, hasGoogleClientId, redirectUri }}
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
