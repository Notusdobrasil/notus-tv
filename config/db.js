const mongoose = require('mongoose');

const connectDB = async () => {
    // 1. Verificação crítica: A URI está definida?
    if (!process.env.MONGODB_URI) {
        console.error("❌ ERRO: A variável MONGODB_URI não foi carregada no ambiente.");
        console.error("Por favor, verifique se o arquivo .env está na mesma pasta raiz do projeto.");
        // Lança um erro para interromper o processo
        throw new Error("MONGODB_URI não definida."); 
    }

    try {
        // 2. Conexão ao MongoDB
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`\n✅ MongoDB conectado com sucesso: ${conn.connection.host}`);
    } catch (err) {
        // 3. Tratamento de Erro na Conexão
        console.error(`\n❌ ERRO FATAL AO CONECTAR AO DB: ${err.message}`);
        console.error('--------------------------------------------------------------------------');
        console.error('POSSÍVEIS CAUSAS DO TIMEOUT (10000ms):');
        console.error('1. FIREWALL NO MONGODB ATLAS: Seu IP Público não está autorizado.');
        console.error('2. Credenciais na MONGODB_URI estão incorretas (usuário e senha do Atlas).');
        console.error('--------------------------------------------------------------------------');
        process.exit(1); // Encerra o processo com falha
    }
};

module.exports = connectDB;