import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

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
  <title>SeniorTravel</title>
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
    <h1>SeniorTravel</h1>
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
          <span>Visit <strong style="color:#8aad96">seniortravel.replit.app</strong> on your phone's browser</span>
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

app.use("/api", router);

export default app;
