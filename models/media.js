const mongoose = require('mongoose');

// O Mongoose Schema define a estrutura do documento no MongoDB
const MediaSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: true,
        trim: true // Remove espaços em branco do início/fim
    },
    departamento: {
        type: String,
        required: true,
        enum: ['Producao', 'Cozinha', 'Escritorio', 'VIPSOFT', 'Estoque', 'Ferramentaria', 'Geral'] // Departamentos permitidos
    },
    nome_arquivo: {
        type: String,
        required: true
    },
    caminho_arquivo: {
        type: String,
        required: true
    },
    tipo_arquivo: {
        type: String,
        enum: ['imagem', 'mp4'],
        required: true
    },
    data_upload: {
        type: Date,
        default: Date.now // Define a data de upload automaticamente
    },
    data_inicio: {
        type: Date,
        required: true // Quando a mídia deve começar a ser exibida
    },
    data_fim: {
        type: Date,
        required: true // Quando a mídia deve parar de ser exibida
    },
    ativo: {
        type: Boolean,
        default: true // Permite desativar a exibição sem apagar o agendamento
    }
});

// Exporta o modelo para ser usado nas rotas
module.exports = mongoose.model('Media', MediaSchema);