import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePreferences } from "@/context/PreferencesContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const CURRENT_MONTH = MONTHS[new Date().getMonth()];

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ city?: string; country?: string }>();
  const { preferences } = usePreferences();

  const [city, setCity] = useState(params.city || "");
  const [country, setCountry] = useState(params.country || "");
  const [days, setDays] = useState(5);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = city.trim().length > 1 && country.trim().length > 1;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      const res = await fetch(`${BASE_URL}/api/itineraries/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.trim(),
          country: country.trim(),
          days,
          travelMonth: month,
          preferences: {
            pace: preferences.pace,
            maxStepsPerDay: preferences.maxStepsPerDay,
            dietaryNeeds: preferences.dietaryNeeds,
            interests: preferences.interests,
            budgetLevel: preferences.budgetLevel,
            accessibilityNeeds: preferences.accessibilityNeeds,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Generate error:", err);
        Alert.alert("Error", "Failed to generate itinerary. Please try again.");
        return;
      }

      const data = await res.json();
      router.replace({
        pathname: "/itinerary/[id]",
        params: {
          id: "new",
          data: JSON.stringify(data),
          title: data.title,
          city: data.city,
          country: data.country,
          travelMonth: month,
        },
      });
    } catch (e) {
      console.error("Generate error:", e);
      Alert.alert("Error", "Could not connect. Check your internet connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan Your Trip</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>
          Tell us where you'd like to go and we'll create a personalized itinerary.
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destination</Text>
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.inputRow}>
                <Feather name="map-pin" size={16} color={Colors.light.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Lisbon, Kyoto, Vienna"
                  placeholderTextColor={Colors.light.textTertiary}
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Country</Text>
              <View style={styles.inputRow}>
                <Feather name="globe" size={16} color={Colors.light.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="e.g. Portugal, Japan, Austria"
                  placeholderTextColor={Colors.light.textTertiary}
                  returnKeyType="done"
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Length</Text>
          <View style={styles.daysRow}>
            {[3, 4, 5, 6, 7].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={async () => {
                  await Haptics.selectionAsync();
                  setDays(d);
                }}
                style={[styles.dayBtn, days === d && styles.dayBtnActive]}
              >
                <Text style={[styles.dayBtnNum, days === d && styles.dayBtnNumActive]}>{d}</Text>
                <Text style={[styles.dayBtnLabel, days === d && styles.dayBtnLabelActive]}>
                  {d === 1 ? "day" : "days"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Month</Text>
          <View style={styles.monthsGrid}>
            {MONTHS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={async () => {
                  await Haptics.selectionAsync();
                  setMonth(m);
                }}
                style={[styles.monthBtn, month === m && styles.monthBtnActive]}
              >
                <Text style={[styles.monthLabel, month === m && styles.monthLabelActive]}>
                  {m.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Profile</Text>
          <View style={styles.preferenceCard}>
            <PreferenceRow icon="zap" label="Pace" value={preferences.pace.charAt(0).toUpperCase() + preferences.pace.slice(1)} />
            <PreferenceRow icon="activity" label="Max Steps" value={`${preferences.maxStepsPerDay.toLocaleString()}/day`} />
            <PreferenceRow icon="tag" label="Budget" value={preferences.budgetLevel.charAt(0).toUpperCase() + preferences.budgetLevel.slice(1)} />
            {preferences.interests.length > 0 && (
              <PreferenceRow icon="heart" label="Interests" value={preferences.interests.slice(0, 2).join(", ")} />
            )}
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={styles.editLink}>
            <Text style={styles.editLinkText}>Edit preferences</Text>
            <Feather name="arrow-right" size={13} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        {isGenerating && (
          <View style={styles.generatingCard}>
            <ActivityIndicator color={Colors.light.primary} size="small" />
            <View style={styles.generatingText}>
              <Text style={styles.generatingTitle}>Crafting your itinerary…</Text>
              <Text style={styles.generatingSubtitle}>
                Our AI is planning your {days}-day trip to {city || "your destination"}.
                This takes 20–40 seconds.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 16 },
        ]}
      >
        <PrimaryButton
          label={isGenerating ? "Generating..." : "Generate Itinerary"}
          onPress={handleGenerate}
          loading={isGenerating}
          disabled={!canGenerate || isGenerating}
          size="lg"
          style={styles.generateBtn}
        />
      </View>
    </View>
  );
}

function PreferenceRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={prefStyles.row}>
      <View style={prefStyles.icon}>
        <Feather name={icon as any} size={14} color={Colors.light.primary} />
      </View>
      <Text style={prefStyles.label}>{label}</Text>
      <Text style={prefStyles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  inputGroup: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  inputWrapper: {
    padding: 14,
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    height: 36,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.borderLight,
    marginHorizontal: 14,
  },
  daysRow: {
    flexDirection: "row",
    gap: 8,
  },
  dayBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    gap: 2,
  },
  dayBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  dayBtnNum: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  dayBtnNumActive: { color: "#fff" },
  dayBtnLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  dayBtnLabelActive: { color: "rgba(255,255,255,0.8)" },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  monthBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  monthLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  monthLabelActive: { color: "#fff" },
  preferenceCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  editLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  editLinkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
  },
  generatingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: Colors.light.primaryPale,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.primaryLight + "30",
  },
  generatingText: { flex: 1, gap: 4 },
  generatingTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  generatingSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.primary,
    opacity: 0.8,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  generateBtn: { width: "100%" },
});

const prefStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
});
