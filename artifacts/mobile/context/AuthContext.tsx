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

// EXPO_PUBLIC_EXPO_DOMAIN is the host Expo Go identifies the running project by.
// Dev:  REPLIT_EXPO_DEV_DOMAIN  →  expo.janeway.replit.dev
// Prod: REPLIT_INTERNAL_APP_DOMAIN  →  senior-travel-planner.replit.app
//       (same domain the manifest's hostUri is built from, so the deep link matches)
// The exps:// redirect MUST use this host — if the host doesn't match what's in the
// manifest's hostUri, Expo Go treats it as a NEW project to download → crash.
// Fallback to API_DOMAIN (same domain used to build the manifest) is always correct.
const EXPO_DOMAIN =
  process.env.EXPO_PUBLIC_EXPO_DOMAIN || API_DOMAIN;

// openAuthSessionAsync monitors for this URL prefix to auto-close the browser.
const AUTH_DONE_REDIRECT = `exps://${EXPO_DOMAIN}/auth-done`;

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

  // ── Native (iOS/Android): openAuthSessionAsync + session polling ─────────────
  //
  // Flow:
  //  1. App opens /api/auth/google-initiate → server redirects to Google OAuth
  //  2. User signs in → Google redirects to /api/auth/google-callback
  //  3. Callback page fetches user info, stores in sessionStore, then redirects
  //     to exps://API_DOMAIN/auth-done?session=SESSION_ID  ← SAME host as Expo server
  //  4a. openAuthSessionAsync intercepts the exps:// redirect → auto-closes browser,
  //      returns the URL → app extracts session, fetches user from API
  //  4b. OR: background poll detects the session → dismisses browser → logs in
  //
  // The exps:// host MUST match API_DOMAIN (= the running Expo server host).
  // Correct host → in-app deep link. Wrong host → Expo tries to load new app → crash.
  const signInWithGoogleNative = async () => {
    if (!googleClientId) throw new Error("Google Client ID not configured");
    setSigningIn(true);

    const sessionId = makeSessionId();
    const initiateUrl =
      `${API_BASE}/api/auth/google-initiate` +
      `?session_id=${encodeURIComponent(sessionId)}` +
      `&client_id=${encodeURIComponent(googleClientId)}` +
      `&expo_host=${encodeURIComponent(EXPO_DOMAIN)}`;

    let resolvedUser: any = null;
    let done = false;

    // Background poll — fallback for when openAuthSessionAsync doesn't auto-capture
    // (Android pauses JS while browser is in foreground; this runs after browser closes)
    const pollPromise = (async () => {
      for (let i = 0; i < 60 && !done; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (done) break;
        try {
          const r = await fetch(`${API_BASE}/api/auth/session/${sessionId}`);
          if (r.ok) {
            const data = await r.json();
            if (data?.email) {
              resolvedUser = data;
              done = true;
              WebBrowser.dismissBrowser();
              break;
            }
          }
        } catch {
          // Network hiccup — keep trying
        }
      }
    })();

    // openAuthSessionAsync monitors for AUTH_DONE_REDIRECT and auto-closes the browser
    const result = await WebBrowser.openAuthSessionAsync(
      initiateUrl,
      AUTH_DONE_REDIRECT,
    );

    done = true; // stop poll loop

    // Path A: openAuthSessionAsync captured the exps:// redirect
    if (result.type === "success" && result.url) {
      const m = result.url.match(/[?&]session=([^&]+)/);
      const sid = m ? decodeURIComponent(m[1]) : null;
      if (sid) {
        try {
          const r = await fetch(`${API_BASE}/api/auth/session/${sid}`);
          if (r.ok) resolvedUser = await r.json();
        } catch {}
      }
    }

    await pollPromise; // ensure poll settled (may have found user too)

    setSigningIn(false);
    if (resolvedUser?.email) {
      await saveUser(resolvedUser);
    }
    // Cancelled / dismissed — no error thrown, just no user set
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
