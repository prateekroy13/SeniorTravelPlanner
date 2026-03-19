import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { DayCard } from "@/components/DayCard";
import { useSavedItineraries } from "@/context/SavedItinerariesContext";
import { ScoreRing } from "@/components/ui/ScoreRing";

export default function ItineraryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    data: string;
    title: string;
    city: string;
    country: string;
    travelMonth?: string;
  }>();
  const { saveItinerary, savedItineraries } = useSavedItineraries();
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  let itinerary: any = null;
  try {
    itinerary = params.data ? JSON.parse(params.data as string) : null;
  } catch (e) {
    console.error("Failed to parse itinerary data", e);
  }

  const isAlreadySaved = savedItineraries.some(
    (s) => s.id === params.id || s.id === savedId
  );

  if (!itinerary) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={40} color={Colors.light.textTertiary} />
        <Text style={styles.errorText}>Itinerary not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSave = async () => {
    if (isAlreadySaved || isSaving) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);
    try {
      const id = await saveItinerary({
        title: itinerary.title || params.title,
        city: itinerary.city || params.city,
        country: itinerary.country || params.country,
        days: itinerary.days,
        travelMonth: itinerary.travelMonth || params.travelMonth || "",
        generatedData: itinerary,
      });
      setSavedId(id);
    } catch (e) {
      Alert.alert("Error", "Failed to save itinerary");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const dayList = itinerary.dayPlans
        ?.slice(0, 3)
        .map((d: any) => `Day ${d.dayNumber}: ${d.theme}`)
        .join("\n");
      await Share.share({
        title: itinerary.title,
        message: `${itinerary.title}\n${itinerary.city}, ${itinerary.country} — ${itinerary.days} days\n\n${itinerary.overview}\n\n${dayList}`,
      });
    } catch (e) {
      console.warn("Share failed", e);
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
          style={[styles.hero, { paddingTop: topPadding + 12 }]}
        >
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => router.back()} style={styles.actionBtn}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.actionRight}>
              <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                <Feather name="share" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.actionBtn, isAlreadySaved && styles.savedBtn]}
              >
                <Feather
                  name={isAlreadySaved ? "bookmark" : "bookmark"}
                  size={18}
                  color={isAlreadySaved ? Colors.light.accent : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.locationText}>
                {itinerary.city}, {itinerary.country}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{itinerary.title}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroBadgeText}>{itinerary.days} days</Text>
              </View>
              <View style={styles.heroBadge}>
                <Feather name="sun" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroBadgeText}>{itinerary.travelMonth}</Text>
              </View>
              {itinerary.seniorFriendlyScore && (
                <View style={styles.heroBadge}>
                  <Feather name="star" size={13} color={Colors.light.accent} />
                  <Text style={[styles.heroBadgeText, { color: Colors.light.accent }]}>
                    {itinerary.seniorFriendlyScore}/10
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {isAlreadySaved && (
            <View style={styles.savedBanner}>
              <Feather name="check-circle" size={16} color={Colors.light.success} />
              <Text style={styles.savedBannerText}>Saved to your trips</Text>
            </View>
          )}

          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>Trip Overview</Text>
            <Text style={styles.overviewText}>{itinerary.overview}</Text>

            <View style={styles.overviewStats}>
              <OverviewStat
                icon="credit-card"
                label="Est. Total"
                value={`${itinerary.currency}${itinerary.totalEstimatedCostLow}–${itinerary.totalEstimatedCostHigh}`}
              />
              {itinerary.seniorFriendlyNotes && (
                <View style={styles.seniorNote}>
                  <MaterialCommunityIcons
                    name="wheelchair-accessibility"
                    size={14}
                    color={Colors.light.primary}
                  />
                  <Text style={styles.seniorNoteText}>{itinerary.seniorFriendlyNotes}</Text>
                </View>
              )}
            </View>

            {itinerary.weatherInfo && (
              <View style={styles.weatherRow}>
                <Feather name="cloud" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.weatherText}>{itinerary.weatherInfo}</Text>
              </View>
            )}

            {itinerary.emergencyNumbers && (
              <View style={styles.emergencyRow}>
                <Feather name="phone" size={13} color={Colors.light.error} />
                <Text style={styles.emergencyText}>{itinerary.emergencyNumbers}</Text>
              </View>
            )}
          </View>

          {!isAlreadySaved && (
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.88}
              style={styles.saveBtn}
            >
              <Feather name="bookmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>
                {isSaving ? "Saving..." : "Save This Itinerary"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Plans</Text>
            {itinerary.dayPlans?.map((day: any) => (
              <DayCard
                key={day.dayNumber}
                day={day}
                onPress={() =>
                  router.push({
                    pathname: "/itinerary/day/[dayId]",
                    params: {
                      dayId: day.dayNumber,
                      data: JSON.stringify(day),
                      city: itinerary.city,
                    },
                  })
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function OverviewStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={statStyles.row}>
      <Feather name={icon as any} size={14} color={Colors.light.primary} />
      <Text style={statStyles.label}>{label}:</Text>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRight: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedBtn: {
    backgroundColor: "rgba(232, 169, 81, 0.2)",
  },
  heroContent: { gap: 8 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  locationText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 32,
  },
  heroBadges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  body: {
    padding: 20,
    gap: 16,
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 12,
  },
  savedBannerText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#166534",
  },
  overviewCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  overviewTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  overviewText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  overviewStats: { gap: 8 },
  seniorNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.light.primaryPale,
    padding: 10,
    borderRadius: 10,
  },
  seniorNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.primary,
    lineHeight: 18,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  weatherText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  emergencyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  emergencyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    padding: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  section: { gap: 0 },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
  },
});

const statStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
});
