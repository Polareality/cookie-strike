const express = require('express');         // Import Express framework
const axios = require('axios');             // Import Axios for HTTP requests
const path = require('path');               // Import path module for file paths
const puppeteer = require('puppeteer');     // Import Puppeteer for browser automation
require('dotenv').config();                 // Load environment variables from .env file
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Import Google Gemini API SDK

const app = express();                      // Create an Express application
const PORT = 3000;                          // Set the port for the server

app.use(express.json());                    // Middleware to parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// Google Gemini API key and initialization
const API_KEY = process.env.GOOGLE_API_KEY;  // Google API key from .env
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use the model you want

// Endpoint to analyze cookies from a given URL
app.post('/analyze', async (req, res) => {
    const { url } = req.body;
    const formattedUrl = url.replace(/^https?:\/\//, '').replace(/\.com$/, ''); // Format URL for display
    
    try {
        // Launch Puppeteer and create a new browser page
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // Go to the specified URL and wait until the page has fully loaded
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Retrieve all cookies from the page
        const cookies = await page.cookies();

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
        console.error(error);
        res.status(500).json({ error: 'Error retrieving cookies from the provided URL.' });
    }
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
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});







