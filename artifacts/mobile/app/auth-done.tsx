import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const API_DOMAIN =
  process.env.EXPO_PUBLIC_DOMAIN || "senior-travel-planner.replit.app";
const API_BASE = `https://${API_DOMAIN}`;

// This screen is navigated to when the Google OAuth callback redirects to
// mobile://auth-done?session=SESSION_ID. Expo Router intercepts the mobile://
// deep link (matching this route) and renders this component to complete login.
// NOTE: mobile:// is used instead of exps:// to avoid Expo Go treating the deep
// link as a project-load request (which triggers a bundle download and crashes).
export default function AuthDone() {
  const { session } = useLocalSearchParams<{ session?: string }>();
  const { loginWithData } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    completeAuth();
  }, []);

  const completeAuth = async () => {
    console.log("[auth-done] completeAuth start, session=", session);
    try {
      if (!session) {
        console.log("[auth-done] no session param → /login");
        router.replace("/login" as any);
        return;
      }
      const url = `${API_BASE}/api/auth/session/${session}`;
      console.log("[auth-done] fetching", url);
      const res = await fetch(url);
      console.log("[auth-done] fetch status", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[auth-done] user data", JSON.stringify(data));
        if (data?.email) {
          await loginWithData(data);
          console.log("[auth-done] loginWithData done, navigating to tabs");
          router.replace("/(tabs)/" as any);
          return;
        }
      }
    } catch (e: any) {
      console.log("[auth-done] error", e?.message);
    }
    console.log("[auth-done] fallback → /login");
    // If anything fails, go back to login
    router.replace("/login" as any);
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1A6B4A" />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#071209",
    gap: 16,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
