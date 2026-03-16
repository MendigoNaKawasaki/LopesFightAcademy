// ============================================
// PERFIL.JS - COMPLETAMENTE REFEITO
// ============================================

console.log('🔄 Perfil.js carregado!');

// ============================================
// VERIFICAR AUTENTICAÇÃO E CARREGAR PERFIL
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM carregado, verificando autenticação...');
    
    const token = localStorage.getItem('token');
    const utilizadorStr = localStorage.getItem('utilizador');
    
    console.log('Token:', token ? 'Existe ✅' : 'Não existe ❌');
    console.log('Utilizador:', utilizadorStr ? 'Existe ✅' : 'Não existe ❌');
    
    if (!token || !utilizadorStr) {
        console.log('❌ Não autenticado! Redirecionando...');
        alert('Precisa fazer login primeiro!');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const utilizador = JSON.parse(utilizadorStr);
        console.log('✅ Utilizador parseado:', utilizador);
        loadUserProfile(utilizador);
    } catch (e) {
        console.error('❌ Erro ao parsear utilizador:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('utilizador');
        window.location.href = 'index.html';
    }
});

// ============================================
// CARREGAR DADOS DO PERFIL
// ============================================

function loadUserProfile(user) {
    console.log('📥 Carregando perfil do utilizador:', user.nome);
    
    try {
        // Avatar com iniciais
        const initials = getInitials(user.nome);
        document.getElementById('avatarInitials').textContent = initials;
        console.log('Avatar:', initials);
        
        // Header do perfil
        document.getElementById('profileName').textContent = user.nome;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileBadge').textContent = user.arte_marcial || 'Membro';
        
        // Mostrar link Admin se for admin
        if (user.isAdmin) {
            const adminLink = document.getElementById('adminLink');
            if (adminLink) {
                adminLink.style.display = 'flex';
            }
        }
        
        // Stats cards
        document.getElementById('statGraduacao').textContent = user.arte_marcial || '-';
        
        // Record MMA
        const mmaVit = user.mma_vitorias || 0;
        const mmaDer = user.mma_derrotas || 0;
        const mmaEmp = user.mma_empates || 0;
        document.getElementById('statRecordMMA').textContent = `${mmaVit}-${mmaDer}-${mmaEmp}`;
        
        // Record BJJ
        const bjjVit = user.bjj_vitorias || 0;
        const bjjDer = user.bjj_derrotas || 0;
        document.getElementById('statRecordBJJ').textContent = `${bjjVit}-${bjjDer}`;
        
        // Membro desde
        const memberDate = new Date(user.criado_em || Date.now());
        document.getElementById('statMembro').textContent = formatMemberDate(memberDate);
        
        // Formulário - Informações Básicas
        document.getElementById('nome').value = user.nome || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('idade').value = user.idade || '';
        document.getElementById('graduacao').value = user.arte_marcial || '';
        
        // Formulário - Carreira MMA
        document.getElementById('mmaVitorias').value = user.mma_vitorias || 0;
        document.getElementById('mmaDerrotas').value = user.mma_derrotas || 0;
        document.getElementById('mmaEmpates').value = user.mma_empates || 0;
        document.getElementById('mmaEspecialidade').value = user.mma_especialidade || '';
        
        // Formulário - Carreira BJJ
        document.getElementById('bjjVitorias').value = user.bjj_vitorias || 0;
        document.getElementById('bjjDerrotas').value = user.bjj_derrotas || 0;
        document.getElementById('bjjEspecialidade').value = user.bjj_especialidade || '';
        
        // Formulário - Características Físicas
        document.getElementById('altura').value = user.altura || '';
        document.getElementById('peso').value = user.peso || '';
        document.getElementById('alcance').value = user.alcance || '';
        
        // Formulário - Sobre
        document.getElementById('sobre').value = user.sobre || '';
        
        console.log('✅ Perfil carregado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        alert('Erro ao carregar perfil. Tente fazer login novamente.');
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMemberDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 1) return 'Hoje';
    if (days === 1) return '1 dia';
    if (days < 30) return days + ' dias';
    if (days < 60) return '1 mês';
    if (days < 365) return Math.floor(days / 30) + ' meses';
    if (days < 730) return '1 ano';
    return Math.floor(days / 365) + ' anos';
}

// ============================================
// MODO DE EDIÇÃO
// ============================================

let isEditMode = false;

function toggleEditMode() {
    console.log('🔄 Alternando modo de edição...');
    
    isEditMode = !isEditMode;
    const inputs = document.querySelectorAll('#profileForm input, #profileForm select, #profileForm textarea');
    const formActions = document.getElementById('formActions');
    const editBtn = document.getElementById('editBtn');
    
    inputs.forEach(input => {
        if (input.id !== 'email') { // Email não pode ser editado
            input.disabled = !isEditMode;
        }
    });
    
    if (isEditMode) {
        console.log('✏️ Modo de edição ATIVADO');
        formActions.style.display = 'flex';
        editBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancelar
        `;
    } else {
        console.log('🔒 Modo de edição DESATIVADO');
        formActions.style.display = 'none';
        editBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Editar
        `;
        
        // Recarregar dados originais
        const utilizadorStr = localStorage.getItem('utilizador');
        if (utilizadorStr) {
            const utilizador = JSON.parse(utilizadorStr);
            loadUserProfile(utilizador);
        }
    }
}

function cancelEdit() {
    console.log('❌ Cancelando edição...');
    toggleEditMode();
}

// ============================================
// GUARDAR ALTERAÇÕES
// ============================================

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('💾 Guardando alterações...');
    
    const nome = document.getElementById('nome').value.trim();
    const idade = document.getElementById('idade').value;
    const graduacao = document.getElementById('graduacao').value;
    
    // MMA
    const mmaVitorias = parseInt(document.getElementById('mmaVitorias').value) || 0;
    const mmaDerrotas = parseInt(document.getElementById('mmaDerrotas').value) || 0;
    const mmaEmpates = parseInt(document.getElementById('mmaEmpates').value) || 0;
    const mmaEspecialidade = document.getElementById('mmaEspecialidade').value.trim();
    
    // BJJ
    const bjjVitorias = parseInt(document.getElementById('bjjVitorias').value) || 0;
    const bjjDerrotas = parseInt(document.getElementById('bjjDerrotas').value) || 0;
    const bjjEspecialidade = document.getElementById('bjjEspecialidade').value.trim();
    
    // Físico
    const altura = parseFloat(document.getElementById('altura').value) || null;
    const peso = parseFloat(document.getElementById('peso').value) || null;
    const alcance = parseInt(document.getElementById('alcance').value) || null;
    
    // Sobre
    const sobre = document.getElementById('sobre').value.trim();
    
    if (!nome || !idade || !graduacao) {
        showNotification('Preencha os campos obrigatórios (Nome, Idade, Graduação)!', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        console.log('📤 Enviando dados para API...');
        
        const response = await fetch('/api/perfil', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nome,
                idade: parseInt(idade),
                arte_marcial: graduacao,
                mma_vitorias: mmaVitorias,
                mma_derrotas: mmaDerrotas,
                mma_empates: mmaEmpates,
                mma_especialidade: mmaEspecialidade,
                bjj_vitorias: bjjVitorias,
                bjj_derrotas: bjjDerrotas,
                bjj_especialidade: bjjEspecialidade,
                altura: altura,
                peso: peso,
                alcance: alcance,
                sobre: sobre
            })
        });
        
        const data = await response.json();
        console.log('📦 Resposta da API:', data);
        
        if (response.ok) {
            // Atualizar localStorage
            const utilizador = JSON.parse(localStorage.getItem('utilizador'));
            utilizador.nome = nome;
            utilizador.idade = idade;
            utilizador.arte_marcial = graduacao;
            utilizador.mma_vitorias = mmaVitorias;
            utilizador.mma_derrotas = mmaDerrotas;
            utilizador.mma_empates = mmaEmpates;
            utilizador.mma_especialidade = mmaEspecialidade;
            utilizador.bjj_vitorias = bjjVitorias;
            utilizador.bjj_derrotas = bjjDerrotas;
            utilizador.bjj_especialidade = bjjEspecialidade;
            utilizador.altura = altura;
            utilizador.peso = peso;
            utilizador.alcance = alcance;
            utilizador.sobre = sobre;
            localStorage.setItem('utilizador', JSON.stringify(utilizador));
            
            console.log('✅ LocalStorage atualizado!');
            
            // Recarregar perfil
            loadUserProfile(utilizador);
            toggleEditMode();
            
            showSuccess('Perfil Atualizado!', 'As suas informações foram atualizadas com sucesso.');
        } else {
            console.error('❌ Erro da API:', data.erro);
            showNotification(data.erro || 'Erro ao atualizar perfil', 'error');
        }
    } catch (error) {
        console.error('❌ Erro de conexão:', error);
        showNotification('Erro de conexão. Verifique se o servidor está a correr.', 'error');
    }
});

// ============================================
// ALTERAR PALAVRA-PASSE
// ============================================

function openPasswordModal() {
    console.log('🔐 Abrindo modal de palavra-passe...');
    document.getElementById('passwordModal').style.display = 'flex';
    document.getElementById('passwordForm').reset();
    document.getElementById('passwordError').style.display = 'none';
}

function closePasswordModal() {
    console.log('❌ Fechando modal de palavra-passe...');
    document.getElementById('passwordModal').style.display = 'none';
}

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔐 Alterando palavra-passe...');
    
    const passAtual = document.getElementById('passAtual').value;
    const novaPass = document.getElementById('novaPass').value;
    const confirmarNovaPass = document.getElementById('confirmarNovaPass').value;
    const errorEl = document.getElementById('passwordError');
    
    errorEl.style.display = 'none';
    
    if (novaPass !== confirmarNovaPass) {
        errorEl.textContent = 'As palavras-passe não coincidem!';
        errorEl.style.display = 'block';
        return;
    }
    
    if (novaPass.length < 6) {
        errorEl.textContent = 'A palavra-passe deve ter pelo menos 6 caracteres!';
        errorEl.style.display = 'block';
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/alterar-pass', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                passAtual: passAtual,
                novaPass: novaPass
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Palavra-passe alterada!');
            closePasswordModal();
            showSuccess('Palavra-Passe Alterada!', 'A sua palavra-passe foi alterada com sucesso.');
        } else {
            console.error('❌ Erro ao alterar palavra-passe:', data.erro);
            errorEl.textContent = data.erro || 'Erro ao alterar palavra-passe';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Erro de conexão:', error);
        errorEl.textContent = 'Erro de conexão. Tente novamente.';
        errorEl.style.display = 'block';
    }
});

// ============================================
// LOGOUT
// ============================================

function logout() {
    if (confirm('Deseja realmente sair?')) {
        console.log('👋 Fazendo logout...');
        localStorage.removeItem('token');
        localStorage.removeItem('utilizador');
        window.location.href = 'index.html';
    }
}

// ============================================
// ELIMINAR CONTA
// ============================================

function confirmDeleteAccount() {
    const confirmation = prompt('⚠️ ATENÇÃO! Esta ação é irreversível.\n\nDigite "ELIMINAR" para confirmar a exclusão da sua conta:');
    
    if (confirmation === 'ELIMINAR') {
        deleteAccount();
    } else if (confirmation !== null) {
        alert('Texto incorreto. Conta não foi eliminada.');
    }
}

async function deleteAccount() {
    console.log('🗑️ Eliminando conta...');
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/perfil', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Conta eliminada!');
            alert('Conta eliminada com sucesso. Sentiremos a sua falta!');
            localStorage.removeItem('token');
            localStorage.removeItem('utilizador');
            window.location.href = 'index.html';
        } else {
            const data = await response.json();
            console.error('❌ Erro ao eliminar:', data.erro);
            alert('Erro ao eliminar conta: ' + (data.erro || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('❌ Erro de conexão:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// ============================================
// MODAIS DE SUCESSO
// ============================================

function showSuccess(title, message) {
    const successModal = document.getElementById('successModal');
    const successTitle = document.getElementById('successTitle');
    const successMessage = document.getElementById('successMessage');
    
    if (!successModal || !successTitle || !successMessage) {
        console.error('❌ Elementos do modal de sucesso não encontrados!');
        alert(title + '\n' + message);
        return;
    }
    
    successTitle.textContent = title;
    successMessage.textContent = message;
    successModal.style.display = 'flex';
}

function closeSuccessModal() {
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.style.display = 'none';
    }
}

// ============================================
// NOTIFICAÇÕES
// ============================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #22c55e, #10b981)' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// ESTILOS DE ANIMAÇÃO
// ============================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// UPLOAD DE FOTO DE PERFIL
// ============================================

const fotoInput = document.getElementById('fotoInput');
const btnUploadFoto = document.getElementById('btnUploadFoto');
const btnRemoverFoto = document.getElementById('btnRemoverFoto');
const fotoPreview = document.getElementById('fotoPreview');
const fotoPlaceholder = document.getElementById('fotoPlaceholder');
const fotoInitials = document.getElementById('fotoInitials');

// Carregar foto ao carregar perfil
function loadProfilePhoto(user) {
    console.log('📸 Carregando foto do perfil...');
    
    // Atualizar iniciais no placeholder
    if (fotoInitials) {
        const initials = getInitials(user.nome);
        fotoInitials.textContent = initials;
    }
    
    if (user.foto_url) {
        console.log('✅ Utilizador tem foto:', user.foto_url);
        
        if (fotoPreview && fotoPlaceholder) {
            fotoPreview.src = user.foto_url;
            fotoPreview.style.display = 'block';
            fotoPlaceholder.style.display = 'none';
        }
        
        // Mostrar botão remover
        if (btnRemoverFoto) {
            btnRemoverFoto.style.display = 'inline-block';
        }
    } else {
        console.log('ℹ️ Utilizador sem foto');
        
        if (fotoPreview && fotoPlaceholder) {
            fotoPreview.style.display = 'none';
            fotoPlaceholder.style.display = 'flex';
        }
        
        // Esconder botão remover
        if (btnRemoverFoto) {
            btnRemoverFoto.style.display = 'none';
        }
    }
}

// Botão escolher foto
if (btnUploadFoto) {
    btnUploadFoto.addEventListener('click', () => {
        console.log('📷 Clicou em escolher foto');
        fotoInput.click();
    });
}

// Quando selecionar ficheiro
if (fotoInput) {
    fotoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        
        if (!file) {
            console.log('⚠️ Nenhum ficheiro selecionado');
            return;
        }
        
        console.log('📁 Ficheiro selecionado:', file.name, file.size, 'bytes');
        
        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ Ficheiro muito grande! Máximo: 5MB');
            fotoInput.value = '';
            return;
        }
        
        // Validar tipo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('❌ Formato inválido! Use: JPG, PNG ou WEBP');
            fotoInput.value = '';
            return;
        }
        
        // Preview da imagem
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('🖼️ Preview gerado');
            if (fotoPreview) {
                fotoPreview.src = e.target.result;
                fotoPreview.style.display = 'block';
            }
            if (fotoPlaceholder) {
                fotoPlaceholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
        
        // Fazer upload
        await uploadFoto(file);
    });
}

// Função de upload
async function uploadFoto(file) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('❌ Sessão expirada! Faça login novamente.');
        window.location.href = 'index.html';
        return;
    }
    
    const formData = new FormData();
    formData.append('foto', file);
    
    console.log('📤 Enviando foto...');
    
    // Desabilitar botão durante upload
    if (btnUploadFoto) {
        btnUploadFoto.disabled = true;
        btnUploadFoto.textContent = '⏳ Enviando...';
    }
    
    try {
        const response = await fetch('/api/perfil/foto', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        console.log('📸 Resposta do servidor:', data);
        
        if (response.ok) {
            alert('✅ Foto atualizada com sucesso!');
            
            // Atualizar localStorage
            const utilizadorStr = localStorage.getItem('utilizador');
            if (utilizadorStr) {
                const utilizador = JSON.parse(utilizadorStr);
                utilizador.foto_url = data.foto_url;
                localStorage.setItem('utilizador', JSON.stringify(utilizador));
                console.log('✅ LocalStorage atualizado');
            }
            
            // Mostrar botão remover
            if (btnRemoverFoto) {
                btnRemoverFoto.style.display = 'inline-block';
            }
            
            // Recarregar dados do perfil
            const updatedUser = JSON.parse(localStorage.getItem('utilizador'));
            loadUserProfile(updatedUser);
            loadProfilePhoto(updatedUser);
            
        } else {
            throw new Error(data.erro || 'Erro ao fazer upload');
        }
        
    } catch (error) {
        console.error('❌ Erro ao fazer upload:', error);
        alert('❌ Erro ao enviar foto: ' + error.message);
        
        // Reverter preview
        if (fotoPreview && fotoPlaceholder) {
            fotoPreview.style.display = 'none';
            fotoPlaceholder.style.display = 'flex';
        }
        
    } finally {
        // Reabilitar botão
        if (btnUploadFoto) {
            btnUploadFoto.disabled = false;
            btnUploadFoto.textContent = '📷 Escolher Foto';
        }
        
        // Limpar input
        fotoInput.value = '';
    }
}

// Botão remover foto
if (btnRemoverFoto) {
    btnRemoverFoto.addEventListener('click', async () => {
        if (!confirm('Deseja remover a sua foto de perfil?')) {
            return;
        }
        
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('❌ Sessão expirada! Faça login novamente.');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('🗑️ Removendo foto...');
        
        // Desabilitar botão
        btnRemoverFoto.disabled = true;
        btnRemoverFoto.textContent = '⏳ Removendo...';
        
        try {
            const response = await fetch('/api/perfil/foto', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            console.log('🗑️ Resposta do servidor:', data);
            
            if (response.ok) {
                alert('✅ Foto removida com sucesso!');
                
                // Atualizar localStorage
                const utilizadorStr = localStorage.getItem('utilizador');
                if (utilizadorStr) {
                    const utilizador = JSON.parse(utilizadorStr);
                    utilizador.foto_url = null;
                    localStorage.setItem('utilizador', JSON.stringify(utilizador));
                }
                
                // Mostrar placeholder
                if (fotoPreview && fotoPlaceholder) {
                    fotoPreview.style.display = 'none';
                    fotoPlaceholder.style.display = 'flex';
                }
                
                // Esconder botão remover
                btnRemoverFoto.style.display = 'none';
                
                // Recarregar
                const updatedUser = JSON.parse(localStorage.getItem('utilizador'));
                loadUserProfile(updatedUser);
                loadProfilePhoto(updatedUser);
                
            } else {
                throw new Error(data.erro || 'Erro ao remover foto');
            }
            
        } catch (error) {
            console.error('❌ Erro ao remover foto:', error);
            alert('❌ Erro ao remover foto: ' + error.message);
            
        } finally {
            btnRemoverFoto.disabled = false;
            btnRemoverFoto.textContent = '🗑️ Remover Foto';
        }
    });
}

// Adicionar chamada para carregar foto quando carregar perfil
const originalLoadUserProfile = loadUserProfile;
loadUserProfile = function(user) {
    originalLoadUserProfile(user);
    loadProfilePhoto(user);
};

console.log('✅ Perfil.js totalmente carregado e pronto!');