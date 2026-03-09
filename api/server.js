require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// 1. Conexão MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Conectado'))
  .catch(err => console.error('❌ Erro MongoDB:', err));

// 2. Models
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String
}));

const Playlist = mongoose.model('Playlist', new mongoose.Schema({
  department: { type: String, unique: true },
  items: { type: Array, default: [] }
}));

// 3. Middlewares
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

// --- 4. ROTA PÚBLICA (PARA O PLAYER) ---
// Esta rota DEVE vir antes de qualquer trava de segurança
const publicRouter = express.Router();

publicRouter.get('/display/playlist/:dept', async (req, res) => {
  try {
    const doc = await Playlist.findOne({ department: req.params.dept });
    if (!doc) return res.json([]);
    res.json(doc.items);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar playlist" });
  }
});

// --- 5. ROTAS PRIVADAS (ADM) ---
const adminRouter = express.Router();

// Middleware de trava
const requireAuth = (req, res, next) => {
  if (req.session?.userId) return next();
  res.status(401).json({ msg: 'Não autorizado' });
};

adminRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id.toString();
    return req.session.save(() => res.json({ msg: 'ok', user: { name: user.name } }));
  }
  res.status(401).json({ msg: 'Erro' });
});

adminRouter.get('/auth/me', async (req, res) => {
  if (req.session?.userId) {
    const user = await User.findById(req.session.userId);
    if (user) return res.json({ name: user.name });
  }
  res.status(401).json({ msg: '401' });
});

adminRouter.get('/admin/playlist/:dept', requireAuth, async (req, res) => {
  const doc = await Playlist.findOne({ department: req.params.dept });
  res.json(doc ? doc.items : []);
});

adminRouter.post('/admin/playlist/:dept', requireAuth, async (req, res) => {
  await Playlist.findOneAndUpdate(
    { department: req.params.dept },
    { items: req.body },
    { upsert: true }
  );
  res.json({ msg: 'Salvo' });
});

// --- 6. ATIVAÇÃO DAS ROTAS (ESTRATÉGIA VERCEL) ---
// Mapeamos as rotas para aceitar tanto com /api quanto sem
app.use('/api', publicRouter);
app.use('/api', adminRouter);
app.use('/', publicRouter);
app.use('/', adminRouter);

module.exports = app;
