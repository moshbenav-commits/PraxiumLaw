/**
 * Validates SITE_LOCK_PASSWORD and sets an httpOnly cookie for middleware.
 * Env: SITE_LOCK_PASSWORD, SITE_LOCK_SECRET (must match middleware.js)
 */
const COOKIE_NAME = 'praxium_site_unlock';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedPassword = process.env.SITE_LOCK_PASSWORD;
  const secret = process.env.SITE_LOCK_SECRET;

  if (!expectedPassword || !secret) {
    return res.status(503).json({ error: 'Site lock is not configured' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const submitted = typeof body.password === 'string' ? body.password : '';
  if (submitted !== expectedPassword) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const secure = process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${secret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secure}`,
  );
  return res.status(200).json({ ok: true });
};
