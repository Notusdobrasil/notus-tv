require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    password: { type: String, required: true }, // armazenar HASH (bcrypt)
    role: { type: String, default: 'admin' }, // opcional, se quiser vários perfis
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

// -----------------------------------------------------
// 3. CONFIG DE PLAYLIST (arquivo JSON)
// -----------------------------------------------------
const PLAYLISTS_FILE = path.join(__dirname, 'playlists.json');
const MEDIA_DIR = path.join(__dirname, 'media_files');

// Garante que a pasta de mídia existe
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
app.use(cors());
app.use(bodyParser.json());
app.use('/media_files', express.static(MEDIA_DIR));
app.use(express.static(path.join(__dirname))); // permite servir display_player.html, admin_dashboard.html etc.

// -----------------------------------------------------
// 5. AUTENTICAÇÃO COM JWT (MongoDB)
// -----------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'segredo-local';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

// Middleware para proteger rotas
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Esperado: "Bearer token..."
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, userDecoded) => {
    if (err) {
      return res.status(403).json({ msg: 'Token inválido ou expirado.' });
    }
    req.user = userDecoded; // { id, email, role }
    next();
  });
}

// -----------------------------------------------------
// 5.1 Rota opcional para criar um usuário (apenas para testes)
// ⚠️ Depois de ter pelo menos um usuário criado, você pode remover ou proteger esta rota.
// -----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ msg: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ msg: 'E-mail já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hash,
      role: role || 'admin',
    });

    return res.status(201).json({
      msg: 'Usuário criado com sucesso.',
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    return res.status(500).json({ msg: 'Erro interno ao registrar usuário.' });
  }
});

// -----------------------------------------------------
// 5.2 LOGIN: autentica usuário no MongoDB e devolve JWT
// -----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // validação básica
    if (!email || !password) {
      return res.status(400).json({ msg: 'E-mail e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ msg: 'Usuário ou senha inválidos.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Usuário ou senha inválidos.' });
    }

    // monta payload do token
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });

    return res.json({
      msg: 'Login realizado com sucesso.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ msg: 'Erro interno no login.' });
  }
});

// (Opcional) rota para retornar dados do usuário autenticado
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Usuário não encontrado.' });
    }
    res.json(user);
  } catch (err) {
    console.error('Erro em /auth/me:', err);
    res.status(500).json({ msg: 'Erro interno.' });
  }
});

// -----------------------------------------------------
// 6. ROTAS DE ADMIN (PROTEGIDAS COM JWT)
//    Lendo/escrevendo playlists.json
// -----------------------------------------------------

// Lista todos os departamentos
app.get('/api/admin/departments', authenticateToken, (req, res) => {
  return res.json(Object.keys(playlists));
});

// Obtém a playlist de um departamento
app.get('/api/admin/playlist/:department', authenticateToken, (req, res) => {
  const { department } = req.params;
  return res.json(playlists[department] || []);
});

// Cria/substitui a playlist de um departamento
app.post('/api/admin/playlist/:department', authenticateToken, (req, res) => {
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
// 7. ROTAS DO DISPLAY (PÚBLICAS, SEM LOGIN)
// -----------------------------------------------------
app.get('/api/display/playlist/:department', (req, res) => {
  const { department } = req.params;
  const playlist = playlists[department];

  if (!playlist || !Array.isArray(playlist) || playlist.length === 0) {
    return res.status(404).json({ message: 'Playlist não encontrada ou vazia.' });
  }

  // O player aceita tanto { playlist: [...] } quanto um array puro.
  return res.json(playlist);
});

// -----------------------------------------------------
// 8. STATUS E SERVIR HTMLs
// -----------------------------------------------------
app.get('/api/status', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'Servidor de Mídia Indoor está online.',
  });
});

// Serve o display_player.html (player)
app.get('/display_player.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'display_player.html'));
});

// Serve o admin_dashboard.html (painel)
app.get('/admin_dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin_dashboard.html'));
});

// -----------------------------------------------------
// 9. START SERVER
// -----------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n\n✅ Servidor rodando com sucesso!');
  console.log('-------------------------------------------');
  console.log(`   Status:            http://localhost:${PORT}/api/status`);
  console.log(
    `   Admin (no seu PC): http://localhost:${PORT}/admin_dashboard.html`
  );
  console.log(
    `   Player (na rede):  http://192.168.77.242:${PORT}/display_player.html?departamento=Producao`
  );
  console.log('-------------------------------------------\n');
});
