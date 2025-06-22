const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// ✅ Dynamically load .env.local or .env.production
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const app = express();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

// --- Connect to MongoDB ---
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// --- Schema & Model ---
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  clients: Object,
});

const User = mongoose.model('User', userSchema);

// --- Routes ---

// Create new account
app.post('/api/create', async (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: 'User already exists' });

    const newUser = new User({ username, password, clients: {} });
    await newUser.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all users (for login UI)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username password');
    if (!Array.isArray(users)) throw new Error("User.find did not return an array");

    const result = users.map(u => ({
      username: u.username,
      hasPassword: !!u.password
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bothEmpty = !user.password && !password;
    if (!bothEmpty && user.password !== password)
      return res.status(403).json({ error: 'Incorrect password' });

    res.json({ clients: user.clients || {} });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save client data
app.post('/api/save', async (req, res) => {
  const { username, clients } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { username },
      { $set: { clients } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Optional legacy support for create-user
app.post('/api/create-user', async (req, res) => {
  req.url = '/api/create'; // forward to original route
  app._router.handle(req, res);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
