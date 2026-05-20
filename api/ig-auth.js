// api/ig-auth.js
// Inicia el flujo OAuth de Instagram Business Login.
// Visitar: https://esteticar-vff.vercel.app/api/ig-auth
export default function handler(req, res) {
  const authUrl = new URL('https://www.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id',      process.env.IG_APP_ID);
  authUrl.searchParams.set('redirect_uri',   process.env.IG_REDIRECT_URI);
  authUrl.searchParams.set('response_type',  'code');
  authUrl.searchParams.set('scope',          'instagram_business_basic,instagram_business_manage_messages');
  res.redirect(302, authUrl.toString());
}
