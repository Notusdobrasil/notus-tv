// Este script conecta-se diretamente ao DB para criar um usuário administrador.
// Execute UMA ÚNICA VEZ no seu terminal com: node register-admin.js

const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User'); 

// Carrega variáveis de ambiente (necessário para MONGODB_URI)
dotenv.config();

// Debugging para garantir que MONGODB_URI está disponível ANTES de chamar connectDB
if (!process.env.MONGODB_URI) {
    console.log("❌ ERRO CRÍTICO: MONGODB_URI não está definida em process.env.");
    console.log("Certifique-se de que o arquivo .env está na mesma pasta do register-admin.js.");
    process.exit(1);
} else {
    // Se a URI for lida, exibe uma mensagem de sucesso para confirmação
    console.log("✅ Variáveis de ambiente carregadas. Tentando conectar ao MongoDB...");
}

// Define as credenciais que você deseja usar
// ** TROQUE ESTES VALORES! **
const ADMIN_EMAIL = 'marketing@notus.ind.br';
const ADMIN_PASSWORD = 'N0tus@2025@';

const createAdminUser = async () => {
    // Conecta ao DB
    // A função connectDB usará process.env.MONGODB_URI
    await connectDB();

    try {
        // Verifica se o usuário já existe
        const existingUser = await User.findOne({ email: ADMIN_EMAIL });
        if (existingUser) {
            console.log(`\n✅ Usuário ${ADMIN_EMAIL} já existe no banco de dados. Nenhum registro novo foi criado.`);
            console.log('Execute a AÇÃO 2 para obter o token de login.');
            process.exit(0);
        }

        // Cria o novo usuário. O middleware do User.js cuida da criptografia da senha.
        const newUser = await User.create({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        console.log('\n================================================');
        console.log(`✅ USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!`);
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Senha: ${ADMIN_PASSWORD}`);
        console.log('================================================');
        console.log('AGORA VOCÊ PODE EXCLUIR ESTE ARQUIVO (register-admin.js)');
        console.log('E prosseguir para a AÇÃO 2 para obter o token.');
        
        process.exit(0); // Sai do processo
    } catch (error) {
        console.error('❌ ERRO AO CRIAR USUÁRIO:', error.message);
        process.exit(1); // Sai com erro
    }
};

// Se o DB não conectar, a função createAdminUser não será chamada,
// pois a função connectDB já deve ter o tratamento de erro.
createAdminUser();