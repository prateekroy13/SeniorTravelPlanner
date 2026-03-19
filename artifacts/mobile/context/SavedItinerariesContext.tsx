import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedItinerary {
  id: string;
  title: string;
  city: string;
  country: string;
  days: number;
  travelMonth: string;
  generatedData: Record<string, unknown>;
  savedAt: string;
}

const STORAGE_KEY = "@seniortravel_saved_itineraries";

interface SavedItinerariesContextType {
  savedItineraries: SavedItinerary[];
  saveItinerary: (itinerary: Omit<SavedItinerary, "id" | "savedAt">) => Promise<string>;
  deleteItinerary: (id: string) => Promise<void>;
  isLoading: boolean;
}

const SavedItinerariesContext = createContext<SavedItinerariesContextType | null>(null);

export function SavedItinerariesProvider({ children }: { children: React.ReactNode }) {
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setSavedItineraries(JSON.parse(stored));
    } catch (e) {
      console.warn("Failed to load saved itineraries", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveItinerary = async (data: Omit<SavedItinerary, "id" | "savedAt">): Promise<string> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newItem: SavedItinerary = {
      ...data,
      id,
      savedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...savedItineraries];
    setSavedItineraries(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save itinerary", e);
    }
    return id;
  };

  const deleteItinerary = async (id: string) => {
    const updated = savedItineraries.filter((i) => i.id !== id);
    setSavedItineraries(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to delete itinerary", e);
    }
  };

  return (
    <SavedItinerariesContext.Provider
      value={{ savedItineraries, saveItinerary, deleteItinerary, isLoading }}
    >
      {children}
    </SavedItinerariesContext.Provider>
  );
}

export function useSavedItineraries() {
  const ctx = useContext(SavedItinerariesContext);
  if (!ctx) throw new Error("useSavedItineraries must be used within SavedItinerariesProvider");
  return ctx;
}
