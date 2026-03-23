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
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = Math.min(SCREEN_W - 48, 360);
const CARD_H = Math.min(SCREEN_H * 0.62, 520);
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface Attraction {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  seniorScore: number;
  walkingMinutes: number;
  steps: number;
  gradient: [string, string];
}

async function fetchAttractions(destinationId: string): Promise<Attraction[]> {
  const res = await fetch(`${BASE_URL}/api/destinations/${destinationId}/attractions`);
  if (!res.ok) throw new Error("Failed to fetch attractions");
  return res.json();
}

export default function SwipeScreen() {
  const insets = useSafeAreaInsets();
  const { destinationId, city, country } = useLocalSearchParams<{
    destinationId: string;
    city: string;
    country: string;
  }>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Attraction[]>([]);
  const [finished, setFinished] = useState(false);

  const { data: attractions = [], isLoading, isError } = useQuery({
    queryKey: ["attractions", destinationId],
    queryFn: () => fetchAttractions(destinationId!),
    enabled: !!destinationId,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0);

  const handleSwipeAction = useCallback(
    async (direction: "like" | "reject", attraction: Attraction) => {
      if (direction === "like") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLiked((prev) => [...prev, attraction]);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (nextIndex >= attractions.length) setFinished(true);
    },
    [currentIndex, attractions.length]
  );

  const handlePlanTrip = () => {
    router.push({
      pathname: "/food-swipe/[destinationId]",
      params: {
        destinationId: destinationId || "",
        city: city || "",
        country: country || "",
        likedAttractions: liked.map((a) => a.name).join(","),
      },
    });
  };

  const handleSkipToItinerary = () => {
    router.push({
      pathname: "/itinerary/generate",
      params: {
        city: city || "",
        country: country || "",
        likedAttractions: liked.map((a) => a.name).join(","),
        likedRestaurants: "",
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

  if (isLoading) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient colors={["#0D1117", "#1A2332"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingText}>Finding top spots in {city}…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient colors={["#0D1117", "#1A2332"]} style={StyleSheet.absoluteFill} />
        <Feather name="alert-circle" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={styles.loadingText}>Couldn't load attractions</Text>
        <TouchableOpacity onPress={handleBack} style={styles.errorBackBtn}>
          <Text style={styles.errorBackText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished || attractions.length === 0) {
    return (
      <ResultScreen
        liked={liked}
        city={city || ""}
        country={country || ""}
        onPlan={handlePlanTrip}
        onSkipRestaurants={handleSkipToItinerary}
        onBack={handleBack}
        topPadding={topPadding}
        bottomPadding={bottomPadding}
      />
    );
  }

  const currentCard = attractions[currentIndex];
  const nextCard = attractions[currentIndex + 1];

  return (
    <View style={styles.fullScreen}>
      <LinearGradient colors={["#0D1117", "#1A2332"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerCity}>{city}</Text>
          <Text style={styles.headerSub}>
            {currentIndex + 1} of {attractions.length} spots
          </Text>
        </View>

        <View style={styles.likeCounter}>
          <Feather name="heart" size={14} color="#FF6B9D" />
          <Text style={styles.likeCountText}>{liked.length}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {attractions.map((_, i) => (
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
          <SwipeCard
            key={currentIndex}
            attraction={currentCard}
            onLike={() => handleSwipeAction("like", currentCard)}
            onReject={() => handleSwipeAction("reject", currentCard)}
          />
        )}
      </View>

      <View style={[styles.buttonRow, { paddingBottom: bottomPadding + 16 }]}>
        <TouchableOpacity
          onPress={() => currentCard && handleSwipeAction("reject", currentCard)}
          style={styles.rejectBtn}
          activeOpacity={0.85}
        >
          <Feather name="x" size={28} color="#FF6B6B" />
        </TouchableOpacity>

        <Text style={styles.orSwipeText}>← swipe →</Text>

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

function SwipeCard({
  attraction,
  onLike,
  onReject,
}: {
  attraction: Attraction;
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

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient
          colors={attraction.gradient}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
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
            <View style={styles.emojiBox}>
              <Text style={styles.cardEmoji}>{attraction.emoji}</Text>
            </View>

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{attraction.category}</Text>
            </View>

            <Text style={styles.cardName}>{attraction.name}</Text>
            <Text style={styles.cardDesc}>{attraction.description}</Text>

            <View style={styles.statsRow}>
              <StatPill icon="activity" value={`${attraction.seniorScore}/10`} label="Senior Score" highlight />
              <StatPill icon="clock" value={`${attraction.walkingMinutes}m`} label="Walk" />
              <StatPill icon="map-pin" value={attraction.steps.toLocaleString()} label="Steps" />
            </View>
          </View>

          <View style={styles.cardHint}>
            <Feather name="arrow-left" size={14} color="rgba(255,255,255,0.25)" />
            <Text style={styles.cardHintText}>skip · swipe · love</Text>
            <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.25)" />
          </View>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
}

function StatPill({ icon, value, label, highlight }: {
  icon: string; value: string; label: string; highlight?: boolean;
}) {
  return (
    <View style={[pillStyles.pill, highlight && pillStyles.pillHL]}>
      <Feather name={icon as any} size={11} color={highlight ? Colors.light.accent : "rgba(255,255,255,0.6)"} />
      <Text style={[pillStyles.val, highlight && pillStyles.valHL]}>{value}</Text>
      <Text style={pillStyles.lbl}>{label}</Text>
    </View>
  );
}

function ResultScreen({
  liked, city, country, onPlan, onSkipRestaurants, onBack, topPadding, bottomPadding,
}: {
  liked: Attraction[]; city: string; country: string;
  onPlan: () => void; onSkipRestaurants: () => void; onBack: () => void;
  topPadding: number; bottomPadding: number;
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
            {liked.length === 0 ? "🌍" : liked.length < 3 ? "✈️" : "❤️"}
          </Text>
          <Text style={resultStyles.title}>
            {liked.length === 0
              ? "Ready to explore"
              : `${liked.length} spot${liked.length !== 1 ? "s" : ""} you'll love`}
          </Text>
          <Text style={resultStyles.subtitle}>
            {liked.length === 0
              ? `We'll create a great itinerary for ${city} based on your profile.`
              : `These will be woven into your ${city} itinerary by the AI.`}
          </Text>
        </View>

        {liked.length > 0 && (
          <View style={resultStyles.likedList}>
            {liked.map((attr) => (
              <View key={attr.id} style={resultStyles.likedRow}>
                <LinearGradient
                  colors={attr.gradient}
                  style={resultStyles.likedSwatch}
                >
                  <Text style={resultStyles.likedEmoji}>{attr.emoji}</Text>
                </LinearGradient>
                <View style={resultStyles.likedInfo}>
                  <Text style={resultStyles.likedName} numberOfLines={1}>{attr.name}</Text>
                  <Text style={resultStyles.likedCat}>{attr.category}</Text>
                </View>
                <Feather name="heart" size={14} color="#FF6B9D" />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={onPlan} activeOpacity={0.9} style={resultStyles.planBtn}>
          <LinearGradient
            colors={["#C4622D", "#8B3A1A"]}
            style={resultStyles.planBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={resultStyles.planBtnEmoji}>🍽️</Text>
            <View style={{ flex: 1 }}>
              <Text style={resultStyles.planBtnText}>Next: Pick Restaurants</Text>
              <Text style={resultStyles.planBtnSub}>Swipe to choose lunch & dinner spots</Text>
            </View>
            <Feather name="arrow-right" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSkipRestaurants} activeOpacity={0.8} style={resultStyles.skipRestBtn}>
          <Feather name="skip-forward" size={15} color={Colors.light.primary} />
          <Text style={resultStyles.skipRestText}>Skip restaurants — go straight to planning</Text>
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
  errorBackBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
  errorBackText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  headerCity: {
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
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 24,
    marginBottom: 14,
    width: "100%",
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressDotActive: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  progressDotDone: {
    backgroundColor: "#FF6B9D",
  },
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
  behindEmoji: {
    fontSize: 56,
    opacity: 0.3,
  },
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
    padding: 24,
    justifyContent: "flex-end",
    gap: 0,
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
  cardBody: {
    gap: 10,
  },
  emojiBox: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  cardEmoji: { fontSize: 34 },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.9)",
  },
  cardName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 30,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
    marginTop: 2,
  },
  cardHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  cardHintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 0.8,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 16,
    gap: 24,
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
  orSwipeText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.6,
  },
});

const pillStyles = StyleSheet.create({
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
  val: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  valHL: { color: Colors.light.accent },
  lbl: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
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
  likedInfo: { flex: 1, gap: 2 },
  likedName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  likedCat: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
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
  planBtnEmoji: {
    fontSize: 22,
  },
  planBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  planBtnSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  skipRestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "rgba(26,107,74,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(26,107,74,0.25)",
  },
  skipRestText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
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
