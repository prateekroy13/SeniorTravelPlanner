# Architecture — Tuttle (Senior Travel Planner)

---

## 1. System Context

```
┌──────────────────────────────────────────────────────────────────────┐
│                          External World                              │
│                                                                      │
│   ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│   │ Google Play │    │ Google OAuth │    │  Google Maps API     │  │
│   │    Store    │    │  (accounts.  │    │  · Places (photos)   │  │
│   │ (distribute)│    │  google.com) │    │  · Distance Matrix   │  │
│   └─────────────┘    └──────────────┘    └──────────────────────┘  │
│                                                                      │
│                       ┌──────────────┐                              │
│                       │  OpenAI API  │                              │
│                       │  (GPT model) │                              │
│                       └──────────────┘                              │
└──────────────────────────────────────────────────────────────────────┘
           ▲                  ▲                   ▲
           │                  │                   │
    ┌──────┴──────────────────┴───────────────────┴────────┐
    │              Tuttle API Server (Replit)               │
    │         senior-travel-planner.replit.app              │
    └──────────────────────────┬───────────────────────────┘
                               │ HTTPS
                    ┌──────────┴──────────┐
                    │   Tuttle Android App │
                    │    (EAS / Play)      │
                    └─────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │    End Users         │
                    │  (Senior Travelers)  │
                    └─────────────────────┘
```

---

## 2. Mobile App Architecture

### 2.1 Navigation Structure (Expo Router)

```
app/
├── _layout.tsx                 Root layout — fonts, auth guard, stack navigator
│
├── login.tsx                   Google Sign-In / Guest mode entry
├── onboarding.tsx              First-run preferences (pace, diet, budget, a11y)
├── auth-done.tsx               Deep-link handler for OAuth completion (legacy)
├── oauth-callback.tsx          Web-only OAuth hash handler (legacy)
│
└── (tabs)/                     Tab navigator (authenticated users)
    ├── _layout.tsx             Tab bar: Home, Sparks, Saved, Profile
    ├── index.tsx               Home — featured destinations + Top Picks
    ├── sparks.tsx              Community photo feed + likes
    ├── saved.tsx               Saved itineraries list
    └── profile.tsx             User profile + preferences + sign out
│
├── swipe/[destinationId].tsx   Attraction swipe cards for a city
├── food-swipe/[destinationId].tsx  Restaurant swipe cards for a city
│
├── itinerary/
│   ├── generate.tsx            AI itinerary generation (preferences form)
│   ├── [id].tsx                View saved itinerary — day list
│   └── day/[dayId].tsx         Day detail — attraction schedule
│
└── sparks/
    ├── upload.tsx              Photo upload form (location, caption, image)
    └── user/[authorName].tsx   View all Sparks by one author
```

### 2.2 State Management

```
┌─────────────────────────────────────────────────────┐
│                  React Contexts                     │
│                                                     │
│  AuthContext          PreferencesContext            │
│  ─────────────────    ───────────────────────────  │
│  · user (AuthUser)    · pace                        │
│  · signingIn          · budget                      │
│  · guestMode          · dietaryNeeds                │
│  · signInWithGoogle   · accessibilityNeeds          │
│  · signOut            · fontSize                    │
│  · loginWithData      · hasCompletedOnboarding      │
│                       Persisted: AsyncStorage       │
│  Persisted:                                         │
│  AsyncStorage         SavedItinerariesContext       │
│                       ───────────────────────────  │
│                       · itineraries[]               │
│                       · saveItinerary()             │
│                       · deleteItinerary()           │
│                       Persisted: AsyncStorage       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              TanStack Query (Server State)          │
│                                                     │
│  queryKey: ["destinations"]    → GET /api/destinations
│  queryKey: ["sparks"]          → GET /api/sparks
│  queryKey: ["place-photo", q]  → GET /api/maps/place-photo
└─────────────────────────────────────────────────────┘
```

### 2.3 Key Components

```
components/
├── DestinationCard.tsx       City card with photo (Google Places), score badge
├── SavedItineraryCard.tsx    Saved trip card — nav + delete (sibling touchables,
│                             avoids nested-touchable RN New Arch bug)
├── DayCard.tsx               Day summary card within itinerary view
├── UserAvatar.tsx            Google profile photo or initials fallback
├── ErrorBoundary.tsx         Catches render errors, shows fallback UI
└── ui/
    ├── PrimaryButton.tsx     Branded CTA button
    ├── Badge.tsx             Score / category badge
    └── ScoreRing.tsx         Circular score visualisation
```

---

## 3. API Server Architecture

### 3.1 Route Map

```
Express App
│
├── GET  /health                         Uptime check
├── GET  /privacy                        Static HTML — privacy policy
├── GET  /delete-account                 Static HTML — account deletion instructions
│
└── /api
    ├── Destinations
    │   ├── GET /destinations            All 15 curated cities (in-memory)
    │   ├── GET /destinations/search     Filter by city/country/highlight text
    │   ├── GET /destinations/:id/attractions   Curated + default attraction list
    │   └── GET /destinations/:id/restaurants   Curated restaurant list
    │
    ├── Maps
    │   └── GET /maps/place-photo        Google Places photo proxy (in-memory cache)
    │                                    → no API key exposed to client
    │
    ├── Itineraries
    │   ├── GET  /itineraries            List by userId query param
    │   ├── POST /itineraries/generate   AI generation → save → return
    │   ├── GET  /itineraries/:id        Single itinerary
    │   └── DELETE /itineraries/:id      Delete by id
    │
    ├── Sparks
    │   ├── GET  /sparks                 Feed (with liked_by_me per deviceId)
    │   ├── POST /sparks                 Upload new Spark
    │   ├── POST /sparks/:id/like        Toggle like (deviceId-based)
    │   └── GET  /sparks/user/:author    All Sparks by author name
    │
    └── Auth
        ├── GET  /auth/google-initiate   Redirect to Google OAuth consent
        ├── GET  /auth/google-callback   Receive token, store session in DB
        ├── POST /auth/store-session     Internal: store user data
        └── GET  /auth/session/:id       One-time fetch → deletes on read
```

### 3.2 Middleware Stack

```
Request
  │
  ▼
cors()              Allow cross-origin from any origin (mobile app + web)
  │
  ▼
express.json()      Parse JSON body
  │
  ▼
Router.use()        Mount route modules
  │
  ▼
Response
```

### 3.3 Destination Data Strategy

Destination and attraction data is stored **in-memory as a TypeScript constant** (`DESTINATIONS`, `ATTRACTIONS` in `destinations.ts`) rather than in the database. This was a deliberate v1 choice:

- **Pro:** Zero DB reads for the most common requests, instant response, no migration cost when editing content
- **Pro:** Easily version-controlled — changing a city description is a code diff
- **Con:** Requires a redeploy to update content; not editable without code changes
- **Future:** Move to a CMS or DB table when the destination count grows beyond ~30 or when non-developers need to edit content

---

## 4. Database Architecture

### 4.1 Entity Relationship

```
┌──────────────────┐         ┌────────────────────┐
│   itineraries    │         │      sparks         │
│──────────────────│         │────────────────────│
│ id (PK)          │         │ id (PK)             │
│ user_id          │         │ author_name         │
│ title            │         │ image_data (base64) │
│ city             │         │ caption             │
│ country          │         │ location_name       │
│ days             │         │ location_type       │
│ travel_month     │         │ destination_city    │
│ generated_data ──┼─JSONB   │ destination_country │
│ preferences ─────┼─JSONB   │ likes_count         │
│ created_at       │         │ created_at          │
│ updated_at       │         └────────┬────────────┘
└──────────────────┘                  │ 1:many
                                      ▼
                             ┌────────────────────┐
                             │    spark_likes      │
                             │────────────────────│
                             │ spark_id (FK)       │
                             │ device_id           │
                             └────────────────────┘

┌──────────────────┐
│  auth_sessions   │   (ephemeral — TTL 5 min, one-time read)
│──────────────────│
│ session_id (PK)  │
│ user_data ───────┼─JSONB   { id, name, email, picture }
│ created_at       │
│ expires_at       │
└──────────────────┘
```

### 4.2 ORM & Access Pattern

- **Drizzle ORM** for typed queries on `itineraries`
- **Raw `pg` pool queries** for `sparks`, `spark_likes`, `auth_sessions` (simpler queries, faster iteration)
- Schema defined in `lib/db/src/schema/` — shared across server and any future services

---

## 5. Authentication Flow (Detailed)

### 5.1 Google Sign-In — Native (Android)

```
User taps "Sign in with Google"
         │
         ▼
AuthContext.signInWithGoogleNative()
  · generates random session_id
  · sets redirectUri = "tuttle://auth-callback"
  · constructs initiateUrl:
    GET /api/auth/google-initiate
        ?session_id=<id>
        &client_id=<GOOGLE_CLIENT_ID>
        &redirect_uri=tuttle://auth-callback
         │
         ▼
WebBrowser.openAuthSessionAsync(initiateUrl, "tuttle://auth-callback")
  · Opens Chrome Custom Tab (CCT)
  · JS on Android is SUSPENDED while CCT is open
         │
         ▼
[API] /auth/google-initiate
  · encodes { session_id, redirect_uri } as base64url state
  · redirects to accounts.google.com/o/oauth2/v2/auth
         │
         ▼
[Google] User consents → redirects to /api/auth/google-callback#access_token=...
         │
         ▼
[API] /auth/google-callback (HTML page with inline JS)
  · reads access_token from URL hash
  · fetches https://www.googleapis.com/userinfo/v2/me
  · POSTs user data to /api/auth/store-session → stored in PostgreSQL
  · redirects to tuttle://auth-callback?session=<id>
         │
         ▼
[CCT] detects tuttle:// scheme → CCT auto-dismissed
openAuthSessionAsync resolves with { type: "success" }
         │
         ▼
[App] JS resumes
  · fetches /api/auth/session/<id> (up to 5 retries, 500ms apart)
  · session deleted from DB on first successful read (one-time use)
  · saveUser() → stored in AsyncStorage
  · user is now authenticated
```

### 5.2 Google Sign-In — Web

```
User taps "Sign in with Google"
         │
         ▼
AuthContext.signInWithGoogleWeb()
  · opens /api/auth/google-initiate in new browser tab (no redirect_uri)
  · polls /api/auth/session/:id every 1 second (up to 120 seconds)
  · when user completes sign-in in the new tab, callback stores session in DB
  · poll finds session → saveUser()
  · new tab closed automatically
```

### 5.3 Session Security Properties

| Property | Implementation |
|---|---|
| Expiry | 5-minute TTL (`expires_at` column), cleaned up every 60 seconds |
| One-time use | `DELETE ... RETURNING` — session consumed on first successful read |
| CSRF protection | Random `session_id` in state param, matched client-side |
| Key exposure | Google client ID is public (safe); no client secret on mobile client |

---

## 6. AI Itinerary Generation Flow

```
User fills generate form (city, days, month, interests, pace, budget)
         │
         ▼
POST /api/itineraries/generate
  {
    city, country, days, travelMonth,
    preferences: { pace, budget, dietary, accessibility },
    likedAttractions[],   ← from swipe session
    likedRestaurants[]    ← from food-swipe session
  }
         │
         ▼
getRealTravelTimes()
  · Google Distance Matrix API (walking mode)
  · called for liked attractions pairs in sequence
  · returns formatted "X → Y: N min walk" strings
         │
         ▼
OpenAI Chat Completion
  · System prompt: senior travel expert persona
  · User prompt: city, preferences, liked places, real walking times
  · Structured output: days[] → { title, theme, attractions[], meals[] }
         │
         ▼
Drizzle INSERT into itineraries
  · generated_data = full AI JSON response
  · user_id = req.query.userId
         │
         ▼
Response → app saves to SavedItinerariesContext + AsyncStorage
```

---

## 7. Sparks (Community Feed) Flow

```
Upload:                                     Feed:
────────────────────────────────            ─────────────────────────────
User picks photo (ImagePicker)              GET /api/sparks?deviceId=<id>
  │                                           │
  ▼                                           ▼
POST /api/sparks                          PostgreSQL JOIN spark_likes
  · image_data (base64)                     · liked_by_me = true/false
  · authorName (from Google user.name)        per requesting device
  · locationName, locationType
  · destinationCity, destinationCountry      Rendered as infinite-scroll
  │                                          card feed (TanStack Query)
  ▼
INSERT into sparks table
  · likesCount defaults to 0

Like/Unlike:
─────────────────────────
POST /api/sparks/:id/like
  { deviceId }
  · INSERT or DELETE spark_likes row
  · UPDATE sparks.likes_count ±1
  · returns { liked: bool, likesCount: int }
```

---

## 8. Infrastructure & Deployment

### 8.1 Hosting

```
┌──────────────────────────────────────────┐
│              Replit (always-on)          │
│                                          │
│  artifact: api-server                    │
│  domain:   senior-travel-planner         │
│            .replit.app                   │
│                                          │
│  Runtime: Node.js                        │
│  Entry:   src/index.ts → tsx             │
│  DB:      PostgreSQL (Replit managed)    │
│  Secrets: Replit Secrets panel           │
│                                          │
│  Paths exposed:                          │
│   /api  /privacy  /delete-account        │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│           EAS Build (Expo)               │
│                                          │
│  Profile: production                     │
│  Platform: Android                       │
│  Output: .aab (Google Play AAB)          │
│  versionCode: auto-increment (remote)    │
│  Env vars baked in at build time:        │
│   EXPO_PUBLIC_DOMAIN                     │
│   EXPO_PUBLIC_AUTH_ORIGIN                │
│   EXPO_PUBLIC_GOOGLE_CLIENT_ID           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│          Google Play Console             │
│                                          │
│  Track: Closed testing                   │
│  Current: v1.0.0 (build 4)              │
│  Path to production: closed → open       │
│                       → production       │
└──────────────────────────────────────────┘
```

### 8.2 Monorepo Layout

```
pnpm-workspace.yaml defines workspaces:
  · artifacts/mobile         (Expo app)
  · artifacts/api-server     (Express API)
  · lib/db                   (@workspace/db)
  · lib/integrations*        (@workspace/integrations-openai-*)
  · lib/api-*                (@workspace/api-spec, api-client-react, api-zod)
  · scripts/

Shared packages are resolved as local pnpm workspace packages
(no npm publish needed).
```

### 8.3 Build Pipeline

```
Code push to GitHub (master)
         │
         ├──▶ Replit auto-deploys api-server (on push / manual trigger)
         │
         └──▶ Developer manually runs:
              eas build --platform android --profile production
                │
                ▼
              EAS cloud build (~13 min)
                │
                ▼
              Download .aab → upload to Play Console
                │
                ▼
              Play Console review + rollout to closed testing
```

---

## 9. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth method | Server-side OAuth + session DB | Avoids native Google SDK setup on Android; works across platforms; no client secret needed |
| OAuth browser dismissal | `tuttle://` custom scheme redirect + `openAuthSessionAsync` | Auto-dismisses CCT without user manually closing; requires standalone build (not Expo Go) |
| Destination data storage | In-memory TypeScript constant | Fast, version-controlled, no DB overhead for v1 content that rarely changes |
| ORM | Drizzle (typed) for structured tables, raw `pg` for simpler queries | Type safety where it matters most (itinerary schema); brevity for ad-hoc queries |
| State management | React Context + AsyncStorage (not Redux/Zustand) | Sufficient complexity for v1; avoids boilerplate; contexts map 1:1 to domain areas |
| Image storage | base64 in PostgreSQL text column | Simplest path for v1; no separate object storage to manage; limit on image size needed at scale |
| Delete button isolation | Sibling `TouchableOpacity` elements | Avoids nested touchable gesture-responder bug in React Native New Architecture |
| Build env vars | `EXPO_PUBLIC_*` baked in at EAS build time | Only method that works for native builds; not configurable at runtime |

---

## 10. Known Limitations & Future Considerations

| Area | Current State | Future Path |
|---|---|---|
| **Destination content** | Hardcoded in TypeScript, 15 cities | CMS / database table, admin UI for content editors |
| **Image storage** | base64 in PostgreSQL | Cloud storage (S3 / GCS), URL references in DB |
| **Auth** | Google only | Add Apple Sign-In (required for iOS App Store) |
| **iOS** | Android only | EAS build for iOS (`--platform ios`), Apple developer account |
| **Push notifications** | None | Expo Notifications (EAS) for trip reminders, new Sparks |
| **Offline** | None | Cache destinations + saved itineraries with React Query `persistQueryClient` |
| **API security** | Open endpoints (no auth middleware) | JWT/session middleware on user-specific routes (itineraries by userId) |
| **Search** | In-memory text filter | Full-text search (PostgreSQL `tsvector`) when destination count grows |
| **Sparks moderation** | None | Content moderation pipeline (Google Vision API safe-search) |
| **Analytics** | None | Posthog / Amplitude for user journey and feature usage |
| **Booking integration** | None | Affiliate links (GetYourGuide, Viator, Booking.com) as revenue path |
