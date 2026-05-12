const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

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

    console.log(`[NeuralCore] Translating: "${text.substring(0, 20)}..." from ${sourceLang} to ${targetLang}`);

    try {
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        
        const response = await axios.get(apiUrl, { timeout: 10000 }); // 10s timeout

        if (response.data && response.data.responseData) {
            const translatedText = response.data.responseData.translatedText;
            console.log(`[Success] Translation complete: ${translatedText.substring(0, 20)}...`);
            res.json({ translatedText });
        } else if (response.data && response.data.responseStatus !== 200) {
            console.error('[API Error]', response.data.responseDetails);
            res.status(response.data.responseStatus).json({ error: response.data.responseDetails });
        } else {
            throw new Error('Unexpected API response format');
        }
    } catch (error) {
        console.error('[Neural Link Error]', error.message);
        if (error.code === 'ECONNABORTED') {
            res.status(504).json({ error: 'Translation timeout. Neural link congested.' });
        } else {
            res.status(500).json({ error: 'Neural processing failure. Check connection.' });
        }
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
