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

// Starts the Google OAuth flow. The Expo app opens this URL in a browser.
// After sign-in, Google redirects to /api/auth/google-callback.
// The app polls /api/auth/session/:id until the user data is ready,
// then dismisses the browser — no exps:// deep links needed.
router.get("/auth/google-initiate", (req, res): void => {
  const { session_id, client_id } = req.query as Record<string, string>;
  if (!session_id || !client_id) {
    res.status(400).send("Missing required params: session_id and client_id");
    return;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const callbackUrl = `${proto}://${host}/api/auth/google-callback`;
  const scope = "openid email profile";
  const state = Buffer.from(JSON.stringify({ session_id })).toString("base64url");

  const googleUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(client_id)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(googleUrl);
});

// Google redirects here after sign-in (token in URL hash, read by JavaScript).
// Fetches user info, stores in sessionStore, shows "Signed in — return to app".
// The native app polls /api/auth/session/:id and closes the browser when ready.
router.get("/auth/google-callback", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Completing sign-in\u2026</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#071209;color:#f0ede8;
         display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{text-align:center;padding:40px 28px;max-width:340px;width:100%}
    .spinner{width:44px;height:44px;border:3px solid #1A6B4A30;border-top-color:#1A6B4A;
             border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px}
    @keyframes spin{to{transform:rotate(360deg)}}
    .icon{font-size:52px;margin-bottom:16px;display:none}
    h2{font-size:20px;font-weight:700;margin-bottom:8px}
    p{color:#8aad96;font-size:14px;line-height:1.5}
    .err{color:#FF6B6B}
    .success h2{color:#f0ede8}
    .success p{color:#52c97c}
  </style>
</head>
<body>
<div class="card" id="root">
  <div class="spinner" id="spinner"></div>
  <p>Completing sign-in\u2026</p>
</div>
<script>
(function(){
  function show(icon,title,body,isErr){
    var r=document.getElementById('root');
    r.className=isErr?'card':'card success';
    r.innerHTML=
      '<div class="icon">'+icon+'</div>'+
      '<h2>'+title+'</h2>'+
      '<p class="'+(isErr?'err':'')+'">'+(body||'')+'</p>';
  }

  var hash=window.location.hash.replace(/^#/,'');
  var params=new URLSearchParams(hash);
  var token=params.get('access_token');
  var stateRaw=params.get('state')||'';

  if(!token){
    show('\u26a0\ufe0f','Sign-in failed','No access token received. Please try again.',true);
    return;
  }

  var parsed;
  try{parsed=JSON.parse(atob(stateRaw.replace(/-/g,'+').replace(/_/g,'/')));}
  catch(e){show('\u26a0\ufe0f','Sign-in failed','Invalid state. Please try again.',true);return;}

  var sessionId=parsed.session_id;

  fetch('https://www.googleapis.com/userinfo/v2/me',{
    headers:{Authorization:'Bearer '+token}
  })
  .then(function(r){return r.json();})
  .then(function(user){
    return fetch(window.location.origin+'/api/auth/store-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({session_id:sessionId,user:user})
    });
  })
  .then(function(r){return r.json();})
  .then(function(data){
    if(data.ok){
      show('\u2705','Signed in!','You can now return to the app.',false);
    } else {
      show('\u26a0\ufe0f','Sign-in failed','Could not save session. Please try again.',true);
    }
  })
  .catch(function(err){
    show('\u26a0\ufe0f','Sign-in failed',err.message||'Network error.',true);
  });
})();
</script>
</body>
</html>`);
});

router.post("/auth/store-session", (req, res): void => {
  const { session_id, user } = req.body as { session_id: string; user: object };
  if (!session_id || !user) {
    res.status(400).json({ ok: false });
    return;
  }
  sessionStore.set(session_id, { user, createdAt: Date.now() });
  res.json({ ok: true });
});

// App polls this every 1-2 seconds. Returns 404 while pending, user object when ready.
// Deletes entry on first successful read (one-time use).
router.get("/auth/session/:id", (req, res): void => {
  const entry = sessionStore.get(req.params.id);
  if (!entry) {
    res.status(404).json({ pending: true });
    return;
  }
  sessionStore.delete(req.params.id);
  res.json(entry.user);
});

export default router;
