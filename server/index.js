require('dotenv').config(); // ✅ Load environment variables from .env

// Simple backend for Mona project management app
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../user_data');

app.use(cors());
app.use(express.json());

// Helper to read/write user files
function getUserFile(username) {
  return path.join(DATA_DIR, `${username}.json`);
}

// --- User Account Endpoints ---
app.post('/api/create', (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  const userFile = getUserFile(username);
  if (fs.existsSync(userFile)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  fs.writeFileSync(userFile, JSON.stringify({ password, clients: {} }, null, 2));
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  console.log('POST /api/login', req.body);
  const { username, password } = req.body;
  const userFile = getUserFile(username);
  if (!fs.existsSync(userFile)) {
    return res.status(404).json({ error: 'User not found' });
  }
  const data = JSON.parse(fs.readFileSync(userFile));
  const storedPw = data.password;
  const inputPw = password;
  const bothEmpty = (!storedPw && !inputPw);
  if (!bothEmpty && storedPw !== inputPw) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  res.json({ success: true });
});

// --- User Data Endpoints ---
app.get('/api/data/:username', (req, res) => {
  console.log('GET /api/data/' + req.params.username);
  const { username } = req.params;
  const userFile = getUserFile(username);
  if (!fs.existsSync(userFile)) {
    return res.status(404).json({ error: 'User not found' });
  }
  const data = JSON.parse(fs.readFileSync(userFile));
  res.json(data.clients || {});
});

app.post('/api/data/:username', (req, res) => {
  console.log('POST /api/data/' + req.params.username, req.body);
  const { username } = req.params;
  const userFile = getUserFile(username);
  if (!fs.existsSync(userFile)) {
    return res.status(404).json({ error: 'User not found' });
  }
  const data = JSON.parse(fs.readFileSync(userFile));
  // Accept both { clients: ... } and just the clients object
  if (req.body && typeof req.body === 'object' && req.body.clients) {
    data.clients = req.body.clients;
  } else {
    data.clients = req.body;
  }
  try {
    fs.writeFileSync(userFile, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to write user data:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// --- Shared Clients Endpoints ---
const sharedFile = path.join(DATA_DIR, 'shared.json');

app.get('/api/shared', (req, res) => {
  if (!fs.existsSync(sharedFile)) {
    fs.writeFileSync(sharedFile, '{}');
  }
  const data = JSON.parse(fs.readFileSync(sharedFile));
  res.json(data);
});

app.post('/api/shared', (req, res) => {
  fs.writeFileSync(sharedFile, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// --- Users List (for admin) ---
app.get('/api/users', (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'shared.json');
  const users = files.map(f => ({ username: path.basename(f, '.json') }));
  res.json(users);
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
