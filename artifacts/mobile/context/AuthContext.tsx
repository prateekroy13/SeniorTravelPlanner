import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH_KEY = "@seniortravel_auth";

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

  const [, response, promptAsync] = Google.useAuthRequest(
    googleClientId
      ? {
          clientId: googleClientId,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        }
      : { clientId: "" }
  );

  useEffect(() => {
    loadStoredUser();
  }, []);

  useEffect(() => {
    if (!isWeb && response?.type === "success") {
      const token = (response as any).authentication?.accessToken;
      if (token) fetchGoogleUser(token);
    } else if (!isWeb && (response?.type === "error" || response?.type === "dismiss")) {
      setSigningIn(false);
    }
  }, [response]);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleUser = async (accessToken: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const authUser: AuthUser = {
        id: String(data.id),
        name: data.name ?? "Traveler",
        email: data.email ?? "",
        avatar: data.picture,
      };
      setUser(authUser);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    } catch (e) {
      console.warn("Failed to fetch Google user info", e);
    } finally {
      setSigningIn(false);
    }
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
            await fetchGoogleUser(resp.access_token);
            resolve();
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
    setSigningIn(true);
    try {
      await promptAsync();
    } catch (e) {
      setSigningIn(false);
      throw e;
    }
  };

  const signInWithGoogle = isWeb ? signInWithGoogleWeb : signInWithGoogleNative;

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  const redirectUri = "";

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
