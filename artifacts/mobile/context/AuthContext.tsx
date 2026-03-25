import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH_KEY = "@seniortravel_auth";
const API_BASE = "https://seniortravel.replit.app/api";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const hasGoogleClientId = !!googleClientId;
  const isWeb = Platform.OS === "web";

  const redirectUri = isWeb
    ? ""
    : `${API_BASE}/auth/google-callback`;

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
    const authUser: AuthUser = {
      id: String(data.id ?? data.sub ?? Math.random()),
      name: data.name ?? "Traveler",
      email: data.email ?? "",
      avatar: data.picture,
    };
    setUser(authUser);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  };

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

  const signInWithGoogleNative = async () => {
    if (!googleClientId) throw new Error("Google Client ID not configured");
    setSigningIn(true);
    try {
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const appRedirect = Platform.OS === "android"
        ? "exps://seniortravel.replit.app"
        : "exps://seniortravel.replit.app";

      const initiateUrl =
        `${API_BASE}/auth/google-initiate` +
        `?client_id=${encodeURIComponent(googleClientId)}` +
        `&session_id=${encodeURIComponent(sessionId)}` +
        `&app_redirect=${encodeURIComponent(appRedirect)}`;

      const result = await WebBrowser.openAuthSessionAsync(initiateUrl, appRedirect);

      if (result.type === "success" && result.url) {
        const parsed = new URL(result.url);
        const sid = parsed.searchParams.get("session");
        if (!sid) throw new Error("No session ID returned");

        const resp = await fetch(`${API_BASE}/auth/session/${encodeURIComponent(sid)}`);
        if (!resp.ok) throw new Error("Session expired or not found");
        const data = await resp.json();
        await saveUser(data);
      } else if (result.type === "cancel" || result.type === "dismiss") {
        // User cancelled — silent
      } else {
        throw new Error("Sign-in failed");
      }
    } catch (e) {
      throw e;
    } finally {
      setSigningIn(false);
    }
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
