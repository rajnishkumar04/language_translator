const axios = require('axios');

async function testTranslation() {
    try {
        const response = await axios.post('http://localhost:5000/api/translate', {
            text: 'Hello world',
            sourceLang: 'en-GB',
            targetLang: 'de-DE'
        });
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testTranslation();
