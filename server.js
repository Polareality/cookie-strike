const express = require('express');         // Import Express framework
const axios = require('axios');            // Import Axios for HTTP requests
const path = require('path');              // Import path module for file paths
const puppeteer = require('puppeteer');    // Import puppeteer
require('dotenv').config();                // Load environment variables from .env file
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Import Google Gemini API SDK

const app = express();                     // Create an Express application
const port = process.env.PORT || 3000;     // Set the port for the server

app.use(express.json());                   // Middleware to parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// Google Gemini API key and initialization
const API_KEY = process.env.GOOGLE_API_KEY;  // Google API key from .env
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use the model you want

// Helper function to validate HTTPS URLs
function validateUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'https:';
    } catch (err) {
        return false;
    }
}

// Endpoint to analyze cookies from a given URL
app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    // Validate URL
    if (!validateUrl(url)) {
        return res.status(400).json({ error: 'Only HTTPS URLs are supported.' });
    }

    const formattedUrl = url.replace(/^https?:\/\//, '').replace(/\.com$/, ''); // Format URL for display
    
    try {
        console.log("Launching Puppeteer...");
        const browser = await puppeteer.launch({
            headless: true,  // Run in headless mode (no UI)
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], // Necessary arguments
            defaultViewport: { width: 1280, height: 800 } // Default viewport for Chromium
        });

        // Log browser events
        browser.on('disconnected', () => console.log('Browser disconnected'));

        const page = await browser.newPage();

        // Log page events for debugging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('error', err => console.error('PAGE ERROR:', err));
        page.on('pageerror', pageErr => console.error('PAGE PAGEERROR:', pageErr));

        console.log("Navigating to URL:", url);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Extend timeout to 60 seconds
        console.log("Page loaded successfully.");
        
        const cookies = await page.cookies();
        console.log("Cookies retrieved:", cookies);
        
        // Define a structure to count different types of cookies
        const cookieCounts = {
            necessary: 0,
            analytics: 0,
            functional: 0,
            performance: 0,
            advertisement: 0,
            other: 0,
            httponly: 0,
        };

        // Classify cookies based on their attributes and names
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

        // Calculate the total number of cookies
        const totalCookies = Object.values(cookieCounts).reduce((sum, count) => sum + count, 0);

        // Close the Puppeteer browser
        await browser.close();

        // Send the cookie analysis as JSON response
        res.json({
            totalCookies,
            cookieCounts,
            formattedUrl
        });
    } catch (error) {
        console.error("Error during Puppeteer operations:", error);
        res.status(500).json({ error: 'Error retrieving cookies from the provided URL.' });
    }
});

// Handle GET requests to /analyze with a meaningful response
app.get('/analyze', (req, res) => {
    res.status(400).send('Please use POST to send data to this endpoint.');
});

// Endpoint to summarize a privacy policy using Google Gemini with pros and cons
app.post('/summarize', async (req, res) => {
    const { policy } = req.body;
    try {
        // Instruction to format summary as bullet points with pros and cons
        const prompt = `Please summarize the following privacy policy into bullet points, listing the pros and cons separately:
        
        Policy:
        ${policy}`;

        const result = await model.generateContent(prompt); // Generate the summary using Google Gemini
        const summary = result.response.text() || "No summary generated.";
        
        res.json({ summary });
    } catch (error) {
        console.error("Error in Gemini API request:", error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
