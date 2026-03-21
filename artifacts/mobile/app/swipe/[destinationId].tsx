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
  withTiming,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = SCREEN_W - 48;
const CARD_H = SCREEN_H * 0.65;
const SWIPE_THRESHOLD = SCREEN_W * 0.3;

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
  const [rejected, setRejected] = useState<Attraction[]>([]);
  const [finished, setFinished] = useState(false);

  const { data: attractions = [], isLoading } = useQuery({
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
        setRejected((prev) => [...prev, attraction]);
      }

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (nextIndex >= attractions.length) {
        setFinished(true);
      }
    },
    [currentIndex, attractions.length]
  );

  const handlePlanTrip = () => {
    const likedNames = liked.map((a) => a.name);
    router.push({
      pathname: "/itinerary/generate",
      params: {
        city: city || "",
        country: country || "",
        likedAttractions: likedNames.join(","),
      },
    });
  };

  const handleBack = () => router.back();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingText}>Finding top spots in {city}…</Text>
      </View>
    );
  }

  if (finished || attractions.length === 0) {
    return <ResultScreen liked={liked} city={city || ""} country={country || ""} onPlan={handlePlanTrip} onBack={handleBack} insets={insets} />;
  }

  const currentCard = attractions[currentIndex];
  const nextCard = attractions[currentIndex + 1];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0D1117", "#1A2332"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerCity}>{city}</Text>
          <Text style={styles.headerSub}>
            {currentIndex + 1} of {attractions.length}
          </Text>
        </View>

        <View style={styles.likeCounter}>
          <Feather name="heart" size={14} color="#FF6B9D" />
          <Text style={styles.likeCount}>{liked.length}</Text>
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
          <View style={[styles.cardShadow, { zIndex: 1 }]}>
            <View style={[styles.cardBehind]}>
              <LinearGradient
                colors={nextCard.gradient as [string, string]}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardContentBehind}>
                  <Text style={styles.cardEmojiBehind}>{nextCard.emoji}</Text>
                </View>
              </LinearGradient>
            </View>
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

        <View style={styles.centerHint}>
          <Text style={styles.swipeHintText}>swipe or tap</Text>
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

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx: any) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY * 0.3;
    },
    onEnd: (event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_W * 1.5, { damping: 15 });
        translateY.value = withSpring(50);
        runOnJS(onLike)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_W * 1.5, { damping: 15 });
        translateY.value = withSpring(50);
        runOnJS(onReject)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W / 2, 0, SCREEN_W / 2],
      [-15, 0, 15]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], "clamp"),
  }));

  const rejectOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], "clamp"),
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient
          colors={attraction.gradient as [string, string]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={[styles.likeOverlay, likeOverlayStyle]}>
            <View style={styles.likeStamp}>
              <Feather name="heart" size={28} color="#FF6B9D" />
              <Text style={styles.likeStampText}>LOVE IT</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.rejectOverlay, rejectOverlayStyle]}>
            <View style={styles.rejectStamp}>
              <Feather name="x" size={28} color="#FF6B6B" />
              <Text style={styles.rejectStampText}>SKIP</Text>
            </View>
          </Animated.View>

          <View style={styles.cardContent}>
            <View style={styles.emojiContainer}>
              <Text style={styles.cardEmoji}>{attraction.emoji}</Text>
            </View>

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{attraction.category}</Text>
            </View>

            <Text style={styles.cardName}>{attraction.name}</Text>
            <Text style={styles.cardDesc}>{attraction.description}</Text>

            <View style={styles.cardStats}>
              <StatPill icon="activity" value={`${attraction.seniorScore}/10`} label="Senior Score" highlight />
              <StatPill icon="clock" value={`${attraction.walkingMinutes} min`} label="Walking" />
              <StatPill icon="map-pin" value={`${attraction.steps.toLocaleString()}`} label="Steps" />
            </View>
          </View>

          <View style={styles.cardSwipeHint}>
            <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.3)" />
            <Text style={styles.cardSwipeHintText}>skip · swipe · love</Text>
            <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.3)" />
          </View>
        </LinearGradient>
      </Animated.View>
    </PanGestureHandler>
  );
}

function StatPill({
  icon,
  value,
  label,
  highlight,
}: {
  icon: string;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={[statStyles.pill, highlight && statStyles.pillHighlight]}>
      <Feather name={icon as any} size={11} color={highlight ? Colors.light.accent : "rgba(255,255,255,0.7)"} />
      <Text style={[statStyles.value, highlight && statStyles.valueHighlight]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function ResultScreen({
  liked,
  city,
  country,
  onPlan,
  onBack,
  insets,
}: {
  liked: Attraction[];
  city: string;
  country: string;
  onPlan: () => void;
  onBack: () => void;
  insets: { top: number; bottom: number };
}) {
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0);

  return (
    <View style={resultStyles.container}>
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
        <TouchableOpacity onPress={onBack} style={resultStyles.backBtn}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={resultStyles.heroSection}>
          <Text style={resultStyles.bigEmoji}>
            {liked.length === 0 ? "🌍" : liked.length < 3 ? "✈️" : "❤️"}
          </Text>
          <Text style={resultStyles.title}>
            {liked.length === 0
              ? "Let's explore together"
              : `${liked.length} spot${liked.length !== 1 ? "s" : ""} you'll love`}
          </Text>
          <Text style={resultStyles.subtitle}>
            {liked.length === 0
              ? `We'll create a great itinerary for ${city} based on your preferences.`
              : `These places will be woven into your ${city} itinerary by the AI.`}
          </Text>
        </View>

        {liked.length > 0 && (
          <View style={resultStyles.likedSection}>
            <Text style={resultStyles.sectionTitle}>You loved these</Text>
            <View style={resultStyles.likedGrid}>
              {liked.map((attr) => (
                <View key={attr.id} style={resultStyles.likedCard}>
                  <LinearGradient
                    colors={attr.gradient as [string, string]}
                    style={resultStyles.likedCardGradient}
                  >
                    <Text style={resultStyles.likedEmoji}>{attr.emoji}</Text>
                  </LinearGradient>
                  <View style={resultStyles.likedInfo}>
                    <Text style={resultStyles.likedName} numberOfLines={1}>
                      {attr.name}
                    </Text>
                    <Text style={resultStyles.likedCategory}>{attr.category}</Text>
                  </View>
                  <Feather name="heart" size={14} color="#FF6B9D" />
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={onPlan}
          activeOpacity={0.9}
          style={resultStyles.planBtn}
        >
          <LinearGradient
            colors={[Colors.light.accent, "#C87C2A"]}
            style={resultStyles.planBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Feather name="calendar" size={20} color="#fff" />
            <Text style={resultStyles.planBtnText}>Plan My Trip to {city}</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={resultStyles.skipBtn}>
          <Text style={resultStyles.skipText}>Go back to destinations</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
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
    color: "rgba(255,255,255,0.5)",
  },
  likeCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,107,157,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,107,157,0.3)",
  },
  likeCount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FF6B9D",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  progressDotActive: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  progressDotDone: {
    backgroundColor: "#FF6B9D",
  },
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardShadow: {
    position: "absolute",
  },
  cardBehind: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: "hidden",
    transform: [{ scale: 0.94 }, { translateY: 16 }],
    opacity: 0.5,
  },
  cardContentBehind: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardEmojiBehind: {
    fontSize: 60,
    opacity: 0.3,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: "hidden",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
    }),
  },
  cardGradient: {
    flex: 1,
    padding: 28,
    justifyContent: "flex-end",
  },
  likeOverlay: {
    position: "absolute",
    top: 36,
    left: 28,
    zIndex: 20,
  },
  likeStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 3,
    borderColor: "#FF6B9D",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "-12deg" }],
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  likeStampText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FF6B9D",
    letterSpacing: 2,
  },
  rejectOverlay: {
    position: "absolute",
    top: 36,
    right: 28,
    zIndex: 20,
  },
  rejectStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 3,
    borderColor: "#FF6B6B",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "12deg" }],
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  rejectStampText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FF6B6B",
    letterSpacing: 2,
  },
  cardContent: {
    gap: 12,
  },
  emojiContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardEmoji: {
    fontSize: 38,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.9)",
  },
  cardName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 32,
  },
  cardDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
  },
  cardStats: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  cardSwipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  cardSwipeHintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 20,
    gap: 20,
  },
  rejectBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,107,107,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,107,107,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,107,157,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,107,157,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerHint: {
    flex: 1,
    alignItems: "center",
  },
  swipeHintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

const statStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillHighlight: {
    backgroundColor: "rgba(232,169,81,0.2)",
    borderWidth: 1,
    borderColor: "rgba(232,169,81,0.4)",
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  valueHighlight: {
    color: Colors.light.accent,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
});

const resultStyles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
  },
  bigEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  likedSection: { gap: 12 },
  likedGrid: { gap: 10 },
  likedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,157,0.2)",
  },
  likedCardGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  likedEmoji: { fontSize: 22 },
  likedInfo: { flex: 1, gap: 2 },
  likedName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  likedCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  planBtn: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 8 },
      web: { shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
    }),
  },
  planBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  planBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
  },
});
