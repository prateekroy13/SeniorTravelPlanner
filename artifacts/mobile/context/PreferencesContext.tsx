import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Pace = "easy" | "moderate" | "active";
export type BudgetLevel = "budget" | "mid" | "luxury";

export interface UserPreferences {
  pace: Pace;
  maxStepsPerDay: number;
  dietaryNeeds: string[];
  interests: string[];
  budgetLevel: BudgetLevel;
  accessibilityNeeds: string[];
  fontSize: "normal" | "large" | "xlarge";
  hasCompletedOnboarding: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  pace: "moderate",
  maxStepsPerDay: 6000,
  dietaryNeeds: [],
  interests: ["culture", "food"],
  budgetLevel: "mid",
  accessibilityNeeds: [],
  fontSize: "normal",
  hasCompletedOnboarding: false,
};

const STORAGE_KEY = "@seniortravel_preferences";

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.warn("Failed to load preferences", e);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save preferences", e);
    }
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
