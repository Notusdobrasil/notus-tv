const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');

// Helper function para gerar o JWT (Token)
const generateToken = (id) => {
    // Expira em 30 dias
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Registrar novo usuário
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // 1. Validação simples de campos
    if (!username || !email || !password) {
        res.status(400);
        throw new Error('Por favor, preencha todos os campos.');
    }

    // 2. Checar se o usuário já existe
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('Usuário já registrado.');
    }

    // 3. Criar usuário (a senha é criptografada no modelo User antes de salvar)
    const user = await User.create({
        username,
        email,
        password,
    });

    if (user) {
        // 4. Resposta de sucesso com o token
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Dados inválidos do usuário.');
    }
});

// @desc    Autenticar usuário & obter token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // 1. Checar email
    const user = await User.findOne({ email });

    // 2. Checar senha (comparePassword é um método definido no modelo User)
    if (user && (await user.matchPassword(password))) {
        // 3. Resposta de sucesso com o token
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        res.status(401); // Unauthorized
        throw new Error('Email ou senha inválidos.');
    }
});

module.exports = {
    registerUser,
    loginUser,
};  