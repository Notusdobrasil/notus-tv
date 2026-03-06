const express = require('express');
const multer = require('multer');
const router = express.Router();
const Media = require('../models/Media');
const path = require('path');
const fs = require('fs'); // Módulo 'fs' importado no topo

// --- Configuração do Multer para Salvar Arquivos ---
// Define o destino (uploads/) e o nome do arquivo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 'uploads/' é onde os arquivos serão salvos. Certifique-se que a pasta existe!
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        // Nomeia o arquivo com timestamp + nome original (para evitar conflitos)
        cb(null, `${Date.now()}-${file.originalname}`); 
    }
});

// Filtro para aceitar apenas formatos de mídia (MP4, JPG, PNG)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato de arquivo não suportado.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 100 // Limite de 100MB (ajuste conforme necessário)
    } 
});

// --- Rotas de Mídia (Administração) ---

// 1. UPLOAD E CRIAÇÃO DE MÍDIA (POST /api/media)
router.post('/', upload.single('mediaFile'), async (req, res) => {
    // Verifica se o arquivo foi carregado
    if (!req.file) {
        return res.status(400).json({ msg: 'Nenhum arquivo enviado.' });
    }

    // O Multer armazena o caminho do arquivo em req.file.path
    const { titulo, departamento, data_inicio, data_fim } = req.body;

    // Obter a extensão do arquivo
    const extension = path.extname(req.file.originalname).substring(1);
    const tipo = ['mp4', 'avi', 'mov', 'wmv'].includes(extension.toLowerCase()) ? 'mp4' : 'imagem';

    try {
        const novaMidia = new Media({
            titulo,
            departamento,
            nome_arquivo: req.file.filename,
            caminho_arquivo: req.file.path, // Ex: uploads/1678886400000-video.mp4
            tipo_arquivo: tipo,
            data_inicio,
            data_fim,
        });

        const midiaSalva = await novaMidia.save();
        res.status(201).json(midiaSalva);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Erro ao salvar a mídia.', error: error.message });
    }
});


// 2. LISTAR TODAS AS MÍDIAS (GET /api/media)
router.get('/', async (req, res) => {
    try {
        const midias = await Media.find().sort({ data_inicio: -1 }); // Lista da mais nova para a mais antiga
        res.json(midias);
    } catch (error) {
        res.status(500).json({ msg: 'Erro ao buscar mídias.' });
    }
});

// =======================================================
// 3. BUSCAR MÍDIA POR ID (GET /api/media/:id)
// ESSA ROTA ESTAVA FALTANDO E PROVOCAVA O ERRO 404/HTML!
// =======================================================
router.get('/:id', async (req, res) => {
    try {
        const mediaId = req.params.id;
        
        // Busque o item pelo ID
        const mediaItem = await Media.findById(mediaId); 

        if (!mediaItem) {
            // Se não encontrar, retorna 404 em JSON
            return res.status(404).json({ error: 'Mídia não encontrada.' });
        }

        // Retorna o objeto JSON do item
        res.json(mediaItem);
    } catch (error) {
        console.error('Erro ao buscar item de mídia por ID:', error);
        // Em caso de ID inválido do Mongo, também retorna erro
        res.status(500).json({ error: 'Erro interno do servidor ou ID inválido.' });
    }
});


// 4. ATUALIZAR AGENDAMENTO (PUT /api/media/:id)
// Nota: Não faremos re-upload do arquivo aqui, apenas atualização de metadados
router.put('/:id', async (req, res) => {
    // Pegamos todos os dados do corpo da requisição.
    const updateData = req.body; 

    try {
        // Usamos findByIdAndUpdate, que é mais eficiente e permite atualização completa.
        const midiaAtualizada = await Media.findByIdAndUpdate(
            req.params.id,
            {
                titulo: updateData.titulo,
                departamento: updateData.departamento,
                data_inicio: updateData.data_inicio,
                data_fim: updateData.data_fim,
                ativo: updateData.ativo
            },
            { new: true } // Retorna o documento atualizado
        );

        if (!midiaAtualizada) {
            return res.status(404).json({ msg: 'Mídia não encontrada.' });
        }
        
        res.json({ msg: 'Mídia atualizada com sucesso!', midia: midiaAtualizada });

    } catch (error) {
        console.error("Erro ao atualizar a mídia:", error);
        res.status(500).json({ msg: 'Erro ao atualizar a mídia.', details: error.message });
    }
});

// 5. EXCLUIR MÍDIA (DELETE /api/media/:id)
router.delete('/:id', async (req, res) => {
    try {
        const midia = await Media.findById(req.params.id);

        if (!midia) {
            return res.status(404).json({ msg: 'Mídia não encontrada.' });
        }

        // Apaga o arquivo físico usando o 'fs' importado no topo
        fs.unlink(midia.caminho_arquivo, (err) => {
            if (err) console.error(`Erro ao apagar o arquivo: ${err.message}`);
        });

        await Media.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Mídia removida com sucesso.' });
    } catch (error) {
        res.status(500).json({ msg: 'Erro ao excluir a mídia.' });
    }
});

module.exports = router;