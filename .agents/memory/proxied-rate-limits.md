---
name: Proxied Express rate limits
description: Replit's proxy sends X-Forwarded-For, which needs explicit Express trust-proxy configuration for IP rate limiting.
---

# Proxied Express rate limits

When Express is deployed behind Replit's proxy and uses `express-rate-limit`,
configure Express to trust exactly one proxy hop before installing IP-based
limiters.

**Why:** Replit forwards the client address in `X-Forwarded-For`. Without a
trusted proxy setting, express-rate-limit emits `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`
and can treat the proxy address as the client, effectively collapsing a
per-user allowance into a shared limit.

**How to apply:** Set the one-hop trust configuration at app initialization,
before rate-limit middleware. Preserve the user-facing error response from the
limiter rather than replacing all non-2xx responses with a generic client
message.