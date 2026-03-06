const jwt = require('jsonwebtoken');

// Chave Secreta - USE A MESMA CHAVE USADA PARA CRIAR O TOKEN NO SEU authController.js
// IMPORTANTE: Em um projeto real, esta chave deve vir de uma variável de ambiente (process.env.JWT_SECRET)
const JWT_SECRET = 'sua_chave_secreta_muito_segura'; 

/**
 * Middleware para verificar o token JWT em rotas protegidas.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 * @param {function} next - Função para passar o controle para o próximo middleware/rota.
 */
const verifyToken = (req, res, next) => {
    // 1. Obter o cabeçalho de autorização
    const authHeader = req.headers.authorization;

    // 2. Verificar se o cabeçalho existe e tem o formato 'Bearer <token>'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Se não houver token ou o formato for inválido, retorna 401
        return res.status(401).json({ msg: 'Acesso negado. Token não fornecido ou formato inválido.' });
    }

    // 3. Extrair o token (removendo "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // 4. Verificar o token
        // O método verify() decodifica o payload se o token for válido e assinado corretamente
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 5. Anexar o payload decodificado (dados do usuário) à requisição
        req.user = decoded; 
        
        // 6. Prosseguir para a próxima função na pipeline (o controlador da rota)
        next();
    } catch (err) {
        // Se a verificação falhar (ex: token expirado, chave secreta errada)
        if (err.name === 'TokenExpiredError') {
             return res.status(401).json({ msg: 'Token expirado. Por favor, faça login novamente.' });
        }
        return res.status(403).json({ msg: 'Token inválido ou não autorizado.' });
    }
};

module.exports = verifyToken;