// ============================================
// GERIR PAGAMENTOS - ADMIN
// ============================================

const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let todosPagamentos = [];
let pagamentoEmEdicao = null;

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

    await carregarEstatisticas();
    await carregarPagamentos();

    // Event listeners
    document.getElementById('btnCriarMensalidades').addEventListener('click', abrirModalCriar);
    document.getElementById('formCriarMensalidades').addEventListener('submit', criarMensalidades);
    document.getElementById('btnCancelarCriar').addEventListener('click', fecharModalCriar);
    
    document.getElementById('formRegistar').addEventListener('submit', registarPagamento);
    document.getElementById('btnCancelarRegistar').addEventListener('click', fecharModalRegistar);

    // Filtros
    document.getElementById('filtroStatus').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroMes').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroAno').addEventListener('change', aplicarFiltros);
});

// ============================================
// CARREGAR DADOS
// ============================================

async function carregarEstatisticas() {
    try {
        const response = await fetch(`${API_URL}/admin/stats-pagamentos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar estatísticas');

        const stats = await response.json();

        document.getElementById('totalArrecadado').textContent = `€${stats.totalArrecadado}`;
        document.getElementById('totalPendente').textContent = `€${stats.totalPendente}`;
        document.getElementById('totalMultas').textContent = `€${stats.totalMultas}`;
        document.getElementById('taxaPagamento').textContent = `${stats.taxaPagamento}%`;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function carregarPagamentos() {
    try {
        const response = await fetch(`${API_URL}/admin/pagamentos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar pagamentos');

        todosPagamentos = await response.json();
        renderizarPagamentos(todosPagamentos);

    } catch (error) {
        console.error('Erro ao carregar pagamentos:', error);
        mostrarMensagem('Erro ao carregar pagamentos', 'erro');
    }
}

// ============================================
// FILTROS
// ============================================

async function aplicarFiltros() {
    const status = document.getElementById('filtroStatus').value;
    const mes = document.getElementById('filtroMes').value;
    const ano = document.getElementById('filtroAno').value;

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (mes) params.append('mes', mes);
    if (ano) params.append('ano', ano);

    try {
        const response = await fetch(`${API_URL}/admin/pagamentos?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao filtrar');

        todosPagamentos = await response.json();
        renderizarPagamentos(todosPagamentos);

    } catch (error) {
        console.error('Erro ao filtrar:', error);
    }
}

// ============================================
// RENDERIZAR PAGAMENTOS
// ============================================

function renderizarPagamentos(pagamentos) {
    const grid = document.getElementById('pagamentosGrid');

    if (pagamentos.length === 0) {
        grid.innerHTML = '<p class="vazio">Nenhum pagamento encontrado</p>';
        return;
    }

    grid.innerHTML = pagamentos.map(p => `
        <div class="pagamento-card ${p.status}">
            <div class="pagamento-header">
                <div class="aluno-info">
                    ${p.aluno.foto_url ? 
                        `<img src="${p.aluno.foto_url}" alt="${p.aluno.nome}" class="aluno-foto">` :
                        `<div class="aluno-foto-placeholder">${p.aluno.nome.charAt(0)}</div>`
                    }
                    <div>
                        <div class="aluno-nome">${p.aluno.nome}</div>
                        <div class="aluno-email">${p.aluno.email}</div>
                    </div>
                </div>
                <div class="status-badge status-${p.status}">
                    ${p.status === 'pago' ? '✓ Pago' : p.status === 'atrasado' ? '⚠️ Atrasado' : '⏳ Pendente'}
                </div>
            </div>
            <div class="pagamento-body">
                <div class="pagamento-periodo">
                    <strong>${MESES[p.mes]} ${p.ano}</strong>
                </div>
                <div class="pagamento-valores">
                    <div class="valor-item">
                        <span>Base:</span>
                        <span>€${p.valorBase.toFixed(2)}</span>
                    </div>
                    ${p.multa > 0 ? `
                        <div class="valor-item multa">
                            <span>Multa:</span>
                            <span>+€${p.multa.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="valor-item total">
                        <span><strong>Total:</strong></span>
                        <span><strong>€${p.valorTotal.toFixed(2)}</strong></span>
                    </div>
                </div>
                ${p.status !== 'pago' && p.diasAtraso > 0 ? `
                    <div class="pagamento-atraso">
                        ⚠️ ${p.diasAtraso} dias de atraso (${Math.floor(p.diasAtraso / 7)} semanas)
                    </div>
                ` : ''}
                ${p.dataPagamento ? `
                    <div class="pagamento-data-pago">
                        Pago em: ${formatarData(p.dataPagamento)}
                    </div>
                ` : ''}
            </div>
            <div class="pagamento-actions">
                ${p.status !== 'pago' ? `
                    <button class="btn-registar" onclick="abrirModalRegistar('${p._id}')">
                        💰 Registar Pagamento
                    </button>
                ` : ''}
                <button class="btn-eliminar" onclick="eliminarPagamento('${p._id}', ${p.status === 'pago'})">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// CRIAR MENSALIDADES
// ============================================

function abrirModalCriar() {
    document.getElementById('modalCriar').style.display = 'flex';
}

function fecharModalCriar() {
    document.getElementById('modalCriar').style.display = 'none';
    document.getElementById('formCriarMensalidades').reset();
}

async function criarMensalidades(e) {
    e.preventDefault();

    const mes = parseInt(document.getElementById('inputMes').value);
    const ano = parseInt(document.getElementById('inputAno').value);

    const confirmar = await mostrarModal(
        'Criar Mensalidades',
        `Criar mensalidades de €35 para TODOS os alunos em ${MESES[mes]} ${ano}?`
    );

    if (!confirmar) return;

    try {
        const response = await fetch(`${API_URL}/admin/pagamentos/criar-mensalidades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ mes, ano })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.erro || 'Erro ao criar mensalidades');
        }

        // Mostrar resultado detalhado
        if (result.criadas === 0) {
            let mensagemErro = 'Nenhuma mensalidade foi criada!';
            
            if (result.totalAlunos === 0) {
                mensagemErro = 'Não há alunos registados no sistema!';
            } else if (result.erros && result.erros.length > 0) {
                mensagemErro = `Nenhuma mensalidade criada. Erros:\n${result.erros.slice(0, 3).join('\n')}`;
            }
            
            mostrarMensagem(mensagemErro, 'erro');
            
            // Mostrar detalhes no console
            console.log('📊 Detalhes:', result);
        } else {
            let mensagemSucesso = `✅ ${result.criadas} mensalidade(s) criada(s) com sucesso!`;
            
            if (result.erros && result.erros.length > 0) {
                mensagemSucesso += `\n(${result.erros.length} já existiam)`;
            }
            
            mostrarMensagem(mensagemSucesso, 'sucesso');
            
            // Mostrar alunos no console
            console.log('✅ Mensalidades criadas para:', result.alunos);
            if (result.erros.length > 0) {
                console.log('⚠️ Erros:', result.erros);
            }
        }

        fecharModalCriar();
        await carregarPagamentos();
        await carregarEstatisticas();

    } catch (error) {
        console.error('Erro ao criar mensalidades:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

// ============================================
// REGISTAR PAGAMENTO
// ============================================

window.abrirModalRegistar = function(pagamentoId) {
    const pagamento = todosPagamentos.find(p => p._id === pagamentoId);
    if (!pagamento) return;

    pagamentoEmEdicao = pagamento;

    const infoPagamento = document.getElementById('infoPagamento');
    infoPagamento.innerHTML = `
        <div class="info-row">
            <span>Aluno:</span>
            <strong>${pagamento.aluno.nome}</strong>
        </div>
        <div class="info-row">
            <span>Período:</span>
            <strong>${MESES[pagamento.mes]} ${pagamento.ano}</strong>
        </div>
        <div class="info-row">
            <span>Valor Base:</span>
            <span>€${pagamento.valorBase.toFixed(2)}</span>
        </div>
        ${pagamento.multa > 0 ? `
            <div class="info-row multa">
                <span>Multa (${Math.floor(pagamento.diasAtraso / 7)} semanas):</span>
                <span>+€${pagamento.multa.toFixed(2)}</span>
            </div>
        ` : ''}
        <div class="info-row total">
            <span><strong>Total a Pagar:</strong></span>
            <strong>€${pagamento.valorTotal.toFixed(2)}</strong>
        </div>
    `;

    document.getElementById('inputValorPago').value = pagamento.valorTotal.toFixed(2);
    document.getElementById('modalRegistar').style.display = 'flex';
};

function fecharModalRegistar() {
    document.getElementById('modalRegistar').style.display = 'none';
    document.getElementById('formRegistar').reset();
    pagamentoEmEdicao = null;
}

async function registarPagamento(e) {
    e.preventDefault();

    if (!pagamentoEmEdicao) return;

    const valorPago = parseFloat(document.getElementById('inputValorPago').value);
    const observacoes = document.getElementById('inputObservacoes').value;

    try {
        const response = await fetch(`${API_URL}/admin/pagamentos/${pagamentoEmEdicao._id}/registar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ valorPago, observacoes })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.erro || 'Erro ao registar pagamento');
        }

        mostrarMensagem('Pagamento registado com sucesso!', 'sucesso');
        fecharModalRegistar();
        await carregarPagamentos();
        await carregarEstatisticas();

    } catch (error) {
        console.error('Erro ao registar pagamento:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

// ============================================
// ELIMINAR PAGAMENTO
// ============================================

window.eliminarPagamento = async function(pagamentoId, isPago) {
    if (isPago) {
        mostrarMensagem('Não é possível eliminar um pagamento já registado', 'erro');
        return;
    }

    const confirmar = await mostrarModal(
        'Eliminar Pagamento',
        'Tem certeza que deseja eliminar este pagamento?'
    );

    if (!confirmar) return;

    try {
        const response = await fetch(`${API_URL}/admin/pagamentos/${pagamentoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.erro || 'Erro ao eliminar');
        }

        mostrarMensagem('Pagamento deletado', 'sucesso');
        await carregarPagamentos();
        await carregarEstatisticas();

    } catch (error) {
        console.error('Erro ao eliminar:', error);
        mostrarMensagem(error.message, 'erro');
    }
};

// ============================================
// MODAL CONFIRMAÇÃO
// ============================================

function mostrarModal(titulo, mensagem) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirm');
        document.getElementById('modalConfirmTitle').textContent = titulo;
        document.getElementById('modalConfirmMessage').textContent = mensagem;

        modal.style.display = 'flex';

        const btnConfirmar = document.getElementById('btnConfirmar');
        const btnCancelar = document.getElementById('btnCancelar');

        function fechar(resultado) {
            modal.style.display = 'none';
            btnConfirmar.onclick = null;
            btnCancelar.onclick = null;
            resolve(resultado);
        }

        btnConfirmar.onclick = () => fechar(true);
        btnCancelar.onclick = () => fechar(false);
    });
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
