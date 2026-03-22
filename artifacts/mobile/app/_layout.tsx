import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PreferencesProvider, usePreferences } from "@/context/PreferencesContext";
import { SavedItinerariesProvider } from "@/context/SavedItinerariesContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading: authLoading } = useAuth();
  const { preferences, isLoading: prefLoading } = usePreferences();

  const isLoading = authLoading || prefLoading;

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    if (!user) {
      router.replace("/login");
    } else if (!preferences.hasCompletedOnboarding) {
      router.replace("/onboarding");
    }
  }, [isLoading, user, preferences.hasCompletedOnboarding]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="swipe/[destinationId]" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="food-swipe/[destinationId]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="sparks/upload" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="sparks/user/[authorName]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="itinerary/generate" options={{ presentation: "modal" }} />
      <Stack.Screen name="itinerary/[id]" />
      <Stack.Screen name="itinerary/day/[dayId]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <PreferencesProvider>
                  <SavedItinerariesProvider>
                    <RootLayoutNav />
                  </SavedItinerariesProvider>
                </PreferencesProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
