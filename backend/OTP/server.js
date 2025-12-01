// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// --- Config from .env
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '5', 10);

// Twilio client
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM; // your Twilio number
let twilioClient = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
}

// --- Database (file otp_demo.db)
const db = new Database('otp_demo.db');
db.exec(`
CREATE TABLE IF NOT EXISTS otp_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL
);
`);

// --- Utils
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}
function nowMs() { return Date.now(); }
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
const MAX_SENDS_PER_HOUR_PER_PHONE = 5;
const MAX_OTP_ATTEMPTS = 5;

// --- Rate limiter for API (per IP)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// --- Helper: count recent sends to a phone in last hour
function countRecentSends(phone) {
  const hourAgo = nowMs() - 60 * 60 * 1000;
  const row = db.prepare(`SELECT COUNT(*) as c FROM otp_requests WHERE phone = ? AND created_at >= ?`).get(phone, hourAgo);
  return row ? row.c : 0;
}

// --- send SMS via Twilio (or fallback to console log)
async function sendSms(phone, message) {
  if (twilioClient && TWILIO_FROM) {
    return twilioClient.messages.create({
      body: message,
      from: TWILIO_FROM,
      to: phone
    });
  } else {
    // Fallback for development
    console.log(`(MOCK SMS) To: ${phone} — ${message}`);
    return Promise.resolve({ sid: 'MOCK' });
  }
}

// --- API: request OTP
app.post('/api/request-otp', async (req, res) => {
  try {
    const phone = (req.body.phone || '').trim();
    if (!phone || !/^\+?\d{7,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone format. Example: +911234567890' });
    }

    // Per-phone rate limit
    const recent = countRecentSends(phone);
    if (recent >= MAX_SENDS_PER_HOUR_PER_PHONE) {
      return res.status(429).json({ error: 'Too many OTP requests for this phone. Try later.' });
    }

    const otp = generateOtp();
    const created = nowMs();
    const expires = created + OTP_TTL_MS;

    db.prepare(`INSERT INTO otp_requests (phone, otp, created_at, expires_at, used, attempts) VALUES (?, ?, ?, ?, 0, 0)`).run(phone, otp, created, expires);

    const message = `Your OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minute(s).`;
    await sendSms(phone, message);

    // Generic response for privacy
    return res.json({ ok: true, message: 'If reachable, an OTP was sent to the phone number provided.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- API: verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const phone = (req.body.phone || '').trim();
    const otp = (req.body.otp || '').trim();
    if (!phone || !otp) return res.status(400).json({ error: 'phone and otp are required' });

    const row = db.prepare(`SELECT * FROM otp_requests WHERE phone = ? ORDER BY created_at DESC LIMIT 1`).get(phone);
    if (!row) return res.status(400).json({ error: 'Invalid or expired OTP' });

    if (row.used) return res.status(400).json({ error: 'OTP already used' });
    if (row.expires_at < nowMs()) return res.status(400).json({ error: 'OTP expired' });

    if (row.attempts >= MAX_OTP_ATTEMPTS) return res.status(429).json({ error: 'Too many attempts. Request new OTP.' });

    if (row.otp !== otp) {
      db.prepare(`UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?`).run(row.id);
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    // mark used
    db.prepare(`UPDATE otp_requests SET used = 1 WHERE id = ?`).run(row.id);

    // find or create user
    let user = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone);
    const created = nowMs();
    if (!user) {
      const r = db.prepare(`INSERT INTO users (phone, created_at) VALUES (?, ?)`).run(phone, created);
      user = { id: r.lastInsertRowid, phone, created_at: created };
    }

    // create JWT token
    const token = jwt.sign({ sub: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '1h' });

    return res.json({ ok: true, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- Protected route example
app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header (Bearer token)' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid Authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(`SELECT id, phone, created_at FROM users WHERE id = ?`).get(payload.sub);
    return res.json({ ok: true, user });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Serve frontend static files from /public
app.use(express.static('public'));

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
