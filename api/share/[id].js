const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { id } = req.query;

    if (!id) {
        res.status(400).json({ error: 'Missing UUID' });
        return;
    }

    try {
        const response = await fetch(`https://jsonblob.com/api/jsonBlob/${id}`);

        if (!response.ok) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        console.error("Proxy Fetch Error", e);
        res.status(500).json({ error: e.message });
    }
};
