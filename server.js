const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db', 'database.json');

app.use(cors());
app.use(bodyParser.json());

// Ensure DB directory and file exist
if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE));
}
if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        users: [],
        wishes: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

// Helper to read/write DB
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API Routes

// GET /api/users - Get all users (public info)
app.get('/api/users', (req, res) => {
    const db = readDB();
    // Return only public fields
    const users = db.users.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        donated: u.donated || '0 ₸',
        subscribers: u.subscribers || 0,
        isPrivate: u.isPrivate
    }));
    res.json(users);
});

// GET /api/users/:id - Get specific user
app.get('/api/users/:id', (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.id == req.params.id);
    if (user) {
        res.json({
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            donated: user.donated || '0 ₸',
            subscribers: user.subscribers || 0,
            isPrivate: user.isPrivate
        });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

// POST /api/users - Register or Update User
app.post('/api/users', (req, res) => {
    const userData = req.body;
    const db = readDB();

    // Simple logic: if ID exists, update, else push
    // We expect the client to send 'id' (Telegram ID)
    let userIndex = -1;
    if (userData.id) {
        userIndex = db.users.findIndex(u => u.id === userData.id);
    }

    if (userIndex >= 0) {
        // Update existing
        db.users[userIndex] = { ...db.users[userIndex], ...userData };
    } else {
        // New User
        // Generate simple ID if not provided (though for Telegram apps usually ID is passed)
        if (!userData.id) userData.id = Date.now();

        // Add default fields
        userData.donated = userData.donated || '0 ₸';
        userData.subscribers = userData.subscribers || 0;

        db.users.push(userData);
    }

    writeDB(db);
    res.json({ success: true, user: userData });
});

// GET /api/wishes/:userId
app.get('/api/wishes/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    const userWishes = db.wishes[userId] || [];
    res.json(userWishes);
});

// POST /api/wishes - Save ALL wishes for a user (simplest for syncing from localstorage initially)
app.post('/api/wishes', (req, res) => {
    const { userId, wishes } = req.body;
    if (!userId) return res.status(400).json({ error: "No userId" });

    const db = readDB();
    db.wishes[userId] = wishes || [];
    writeDB(db);
    res.json({ success: true });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
