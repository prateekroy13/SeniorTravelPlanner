import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH_KEY = "@seniortravel_auth";

// EXPO_PUBLIC_CALLBACK_DOMAIN is the janeway.replit.dev domain — the only domain
// that correctly routes web HTTP requests to serve.js (seniortravel.replit.app
// uses expo-domain router that blocks normal browser HTTP).
// Set by the dev script and build.js from REPLIT_DEV_DOMAIN.
const _callbackDomain =
  process.env.EXPO_PUBLIC_CALLBACK_DOMAIN ||
  process.env.EXPO_PUBLIC_DOMAIN ||
  "seniortravel.replit.app";
const OAUTH_CALLBACK_URL = `https://${_callbackDomain}/oauth-callback`;
const OAUTH_APP_REDIRECT = "exps://seniortravel.replit.app/oauth-callback";

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

  const redirectUri = isWeb ? "" : OAUTH_CALLBACK_URL;

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
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(googleClientId)}` +
        `&redirect_uri=${encodeURIComponent(OAUTH_CALLBACK_URL)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent("openid email profile")}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, OAUTH_APP_REDIRECT);

      if (result.type === "success" && result.url) {
        // new URL() may throw on custom schemes (exps://) in some JS environments
        let token: string | null = null;
        try {
          token = new URL(result.url).searchParams.get("token");
        } catch {
          const m = result.url.match(/[?&]token=([^&]+)/);
          token = m ? decodeURIComponent(m[1]) : null;
        }
        if (!token) throw new Error("No token returned from sign-in");

        const resp = await fetch("https://www.googleapis.com/userinfo/v2/me", {
          headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
        });
        if (!resp.ok) throw new Error("Failed to fetch user info");
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
