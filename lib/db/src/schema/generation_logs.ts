import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";

export const generationLogsTable = pgTable("generation_logs", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull(),
  userId: text("user_id"),
  city: text("city").notNull(),
  country: text("country").notNull(),
  days: integer("days").notNull(),
  travelMonth: text("travel_month").notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model").notNull(),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  estimatedCostUsd: real("estimated_cost_usd"),
  latencyMs: integer("latency_ms"),
  googleDistanceMatrixCalls: integer("google_distance_matrix_calls").default(0),
  httpStatus: integer("http_status").notNull(),
  errorType: text("error_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
