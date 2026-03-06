require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
// Removido multer diskStorage e fs para evitar erros de leitura na Vercel

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

// Novo Model para Playlist (Substituindo o arquivo JSON)
const Playlist = mongoose.model('Playlist', new mongoose.Schema({
  department: { type: String, required: true, unique: true },
  items: { type: Array, default: [] }
}));

// -----------------------------------------------------
// 3. MIDDLEWARES GLOBAIS
// -----------------------------------------------------
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo_dev_local',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true em produção
    sameSite: 'lax'
  },
}));

// -----------------------------------------------------
// 4. AUTENTICAÇÃO
// -----------------------------------------------------
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ msg: 'Não autenticado.' });
  next();
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id.toString();
    return res.json({ msg: 'Login ok', user: { name: user.name } });
  }
  res.status(401).json({ msg: 'Credenciais inválidas' });
});

// -----------------------------------------------------
// 5. ROTAS DE PLAYLIST (Substituindo FS por MongoDB)
// -----------------------------------------------------

// Lista departamentos
app.get('/api/admin/departments', requireAuth, async (req, res) => {
  const playlists = await Playlist.find({}, 'department');
  res.json(playlists.map(p => p.department));
});

// Obtém playlist
app.get('/api/admin/playlist/:department', requireAuth, async (req, res) => {
  const doc = await Playlist.findOne({ department: req.params.department });
  res.json(doc ? doc.items : []);
});

// Salva playlist
app.post('/api/admin/playlist/:department', requireAuth, async (req, res) => {
  const { department } = req.params;
  const items = req.body;
  
  await Playlist.findOneAndUpdate(
    { department },
    { items },
    { upsert: true, new: true }
  );
  
  res.json({ message: 'Playlist salva no MongoDB!' });
});

// ROTA DO DISPLAY (PÚBLICA)
app.get('/api/display/playlist/:department', async (req, res) => {
  const doc = await Playlist.findOne({ department: req.params.department });
  if (!doc || doc.items.length === 0) return res.status(404).json([]);
  res.json(doc.items);
});

// -----------------------------------------------------
// 6. STATUS E EXPORTAÇÃO (PADRÃO VERCEL)
// -----------------------------------------------------
app.get('/api/status', (req, res) => res.json({ status: 'ok', environment: 'Vercel Serverless' }));

// IMPORTANTE: Exportar para a Vercel
module.exports = app;
