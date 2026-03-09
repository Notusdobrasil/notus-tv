require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// Conexão MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Conectado'))
  .catch(err => console.error('❌ Erro MongoDB:', err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String
}));

const Playlist = mongoose.model('Playlist', new mongoose.Schema({
  department: { type: String, unique: true },
  items: { type: Array, default: [] }
}));

// Middlewares
app.use(bodyParser.json());
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  }
}));

// --- ROTEAMENTO ---
const router = express.Router();

// Auth
router.get('/auth/me', async (req, res) => {
  if (req.session?.userId) {
    const user = await User.findById(req.session.userId);
    if (user) return res.json({ name: user.name });
  }
  res.status(401).json({ msg: 'Não autenticado' });
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id.toString();
    return req.session.save(() => res.json({ msg: 'ok', user: { name: user.name } }));
  }
  res.status(401).json({ msg: 'Erro' });
});

// Playlists
router.get('/admin/playlist/:dept', async (req, res) => {
  const doc = await Playlist.findOne({ department: req.params.dept });
  res.json(doc ? doc.items : []);
});

router.post('/admin/playlist/:dept', async (req, res) => {
  await Playlist.findOneAndUpdate(
    { department: req.params.dept },
    { items: req.body },
    { upsert: true }
  );
  res.json({ msg: 'Salvo' });
});

// VITAL PARA VERCEL: 
// Aceita tanto requisições com /api quanto sem, evitando o 404
app.use('/api', router);
app.use('/', router);

module.exports = app;
