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
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (isDownloading || !itinerary) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDownloading(true);
    try {
      const buildActivity = (act: any) => `
        <div class="activity ${act.isRestStop ? "rest" : ""}">
          <div class="act-header">
            <span class="act-name">${act.name}</span>
            ${act.crowdLevel ? `<span class="crowd crowd-${act.crowdLevel}">${act.crowdLevel === "low" ? "Quiet" : act.crowdLevel === "medium" ? "Moderate" : "Busy"}</span>` : ""}
            ${act.isRestStop ? '<span class="rest-tag">Rest Stop</span>' : ""}
          </div>
          <p class="act-desc">${act.description || ""}</p>
          ${act.openingHours ? `<div class="info-row"><span class="icon">🕐</span> ${act.openingHours}</div>` : ""}
          ${act.bestTimeToVisit ? `<div class="info-row best-time"><span class="icon">☀️</span> ${act.bestTimeToVisit}</div>` : ""}
          <div class="act-meta">
            <span>⏱ ${act.duration}</span>
            <span>👟 ${(act.steps || 0).toLocaleString()} steps</span>
            <span>💶 ${act.cost}</span>
          </div>
          ${act.tips ? `<div class="tip">💡 ${act.tips}</div>` : ""}
          ${act.travelMinutesToNext ? `<div class="travel-connector">🚶 ${act.travelMinutesToNext} min walk to next stop</div>` : ""}
        </div>`;

      const buildDay = (day: any) => {
        const sections = [
          { label: "🌅 Morning", acts: day.morning || [] },
          { label: "☀️ Afternoon", acts: day.afternoon || [] },
          { label: "🌙 Evening", acts: day.evening || [] },
        ].filter((s) => s.acts.length > 0);

        return `
          <div class="day-card">
            <div class="day-header">
              <span class="day-num">Day ${day.dayNumber}</span>
              <span class="day-theme">${day.theme || ""}</span>
            </div>
            <div class="day-stats">
              <span>👟 ${(day.totalSteps || 0).toLocaleString()} steps</span>
              <span>⏱ ${day.activeHours || 0}h active</span>
              <span>💶 ${day.currency || ""}${day.estimatedCostLow || 0}–${day.estimatedCostHigh || 0}</span>
            </div>
            ${day.crowdAvoidanceTip ? `<div class="crowd-tip">📢 ${day.crowdAvoidanceTip}</div>` : ""}
            ${sections.map((s) => `
              <div class="time-block">
                <div class="time-label">${s.label}</div>
                ${s.acts.map(buildActivity).join("")}
              </div>`).join("")}
            ${day.restaurants?.length ? `
              <div class="time-block">
                <div class="time-label">🍽️ Where to Eat</div>
                ${day.restaurants.map((r: any) => `
                  <div class="restaurant">
                    <strong>${r.name}</strong> — ${r.cuisine} · ${r.priceRange}
                    <p>${r.description || ""}</p>
                    ${r.nearbyAttraction ? `<small>Near ${r.nearbyAttraction}</small>` : ""}
                  </div>`).join("")}
              </div>` : ""}
          </div>`;
      };

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Georgia, serif; padding: 32px; color: #222; max-width: 800px; margin: 0 auto; }
  h1 { color: #1A6B4A; font-size: 28px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .overview { background: #F0FAF5; border-left: 4px solid #1A6B4A; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
  .meta { display: flex; gap: 24px; font-size: 13px; color: #555; margin-bottom: 16px; flex-wrap: wrap; }
  .day-card { border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 28px; overflow: hidden; }
  .day-header { background: #1A6B4A; color: white; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .day-num { font-size: 12px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 20px; }
  .day-theme { font-size: 16px; font-weight: bold; }
  .day-stats { padding: 8px 16px; background: #F8F9FA; font-size: 12px; color: #555; display: flex; gap: 20px; }
  .crowd-tip { padding: 8px 16px; font-size: 12px; color: #E65100; background: #FFF3E0; }
  .time-block { padding: 12px 16px; }
  .time-label { font-size: 12px; font-weight: bold; color: #1A6B4A; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .activity { border-left: 2px solid #1A6B4A; padding-left: 12px; margin-bottom: 14px; }
  .activity.rest { border-left-color: #E8A951; }
  .act-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .act-name { font-weight: bold; font-size: 14px; }
  .crowd { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: bold; }
  .crowd-low { background: #E8F5E9; color: #2E7D32; }
  .crowd-medium { background: #FFF3E0; color: #E65100; }
  .crowd-high { background: #FFEBEE; color: #C62828; }
  .rest-tag { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: #FFF3CD; color: #856404; }
  .act-desc { font-size: 12px; color: #555; margin: 4px 0; }
  .info-row { font-size: 11px; color: #666; margin: 3px 0; }
  .best-time { color: #1A6B4A; font-style: italic; }
  .act-meta { display: flex; gap: 16px; font-size: 11px; color: #888; margin: 6px 0; }
  .tip { font-size: 11px; color: #1A6B4A; background: #F0FAF5; padding: 5px 8px; border-radius: 4px; margin-top: 4px; }
  .travel-connector { font-size: 11px; color: #888; text-align: center; padding: 6px 0; border-top: 1px dashed #ddd; margin-top: 8px; }
  .restaurant { border: 1px solid #eee; border-radius: 6px; padding: 10px; margin-bottom: 10px; font-size: 12px; }
  .restaurant p { margin: 4px 0; color: #555; }
  .restaurant small { color: #888; }
  .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
</style></head>
<body>
  <h1>${itinerary.title}</h1>
  <p class="subtitle">${itinerary.city}, ${itinerary.country} · ${itinerary.days} days · ${itinerary.travelMonth}</p>
  <div class="overview">${itinerary.overview}</div>
  <div class="meta">
    <span>⭐ Senior Score: ${itinerary.seniorFriendlyScore}/10</span>
    <span>💶 Est. Cost: ${itinerary.currency}${itinerary.totalEstimatedCostLow}–${itinerary.totalEstimatedCostHigh}</span>
    <span>🌤 ${itinerary.weatherInfo || ""}</span>
  </div>
  ${itinerary.seniorFriendlyNotes ? `<p style="font-size:12px;color:#1A6B4A;margin-bottom:20px;">♿ ${itinerary.seniorFriendlyNotes}</p>` : ""}
  ${(itinerary.dayPlans || []).map(buildDay).join("")}
  <div class="footer">Generated by SeniorTravel · ${new Date().toLocaleDateString()}</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${itinerary.title} — Itinerary`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `PDF saved to: ${uri}`);
      }
    } catch (e) {
      console.error("Download error", e);
      Alert.alert("Error", "Could not create PDF. Please try again.");
    } finally {
      setIsDownloading(false);
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
                onPress={handleDownload}
                style={styles.actionBtn}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="download" size={18} color="#fff" />
                )}
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
