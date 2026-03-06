import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LogOut, Upload, Edit, Trash2, Clock, Calendar, CheckCircle, XCircle, Search, User, Zap, AlertTriangle, ChevronDown, PlusCircle } from 'lucide-react';

// URL base da API
const API_BASE_URL = 'http://localhost:3000/api';

// Lista de departamentos para o filtro e formulário
const DEPARTAMENTOS = [
    'Producao', 'Cozinha', 'Escritorio', 'VIPSOFT', 'Estoque', 'Ferramentaria', 'Geral'
];

// Componente principal da Aplicação
const App = () => {
    const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);
    const [view, setView] = useState('list'); // 'list' | 'upload' | 'edit'
    const [mediaList, setMediaList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editMediaData, setEditMediaData] = useState(null);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // --- Efeito de Inicialização/Autenticação ---
    useEffect(() => {
        setIsAuthenticated(!!token);
        if (token) {
            fetchMediaList();
        }
    }, [token]);

    // --- Função de Chamada da API com Autorização ---
    const apiCall = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        }
    });

    // Atualiza o token no interceptor sempre que o state mudar
    useEffect(() => {
        apiCall.defaults.headers['Authorization'] = token ? `Bearer ${token}` : '';
    }, [token]);

    // --- Funções de Autenticação ---

    const handleLogin = async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
            const newToken = res.data.token;
            localStorage.setItem('adminToken', newToken);
            setToken(newToken);
            setIsAuthenticated(true);
            setLoading(false);
        } catch (err) {
            setError('Falha no login. Verifique as credenciais.');
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setToken('');
        setIsAuthenticated(false);
        setMediaList([]);
        setView('list'); // Volta para a lista (que mostrará o login)
        setError(null);
    };

    // --- Funções de Mídia ---

    const fetchMediaList = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiCall.get('/media');
            // Ordena as mídias por data_inicio, mais antigas primeiro
            const sortedList = res.data.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
            setMediaList(sortedList);
            setLoading(false);
        } catch (err) {
            // Se o erro for 401 (Não autorizado), desloga o usuário
            if (err.response && err.response.status === 401) {
                handleLogout();
                setError('Sessão expirada. Faça login novamente.');
            } else {
                setError('Erro ao carregar a lista de mídias.');
            }
            setLoading(false);
        }
    };

    const handleDelete = async (id, titulo) => {
        if (!window.confirm(`Tem certeza que deseja EXCLUIR a mídia: "${titulo}" e o arquivo físico?`)) {
            return;
        }
        setLoading(true);
        try {
            await apiCall.delete(`/media/${id}`);
            fetchMediaList(); // Atualiza a lista
        } catch (err) {
            setError('Erro ao excluir a mídia.');
            setLoading(false);
        }
    };

    // Filtra e pesquisa a lista de mídias
    const filteredMediaList = useMemo(() => {
        return mediaList.filter(media => {
            const matchesFilter = filter ? media.departamento === filter : true;
            const matchesSearch = searchQuery 
                ? media.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  media.departamento.toLowerCase().includes(searchQuery.toLowerCase())
                : true;
            return matchesFilter && matchesSearch;
        });
    }, [mediaList, filter, searchQuery]);


    // --- Componentes ---

    // 1. Componente de Alerta
    const Alert = ({ message, type = 'error' }) => (
        <div className={`p-4 rounded-lg flex items-center mb-4 ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            <AlertTriangle className="w-5 h-5 mr-3" />
            <span>{message}</span>
        </div>
    );

    // 2. Componente de Login
    const LoginComponent = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');

        const handleSubmit = (e) => {
            e.preventDefault();
            handleLogin(email, password);
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl rounded-xl">
                    <h2 className="text-3xl font-bold text-center text-gray-900 flex items-center justify-center">
                        <Zap className="w-7 h-7 mr-2 text-indigo-600" />
                        NotusTV - Admin
                    </h2>
                    <p className="text-center text-sm text-gray-600">
                        Use as credenciais do usuário admin criadas no console.
                    </p>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && <Alert message={error} />}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="admin@suaempresa.com"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="********"
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Aguarde...' : 'Fazer Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    // 3. Componente de Upload/Edição
    const FormComponent = ({ mediaToEdit, onComplete }) => {
        const isEditing = !!mediaToEdit;

        const [formData, setFormData] = useState({
            titulo: mediaToEdit?.titulo || '',
            departamento: mediaToEdit?.departamento || DEPARTAMENTOS[0],
            data_inicio: mediaToEdit?.data_inicio ? new Date(mediaToEdit.data_inicio).toISOString().substring(0, 16) : '',
            data_fim: mediaToEdit?.data_fim ? new Date(mediaToEdit.data_fim).toISOString().substring(0, 16) : '',
            ativo: mediaToEdit?.ativo !== undefined ? mediaToEdit.ativo : true,
        });
        const [file, setFile] = useState(null);
        const [uploading, setUploading] = useState(false);
        const [formError, setFormError] = useState(null);
        const [formSuccess, setFormSuccess] = useState(null);

        // Função para formatar Date para o campo datetime-local (ISO 8601 sem segundos)
        const formatDateTimeLocal = (isoDate) => {
            if (!isoDate) return '';
            const date = new Date(isoDate);
            // Corrige o fuso horário local para o ISO string (para não mover a hora)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        
        useEffect(() => {
            if (isEditing) {
                 setFormData({
                    titulo: mediaToEdit.titulo,
                    departamento: mediaToEdit.departamento,
                    // Usa a função de formatação para exibir corretamente no input
                    data_inicio: formatDateTimeLocal(mediaToEdit.data_inicio), 
                    data_fim: formatDateTimeLocal(mediaToEdit.data_fim), 
                    ativo: mediaToEdit.ativo,
                });
            }
        }, [mediaToEdit, isEditing]);


        const handleChange = (e) => {
            const { name, value, type, checked } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            }));
        };

        const handleFileChange = (e) => {
            setFile(e.target.files[0]);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setUploading(true);
            setFormError(null);
            setFormSuccess(null);

            if (!isEditing && !file) {
                setFormError('Por favor, selecione um arquivo para upload.');
                setUploading(false);
                return;
            }

            // Validação de datas
            const start = new Date(formData.data_inicio);
            const end = new Date(formData.data_fim);

            if (start >= end) {
                setFormError('A Data Fim deve ser posterior à Data Início.');
                setUploading(false);
                return;
            }

            try {
                if (isEditing) {
                    // MODO EDIÇÃO (PUT)
                    const updatedData = { ...formData };
                    // Converte as datas locais de volta para o formato ISO (UTC) antes de enviar
                    updatedData.data_inicio = new Date(formData.data_inicio).toISOString();
                    updatedData.data_fim = new Date(formData.data_fim).toISOString();
                    
                    await apiCall.put(`/media/${mediaToEdit._id}`, updatedData);
                    setFormSuccess('Mídia atualizada com sucesso!');

                } else {
                    // MODO UPLOAD (POST com FormData)
                    const data = new FormData();
                    data.append('file', file);
                    data.append('titulo', formData.titulo);
                    data.append('departamento', formData.departamento);
                    // Converte as datas locais de volta para o formato ISO (UTC) antes de enviar
                    data.append('data_inicio', new Date(formData.data_inicio).toISOString());
                    data.append('data_fim', new Date(formData.data_fim).toISOString());
                    data.append('ativo', formData.ativo);
                    
                    // O cabeçalho Content-Type é definido automaticamente pelo axios para FormData
                    await apiCall.post('/media', data, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    setFormSuccess('Mídia e agendamento enviados com sucesso!');
                    setFile(null); // Limpa o arquivo
                }

                // Atualiza a lista principal após o sucesso
                fetchMediaList();
                // Volta para a lista após 2 segundos
                setTimeout(() => {
                    onComplete();
                }, 2000);

            } catch (err) {
                console.error(err.response || err);
                setFormError(`Erro na operação: ${err.response?.data?.msg || err.message || 'Erro desconhecido.'}`);
            }
            setUploading(false);
        };

        return (
            <div className="bg-white p-8 rounded-xl shadow-2xl space-y-6 max-w-4xl mx-auto">
                <h2 className="text-3xl font-extrabold text-indigo-700 border-b pb-3 mb-6 flex items-center">
                    {isEditing ? <Edit className="mr-3" /> : <Upload className="mr-3" />}
                    {isEditing ? `Editar: ${mediaToEdit.titulo}` : 'Upload e Agendamento de Mídia'}
                </h2>

                {formError && <Alert message={formError} type="error" />}
                {formSuccess && <Alert message={formSuccess} type="success" />}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coluna 1: Informações da Mídia */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Detalhes da Mídia</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Título/Descrição</label>
                            <input
                                type="text"
                                name="titulo"
                                value={formData.titulo}
                                onChange={handleChange}
                                required
                                placeholder="Oferta da Semana | Aviso de Manutenção"
                                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                disabled={uploading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Departamento de Exibição</label>
                            <div className="relative">
                                <select
                                    name="departamento"
                                    value={formData.departamento}
                                    onChange={handleChange}
                                    required
                                    className="block w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                    disabled={uploading}
                                >
                                    {DEPARTAMENTOS.map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Arquivo (MP4, JPG, PNG)</label>
                                <input
                                    type="file"
                                    name="file"
                                    onChange={handleFileChange}
                                    required={!isEditing}
                                    className="w-full mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition duration-150"
                                    disabled={uploading}
                                />
                                {file && <p className="text-xs text-gray-500 mt-1">Arquivo selecionado: {file.name}</p>}
                            </div>
                        )}
                         {isEditing && (
                            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <p className="text-sm font-medium text-indigo-700">Arquivo Original:</p>
                                <p className="text-xs text-indigo-600 truncate">{mediaToEdit.nome_arquivo}</p>
                                <p className="text-xs text-indigo-600">Tipo: {mediaToEdit.tipo_arquivo.toUpperCase()}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Coluna 2: Agendamento */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center"><Clock className="mr-2 w-5 h-5" /> Agendamento</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Início da Exibição (Local)</label>
                            <input
                                type="datetime-local"
                                name="data_inicio"
                                value={formData.data_inicio}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                disabled={uploading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Fim da Exibição (Local)</label>
                            <input
                                type="datetime-local"
                                name="data_fim"
                                value={formData.data_fim}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                disabled={uploading}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="ativo"
                                name="ativo"
                                checked={formData.ativo}
                                onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                disabled={uploading}
                            />
                            <label htmlFor="ativo" className="text-sm font-medium text-gray-700">Mídia Ativa (Será exibida)</label>
                        </div>
                    </div>
                    
                    {/* Rodapé do Formulário */}
                    <div className="md:col-span-2 flex justify-between items-center pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => onComplete()}
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150"
                            disabled={uploading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex items-center px-6 py-2 text-sm font-medium text-white rounded-lg shadow-md bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 disabled:opacity-50"
                            disabled={uploading}
                        >
                            {uploading ? 'Processando...' : (isEditing ? 'Salvar Edição' : 'Fazer Upload e Agendar')}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // 4. Componente de Listagem de Mídias
    const ListComponent = () => {
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('pt-BR', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date);
        };

        const isCurrentlyActive = (start, end) => {
            const now = new Date();
            const startDate = new Date(start);
            const endDate = new Date(end);
            return startDate <= now && now <= endDate;
        };
        
        const getStatusBadge = (media) => {
            if (!media.ativo) {
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Inativo</span>;
            }
            if (isCurrentlyActive(media.data_inicio, media.data_fim)) {
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse"><Zap className="w-3 h-3 mr-1" /> AO VIVO</span>;
            }
            if (new Date(media.data_inicio) > new Date()) {
                 return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Agendado</span>;
            }
            // Se não está ativo e a data fim já passou
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Calendar className="w-3 h-3 mr-1" /> Expirado</span>;
        };

        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        <User className="inline mr-2 w-7 h-7 text-indigo-600" />
                        Dashboard NotusTV
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg shadow-md hover:bg-red-600 transition duration-150"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
                         {/* Pesquisa */}
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por título ou departamento..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        
                        {/* Filtro por Departamento */}
                        <div className="relative w-full md:w-1/4">
                             <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todos os Departamentos</option>
                                {DEPARTAMENTOS.map(dep => (
                                    <option key={dep} value={dep}>{dep}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Botão de Upload */}
                        <button
                            onClick={() => setView('upload')}
                            className="w-full md:w-auto flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Novo Agendamento
                        </button>
                    </div>
                </div>

                {error && <Alert message={error} />}

                {loading ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>Carregando mídias...</p>
                    </div>
                ) : filteredMediaList.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                        <p className="text-gray-500 text-lg">Nenhuma mídia encontrada com os filtros atuais.</p>
                        <p className="text-sm text-gray-400 mt-1">Clique em "Novo Agendamento" para começar.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Título</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Início / Fim</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arquivo</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredMediaList.map((media) => (
                                    <tr key={media._id} className="hover:bg-indigo-50 transition duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(media)}
                                            <div className="text-sm font-medium text-gray-900 mt-1 truncate max-w-xs">{media.titulo}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                {media.departamento}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center text-xs">
                                                <Calendar className="w-3 h-3 mr-1 text-green-500" />
                                                <span className="font-semibold text-gray-700">Início:</span> {formatDate(media.data_inicio)}
                                            </div>
                                            <div className="flex items-center text-xs mt-1">
                                                <Calendar className="w-3 h-3 mr-1 text-red-500" />
                                                <span className="font-semibold text-gray-700">Fim:</span> {formatDate(media.data_fim)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="text-xs font-mono bg-gray-100 p-1 rounded break-all">{media.nome_arquivo}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => { setEditMediaData(media); setView('edit'); }}
                                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-100 transition duration-150"
                                                title="Editar Agendamento"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(media._id, media.titulo)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition duration-150"
                                                title="Excluir Mídia e Arquivo"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };


    // --- Renderização Principal ---

    if (!isAuthenticated) {
        return <LoginComponent />;
    }

    let Content;
    if (view === 'upload') {
        Content = <FormComponent onComplete={() => setView('list')} />;
    } else if (view === 'edit') {
        Content = <FormComponent mediaToEdit={editMediaData} onComplete={() => { setView('list'); setEditMediaData(null); }} />;
    } else {
        Content = <ListComponent />;
    }


    return (
        <div className="min-h-screen bg-gray-100 font-sans antialiased">
            <style>{`
                /* Estilo global para garantir que o input datetime-local seja amigável */
                input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    filter: invert(36%) sepia(87%) saturate(3029%) hue-rotate(240deg) brightness(97%) contrast(90%); /* Indigo color for the icon */
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {Content}
            </main>
        </div>
    );
};

export default App;