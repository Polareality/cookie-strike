const express = require('express'); 
const axios = require('axios'); 
const path = require('path'); 
const puppeteer = require('puppeteer'); 
require('dotenv').config(); 
const { GoogleGenerativeAI } = require('@google/generative-ai'); 

const app = express(); 
const port = process.env.PORT || 3000; 

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

const API_KEY = process.env.GOOGLE_API_KEY;  
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    if (!url || !/^https?:\/\//.test(url)) {
        return res.status(400).json({ error: 'Invalid URL provided' });
    }

    const formattedUrl = url.replace(/^https?:\/\//, '').replace(/\.com$/, '');

    try {
        console.log('Launching Puppeteer with URL:', url);
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2' });

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

        res.json({
            totalCookies,
            cookieCounts,
            formattedUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving cookies from the provided URL.' });
    }
});

app.post('/summarize', async (req, res) => {
    const { policy } = req.body;
    try {
        const prompt = `Please summarize the following privacy policy into bullet points, listing the pros and cons separately:
        Policy:
        ${policy}`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text() || "No summary generated.";
        
        res.json({ summary });
    } catch (error) {
        console.error("Error in Gemini API request:", error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
