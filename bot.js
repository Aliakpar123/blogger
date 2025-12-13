const TelegramBot = require('node-telegram-bot-api');

// --- CONFIG ---
const TOKEN = '8336091076:AAGbGW07I940n4gqN36uC2yzSRU5jmDAQXA'; // Token from user
const WEB_APP_URL = 'https://blogger-aliakpar123s-projects.vercel.app';
// --------------

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🤖 Bot started! Waiting for /start...');

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        bot.sendMessage(chatId, "👋 Привет! \n\nНажми кнопку ниже, чтобы открыть Вишлист:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎁 Открыть Вишлист", web_app: { url: WEB_APP_URL } }]
                ]
            }
        });
    }
});
