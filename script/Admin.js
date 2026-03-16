// ============================================
// PAINEL ADMINISTRADOR - Admin.js
// ============================================

console.log('✅ Script do painel admin carregado!');

let allUsers = [];
let currentEditUserId = null;

// ============================================
// VERIFICAR SE É ADMIN E ESTÁ LOGADO
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const utilizador = localStorage.getItem('utilizador');
    
    if (!token || !utilizador) {
        alert('Precisa fazer login primeiro!');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const user = JSON.parse(utilizador);
        
        // Verificar se é admin
        if (!user.isAdmin) {
            alert('❌ Acesso negado! Apenas administradores podem aceder a esta página.');
            window.location.href = 'index.html';
            return;
        }
        
        // Mostrar nome do admin
        document.getElementById('adminName').textContent = user.nome;
        
        // Carregar dados
        loadStats();
        loadAllUsers();
        
        console.log('👨‍💼 Admin logado:', user.nome);
    } catch (e) {
        console.error('Erro ao verificar admin:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('utilizador');
        window.location.href = 'index.html';
    }
});

// ============================================
// CARREGAR ESTATÍSTICAS
// ============================================

async function loadStats() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('totalUtilizadores').textContent = stats.totalUtilizadores;
            document.getElementById('novosHoje').textContent = stats.novosHoje;
            document.getElementById('totalAdmins').textContent = stats.totalAdmins;
            
            // Graduação mais comum
            if (stats.porGraduacao && stats.porGraduacao.length > 0) {
                document.getElementById('graduacaoComum').textContent = stats.porGraduacao[0]._id;
            }
            
            console.log('📊 Estatísticas:', stats);
        } else {
            console.error('Erro ao carregar estatísticas');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ============================================
// CARREGAR TODOS OS UTILIZADORES
// ============================================

async function loadAllUsers() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Carregando utilizadores...</td></tr>';
    
    try {
        console.log('🔄 Buscando utilizadores...');
        const response = await fetch('/api/admin/utilizadores', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Status da resposta:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📦 Dados recebidos:', data);
            
            // A API retorna um objeto com paginação, pegar o array de utilizadores
            if (data.utilizadores && Array.isArray(data.utilizadores)) {
                allUsers = data.utilizadores;
                renderUsers(allUsers);
                console.log('👥 Utilizadores carregados:', allUsers.length);
                console.log('📄 Total no sistema:', data.total);
            } else {
                console.error('❌ Formato inválido da resposta');
                tbody.innerHTML = '<tr><td colspan="8" class="error-row">Erro: Formato de resposta inválido</td></tr>';
            }
        } else {
            const errorData = await response.json();
            console.error('❌ Erro na resposta:', errorData);
            tbody.innerHTML = '<tr><td colspan="8" class="error-row">Erro ao carregar utilizadores: ' + (errorData.erro || 'Erro desconhecido') + '</td></tr>';
        }
    } catch (error) {
        console.error('❌ Erro ao carregar utilizadores:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="error-row">Erro de conexão: ' + error.message + '</td></tr>';
    }
}

// ============================================
// RENDERIZAR TABELA DE UTILIZADORES
// ============================================

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    // Verificar se users é um array
    if (!Array.isArray(users)) {
        console.error('Erro: users não é um array:', users);
        tbody.innerHTML = '<tr><td colspan="8" class="error-row">Erro: Resposta inválida da API</td></tr>';
        return;
    }
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Nenhum utilizador encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const recordMMA = `${user.mma_vitorias || 0}-${user.mma_derrotas || 0}-${user.mma_empates || 0}`;
        const dataRegistro = new Date(user.dataRegisto).toLocaleDateString('pt-PT');
        const adminBadge = user.isAdmin ? '👨‍💼 Sim' : 'Não';
        const userId = user._id || user.id; // MongoDB usa _id
        
        return `
            <tr>
                <td><strong>${user.nome}</strong></td>
                <td>${user.email}</td>
                <td>${user.idade}</td>
                <td><span class="badge-graduacao">${user.graduacao}</span></td>
                <td>${recordMMA}</td>
                <td>${adminBadge}</td>
                <td>${dataRegistro}</td>
                <td class="actions-cell">
                    <button class="btn-action btn-view" onclick="viewUser('${userId}')" title="Ver">
                        👁️
                    </button>
                    <button class="btn-action btn-edit" onclick="editUser('${userId}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-action btn-admin" onclick="toggleAdmin('${userId}', ${!user.isAdmin})" title="${user.isAdmin ? 'Remover Admin' : 'Tornar Admin'}">
                        ${user.isAdmin ? '👤' : '👨‍💼'}
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteUser('${userId}', '${user.nome}')" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// PESQUISA EM TEMPO REAL
// ============================================

document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    const filteredUsers = allUsers.filter(user => 
        user.nome.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    
    renderUsers(filteredUsers);
});

// ============================================
// VER UTILIZADOR
// ============================================

async function viewUser(userId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/admin/utilizador/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            
            const content = `
                <div class="user-details">
                    <div class="detail-row">
                        <span class="detail-label">Nome:</span>
                        <span class="detail-value">${user.nome}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${user.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Idade:</span>
                        <span class="detail-value">${user.idade} anos</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Graduação:</span>
                        <span class="detail-value">${user.graduacao}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Administrador:</span>
                        <span class="detail-value">${user.isAdmin ? '👨‍💼 Sim' : 'Não'}</span>
                    </div>
                    
                    <h3>🥊 Carreira MMA</h3>
                    <div class="detail-row">
                        <span class="detail-label">Record:</span>
                        <span class="detail-value">${user.mma_vitorias || 0}-${user.mma_derrotas || 0}-${user.mma_empates || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Especialidade:</span>
                        <span class="detail-value">${user.mma_especialidade || 'N/A'}</span>
                    </div>
                    
                    <h3>🤼 Carreira BJJ</h3>
                    <div class="detail-row">
                        <span class="detail-label">Record:</span>
                        <span class="detail-value">${user.bjj_vitorias || 0}-${user.bjj_derrotas || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Especialidade:</span>
                        <span class="detail-value">${user.bjj_especialidade || 'N/A'}</span>
                    </div>
                    
                    <h3>📏 Características Físicas</h3>
                    <div class="detail-row">
                        <span class="detail-label">Altura:</span>
                        <span class="detail-value">${user.altura ? user.altura + 'm' : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Peso:</span>
                        <span class="detail-value">${user.peso ? user.peso + 'kg' : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Alcance:</span>
                        <span class="detail-value">${user.alcance ? user.alcance + 'cm' : 'N/A'}</span>
                    </div>
                    
                    <h3>📝 Sobre</h3>
                    <p class="user-bio">${user.sobre || 'Sem biografia'}</p>
                    
                    <div class="detail-row">
                        <span class="detail-label">Membro desde:</span>
                        <span class="detail-value">${new Date(user.dataRegisto).toLocaleDateString('pt-PT', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                        })}</span>
                    </div>
                    
                    <div style="margin-top: 2rem; text-align: center;">
                        <a href="AtletaPerfil.html?id=${userId}" 
                           target="_blank"
                           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s;">
                            👁️ Ver Perfil Completo
                        </a>
                    </div>
                </div>
            `;
            
            document.getElementById('userDetailsContent').innerHTML = content;
            document.getElementById('viewUserModal').style.display = 'flex';
        } else {
            alert('Erro ao carregar utilizador');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

function closeViewModal() {
    document.getElementById('viewUserModal').style.display = 'none';
}

// ============================================
// EDITAR UTILIZADOR
// ============================================

async function editUser(userId) {
    const token = localStorage.getItem('token');
    currentEditUserId = userId;
    
    try {
        const response = await fetch(`/api/admin/utilizador/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Preencher formulário
            document.getElementById('editNome').value = user.nome;
            document.getElementById('editEmail').value = user.email;
            document.getElementById('editIdade').value = user.idade;
            document.getElementById('editGraduacao').value = user.graduacao;
            document.getElementById('editMmaVitorias').value = user.mma_vitorias || 0;
            document.getElementById('editMmaDerrotas').value = user.mma_derrotas || 0;
            document.getElementById('editMmaEmpates').value = user.mma_empates || 0;
            document.getElementById('editMmaEspecialidade').value = user.mma_especialidade || '';
            document.getElementById('editBjjVitorias').value = user.bjj_vitorias || 0;
            document.getElementById('editBjjDerrotas').value = user.bjj_derrotas || 0;
            document.getElementById('editBjjEspecialidade').value = user.bjj_especialidade || '';
            document.getElementById('editAltura').value = user.altura || '';
            document.getElementById('editPeso').value = user.peso || '';
            document.getElementById('editAlcance').value = user.alcance || '';
            document.getElementById('editSobre').value = user.sobre || '';
            
            document.getElementById('editUserModal').style.display = 'flex';
        } else {
            alert('Erro ao carregar utilizador');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

function closeEditModal() {
    document.getElementById('editUserModal').style.display = 'none';
    document.getElementById('editError').style.display = 'none';
    currentEditUserId = null;
}

// Handle edit form submission
document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const errorEl = document.getElementById('editError');
    errorEl.style.display = 'none';
    
    const dadosAtualizacao = {
        nome: document.getElementById('editNome').value.trim(),
        idade: parseInt(document.getElementById('editIdade').value),
        graduacao: document.getElementById('editGraduacao').value,
        mma_vitorias: parseInt(document.getElementById('editMmaVitorias').value) || 0,
        mma_derrotas: parseInt(document.getElementById('editMmaDerrotas').value) || 0,
        mma_empates: parseInt(document.getElementById('editMmaEmpates').value) || 0,
        mma_especialidade: document.getElementById('editMmaEspecialidade').value.trim(),
        bjj_vitorias: parseInt(document.getElementById('editBjjVitorias').value) || 0,
        bjj_derrotas: parseInt(document.getElementById('editBjjDerrotas').value) || 0,
        bjj_especialidade: document.getElementById('editBjjEspecialidade').value.trim(),
        altura: parseFloat(document.getElementById('editAltura').value) || null,
        peso: parseFloat(document.getElementById('editPeso').value) || null,
        alcance: parseInt(document.getElementById('editAlcance').value) || null,
        sobre: document.getElementById('editSobre').value.trim()
    };
    
    try {
        const response = await fetch(`/api/admin/utilizador/${currentEditUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosAtualizacao)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeEditModal();
            showSuccess('Utilizador Atualizado!', 'Os dados foram atualizados com sucesso.');
            loadAllUsers();
            loadStats();
        } else {
            errorEl.textContent = data.erro || 'Erro ao atualizar utilizador';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro:', error);
        errorEl.textContent = 'Erro de conexão. Tente novamente.';
        errorEl.style.display = 'block';
    }
});

// ============================================
// TORNAR/REMOVER ADMIN
// ============================================

async function toggleAdmin(userId, makeAdmin) {
    const action = makeAdmin ? 'promover a administrador' : 'remover privilégios de admin';
    
    if (!confirm(`Deseja realmente ${action} este utilizador?`)) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/admin/tornar-admin/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isAdmin: makeAdmin })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Permissões Alteradas!', data.mensagem);
            loadAllUsers();
            loadStats();
        } else {
            alert('Erro: ' + (data.erro || 'Erro ao alterar permissões'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

// ============================================
// ELIMINAR UTILIZADOR
// ============================================

async function deleteUser(userId, userName) {
    const confirmation = prompt(
        `⚠️ ATENÇÃO! Esta ação é irreversível.\n\nPara eliminar ${userName}, digite "ELIMINAR":`
    );
    
    if (confirmation !== 'ELIMINAR') {
        if (confirmation !== null) {
            alert('Texto incorreto. Utilizador não foi eliminado.');
        }
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/admin/utilizador/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Utilizador Eliminado!', `${userName} foi eliminado com sucesso.`);
            loadAllUsers();
            loadStats();
        } else {
            alert('Erro: ' + (data.erro || 'Erro ao eliminar utilizador'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

// ============================================
// SUCCESS MODAL
// ============================================

function showSuccess(title, message) {
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').style.display = 'flex';
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

// ============================================
// LOGOUT
// ============================================

function logout() {
    if (confirm('Deseja realmente sair do painel admin?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('utilizador');
        window.location.href = 'index.html';
    }
}

console.log('✅ Script do painel admin totalmente carregado!');