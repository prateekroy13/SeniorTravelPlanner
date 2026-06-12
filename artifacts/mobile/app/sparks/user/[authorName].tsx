import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useDeviceId } from "@/hooks/useDeviceId";
import { type Spark, authorColor, SparkCard } from "@/app/(tabs)/sparks";
import { API_BASE_URL as BASE_URL } from "@/constants/api";

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { authorName } = useLocalSearchParams<{ authorName: string }>();
  const deviceId = useDeviceId();
  const queryClient = useQueryClient();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const avatarColor = authorName ? authorColor(authorName) : Colors.light.primary;
  const cardWidth = Math.min(width - 32, 420);

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
        <Text style={styles.headerTitle} numberOfLines={1}>{authorName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      >
        {/* Profile hero */}
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

        {/* Divider */}
        {sparks.length > 0 && (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionTitle}>All Moments</Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        {/* Feed */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading moments…</Text>
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
          <View style={styles.feed}>
            {sparks.map((spark, i) => (
              <SparkCard
                key={spark.id}
                spark={spark}
                index={i}
                onLike={(id) => deviceId && likeMutation.mutate(id)}
              />
            ))}
          </View>
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
    fontFamily: "Inter_700Bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  content: { paddingHorizontal: 16 },
  profileSection: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
    gap: 12,
  },
  bigAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bigAvatarText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 4,
    width: "100%",
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  feed: {
    gap: 16,
    alignItems: "center",
  },
  centered: { paddingTop: 60, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  errorText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" },
  emptyWrap: { paddingTop: 60, alignItems: "center", gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)" },
});
