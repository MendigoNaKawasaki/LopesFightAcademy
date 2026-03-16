// ============================================
// PAINEL SUPER ADMINISTRADOR - superadmin.js
// ============================================

console.log('✅ Script do painel Super Admin carregado!');

let allAdmins = [];
let statsData = {};

// ============================================
// VERIFICAR SE É SUPER ADMIN E ESTÁ LOGADO
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
        
        // Verificar se é SUPER admin
        if (!user.isSuperAdmin) {
            alert('❌ Acesso negado! Apenas Super Administradores podem aceder a esta página.');
            window.location.href = user.isAdmin ? 'Admin.html' : 'index.html';
            return;
        }
        
        // Mostrar nome do super admin
        document.getElementById('adminName').textContent = user.nome;
        
        // Carregar dados
        loadAdvancedStats();
        loadAllAdmins();
        loadLogs();
        
        // Setup tabs
        setupTabs();
        
        console.log('👑 Super Admin logado:', user.nome);
    } catch (e) {
        console.error('Erro ao verificar super admin:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('utilizador');
        window.location.href = 'index.html';
    }
});

// ============================================
// TABS SYSTEM
// ============================================

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            btn.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Load data for specific tab if needed
            if (tabName === 'logs') {
                loadLogs();
            } else if (tabName === 'graduacoes') {
                renderGraduacoesChart();
            }
        });
    });
}

// ============================================
// CARREGAR ESTATÍSTICAS AVANÇADAS
// ============================================

async function loadAdvancedStats() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/superadmin/stats-avancadas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            statsData = await response.json();
            
            document.getElementById('totalUtilizadores').textContent = statsData.totalUtilizadores;
            document.getElementById('totalAdmins').textContent = statsData.totalAdmins;
            document.getElementById('totalSuperAdmins').textContent = statsData.totalSuperAdmins;
            document.getElementById('novosUltimos7Dias').textContent = statsData.novosUltimos7Dias;
            document.getElementById('adminsAutomaticos').textContent = statsData.adminsAutomaticos;
            document.getElementById('totalNormais').textContent = statsData.totalNormais;
            
            console.log('📊 Estatísticas avançadas:', statsData);
        } else {
            console.error('Erro ao carregar estatísticas');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ============================================
// CARREGAR TODOS OS ADMINS
// ============================================

async function loadAllAdmins() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('adminsTableBody');
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Carregando administradores...</td></tr>';
    
    try {
        const response = await fetch('/api/superadmin/admins', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            allAdmins = await response.json();
            renderAdmins(allAdmins);
            console.log('👨‍💼 Admins carregados:', allAdmins.length);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="error-row">Erro ao carregar administradores</td></tr>';
        }
    } catch (error) {
        console.error('Erro:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error-row">Erro de conexão</td></tr>';
    }
}

// ============================================
// RENDERIZAR TABELA DE ADMINS
// ============================================

function renderAdmins(admins) {
    const tbody = document.getElementById('adminsTableBody');
    
    if (admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum administrador encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = admins.map(admin => {
        const dataRegistro = new Date(admin.criado_em).toLocaleDateString('pt-PT');
        const tipoAdmin = admin.isSuperAdmin ? '👑 Super Admin' : '👨‍💼 Admin';
        const tipoClass = admin.isSuperAdmin ? 'super-admin-badge' : 'admin-badge';
        
        return `
            <tr>
                <td><strong>${admin.nome}</strong></td>
                <td>${admin.email}</td>
                <td><span class="badge-graduacao">${admin.graduacao}</span></td>
                <td><span class="${tipoClass}">${tipoAdmin}</span></td>
                <td>${dataRegistro}</td>
                <td class="actions-cell">
                    <button 
                        class="btn-action btn-superadmin" 
                        onclick="toggleSuperAdmin('${admin.id}', ${!admin.isSuperAdmin}, '${admin.nome}')" 
                        title="${admin.isSuperAdmin ? 'Remover Super Admin' : 'Promover a Super Admin'}">
                        ${admin.isSuperAdmin ? '👤' : '👑'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// PROMOVER/REMOVER SUPER ADMIN
// ============================================

async function toggleSuperAdmin(userId, makeSuperAdmin, userName) {
    const action = makeSuperAdmin ? 'promover a Super Administrador' : 'remover privilégios de Super Admin';
    
    if (!confirm(`Deseja realmente ${action} o utilizador ${userName}?`)) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/superadmin/tornar-superadmin/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isSuperAdmin: makeSuperAdmin })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Permissões Alteradas!', data.mensagem);
            loadAllAdmins();
            loadAdvancedStats();
        } else {
            alert('Erro: ' + (data.erro || 'Erro ao alterar permissões'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

// ============================================
// CARREGAR LOGS
// ============================================

async function loadLogs() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('logsTableBody');
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Carregando logs...</td></tr>';
    
    try {
        const response = await fetch('/api/superadmin/logs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderLogs(data.logs);
            console.log('📜 Logs carregados:', data.logs.length);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="error-row">Erro ao carregar logs</td></tr>';
        }
    } catch (error) {
        console.error('Erro:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error-row">Erro de conexão</td></tr>';
    }
}

// ============================================
// RENDERIZAR LOGS
// ============================================

function renderLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum log encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        const dataFormatada = new Date(log.data).toLocaleString('pt-PT');
        const adminStatus = log.isAdmin ? '✅ Sim' : 'Não';
        
        return `
            <tr>
                <td><span class="log-tipo">${log.tipo}</span></td>
                <td>${log.utilizador}</td>
                <td>${log.email}</td>
                <td><span class="badge-graduacao">${log.graduacao}</span></td>
                <td>${adminStatus}</td>
                <td>${dataFormatada}</td>
            </tr>
        `;
    }).join('');
}

// ============================================
// RENDER GRADUAÇÕES CHART
// ============================================

function renderGraduacoesChart() {
    if (!statsData.porGraduacao || statsData.porGraduacao.length === 0) {
        document.getElementById('graduacoesChart').innerHTML = '<p>Sem dados disponíveis</p>';
        return;
    }
    
    const container = document.getElementById('graduacoesChart');
    const maxCount = Math.max(...statsData.porGraduacao.map(g => g.count));
    
    const html = statsData.porGraduacao.map(grad => {
        const percentage = (grad.count / maxCount) * 100;
        const isAdmin = grad._id === 'Preta' || grad._id === 'Castanho (Marrom)';
        const adminLabel = isAdmin ? ' ⚡ (Admin Automático)' : '';
        const barClass = isAdmin ? 'bar-admin' : 'bar-normal';
        
        return `
            <div class="chart-row">
                <div class="chart-label">${grad._id}${adminLabel}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar ${barClass}" style="width: ${percentage}%"></div>
                    <span class="chart-value">${grad.count}</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
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
    if (confirm('Deseja realmente sair do painel Super Admin?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('utilizador');
        window.location.href = 'index.html';
    }
}

console.log('✅ Script do painel Super Admin totalmente carregado!');