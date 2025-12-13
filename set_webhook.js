const https = require('https');

const TOKEN = '8336091076:AAGbGW07I940n4gqN36uC2yzSRU5jmDAQXA';
const WEBHOOK_URL = 'https://blogger-aliakpar123s-projects.vercel.app/api/webhook';

const url = `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${WEBHOOK_URL}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response from Telegram:', data);
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
