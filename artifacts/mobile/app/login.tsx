import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

function GoogleIcon() {
  return (
    <View style={styles.googleIconWrap}>
      <Text style={styles.googleIconG}>G</Text>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, signingIn, signInWithGoogle, hasGoogleClientId, enterGuestMode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const isNative = Platform.OS !== "web";

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/(tabs)/");
    }
  }, [user, isLoading]);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("popup_blocked")) {
        setError("A new tab is needed to sign in. Please allow pop-ups for this site and try again.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#0D1A0D", "#1A6B4A"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient
        colors={["#071209", "#0D2410", "#1A4A30"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />

      <View style={styles.topSection}>
        <View style={styles.logoWrap}>
          <LinearGradient
            colors={[Colors.light.primary, "#0D4A33"]}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoEmoji}>✈️</Text>
          </LinearGradient>
        </View>

        <Text style={styles.appName}>SeniorTravel</Text>
        <Text style={styles.tagline}>Explore the world{"\n"}at your own pace</Text>
      </View>

      <View style={styles.featureRow}>
        {[
          { icon: "🗺️", label: "AI itineraries\ntailored to you" },
          { icon: "🍽️", label: "Curated spots &\nrestaurants" },
          { icon: "⚡", label: "Community of\nfellow travelers" },
        ].map((f) => (
          <View key={f.icon} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}


        {!hasGoogleClientId && (
          <View style={styles.noKeyNotice}>
            <Text style={styles.noKeyText}>
              Google Sign-In is not yet configured.{"\n"}Use the button below to continue in demo mode.
            </Text>
          </View>
        )}

        {hasGoogleClientId ? (
          <TouchableOpacity
            style={[styles.googleBtn, signingIn && styles.googleBtnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={signingIn}
            activeOpacity={0.85}
          >
            {signingIn ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <GoogleIcon />
            )}
            <Text style={styles.googleBtnText}>
              {signingIn ? "Signing in…" : "Continue with Google"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => { enterGuestMode(); router.replace("/(tabs)/"); }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.light.primary, "#0D4A33"]}
              style={styles.demoBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.demoBtnText}>Continue in Demo Mode →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {hasGoogleClientId && (
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => {
              enterGuestMode();
              router.replace("/(tabs)/");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.guestBtnText}>Continue without signing in</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service{"\n"}and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1A0D",
  },
  container: {
    flex: 1,
    backgroundColor: "#071209",
  },
  topSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 24,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 28,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  featureItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  featureIcon: {
    fontSize: 26,
  },
  featureLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 17,
  },
  bottomSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  errorBox: {
    backgroundColor: "rgba(220,53,69,0.15)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(220,53,69,0.3)",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#FF6B6B",
    textAlign: "center",
  },
  noKeyNotice: {
    backgroundColor: "rgba(232,169,81,0.1)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(232,169,81,0.25)",
    marginBottom: 4,
  },
  noKeyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.accent,
    textAlign: "center",
    lineHeight: 19,
  },
  redirectBox: {
    backgroundColor: "rgba(26,107,74,0.15)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(26,107,74,0.4)",
    marginBottom: 8,
    gap: 6,
  },
  redirectTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#6fcf97",
    textAlign: "center",
    marginBottom: 2,
  },
  redirectBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8aad96",
    textAlign: "center",
    lineHeight: 17,
  },
  redirectBold: {
    fontFamily: "Inter_600SemiBold",
    color: "#6fcf97",
  },
  redirectUri: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  redirectUriText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#E8A951",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  redirectHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#5a7a64",
    textAlign: "center",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    height: 58,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  googleBtnDisabled: {
    opacity: 0.7,
  },
  googleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
  },
  googleIconG: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 20,
  },
  googleBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
  },
  demoBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  demoBtnGradient: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  guestBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  guestBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
  },
  terms: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
  redirectNotice: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 6,
  },
  redirectLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
  },
});
