// ============================================
// GERIR AULAS - ADMIN
// ============================================

const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let todasAulas = [];
let aulaEmEdicao = null;

const DIAS_SEMANA = {
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
    7: 'Domingo'
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

    await carregarAulas();

    // Event listeners
    document.getElementById('btnNovaAula').addEventListener('click', abrirModalNovaAula);
    document.getElementById('formAula').addEventListener('submit', salvarAula);
    document.getElementById('btnCancelarForm').addEventListener('click', fecharModalAula);
    document.getElementById('btnFecharAlunos').addEventListener('click', fecharModalAlunos);
});

// ============================================
// CARREGAR AULAS
// ============================================

async function carregarAulas() {
    try {
        const response = await fetch(`${API_URL}/admin/aulas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar aulas');

        todasAulas = await response.json();
        renderizarAulas();

    } catch (error) {
        console.error('Erro ao carregar aulas:', error);
        mostrarMensagem('Erro ao carregar aulas', 'erro');
    }
}

// ============================================
// RENDERIZAR AULAS
// ============================================

function renderizarAulas() {
    const grid = document.getElementById('aulasGrid');

    if (todasAulas.length === 0) {
        grid.innerHTML = '<p class="vazio">Nenhuma aula criada ainda</p>';
        return;
    }

    // Ordenar por dia e hora
    const aulasOrdenadas = [...todasAulas].sort((a, b) => {
        if (a.diaSemana !== b.diaSemana) return a.diaSemana - b.diaSemana;
        return a.hora.localeCompare(b.hora);
    });

    grid.innerHTML = aulasOrdenadas.map(aula => `
        <div class="aula-card ${!aula.ativa ? 'inativa' : ''}">
            <div class="aula-header" style="background: ${aula.cor}">
                <div class="aula-nome">${aula.nome}</div>
                <div class="aula-status">
                    ${aula.ativa ? '✓ Ativa' : '✗ Inativa'}
                </div>
            </div>
            <div class="aula-body">
                <div class="aula-info">
                    <div class="info-item">
                        <span class="label">👨‍🏫 Professor:</span>
                        <span class="value">${aula.professor}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">📅 Quando:</span>
                        <span class="value">${DIAS_SEMANA[aula.diaSemana]} às ${aula.hora}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">⏱️ Duração:</span>
                        <span class="value">${aula.duracao} min</span>
                    </div>
                    <div class="info-item">
                        <span class="label">👥 Vagas:</span>
                        <span class="value">${aula.vagasOcupadas}/${aula.limiteAlunos}</span>
                    </div>
                </div>
                <div class="aula-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(aula.vagasOcupadas / aula.limiteAlunos) * 100}%; background: ${aula.cor}"></div>
                    </div>
                    <div class="progress-text">
                        ${aula.vagasDisponiveis} vagas disponíveis
                    </div>
                </div>
            </div>
            <div class="aula-actions">
                <button class="btn-ver-alunos" onclick="verAlunos('${aula._id}')">
                    Ver Alunos (${aula.vagasOcupadas})
                </button>
                <button class="btn-editar" onclick="editarAula('${aula._id}')">
                    ✏️ Editar
                </button>
                <button class="btn-eliminar" onclick="eliminarAula('${aula._id}')">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// NOVA AULA
// ============================================

function abrirModalNovaAula() {
    aulaEmEdicao = null;
    document.getElementById('modalTitle').textContent = 'Nova Aula';
    document.getElementById('formAula').reset();
    document.getElementById('inputAtiva').value = 'true';
    document.getElementById('modalAula').style.display = 'flex';
}

function fecharModalAula() {
    document.getElementById('modalAula').style.display = 'none';
    aulaEmEdicao = null;
}

// ============================================
// EDITAR AULA
// ============================================

window.editarAula = function(aulaId) {
    const aula = todasAulas.find(a => a._id === aulaId);
    if (!aula) return;

    aulaEmEdicao = aula;
    document.getElementById('modalTitle').textContent = 'Editar Aula';
    
    // Preencher formulário
    document.getElementById('inputNome').value = aula.nome;
    document.getElementById('inputProfessor').value = aula.professor;
    document.getElementById('inputDiaSemana').value = aula.diaSemana;
    document.getElementById('inputHora').value = aula.hora;
    document.getElementById('inputDuracao').value = aula.duracao;
    document.getElementById('inputLimite').value = aula.limiteAlunos;
    document.getElementById('inputCor').value = aula.cor;
    document.getElementById('inputAtiva').value = aula.ativa.toString();

    document.getElementById('modalAula').style.display = 'flex';
};

// ============================================
// SALVAR AULA
// ============================================

async function salvarAula(e) {
    e.preventDefault();

    const dados = {
        nome: document.getElementById('inputNome').value.trim(),
        professor: document.getElementById('inputProfessor').value.trim(),
        diaSemana: parseInt(document.getElementById('inputDiaSemana').value),
        hora: document.getElementById('inputHora').value,
        duracao: parseInt(document.getElementById('inputDuracao').value),
        limiteAlunos: parseInt(document.getElementById('inputLimite').value),
        cor: document.getElementById('inputCor').value,
        ativa: document.getElementById('inputAtiva').value === 'true'
    };

    try {
        let response;
        
        if (aulaEmEdicao) {
            // Editar
            response = await fetch(`${API_URL}/admin/aulas/${aulaEmEdicao._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dados)
            });
        } else {
            // Criar
            response = await fetch(`${API_URL}/admin/aulas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dados)
            });
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.erro || 'Erro ao salvar aula');
        }

        mostrarMensagem(aulaEmEdicao ? 'Aula atualizada!' : 'Aula criada!', 'sucesso');
        fecharModalAula();
        await carregarAulas();

    } catch (error) {
        console.error('Erro ao salvar aula:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

// ============================================
// ELIMINAR AULA
// ============================================

window.eliminarAula = async function(aulaId) {
    const aula = todasAulas.find(a => a._id === aulaId);
    if (!aula) return;

    const confirmar = await mostrarModal(
        'Eliminar Aula',
        `Tem certeza que deseja eliminar a aula "${aula.nome}"?`
    );

    if (!confirmar) return;

    try {
        const response = await fetch(`${API_URL}/admin/aulas/${aulaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.erro || 'Erro ao eliminar aula');
        }

        mostrarMensagem('Aula deletada', 'sucesso');
        await carregarAulas();

    } catch (error) {
        console.error('Erro ao eliminar aula:', error);
        mostrarMensagem(error.message, 'erro');
    }
};

// ============================================
// VER ALUNOS
// ============================================

window.verAlunos = async function(aulaId) {
    try {
        const response = await fetch(`${API_URL}/admin/aulas/${aulaId}/alunos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar alunos');

        const data = await response.json();

        document.getElementById('modalAlunosTitle').textContent = 
            `Alunos Inscritos: ${data.aula.nome}`;

        document.getElementById('modalAlunosInfo').innerHTML = `
            <div class="info-grid">
                <div class="info-box">
                    <div class="info-label">Professor</div>
                    <div class="info-value">${data.aula.professor}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Horário</div>
                    <div class="info-value">${DIAS_SEMANA[data.aula.diaSemana]} às ${data.aula.hora}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Vagas Ocupadas</div>
                    <div class="info-value">${data.aula.vagasOcupadas}/${data.aula.limiteAlunos}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Vagas Disponíveis</div>
                    <div class="info-value">${data.aula.vagasDisponiveis}</div>
                </div>
            </div>
        `;

        const listaAlunos = document.getElementById('listaAlunos');

        if (data.alunos.length === 0) {
            listaAlunos.innerHTML = '<p class="vazio">Nenhum aluno inscrito</p>';
        } else {
            listaAlunos.innerHTML = data.alunos.map((aluno, index) => `
                <div class="aluno-item">
                    <div class="aluno-numero">${index + 1}</div>
                    <div class="aluno-info">
                        <div class="aluno-nome">${aluno.nome}</div>
                        <div class="aluno-detalhes">
                            <span>📧 ${aluno.email}</span>
                            ${aluno.telefone ? `<span>📱 ${aluno.telefone}</span>` : ''}
                            <span>🥋 ${aluno.graduacao}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('modalAlunos').style.display = 'flex';

    } catch (error) {
        console.error('Erro ao buscar alunos:', error);
        mostrarMensagem('Erro ao buscar alunos', 'erro');
    }
};

function fecharModalAlunos() {
    document.getElementById('modalAlunos').style.display = 'none';
}

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

function mostrarMensagem(texto, tipo) {
    const msg = document.createElement('div');
    msg.className = `mensagem mensagem-${tipo}`;
    msg.textContent = texto;
    document.body.appendChild(msg);

    setTimeout(() => msg.remove(), 3000);
}
