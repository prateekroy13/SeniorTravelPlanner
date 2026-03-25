import { Router } from "express";

const router = Router();

interface SessionEntry {
  user: object;
  createdAt: number;
}

const sessionStore = new Map<string, SessionEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of sessionStore.entries()) {
    if (now - val.createdAt > 5 * 60 * 1000) sessionStore.delete(key);
  }
}, 60_000);

router.get("/auth/google-initiate", (req, res) => {
  const { session_id, app_redirect, client_id } = req.query as Record<string, string>;
  if (!session_id || !app_redirect || !client_id) {
    return res.status(400).send("Missing required params");
  }
  const allowedSchemes = ["exp://", "exps://", "mobile://"];
  if (!allowedSchemes.some((s) => app_redirect.startsWith(s))) {
    return res.status(400).send("Invalid app_redirect scheme");
  }

  const callbackUrl = `${req.protocol}://${req.get("host")}/api/auth/google-callback`;
  const scope = "openid email profile";
  const state = Buffer.from(JSON.stringify({ session_id, app_redirect })).toString("base64url");

  const googleUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(client_id)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(googleUrl);
});

router.get("/auth/google-callback", (req, res) => {
  const rawState = req.query.state as string | undefined;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Completing sign-in…</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { font-family: -apple-system, sans-serif; background: #071209; color: #f0ede8;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { text-align: center; padding: 40px 24px; max-width: 320px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #1A6B4A40; border-top-color: #1A6B4A;
               border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #8aad96; font-size: 15px; margin: 0; }
    .err { color: #FF6B6B; }
  </style>
</head>
<body>
<div class="card" id="root">
  <div class="spinner"></div>
  <p>Completing sign-in…</p>
</div>
<script>
(function() {
  var STATE = ${JSON.stringify(rawState ?? "")};

  function show(msg, isErr) {
    document.getElementById('root').innerHTML =
      '<p class="' + (isErr ? 'err' : '') + '">' + msg + '</p>';
  }

  var hash = window.location.hash.replace('#','');
  var params = new URLSearchParams(hash);
  var accessToken = params.get('access_token');
  var stateRaw = params.get('state') || STATE;

  if (!accessToken) {
    show('Sign-in failed — no access token returned.', true);
    return;
  }

  var parsed;
  try { parsed = JSON.parse(atob(stateRaw.replace(/-/g,'+').replace(/_/g,'/'))); }
  catch(e) { show('Sign-in failed — invalid state.', true); return; }

  var sessionId  = parsed.session_id;
  var appRedirect = parsed.app_redirect;

  fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: 'Bearer ' + accessToken }
  })
  .then(function(r) { return r.json(); })
  .then(function(user) {
    return fetch(window.location.origin + '/api/auth/store-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, user: user })
    });
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.ok) {
      var dest = appRedirect + (appRedirect.includes('?') ? '&' : '?') + 'session=' + encodeURIComponent(sessionId);
      show('Sign-in successful! Returning to app…');
      window.location.href = dest;
    } else {
      show('Sign-in failed — could not store session.', true);
    }
  })
  .catch(function(err) {
    show('Sign-in failed — ' + err.message, true);
  });
})();
</script>
</body>
</html>`);
});

router.post("/auth/store-session", (req, res) => {
  const { session_id, user } = req.body as { session_id: string; user: object };
  if (!session_id || !user) return res.status(400).json({ ok: false });
  sessionStore.set(session_id, { user, createdAt: Date.now() });
  res.json({ ok: true });
});

router.get("/auth/session/:id", (req, res) => {
  const entry = sessionStore.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Session not found or expired" });
  sessionStore.delete(req.params.id);
  res.json(entry.user);
});

export default router;
