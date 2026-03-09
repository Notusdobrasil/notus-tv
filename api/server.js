require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// -----------------------------------------------------
// 1. CONEXÃO COM MONGODB
// -----------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB!'))
  .catch((err) => console.error('❌ Erro MongoDB:', err));

// -----------------------------------------------------
// 2. MODELS (Usuário e Playlist)
// -----------------------------------------------------
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
}, { timestamps: true }));

const Playlist = mongoose.model('Playlist', new mongoose.Schema({
  department: { type: String, required: true, unique: true },
  items: { type: Array, default: [] }
}));

// -----------------------------------------------------
// 3. MIDDLEWARES GLOBAIS
// -----------------------------------------------------
app.use(bodyParser.json());

app.set('trust proxy', 1); // Necessário para cookies em HTTPS na Vercel

app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo_dev_local',
  resave: false, 
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60 
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: true, 
    sameSite: 'none'
  },
}));

// -----------------------------------------------------
// 4. AUTENTICAÇÃO
// -----------------------------------------------------
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ msg: 'Não autenticado.' });
  next();
}

// Rota para o painel verificar se o usuário está logado
app.get('/auth/me', async (req, res) => {
  if (req.session && req.session.userId) {
    const user = await User.findById(req.session.userId);
    if (user) return res.json({ name: user.name });
  }
  res.status(401).json({ msg: 'Não autenticado' });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id.toString();
    // Salva a sessão manualmente antes de responder para evitar erro de redirecionamento
    return req.session.save((err) => {
      if (err) return res.status(500).json({ msg: 'Erro ao salvar sessão' });
      res.json({ msg: 'Login ok', user: { name: user.name } });
    });
  }
  res.status(401).json({ msg: 'Credenciais inválidas' });
});

// -----------------------------------------------------
// 5. ROTAS DE PLAYLIST (Otimizadas para Vercel Rewrites)
// -----------------------------------------------------

app.get('/admin/departments', requireAuth, async (req, res) => {
  const playlists = await Playlist.find({}, 'department');
  res.json(playlists.map(p => p.department));
});

app.get('/admin/playlist/:department', requireAuth, async (req, res) => {
  const doc = await Playlist.findOne({ department: req.params.department });
  res.json(doc ? doc.items : []);
});

app.post('/admin/playlist/:department', requireAuth, async (req, res) => {
  const { department } = req.params;
  const items = req.body;
  
  await Playlist.findOneAndUpdate(
    { department },
    { items },
    { upsert: true, new: true }
  );
  
  res.json({ message: 'Playlist salva no MongoDB!' });
});

app.get('/display/playlist/:department', async (req, res) => {
  const doc = await Playlist.findOne({ department: req.params.department });
  if (!doc || doc.items.length === 0) return res.status(404).json([]);
  res.json(doc.items);
});

// -----------------------------------------------------
// 6. STATUS E EXPORTAÇÃO
// -----------------------------------------------------
app.get('/status', (req, res) => res.json({ status: 'ok', environment: 'Vercel Serverless' }));

module.exports = app;
