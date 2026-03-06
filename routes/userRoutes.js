const express = require('express');
const router = express.Router();
// Importar o middleware de autenticação
const verifyToken = require('./authMiddleware'); 

// Rota PROTEGIDA: Apenas usuários com um token JWT válido podem acessar.
// A função verifyToken é executada antes do controlador.
router.get('/profile', verifyToken, (req, res) => {
    // Se o código chegou aqui, o token é válido!
    // As informações do usuário (payload do JWT) estão disponíveis em req.user

    console.log('Informações do usuário no token:', req.user);

    // Na vida real, você usaria req.user.id para buscar os dados completos no banco de dados.
    const userProfile = {
        id: req.user.id, // ID extraído do token
        email: req.user.email, // Email extraído do token
        nome: 'Utilizador Autenticado',
        mensagem: 'Bem-vindo ao seu perfil protegido!'
    };

    res.json(userProfile);
});

module.exports = router;