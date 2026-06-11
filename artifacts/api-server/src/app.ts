import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import router from "./routes";

const app: Express = express();

// 5 AI generations per IP per hour — protects OpenAI spend
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many itinerary requests. Please try again in an hour." },
});

// 200 general API requests per IP per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tuttle</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #071209;
      color: #f0ede8;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
    }
    .card {
      background: #0f1f13;
      border: 1px solid #1A6B4A40;
      border-radius: 20px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 72px;
      height: 72px;
      background: #1A6B4A;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #f0ede8;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .tagline {
      font-size: 15px;
      color: #8aad96;
      margin-bottom: 36px;
      line-height: 1.5;
    }
    .divider {
      height: 1px;
      background: #1A6B4A30;
      margin: 0 0 28px;
    }
    .steps {
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 28px;
    }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .step-num {
      width: 28px;
      height: 28px;
      min-width: 28px;
      border-radius: 50%;
      background: #1A6B4A;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }
    .step-text strong {
      display: block;
      font-size: 14px;
      color: #e8dfd5;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .step-text span {
      font-size: 13px;
      color: #6b8a74;
      line-height: 1.4;
    }
    .badge {
      display: inline-block;
      background: #E8A95118;
      color: #E8A951;
      border: 1px solid #E8A95140;
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✈️</div>
    <h1>Tuttle</h1>
    <p class="tagline">AI-powered travel itineraries designed<br>for the 60+ traveller</p>
    <div class="divider"></div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">
          <strong>Download Expo Go</strong>
          <span>Free app available on the App Store and Google Play</span>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">
          <strong>Open the link on your phone</strong>
          <span>Visit <strong style="color:#8aad96">senior-travel-planner.replit.app</strong> on your phone's browser</span>
        </div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">
          <strong>Tap "Open in Expo Go"</strong>
          <span>The app will launch and guide you from there</span>
        </div>
      </div>
    </div>
    <span class="badge">📱 Mobile App</span>
  </div>
</body>
</html>`);
});

app.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy - Tuttle</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #071209;
      color: #f0ede8;
      line-height: 1.6;
      padding: 48px 20px;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: #0f1f13;
      border: 1px solid #1A6B4A40;
      border-radius: 20px;
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }
    .updated {
      font-size: 13px;
      color: #6b8a74;
      margin-bottom: 28px;
    }
    h2 {
      font-size: 18px;
      color: #8aad96;
      margin: 28px 0 10px;
    }
    p, li {
      font-size: 15px;
      color: #e8dfd5;
      margin-bottom: 10px;
    }
    ul {
      padding-left: 22px;
      margin-bottom: 10px;
    }
    a {
      color: #E8A951;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Tuttle Privacy Policy</h1>
    <p class="updated">Last updated: June 10, 2026</p>

    <p>Tuttle ("we", "us", "our") provides AI-powered travel itinerary planning. This policy explains what information we collect, how we use it, and your choices.</p>

    <h2>Information We Collect</h2>
    <ul>
      <li><strong>Account information:</strong> When you sign in with Google, we receive your name, email address, and profile picture.</li>
      <li><strong>Travel preferences:</strong> Travel pace, budget level, and interests you select in the app.</li>
      <li><strong>Itineraries:</strong> Trips and itineraries you generate, save, or edit.</li>
      <li><strong>User content:</strong> Photos, captions, and likes you post to Sparks, our community travel-sharing feature.</li>
      <li><strong>Device identifier:</strong> A randomly generated identifier stored on your device, used to support features like Sparks likes for users browsing as a guest.</li>
    </ul>

    <h2>How We Use Information</h2>
    <ul>
      <li>To create your account and save your trips and preferences.</li>
      <li>To generate AI-powered itinerary recommendations &mdash; your destination and preference details are sent to OpenAI's API to produce these recommendations.</li>
      <li>To display content you choose to share publicly via Sparks to other users of the app.</li>
      <li>To authenticate you securely via Google Sign-In.</li>
    </ul>

    <h2>Third-Party Services</h2>
    <ul>
      <li><strong>Google:</strong> used for account sign-in and authentication.</li>
      <li><strong>OpenAI:</strong> used to generate itinerary content based on your travel preferences and selected destinations.</li>
    </ul>
    <p>We do not sell your personal information to third parties.</p>

    <h2>Data Storage &amp; Security</h2>
    <p>Your information is stored in a secure database. We take reasonable technical measures to protect your data from unauthorized access.</p>

    <h2>Data Retention &amp; Deletion</h2>
    <p>You may request deletion of your account and associated data at any time by contacting us at the email address below.</p>

    <h2>Children's Privacy</h2>
    <p>Tuttle is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>

    <h2>Changes to This Policy</h2>
    <p>We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date.</p>

    <h2>Contact Us</h2>
    <p>If you have questions about this privacy policy or wish to request data deletion, contact us at <a href="mailto:prateek.roy13@gmail.com">prateek.roy13@gmail.com</a>.</p>
  </div>
</body>
</html>`);
});

app.get("/delete-account", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Delete Your Account - Tuttle</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #071209;
      color: #f0ede8;
      line-height: 1.6;
      padding: 48px 20px;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: #0f1f13;
      border: 1px solid #1A6B4A40;
      border-radius: 20px;
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }
    .updated {
      font-size: 13px;
      color: #6b8a74;
      margin-bottom: 28px;
    }
    h2 {
      font-size: 18px;
      color: #8aad96;
      margin: 28px 0 10px;
    }
    p, li {
      font-size: 15px;
      color: #e8dfd5;
      margin-bottom: 10px;
    }
    ul, ol {
      padding-left: 22px;
      margin-bottom: 10px;
    }
    a {
      color: #E8A951;
    }
    .highlight {
      background: #14241a;
      border: 1px solid #1A6B4A40;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Delete Your Tuttle Account</h1>
    <p class="updated">Last updated: June 10, 2026</p>

    <p>This page explains how to request deletion of your Tuttle account and associated data, and what happens to your information when you do.</p>

    <h2>How to Request Deletion</h2>
    <div class="highlight">
      <ol>
        <li>Send an email to <a href="mailto:prateek.roy13@gmail.com?subject=Delete%20my%20Tuttle%20account">prateek.roy13@gmail.com</a> from the email address associated with your Google account on Tuttle.</li>
        <li>Use the subject line "Delete my Tuttle account" and include the email address linked to your account.</li>
        <li>We will verify your request and confirm by email once it has been processed.</li>
      </ol>
    </div>
    <p>Requests are processed within 30 days of receipt.</p>

    <h2>What Gets Deleted</h2>
    <ul>
      <li>Your account profile information (name, email address, profile picture) received from Google Sign-In.</li>
      <li>All itineraries you have generated or saved.</li>
      <li>Your saved travel preferences.</li>
    </ul>

    <h2>What May Be Retained</h2>
    <ul>
      <li><strong>Sparks posts:</strong> Photos and captions you've shared publicly to Sparks are not linked to your account email, so they are not automatically removed when your account is deleted. If you'd like specific Sparks posts removed, mention the display name used and approximate posting date in your deletion request.</li>
    </ul>

    <h2>Deleting Individual Items Without Deleting Your Account</h2>
    <p>You can delete individual saved itineraries at any time directly within the app: open the <strong>Saved</strong> tab, select an itinerary, and choose <strong>Delete</strong>. This does not require deleting your whole account.</p>

    <h2>Contact Us</h2>
    <p>For any questions about this process, contact us at <a href="mailto:prateek.roy13@gmail.com">prateek.roy13@gmail.com</a>.</p>
  </div>
</body>
</html>`);
});

app.use("/api/itineraries/generate", generateLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

export default app;
