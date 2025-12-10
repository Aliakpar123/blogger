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

    const LEADERBOARD_UUID = '019b0851-d0bd-7943-9e47-56b0277b1aee';
    const BLOB_URL = `https://jsonblob.com/api/jsonBlob/${LEADERBOARD_UUID}`;

    try {
        if (req.method === 'GET') {
            const fetchRes = await fetch(`${BLOB_URL}?t=${Date.now()}`);
            if (!fetchRes.ok) throw new Error('Blob fetch failed');
            const data = await fetchRes.json();
            res.status(200).json(data);
            return;
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            const fetchRes = await fetch(`${BLOB_URL}?t=${Date.now()}`);
            let users = [];
            if (fetchRes.ok) {
                users = await fetchRes.json();
            }

            const currentUser = req.body;
            if (!currentUser || !currentUser.id) {
                res.status(400).json({ error: 'Invalid user data' });
                return;
            }

            // Deduplicate
            const userMap = new Map();
            if (Array.isArray(users)) {
                users.forEach(u => userMap.set(String(u.id), u));
            }

            // Check if user exists to preserve extra fields if needed, or just overwrite
            // We just overwrite with new data + timestamp
            userMap.set(String(currentUser.id), {
                ...currentUser,
                donated: currentUser.donated || '0 ₸',
                subscribers: currentUser.subscribers || 0,
                lastSeen: Date.now()
            });

            const newUsers = Array.from(userMap.values());

            // Save back
            await fetch(BLOB_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUsers)
            });

            res.status(200).json({ success: true });
            return;
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};
