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

  // ── Native (iOS/Android): polling approach ───────────────────────────────────
  // Opens /api/auth/google-initiate in a browser → Google OAuth → server-side
  // callback stores the user → app polls /api/auth/session/:id → on success,
  // dismisses the browser and logs in. Zero exps:// deep links involved.
  const signInWithGoogleNative = async () => {
    if (!googleClientId) throw new Error("Google Client ID not configured");
    setSigningIn(true);

    const sessionId = makeSessionId();
    const initiateUrl =
      `${API_BASE}/api/auth/google-initiate` +
      `?session_id=${encodeURIComponent(sessionId)}` +
      `&client_id=${encodeURIComponent(googleClientId)}`;

    let resolvedUser: any = null;
    let browserClosed = false;

    // Poll for the session in parallel with the browser being open
    const pollPromise = (async () => {
      for (let i = 0; i < 120 && !browserClosed; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        if (browserClosed) break;
        try {
          const r = await fetch(`${API_BASE}/api/auth/session/${sessionId}`);
          if (r.ok) {
            const data = await r.json();
            if (data && data.email) {
              resolvedUser = data;
              browserClosed = true;
              WebBrowser.dismissBrowser();
              break;
            }
          }
        } catch {
          // Network hiccup — keep polling
        }
      }
    })();

    try {
      // openBrowserAsync resolves when the browser is closed (by user or dismissBrowser)
      await WebBrowser.openBrowserAsync(initiateUrl);
    } catch {
      // Ignore browser errors
    }

    // Signal the poll loop to stop if the user closed the browser manually
    browserClosed = true;
    await pollPromise;

    setSigningIn(false);

    if (resolvedUser) {
      await saveUser(resolvedUser);
    }
    // If !resolvedUser the user just cancelled — no error thrown
  };

  const signInWithGoogle = isWeb ? signInWithGoogleWeb : signInWithGoogleNative;

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signingIn, signInWithGoogle, signOut, hasGoogleClientId, redirectUri }}
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
