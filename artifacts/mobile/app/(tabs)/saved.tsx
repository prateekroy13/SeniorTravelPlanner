import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSavedItineraries, SavedItinerary } from "@/context/SavedItinerariesContext";
import { SavedItineraryCard } from "@/components/SavedItineraryCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { savedItineraries, deleteItinerary } = useSavedItineraries();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Math.max(insets.bottom + 100, 120);

  const handleDelete = async (id: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Itinerary",
      "Are you sure you want to remove this saved itinerary?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItinerary(id),
        },
      ]
    );
  };

  const handleOpen = (itinerary: SavedItinerary) => {
    router.push({
      pathname: "/itinerary/[id]",
      params: {
        id: itinerary.id,
        data: JSON.stringify(itinerary.generatedData),
        title: itinerary.title,
        city: itinerary.city,
        country: itinerary.country,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={styles.title}>Saved Trips</Text>
        <Text style={styles.subtitle}>
          {savedItineraries.length > 0
            ? `${savedItineraries.length} itinerary${savedItineraries.length !== 1 ? "s" : ""} saved`
            : "Your travel plans, ready to go"}
        </Text>
      </View>

      {savedItineraries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="bookmark" size={32} color={Colors.light.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No saved trips yet</Text>
          <Text style={styles.emptyDesc}>
            Generate an itinerary and save it here for easy access anytime — even offline.
          </Text>
          <PrimaryButton
            label="Explore Destinations"
            onPress={() => router.push("/(tabs)")}
            style={styles.emptyBtn}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {savedItineraries.map((itinerary) => (
            <SavedItineraryCard
              key={itinerary.id}
              itinerary={itinerary}
              onPress={handleOpen}
              onDelete={handleDelete}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.surface,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 8,
    width: "100%",
  },
});
