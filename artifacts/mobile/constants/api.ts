// EXPO_PUBLIC_DOMAIN is baked in at build time:
//   dev  → REPLIT_DEV_DOMAIN  (janeway.replit.dev — valid HTTP server)
//   prod → REPLIT_INTERNAL_APP_DOMAIN (senior-travel-planner.replit.app — valid HTTP server)
// NOTE: seniortravel.replit.app is the Expo delivery domain and returns 404 for HTTP.
// Falls back to the production domain so native builds never end up with a blank host.
export const API_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN || "senior-travel-planner.replit.app";
export const API_BASE_URL = `https://${API_DOMAIN}`;

// For web OAuth, always use the production server.
// The Google callback is registered only on the production domain, and the
// session is stored in the production DB — so both the initiate request and
// the session poll must go through the same server.
export const AUTH_ORIGIN =
  process.env.EXPO_PUBLIC_AUTH_ORIGIN || "https://senior-travel-planner.replit.app";
