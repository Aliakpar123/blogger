const TelegramBot = require('node-telegram-bot-api');

// Token provided by user
const TOKEN = '8336091076:AAGbGW07I940n4gqN36uC2yzSRU5jmDAQXA';
const WEB_APP_URL = 'https://blogger-aliakpar123s-projects.vercel.app';

// Initialize bot without polling (webhook mode)
const bot = new TelegramBot(TOKEN);

module.exports = async (req, res) => {
    try {
        const { body } = req;

        // Vercel sometimes receives weird pings, ensure it's a message
        if (body && body.message) {
            const chatId = body.message.chat.id;
            const text = body.message.text;

            if (text === '/start') {
                await bot.sendMessage(chatId, "👋 Привет! \n\nЖми кнопку, чтобы открыть Вишлист 👇", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🎁 Открыть Вишлист", web_app: { url: WEB_APP_URL } }]
                        ]
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }

    // Always reply 200 to Telegram
    res.status(200).send('OK');
};
