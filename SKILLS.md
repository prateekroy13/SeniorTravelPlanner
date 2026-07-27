# Skills & Tech Stack

## Overview

SeniorTravelPlanner is a TypeScript monorepo targeting senior travelers. It comprises a mobile app (React Native / Expo), a REST API server, a shared database layer, shared Zod types, and OpenAI/AI SDK integrations.

---
name : pr-describer - description 
desrcription : Writes Pull request descriptions. User when createing a PR, writing a PR or when the user asks to summarize changes for a pull request.

When writing a PR descriptio: 
1. Run 'git diff main... Head; to se all the changes on this branch
2. Write a description following this format : 

## What 
One sentence to explain what this PR does 

## Why 
One or two sentences to explain why this change is needed and what problems it solves. 

## How 
One or two sentences to explain how this change was implemented. 

## Testing 
One or two sentences to explain how this change was tested and what tests were added. 

--


## Languages & Runtimes

- **TypeScript** — used across all packages (strict mode via shared `tsconfig.base.json`)
- **Node.js** — API server runtime
- **JavaScript** — Babel/Metro configs, build scripts

---

## Mobile (artifacts/mobile)

| Skill | Details |
|---|---|
| React Native | Cross-platform mobile UI |
| Expo / Expo Router | File-based routing, EAS builds |
| React Context | Auth, preferences, saved itineraries |
| Custom Hooks | `useDeviceId`, `useSparksPref`, voice hooks |
| UI Components | Badge, PrimaryButton, ScoreRing, DayCard, DestinationCard |
| Error Handling | ErrorBoundary / ErrorFallback pattern |

Key screens: Home (swipe), Sparks feed, Saved itineraries, Itinerary generation, Day detail, Login/Onboarding, Food swipe.

---

## API Server (artifacts/api-server)

| Skill | Details |
|---|---|
| Express (Node) | HTTP server, middleware |
| REST Routes | auth, destinations, itineraries, maps, sparks, health |
| TypeScript build | `build.ts` compilation |

---

## Database (lib/db)

| Skill | Details |
|---|---|
| Drizzle ORM | Schema definition, query builder |
| Schema design | itineraries, sparks, conversations, messages |

---

## Shared Types (lib/api-zod)

Auto-generated Zod schemas shared between server and mobile:

`destination`, `itinerary`, `itineraryGeneratedData`, `dayPlan`, `dayActivity`, `restaurant`, `sideTrip`, `transportOption`, `userPreferences`, `generateItineraryBody`, `createItineraryBody`, `healthStatus`

---

## AI & Integrations (lib/integrations)

| Skill | Details |
|---|---|
| OpenAI SDK | Chat completions, image generation, batch processing |
| AI SDK (Vercel) | Streaming responses |
| Voice (React) | `useVoiceRecorder`, `useVoiceStream`, `useAudioPlayback` |
| Audio worklet | Custom `audio-playback-worklet.js` for low-latency playback |
| Image client | Server-side image generation via OpenAI |
| Batch utils | Batch request processing utilities |

---

## Tooling & Infrastructure

| Tool | Purpose |
|---|---|
| pnpm workspaces | Monorepo package management |
| Replit | Development/deployment environment |
| EAS (Expo) | Mobile app builds and OTA updates |
| Git | Version control (post-merge hook in `scripts/`) |

---

## Package Structure

```
SeniorTravelPlanner/
├── artifacts/
│   ├── api-server/          # Express backend
│   └── mobile/              # Expo React Native app
├── lib/
│   ├── api-zod/             # Shared Zod types
│   ├── db/                  # Drizzle ORM + schema
│   ├── integrations/        # OpenAI integrations (legacy)
│   ├── integrations-openai-ai-react/   # Client-side AI hooks
│   └── integrations-openai-ai-server/  # Server-side AI clients
└── scripts/                 # Build & utility scripts
```
