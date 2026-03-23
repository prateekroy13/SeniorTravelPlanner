import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { usePreferences, Pace, BudgetLevel } from "@/context/PreferencesContext";
import { useSavedItineraries } from "@/context/SavedItinerariesContext";

const PACE_OPTIONS: { value: Pace; label: string; subtitle: string; steps: string; icon: string }[] = [
  {
    value: "easy",
    label: "Easy",
    subtitle: "Gentle walks, frequent rests, minimal stairs",
    steps: "2,000–4,000 steps/day",
    icon: "coffee",
  },
  {
    value: "moderate",
    label: "Moderate",
    subtitle: "Comfortable pace with regular breaks",
    steps: "4,000–7,000 steps/day",
    icon: "sun",
  },
  {
    value: "active",
    label: "Active",
    subtitle: "Full days, good walking ability",
    steps: "7,000–10,000 steps/day",
    icon: "activity",
  },
];

const BUDGET_OPTIONS: { value: BudgetLevel; label: string; desc: string; symbol: string }[] = [
  { value: "budget", label: "Budget", desc: "Local cafes, affordable spots", symbol: "$" },
  { value: "mid", label: "Mid-Range", desc: "Good quality, fair price", symbol: "$$" },
  { value: "luxury", label: "Luxury", desc: "Premium dining & experiences", symbol: "$$$" },
];

const INTEREST_OPTIONS = [
  { value: "culture", label: "Culture", icon: "book" },
  { value: "food", label: "Food & Dining", icon: "coffee" },
  { value: "nature", label: "Nature", icon: "feather" },
  { value: "shopping", label: "Shopping", icon: "shopping-bag" },
  { value: "art", label: "Art", icon: "image" },
  { value: "architecture", label: "Architecture", icon: "home" },
  { value: "religious", label: "Religious Sites", icon: "star" },
  { value: "relaxation", label: "Relaxation", icon: "wind" },
  { value: "music", label: "Music & Shows", icon: "music" },
  { value: "photography", label: "Photography", icon: "camera" },
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free",
  "Halal", "Kosher", "Nut Allergy",
  "Dairy-Free", "Low-Sodium",
];

const ACCESS_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: "no_stairs", label: "Avoid Stairs", icon: "trending-up" },
  { value: "wheelchair", label: "Wheelchair", icon: "user" },
  { value: "slow_pace", label: "Slow Pace", icon: "clock" },
  { value: "no_hills", label: "Flat Terrain", icon: "minus" },
  { value: "rest_breaks", label: "Frequent Breaks", icon: "pause-circle" },
  { value: "medical_nearby", label: "Medical Nearby", icon: "heart" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = usePreferences();
  const { savedItineraries } = useSavedItineraries();
  const { user, signOut, signInWithGoogle, signingIn, hasGoogleClientId } = useAuth();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Math.max(insets.bottom + 100, 120);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setSigningOut(false);
      setConfirmingSignOut(false);
    }
  };

  const handleResetOnboarding = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Reset Setup",
      "This will restart the setup wizard. Your saved trips won't be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => updatePreferences({ hasCompletedOnboarding: false }),
        },
      ]
    );
  };

  const toggleInterest = async (val: string) => {
    await Haptics.selectionAsync();
    const current = preferences.interests;
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    updatePreferences({ interests: updated });
  };

  const toggleDietary = async (val: string) => {
    await Haptics.selectionAsync();
    const current = preferences.dietaryNeeds;
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    updatePreferences({ dietaryNeeds: updated });
  };

  const toggleAccess = async (val: string) => {
    await Haptics.selectionAsync();
    const current = preferences.accessibilityNeeds;
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    updatePreferences({ accessibilityNeeds: updated });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileHeader, { paddingTop: topPadding + 16 }]}>
          <View style={styles.avatarRing}>
            <UserAvatar user={user} size={72} />
          </View>
          <Text style={styles.name}>{user?.name ?? "My Travel Profile"}</Text>
          {user?.email ? (
            <Text style={styles.email}>{user.email}</Text>
          ) : null}
          <Text style={styles.subname}>
            {savedItineraries.length} trip{savedItineraries.length !== 1 ? "s" : ""} saved
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatChip icon="activity" label={PACE_OPTIONS.find(p => p.value === preferences.pace)?.label ?? "Moderate"} />
          <StatChip icon="tag" label={BUDGET_OPTIONS.find(b => b.value === preferences.budgetLevel)?.label ?? "Mid-Range"} />
          <StatChip icon="map" label={`${savedItineraries.length} trip${savedItineraries.length !== 1 ? "s" : ""}`} />
        </View>

        {!user && (
          <TouchableOpacity
            style={styles.signInCard}
            activeOpacity={0.85}
            onPress={async () => {
              if (hasGoogleClientId) {
                try { await signInWithGoogle(); } catch {}
              } else {
                router.replace("/login");
              }
            }}
            disabled={signingIn}
          >
            <View style={styles.signInCardLeft}>
              <View style={styles.signInIconBox}>
                <Feather name="user" size={22} color={Colors.light.primary} />
              </View>
              <View style={styles.signInCardText}>
                <Text style={styles.signInCardTitle}>Sign in to sync your trips</Text>
                <Text style={styles.signInCardSub}>Save itineraries across devices with Google</Text>
              </View>
            </View>
            {signingIn ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <View style={styles.signInArrow}>
                <Feather name="chevron-right" size={20} color={Colors.light.primary} />
              </View>
            )}
          </TouchableOpacity>
        )}

        <SectionHeader title="Travel Pace" subtitle="How much walking are you comfortable with each day?" />
        <View style={styles.paceGrid}>
          {PACE_OPTIONS.map((opt) => {
            const isActive = preferences.pace === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const stepsMap: Record<Pace, number> = { easy: 3000, moderate: 6000, active: 9000 };
                  updatePreferences({ pace: opt.value, maxStepsPerDay: stepsMap[opt.value] });
                }}
                activeOpacity={0.85}
                style={[styles.paceCard, isActive && styles.paceCardActive]}
              >
                <View style={[styles.paceIconBox, isActive && styles.paceIconBoxActive]}>
                  <Feather name={opt.icon as any} size={20} color={isActive ? "#fff" : Colors.light.primary} />
                </View>
                <View style={styles.paceText}>
                  <View style={styles.paceLabelRow}>
                    <Text style={[styles.paceLabel, isActive && styles.paceLabelActive]}>
                      {opt.label}
                    </Text>
                    {isActive && (
                      <View style={styles.selectedBadge}>
                        <Feather name="check" size={11} color={Colors.light.primary} />
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.paceSubtitle, isActive && styles.paceSubtitleActive]}>
                    {opt.subtitle}
                  </Text>
                  <Text style={[styles.paceSteps, isActive && styles.paceStepsActive]}>
                    {opt.steps}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader title="Budget Level" subtitle="Guides restaurant and activity cost recommendations" />
        <View style={styles.budgetRow}>
          {BUDGET_OPTIONS.map((opt) => {
            const isActive = preferences.budgetLevel === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updatePreferences({ budgetLevel: opt.value });
                }}
                activeOpacity={0.85}
                style={[styles.budgetCard, isActive && styles.budgetCardActive]}
              >
                <Text style={[styles.budgetSymbol, isActive && styles.budgetSymbolActive]}>
                  {opt.symbol}
                </Text>
                <Text style={[styles.budgetLabel, isActive && styles.budgetLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.budgetDesc, isActive && styles.budgetDescActive]}>
                  {opt.desc}
                </Text>
                {isActive && (
                  <View style={styles.budgetCheck}>
                    <Feather name="check-circle" size={16} color={Colors.light.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader title="Interests" subtitle="Tap to toggle — shapes your itinerary content" />
        <View style={styles.chipGrid}>
          {INTEREST_OPTIONS.map((opt) => {
            const isActive = preferences.interests.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => toggleInterest(opt.value)}
                activeOpacity={0.8}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Feather name={opt.icon as any} size={13} color={isActive ? "#fff" : Colors.light.primary} />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader title="Dietary Needs" subtitle="Tap to toggle — used for restaurant suggestions" />
        <View style={styles.chipGrid}>
          {DIETARY_OPTIONS.map((item) => {
            const isActive = preferences.dietaryNeeds.includes(item);
            return (
              <TouchableOpacity
                key={item}
                onPress={() => toggleDietary(item)}
                activeOpacity={0.8}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader title="Accessibility" subtitle="Tap to toggle — affects routing and venue suggestions" />
        <View style={styles.accessGrid}>
          {ACCESS_OPTIONS.map((opt) => {
            const isActive = preferences.accessibilityNeeds.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => toggleAccess(opt.value)}
                activeOpacity={0.8}
                style={[styles.accessCard, isActive && styles.accessCardActive]}
              >
                <View style={[styles.accessIcon, isActive && styles.accessIconActive]}>
                  <Feather name={opt.icon as any} size={16} color={isActive ? "#fff" : Colors.light.primary} />
                </View>
                <Text style={[styles.accessLabel, isActive && styles.accessLabelActive]}>
                  {opt.label}
                </Text>
                {isActive && (
                  <Feather name="check" size={14} color={Colors.light.primary} style={styles.accessCheck} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.appSection}>
          <Text style={styles.appSectionTitle}>App</Text>
          <View style={styles.appCard}>
            <TouchableOpacity onPress={handleResetOnboarding} activeOpacity={0.7} style={styles.appRow}>
              <View style={styles.appRowIcon}>
                <Feather name="refresh-cw" size={16} color={Colors.light.primary} />
              </View>
              <View style={styles.appRowText}>
                <Text style={styles.appRowLabel}>Redo Setup Wizard</Text>
                <Text style={styles.appRowSub}>Walk through all preferences again</Text>
              </View>
              <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
            </TouchableOpacity>
            <View style={styles.appDivider} />
            <View style={styles.appRow}>
              <View style={styles.appRowIcon}>
                <Feather name="info" size={16} color={Colors.light.primary} />
              </View>
              <View style={styles.appRowText}>
                <Text style={styles.appRowLabel}>About SeniorTravel</Text>
                <Text style={styles.appRowSub}>AI-powered itineraries for senior explorers</Text>
              </View>
            </View>
          </View>
        </View>

        {user && !confirmingSignOut && (
          <TouchableOpacity
            onPress={() => setConfirmingSignOut(true)}
            activeOpacity={0.8}
            style={styles.signOutBtn}
          >
            <Feather name="log-out" size={18} color="#D93025" />
            <View style={styles.signOutText}>
              <Text style={styles.signOutLabel}>Sign out</Text>
              <Text style={styles.signOutSub}>{user.email}</Text>
            </View>
          </TouchableOpacity>
        )}

        {user && confirmingSignOut && (
          <View style={styles.signOutConfirm}>
            <Feather name="log-out" size={18} color="#D93025" />
            <View style={styles.signOutText}>
              <Text style={styles.signOutLabel}>Sign out?</Text>
              <Text style={styles.signOutSub}>You'll need to sign in again</Text>
            </View>
            <View style={styles.signOutActions}>
              <TouchableOpacity
                onPress={() => setConfirmingSignOut(false)}
                style={styles.signOutCancel}
                activeOpacity={0.7}
                disabled={signingOut}
              >
                <Text style={styles.signOutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.signOutConfirmBtn}
                activeOpacity={0.7}
                disabled={signingOut}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.signOutConfirmText}>Sign out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>SeniorTravel v1.0</Text>
          <Text style={styles.footerSub}>Explore the world comfortably</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={headerStyles.container}>
      <Text style={headerStyles.title}>{title}</Text>
      <Text style={headerStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={statChipStyles.chip}>
      <Feather name={icon as any} size={14} color={Colors.light.primary} />
      <Text style={statChipStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollContent: { padding: 20, gap: 14 },

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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  email: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  subname: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  signInCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F8F4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C8E6D9",
    marginBottom: 8,
  },
  signInCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  signInIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D6EFE3",
    alignItems: "center",
    justifyContent: "center",
  },
  signInCardText: { flex: 1, gap: 2 },
  signInCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  signInCardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  signInArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D6EFE3",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0DE",
  },
  signOutText: { flex: 1, gap: 2 },
  signOutLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#D93025",
  },
  signOutSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(217,48,37,0.65)",
  },
  signOutConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0DE",
  },
  signOutActions: {
    flexDirection: "row",
    gap: 8,
  },
  signOutCancel: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  signOutCancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  signOutConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#D93025",
    minWidth: 80,
    alignItems: "center",
  },
  signOutConfirmText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },

  paceGrid: { gap: 8 },
  paceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.light.borderLight,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    }),
  },
  paceCardActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryPale,
  },
  paceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  paceIconBoxActive: {
    backgroundColor: Colors.light.primary,
  },
  paceText: { flex: 1, gap: 3 },
  paceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paceLabel: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  paceLabelActive: { color: Colors.light.primary },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fff",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  paceSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  paceSubtitleActive: { color: Colors.light.primary, opacity: 0.75 },
  paceSteps: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  paceStepsActive: { color: Colors.light.primary, opacity: 0.6 },

  budgetRow: { flexDirection: "row", gap: 8 },
  budgetCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.light.borderLight,
    gap: 3,
    alignItems: "center",
  },
  budgetCardActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryPale,
  },
  budgetSymbol: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.light.textTertiary,
  },
  budgetSymbolActive: { color: Colors.light.primary },
  budgetLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  budgetLabelActive: { color: Colors.light.primary },
  budgetDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
    textAlign: "center",
  },
  budgetDescActive: { color: Colors.light.primary, opacity: 0.65 },
  budgetCheck: {
    marginTop: 6,
  },

  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  chipTextActive: { color: "#fff" },

  accessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  accessCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "47%",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  accessCardActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryPale,
  },
  accessIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  accessIconActive: { backgroundColor: Colors.light.primary },
  accessLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  accessLabelActive: { color: Colors.light.primary },
  accessCheck: { marginLeft: "auto" },

  appSection: { gap: 8, marginTop: 6 },
  appSectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  appCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    overflow: "hidden",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  appDivider: {
    height: 1,
    backgroundColor: Colors.light.borderLight,
    marginHorizontal: 14,
  },
  appRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  appRowText: { flex: 1, gap: 2 },
  appRowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  appRowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
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

const headerStyles = StyleSheet.create({
  container: {
    gap: 3,
    marginTop: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
});

const statChipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
});
