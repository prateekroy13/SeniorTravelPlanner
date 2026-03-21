import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useDeviceId } from "@/hooks/useDeviceId";
import {
  type Spark,
  authorColor,
  SPOT_GRADIENTS,
  FOOD_GRADIENTS,
  SPOT_EMOJIS,
  FOOD_EMOJIS,
  timeAgo,
} from "@/app/(tabs)/sparks";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

function MiniSparkCard({ spark, index, onLike }: { spark: Spark; index: number; onLike: (id: number) => void }) {
  const isFood = spark.location_type === "restaurant";
  const gradients = isFood ? FOOD_GRADIENTS : SPOT_GRADIENTS;
  const emojis = isFood ? FOOD_EMOJIS : SPOT_EMOJIS;
  const gradient = gradients[index % gradients.length];
  const emoji = emojis[index % emojis.length];

  return (
    <View style={miniStyles.card}>
      {spark.image_data ? (
        <Image source={{ uri: spark.image_data }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill}>
          <View style={miniStyles.emojiWrap}>
            <Text style={miniStyles.emoji}>{emoji}</Text>
          </View>
        </LinearGradient>
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.88)"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={miniStyles.overlay}>
        <View style={[miniStyles.typeDot, isFood ? miniStyles.typeDotFood : miniStyles.typeDotSpot]} />
        <Text style={miniStyles.locationName} numberOfLines={2}>{spark.location_name}</Text>
        <Text style={miniStyles.cityText}>{spark.destination_city}</Text>

        <TouchableOpacity
          onPress={() => onLike(spark.id)}
          style={[miniStyles.likeRow, spark.liked_by_me && miniStyles.likeRowActive]}
          activeOpacity={0.75}
        >
          <Feather name="heart" size={13} color={spark.liked_by_me ? "#FF4B6E" : "rgba(255,255,255,0.7)"} />
          <Text style={[miniStyles.likeCount, spark.liked_by_me && miniStyles.likeCountActive]}>
            {spark.likes_count}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { authorName } = useLocalSearchParams<{ authorName: string }>();
  const deviceId = useDeviceId();
  const queryClient = useQueryClient();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const avatarColor = authorName ? authorColor(authorName) : Colors.light.primary;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sparks-user", authorName, deviceId],
    queryFn: async () => {
      const res = await fetch(
        `${BASE_URL}/api/sparks/user/${encodeURIComponent(authorName ?? "")}?deviceId=${encodeURIComponent(deviceId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ sparks: Spark[]; authorName: string; totalLikes: number }>;
    },
    enabled: !!authorName && !!deviceId,
  });

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
      await queryClient.cancelQueries({ queryKey: ["sparks-user", authorName, deviceId] });
      const prev = queryClient.getQueryData<{ sparks: Spark[]; authorName: string; totalLikes: number }>(
        ["sparks-user", authorName, deviceId]
      );
      queryClient.setQueryData<{ sparks: Spark[]; authorName: string; totalLikes: number }>(
        ["sparks-user", authorName, deviceId],
        (old) => {
          if (!old) return old;
          const updated = old.sparks.map((s) =>
            s.id === sparkId
              ? { ...s, liked_by_me: !s.liked_by_me, likes_count: s.likes_count + (s.liked_by_me ? -1 : 1) }
              : s
          );
          return { ...old, sparks: updated, totalLikes: updated.reduce((sum, s) => sum + s.likes_count, 0) };
        }
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["sparks-user", authorName, deviceId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sparks-user", authorName, deviceId] });
      queryClient.invalidateQueries({ queryKey: ["sparks"] });
    },
  });

  const sparks = data?.sparks ?? [];
  const totalLikes = data?.totalLikes ?? 0;

  const cardSize = (Math.min(width, 500) - 48) / 2;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/sparks");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Traveler</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      >
        <View style={styles.profileSection}>
          <View style={[styles.bigAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.bigAvatarText}>
              {authorName?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.profileName}>{authorName}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{sparks.length}</Text>
              <Text style={styles.statLabel}>Sparks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalLikes}</Text>
              <Text style={styles.statLabel}>Total ❤️</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {new Set(sparks.map((s) => s.destination_city)).size}
              </Text>
              <Text style={styles.statLabel}>Cities</Text>
            </View>
          </View>

          {sparks.length > 0 && (
            <View style={styles.citiesRow}>
              {[...new Set(sparks.map((s) => s.destination_city))].map((city) => (
                <View key={city} style={styles.cityChip}>
                  <Text style={styles.cityChipText}>📍 {city}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Feather name="wifi-off" size={36} color="rgba(255,255,255,0.3)" />
            <Text style={styles.errorText}>Couldn't load moments</Text>
          </View>
        ) : sparks.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyText}>No sparks shared yet</Text>
          </View>
        ) : (
          <>
            <Text style={styles.gridTitle}>All Moments</Text>
            <View style={styles.grid}>
              {sparks.map((spark, i) => (
                <View key={spark.id} style={{ width: cardSize, height: cardSize * 1.3 }}>
                  <MiniSparkCard
                    spark={spark}
                    index={i}
                    onLike={(id) => deviceId && likeMutation.mutate(id)}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
  content: { paddingHorizontal: 16 },
  profileSection: { alignItems: "center", paddingTop: 32, paddingBottom: 24, gap: 12 },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bigAvatarText: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  profileName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNumber: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 8,
  },
  citiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cityChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.65)",
  },
  gridTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  centered: { paddingTop: 60, alignItems: "center", gap: 12 },
  errorText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" },
  emptyWrap: { paddingTop: 60, alignItems: "center", gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)" },
});

const miniStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    height: "100%",
  },
  emojiWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 44, opacity: 0.55 },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 3,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  typeDotSpot: { backgroundColor: Colors.light.primary },
  typeDotFood: { backgroundColor: "#C4622D" },
  locationName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 17,
  },
  cityText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  likeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  likeRowActive: {},
  likeCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  likeCountActive: { color: "#FF4B6E" },
});
