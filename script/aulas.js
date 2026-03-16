// ============================================
// SISTEMA DE CALENDÁRIO DE AULAS - ALUNO
// ============================================

const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let todasAulas = [];
let minhasInscricoes = [];

// Dias da semana
const DIAS_SEMANA = {
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
    7: 'Domingo'
};

// Horários (06:00 - 22:00)
const HORA_INICIO = 6;
const HORA_FIM = 22;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    if (!token) {
        alert('Você precisa fazer login primeiro!');
        window.location.href = 'index.html';
        return;
    }

    // Carregar perfil
    await carregarPerfil();

    // Carregar aulas e inscrições
    await carregarDados();

    // Event listeners
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

async function carregarDados() {
    try {
        // Buscar todas as aulas
        const responseAulas = await fetch(`${API_URL}/aulas`);
        if (!responseAulas.ok) throw new Error('Erro ao buscar aulas');
        todasAulas = await responseAulas.json();

        // Buscar minhas inscrições
        const responseInscricoes = await fetch(`${API_URL}/minhas-inscricoes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!responseInscricoes.ok) throw new Error('Erro ao buscar inscrições');
        minhasInscricoes = await responseInscricoes.json();

        // Renderizar
        renderizarCalendario();
        renderizarMinhasInscricoes();

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        mostrarMensagem('Erro ao carregar dados', 'erro');
    }
}

// ============================================
// RENDERIZAR CALENDÁRIO
// ============================================

function renderizarCalendario() {
    const calendario = document.getElementById('calendario');
    calendario.innerHTML = '';

    // Header vazio (canto superior esquerdo)
    const headerEmpty = document.createElement('div');
    headerEmpty.className = 'cal-header cal-empty';
    headerEmpty.textContent = 'Hora';
    calendario.appendChild(headerEmpty);

    // Headers dos dias
    for (let dia = 1; dia <= 7; dia++) {
        const headerDia = document.createElement('div');
        headerDia.className = 'cal-header cal-dia';
        headerDia.textContent = DIAS_SEMANA[dia];
        calendario.appendChild(headerDia);
    }

    // Grid de horários
    for (let hora = HORA_INICIO; hora <= HORA_FIM; hora++) {
        // Coluna de hora
        const cellHora = document.createElement('div');
        cellHora.className = 'cal-hora';
        cellHora.textContent = `${String(hora).padStart(2, '0')}:00`;
        calendario.appendChild(cellHora);

        // Slots para cada dia
        for (let dia = 1; dia <= 7; dia++) {
            const horaStr = `${String(hora).padStart(2, '0')}:00`;
            const slot = document.createElement('div');
            slot.className = 'cal-slot';

            // Verificar se há aula neste horário
            const aula = todasAulas.find(a => 
                a.diaSemana === dia && a.hora === horaStr
            );

            if (aula) {
                // Há uma aula neste horário
                slot.classList.add('com-aula');
                
                // Verificar se estou inscrito
                const inscrito = minhasInscricoes.some(i => i._id === aula._id);
                if (inscrito) {
                    slot.classList.add('inscrito');
                }

                // Verificar se está lotada
                if (aula.vagasDisponiveis === 0 && !inscrito) {
                    slot.classList.add('lotada');
                }

                // Conteúdo da aula
                slot.innerHTML = `
                    <div class="aula-nome">${aula.nome}</div>
                    <div class="aula-professor">${aula.professor}</div>
                    <div class="aula-vagas">${aula.alunosInscritos}/${aula.limiteAlunos}</div>
                `;

                // Click handler
                slot.dataset.aulaId = aula._id;
                slot.dataset.inscrito = inscrito;
                slot.dataset.lotada = aula.vagasDisponiveis === 0 && !inscrito;
                slot.addEventListener('click', () => handleAulaClick(aula, inscrito));
            }

            calendario.appendChild(slot);
        }
    }
}

// ============================================
// CLICK NA AULA
// ============================================

async function handleAulaClick(aula, inscrito) {
    if (aula.vagasDisponiveis === 0 && !inscrito) {
        mostrarMensagem('Esta aula está lotada', 'erro');
        return;
    }

    if (inscrito) {
        // Desinscrever
        await desinscrever(aula);
    } else {
        // Inscrever
        await inscrever(aula);
    }
}

async function inscrever(aula) {
    const confirmar = await mostrarModal(
        'Inscrever em Aula',
        `
            <strong>${aula.nome}</strong><br>
            Professor: ${aula.professor}<br>
            ${DIAS_SEMANA[aula.diaSemana]} às ${aula.hora}<br>
            Vagas disponíveis: ${aula.vagasDisponiveis}/${aula.limiteAlunos}
        `,
        'Deseja se inscrever nesta aula?'
    );

    if (!confirmar) return;

    try {
        const response = await fetch(`${API_URL}/aulas/${aula._id}/inscrever`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.erro || 'Erro ao inscrever');
        }

        mostrarMensagem('✅ Inscrição realizada com sucesso!', 'sucesso');
        await carregarDados();

    } catch (error) {
        console.error('Erro ao inscrever:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

async function desinscrever(aula) {
    const confirmar = await mostrarModal(
        'Cancelar Inscrição',
        `
            <strong>${aula.nome}</strong><br>
            Professor: ${aula.professor}<br>
            ${DIAS_SEMANA[aula.diaSemana]} às ${aula.hora}
        `,
        'Deseja cancelar sua inscrição?'
    );

    if (!confirmar) return;

    try {
        const response = await fetch(`${API_URL}/aulas/${aula._id}/desinscrever`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.erro || 'Erro ao desinscrever');
        }

        mostrarMensagem('Inscrição cancelada', 'sucesso');
        await carregarDados();

    } catch (error) {
        console.error('Erro ao desinscrever:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

// ============================================
// MINHAS INSCRIÇÕES
// ============================================

function renderizarMinhasInscricoes() {
    const lista = document.getElementById('minhasInscricoesList');

    if (minhasInscricoes.length === 0) {
        lista.innerHTML = '<p class="vazio">Você não está inscrito em nenhuma aula</p>';
        return;
    }

    // Ordenar por dia e hora
    const inscricoesOrdenadas = [...minhasInscricoes].sort((a, b) => {
        if (a.diaSemana !== b.diaSemana) return a.diaSemana - b.diaSemana;
        return a.hora.localeCompare(b.hora);
    });

    lista.innerHTML = inscricoesOrdenadas.map(aula => `
        <div class="inscricao-card">
            <div class="inscricao-info">
                <div class="inscricao-nome">${aula.nome}</div>
                <div class="inscricao-details">
                    <span>📅 ${DIAS_SEMANA[aula.diaSemana]}</span>
                    <span>🕐 ${aula.hora}</span>
                    <span>👨‍🏫 ${aula.professor}</span>
                </div>
            </div>
            <button class="btn-cancelar-inscricao" data-id="${aula._id}">
                Cancelar
            </button>
        </div>
    `).join('');

    // Event listeners
    lista.querySelectorAll('.btn-cancelar-inscricao').forEach(btn => {
        btn.addEventListener('click', async () => {
            const aula = minhasInscricoes.find(a => a._id === btn.dataset.id);
            if (aula) {
                await desinscrever(aula);
            }
        });
    });
}

// ============================================
// MODAL
// ============================================

function mostrarModal(titulo, details, mensagem) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirm');
        document.getElementById('modalTitle').textContent = titulo;
        document.getElementById('modalDetails').innerHTML = details;
        document.getElementById('modalMessage').textContent = mensagem;

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

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
