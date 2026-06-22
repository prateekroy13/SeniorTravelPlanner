---
name: Replit AI Integrations proxy base URL
description: How to call the Replit OpenAI proxy with raw fetch vs the SDK
---

# Replit AI Integrations OpenAI proxy

`AI_INTEGRATIONS_OPENAI_BASE_URL` already includes the API version prefix.

- The OpenAI SDK (`new OpenAI({ baseURL })`) works as-is — it appends `/chat/completions`.
- With **raw fetch**, call `${BASE_URL}/chat/completions` — NOT `${BASE_URL}/v1/chat/completions`.
  The extra `/v1` yields `400 INVALID_ENDPOINT: 'POST /v1/chat/completions' is not supported`.

**Why:** the proxy base URL is pre-versioned; doubling the version segment breaks routing.
**How to apply:** any standalone script hitting the proxy directly (e.g. `scripts/`) should append only `/chat/completions`. Prefer reusing the shared `@workspace/integrations-openai-ai-server` client when possible.
