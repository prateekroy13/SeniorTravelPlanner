import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const hasGoogleClientId = !!googleClientId;

  const [, response, promptAsync] = Google.useAuthRequest(
    googleClientId
      ? {
          clientId: googleClientId,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        }
      : null as any
  );

  useEffect(() => {
    loadStoredUser();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const token = (response as any).authentication?.accessToken;
      if (token) fetchGoogleUser(token);
    } else if (response?.type === "error" || response?.type === "dismiss") {
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

  const signInWithGoogle = async () => {
    setSigningIn(true);
    try {
      await promptAsync();
    } catch (e) {
      setSigningIn(false);
      throw e;
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signingIn, signInWithGoogle, signOut, hasGoogleClientId }}
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
