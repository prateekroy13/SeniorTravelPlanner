import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import { usePreferences } from "@/context/PreferencesContext";

const CUISINE_IMAGES: Record<string, string> = {
  "Portuguese":   "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "Italian":      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "Japanese":     "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  "Dutch":        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "Catalan":      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "Austrian":     "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "Czech":        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "Singaporean":  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  "Scottish":     "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "French":       "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "Croatian":     "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "New Zealand":  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  "default":      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = Math.min(SCREEN_W - 48, 360);
const CARD_H = Math.min(SCREEN_H * 0.62, 520);
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: 1 | 2 | 3;
  specialty: string;
  description: string;
  seniorScore: number;
  mealType: "lunch" | "dinner" | "both";
  emoji: string;
  gradient: [string, string];
}

const PRICE_LABELS: Record<number, { symbol: string; label: string; color: string }> = {
  1: { symbol: "$", label: "Budget-Friendly", color: "#4CAF50" },
  2: { symbol: "$$", label: "Mid-Range", color: Colors.light.accent },
  3: { symbol: "$$$", label: "Fine Dining", color: "#E91E63" },
};

const MEAL_ICONS: Record<string, string> = {
  lunch: "sun",
  dinner: "moon",
  both: "clock",
};

const MEAL_LABELS: Record<string, string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  both: "Lunch & Dinner",
};

async function fetchRestaurants(
  destinationId: string,
  budget: string
): Promise<Restaurant[]> {
  const res = await fetch(
    `${BASE_URL}/api/destinations/${destinationId}/restaurants?budget=${budget}`
  );
  if (!res.ok) throw new Error("Failed to fetch restaurants");
  return res.json();
}

export default function FoodSwipeScreen() {
  const insets = useSafeAreaInsets();
  const { preferences } = usePreferences();
  const {
    destinationId,
    city,
    country,
    likedAttractions,
  } = useLocalSearchParams<{
    destinationId: string;
    city: string;
    country: string;
    likedAttractions?: string;
  }>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Restaurant[]>([]);
  const [finished, setFinished] = useState(false);

  const { data: restaurants = [], isLoading, isError } = useQuery({
    queryKey: ["restaurants", destinationId, preferences.budgetLevel],
    queryFn: () =>
      fetchRestaurants(destinationId!, preferences.budgetLevel || "mid"),
    enabled: !!destinationId,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0);

  const handleSwipeAction = useCallback(
    async (direction: "like" | "reject", restaurant: Restaurant) => {
      if (direction === "like") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLiked((prev) => [...prev, restaurant]);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (nextIndex >= restaurants.length) setFinished(true);
    },
    [currentIndex, restaurants.length]
  );

  const handlePlanTrip = () => {
    router.push({
      pathname: "/itinerary/generate",
      params: {
        city: city || "",
        country: country || "",
        likedAttractions: likedAttractions || "",
        likedRestaurants: liked.map((r) => r.name).join(","),
      },
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/");
    }
  };

  const handleSkipToPlanning = () => {
    router.push({
      pathname: "/itinerary/generate",
      params: {
        city: city || "",
        country: country || "",
        likedAttractions: likedAttractions || "",
        likedRestaurants: "",
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient colors={["#1A0D0D", "#2D1A0A"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingText}>Finding top restaurants in {city}…</Text>
      </View>
    );
  }

  if (isError || restaurants.length === 0) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient colors={["#1A0D0D", "#2D1A0A"]} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 40 }}>🍽️</Text>
        <Text style={styles.loadingText}>No restaurants found</Text>
        <TouchableOpacity onPress={handleSkipToPlanning} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Continue to planning →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    return (
      <FoodResultScreen
        liked={liked}
        city={city || ""}
        onPlan={handlePlanTrip}
        onBack={handleBack}
        topPadding={topPadding}
        bottomPadding={bottomPadding}
      />
    );
  }

  const currentCard = restaurants[currentIndex];
  const nextCard = restaurants[currentIndex + 1];
  const budgetLabel = PRICE_LABELS[preferences.budgetLevel === "budget" ? 1 : preferences.budgetLevel === "luxury" ? 3 : 2];

  return (
    <View style={styles.fullScreen}>
      <LinearGradient colors={["#1A0D0D", "#2D1A0A"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Where to Eat</Text>
          <Text style={styles.headerSub}>
            {currentIndex + 1} of {restaurants.length} restaurants
          </Text>
        </View>

        <View style={styles.likeCounter}>
          <Feather name="heart" size={14} color="#FF6B9D" />
          <Text style={styles.likeCountText}>{liked.length}</Text>
        </View>
      </View>

      <View style={styles.budgetBanner}>
        <Feather name="tag" size={12} color={budgetLabel.color} />
        <Text style={[styles.budgetBannerText, { color: budgetLabel.color }]}>
          Sorted by your budget · {budgetLabel.label}
        </Text>
      </View>

      <View style={styles.progressRow}>
        {restaurants.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i < currentIndex && styles.progressDotDone,
              i === currentIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.cardArea}>
        {nextCard && (
          <View style={styles.behindCard} pointerEvents="none">
            <LinearGradient
              colors={nextCard.gradient}
              style={styles.behindCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.behindEmoji}>{nextCard.emoji}</Text>
            </LinearGradient>
          </View>
        )}

        {currentCard && (
          <FoodCard
            key={currentIndex}
            restaurant={currentCard}
            userBudgetLevel={preferences.budgetLevel === "budget" ? 1 : preferences.budgetLevel === "luxury" ? 3 : 2}
            onLike={() => handleSwipeAction("like", currentCard)}
            onReject={() => handleSwipeAction("reject", currentCard)}
          />
        )}
      </View>

      <View style={[styles.buttonRow, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          onPress={() => currentCard && handleSwipeAction("reject", currentCard)}
          style={styles.rejectBtn}
          activeOpacity={0.85}
        >
          <Feather name="x" size={28} color="#FF6B6B" />
        </TouchableOpacity>

        <View style={styles.centerActions}>
          <Text style={styles.orSwipeText}>← swipe →</Text>
          <TouchableOpacity onPress={handleSkipToPlanning} style={styles.skipPlanBtn}>
            <Text style={styles.skipPlanText}>Skip to planning</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => currentCard && handleSwipeAction("like", currentCard)}
          style={styles.likeBtn}
          activeOpacity={0.85}
        >
          <Feather name="heart" size={26} color="#FF6B9D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FoodCard({
  restaurant,
  userBudgetLevel,
  onLike,
  onReject,
}: {
  restaurant: Restaurant;
  userBudgetLevel: number;
  onLike: () => void;
  onReject: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY * 0.25;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_W * 1.5, { damping: 14 });
        translateY.value = withSpring(30);
        runOnJS(onLike)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_W * 1.5, { damping: 14 });
        translateY.value = withSpring(30);
        runOnJS(onReject)();
      } else {
        translateX.value = withSpring(0, { damping: 14 });
        translateY.value = withSpring(0, { damping: 14 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W / 2, 0, SCREEN_W / 2],
      [-14, 0, 14]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], "clamp"),
  }));

  const rejectOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], "clamp"),
  }));

  const price = PRICE_LABELS[restaurant.priceLevel];
  const isBudgetMatch = restaurant.priceLevel === userBudgetLevel;
  const imgUrl = CUISINE_IMAGES[restaurant.cuisine] ?? CUISINE_IMAGES["default"];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.cardGradient}>
          <Image
            source={{ uri: imgUrl }}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.28)", "rgba(0,0,0,0.75)"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <Animated.View style={[styles.stampContainer, { left: 24 }, likeOpacity]}>
            <View style={styles.likeStamp}>
              <Feather name="heart" size={24} color="#FF6B9D" />
              <Text style={styles.likeStampText}>LOVE IT</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.stampContainer, { right: 24 }, rejectOpacity]}>
            <View style={styles.rejectStamp}>
              <Feather name="x" size={24} color="#FF6B6B" />
              <Text style={styles.rejectStampText}>SKIP</Text>
            </View>
          </Animated.View>

          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <View style={styles.emojiBox}>
                <Text style={styles.cardEmoji}>{restaurant.emoji}</Text>
              </View>

              <View style={styles.cardBadges}>
                <View style={[styles.priceBadge, { borderColor: price.color + "66" }]}>
                  <Text style={[styles.priceSymbol, { color: price.color }]}>
                    {price.symbol}
                  </Text>
                  <Text style={[styles.priceLabel, { color: price.color }]}>
                    {price.label}
                  </Text>
                </View>
                {isBudgetMatch && (
                  <View style={styles.matchBadge}>
                    <Feather name="check" size={11} color="#4CAF50" />
                    <Text style={styles.matchText}>Matches your budget</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.cuisineMealRow}>
              <View style={styles.cuisineBadge}>
                <Text style={styles.cuisineText}>{restaurant.cuisine}</Text>
              </View>
              <View style={styles.mealBadge}>
                <Feather name={MEAL_ICONS[restaurant.mealType] as any} size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.mealText}>{MEAL_LABELS[restaurant.mealType]}</Text>
              </View>
            </View>

            <Text style={styles.cardName}>{restaurant.name}</Text>

            <View style={styles.specialtyRow}>
              <Feather name="star" size={13} color={Colors.light.accent} />
              <Text style={styles.specialtyText}>{restaurant.specialty}</Text>
            </View>

            <Text style={styles.cardDesc}>{restaurant.description}</Text>

            <View style={styles.statsRow}>
              <View style={[styles.pill, styles.pillHL]}>
                <Feather name="activity" size={11} color={Colors.light.accent} />
                <Text style={[styles.pillVal, styles.pillValHL]}>
                  {restaurant.seniorScore}/10
                </Text>
                <Text style={styles.pillLbl}>Senior Score</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardHint}>
            <Feather name="arrow-left" size={14} color="rgba(255,255,255,0.25)" />
            <Text style={styles.cardHintText}>skip · swipe · love</Text>
            <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.25)" />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function FoodResultScreen({
  liked,
  city,
  onPlan,
  onBack,
  topPadding,
  bottomPadding,
}: {
  liked: Restaurant[];
  city: string;
  onPlan: () => void;
  onBack: () => void;
  topPadding: number;
  bottomPadding: number;
}) {
  return (
    <View style={styles.fullScreen}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          resultStyles.content,
          { paddingTop: topPadding + 20, paddingBottom: bottomPadding + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={resultStyles.heroSection}>
          <Text style={resultStyles.bigEmoji}>
            {liked.length === 0 ? "🍽️" : liked.length < 3 ? "🥘" : "❤️"}
          </Text>
          <Text style={resultStyles.title}>
            {liked.length === 0
              ? "We'll find great spots"
              : `${liked.length} restaurant${liked.length !== 1 ? "s" : ""} you'll love`}
          </Text>
          <Text style={resultStyles.subtitle}>
            {liked.length === 0
              ? `The AI will recommend great restaurants in ${city} based on your profile.`
              : `These will be scheduled into your ${city} itinerary for lunch and dinner.`}
          </Text>
        </View>

        {liked.length > 0 && (
          <View style={resultStyles.likedList}>
            {liked.map((r) => {
              const price = PRICE_LABELS[r.priceLevel];
              return (
                <View key={r.id} style={resultStyles.likedRow}>
                  <LinearGradient colors={r.gradient} style={resultStyles.likedSwatch}>
                    <Text style={resultStyles.likedEmoji}>{r.emoji}</Text>
                  </LinearGradient>
                  <View style={resultStyles.likedInfo}>
                    <Text style={resultStyles.likedName} numberOfLines={1}>{r.name}</Text>
                    <View style={resultStyles.likedMeta}>
                      <Text style={[resultStyles.likedPrice, { color: price.color }]}>
                        {price.symbol}
                      </Text>
                      <Text style={resultStyles.likedCuisine}>{r.cuisine}</Text>
                      <View style={resultStyles.mealPill}>
                        <Feather name={MEAL_ICONS[r.mealType] as any} size={10} color="rgba(255,255,255,0.4)" />
                        <Text style={resultStyles.mealPillText}>{MEAL_LABELS[r.mealType]}</Text>
                      </View>
                    </View>
                  </View>
                  <Feather name="heart" size={14} color="#FF6B9D" />
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity onPress={onPlan} activeOpacity={0.9} style={resultStyles.planBtn}>
          <LinearGradient
            colors={[Colors.light.accent, "#C87C2A"]}
            style={resultStyles.planBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Feather name="calendar" size={20} color="#fff" />
            <Text style={resultStyles.planBtnText}>Plan My Trip to {city}</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={resultStyles.skipBtn}>
          <Text style={resultStyles.skipText}>← Back to destinations</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  errorBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
  errorBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    width: "100%",
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  likeCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,107,157,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,107,157,0.25)",
    flexShrink: 0,
  },
  likeCountText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FF6B9D",
  },
  budgetBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    marginBottom: 4,
  },
  budgetBannerText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 24,
    marginBottom: 12,
    width: "100%",
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressDotActive: { backgroundColor: "rgba(255,255,255,0.55)" },
  progressDotDone: { backgroundColor: "#FF6B9D" },
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  behindCard: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: "hidden",
    transform: [{ scale: 0.94 }, { translateY: 14 }],
    opacity: 0.45,
  },
  behindCardGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  behindEmoji: { fontSize: 56, opacity: 0.3 },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: "hidden",
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 24 },
      android: { elevation: 14 },
      web: { boxShadow: "0 12px 40px rgba(0,0,0,0.5)" },
    }),
  },
  cardGradient: {
    flex: 1,
    padding: 22,
    justifyContent: "flex-end",
  },
  stampContainer: {
    position: "absolute",
    top: 32,
    zIndex: 20,
  },
  likeStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 2.5,
    borderColor: "#FF6B9D",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    transform: [{ rotate: "-12deg" }],
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  likeStampText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FF6B9D",
    letterSpacing: 2,
  },
  rejectStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 2.5,
    borderColor: "#FF6B6B",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    transform: [{ rotate: "12deg" }],
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  rejectStampText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FF6B6B",
    letterSpacing: 2,
  },
  cardBody: { gap: 9 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 2,
  },
  emojiBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardEmoji: { fontSize: 30 },
  cardBadges: { flex: 1, gap: 6 },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  priceSymbol: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(76,175,80,0.15)",
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  matchText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#4CAF50",
  },
  cuisineMealRow: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
  },
  cuisineBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cuisineText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  mealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mealText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  cardName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 28,
  },
  specialtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  specialtyText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.accent,
    flex: 1,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
  },
  statsRow: { flexDirection: "row", gap: 7, marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillHL: {
    backgroundColor: "rgba(232,169,81,0.18)",
    borderWidth: 1,
    borderColor: "rgba(232,169,81,0.35)",
  },
  pillVal: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  pillValHL: { color: Colors.light.accent },
  pillLbl: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  cardHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  cardHintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.22)",
    letterSpacing: 0.8,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 14,
    gap: 16,
    width: "100%",
  },
  rejectBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,107,107,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,157,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,107,157,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerActions: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  orSwipeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.6,
  },
  skipPlanBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  skipPlanText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.3)",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
});

const resultStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    gap: 22,
    width: "100%",
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
  },
  bigEmoji: { fontSize: 60, marginBottom: 4 },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 22,
  },
  likedList: { gap: 10 },
  likedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,157,0.18)",
  },
  likedSwatch: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  likedEmoji: { fontSize: 20 },
  likedInfo: { flex: 1, gap: 4 },
  likedName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  likedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likedPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  likedCuisine: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  mealPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mealPillText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  planBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 },
      android: { elevation: 8 },
      web: { boxShadow: `0 8px 24px ${Colors.light.accent}55` },
    }),
  },
  planBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  planBtnText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.35)",
  },
});
