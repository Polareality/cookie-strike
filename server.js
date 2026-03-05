const express = require('express');
const axios = require('axios');
const path = require('path');
const puppeteer = require('puppeteer'); // Ensure this is the full puppeteer package
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = process.env.GOOGLE_API_KEY;  // Google API key from .env
const ai = new GoogleGenAI({ apiKey:API_KEY});

const MAX_RETRIES = 3; // Retry limit for failed page loads

app.post('/analyze', async (req, res) => {
    const { url } = req.body;
    const formattedUrl = url.replace(/^https?:\/\//, '').replace(/\.com$/, '');

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Avoid permission errors
            timeout: 60000 // Increase timeout to 60 seconds
        });

        const page = await browser.newPage();

        // Block unnecessary requests (images, fonts, stylesheets)
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
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
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Wait for network idle
                await page.waitForSelector('body'); // Wait for the body to be fully loaded
                success = true;
            } catch (error) {
                attempt++;
                console.warn(`Attempt ${attempt} failed. Retrying...`);
            }
        }

        if (!success) {
            await browser.close();
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

        const totalCookies = Object.values(cookieCounts).reduce((sum, count) => sum + count, 0);
        await browser.close();

        res.json({ totalCookies, cookieCounts, formattedUrl });
    } catch (error) {
        console.error("Error analyzing cookies:", error);
        res.status(500).json({ error: 'Error retrieving cookies from the provided URL.' });
    }
});

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

app.post('/summarize', async (req, res) => {
  const { policy } = req.body;

  try {
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
${policy}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const summary = extractText(response) || "No summary generated.";
    res.json({ summary });
  } catch (error) {
    console.error("Error in Gemini API request:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


