const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const db = require('./db/db');
db.initDB();

const translationCache = new Map();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Translation Endpoint
app.post('/api/translate', async (req, res) => {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || !sourceLang || !targetLang) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const cacheKey = `${sourceLang}:${targetLang}:${text.toLowerCase().trim()}`;
    if (translationCache.has(cacheKey)) {
        const cachedResult = translationCache.get(cacheKey);
        console.log(`[Cache Hit] Serving translation from cache: "${cachedResult.substring(0, 20)}..."`);
        db.saveHistory(text, cachedResult, sourceLang, targetLang).catch(err => {
            console.error('[Database Error] Failed to save history in background:', err.message);
        });
        return res.json({ translatedText: cachedResult });
    }

    console.log(`[NeuralCore] Translating: "${text.substring(0, 20)}..." from ${sourceLang} to ${targetLang}`);

    try {
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        
        const response = await axios.get(apiUrl, { timeout: 10000 }); // 10s timeout

        if (response.data && response.data.responseData) {
            const translatedText = response.data.responseData.translatedText;
            console.log(`[Success] Translation complete: ${translatedText.substring(0, 20)}...`);
            
            // Cache the translation result
            translationCache.set(cacheKey, translatedText);
            
            // Save to history asynchronously in background
            db.saveHistory(text, translatedText, sourceLang, targetLang).catch(err => {
                console.error('[Database Error] Failed to save history in background:', err.message);
            });

            res.json({ translatedText });
        } else if (response.data && response.data.responseStatus !== 200) {
            console.error('[API Error]', response.data.responseDetails);
            res.status(response.data.responseStatus).json({ error: response.data.responseDetails });
        } else {
            throw new Error('Unexpected API response format');
        }
    } catch (error) {
        console.error('[Neural Link Error]', error.message);
        const getSafeStatus = (err) => {
            if (err.response && err.response.status >= 100 && err.response.status < 600) {
                return err.response.status;
            }
            return 500;
        };
        const safeStatus = getSafeStatus(error);

        if (error.response && error.response.data && error.response.data.responseDetails) {
            res.status(safeStatus).json({ error: error.response.data.responseDetails });
        } else if (error.response) {
            res.status(safeStatus).json({ error: `MyMemory API Error: ${error.response.statusText || error.message}` });
        } else if (error.code === 'ECONNABORTED') {
            res.status(504).json({ error: 'Translation timeout. Neural link congested.' });
        } else {
            res.status(500).json({ error: 'Neural processing failure. Check connection.' });
        }
    }
});

// History Log Retrieval Endpoint
app.get('/api/history', async (req, res) => {
    try {
        const history = await db.getHistory();
        res.json(history);
    } catch (error) {
        console.error('[History Retrieve Error]', error.message);
        res.status(500).json({ error: 'Failed to retrieve translation history' });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'CORE_ACTIVE', uptime: process.uptime() });
});

const server = app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`  NEURAL_BACKEND INITIALIZED`);
    console.log(`  PORT: ${PORT}`);
    console.log(`  STATUS: CORE_ACTIVE`);
    console.log(`=========================================\n`);
});

server.on('error', (err) => {
    console.error('[FATAL] Server Error:', err);
});
