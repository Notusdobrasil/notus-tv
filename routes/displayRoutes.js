const express = require('express');
const router = express.Router();
const Media = require('../models/Media');

/**
 * @route GET /api/display/:departamento
 * @desc Retorna a playlist de mídias ativas e agendadas para o departamento específico.
 * @access Public
 */
router.get('/:departamento', async (req, res) => {
    const departamento = req.params.departamento;
    // O horário atual do servidor (UTC).
    const now = new Date(); 

    try {
        // A busca é realizada por:
        // 1. Departamento correspondente.
        // 2. Mídia ativa.
        // 3. O 'now' está dentro do intervalo [data_inicio, data_fim].
        const playlist = await Media.find({
            departamento: departamento,
            ativo: true,
            data_inicio: { $lte: now }, 
            data_fim: { $gte: now }     
        })
        // CORREÇÃO: Removido 'titulo' e 'departamento' do select.
        // O player só precisa do tipo e do nome do arquivo para formar a URL.
        .select('tipo_arquivo nome_arquivo')
        .sort({ data_inicio: 1 }); // Ordena pelo início do agendamento

        if (playlist.length === 0) {
            // Retorna array vazio se nenhuma mídia estiver no ar
            return res.status(200).json({ msg: 'Nenhuma mídia agendada para este departamento no momento.', playlist: [] });
        }

        // Formata a playlist para o Player
        const playlistFormatada = playlist.map(midia => ({
            // O título foi removido daqui
            tipo_arquivo: midia.tipo_arquivo,
            // Usamos encodeURI para evitar problemas com espaços no nome do arquivo
            url_midia: `/uploads/${encodeURI(midia.nome_arquivo)}` 
        }));


        res.json(playlistFormatada);
    } catch (error) {
        console.error("Erro ao buscar playlist do display:", error);
        res.status(500).json({ msg: 'Erro ao buscar playlist do display.' });
    }
});

module.exports = router;