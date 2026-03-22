import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthUser } from "@/context/AuthContext";
import Colors from "@/constants/colors";

const AVATAR_COLORS = [
  "#1A6B4A", "#2E7D32", "#1565C0", "#6A1B9A",
  "#AD1457", "#E65100", "#4E342E", "#00695C",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  user: AuthUser | null;
  size?: number;
}

export function UserAvatar({ user, size = 40 }: UserAvatarProps) {
  const radius = size / 2;

  if (!user) {
    return (
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: Colors.light.primary,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>?</Text>
      </View>
    );
  }

  if (user.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={[styles.circle, { width: size, height: size, borderRadius: radius }]}
        contentFit="cover"
      />
    );
  }

  const bg = getAvatarColor(user.name);
  const initials = getInitials(user.name);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  initials: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    lineHeight: undefined,
  },
});
