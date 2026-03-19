import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePreferences, Pace, BudgetLevel } from "@/context/PreferencesContext";
import { useSavedItineraries } from "@/context/SavedItinerariesContext";

const PACE_LABELS: Record<Pace, { label: string; desc: string; icon: string }> = {
  easy: { label: "Easy", desc: "Gentle walks, frequent rests", icon: "coffee" },
  moderate: { label: "Moderate", desc: "Comfortable pace", icon: "sun" },
  active: { label: "Active", desc: "Full days of walking", icon: "activity" },
};

const BUDGET_LABELS: Record<BudgetLevel, string> = {
  budget: "Budget",
  mid: "Mid-Range",
  luxury: "Luxury",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = usePreferences();
  const { savedItineraries } = useSavedItineraries();
  const [showPaceSheet, setShowPaceSheet] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Math.max(insets.bottom + 100, 120);

  const handleResetOnboarding = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Reset Setup",
      "This will take you back through the initial setup. Your saved trips won't be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await updatePreferences({ hasCompletedOnboarding: false });
          },
        },
      ]
    );
  };

  const paceInfo = PACE_LABELS[preferences.pace];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileHeader, { paddingTop: topPadding + 20 }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Feather name="user" size={28} color={Colors.light.primary} />
            </View>
          </View>
          <Text style={styles.name}>My Travel Profile</Text>
          <Text style={styles.subname}>{savedItineraries.length} trip{savedItineraries.length !== 1 ? "s" : ""} planned</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="map" label="Destinations" value={savedItineraries.length.toString()} />
          <StatCard icon="activity" label="Pace" value={PACE_LABELS[preferences.pace].label} />
          <StatCard icon="tag" label="Budget" value={BUDGET_LABELS[preferences.budgetLevel]} />
        </View>

        <Section title="Travel Preferences">
          <SettingRow
            icon="zap"
            label="Travel Pace"
            value={paceInfo.label}
            subtitle={paceInfo.desc}
            onPress={() => setShowPaceSheet(true)}
          />
          <SettingRow
            icon="tag"
            label="Budget Level"
            value={BUDGET_LABELS[preferences.budgetLevel]}
            onPress={() => {
              const levels: BudgetLevel[] = ["budget", "mid", "luxury"];
              const current = levels.indexOf(preferences.budgetLevel);
              const next = levels[(current + 1) % levels.length];
              updatePreferences({ budgetLevel: next });
              Haptics.selectionAsync();
            }}
          />
          {preferences.interests.length > 0 && (
            <View style={styles.tagsRow}>
              <View style={styles.tagLabel}>
                <Feather name="heart" size={16} color={Colors.light.primary} />
                <Text style={styles.tagLabelText}>Interests</Text>
              </View>
              <View style={styles.chips}>
                {preferences.interests.map((i) => (
                  <View key={i} style={styles.chip}>
                    <Text style={styles.chipText}>{i}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Section>

        {preferences.accessibilityNeeds.length > 0 && (
          <Section title="Accessibility">
            <View style={styles.chips}>
              {preferences.accessibilityNeeds.map((need) => (
                <View key={need} style={styles.accessChip}>
                  <Feather name="check" size={12} color={Colors.light.primary} />
                  <Text style={styles.chipText}>{need.replace("_", " ")}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {preferences.dietaryNeeds.length > 0 && (
          <Section title="Dietary Needs">
            <View style={styles.chips}>
              {preferences.dietaryNeeds.map((need) => (
                <View key={need} style={styles.chip}>
                  <Text style={styles.chipText}>{need}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section title="App">
          <SettingRow
            icon="refresh-cw"
            label="Redo Setup"
            subtitle="Update your travel preferences"
            onPress={handleResetOnboarding}
          />
          <SettingRow
            icon="info"
            label="About SeniorTravel"
            subtitle="AI-powered itineraries for senior explorers"
            onPress={() => {}}
          />
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SeniorTravel v1.0</Text>
          <Text style={styles.footerSub}>Explore the world comfortably</Text>
        </View>
      </ScrollView>

      {showPaceSheet && (
        <PaceSheet
          current={preferences.pace}
          onSelect={async (pace) => {
            const stepsMap: Record<Pace, number> = { easy: 3000, moderate: 6000, active: 9000 };
            await updatePreferences({ pace, maxStepsPerDay: stepsMap[pace] });
            setShowPaceSheet(false);
          }}
          onClose={() => setShowPaceSheet(false)}
        />
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.content}>{children}</View>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={statStyles.card}>
      <Feather name={icon as any} size={18} color={Colors.light.primary} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  subtitle,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={rowStyles.row}>
      <View style={rowStyles.iconBox}>
        <Feather name={icon as any} size={16} color={Colors.light.primary} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        {subtitle && <Text style={rowStyles.subtitle}>{subtitle}</Text>}
      </View>
      {value && <Text style={rowStyles.value}>{value}</Text>}
      <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );
}

function PaceSheet({
  current,
  onSelect,
  onClose,
}: {
  current: Pace;
  onSelect: (pace: Pace) => void;
  onClose: () => void;
}) {
  const paces: Pace[] = ["easy", "moderate", "active"];

  return (
    <View style={sheetStyles.overlay}>
      <TouchableOpacity style={sheetStyles.backdrop} onPress={onClose} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>Travel Pace</Text>
        {paces.map((pace) => {
          const info = PACE_LABELS[pace];
          return (
            <TouchableOpacity
              key={pace}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(pace);
              }}
              style={[sheetStyles.option, current === pace && sheetStyles.optionActive]}
            >
              <Feather name={info.icon as any} size={18} color={current === pace ? "#fff" : Colors.light.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[sheetStyles.optionLabel, current === pace && sheetStyles.optionLabelActive]}>
                  {info.label}
                </Text>
                <Text style={[sheetStyles.optionDesc, current === pace && sheetStyles.optionDescActive]}>
                  {info.desc}
                </Text>
              </View>
              {current === pace && <Feather name="check" size={18} color="#fff" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollContent: { padding: 20, gap: 20 },
  profileHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.light.primaryPale,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  subname: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  tagsRow: {
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  tagLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagLabelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: Colors.light.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  accessChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
  },
  footer: {
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textTertiary,
  },
  footerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
});

const sectionStyles = StyleSheet.create({
  container: { gap: 8 },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  content: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  value: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 2 },
  label: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.surfaceSecondary,
  },
  optionActive: { backgroundColor: Colors.light.primary },
  optionLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  optionLabelActive: { color: "#fff" },
  optionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  optionDescActive: { color: "rgba(255,255,255,0.75)" },
});
