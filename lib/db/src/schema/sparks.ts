import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const sparks = pgTable("sparks", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull().default("Traveler"),
  imageData: text("image_data"),
  caption: text("caption"),
  locationName: text("location_name").notNull(),
  locationType: text("location_type").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationCountry: text("destination_country").notNull(),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sparkLikes = pgTable("spark_likes", {
  sparkId: integer("spark_id")
    .notNull()
    .references(() => sparks.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
});
