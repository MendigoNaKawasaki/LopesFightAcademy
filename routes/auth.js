// ============================================
// SCRIPT DE AUTENTICAÇÃO - auth.js (CORRIGIDO)
// ============================================

console.log('✅ Script de autenticação carregado!');

// Elementos do DOM (podem não existir em todas as páginas)
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const closeModal = document.getElementById('closeModal');
const tabBtns = document.querySelectorAll('.tab-btn');
const authForms = document.querySelectorAll('.auth-form');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// ============================================
// ABRIR E FECHAR MODAL (só se existir!)
// ============================================

if (loginBtn && authModal) {
    loginBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
}

if (closeModal && authModal) {
    closeModal.addEventListener('click', () => {
        authModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        hideMessages();
    });
}

if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            hideMessages();
        }
    });
}

// ============================================
// ALTERNAR TABS (LOGIN / REGISTO)
// ============================================

if (tabBtns.length > 0) {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            authForms.forEach(form => form.classList.remove('active'));
            const targetForm = document.getElementById(tab + 'Form');
            if (targetForm) {
                targetForm.classList.add('active');
            }
            
            hideMessages();
        });
    });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
    if (successMsg) {
        successMsg.style.display = 'none';
    }
}

function showSuccess(message) {
    const successMsg = document.getElementById('successMessage');
    const errorMsg = document.getElementById('errorMessage');
    if (successMsg) {
        successMsg.textContent = message;
        successMsg.style.display = 'block';
    }
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

function hideMessages() {
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';
}

function updateUIForLoggedUser(utilizador) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userName) userName.textContent = utilizador.nome;
    
    // Mostrar link de Perfil no menu
    const perfilLink = document.getElementById('perfilLink');
    if (perfilLink) {
        perfilLink.style.display = 'block';
    }
    
    // Mostrar link Admin se for administrador
    const adminLink = document.getElementById('adminLink');
    if (adminLink && utilizador.isAdmin) {
        adminLink.style.display = 'block';
    }
    
    // Mostrar link Super Admin se for super administrador
    const superAdminLink = document.getElementById('superAdminLink');
    if (superAdminLink && utilizador.isSuperAdmin) {
        superAdminLink.style.display = 'block';
    }
    
    // Fazer o nome clicável para ir ao perfil
    if (userName) {
        userName.style.cursor = 'pointer';
        userName.style.transition = 'all 0.3s';
        userName.title = 'Clique para ver o seu perfil';
        
        userName.onclick = () => {
            window.location.href = 'Perfil.html';
        };
        
        userName.onmouseover = () => {
            userName.style.color = '#10b981';
            userName.style.textDecoration = 'underline';
        };
        
        userName.onmouseout = () => {
            userName.style.color = '';
            userName.style.textDecoration = 'none';
        };
    }
}

function updateUIForLoggedOut() {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (userName) userName.textContent = '';
    
    const perfilLink = document.getElementById('perfilLink');
    if (perfilLink) {
        perfilLink.style.display = 'none';
    }
    
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        adminLink.style.display = 'none';
    }
    
    const superAdminLink = document.getElementById('superAdminLink');
    if (superAdminLink) {
        superAdminLink.style.display = 'none';
    }
}

// ============================================
// VERIFICAR SE UTILIZADOR JÁ ESTÁ LOGADO
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const utilizador = localStorage.getItem('utilizador');
    
    if (token && utilizador) {
        try {
            const user = JSON.parse(utilizador);
            updateUIForLoggedUser(user);
            console.log('👤 Utilizador logado:', user.nome);
        } catch (e) {
            console.error('Erro ao parsear utilizador:', e);
            localStorage.removeItem('token');
            localStorage.removeItem('utilizador');
        }
    }
});

// ============================================
// LOGOUT
// ============================================

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Deseja realmente sair?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('utilizador');
            updateUIForLoggedOut();
            console.log('👋 Logout realizado');
            alert('Logout realizado com sucesso!');
        }
    });
}

// ============================================
// FORMULÁRIO DE LOGIN
// ============================================

const loginForm = document.getElementById('loginForm');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginLoading = document.getElementById('loginLoading');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();

        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPass').value;

        if (!email || !pass) {
            showError('⚠️ Preencha todos os campos!');
            return;
        }

        if (loginSubmitBtn) loginSubmitBtn.disabled = true;
        if (loginLoading) loginLoading.style.display = 'block';

        try {
            console.log('🔐 Tentando login...', { email });
            
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pass })
            });

            console.log('📡 Status:', response.status);
            const data = await response.json();
            console.log('📦 Resposta:', data);

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('utilizador', JSON.stringify(data.utilizador));
                
                showSuccess('✅ Login realizado! Bem-vindo, ' + data.utilizador.nome);
                
                setTimeout(() => {
                    if (authModal) {
                        authModal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                    updateUIForLoggedUser(data.utilizador);
                    loginForm.reset();
                }, 1500);
            } else {
                showError('❌ ' + (data.erro || 'Erro ao fazer login'));
            }
        } catch (error) {
            console.error('❌ Erro completo:', error);
            showError('❌ Erro de conexão. Verifique se o servidor está a correr.');
        } finally {
            if (loginSubmitBtn) loginSubmitBtn.disabled = false;
            if (loginLoading) loginLoading.style.display = 'none';
        }
    });
}

// ============================================
// FORMULÁRIO DE REGISTO
// ============================================

const registoForm = document.getElementById('registoForm');
const registoSubmitBtn = document.getElementById('registoSubmitBtn');
const registoLoading = document.getElementById('registoLoading');

if (registoForm) {
    registoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();

        const nome = document.getElementById('registoNome').value.trim();
        const idade = document.getElementById('registoIdade').value;
        const arte_marcial = document.getElementById('registoFaixa').value;
        const email = document.getElementById('registoEmail').value.trim();
        const pass = document.getElementById('registoPass').value;
        const confirmarPass = document.getElementById('registoConfirmarPass').value;

        // Validações
        if (!nome || !idade || !arte_marcial || !email || !pass || !confirmarPass) {
            showError('⚠️ Preencha todos os campos!');
            return;
        }

        if (pass !== confirmarPass) {
            showError('❌ As palavras-passe não coincidem!');
            return;
        }

        if (pass.length < 6) {
            showError('❌ A palavra-passe deve ter pelo menos 6 caracteres!');
            return;
        }

        if (registoSubmitBtn) registoSubmitBtn.disabled = true;
        if (registoLoading) registoLoading.style.display = 'block';

        try {
            console.log('📝 Criando conta...', { nome, idade, arte_marcial, email });
            
            const response = await fetch('/api/registo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, idade, arte_marcial, email, pass })
            });

            console.log('📡 Status:', response.status);
            const data = await response.json();
            console.log('📦 Resposta:', data);

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('utilizador', JSON.stringify(data.utilizador));
                
                showSuccess('✅ Conta criada! Bem-vindo, ' + data.utilizador.nome);
                
                setTimeout(() => {
                    if (authModal) {
                        authModal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                    updateUIForLoggedUser(data.utilizador);
                    registoForm.reset();
                }, 1500);
            } else {
                showError('❌ ' + (data.erro || 'Erro ao criar conta'));
            }
        } catch (error) {
            console.error('❌ Erro completo:', error);
            showError('❌ Erro de conexão. Verifique se o servidor está a correr.');
        } finally {
            if (registoSubmitBtn) registoSubmitBtn.disabled = false;
            if (registoLoading) registoLoading.style.display = 'none';
        }
    });
}

// ============================================
// FUNÇÃO PARA ACESSAR ROTA PROTEGIDA
// ============================================

async function buscarPerfil() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ Utilizador não autenticado');
        return null;
    }

    try {
        const response = await fetch('/api/perfil', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('👤 Perfil completo:', data);
            return data;
        } else {
            console.log('❌ Token inválido ou expirado');
            localStorage.removeItem('token');
            localStorage.removeItem('utilizador');
            updateUIForLoggedOut();
            return null;
        }
    } catch (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        return null;
    }
}

console.log('✅ Script de autenticação totalmente carregado!');