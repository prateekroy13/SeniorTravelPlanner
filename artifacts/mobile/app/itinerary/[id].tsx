import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
  Linking,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Colors from "@/constants/colors";
import { DayCard } from "@/components/DayCard";
import { useSavedItineraries } from "@/context/SavedItinerariesContext";

export default function ItineraryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    data: string;
    title: string;
    city: string;
    country: string;
    travelMonth?: string;
  }>();
  const { saveItinerary, savedItineraries } = useSavedItineraries();
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  let itinerary: any = null;
  try {
    itinerary = params.data ? JSON.parse(params.data as string) : null;
  } catch (e) {
    console.error("Failed to parse itinerary data", e);
  }

  const isAlreadySaved = savedItineraries.some(
    (s) => s.id === params.id || s.id === savedId
  );

  if (!itinerary) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={40} color={Colors.light.textTertiary} />
        <Text style={styles.errorText}>Itinerary not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSave = async () => {
    if (isAlreadySaved || isSaving) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);
    try {
      const id = await saveItinerary({
        title: itinerary.title || params.title,
        city: itinerary.city || params.city,
        country: itinerary.country || params.country,
        days: itinerary.days,
        travelMonth: itinerary.travelMonth || params.travelMonth || "",
        generatedData: itinerary,
      });
      setSavedId(id);
    } catch (e) {
      Alert.alert("Error", "Failed to save itinerary");
    } finally {
      setIsSaving(false);
    }
  };

  const buildShareText = () => {
    const dayList = (itinerary.dayPlans ?? [])
      .map((d: any) => {
        const acts = [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])]
          .map((a: any) => `  • ${a.name}`)
          .join("\n");
        return `Day ${d.dayNumber}${d.theme ? ` — ${d.theme}` : ""}\n${acts}`;
      })
      .join("\n\n");
    return `✈️ ${itinerary.title}\n📍 ${itinerary.city}, ${itinerary.country} — ${itinerary.days} days${itinerary.travelMonth ? ` (${itinerary.travelMonth})` : ""}\n\n${itinerary.overview ?? ""}\n\n${dayList}\n\nPlanned with SeniorTravel 🧳`;
  };

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = buildShareText();
    if (Platform.OS !== "web") {
      // Native: the system share sheet already offers WhatsApp, email, SMS, etc.
      try {
        await Share.share({ title: itinerary.title, message });
      } catch (e) {
        console.warn("Share failed", e);
      }
      return;
    }
    // Web: show our own share menu (Web Share API is unavailable in most
    // desktop browsers and inside the embedded preview).
    setCopied(false);
    setShareSheetVisible(true);
  };

  const shareVia = async (target: "whatsapp" | "email" | "telegram" | "x" | "copy") => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Build once and pass through — avoids rebuilding the full text on every tap.
    const text = buildShareText();
    const enc = encodeURIComponent;
    try {
      switch (target) {
        case "whatsapp":
          await Linking.openURL(`https://wa.me/?text=${enc(text)}`);
          break;
        case "email":
          await Linking.openURL(
            `mailto:?subject=${enc(`${itinerary.title} — ${itinerary.city} travel plan`)}&body=${enc(text)}`
          );
          break;
        case "telegram":
          await Linking.openURL(`https://t.me/share/url?url=${enc(" ")}&text=${enc(text)}`);
          break;
        case "x": {
          // X caps post length; share a compact summary there.
          const short = `✈️ ${itinerary.title} — ${itinerary.days} days in ${itinerary.city}, ${itinerary.country}. Planned with SeniorTravel 🧳`;
          await Linking.openURL(`https://twitter.com/intent/tweet?text=${enc(short)}`);
          break;
        }
        case "copy": {
          let copied = false;
          if (Platform.OS === "web" && typeof navigator !== "undefined") {
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(text);
              copied = true;
            } else {
              // Fallback for non-HTTPS or browsers without Clipboard API.
              const el = document.createElement("textarea");
              el.value = text;
              el.style.position = "fixed";
              el.style.opacity = "0";
              document.body.appendChild(el);
              el.focus();
              el.select();
              try {
                copied = document.execCommand("copy");
              } finally {
                document.body.removeChild(el);
              }
            }
          }
          if (copied) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else {
            Alert.alert("Copy failed", "Could not copy to clipboard.");
          }
          return; // keep the sheet open to show "Copied!"
        }
      }
      setShareSheetVisible(false);
    } catch (e) {
      console.warn("Share failed", e);
      Alert.alert("Share failed", "Could not open the selected app.");
    }
  };

  const handleDownload = async () => {
    if (isDownloading || !itinerary) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDownloading(true);
    try {
      // Escape all dynamic content before HTML interpolation so untrusted
      // strings can never inject markup or scripts into the document.
      const esc = (v: unknown) =>
        String(v ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const buildActivity = (act: any) => `
        <div class="activity ${act.isRestStop ? "rest" : ""}">
          <div class="act-header">
            <span class="act-name">${esc(act.name)}</span>
            ${act.crowdLevel ? `<span class="crowd crowd-${esc(act.crowdLevel)}">${act.crowdLevel === "low" ? "Quiet" : act.crowdLevel === "medium" ? "Moderate" : "Busy"}</span>` : ""}
            ${act.isRestStop ? '<span class="rest-tag">Rest Stop</span>' : ""}
          </div>
          <p class="act-desc">${esc(act.description || "")}</p>
          ${act.openingHours ? `<div class="info-row"><span class="icon">🕐</span> ${esc(act.openingHours)}</div>` : ""}
          ${act.bestTimeToVisit ? `<div class="info-row best-time"><span class="icon">☀️</span> ${esc(act.bestTimeToVisit)}</div>` : ""}
          <div class="act-meta">
            <span>⏱ ${esc(act.duration)}</span>
            <span>👟 ${(act.steps || 0).toLocaleString()} steps</span>
            <span>💶 ${esc(act.cost)}</span>
          </div>
          ${act.tips ? `<div class="tip">💡 ${esc(act.tips)}</div>` : ""}
          ${act.travelMinutesToNext ? `<div class="travel-connector">🚶 ${esc(act.travelMinutesToNext)} min walk to next stop</div>` : ""}
        </div>`;

      const buildDay = (day: any) => {
        const sections = [
          { label: "🌅 Morning", acts: day.morning || [] },
          { label: "☀️ Afternoon", acts: day.afternoon || [] },
          { label: "🌙 Evening", acts: day.evening || [] },
        ].filter((s) => s.acts.length > 0);

        return `
          <div class="day-card">
            <div class="day-header">
              <span class="day-num">Day ${esc(day.dayNumber)}</span>
              <span class="day-theme">${esc(day.theme || "")}</span>
            </div>
            <div class="day-stats">
              <span>👟 ${(day.totalSteps || 0).toLocaleString()} steps</span>
              <span>⏱ ${esc(day.activeHours || 0)}h active</span>
              <span>💶 ${esc(day.currency || "")}${esc(day.estimatedCostLow || 0)}–${esc(day.estimatedCostHigh || 0)}</span>
            </div>
            ${day.crowdAvoidanceTip ? `<div class="crowd-tip">📢 ${esc(day.crowdAvoidanceTip)}</div>` : ""}
            ${sections.map((s) => `
              <div class="time-block">
                <div class="time-label">${s.label}</div>
                ${s.acts.map(buildActivity).join("")}
              </div>`).join("")}
            ${day.restaurants?.length ? `
              <div class="time-block">
                <div class="time-label">🍽️ Where to Eat</div>
                ${day.restaurants.map((r: any) => `
                  <div class="restaurant">
                    <strong>${esc(r.name)}</strong> — ${esc(r.cuisine)} · ${esc(r.priceRange)}
                    <p>${esc(r.description || "")}</p>
                    ${r.nearbyAttraction ? `<small>Near ${esc(r.nearbyAttraction)}</small>` : ""}
                  </div>`).join("")}
              </div>` : ""}
          </div>`;
      };

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Georgia, serif; padding: 32px; color: #222; max-width: 800px; margin: 0 auto; }
  h1 { color: #1A6B4A; font-size: 28px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .overview { background: #F0FAF5; border-left: 4px solid #1A6B4A; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
  .meta { display: flex; gap: 24px; font-size: 13px; color: #555; margin-bottom: 16px; flex-wrap: wrap; }
  .day-card { border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 28px; overflow: hidden; }
  .day-header { background: #1A6B4A; color: white; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .day-num { font-size: 12px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 20px; }
  .day-theme { font-size: 16px; font-weight: bold; }
  .day-stats { padding: 8px 16px; background: #F8F9FA; font-size: 12px; color: #555; display: flex; gap: 20px; }
  .crowd-tip { padding: 8px 16px; font-size: 12px; color: #E65100; background: #FFF3E0; }
  .time-block { padding: 12px 16px; }
  .time-label { font-size: 12px; font-weight: bold; color: #1A6B4A; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .activity { border-left: 2px solid #1A6B4A; padding-left: 12px; margin-bottom: 14px; }
  .activity.rest { border-left-color: #E8A951; }
  .act-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .act-name { font-weight: bold; font-size: 14px; }
  .crowd { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: bold; }
  .crowd-low { background: #E8F5E9; color: #2E7D32; }
  .crowd-medium { background: #FFF3E0; color: #E65100; }
  .crowd-high { background: #FFEBEE; color: #C62828; }
  .rest-tag { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: #FFF3CD; color: #856404; }
  .act-desc { font-size: 12px; color: #555; margin: 4px 0; }
  .info-row { font-size: 11px; color: #666; margin: 3px 0; }
  .best-time { color: #1A6B4A; font-style: italic; }
  .act-meta { display: flex; gap: 16px; font-size: 11px; color: #888; margin: 6px 0; }
  .tip { font-size: 11px; color: #1A6B4A; background: #F0FAF5; padding: 5px 8px; border-radius: 4px; margin-top: 4px; }
  .travel-connector { font-size: 11px; color: #888; text-align: center; padding: 6px 0; border-top: 1px dashed #ddd; margin-top: 8px; }
  .restaurant { border: 1px solid #eee; border-radius: 6px; padding: 10px; margin-bottom: 10px; font-size: 12px; }
  .restaurant p { margin: 4px 0; color: #555; }
  .restaurant small { color: #888; }
  .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
</style></head>
<body>
  <h1>${esc(itinerary.title)}</h1>
  <p class="subtitle">${esc(itinerary.city)}, ${esc(itinerary.country)} · ${esc(itinerary.days)} days · ${esc(itinerary.travelMonth)}</p>
  <div class="overview">${esc(itinerary.overview)}</div>
  <div class="meta">
    <span>💶 Est. Cost: ${esc(itinerary.currency)}${esc(itinerary.totalEstimatedCostLow)}–${esc(itinerary.totalEstimatedCostHigh)}</span>
    <span>🌤 ${esc(itinerary.weatherInfo || "")}</span>
  </div>
  ${itinerary.seniorFriendlyNotes ? `<p style="font-size:12px;color:#1A6B4A;margin-bottom:20px;">♿ ${esc(itinerary.seniorFriendlyNotes)}</p>` : ""}
  ${(itinerary.dayPlans || []).map(buildDay).join("")}
  <div class="footer">Generated by Tuttle · ${new Date().toLocaleDateString()}</div>
</body></html>`;

      if (Platform.OS === "web") {
        // expo-print's printToFileAsync and expo-sharing are not supported on
        // web. Render the HTML in a hidden iframe and open the browser's
        // print dialog so the user can save it as a PDF.
        await new Promise<void>((resolve, reject) => {
          try {
            const iframe = document.createElement("iframe");
            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow?.document;
            if (!doc) {
              document.body.removeChild(iframe);
              reject(new Error("Could not create print frame"));
              return;
            }
            doc.open();
            doc.write(html);
            doc.close();
            const cleanup = () => {
              if (iframe.parentNode) document.body.removeChild(iframe);
            };
            // Give the iframe a moment to layout before printing
            setTimeout(() => {
              const win = iframe.contentWindow;
              if (!win || typeof win.print !== "function") {
                cleanup();
                reject(new Error("Print frame unavailable"));
                return;
              }
              try {
                // Clean up deterministically once printing finishes, with a
                // fallback timeout in case afterprint never fires.
                win.addEventListener("afterprint", cleanup);
                setTimeout(cleanup, 60000);
                win.focus();
                win.print();
                resolve();
              } catch (err) {
                cleanup();
                reject(err);
              }
            }, 300);
          } catch (err) {
            reject(err);
          }
        });
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `${itinerary.title} — Itinerary`,
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert("Saved", `PDF saved to: ${uri}`);
        }
      }
    } catch (e) {
      console.error("Download error", e);
      Alert.alert("Error", "Could not create PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
          style={[styles.hero, { paddingTop: topPadding + 12 }]}
        >
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => router.back()} style={styles.actionBtn}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.actionRight}>
              <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                <Feather name="share" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDownload}
                style={styles.actionBtn}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="download" size={18} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.actionBtn, isAlreadySaved && styles.savedBtn]}
              >
                <Feather
                  name={isAlreadySaved ? "bookmark" : "bookmark"}
                  size={18}
                  color={isAlreadySaved ? Colors.light.accent : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.locationText}>
                {itinerary.city}, {itinerary.country}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{itinerary.title}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroBadgeText}>{itinerary.days} days</Text>
              </View>
              <View style={styles.heroBadge}>
                <Feather name="sun" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroBadgeText}>{itinerary.travelMonth}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {isAlreadySaved && (
            <View style={styles.savedBanner}>
              <Feather name="check-circle" size={16} color={Colors.light.success} />
              <Text style={styles.savedBannerText}>Saved to your trips</Text>
            </View>
          )}

          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>Trip Overview</Text>
            <Text style={styles.overviewText}>{itinerary.overview}</Text>

            <View style={styles.overviewStats}>
              <OverviewStat
                icon="credit-card"
                label="Est. Total"
                value={`${itinerary.currency}${itinerary.totalEstimatedCostLow}–${itinerary.totalEstimatedCostHigh}`}
              />
              {itinerary.seniorFriendlyNotes && (
                <View style={styles.seniorNote}>
                  <MaterialCommunityIcons
                    name="wheelchair-accessibility"
                    size={14}
                    color={Colors.light.primary}
                  />
                  <Text style={styles.seniorNoteText}>{itinerary.seniorFriendlyNotes}</Text>
                </View>
              )}
            </View>

            {itinerary.weatherInfo && (
              <View style={styles.weatherRow}>
                <Feather name="cloud" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.weatherText}>{itinerary.weatherInfo}</Text>
              </View>
            )}

            {itinerary.emergencyNumbers && (
              <View style={styles.emergencyRow}>
                <Feather name="phone" size={13} color={Colors.light.error} />
                <Text style={styles.emergencyText}>{itinerary.emergencyNumbers}</Text>
              </View>
            )}
          </View>

          {!isAlreadySaved && (
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.88}
              style={styles.saveBtn}
            >
              <Feather name="bookmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>
                {isSaving ? "Saving..." : "Save This Itinerary"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Plans</Text>
            {itinerary.dayPlans?.map((day: any) => (
              <DayCard
                key={day.dayNumber}
                day={day}
                onPress={() =>
                  router.push({
                    pathname: "/itinerary/day/[dayId]",
                    params: {
                      dayId: day.dayNumber,
                      data: JSON.stringify(day),
                      city: itinerary.city,
                      country: itinerary.country,
                      itineraryId: params.id || savedId || "",
                    },
                  })
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={shareSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareSheetVisible(false)}
      >
        <Pressable
          style={shareStyles.backdrop}
          onPress={(e) => {
            // Only dismiss when the press lands on the backdrop itself,
            // not on a child of the sheet (avoids nested-pressable issues).
            if (e.target === e.currentTarget) setShareSheetVisible(false);
          }}
        >
          <View style={shareStyles.sheet}>
            <View style={shareStyles.handle} />
            <Text style={shareStyles.title}>Share this itinerary</Text>
            <Text style={shareStyles.subtitle}>
              {itinerary.city}, {itinerary.country} · {itinerary.days} days
            </Text>

            <ShareOption
              color="#25D366"
              icon={<Ionicons name="logo-whatsapp" size={22} color="#fff" />}
              label="WhatsApp"
              sub="Send to a chat or group"
              onPress={() => shareVia("whatsapp")}
            />
            <ShareOption
              color="#C4622D"
              icon={<Feather name="mail" size={20} color="#fff" />}
              label="Email"
              sub="Send the full plan by email"
              onPress={() => shareVia("email")}
            />
            <ShareOption
              color="#229ED9"
              icon={<Ionicons name="paper-plane" size={20} color="#fff" />}
              label="Telegram"
              sub="Share via Telegram"
              onPress={() => shareVia("telegram")}
            />
            <ShareOption
              color="#111"
              icon={<Text style={shareStyles.xLogo}>𝕏</Text>}
              label="X (Twitter)"
              sub="Post a short summary"
              onPress={() => shareVia("x")}
            />
            <ShareOption
              color={copied ? Colors.light.primary : "#6B7280"}
              icon={<Feather name={copied ? "check" : "copy"} size={20} color="#fff" />}
              label={copied ? "Copied!" : "Copy to clipboard"}
              sub="Paste it anywhere"
              onPress={() => shareVia("copy")}
            />

            <Pressable
              onPress={() => setShareSheetVisible(false)}
              style={shareStyles.cancelBtn}
              accessibilityRole="button"
            >
              <Text style={shareStyles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ShareOption({
  color,
  icon,
  label,
  sub,
  onPress,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={shareStyles.option}>
      <View style={[shareStyles.optionIcon, { backgroundColor: color }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={shareStyles.optionLabel}>{label}</Text>
        <Text style={shareStyles.optionSub}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );
}

const shareStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  optionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  xLogo: {
    fontSize: 18,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
  },
});

function OverviewStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={statStyles.row}>
      <Feather name={icon as any} size={14} color={Colors.light.primary} />
      <Text style={statStyles.label}>{label}:</Text>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRight: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedBtn: {
    backgroundColor: "rgba(232, 169, 81, 0.2)",
  },
  heroContent: { gap: 8 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  locationText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 32,
  },
  heroBadges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  body: {
    padding: 20,
    gap: 16,
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 12,
  },
  savedBannerText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#166534",
  },
  overviewCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
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
  overviewTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  overviewText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  overviewStats: { gap: 8 },
  seniorNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.light.primaryPale,
    padding: 10,
    borderRadius: 10,
  },
  seniorNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.primary,
    lineHeight: 18,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  weatherText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  emergencyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  emergencyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    padding: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  section: { gap: 0 },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
  },
});

const statStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
});
