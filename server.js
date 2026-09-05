const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 4000;

// Data directory — private, never served statically
const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscribers.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));

app.use(express.json());

// Serve ONLY index.html and robot.png — NOT the data/ folder
app.use(express.static(__dirname, {
  index: 'index.html',
  // Block /data/* explicitly
  setHeaders: (res, filePath) => {
    if (filePath.includes('/data/') || filePath.includes('\\data\\')) {
      res.status(403).end();
    }
  }
}));

// Block any direct access to /data route
app.get('/data*', (req, res) => res.status(403).json({ error: 'Forbidden' }));

// POST /api/notify — save email
app.post('/api/notify', (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Invalid email address.' });
  }

  try {
    const raw  = fs.readFileSync(DATA_FILE, 'utf8');
    const list = JSON.parse(raw);

    const alreadyExists = list.some(e => e.email.toLowerCase() === email.toLowerCase());
    if (alreadyExists) {
      return res.json({ status: 'already', message: "You're already on the list!" });
    }

    list.push({
      email,
      subscribedAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    });

    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
    console.log(`[Notify] New subscriber: ${email} (total: ${list.length})`);

    return res.json({ status: 'success', message: "You're on the list!" });
  } catch (err) {
    console.error('[Notify] Error saving email:', err);
    return res.status(500).json({ status: 'error', message: 'Server error. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Roboverz Launching-Soon server running at http://localhost:${PORT}`);
});
