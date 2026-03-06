const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User'); // Assume que você tem este modelo

// Função de proteção (middleware) que checa o token
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Checa se o token está no cabeçalho 'Authorization' e se é 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtém o token do cabeçalho: 'Bearer <token_aqui>' -> queremos apenas o <token_aqui>
            token = req.headers.authorization.split(' ')[1];

            // 2. Verifica e decodifica o token
            // IMPORTANTE: O JWT_SECRET deve estar no seu arquivo .env
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Anexa o usuário decodificado à requisição (req.user)
            // O .select('-password') garante que a senha não seja anexada
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Não autorizado, usuário não encontrado');
            }

            // Continua para o próximo middleware ou rota
            next();

        } catch (error) {
            console.error('Erro de validação de Token:', error.message);
            res.status(401);
            throw new Error('Não autorizado, token inválido');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Não autorizado, token não fornecido');
    }
});

module.exports = { protect };