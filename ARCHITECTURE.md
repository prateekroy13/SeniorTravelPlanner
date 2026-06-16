# Architecture — Tuttle (Senior Travel Planner)

---

## 1. System Context

```mermaid
flowchart TD
    User["👴 Senior Traveler"]
    App["📱 Tuttle Android App\nEAS Build · Google Play"]
    API["⚙️ Express API\nsenior-travel-planner.replit.app"]
    PG[("🗄️ PostgreSQL\nReplit managed")]
    OpenAI["🤖 OpenAI API\nItinerary generation"]
    Maps["🗺️ Google Maps API\nPhotos · Distance Matrix"]
    OAuth["🔐 Google OAuth2\nSign-in"]
    Play["📦 Google Play Store\nDistribution"]

    User -->|uses| App
    Play -->|distributes| App
    App -->|HTTPS| API
    API <-->|read · write| PG
    API -->|chat completion| OpenAI
    API -->|place photos · walking times| Maps
    API -->|OAuth flow| OAuth
```

---

## 2. Mobile App Architecture

### 2.1 Screen Navigation (Expo Router)

```mermaid
flowchart TD
    Root["_layout.tsx\nRoot — fonts · auth guard · stack"]

    Root --> Login["login.tsx\nGoogle Sign-In · Guest mode"]
    Root --> Onboarding["onboarding.tsx\nFirst-run preferences"]
    Root --> Tabs

    subgraph Tabs["(tabs) — authenticated"]
        Home["index.tsx\nFeatured destinations · Top Picks"]
        Sparks["sparks.tsx\nCommunity photo feed"]
        Saved["saved.tsx\nSaved itineraries list"]
        Profile["profile.tsx\nUser profile · preferences"]
    end

    Home -->|tap city| SwipeAttr["swipe/destinationId\nAttraction swipe cards"]
    Home -->|tap city| SwipeFood["food-swipe/destinationId\nRestaurant swipe cards"]
    Home -->|generate| Generate["itinerary/generate.tsx\nAI generation form"]
    Saved -->|tap trip| ItinView["itinerary/id\nDay list"]
    ItinView -->|tap day| DayDetail["itinerary/day/dayId\nSchedule · attractions"]
    Sparks -->|tap upload| Upload["sparks/upload.tsx\nPhoto upload form"]
    Sparks -->|tap author| AuthorPage["sparks/user/authorName\nAll Sparks by author"]
```

### 2.2 State Management

```mermaid
flowchart LR
    subgraph Contexts["React Contexts — persisted to AsyncStorage"]
        Auth["AuthContext\n─────────────\nuser: AuthUser\nsigningIn: bool\nguestMode: bool\n─────────────\nsignInWithGoogle()\nsignOut()\nloginWithData()"]
        Prefs["PreferencesContext\n─────────────\npace\nbudget\ndietaryNeeds\naccessibilityNeeds\nfontSize\nhasCompletedOnboarding\n─────────────\nupdatePreferences()"]
        Saved2["SavedItinerariesContext\n─────────────\nitineraries[]\n─────────────\nsaveItinerary()\ndeleteItinerary()"]
    end

    subgraph Query["TanStack Query — server state"]
        Q1["destinations\nGET /api/destinations"]
        Q2["sparks\nGET /api/sparks"]
        Q3["place-photo\nGET /api/maps/place-photo"]
    end

    Contexts --> Screens["Screens & Components"]
    Query --> Screens
```

---

## 3. API Server Architecture

### 3.1 Route Map

```
Express App
│
├── GET  /health
├── GET  /privacy                        Static HTML
├── GET  /delete-account                 Static HTML
│
└── /api
    ├── GET  /destinations
    ├── GET  /destinations/search
    ├── GET  /destinations/:id/attractions
    ├── GET  /destinations/:id/restaurants
    │
    ├── GET  /maps/place-photo           Google Places proxy (in-memory cache)
    │
    ├── GET    /itineraries
    ├── POST   /itineraries/generate     OpenAI + Distance Matrix
    ├── GET    /itineraries/:id
    └── DELETE /itineraries/:id
    │
    ├── GET  /sparks
    ├── POST /sparks
    ├── POST /sparks/:id/like
    └── GET  /sparks/user/:author
    │
    ├── GET  /auth/google-initiate
    ├── GET  /auth/google-callback
    ├── POST /auth/store-session
    └── GET  /auth/session/:id
```

### 3.2 Middleware Stack

```mermaid
flowchart TD
    Req["Incoming Request"] --> CORS["cors()\nAllow all origins"]
    CORS --> JSON["express.json()\nParse body"]
    JSON --> Router["Route modules\ndestinations · itineraries\nsparks · maps · auth"]
    Router --> Res["Response"]
```

---

## 4. Database Architecture

### 4.1 Entity Relationship

```mermaid
erDiagram
    ITINERARIES {
        serial id PK
        text user_id
        text title
        text city
        text country
        integer days
        text travel_month
        jsonb generated_data
        jsonb preferences
        timestamp created_at
        timestamp updated_at
    }

    SPARKS {
        serial id PK
        text author_name
        text image_data
        text caption
        text location_name
        text location_type
        text destination_city
        text destination_country
        integer likes_count
        timestamp created_at
    }

    SPARK_LIKES {
        integer spark_id FK
        text device_id
    }

    AUTH_SESSIONS {
        text session_id PK
        jsonb user_data
        timestamp created_at
        timestamp expires_at
    }

    SPARKS ||--o{ SPARK_LIKES : "has likes"
```

### 4.2 ORM Access Pattern

| Table | Access | Reason |
|---|---|---|
| `itineraries` | Drizzle ORM (typed queries) | Complex schema, type safety needed |
| `sparks` + `spark_likes` | Raw `pg` pool | JOIN + conditional UPDATE, simpler as raw SQL |
| `auth_sessions` | Raw `pg` pool | Simple key-value with TTL, no schema benefit |

---

## 5. Authentication Flow

### 5.1 Native Android (Custom Scheme Redirect)

```mermaid
sequenceDiagram
    participant App as Android App
    participant CCT as Chrome Custom Tab
    participant API as API Server
    participant Google as Google OAuth
    participant DB as PostgreSQL

    App->>CCT: openAuthSessionAsync(initiateUrl, "tuttle://auth-callback")
    CCT->>API: GET /auth/google-initiate?session_id=X&redirect_uri=tuttle://auth-callback
    API->>Google: Redirect → accounts.google.com/o/oauth2/v2/auth (state = base64url{session_id, redirect_uri})
    Google-->>CCT: User consents → /auth/google-callback#access_token=...
    CCT->>API: GET /auth/google-callback (HTML page + inline JS)
    API->>Google: GET /userinfo/v2/me
    Google-->>API: {id, name, email, picture}
    API->>DB: INSERT auth_sessions (TTL 5 min)
    API-->>CCT: Redirect → tuttle://auth-callback?session=X
    Note over CCT,App: tuttle:// detected — CCT auto-dismissed
    App->>API: GET /auth/session/X (up to 5 retries)
    API->>DB: DELETE WHERE session_id = X RETURNING user_data
    DB-->>API: user_data (one-time read)
    API-->>App: User object
    App->>App: saveUser() → AsyncStorage
```

### 5.2 Web (Polling)

```mermaid
sequenceDiagram
    participant Web as Web Browser (Tab 1)
    participant NewTab as New Tab
    participant API as API Server
    participant DB as PostgreSQL

    Web->>NewTab: window.open(/auth/google-initiate)
    Note over Web: Poll /auth/session/:id every 1s (max 120s)
    NewTab->>API: OAuth flow (same as native, no redirect_uri)
    API->>DB: INSERT auth_sessions
    API-->>NewTab: Show "Signed in! Close this window"
    Web->>API: GET /auth/session/:id (poll finds session)
    API->>DB: DELETE session RETURNING user_data
    DB-->>API: user_data
    API-->>Web: User object
    Web->>Web: saveUser() → AsyncStorage
```

### 5.3 Session Security Properties

| Property | Implementation |
|---|---|
| Expiry | 5-minute TTL, cleaned up every 60 seconds |
| One-time use | `DELETE ... RETURNING` — consumed on first read |
| CSRF protection | Random `session_id` in OAuth state param |
| Key exposure | No client secret on mobile; Google client ID is safe to expose |

---

## 6. AI Itinerary Generation

```mermaid
flowchart TD
    Form["User fills generate form\ncity · days · month · preferences\nlikedAttractions · likedRestaurants"]
    Form --> Post["POST /api/itineraries/generate"]
    Post --> DM["getRealTravelTimes()\nGoogle Distance Matrix API\nwalking times between liked attractions"]
    DM --> OAI["OpenAI Chat Completion\n· Senior travel expert persona\n· City + user preferences\n· Liked places\n· Real walking times injected into prompt"]
    OAI --> Resp["Structured JSON response\ndays → attractions + meals per day"]
    Resp --> Insert["Drizzle INSERT into itineraries\ngenerated_data stored as JSONB"]
    Insert --> Client["Response to app\nSavedItinerariesContext + AsyncStorage"]
```

---

## 7. Sparks Community Feed

```mermaid
flowchart LR
    subgraph Upload
        U1["User picks photo\nImagePicker"] --> U2["POST /api/sparks\nauthor_name · image_data\nlocation · city · country"]
        U2 --> U3["INSERT into sparks\nlikes_count = 0"]
    end

    subgraph Feed
        F1["GET /api/sparks?deviceId=X"] --> F2["SELECT sparks\nLEFT JOIN spark_likes\nliked_by_me per device"]
        F2 --> F3["TanStack Query\ninfinite scroll card feed"]
    end

    subgraph Like
        L1["Tap like button"] --> L2["POST /api/sparks/:id/like\n{deviceId}"]
        L2 --> L3["INSERT or DELETE spark_likes\nUPDATE likes_count ±1"]
        L3 --> L4["Return {liked, likesCount}"]
    end
```

---

## 8. Infrastructure & Deployment

### 8.1 Hosting Overview

```mermaid
flowchart TD
    subgraph Replit["☁️ Replit — always-on"]
        API2["Express API\nNode.js · TypeScript"]
        PG2[("PostgreSQL")]
        Secrets["Secrets\nDATABASE_URL\nOPENAI_API_KEY\nGOOGLE_MAPS_API_KEY\nGOOGLE_CALLBACK_ORIGIN"]
        API2 <--> PG2
        API2 --- Secrets
    end

    subgraph EAS["⚙️ EAS Build"]
        Profile["production profile\nautoIncrement: true\nEnv vars baked in at build time"]
        AAB["Android .aab\nversionCode N"]
        Profile --> AAB
    end

    subgraph Play["📱 Google Play Console"]
        Closed2["Closed Testing\nv1.0.0 build 4"]
        Open["Open Testing"]
        Prod2["Production"]
        Closed2 --> Open --> Prod2
    end

    GH["GitHub\nmaster branch"] -->|auto-deploy| Replit
    GH -->|eas build| EAS
    EAS -->|upload .aab| Play
```

### 8.2 Build & Release Pipeline

```mermaid
flowchart TD
    Push["git push to GitHub master"]
    Push --> A["Replit auto-redeploys\napi-server"]
    Push --> B["Developer runs\neas build --platform android\n--profile production"]
    A --> Live["API live at\nsenior-travel-planner.replit.app"]
    B --> Build2["EAS cloud build\n~13 minutes"]
    Build2 --> DL["Download .aab\nfrom EAS dashboard"]
    DL --> Upload2["Play Console\nClosed testing → Create new release\nUpload .aab"]
    Upload2 --> Rollout["Start rollout to testers"]
```

### 8.3 Monorepo Structure

```
pnpm-workspace.yaml
│
├── artifacts/mobile          @tuttle/mobile
├── artifacts/api-server      @tuttle/api-server
├── lib/db                    @workspace/db
├── lib/integrations-*        @workspace/integrations-openai-*
├── lib/api-spec              @workspace/api-spec
├── lib/api-client-react      @workspace/api-client-react
└── lib/api-zod               @workspace/api-zod
```

---

## 9. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth method | Server-side OAuth + session DB | No client secret on device; works across Android + web; no native SDK setup |
| OAuth browser dismissal | `tuttle://` custom scheme + `openAuthSessionAsync` | Auto-dismisses CCT; no "close this window" UX needed |
| Destination data | In-memory TypeScript constant | Fast (no DB read), version-controlled; acceptable for v1 with ≤30 cities |
| ORM | Drizzle (structured) + raw `pg` (ad-hoc) | Type safety where schema is complex; brevity for simple queries |
| State management | React Context + AsyncStorage | Sufficient for v1; avoids Redux boilerplate; contexts map 1:1 to domain |
| Image storage | base64 in PostgreSQL text column | Simplest path for v1; no object storage to manage |
| Delete button | Sibling `TouchableOpacity` elements | Avoids nested-touchable gesture bug in React Native New Architecture |
| Build env vars | `EXPO_PUBLIC_*` baked in at EAS build | Only method available for native builds; not runtime-configurable |

---

## 10. Known Limitations & Future Roadmap

```mermaid
flowchart LR
    subgraph Now["v1 — Current"]
        N1["Android only"]
        N2["15 hardcoded destinations"]
        N3["Google Sign-In only"]
        N4["base64 image storage"]
        N5["Open API endpoints"]
        N6["No push notifications"]
        N7["No offline support"]
    end

    subgraph Next["v2 — Near Term"]
        V1["iOS build\nApple Sign-In"]
        V2["CMS for destinations\nadmin UI"]
        V3["Cloud image storage\nS3 / GCS"]
        V4["API auth middleware\nJWT on user routes"]
        V5["Push notifications\nEAS Notifications"]
    end

    subgraph Future["v3 — Growth"]
        F1["Booking integrations\nGetYourGuide · Viator affiliate"]
        F2["Full-text search\nPostgreSQL tsvector"]
        F3["Content moderation\nGoogle Vision safe-search"]
        F4["Analytics\nPostHog · Amplitude"]
        F5["Offline mode\nReact Query persistQueryClient"]
    end

    Now --> Next --> Future
```
