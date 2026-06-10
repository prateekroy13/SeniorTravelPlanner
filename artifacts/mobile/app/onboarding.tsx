import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePreferences, Pace, BudgetLevel } from "@/context/PreferencesContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const STEPS = 4;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { updatePreferences } = usePreferences();

  const [step, setStep] = useState(0);
  const [pace, setPace] = useState<Pace>("moderate");
  const [maxSteps, setMaxSteps] = useState(6000);
  const [interests, setInterests] = useState<string[]>(["culture", "food"]);
  const [dietaryNeeds, setDietaryNeeds] = useState<string[]>([]);
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("mid");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);

  const scrollRef = useRef<ScrollView>(null);

  const nextStep = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS - 1) {
      setStep(step + 1);
      scrollRef.current?.scrollTo({ x: (step + 1) * SCREEN_WIDTH, animated: true });
    } else {
      await finish();
    }
  };

  const prevStep = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 0) {
      setStep(step - 1);
      scrollRef.current?.scrollTo({ x: (step - 1) * SCREEN_WIDTH, animated: true });
    }
  };

  const finish = async () => {
    await updatePreferences({
      pace,
      maxStepsPerDay: maxSteps,
      interests,
      dietaryNeeds,
      budgetLevel,
      accessibilityNeeds,
      hasCompletedOnboarding: true,
    });
    router.replace("/(tabs)");
  };

  const toggleInterest = async (val: string) => {
    await Haptics.selectionAsync();
    setInterests((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const toggleDietary = async (val: string) => {
    await Haptics.selectionAsync();
    setDietaryNeeds((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const toggleAccess = async (val: string) => {
    await Haptics.selectionAsync();
    setAccessibilityNeeds((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Feather name="map" size={20} color="rgba(255,255,255,0.9)" />
          <Text style={styles.logoText}>Tuttle</Text>
        </View>

        <View style={styles.progressBar}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= step && styles.progressDotActive,
                i < step && styles.progressDotDone,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
          <PaceStep pace={pace} onSelect={setPace} maxSteps={maxSteps} onStepsChange={setMaxSteps} />
        </View>
        <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
          <InterestsStep selected={interests} onToggle={toggleInterest} />
        </View>
        <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
          <DietBudgetStep
            dietary={dietaryNeeds}
            budget={budgetLevel}
            onToggleDietary={toggleDietary}
            onSetBudget={setBudgetLevel}
          />
        </View>
        <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
          <AccessibilityStep selected={accessibilityNeeds} onToggle={toggleAccess} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 16 }]}>
        {step > 0 && (
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
        <View style={styles.nextBtnWrapper}>
          <PrimaryButton
            label={step === STEPS - 1 ? "Start Exploring" : "Continue"}
            onPress={nextStep}
            size="lg"
            style={styles.nextBtn}
            textStyle={styles.nextBtnText}
          />
        </View>
      </View>
    </View>
  );
}

function PaceStep({
  pace,
  onSelect,
  maxSteps,
  onStepsChange,
}: {
  pace: Pace;
  onSelect: (p: Pace) => void;
  maxSteps: number;
  onStepsChange: (n: number) => void;
}) {
  const options: { value: Pace; label: string; desc: string; steps: string; icon: string }[] = [
    { value: "easy", label: "Easy", desc: "Gentle walks, frequent rests, minimal stairs", steps: "2,000–4,000 steps/day", icon: "coffee" },
    { value: "moderate", label: "Moderate", desc: "Comfortable pace with rest breaks", steps: "4,000–7,000 steps/day", icon: "sun" },
    { value: "active", label: "Active", desc: "Full days with good walking ability", steps: "7,000–10,000 steps/day", icon: "activity" },
  ];

  const stepOptions = [3000, 5000, 7000, 10000];

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>What's your travel pace?</Text>
      <Text style={stepStyles.subtitle}>
        We'll tailor your daily plans to match your comfort level.
      </Text>

      <View style={stepStyles.options}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt.value);
              const stepsMap: Record<Pace, number> = { easy: 3000, moderate: 6000, active: 9000 };
              onStepsChange(stepsMap[opt.value]);
            }}
            style={[
              stepStyles.optionCard,
              pace === opt.value && stepStyles.optionCardActive,
            ]}
          >
            <View style={[stepStyles.optionIcon, pace === opt.value && stepStyles.optionIconActive]}>
              <Feather name={opt.icon as any} size={20} color={pace === opt.value ? "#fff" : Colors.light.primary} />
            </View>
            <View style={stepStyles.optionText}>
              <Text style={[stepStyles.optionLabel, pace === opt.value && stepStyles.optionLabelActive]}>
                {opt.label}
              </Text>
              <Text style={[stepStyles.optionDesc, pace === opt.value && stepStyles.optionDescActive]}>
                {opt.desc}
              </Text>
              <Text style={[stepStyles.optionSteps, pace === opt.value && stepStyles.optionStepsActive]}>
                {opt.steps}
              </Text>
            </View>
            {pace === opt.value && (
              <Feather name="check-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function InterestsStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (val: string) => void;
}) {
  const interests = [
    { value: "culture", label: "Culture & History", icon: "book" },
    { value: "food", label: "Food & Dining", icon: "coffee" },
    { value: "nature", label: "Nature & Parks", icon: "feather" },
    { value: "shopping", label: "Shopping", icon: "shopping-bag" },
    { value: "art", label: "Art & Museums", icon: "image" },
    { value: "architecture", label: "Architecture", icon: "home" },
    { value: "religious", label: "Religious Sites", icon: "star" },
    { value: "relaxation", label: "Relaxation & Spas", icon: "wind" },
    { value: "music", label: "Music & Shows", icon: "music" },
    { value: "photography", label: "Photography", icon: "camera" },
  ];

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>What do you love?</Text>
      <Text style={stepStyles.subtitle}>Select all that interest you.</Text>

      <View style={stepStyles.chipGrid}>
        {interests.map((item) => {
          const active = selected.includes(item.value);
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => onToggle(item.value)}
              style={[stepStyles.chip, active && stepStyles.chipActive]}
            >
              <Feather name={item.icon as any} size={14} color={active ? "#fff" : Colors.light.primary} />
              <Text style={[stepStyles.chipLabel, active && stepStyles.chipLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DietBudgetStep({
  dietary,
  budget,
  onToggleDietary,
  onSetBudget,
}: {
  dietary: string[];
  budget: BudgetLevel;
  onToggleDietary: (val: string) => void;
  onSetBudget: (val: BudgetLevel) => void;
}) {
  const dietOptions = [
    "Vegetarian", "Vegan", "Gluten-Free",
    "Halal", "Kosher", "Nut Allergy",
    "Dairy-Free", "Low-Sodium",
  ];

  const budgetOptions: { value: BudgetLevel; label: string; desc: string }[] = [
    { value: "budget", label: "Budget", desc: "Local cafes & affordable spots" },
    { value: "mid", label: "Mid-Range", desc: "Good quality, fair price" },
    { value: "luxury", label: "Luxury", desc: "Premium restaurants & experiences" },
  ];

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Food & Budget</Text>
      <Text style={stepStyles.subtitle}>Help us tailor your restaurant suggestions.</Text>

      <Text style={stepStyles.sectionLabel}>Dietary needs</Text>
      <View style={stepStyles.chipGrid}>
        {dietOptions.map((item) => {
          const active = dietary.includes(item);
          return (
            <TouchableOpacity
              key={item}
              onPress={() => onToggleDietary(item)}
              style={[stepStyles.chip, active && stepStyles.chipActive]}
            >
              <Text style={[stepStyles.chipLabel, active && stepStyles.chipLabelActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[stepStyles.sectionLabel, { marginTop: 20 }]}>Budget preference</Text>
      <View style={stepStyles.budgetRow}>
        {budgetOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSetBudget(opt.value);
            }}
            style={[stepStyles.budgetCard, budget === opt.value && stepStyles.budgetCardActive]}
          >
            <Text style={[stepStyles.budgetLabel, budget === opt.value && stepStyles.budgetLabelActive]}>
              {opt.label}
            </Text>
            <Text style={[stepStyles.budgetDesc, budget === opt.value && stepStyles.budgetDescActive]}>
              {opt.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function AccessibilityStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (val: string) => void;
}) {
  const options = [
    { value: "no_stairs", label: "Avoid Stairs", icon: "trending-up" },
    { value: "wheelchair", label: "Wheelchair", icon: "user" },
    { value: "slow_pace", label: "Slow Pace", icon: "clock" },
    { value: "no_hills", label: "Flat Terrain", icon: "minus" },
    { value: "large_font", label: "Larger Text", icon: "type" },
    { value: "rest_breaks", label: "Frequent Breaks", icon: "pause-circle" },
    { value: "medical_nearby", label: "Medical Nearby", icon: "heart" },
  ];

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Accessibility needs</Text>
      <Text style={stepStyles.subtitle}>
        We'll prioritize accessible routes, lifts, and rest spots — entirely optional.
      </Text>

      <View style={stepStyles.accessGrid}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onToggle(opt.value)}
              style={[stepStyles.accessCard, active && stepStyles.accessCardActive]}
            >
              <View style={[stepStyles.accessIcon, active && stepStyles.accessIconActive]}>
                <Feather name={opt.icon as any} size={18} color={active ? "#fff" : Colors.light.primary} />
              </View>
              <Text style={[stepStyles.accessLabel, active && stepStyles.accessLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={stepStyles.skipNote}>Skip any that don't apply — all settings can be changed later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.gradientStart,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  progressBar: {
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressDotActive: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  progressDotDone: {
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  stepPage: {
    flex: 1,
    paddingHorizontal: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  backBtn: {
    width: 50,
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnWrapper: {
    flex: 1,
  },
  nextBtn: {
    backgroundColor: "#fff",
  },
  nextBtnText: {
    color: Colors.light.primary,
  },
});

const stepStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 10,
  },
  options: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionCardActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: {
    backgroundColor: Colors.light.primaryLight,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  optionLabelActive: { color: "#fff" },
  optionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  optionDescActive: { color: "rgba(255,255,255,0.85)" },
  optionSteps: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  optionStepsActive: { color: "rgba(255,255,255,0.75)" },
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
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  chipLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  chipLabelActive: { color: "#fff" },
  budgetRow: {
    gap: 8,
  },
  budgetCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 3,
  },
  budgetCardActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.45)",
  },
  budgetLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
  },
  budgetLabelActive: { color: "#fff" },
  budgetDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  budgetDescActive: { color: "rgba(255,255,255,0.75)" },
  accessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  accessCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  accessCardActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  accessIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  accessIconActive: { backgroundColor: Colors.light.primaryLight },
  accessLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    flex: 1,
  },
  accessLabelActive: { color: "#fff" },
  skipNote: {
    marginTop: 20,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 18,
  },
});
