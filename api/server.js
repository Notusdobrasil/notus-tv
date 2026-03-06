// server.js
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3001;

// -----------------------------------------------------
// 1. CONEXÃO COM MONGODB
// -----------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Conectado ao MongoDB!'))
  .catch((err) => {
    console.error('❌ Erro ao conectar no MongoDB:', err);
  });

// -----------------------------------------------------
// 2. MODEL DE USUÁRIO (MongoDB)
// -----------------------------------------------------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // HASH com bcrypt
    role: { type: String, default: 'admin' },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

// -----------------------------------------------------
// 3. PLAYLISTS EM ARQUIVO JSON + DIRETÓRIO DE MÍDIA
// -----------------------------------------------------
const PLAYLISTS_FILE = path.join(__dirname, 'playlists.json');
const MEDIA_DIR = path.join(__dirname, 'media_files');

// Garante diretório de mídias
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Carrega playlists do arquivo
let playlists = {};
try {
  const data = fs.readFileSync(PLAYLISTS_FILE, 'utf8');
  playlists = JSON.parse(data);
} catch (e) {
  console.warn(
    `Arquivo ${PLAYLISTS_FILE} não encontrado ou inválido. Iniciando com playlists vazias.`
  );
  playlists = {};
  fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2), 'utf8');
}

// Função para salvar playlists no disco
function savePlaylists() {
  try {
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar o arquivo de playlists:', error);
  }
}

// -----------------------------------------------------
// 4. MIDDLEWARES GLOBAIS
// -----------------------------------------------------
app.use(bodyParser.json());

// Sessão com MongoDB como store
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'segredo_dev_local',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
      httpOnly: true,
      // secure: true, // habilitar se for usar HTTPS
    },
  })
);

// Arquivos estáticos
app.use('/media_files', express.static(MEDIA_DIR));
app.use(express.static(path.join(__dirname))); // display_player.html, admin_dashboard.html, etc.

// -----------------------------------------------------
// 5. AUTENTICAÇÃO COM SESSÃO
// -----------------------------------------------------

// Middleware para proteger rotas de admin
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ msg: 'Não autenticado.' });
  }
  next();
}

// Rota para registrar usuário (use só para criar o primeiro admin)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ msg: 'E-mail já cadastrado.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hash,
      role: role || 'admin',
    });

    res.status(201).json({
      msg: 'Usuário criado com sucesso.',
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ msg: 'Erro interno ao registrar usuário.' });
  }
});

// Login: cria sessão
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'E-mail e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ msg: 'Usuário ou senha inválidos.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ msg: 'Usuário ou senha inválidos.' });
    }

    req.session.userId = user._id.toString();
    req.session.userRole = user.role;

    res.json({
      msg: 'Login realizado com sucesso.',
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ msg: 'Erro interno no login.' });
  }
});

// Logout: destrói sessão
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessão:', err);
      return res.status(500).json({ msg: 'Erro ao sair.' });
    }
    res.clearCookie('connect.sid');
    res.json({ msg: 'Logout realizado.' });
  });
});

// Retorna usuário autenticado (se existir)
app.get('/api/auth/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ msg: 'Não autenticado.' });
    }
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Usuário não encontrado.' });
    }
    res.json(user);
  } catch (err) {
    console.error('Erro em /api/auth/me:', err);
    res.status(500).json({ msg: 'Erro interno.' });
  }
});

// -----------------------------------------------------
// 6. UPLOAD DE MÍDIA COM MULTER (PROTEGIDO)
// -----------------------------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MEDIA_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const uniqueName = `${Date.now()}-${safeName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

app.post('/api/media/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    console.log('📁 Requisição de upload recebida.');

    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    const relativeUrl = `/media_files/${req.file.filename}`;

    return res.json({
      message: 'Upload realizado com sucesso.',
      url: relativeUrl,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error('Erro no upload de mídia:', err);
    return res.status(500).json({ message: 'Erro interno no upload de mídia.' });
  }
});

// -----------------------------------------------------
// 7. ROTAS DE ADMIN (PROTEGIDAS) - PLAYLISTS
// -----------------------------------------------------

// Lista departamentos cadastrados
app.get('/api/admin/departments', requireAuth, (req, res) => {
  return res.json(Object.keys(playlists));
});

// Obtém playlist de um departamento
app.get('/api/admin/playlist/:department', requireAuth, (req, res) => {
  const { department } = req.params;
  return res.json(playlists[department] || []);
});

// Cria/atualiza playlist de um departamento
app.post('/api/admin/playlist/:department', requireAuth, (req, res) => {
  const { department } = req.params;
  const newPlaylist = req.body;

  if (!Array.isArray(newPlaylist)) {
    return res
      .status(400)
      .json({ message: 'O corpo da requisição deve ser um array de itens de mídia.' });
  }

  playlists[department] = newPlaylist;
  savePlaylists();

  console.log(
    `Playlist do departamento "${department}" atualizada com ${newPlaylist.length} itens.`
  );

  return res.status(200).json({
    message: 'Playlist atualizada com sucesso.',
    playlist: newPlaylist,
  });
});

// -----------------------------------------------------
// 8. ROTAS DO DISPLAY (PÚBLICAS)
// -----------------------------------------------------

// Usado pelo display_player.html
app.get('/api/display/playlist/:department', (req, res) => {
  const { department } = req.params;
  const playlist = playlists[department];

  if (!playlist || !Array.isArray(playlist) || playlist.length === 0) {
    return res.status(404).json({ message: 'Playlist não encontrada ou vazia.' });
  }

  // O player aceita array direto
  return res.json(playlist);
});

// -----------------------------------------------------
// 9. STATUS E HTMLs
// -----------------------------------------------------
app.get('/api/status', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'Servidor de Mídia Indoor está online.',
  });
});

// Serve o player
app.get('/display_player.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'display_player.html'));
});

// Serve o dashboard
app.get('/admin_dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin_dashboard.html'));
});

// -----------------------------------------------------
// 10. INICIA SERVIDOR
// -----------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n\n✅ Servidor rodando com sucesso!');
  console.log('-------------------------------------------');
  console.log(`   Status:            http://localhost:${PORT}/api/status`);
  console.log(
    `   Admin (no PC):     http://localhost:${PORT}/admin_dashboard.html`
  );
  console.log(
    `   Player (na rede):  http://192.168.77.242:${PORT}/display_player.html?departamento=Producao`
  );
  console.log('-------------------------------------------\n');
});

