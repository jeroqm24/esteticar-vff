// api/sheets.js
// Vercel Serverless Function — proxy para Google Sheets
// Evita errores CORS del navegador

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const sheetsUrl = process.env.VITE_SHEETS_WEBHOOK_URL;
    if (!sheetsUrl) return res.status(500).json({ error: 'SHEETS_URL not configured' });

    try {
        if (req.method === 'GET') {
            // Leer fechas ocupadas
            const response = await fetch(sheetsUrl);
            const data = await response.json();
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            // Escribir cita o cliente
            const response = await fetch(sheetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body),
            });
            const data = await response.json();
            return res.status(200).json(data);
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}