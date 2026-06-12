import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { API_DOMAIN } from "@/constants/api";

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const error = params.get("error");

    if (error) {
      setErrorMsg(`Google returned: ${error}`);
      setStatus("error");
      return;
    }

    if (token) {
      setStatus("redirecting");
      // Use EXPO_PUBLIC_DOMAIN so the exps:// host matches the running Expo server.
      // A mismatched host causes Android Expo Go to attempt loading a new app (crash).
      const appUrl =
        `exps://${API_DOMAIN}/oauth-callback` +
        `?token=${encodeURIComponent(token)}`;
      window.location.href = appUrl;
    } else {
      setErrorMsg("No access token found. Please try signing in again.");
      setStatus("error");
    }
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {status === "loading" || status === "redirecting" ? (
          <>
            <ActivityIndicator size="large" color="#1A6B4A" style={styles.spinner} />
            <Text style={styles.heading}>Completing sign-in…</Text>
            <Text style={styles.body}>
              {status === "redirecting"
                ? "Returning you to the app…"
                : "Please wait a moment."}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.heading}>Sign-in failed</Text>
            <Text style={styles.body}>{errorMsg}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#071209",
    padding: 24,
  },
  card: {
    backgroundColor: "#0f1f13",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1A6B4A40",
    padding: 40,
    alignItems: "center",
    maxWidth: 360,
    width: "100%",
  },
  spinner: {
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f0ede8",
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: "#8aad96",
    textAlign: "center",
    lineHeight: 20,
  },
});
