import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useDeviceId } from "@/hooks/useDeviceId";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

export type Spark = {
  id: number;
  author_name: string;
  image_data: string | null;
  caption: string;
  location_name: string;
  location_type: "spot" | "restaurant";
  destination_city: string;
  destination_country: string;
  likes_count: number;
  liked_by_me: boolean;
  created_at: string;
};

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const SPOT_GRADIENTS: [string, string][] = [
  ["#1A2B4A", "#0D3B2E"],
  ["#2D1B4E", "#1A3A5C"],
  ["#0D2B1A", "#1A4B3C"],
  ["#1B0D4E", "#2D1A6B"],
];

export const FOOD_GRADIENTS: [string, string][] = [
  ["#4A1A0D", "#2B0D00"],
  ["#4E2D0D", "#3B1A00"],
  ["#3B1A1A", "#5C2D2D"],
  ["#4A2D0D", "#2B1A00"],
];

export const SPOT_EMOJIS = ["🏛️", "🗼", "⛪", "🌉", "🏰", "🗽", "🎭", "🌄"];
export const FOOD_EMOJIS = ["🍝", "🥂", "🍜", "🥘", "🍷", "🧆", "🥗", "🍣"];

const AUTHOR_COLORS = [
  Colors.light.primary,
  "#C4622D",
  "#6B4EE6",
  "#1A7A8A",
  "#8A3A6B",
  "#4A8A3A",
];

export function authorColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length];
}

export function SparkCard({
  spark,
  index,
  onLike,
  onAuthorPress,
}: {
  spark: Spark;
  index: number;
  onLike: (id: number) => void;
  onAuthorPress?: (name: string) => void;
}) {
  const { width } = useWindowDimensions();
  const isFood = spark.location_type === "restaurant";
  const gradients = isFood ? FOOD_GRADIENTS : SPOT_GRADIENTS;
  const emojis = isFood ? FOOD_EMOJIS : SPOT_EMOJIS;
  const gradient = gradients[index % gradients.length];
  const emoji = emojis[index % emojis.length];
  const cardWidth = Math.min(width - 32, 420);
  const avatarColor = authorColor(spark.author_name);

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {spark.image_data ? (
        <Image source={{ uri: spark.image_data }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <LinearGradient colors={gradient} style={styles.cardImage}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
        </LinearGradient>
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.cardOverlay}
      />

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, isFood ? styles.typeBadgeFood : styles.typeBadgeSpot]}>
            <Text style={styles.typeBadgeIcon}>{isFood ? "🍽️" : "📍"}</Text>
            <Text style={styles.typeBadgeText}>{isFood ? "Restaurant" : "Spot"}</Text>
          </View>
          <View style={styles.cityBadge}>
            <Text style={styles.cityBadgeText}>{spark.destination_city}</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.locationName} numberOfLines={1}>{spark.location_name}</Text>
          <Text style={styles.destinationText}>{spark.destination_city} · {spark.destination_country}</Text>
          {!!spark.caption && (
            <Text style={styles.captionText} numberOfLines={2}>{spark.caption}</Text>
          )}

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => onAuthorPress?.(spark.author_name)}
              activeOpacity={0.75}
            >
              <View style={[styles.authorAvatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.authorAvatarText}>
                  {spark.author_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.authorName}>{spark.author_name}</Text>
                <Text style={styles.timeAgo}>{timeAgo(spark.created_at)}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onLike(spark.id)}
              style={[styles.likeBtn, spark.liked_by_me && styles.likeBtnActive]}
              activeOpacity={0.75}
            >
              <Feather name="heart" size={18} color={spark.liked_by_me ? "#FF4B6E" : "rgba(255,255,255,0.85)"} />
              <Text style={[styles.likeCount, spark.liked_by_me && styles.likeCountActive]}>
                {spark.likes_count}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function CityFilterBar({
  cities,
  selected,
  onSelect,
}: {
  cities: string[];
  selected: string;
  onSelect: (city: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
      style={styles.filterBarScroll}
    >
      {["All", ...cities].map((city) => {
        const active = selected === city;
        return (
          <TouchableOpacity
            key={city}
            onPress={() => onSelect(city)}
            activeOpacity={0.75}
            style={[styles.filterPill, active && styles.filterPillActive]}
          >
            {active && city !== "All" && (
              <Text style={styles.filterPillEmoji}>📍</Text>
            )}
            {city === "All" && active && (
              <Text style={styles.filterPillEmoji}>⚡</Text>
            )}
            <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
              {city}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function SparksScreen() {
  const insets = useSafeAreaInsets();
  const deviceId = useDeviceId();
  const queryClient = useQueryClient();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom;

  const [selectedCity, setSelectedCity] = useState("All");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["sparks", deviceId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/sparks?deviceId=${encodeURIComponent(deviceId)}`);
      if (!res.ok) throw new Error("Failed to fetch sparks");
      return res.json() as Promise<{ sparks: Spark[] }>;
    },
    enabled: !!deviceId,
  });

  const allSparks = data?.sparks ?? [];

  const cities = useMemo(() => {
    const seen = new Set<string>();
    return allSparks
      .map((s) => s.destination_city)
      .filter((c) => { if (seen.has(c)) return false; seen.add(c); return true; });
  }, [allSparks]);

  const visibleSparks = useMemo(() =>
    selectedCity === "All" ? allSparks : allSparks.filter((s) => s.destination_city === selectedCity),
    [allSparks, selectedCity]
  );

  const likeMutation = useMutation({
    mutationFn: async (sparkId: number) => {
      const res = await fetch(`${BASE_URL}/api/sparks/${sparkId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) throw new Error("Like failed");
      return res.json() as Promise<{ likesCount: number; likedByMe: boolean }>;
    },
    onMutate: async (sparkId) => {
      await queryClient.cancelQueries({ queryKey: ["sparks", deviceId] });
      const prev = queryClient.getQueryData<{ sparks: Spark[] }>(["sparks", deviceId]);
      queryClient.setQueryData<{ sparks: Spark[] }>(["sparks", deviceId], (old) => {
        if (!old) return old;
        return {
          sparks: old.sparks.map((s) =>
            s.id === sparkId
              ? { ...s, liked_by_me: !s.liked_by_me, likes_count: s.likes_count + (s.liked_by_me ? -1 : 1) }
              : s
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["sparks", deviceId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sparks", deviceId] });
    },
  });

  const handleAuthorPress = (authorName: string) => {
    router.push({
      pathname: "/sparks/user/[authorName]",
      params: { authorName },
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View>
          <Text style={styles.headerTitle}>Sparks ⚡</Text>
          <Text style={styles.headerSub}>
            {selectedCity === "All"
              ? "Travel moments from fellow seniors"
              : `Moments from ${selectedCity}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/sparks/upload")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.light.primary, "#0D4A33"]}
            style={styles.addBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {cities.length > 0 && (
        <CityFilterBar cities={cities} selected={selectedCity} onSelect={(c) => { setSelectedCity(c); }} />
      )}

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.light.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading sparks…</Text>
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Feather name="wifi-off" size={40} color="rgba(255,255,255,0.3)" />
            <Text style={styles.errorText}>Couldn't load sparks</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : visibleSparks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{selectedCity === "All" ? "⚡" : "📍"}</Text>
            <Text style={styles.emptyTitle}>
              {selectedCity === "All" ? "No sparks yet" : `No sparks from ${selectedCity}`}
            </Text>
            <Text style={styles.emptyText}>
              {selectedCity === "All"
                ? "Be the first to share a travel moment!"
                : "Be the first to share a moment from this destination!"}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/sparks/upload")}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[Colors.light.primary, "#0D4A33"]} style={styles.emptyBtnGradient}>
                <Feather name="camera" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Share a Spark</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          visibleSparks.map((spark, i) => (
            <SparkCard
              key={spark.id}
              spark={spark}
              index={i}
              onLike={(id) => deviceId && likeMutation.mutate(id)}
              onAuthorPress={handleAuthorPress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  addBtn: { borderRadius: 22, overflow: "hidden" },
  addBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBarScroll: {
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  filterPillActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterPillEmoji: {
    fontSize: 13,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.55)",
  },
  filterPillTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 16,
    alignItems: "center",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    aspectRatio: 4 / 5,
    position: "relative",
    backgroundColor: "#1A1A1A",
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  cardEmoji: { fontSize: 72, opacity: 0.6 },
  cardOverlay: { ...StyleSheet.absoluteFillObject },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeBadgeSpot: {
    backgroundColor: "rgba(26,107,74,0.55)",
    borderColor: "rgba(26,107,74,0.8)",
  },
  typeBadgeFood: {
    backgroundColor: "rgba(196,98,45,0.55)",
    borderColor: "rgba(196,98,45,0.8)",
  },
  typeBadgeIcon: { fontSize: 13 },
  typeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  cityBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  cardBottom: { gap: 6 },
  locationName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  destinationText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.65)",
  },
  captionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  authorAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  authorName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  timeAgo: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  likeBtnActive: {
    backgroundColor: "rgba(255,75,110,0.2)",
    borderColor: "rgba(255,75,110,0.5)",
  },
  likeCount: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  likeCountActive: { color: "#FF4B6E" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  retryText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 60, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    maxWidth: 260,
  },
  emptyBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  emptyBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
