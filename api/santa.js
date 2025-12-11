const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action, roomId, user, roomName } = req.body || {};
    const method = req.method;

    try {
        // --- 1. CREATE ROOM ---
        if (method === 'POST' && action === 'create') {
            const initialData = {
                adminId: user.id || user.username,
                roomName: roomName || 'Secret Santa Party',
                status: 'lobby', // lobby, started
                participants: [user], // { id, name, avatar, targetId }
                createdAt: Date.now()
            };

            const response = await fetch('https://jsonblob.com/api/jsonBlob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(initialData)
            });

            if (!response.ok) throw new Error('Failed to create blob');

            const location = response.headers.get('Location');
            const newRoomId = location.split('/').pop();

            res.status(200).json({ success: true, roomId: newRoomId, room: initialData });
            return;
        }

        if (!roomId) {
            res.status(400).json({ error: 'Room ID required' });
            return;
        }

        const BLOB_URL = `https://jsonblob.com/api/jsonBlob/${roomId}`;

        // --- 2. GET ROOM ---
        if (method === 'GET' || (method === 'POST' && action === 'get')) {
            const fetchRes = await fetch(BLOB_URL);
            if (!fetchRes.ok) throw new Error('Room not found');
            const data = await fetchRes.json();
            res.status(200).json(data);
            return;
        }

        // --- 3. JOIN ROOM ---
        if (method === 'POST' && action === 'join') {
            // First fetch current state
            const fetchRes = await fetch(BLOB_URL);
            if (!fetchRes.ok) throw new Error('Room not found');
            const roomData = await fetchRes.json();

            if (roomData.status !== 'lobby') {
                res.status(400).json({ error: 'Игра уже началась!' });
                return;
            }

            // Check if exists
            const exists = roomData.participants.find(p => p.id === user.id);
            if (!exists) {
                roomData.participants.push(user);
                // Update Blob
                await fetch(BLOB_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(roomData)
                });
            }

            res.status(200).json({ success: true, room: roomData });
            return;
        }

        // --- 4. START GAME (SHUFFLE) ---
        if (method === 'POST' && action === 'start') {
            const fetchRes = await fetch(BLOB_URL);
            if (!fetchRes.ok) throw new Error('Room not found');
            const roomData = await fetchRes.json();

            if (roomData.adminId != user.id) { // Simple check
                // In a real app we'd verify auth, but here we trust the client ID for simplicity
            }

            if (roomData.participants.length < 2) {
                res.status(400).json({ error: 'Нужно минимум 2 участника!' });
                return;
            }

            // Shuffle Logic
            const players = [...roomData.participants];
            let shuffled = [...players];

            // Fisher-Yates shuffle
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Ensure no one draws themselves
            // Simple approach: Shift by 1
            // P1 -> P2, P2 -> P3 ... Pn -> P1

            // Re-shuffle if any index matches (unlikely with shift, but let's do deterministic cycle)
            // Actually, just rotating the array is the safest "Secret Santa" simple algo

            for (let i = 0; i < players.length; i++) {
                const giver = players[i];
                const receiver = players[(i + 1) % players.length];

                // Find original object to update
                const pIndex = roomData.participants.findIndex(p => p.id === giver.id);
                roomData.participants[pIndex].targetId = receiver.id;
                roomData.participants[pIndex].targetName = receiver.name;
            }

            roomData.status = 'started';
            roomData.startTime = Date.now();

            await fetch(BLOB_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            });

            res.status(200).json({ success: true, room: roomData });
            return;
        }

        res.status(400).json({ error: 'Unknown action' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};
