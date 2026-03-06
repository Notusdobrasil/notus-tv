const express = require('express');
const router = express.Router();
const User = require('../models/User'); 

/**
 * @route POST /api/auth/register
 * @desc Registra um novo usuário (Admin)
 * @access Public (Deve ser usado apenas para configurar o primeiro admin)
 */
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verifica se o usuário já existe
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Usuário já registrado.' });
        }

        // Cria e salva o usuário (o middleware criptografa a senha)
        user = await User.create({
            email,
            password
        });
        
        // Emite o token e envia para o cliente
        const token = user.getSignedJwtToken();
        res.status(201).json({ token, msg: 'Usuário registrado com sucesso.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Erro no servidor ao registrar.' });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Autentica o usuário e retorna o token
 * @access Public
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
        return res.status(400).json({ msg: 'Por favor, forneça email e senha.' });
    }

    try {
        // Busca o usuário, incluindo a senha (select: false no model precisa ser sobrescrito com .select('+password'))
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ msg: 'Credenciais inválidas.' });
        }

        // Verifica se a senha corresponde (usando o método do User Model)
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ msg: 'Credenciais inválidas.' });
        }

        // Se a senha estiver correta, emite o token
        const token = user.getSignedJwtToken();
        res.status(200).json({ token, msg: 'Login bem-sucedido.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Erro no servidor ao tentar fazer login.' });
    }
});


module.exports = router;