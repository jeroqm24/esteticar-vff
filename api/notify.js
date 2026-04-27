// api/notify.js
// Vercel Serverless Function — proxy para ntfy + Resend
// Soporta email al admin Y al cliente en la misma llamada

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { type, title, message, priority, subject, html, to } = req.body;

    const results = {};

    // ── ntfy push ──────────────────────────────────────────────────
    if (type === 'push' || type === 'both') {
        try {
            const topic = process.env.VITE_NTFY_TOPIC || 'esteticar-admin';
            const ntfyRes = await fetch(`https://ntfy.sh/${topic}`, {
                method: 'POST',
                headers: {
                    'Title': title || 'Esteticar',
                    'Priority': String(priority || 3),
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Authorization': 'Basic ' + Buffer.from('esteticar2026:Esteticar11.').toString('base64'),
                },
                body: message || '',
            });
            results.ntfy = ntfyRes.ok ? 'ok' : `error ${ntfyRes.status}`;
        } catch (e) {
            results.ntfy = `error: ${e.message}`;
        }
    }

    // ── Resend email ───────────────────────────────────────────────
    if (type === 'email' || type === 'both') {
        try {
            const resendKey = process.env.VITE_RESEND_API_KEY;
            const adminEmail = process.env.VITE_ADMIN_EMAIL || 'esteticar.manizales@gmail.com';

            // Destinatarios: siempre el admin, y si hay `to` también el cliente
            const recipients = [adminEmail];
            if (to && to.includes('@') && to !== adminEmail) {
                recipients.push(to);
            }

            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendKey}`,
                },
                body: JSON.stringify({
                    from: 'Esteticar <onboarding@resend.dev>',
                    to: recipients,
                    subject: subject || 'Notificación Esteticar',
                    html: html || message || '',
                }),
            });

            const resendBody = await resendRes.json();
            results.resend = resendRes.ok ? 'ok' : `error ${resendRes.status}: ${JSON.stringify(resendBody)}`;
        } catch (e) {
            results.resend = `error: ${e.message}`;
        }
    }

    return res.status(200).json({ ok: true, results });
}