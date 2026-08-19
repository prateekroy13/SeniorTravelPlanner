import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const accuracyReportsTable = pgTable("accuracy_reports", {
  id: serial("id").primaryKey(),
  itineraryId: integer("itinerary_id").notNull(),
  itemType: text("item_type").notNull(),
  itemName: text("item_name").notNull(),
  dayNumber: integer("day_number"),
  issueType: text("issue_type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
