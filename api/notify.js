// api/notify.js — ntfy push + Gmail SMTP (nodemailer)
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { type, title, message, priority, subject, html, to } = req.body;
    const results = {};

    // ── Telegram ───────────────────────────────────────────────────
    if (type === 'telegram') {
        const token   = process.env.TELEGRAM_BOT_TOKEN;
        const chatId  = process.env.TELEGRAM_CHAT_ID;
        if (!token || !chatId) {
            results.telegram = 'error: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados';
        } else {
            try {
                const res2 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: message || title || '' }),
                });
                const json = await res2.json();
                results.telegram = json.ok ? 'ok' : `error: ${JSON.stringify(json)}`;
            } catch (e) {
                results.telegram = `error: ${e.message}`;
            }
        }
    }

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
                    'Authorization': 'Basic ' + Buffer.from(`${process.env.NTFY_USER || 'esteticar2026'}:${process.env.NTFY_PASSWORD}`).toString('base64'),
                },
                body: message || '',
            });
            results.ntfy = ntfyRes.ok ? 'ok' : `error ${ntfyRes.status}`;
        } catch (e) {
            results.ntfy = `error: ${e.message}`;
        }
    }

    // ── Gmail SMTP ─────────────────────────────────────────────────
    if (type === 'email' || type === 'both') {
        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = process.env.GMAIL_APP_PASSWORD;
        const adminEmail = process.env.VITE_ADMIN_EMAIL || 'esteticar.manizales@gmail.com';

        if (!gmailUser || !gmailPass) {
            results.email = 'error: GMAIL_USER o GMAIL_APP_PASSWORD no configurados en Vercel';
        } else {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: gmailUser, pass: gmailPass },
                });

                // Destinatarios: siempre admin + cliente si tiene correo
                const toList = [adminEmail];
                if (to && to.includes('@') && to !== adminEmail) toList.push(to);

                await transporter.sendMail({
                    from: `Esteticar Manizales <${gmailUser}>`,
                    to: toList.join(', '),
                    subject: subject || 'Notificación Esteticar',
                    html: html || `<p>${message || ''}</p>`,
                });

                results.email = 'ok';
            } catch (e) {
                results.email = `error: ${e.message}`;
            }
        }
    }

    return res.status(200).json({ ok: true, results });
}
