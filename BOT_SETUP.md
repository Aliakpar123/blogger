# Telegram Bot Setup Guide

## 1. Fix "Blue Menu Button" (Menu Button)
You mentioned the user doesn't see the button on the left. This is the **Menu Button**.
To fix this, go to **@BotFather** and:

1.  Send `/mybots`
2.  Select your bot.
3.  Click **Bot Settings**.
4.  Click **Menu Button**.
5.  Click **Configure Menu Button**.
6.  Send the link to your Web App (e.g., `https://blogger-aliakpar123s-projects.vercel.app`).
7.  Give it a title (e.g., "Open App").

Now users will always see the configured button in the bottom left.

---

## 2. Send "Open App" Button on /start
To make the bot reply with a big "Open App" button immediately after `/start`, use this script.

### Setup
1.  Add dependency: `npm install node-telegram-bot-api`
2.  Create `bot.js` (see below).
3.  Run: `node bot.js`

### Code (`bot.js`)
```javascript
const TelegramBot = require('node-telegram-bot-api');

// REPLACE WITH YOUR TOKEN from @BotFather
const token = 'YOUR_BOT_TOKEN_HERE'; 
const WEB_APP_URL = 'https://blogger-aliakpar123s-projects.vercel.app';

const bot = new TelegramBot(token, {polling: true});

console.log('Bot is running...');

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, "Welcome via bot! Click below to launch:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🚀 Open Wishlist App", web_app: { url: WEB_APP_URL } }]
            ]
        }
    });
});
```
