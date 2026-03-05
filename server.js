const express = require('express');
const axios = require('axios');
const path = require('path');
const puppeteer = require('puppeteer');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MAX_RETRIES = 3;

// ------------------------
// Performance helpers
// ------------------------

// Reuse a single Chromium instance across requests (big speedup)
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

// Simple in-memory cache for identical policy submissions
const summaryCache = new Map();

// Extract text from @google/genai response (handles different shapes)
function extractText(resp) {
  if (resp && typeof resp.text === "string" && resp.text.trim()) {
    return resp.text.trim();
  }

  const parts =
    resp?.candidates?.[0]?.content?.parts ||
    resp?.response?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    const t = parts.map(p => p?.text || "").join("").trim();
    if (t) return t;
  }

  return "";
}

// ------------------------
// Cookie analyzer endpoint
// ------------------------
app.post('/analyze', async (req, res) => {
  const { url } = req.body;
  const formattedUrl = url.replace(/^https?:\/\//, '').replace(/\.com$/, '');

  let page = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Some sites stall / behave differently without a "real" UA
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    // Block unnecessary requests (speeds up a lot)
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const t = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(t)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Retry logic for slow-loading pages
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      try {
        // domcontentloaded is usually faster than networkidle2 on modern sites
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Give scripts a moment to set cookies without waiting forever
        await new Promise(r => setTimeout(r, 1500));

        success = true;
      } catch (error) {
        attempt++;
        console.warn(`Attempt ${attempt} failed. Retrying...`);
      }
    }

    if (!success) {
      if (page) await page.close();
      return res.status(500).json({ error: 'Failed to load the website after multiple attempts.' });
    }

    const cookies = await page.cookies();

    const cookieCounts = {
      necessary: 0,
      analytics: 0,
      functional: 0,
      performance: 0,
      advertisement: 0,
      other: 0,
      httponly: 0,
    };

    cookies.forEach(cookie => {
      const lowerCaseCookie = cookie.name.toLowerCase();

      if (cookie.httpOnly) {
        cookieCounts.httponly++;
      }

      if (lowerCaseCookie.includes('session') || lowerCaseCookie.includes('csrf') || lowerCaseCookie.includes('auth')) {
        cookieCounts.necessary++;
      } else if (lowerCaseCookie.includes('_ga') || lowerCaseCookie.includes('analytics') || lowerCaseCookie.includes('_gid')) {
        cookieCounts.analytics++;
      } else if (lowerCaseCookie.includes('language') || lowerCaseCookie.includes('preferences')) {
        cookieCounts.functional++;
      } else if (lowerCaseCookie.includes('perf') || lowerCaseCookie.includes('load')) {
        cookieCounts.performance++;
      } else if (lowerCaseCookie.includes('ad') || lowerCaseCookie.includes('ads') || lowerCaseCookie.includes('track')) {
        cookieCounts.advertisement++;
      } else {
        cookieCounts.other++;
      }
    });

    // Keep your existing total logic (includes httponly)
    const totalCookies = Object.values(cookieCounts).reduce((sum, count) => sum + count, 0);

    await page.close();

    res.json({ totalCookies, cookieCounts, formattedUrl });
  } catch (error) {
    console.error("Error analyzing cookies:", error);
    try {
      if (page) await page.close();
    } catch (e) {}
    res.status(500).json({ error: 'Error retrieving cookies from the provided URL.' });
  }
});

// ------------------------
// Privacy policy summarizer
// ------------------------
app.post('/summarize', async (req, res) => {
  const { policy } = req.body;

  try {
    const policyText = (policy || "").trim();
    if (!policyText) {
      return res.status(400).json({ error: "Please paste a privacy policy first." });
    }

    // Cache hits return instantly
    if (summaryCache.has(policyText)) {
      return res.json({ summary: summaryCache.get(policyText) });
    }

    // Cap input size (big speedup on massive policies)
    const MAX_CHARS = 30000;
    const clippedPolicy = policyText.length > MAX_CHARS ? policyText.slice(0, MAX_CHARS) : policyText;

    const prompt = `Summarize ONLY the provided text.

Hard requirements:
- NEVER return an empty response.
- If any formatting rule conflicts, output a best-effort answer anyway.
- No paragraphs. Bullets only.
- Do not reference sections not included.

Use this format:

DATA COLLECTED
(max 6 bullets, <= 12 words each)
- ...

HOW IT'S USED / CONTEXT
(max 4 bullets, <= 12 words each)
- ...

USER CHOICE & CONTROLS
(max 4 bullets, <= 12 words each)
- ...

RETENTION / STORAGE
(max 4 bullets, <= 12 words each)
- ...

PRIVACY TRADEOFFS
Pros (exactly 3 bullets, <= 14 words each)
- ...
Cons (exactly 5 bullets, <= 14 words each)
- ...

If a category is not covered, write exactly:
- Not stated.

Policy:
${clippedPolicy}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const summary = extractText(response) || "No summary generated.";

    summaryCache.set(policyText, summary);

    res.json({ summary });
  } catch (error) {
    console.error("Error in Gemini API request:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
