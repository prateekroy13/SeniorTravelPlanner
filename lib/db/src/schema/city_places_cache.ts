import { pgTable, text, serial, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const cityPlacesCacheTable = pgTable(
  "city_places_cache",
  {
    id: serial("id").primaryKey(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    placeType: text("place_type").notNull(), // 'main' | 'insider'
    places: jsonb("places").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("city_places_cache_uniq").on(t.city, t.country, t.placeType),
  ]
);

export type CachedPlace = {
  placeId: string;
  name: string;
  rating: number;
  userRatingCount: number;
  lat: number;
  lng: number;
  formattedAddress: string;
  types: string[];
  openingHours?: string;
  description?: string;
};
