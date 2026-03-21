import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const KEY = "@seniortravel_sparks_pref";

export type SparksPref =
  | { mode: "cities"; cities: string[] }
  | { mode: "latest" };

export function useSparksPref() {
  const [pref, setPref] = useState<SparksPref | null | "loading">("loading");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) { setPref(null); return; }
      try { setPref(JSON.parse(raw)); } catch { setPref(null); }
    });
  }, []);

  const savePref = async (next: SparksPref) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    setPref(next);
  };

  const clearPref = async () => {
    await AsyncStorage.removeItem(KEY);
    setPref(null);
  };

  return { pref, savePref, clearPref };
}
