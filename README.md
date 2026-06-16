# Tuttle — Senior Travel Planner

A mobile-first travel companion designed specifically for senior travelers. Tuttle curates senior-friendly destinations, generates AI-powered personalised itineraries, and provides a community photo feed where travelers share real moments from the road.

**Platform:** Android (Google Play) · Web (Replit)  
**Status:** Live — internal testing, version 1.0.0 (build 4)  
**Backend:** https://senior-travel-planner.replit.app

---

## What It Does

| Feature | Description |
|---|---|
| **Discover Destinations** | 14 curated cities worldwide, each rated on a Senior-Friendly Score (1–10) based on terrain, transport, and accessibility |
| **Swipe Attractions** | Tinder-style card swipe to like/skip attractions and restaurants at each destination |
| **AI Itinerary Generator** | OpenAI-powered day-by-day itinerary with real walking times between stops (Google Distance Matrix) |
| **Saved Itineraries** | Cloud-persisted trip plans, linked to the signed-in user account |
| **Sparks** | Community photo feed — travelers upload photos of spots and restaurants, like others' posts |
| **Preferences & Onboarding** | Pace (easy/moderate/active), budget, dietary needs, accessibility requirements, font size |
| **Google Sign-In** | Server-side OAuth2 flow with auto-dismissing in-app browser (custom URL scheme `tuttle://`) |
| **Guest Mode** | Browse and discover without an account |

---

## Tech Stack

### Mobile (`artifacts/mobile`)
| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 54) |
| Navigation | Expo Router (file-based, tab + stack) |
| Language | TypeScript |
| State | React Context (Auth, Preferences, SavedItineraries) + TanStack Query |
| Auth browser | `expo-web-browser` — `openAuthSessionAsync` with `tuttle://` redirect scheme |
| Storage | `@react-native-async-storage/async-storage` |
| Build / CI | EAS Build (`eas.json`, `autoIncrement: true`) |
| Distribution | Google Play Store (closed testing → production) |

### API Server (`artifacts/api-server`)
| Layer | Technology |
|---|---|
| Runtime | Node.js + Express 5 |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Replit managed) |
| AI | OpenAI API (itinerary generation) |
| Maps | Google Maps Platform — Places API (photos), Distance Matrix API (walking times) |
| Auth | Google OAuth2 (server-side implicit flow, session stored in PostgreSQL) |
| Hosting | Replit (`senior-travel-planner.replit.app`) |

### Shared Libraries (`lib/`)
- `@workspace/db` — Drizzle client, schema definitions, pool
- `@workspace/integrations-openai-ai-server` — OpenAI client wrapper
- `@workspace/api-spec`, `@workspace/api-client-react`, `@workspace/api-zod` — type-safe API contract layer

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Android App (EAS)                  │
│                                                     │
│  Expo Router (tabs: Home, Sparks, Saved, Profile)  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Destination│ │  Swipe   │ │  AI Itinerary    │   │
│  │  Browser │ │  Cards   │ │  Generator       │   │
│  └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Sparks  │ │  Saved   │ │  Google Sign-In  │   │
│  │   Feed   │ │  Trips   │ │  (tuttle://)     │   │
│  └──────────┘ └──────────┘ └──────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS (EXPO_PUBLIC_DOMAIN)
                         ▼
┌─────────────────────────────────────────────────────┐
│           Express API (Replit — always-on)          │
│                                                     │
│  /api/destinations          Static curated data     │
│  /api/destinations/search   Text search             │
│  /api/destinations/:id/attractions                  │
│  /api/destinations/:id/restaurants                  │
│  /api/maps/place-photo      Google Places → CDN URL │
│  /api/itineraries           CRUD (Drizzle/Postgres) │
│  /api/itineraries/generate  OpenAI + Distance Matrix│
│  /api/sparks                CRUD + likes            │
│  /api/auth/google-initiate  Start OAuth flow        │
│  /api/auth/google-callback  Receive token, store    │
│  /api/auth/session/:id      One-time session fetch  │
│  /privacy  /delete-account  Static info pages       │
└──────┬─────────────────────────────────┬────────────┘
       │                                 │
       ▼                                 ▼
┌─────────────┐                 ┌────────────────────┐
│  PostgreSQL │                 │   External APIs    │
│             │                 │                    │
│ itineraries │                 │  OpenAI GPT-4      │
│ sparks      │                 │  Google Maps       │
│ spark_likes │                 │  Google OAuth2     │
│auth_sessions│                 └────────────────────┘
└─────────────┘
```

---

## Google Sign-In Flow

```
App                          CCT (Chrome Custom Tab)       API Server
 │                                    │                        │
 │── openAuthSessionAsync(url, ───────▶                        │
 │   redirectUri="tuttle://           │                        │
 │   auth-callback")                  │                        │
 │                                    │── GET /auth/google-initiate ──▶
 │                                    │                        │── redirect to Google
 │                                    │◀─ Google OAuth consent ┘
 │                                    │── GET /auth/google-callback ──▶
 │                                    │                        │── store session in DB
 │                                    │◀── redirect to tuttle://auth-callback?session=id
 │◀── result.type = "success" ────────│                        │
 │── GET /api/auth/session/:id ───────────────────────────────▶│
 │◀── user object (one-time, deletes from DB) ────────────────┘
 │── saveUser() → AsyncStorage
```

---

## Database Schema

### `itineraries`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| user_id | text | Google sub / email |
| title | text | e.g. "5 Days in Kyoto" |
| city, country | text | |
| days | integer | trip length |
| travel_month | text | |
| generated_data | jsonb | full AI response |
| preferences | jsonb | snapshot of user prefs at generation time |
| created_at, updated_at | timestamp | |

### `sparks`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| author_name | text | from Google profile |
| image_data | text | base64 or URL |
| caption | text | optional |
| location_name | text | |
| location_type | text | `spot` or `restaurant` |
| destination_city, destination_country | text | |
| likes_count | integer | |
| created_at | timestamp | |

### `spark_likes`
| Column | Type | Notes |
|---|---|---|
| spark_id | integer FK → sparks | |
| device_id | text | anonymous per-device identifier |

### `auth_sessions`
| Column | Type | Notes |
|---|---|---|
| session_id | text PK | random token |
| user_data | jsonb | Google profile |
| created_at | timestamp | |
| expires_at | timestamp | TTL: 5 minutes, one-time use |

---

## Project Structure

```
SeniorTravelPlanner/
├── artifacts/
│   ├── mobile/               # Expo/React Native app
│   │   ├── app/              # Expo Router screens
│   │   │   ├── (tabs)/       # Home, Sparks, Saved, Profile
│   │   │   ├── swipe/        # Attraction swipe screen
│   │   │   ├── food-swipe/   # Restaurant swipe screen
│   │   │   ├── itinerary/    # View / day detail screens
│   │   │   └── sparks/       # Upload + author profile
│   │   ├── components/       # Shared UI components
│   │   ├── constants/        # Colors, API base URL
│   │   ├── context/          # Auth, Preferences, SavedItineraries
│   │   ├── hooks/            # useDeviceId, etc.
│   │   ├── eas.json          # EAS build profiles + env vars
│   │   └── app.json          # Expo config (scheme: "tuttle")
│   └── api-server/           # Express API
│       └── src/
│           ├── routes/
│           │   ├── destinations.ts   # Curated city + attraction data
│           │   ├── itineraries.ts    # AI generation + CRUD
│           │   ├── sparks.ts         # Community feed
│           │   ├── maps.ts           # Google Places photo proxy
│           │   └── auth.ts           # Google OAuth session flow
│           └── app.ts               # Static pages (privacy, delete-account)
├── lib/
│   ├── db/                   # Drizzle schema + Postgres pool
│   └── integrations*/        # OpenAI client wrappers
└── pnpm-workspace.yaml
```

---

## Environment Variables

### API Server (Replit Secrets)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | AI itinerary generation |
| `GOOGLE_MAPS_API_KEY` | Place photos + Distance Matrix |
| `GOOGLE_CALLBACK_ORIGIN` | Registered OAuth callback domain (production) |

### Mobile (EAS `env` in `eas.json`)
| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_DOMAIN` | API server hostname (baked in at build time) |
| `EXPO_PUBLIC_AUTH_ORIGIN` | OAuth server origin (always production) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## Build & Release

```bash
# Install dependencies
pnpm install

# Build Android production AAB
cd artifacts/mobile && eas build --platform android --profile production

# The build auto-increments versionCode (managed by EAS, appVersionSource: "remote")
# Upload resulting .aab to Google Play Console:
# Testing → Closed testing → [track] → Create new release
```

Current published build: **version 1.0.0, version code 4**

---

## Curated Destinations (v1)

| City | Country | Senior Score |
|---|---|---|
| Singapore | Singapore | 9.5 |
| Vienna | Austria | 9.2 |
| Tokyo | Japan | 9.1 |
| Kyoto | Japan | 9.0 |
| Amsterdam | Netherlands | 8.8 |
| Lisbon | Portugal | 8.5 |
| Kuala Lumpur | Malaysia | 8.6 |
| Queenstown | New Zealand | 8.3 |
| Barcelona | Spain | 8.2 |
| Quebec City | Canada | 8.0 |
| Prague | Czech Republic | 7.8 |
| San Francisco | USA | 7.8 |
| Rome | Italy | 7.5 |
| Edinburgh | Scotland | 7.5 |
| Dubrovnik | Croatia | 7.2 |

---

## Legal & Store Listing

- **Privacy policy:** https://senior-travel-planner.replit.app/privacy
- **Account deletion:** https://senior-travel-planner.replit.app/delete-account
- **Google Play:** Published under closed testing (internal testers)
