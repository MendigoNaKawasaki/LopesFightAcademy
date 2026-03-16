// ============================================
// MENSALIDADES - ALUNO
// ============================================

const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let todosPagamentos = [];

const MESES = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        alert('Faça login primeiro!');
        window.location.href = 'index.html';
        return;
    }

    await carregarPerfil();
    await carregarPagamentos();

    document.getElementById('btnLogout').addEventListener('click', logout);
});

// ============================================
// CARREGAR DADOS
// ============================================

async function carregarPerfil() {
    try {
        const response = await fetch(`${API_URL}/perfil`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao carregar perfil');

        const data = await response.json();
        document.getElementById('nomeUtilizador').textContent = `Olá, ${data.nome}`;
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        alert('Sessão expirada. Faça login novamente.');
        logout();
    }
}

async function carregarPagamentos() {
    try {
        const response = await fetch(`${API_URL}/meus-pagamentos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar pagamentos');

        todosPagamentos = await response.json();
        
        renderizarResumo();
        renderizarPendentes();
        renderizarHistorico();

    } catch (error) {
        console.error('Erro ao carregar pagamentos:', error);
        mostrarMensagem('Erro ao carregar pagamentos', 'erro');
    }
}

// ============================================
// RENDERIZAR RESUMO
// ============================================

function renderizarResumo() {
    const pendentes = todosPagamentos.filter(p => p.status !== 'pago');
    const atrasadas = todosPagamentos.filter(p => p.status === 'atrasado');
    const pagas = todosPagamentos.filter(p => p.status === 'pago');

    // Total a pagar (pendentes + multas)
    const totalPendente = pendentes.reduce((sum, p) => sum + p.valorTotal, 0);

    document.getElementById('totalPendentes').textContent = `€${totalPendente.toFixed(2)}`;
    document.getElementById('totalAtrasadas').textContent = atrasadas.length;
    document.getElementById('totalPagas').textContent = pagas.length;
}

// ============================================
// RENDERIZAR PENDENTES
// ============================================

function renderizarPendentes() {
    const lista = document.getElementById('listaPendentes');
    const pendentes = todosPagamentos.filter(p => p.status !== 'pago');

    if (pendentes.length === 0) {
        lista.innerHTML = '<p class="vazio">✓ Não há mensalidades pendentes</p>';
        return;
    }

    lista.innerHTML = pendentes.map(p => `
        <div class="pagamento-card ${p.status}">
            <div class="pagamento-header">
                <div class="pagamento-mes">${MESES[p.mes]} ${p.ano}</div>
                <div class="pagamento-status status-${p.status}">
                    ${p.status === 'atrasado' ? '⚠️ ATRASADO' : '⏳ Pendente'}
                </div>
            </div>
            <div class="pagamento-body">
                <div class="pagamento-info">
                    <div class="info-row">
                        <span class="label">Valor base:</span>
                        <span class="value">€${p.valorBase.toFixed(2)}</span>
                    </div>
                    ${p.multa > 0 ? `
                        <div class="info-row multa">
                            <span class="label">Multa (${Math.floor(p.diasAtraso / 7)} semanas):</span>
                            <span class="value">+€${p.multa.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="info-row total">
                        <span class="label"><strong>Total a pagar:</strong></span>
                        <span class="value"><strong>€${p.valorTotal.toFixed(2)}</strong></span>
                    </div>
                </div>
                <div class="pagamento-detalhes">
                    <div class="detalhe">
                        <span class="detalhe-label">Vencimento:</span>
                        <span>${formatarData(p.dataVencimento)}</span>
                    </div>
                    ${p.diasAtraso > 0 ? `
                        <div class="detalhe atras">
                            <span class="detalhe-label">Dias de atraso:</span>
                            <span class="destaque">${p.diasAtraso} dias</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// RENDERIZAR HISTÓRICO
// ============================================

function renderizarHistorico() {
    const lista = document.getElementById('listaHistorico');
    const pagas = todosPagamentos.filter(p => p.status === 'pago');

    if (pagas.length === 0) {
        lista.innerHTML = '<p class="vazio">Nenhum pagamento registado ainda</p>';
        return;
    }

    lista.innerHTML = pagas.map(p => `
        <div class="pagamento-card pago">
            <div class="pagamento-header">
                <div class="pagamento-mes">${MESES[p.mes]} ${p.ano}</div>
                <div class="pagamento-status status-pago">
                    ✓ PAGO
                </div>
            </div>
            <div class="pagamento-body">
                <div class="pagamento-info">
                    <div class="info-row">
                        <span class="label">Valor pago:</span>
                        <span class="value">€${p.valorPago.toFixed(2)}</span>
                    </div>
                    ${p.multa > 0 ? `
                        <div class="info-row multa">
                            <span class="label">Multa paga:</span>
                            <span class="value">€${p.multa.toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="pagamento-detalhes">
                    <div class="detalhe">
                        <span class="detalhe-label">Pago em:</span>
                        <span>${formatarData(p.dataPagamento)}</span>
                    </div>
                    ${p.observacoes ? `
                        <div class="detalhe">
                            <span class="detalhe-label">Obs:</span>
                            <span>${p.observacoes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// UTILITÁRIOS
// ============================================

function formatarData(dataISO) {
    const data = new Date(dataISO);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function mostrarMensagem(texto, tipo) {
    const msg = document.createElement('div');
    msg.className = `mensagem mensagem-${tipo}`;
    msg.textContent = texto;
    document.body.appendChild(msg);

    setTimeout(() => msg.remove(), 3000);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
