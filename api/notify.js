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
