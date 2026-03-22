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
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { DestinationCard } from "@/components/DestinationCard";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchDestinations() {
  const res = await fetch(`${BASE_URL}/api/destinations`);
  if (!res.ok) throw new Error("Failed to fetch destinations");
  return res.json();
}

async function searchDestinations(query: string) {
  const res = await fetch(`${BASE_URL}/api/destinations/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { preferences } = usePreferences();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const {
    data: destinations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["destinations"],
    queryFn: fetchDestinations,
  });

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      setIsSearching(true);
      try {
        const results = await searchDestinations(text);
        setSearchResults(results);
      } catch (e) {
        console.warn("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const displayedDestinations = searchQuery.length > 1 ? searchResults : destinations;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const paceLabels: Record<string, string> = {
    easy: "Easy Explorer",
    moderate: "Comfortable Traveler",
    active: "Active Adventurer",
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 100, 120) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.light.primary} />
        }
      >
        <LinearGradient
          colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
          style={[styles.heroGradient, { paddingTop: topPadding + 16 }]}
        >
          <View style={styles.heroContent}>
            <View style={styles.greetingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>
                  {user?.name ? `Good day, ${user.name.split(" ")[0]}` : "Good day"}
                </Text>
                <Text style={styles.heroTitle}>Where would{"\n"}you like to go?</Text>
                <View style={styles.paceChip}>
                  <Feather name="sun" size={12} color={Colors.light.primary} />
                  <Text style={styles.paceLabel}>{paceLabels[preferences.pace]}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/profile")}
                activeOpacity={0.8}
                style={styles.avatarBtn}
              >
                <UserAvatar user={user} size={46} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color={Colors.light.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search destinations..."
                placeholderTextColor={Colors.light.textTertiary}
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
              />
              {isSearching && (
                <ActivityIndicator size="small" color={Colors.light.primary} style={styles.searchSpinner} />
              )}
              {searchQuery.length > 0 && !isSearching && (
                <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
                  <Feather name="x" size={16} color={Colors.light.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <TouchableOpacity
            onPress={() => router.push("/itinerary/generate")}
            activeOpacity={0.9}
            style={styles.generateBanner}
          >
            <LinearGradient
              colors={[Colors.light.accent, "#C87C2A"]}
              style={styles.generateGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View>
                <Text style={styles.generateTitle}>Create Your Itinerary</Text>
                <Text style={styles.generateSubtitle}>
                  AI-powered, senior-first travel planning
                </Text>
              </View>
              <View style={styles.generateArrow}>
                <Feather name="arrow-right" size={20} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {searchQuery.length > 1 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {searchResults.length > 0
                  ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`
                  : "No results found"}
              </Text>
              {searchResults.map((dest) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  variant="horizontal"
                  onPress={(d) =>
                    router.push({
                      pathname: "/swipe/[destinationId]",
                      params: { destinationId: d.id, city: d.city, country: d.country },
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Senior-Friendly Destinations</Text>
                  <Text style={styles.sectionSub}>Tap a city to discover & swipe top spots</Text>
                </View>

                {isLoading ? (
                  <View style={styles.loadingRow}>
                    {[1, 2, 3].map((i) => (
                      <View key={i} style={styles.skeletonCard} />
                    ))}
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {destinations.map((dest: any) => (
                      <DestinationCard
                        key={dest.id}
                        destination={dest}
                        onPress={(d) =>
                          router.push({
                            pathname: "/swipe/[destinationId]",
                            params: { destinationId: d.id, city: d.city, country: d.country },
                          })
                        }
                      />
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Picks</Text>
                <View style={styles.topPicksGrid}>
                  {destinations.slice(0, 4).map((dest: any) => (
                    <TouchableOpacity
                      key={dest.id}
                      onPress={() =>
                        router.push({
                          pathname: "/swipe/[destinationId]",
                          params: { destinationId: dest.id, city: dest.city, country: dest.country },
                        })
                      }
                      activeOpacity={0.88}
                      style={styles.topPickCard}
                    >
                      <LinearGradient
                        colors={["#1A6B4A", "#0D4A32"]}
                        style={styles.topPickGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Feather name="map-pin" size={14} color="rgba(255,255,255,0.7)" />
                      </LinearGradient>
                      <View style={styles.topPickContent}>
                        <Text style={styles.topPickCity}>{dest.city}</Text>
                        <Text style={styles.topPickCountry}>{dest.country}</Text>
                        <View style={styles.scoreRow}>
                          <Feather name="star" size={10} color={Colors.light.accent} />
                          <Text style={styles.scoreLabel}>{dest.seniorFriendlyScore}/10</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.tipsSection]}>
                <Text style={styles.sectionTitle}>Senior Travel Tips</Text>
                <TipCard
                  icon="shield"
                  title="Travel Insurance"
                  desc="Always carry comprehensive travel insurance with medical evacuation coverage."
                />
                <TipCard
                  icon="sun"
                  title="Avoid Midday Heat"
                  desc="Plan major sightseeing for morning (9–11am) and late afternoon (4–6pm)."
                />
                <TipCard
                  icon="map"
                  title="Download Offline Maps"
                  desc="Save your destination maps offline before departing for easier navigation."
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TipCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={tipStyles.card}>
      <View style={tipStyles.icon}>
        <Feather name={icon as any} size={16} color={Colors.light.primary} />
      </View>
      <View style={tipStyles.content}>
        <Text style={tipStyles.title}>{title}</Text>
        <Text style={tipStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  heroGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroContent: { gap: 16 },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  avatarBtn: {
    flexShrink: 0,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 36,
  },
  paceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  paceLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 14 : 0,
    height: Platform.OS === "web" ? undefined : 50,
    gap: 10,
  },
  searchIcon: { marginRight: -4 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    height: 50,
  },
  searchSpinner: { marginLeft: 4 },
  body: {
    paddingHorizontal: 20,
    gap: 24,
    paddingTop: 20,
  },
  generateBanner: {
    borderRadius: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      web: {
        shadowColor: Colors.light.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
    }),
  },
  generateGradient: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  generateTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  generateSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  generateArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: 12 },
  sectionHeader: { gap: 4 },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  horizontalScroll: {
    paddingRight: 20,
    gap: 12,
  },
  loadingRow: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonCard: {
    width: 200,
    height: 220,
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 18,
  },
  topPicksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topPickCard: {
    width: "47%",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  topPickGradient: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  topPickContent: {
    padding: 10,
    gap: 2,
  },
  topPickCity: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  topPickCountry: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  tipsSection: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 16,
  },
});

const tipStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 2 },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});
