export * from "./generated/api";
export type * from "./generated/types";
// Explicit re-exports resolve the star-export name collisions between the
// zod runtime schemas (generated/api) and the TS interfaces (generated/types).
export { CreateItineraryBody, GenerateItineraryBody } from "./generated/api";
export type {
  CreateItineraryBody as CreateItineraryBodyType,
  GenerateItineraryBody as GenerateItineraryBodyType,
} from "./generated/types";
