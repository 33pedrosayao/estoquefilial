// Configuração da API
const API_URL = '/api';

// Estado da aplicação
let token = null;
let usuarioAtual = null;
let itens = [];
let categorias = [];
let usuarios = [];
let itemEditando = null;
let usuarioEditando = null;

// Elementos do DOM
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const formLogin = document.getElementById('form-login');
const btnLogout = document.getElementById('btn-logout');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const tabUsuarios = document.getElementById('tab-usuarios');

function atualizarOpcoesQuantidade() {
    const tipoEl = document.getElementById('mov-tipo');
    const select = document.getElementById('mov-quantidade');
    if (!tipoEl || !select) return;
    const max = tipoEl.value === 'entrada' ? 100 : 10;
    select.innerHTML = '<option value="">Selecione quantidade...</option>';
    for (let i = 1; i <= max; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        select.appendChild(opt);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventos();
    inicializarRelatorio();
    atualizarOpcoesQuantidade();
    verificarAutenticacao();
});

// ===== HELPERS =====
function getPerfilNome(usuario) {
    if (!usuario || !usuario.perfil) return '';
    return typeof usuario.perfil === 'string' ? usuario.perfil : usuario.perfil.nome;
}

// ===== AUTENTICAÇÃO =====
function verificarAutenticacao() {
    token = localStorage.getItem('token');

    try {
        usuarioAtual = JSON.parse(localStorage.getItem('usuarioAtual'));
    } catch (e) {
        usuarioAtual = null;
    }

    if (token && usuarioAtual) {
        mostrarDashboard();
        carregarDados();
    } else {
        mostrarLogin();
    }
}

function mostrarLogin() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
}

function getPerfilNome(usuario) {
    if (!usuario || !usuario.perfil) return '';
    return typeof usuario.perfil === 'string' ? usuario.perfil : usuario.perfil.nome;
}

function mostrarDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';

    const perfilNome = getPerfilNome(usuarioAtual);

    document.getElementById('user-name').textContent = usuarioAtual.nome;
    document.getElementById('user-perfil').textContent = perfilNome.toUpperCase();

    if (perfilNome === 'admin') {
        tabUsuarios.style.display = 'block';
    } else {
        tabUsuarios.style.display = 'none';
    }
}

async function fazerLogin(email, senha) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const dados = await response.json();

        if (!response.ok) {
            throw new Error(dados.detail || 'Email ou senha incorretos');
        }

        token = dados.access_token;
        usuarioAtual = dados.usuario;

        localStorage.setItem('token', token);
        localStorage.setItem('usuarioAtual', JSON.stringify(usuarioAtual));

        formLogin.reset();
        document.getElementById('login-error').classList.remove('show');

        mostrarDashboard();
        await carregarDados();
    } catch (erro) {
        console.error('Erro ao fazer login:', erro);
        const errorElement = document.getElementById('login-error');
        errorElement.textContent = erro.message;
        errorElement.classList.add('show');
    }
}

function fazerLogout() {
    token = null;
    usuarioAtual = null;
    localStorage.removeItem('token');
    localStorage.removeItem('usuarioAtual');
    mostrarLogin();
}

// ===== EVENTOS =====
function inicializarEventos() {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        await fazerLogin(email, senha);
    });

    btnLogout.addEventListener('click', fazerLogout);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => mudarTab(btn.dataset.tab, e));
    });

    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    document.getElementById('form-item').addEventListener('submit', salvarItem);
    document.getElementById('form-movimentacao').addEventListener('submit', registrarMovimentacao);

    document.getElementById('mov-tipo').addEventListener('change', atualizarOpcoesQuantidade);
    document.getElementById('form-usuario').addEventListener('submit', salvarUsuario);

    document.getElementById('btn-novo-item').addEventListener('click', abrirModalNovoItem);
    document.getElementById('btn-novo-usuario').addEventListener('click', abrirModalNovoUsuario);

    document.getElementById('filter-nome').addEventListener('input', filtrarItens);
    document.getElementById('filter-categoria').addEventListener('change', filtrarItens);
    document.getElementById('filter-status').addEventListener('change', filtrarItens);
}

// ===== REQUISIÇÕES COM TOKEN =====
async function fazerRequisicao(url, opcoes = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...opcoes.headers
    };

    const response = await fetch(url, {
        ...opcoes,
        headers
    });

    let dados = null;
    try {
        dados = await response.json();
    } catch {
        dados = null;
    }

    if (response.status === 401) {
        fazerLogout();
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
        throw new Error(dados?.detail || 'Erro na requisição');
    }

    return dados;
}

// ===== CARREGAR DADOS =====
async function carregarDados() {
    try {
        await carregarCategorias();
        await carregarItens();
        await carregarAlertas();

        if (getPerfilNome(usuarioAtual) === 'admin') {
            await carregarUsuarios();
        }

        await carregarHistoricoMovimentacoes();
    } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
    }
}

async function carregarItens() {
    try {
        itens = await fazerRequisicao(`${API_URL}/itens/`);
        renderizarItens(itens);
        preencherSelectItens();
    } catch (erro) {
        console.error('Erro ao carregar itens:', erro);
    }
}

async function carregarCategorias() {
    try {
        categorias = await fazerRequisicao(`${API_URL}/itens/categorias/`);
        try { preencherSelectCategorias(); } catch(e) { console.error(e); }
        try { preencherFiltroCategorias(); } catch(e) { console.error(e); }
        try { renderizarCategorias(); } catch(e) { console.error(e); }
        try { preencherSelectCategoriasRelatorio(); } catch(e) { console.error(e); }
    } catch (erro) {
        console.error('Erro ao carregar categorias:', erro);
    }
}

async function carregarAlertas() {
    try {
        const alertas = await fazerRequisicao(`${API_URL}/itens/alertas/`);
        renderizarAlertas(alertas);
    } catch (erro) {
        console.error('Erro ao carregar alertas:', erro);
    }
}

async function carregarUsuarios() {
    try {
        if (getPerfilNome(usuarioAtual) !== 'admin') return;
        usuarios = await fazerRequisicao(`${API_URL}/auth/usuarios`);
        renderizarUsuarios();
    } catch (erro) {
        console.error('Erro ao carregar usuários:', erro);
    }
}

async function carregarHistoricoMovimentacoes() {
    const tbody = document.getElementById('tbody-movimentacoes');

    try {
        if (itens.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhuma movimentação encontrada</td></tr>';
            return;
        }

        const listas = await Promise.all(
            itens.map(item =>
                fazerRequisicao(`${API_URL}/itens/movimentacoes/${item.id}`).catch(() => [])
            )
        );

        const movimentacoes = listas
            .flat()
            .sort((a, b) => new Date(b.data_movimentacao) - new Date(a.data_movimentacao));

        renderizarMovimentacoes(movimentacoes);
    } catch (erro) {
        console.error('Erro ao carregar movimentações:', erro);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Erro ao carregar movimentações</td></tr>';
    }
}

// ===== RENDERIZAR ITENS =====
function renderizarItens(itemsParaRender) {
    const tbody = document.getElementById('tbody-itens');

    if (!itemsParaRender.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Nenhum item encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = itemsParaRender.map(item => {
        const categoria = categorias.find(c => c.id === item.categoria_id);
        const statusClass = !item.ativo
            ? 'inativo'
            : item.quantidade_atual === 0
                ? 'critico'
                : item.quantidade_atual < item.quantidade_minima
                    ? 'alerta'
                    : 'ativo';

        const statusText = item.ativo ? 'Ativo' : 'Inativo';

        return `
            <tr>
                <td>${item.id}</td>
                <td>${item.nome}</td>
                <td>${categoria ? categoria.nome : 'N/A'}</td>
                <td><strong>${item.quantidade_atual}</strong></td>
                <td>${item.quantidade_minima}</td>
                <td>${item.unidade}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-secondary btn-small" onclick="editarItem(${item.id})">Editar</button>
                    <button class="btn btn-danger btn-small" onclick="deletarItem(${item.id})">Deletar</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== FILTRAR ITENS =====
function filtrarItens() {
    const nome = document.getElementById('filter-nome').value.toLowerCase();
    const categoriaId = document.getElementById('filter-categoria').value;
    const status = document.getElementById('filter-status').value;

    const itemsFiltrados = itens.filter(item => {
        const nomeMatch = item.nome.toLowerCase().includes(nome);
        const categoriaMatch = !categoriaId || item.categoria_id === parseInt(categoriaId);
        const statusMatch = status === '' || item.ativo.toString() === status;

        return nomeMatch && categoriaMatch && statusMatch;
    });

    renderizarItens(itemsFiltrados);
}

// ===== MODAL ITEM =====
function abrirModalNovoItem() {
    itemEditando = null;
    document.getElementById('modal-title').textContent = 'Novo Item';
    document.getElementById('form-item').reset();
    document.getElementById('modal-item').classList.add('show');
}

function editarItem(id) {
    itemEditando = itens.find(i => i.id === id);
    if (!itemEditando) return;

    document.getElementById('modal-title').textContent = 'Editar Item';
    document.getElementById('item-nome').value = itemEditando.nome;
    document.getElementById('item-categoria').value = itemEditando.categoria_id;
    document.getElementById('item-quantidade').value = itemEditando.quantidade_atual;
    document.getElementById('item-minima').value = itemEditando.quantidade_minima;
    document.getElementById('item-unidade').value = itemEditando.unidade;

    document.getElementById('modal-item').classList.add('show');
}

async function salvarItem(e) {
    e.preventDefault();

    const dados = {
        nome: document.getElementById('item-nome').value,
        categoria_id: parseInt(document.getElementById('item-categoria').value),
        quantidade_atual: parseInt(document.getElementById('item-quantidade').value),
        quantidade_minima: parseInt(document.getElementById('item-minima').value),
        unidade: document.getElementById('item-unidade').value
    };

    try {
        if (itemEditando) {
            await fazerRequisicao(`${API_URL}/itens/${itemEditando.id}`, {
                method: 'PUT',
                body: JSON.stringify(dados)
            });
        } else {
            await fazerRequisicao(`${API_URL}/itens/`, {
                method: 'POST',
                body: JSON.stringify(dados)
            });
        }

        document.getElementById('modal-item').classList.remove('show');
        await carregarItens();
        await carregarAlertas();
        await carregarHistoricoMovimentacoes();
        alert(itemEditando ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!');
    } catch (erro) {
        alert('Erro: ' + erro.message);
    }
}

async function deletarItem(id) {
    if (!confirm('Tem certeza que deseja deletar este item?')) return;

    try {
        await fazerRequisicao(`${API_URL}/itens/${id}`, { method: 'DELETE' });
        await carregarItens();
        await carregarAlertas();
        alert('Item deletado com sucesso!');
    } catch (erro) {
        alert('Erro: ' + erro.message);
    }
}

// ===== MOVIMENTAÇÕES =====
async function registrarMovimentacao(e) {
    e.preventDefault();

    const dados = {
        item_id: parseInt(document.getElementById('mov-item').value),
        tipo: document.getElementById('mov-tipo').value,
        quantidade: parseInt(document.getElementById('mov-quantidade').value),
        motivo: document.getElementById('mov-motivo').value,
        usuario: document.getElementById('mov-usuario').value
    };

    try {
        await fazerRequisicao(`${API_URL}/itens/movimentacoes/`, {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        document.getElementById('form-movimentacao').reset();
        atualizarOpcoesQuantidade();
        await carregarItens();
        await carregarAlertas();
        await carregarHistoricoMovimentacoes();
        alert('Movimentação registrada com sucesso!');
    } catch (erro) {
        alert('Erro: ' + erro.message);
    }
}

function renderizarMovimentacoes(movimentacoes) {
    const tbody = document.getElementById('tbody-movimentacoes');

    if (!movimentacoes.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhuma movimentação encontrada</td></tr>';
        return;
    }

    tbody.innerHTML = movimentacoes.map(mov => {
        const item = itens.find(i => i.id === mov.item_id);

        return `
            <tr>
                <td>${mov.id}</td>
                <td>${item ? item.nome : mov.item_id}</td>
                <td>${mov.tipo}</td>
                <td>${mov.quantidade}</td>
                <td>${mov.motivo || '-'}</td>
                <td>${mov.usuario || '-'}</td>
                <td>${new Date(mov.data_movimentacao).toLocaleString('pt-BR')}</td>
            </tr>
        `;
    }).join('');
}

// ===== ALERTAS =====
function renderizarAlertas(alertas) {
    const container = document.getElementById('alertas-container');

    if (!alertas.length) {
        container.innerHTML = '<p style="text-align: center; color: #4caf50; font-weight: bold;">✓ Nenhum alerta ativo</p>';
        return;
    }

    container.innerHTML = alertas.map(alerta => `
        <div class="alerta-card ${alerta.tipo_alerta}">
            <h3>${alerta.item_nome}</h3>
            <p><strong>Tipo:</strong> ${alerta.tipo_alerta === 'estoque_baixo' ? 'Estoque Baixo' : 'Fora de Estoque'}</p>
            <p><strong>Quantidade Atual:</strong> ${alerta.quantidade_atual}</p>
            <p><strong>Quantidade Mínima:</strong> ${alerta.quantidade_minima}</p>
        </div>
    `).join('');
}

// ===== CATEGORIAS =====
function renderizarCategorias() {
    const container = document.getElementById('categorias-container');

    if (!categorias.length) {
        container.innerHTML = '<p class="loading">Nenhuma categoria cadastrada</p>';
        return;
    }

    container.innerHTML = categorias.map(cat => `
        <div class="categoria-card">
            <h3>${cat.nome}</h3>
            <p>${cat.descricao || 'Sem descrição'}</p>
        </div>
    `).join('');
}

// ===== USUÁRIOS =====
function renderizarUsuarios() {
    const tbody = document.getElementById('tbody-usuarios');

    if (!usuarios.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum usuário encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = usuarios.map(usuario => {
        const statusText = usuario.ativo ? 'Ativo' : 'Inativo';
        const ultimoAcesso = usuario.ultimo_acesso
            ? new Date(usuario.ultimo_acesso).toLocaleDateString('pt-BR')
            : 'Nunca';

        return `
            <tr>
                <td>${usuario.id}</td>
                <td>${usuario.nome}</td>
                <td>${usuario.email}</td>
                <td>${usuario.perfil?.nome || '-'}</td>
                <td><span class="status-badge ${usuario.ativo ? 'ativo' : 'inativo'}">${statusText}</span></td>
                <td>${ultimoAcesso}</td>
                <td>
                    <button class="btn btn-secondary btn-small" onclick="editarUsuario(${usuario.id})">Editar</button>
                    <button class="btn btn-danger btn-small" onclick="deletarUsuario(${usuario.id})">Deletar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function abrirModalNovoUsuario() {
    usuarioEditando = null;
    document.getElementById('modal-usuario-title').textContent = 'Novo Usuário';
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-senha').required = true;
    document.getElementById('modal-usuario').classList.add('show');
}

function editarUsuario(id) {
    usuarioEditando = usuarios.find(u => u.id === id);
    if (!usuarioEditando) return;

    document.getElementById('modal-usuario-title').textContent = 'Editar Usuário';
    document.getElementById('usuario-nome').value = usuarioEditando.nome;
    document.getElementById('usuario-email').value = usuarioEditando.email;
    document.getElementById('usuario-perfil').value = usuarioEditando.perfil_id;
    document.getElementById('usuario-senha').required = false;
    document.getElementById('usuario-senha').placeholder = 'Deixe em branco para manter a senha atual';

    document.getElementById('modal-usuario').classList.add('show');
}

async function salvarUsuario(e) {
    e.preventDefault();

    const dados = {
        nome: document.getElementById('usuario-nome').value,
        email: document.getElementById('usuario-email').value,
        perfil_id: parseInt(document.getElementById('usuario-perfil').value)
    };

    try {
        if (usuarioEditando) {
            await fazerRequisicao(`${API_URL}/auth/usuarios/${usuarioEditando.id}`, {
                method: 'PUT',
                body: JSON.stringify(dados)
            });
        } else {
            dados.senha = document.getElementById('usuario-senha').value;
            await fazerRequisicao(`${API_URL}/auth/registrar`, {
                method: 'POST',
                body: JSON.stringify(dados)
            });
        }

        document.getElementById('modal-usuario').classList.remove('show');
        await carregarUsuarios();
        alert(usuarioEditando ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
    } catch (erro) {
        alert('Erro: ' + erro.message);
    }
}

async function deletarUsuario(id) {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
        await fazerRequisicao(`${API_URL}/auth/usuarios/${id}`, { method: 'DELETE' });
        await carregarUsuarios();
        alert('Usuário deletado com sucesso!');
    } catch (erro) {
        alert('Erro: ' + erro.message);
    }
}

// ===== PREENCHIMENTO DE SELECTS =====
function preencherSelectCategorias() {
    const select = document.getElementById('item-categoria');
    select.innerHTML = categorias.map(cat =>
        `<option value="${cat.id}">${cat.nome}</option>`
    ).join('');
}

function preencherFiltroCategorias() {
    const select = document.getElementById('filter-categoria');
    select.innerHTML =
        '<option value="">Todas as categorias</option>' +
        categorias.map(cat => `<option value="${cat.id}">${cat.nome}</option>`).join('');
}

function preencherSelectItens() {
    const select = document.getElementById('mov-item');
    select.innerHTML =
        '<option value="">Selecione um item...</option>' +
        itens.map(item => `<option value="${item.id}">${item.nome}</option>`).join('');
}

// ===== MUDAR TAB =====
function mudarTab(tabName, e) {
    tabContents.forEach(tab => tab.classList.remove('active'));
    tabBtns.forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (e?.currentTarget) {
        e.currentTarget.classList.add('active');
    }

    if (tabName === 'movimentacoes') {
        atualizarOpcoesQuantidade();
    }

    if (tabName === 'relatorio') {
        preencherSelectCategoriasRelatorio();
    }
}

// ===== RELATÓRIO =====
let dadosRelatorio = [];

function preencherSelectCategoriasRelatorio() {
    const sel = document.getElementById('rel-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.nome;
        sel.appendChild(opt);
    });
}

function inicializarRelatorio() {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('rel-inicio').value = inicioMes;
    document.getElementById('rel-fim').value = hoje;

    document.getElementById('btn-gerar-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('btn-exportar-csv').addEventListener('click', exportarCSV);
    document.getElementById('btn-exportar-pdf').addEventListener('click', exportarPDF);
}

async function gerarRelatorio() {
    const inicio = document.getElementById('rel-inicio').value;
    const fim = document.getElementById('rel-fim').value;
    const categoriaId = document.getElementById('rel-categoria').value;
    const categoriaNome = categoriaId
        ? document.getElementById('rel-categoria').selectedOptions[0].textContent
        : '';

    if (!inicio || !fim) {
        alert('Selecione o período do relatório.');
        return;
    }

    try {
        let url = `${API_URL}/itens/relatorio/?data_inicio=${inicio}&data_fim=${fim}`;
        if (categoriaId) url += `&categoria_id=${categoriaId}`;
        dadosRelatorio = await fazerRequisicao(url);
        renderizarRelatorio(dadosRelatorio, inicio, fim, categoriaNome);
    } catch (erro) {
        alert('Erro ao gerar relatório: ' + erro.message);
    }
}

function renderizarRelatorio(dados, inicio, fim, categoria) {
    const totalEntradas = dados.reduce((s, r) => s + r.entradas, 0);
    const totalSaidas = dados.reduce((s, r) => s + r.saidas, 0);
    const itensComMov = dados.filter(r => r.entradas > 0 || r.saidas > 0).length;

    const fmtData = d => d.split('-').reverse().join('/');
    const titulo = categoria ? `Relatório de Estoque — ${categoria}` : 'Relatório de Estoque';
    document.getElementById('relatorio-titulo').textContent = titulo;
    document.getElementById('relatorio-periodo').textContent = `Período: ${fmtData(inicio)} a ${fmtData(fim)}`;

    document.getElementById('res-entradas').textContent = totalEntradas;
    document.getElementById('res-saidas').textContent = totalSaidas;
    document.getElementById('res-itens').textContent = itensComMov;

    const tbody = document.getElementById('tbody-relatorio');
    tbody.innerHTML = dados.map(r => `
        <tr>
            <td>${r.nome}</td>
            <td>${r.categoria}</td>
            <td>${r.unidade}</td>
            <td class="relatorio-entrada">${r.entradas}</td>
            <td class="relatorio-saida">${r.saidas}</td>
            <td><strong>${r.estoque_atual}</strong></td>
        </tr>
    `).join('');

    document.getElementById('relatorio-resultado').style.display = 'block';
}

function exportarPDF() {
    const inicio = document.getElementById('rel-inicio').value;
    const fim = document.getElementById('rel-fim').value;
    const selCatPdf = document.getElementById('rel-categoria');
    const nomeCategoriaPdf = selCatPdf.value ? selCatPdf.selectedOptions[0].textContent : '';
    const fmtData = d => d.split('-').reverse().join('/');
    const titulo = nomeCategoriaPdf ? `Relatório de Estoque — ${nomeCategoriaPdf}` : 'Relatório de Estoque';

    const totalEntradas = document.getElementById('res-entradas').textContent;
    const totalSaidas = document.getElementById('res-saidas').textContent;
    const itensComMov = document.getElementById('res-itens').textContent;

    const linhas = [...document.querySelectorAll('#tbody-relatorio tr')].map(tr =>
        [...tr.querySelectorAll('td')].map(td => `<td>${td.innerText}</td>`).join('')
    ).map(l => `<tr>${l}</tr>`).join('');

    const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Estoque</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
                h1 { font-size: 22px; margin-bottom: 4px; }
                .periodo { color: #666; font-size: 13px; margin-bottom: 24px; }
                .cards { display: flex; gap: 16px; margin-bottom: 24px; }
                .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px 24px; flex: 1; text-align: center; }
                .card p { margin: 0; font-size: 12px; color: #888; }
                .card h2 { margin: 4px 0; font-size: 28px; }
                .entrada { color: #4caf50; }
                .saida { color: #f44336; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th { background: #667eea; color: white; padding: 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #f9f9f9; }
                @media print { body { padding: 16px; } }
            </style>
        </head>
        <body>
            <h1>${titulo}</h1>
            <p class="periodo">Período: ${fmtData(inicio)} a ${fmtData(fim)}</p>
            <div class="cards">
                <div class="card"><p>Total Entradas</p><h2 class="entrada">${totalEntradas}</h2></div>
                <div class="card"><p>Total Saídas</p><h2 class="saida">${totalSaidas}</h2></div>
                <div class="card"><p>Itens com Movimentação</p><h2>${itensComMov}</h2></div>
            </div>
            <table>
                <thead><tr><th>Item</th><th>Categoria</th><th>Unidade</th><th>Entradas</th><th>Saídas</th><th>Estoque Atual</th></tr></thead>
                <tbody>${linhas}</tbody>
            </table>
        </body>
        </html>
    `;

    const janela = window.open('', '_blank');
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 500);
}

function exportarCSV() {
    if (!dadosRelatorio.length) return;

    const inicio = document.getElementById('rel-inicio').value;
    const fim = document.getElementById('rel-fim').value;

    const linhas = [
        ['Item', 'Categoria', 'Unidade', 'Entradas', 'Saídas', 'Estoque Atual'],
        ...dadosRelatorio.map(r => [r.nome, r.categoria, r.unidade, r.entradas, r.saidas, r.estoque_atual])
    ];

    const csv = linhas.map(l => l.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const selCat = document.getElementById('rel-categoria');
    const nomeCategoria = selCat.value ? selCat.selectedOptions[0].textContent : '';
    const sufixo = nomeCategoria ? `_${nomeCategoria.toLowerCase()}` : '';
    a.download = `relatorio${sufixo}_${inicio}_${fim}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}