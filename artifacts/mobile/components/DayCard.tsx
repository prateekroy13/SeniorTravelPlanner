import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Activity {
  name: string;
  description: string;
  openingHours?: string;
  bestTimeToVisit?: string;
  crowdLevel?: "low" | "medium" | "high";
  duration: string;
  walkingMinutes: number;
  steps: number;
  cost: string;
  tips?: string;
  isRestStop?: boolean;
  travelMinutesToNext?: number;
}

interface Restaurant {
  name: string;
  cuisine: string;
  priceRange: string;
  description: string;
  wheelchairFriendly?: boolean;
  nearbyAttraction?: string;
}

interface TransportOption {
  mode: string;
  description: string;
  estimatedCost: string;
  accessibilityNotes?: string;
}

interface SideTrip {
  name: string;
  description: string;
  distance: string;
  extraSteps: number;
  extraTime: string;
  estimatedCost: string;
}

interface DayPlan {
  dayNumber: number;
  theme: string;
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
  totalSteps: number;
  totalWalkingMinutes: number;
  activeHours: number;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  currency: string;
  restaurants: Restaurant[];
  transportOptions: TransportOption[];
  sideTrips: SideTrip[];
  crowdAvoidanceTip?: string;
  weatherNote?: string;
}

interface DayCardProps {
  day: DayPlan;
  onPress: () => void;
}

export function DayCard({ day, onPress }: DayCardProps) {
  const allActivities = [...day.morning, ...day.afternoon, ...day.evening];
  const preview = allActivities.slice(0, 2);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <View style={styles.dayHeader}>
        <View style={styles.dayNumberBadge}>
          <Text style={styles.dayNumber}>{day.dayNumber}</Text>
        </View>
        <View style={styles.dayInfo}>
          <Text style={styles.dayTheme}>{day.theme}</Text>
          <Text style={styles.daySubtext}>
            {allActivities.length} activities
          </Text>
        </View>
        <View style={styles.costBadge}>
          <Text style={styles.costText}>
            {day.currency}{day.estimatedCostLow}–{day.estimatedCostHigh}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="walk" size={15} color={Colors.light.primary} />
          <Text style={styles.statLabel}>{day.totalSteps.toLocaleString()} steps</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Feather name="clock" size={13} color={Colors.light.primary} />
          <Text style={styles.statLabel}>{day.totalWalkingMinutes} min walk</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="restaurant-outline" size={13} color={Colors.light.primary} />
          <Text style={styles.statLabel}>{day.restaurants.length} dining</Text>
        </View>
      </View>

      {preview.length > 0 && (
        <View style={styles.previewList}>
          {preview.map((act, i) => (
            <View key={i} style={styles.previewItem}>
              <View
                style={[
                  styles.dot,
                  act.isRestStop && { backgroundColor: Colors.light.accent },
                ]}
              />
              <Text style={styles.previewText} numberOfLines={1}>
                {act.name}
              </Text>
              <Text style={styles.previewDuration}>{act.duration}</Text>
            </View>
          ))}
          {allActivities.length > 2 && (
            <Text style={styles.moreText}>
              +{allActivities.length - 2} more stops
            </Text>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.tapToExpand}>Tap to see full day plan</Text>
        <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

interface DayDetailProps {
  day: DayPlan;
}

export function DayDetail({ day }: DayDetailProps) {
  const [activeTab, setActiveTab] = useState<"plan" | "food" | "transport" | "sidetrips">("plan");

  const sections = [
    { key: "morning", label: "Morning", activities: day.morning },
    { key: "afternoon", label: "Afternoon", activities: day.afternoon },
    { key: "evening", label: "Evening", activities: day.evening },
  ] as const;

  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailDay}>Day {day.dayNumber}</Text>
        <Text style={styles.detailTheme}>{day.theme}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {(["plan", "food", "transport", "sidetrips"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === "plan" ? "Daily Plan" : tab === "food" ? "Dining" : tab === "transport" ? "Transport" : "Side Trips"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTab === "plan" && (
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <StatBox icon="walk" label="Total Steps" value={day.totalSteps.toLocaleString()} iconLib="MaterialCommunity" />
            <StatBox icon="clock" label="Walking" value={`${day.totalWalkingMinutes} min`} iconLib="Feather" />
            <StatBox icon="sun" label="Active Hours" value={`${day.activeHours} hrs`} iconLib="Feather" />
            <StatBox icon="credit-card" label="Est. Cost" value={`${day.currency}${day.estimatedCostLow}–${day.estimatedCostHigh}`} iconLib="Feather" />
          </View>

          {day.crowdAvoidanceTip && (
            <View style={styles.tipBox}>
              <Feather name="users" size={14} color={Colors.light.accent} />
              <Text style={styles.tipText}>{day.crowdAvoidanceTip}</Text>
            </View>
          )}

          {sections.map(({ key, label, activities }) =>
            activities.length > 0 ? (
              <View key={key} style={styles.timeBlock}>
                <View style={styles.timeLabel}>
                  <Feather
                    name={key === "morning" ? "sunrise" : key === "afternoon" ? "sun" : "moon"}
                    size={14}
                    color={Colors.light.primary}
                  />
                  <Text style={styles.timeLabelText}>{label}</Text>
                </View>
                {activities.map((act, i) => (
                  <React.Fragment key={i}>
                    <ActivityItem activity={act} />
                    {act.travelMinutesToNext != null && act.travelMinutesToNext > 0 && (
                      <View style={styles.travelConnector}>
                        <View style={styles.travelLine} />
                        <View style={styles.travelBadge}>
                          <Feather name="navigation" size={10} color={Colors.light.primary} />
                          <Text style={styles.travelText}>
                            {act.travelMinutesToNext} min walk to next stop
                          </Text>
                        </View>
                        <View style={styles.travelLine} />
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </View>
            ) : null
          )}
        </View>
      )}

      {activeTab === "food" && (
        <View style={styles.section}>
          {day.restaurants.map((r, i) => (
            <RestaurantItem key={i} restaurant={r} index={i} />
          ))}
        </View>
      )}

      {activeTab === "transport" && (
        <View style={styles.section}>
          {day.transportOptions.map((t, i) => (
            <TransportItem key={i} transport={t} />
          ))}
        </View>
      )}

      {activeTab === "sidetrips" && (
        <View style={styles.section}>
          {day.sideTrips.length > 0 ? (
            day.sideTrips.map((s, i) => <SideTripItem key={i} trip={s} />)
          ) : (
            <Text style={styles.emptyText}>No side trips for this day.</Text>
          )}
        </View>
      )}
    </View>
  );
}

function StatBox({
  icon,
  label,
  value,
  iconLib,
}: {
  icon: string;
  label: string;
  value: string;
  iconLib: "Feather" | "MaterialCommunity";
}) {
  return (
    <View style={styles.statBox}>
      {iconLib === "Feather" ? (
        <Feather name={icon as any} size={18} color={Colors.light.primary} />
      ) : (
        <MaterialCommunityIcons name={icon as any} size={18} color={Colors.light.primary} />
      )}
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

const CROWD_COLORS: Record<string, string> = {
  low: "#2E7D32",
  medium: "#E65100",
  high: "#C62828",
};
const CROWD_LABELS: Record<string, string> = {
  low: "Quiet",
  medium: "Moderate crowds",
  high: "Busy",
};

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <View
      style={[
        styles.activityItem,
        activity.isRestStop && styles.activityItemRest,
      ]}
    >
      <View style={styles.activityLeft}>
        <View
          style={[
            styles.activityDot,
            activity.isRestStop && { backgroundColor: Colors.light.accent },
          ]}
        />
        <View style={styles.activityLine} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityName}>{activity.name}</Text>
          {activity.isRestStop && (
            <View style={styles.restTag}>
              <Text style={styles.restTagText}>Rest</Text>
            </View>
          )}
          {activity.crowdLevel && !activity.isRestStop && (
            <View style={[styles.crowdBadge, { backgroundColor: CROWD_COLORS[activity.crowdLevel] + "22" }]}>
              <View style={[styles.crowdDot, { backgroundColor: CROWD_COLORS[activity.crowdLevel] }]} />
              <Text style={[styles.crowdText, { color: CROWD_COLORS[activity.crowdLevel] }]}>
                {CROWD_LABELS[activity.crowdLevel]}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.activityDesc} numberOfLines={3}>
          {activity.description}
        </Text>

        {activity.openingHours && (
          <View style={styles.infoRow}>
            <Feather name="clock" size={11} color={Colors.light.textTertiary} />
            <Text style={styles.infoRowText}>{activity.openingHours}</Text>
          </View>
        )}
        {activity.bestTimeToVisit && (
          <View style={styles.infoRow}>
            <Feather name="sun" size={11} color={Colors.light.primary} />
            <Text style={[styles.infoRowText, { color: Colors.light.primary }]}>{activity.bestTimeToVisit}</Text>
          </View>
        )}

        <View style={styles.activityMeta}>
          <View style={styles.metaItem}>
            <Feather name="watch" size={11} color={Colors.light.textTertiary} />
            <Text style={styles.metaText}>{activity.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="walk" size={12} color={Colors.light.textTertiary} />
            <Text style={styles.metaText}>{activity.steps.toLocaleString()} steps</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="tag" size={11} color={Colors.light.textTertiary} />
            <Text style={styles.metaText}>{activity.cost}</Text>
          </View>
        </View>
        {activity.tips && (
          <View style={styles.tipInline}>
            <Feather name="info" size={11} color={Colors.light.primary} />
            <Text style={styles.tipInlineText}>{activity.tips}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function RestaurantItem({ restaurant, index }: { restaurant: Restaurant; index: number }) {
  const labels = ["Lunch", "Dinner", "Snack"];
  return (
    <View style={styles.restaurantItem}>
      <View style={styles.restaurantHeader}>
        <View style={styles.mealBadge}>
          <Text style={styles.mealBadgeText}>{labels[index] || `Option ${index + 1}`}</Text>
        </View>
        {restaurant.wheelchairFriendly && (
          <View style={styles.accessBadge}>
            <MaterialCommunityIcons name="wheelchair-accessibility" size={12} color={Colors.light.primary} />
            <Text style={styles.accessText}>Accessible</Text>
          </View>
        )}
      </View>
      <Text style={styles.restaurantName}>{restaurant.name}</Text>
      <View style={styles.restaurantRow}>
        <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
        <Text style={styles.restaurantPrice}>{restaurant.priceRange}</Text>
      </View>
      <Text style={styles.restaurantDesc} numberOfLines={2}>
        {restaurant.description}
      </Text>
      {restaurant.nearbyAttraction && (
        <View style={styles.nearbyRow}>
          <Feather name="map-pin" size={11} color={Colors.light.textTertiary} />
          <Text style={styles.nearbyText}>Near {restaurant.nearbyAttraction}</Text>
        </View>
      )}
    </View>
  );
}

function TransportItem({ transport }: { transport: TransportOption }) {
  const icons: Record<string, string> = {
    Metro: "train",
    Bus: "bus",
    Taxi: "car",
    Tram: "train",
    Walk: "map-pin",
    Ferry: "anchor",
    "Ride-hail": "smartphone",
  };
  const iconName = icons[transport.mode] || "navigation";

  return (
    <View style={styles.transportItem}>
      <View style={styles.transportIcon}>
        <Feather name={iconName as any} size={18} color={Colors.light.primary} />
      </View>
      <View style={styles.transportContent}>
        <View style={styles.transportHeader}>
          <Text style={styles.transportMode}>{transport.mode}</Text>
          <Text style={styles.transportCost}>{transport.estimatedCost}</Text>
        </View>
        <Text style={styles.transportDesc}>{transport.description}</Text>
        {transport.accessibilityNotes && (
          <View style={styles.accessNoteRow}>
            <MaterialCommunityIcons name="wheelchair-accessibility" size={12} color={Colors.light.primary} />
            <Text style={styles.accessNoteText}>{transport.accessibilityNotes}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SideTripItem({ trip }: { trip: SideTrip }) {
  return (
    <View style={styles.sideTripItem}>
      <View style={styles.sideTripHeader}>
        <Text style={styles.sideTripName}>{trip.name}</Text>
        <Text style={styles.sideTripCost}>{trip.estimatedCost}</Text>
      </View>
      <Text style={styles.sideTripDesc} numberOfLines={2}>
        {trip.description}
      </Text>
      <View style={styles.sideTripMeta}>
        <View style={styles.metaItem}>
          <Feather name="navigation" size={11} color={Colors.light.textTertiary} />
          <Text style={styles.metaText}>{trip.distance}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="clock" size={11} color={Colors.light.textTertiary} />
          <Text style={styles.metaText}>{trip.extraTime}</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="walk" size={12} color={Colors.light.textTertiary} />
          <Text style={styles.metaText}>+{trip.extraSteps.toLocaleString()} steps</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      web: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
    }),
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  dayNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.primary,
  },
  dayInfo: {
    flex: 1,
  },
  dayTheme: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  daySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  costBadge: {
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  costText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#92400E",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.light.border,
  },
  previewList: {
    gap: 6,
    marginBottom: 12,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  previewDuration: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  moreText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
    marginLeft: 14,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    paddingTop: 10,
  },
  tapToExpand: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textTertiary,
  },
  detail: {
    flex: 1,
  },
  detailHeader: {
    marginBottom: 16,
  },
  detailDay: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  detailTheme: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginTop: 4,
  },
  tabScroll: { marginBottom: 16 },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surfaceSecondary,
  },
  tabActive: { backgroundColor: Colors.light.primary },
  tabLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  tabLabelActive: { color: "#fff" },
  section: { gap: 12 },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statBoxValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  statBoxLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.light.accentLight,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.accent,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#78350F",
    lineHeight: 18,
  },
  timeBlock: { gap: 8 },
  timeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  timeLabelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  activityItem: {
    flexDirection: "row",
    gap: 10,
  },
  activityItemRest: {
    opacity: 0.85,
  },
  travelConnector: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
    marginLeft: 4,
    gap: 8,
  },
  travelLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.borderLight,
  },
  travelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  travelText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
  },
  crowdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginLeft: "auto",
  },
  crowdDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  crowdText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginBottom: 3,
  },
  infoRowText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  activityLeft: {
    alignItems: "center",
    width: 20,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.primary,
    marginTop: 4,
  },
  activityLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.light.borderLight,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
    paddingBottom: 16,
    gap: 4,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activityName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    flex: 1,
  },
  restTag: {
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  restTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#92400E",
  },
  activityDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  activityMeta: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  tipInline: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 2,
  },
  tipInlineText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.primary,
    lineHeight: 16,
    fontStyle: "italic",
  },
  restaurantItem: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  restaurantHeader: {
    flexDirection: "row",
    gap: 8,
  },
  mealBadge: {
    backgroundColor: Colors.light.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mealBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  accessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.light.primaryPale,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  accessText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  restaurantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restaurantCuisine: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  restaurantPrice: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  restaurantDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  nearbyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nearbyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  transportItem: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  transportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  transportContent: {
    flex: 1,
    gap: 4,
  },
  transportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transportMode: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  transportCost: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  transportDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  accessNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  accessNoteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.primary,
  },
  sideTripItem: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  sideTripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sideTripName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    flex: 1,
  },
  sideTripCost: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
  sideTripDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  sideTripMeta: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
});
