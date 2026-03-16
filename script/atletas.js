// ============================================
// PÁGINA ATLETAS - atletas.js (COM FOTOS)
// ============================================

console.log('✅ Script da página Atletas carregado!');

let todosAtletas = [];

// ============================================
// CARREGAR ATLETAS
// ============================================

async function carregarAtletas() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
    
    try {
        const response = await fetch('/api/atletas');
        
        if (response.ok) {
            todosAtletas = await response.json();
            renderizarAtletas(todosAtletas);
            atualizarEstatisticas(todosAtletas);
            console.log('🥋 Atletas carregados:', todosAtletas.length);
        } else {
            console.error('Erro ao carregar atletas');
            mostrarErro();
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarErro();
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// ============================================
// RENDERIZAR ATLETAS
// ============================================

function renderizarAtletas(atletas) {
    const container = document.getElementById('atletasGrid');
    
    if (!container) {
        console.error('❌ Container de atletas não encontrado (procurando por "atletasGrid")');
        return;
    }
    
    if (atletas.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #aaa; padding: 3rem;">Nenhum atleta encontrado</p>';
        return;
    }
    
    console.log('📦 Renderizando', atletas.length, 'atletas...');
    container.innerHTML = atletas.map(atleta => criarCardAtleta(atleta)).join('');
}

// ============================================
// CRIAR CARD DE ATLETA (COM SUPORTE A FOTOS)
// ============================================

function criarCardAtleta(atleta) {
    const iniciais = atleta.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const recordMMA = `${atleta.mma_vitorias || 0}-${atleta.mma_derrotas || 0}-${atleta.mma_empates || 0}`;
    const recordBJJ = `${atleta.bjj_vitorias || 0}-${atleta.bjj_derrotas || 0}`;
    
    // Avatar: foto real ou iniciais
    let avatarHTML;
    if (atleta.foto_url) {
        avatarHTML = `<img src="${atleta.foto_url}" alt="${atleta.nome}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        avatarHTML = `<div class="avatar-circle">${iniciais}</div>`;
    }
    
    return `
        <div class="atleta-card">
            <div class="atleta-avatar">
                ${avatarHTML}
            </div>
            <div class="atleta-info">
                <h3 class="atleta-nome">${atleta.nome}</h3>
                <p class="atleta-graduacao">
                    <span class="badge-graduacao">${atleta.graduacao}</span>
                </p>
                
                <div class="atleta-stats">
                    <div class="stat-item">
                        <span class="stat-label">MMA</span>
                        <span class="stat-value">${recordMMA}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">BJJ</span>
                        <span class="stat-value">${recordBJJ}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Idade</span>
                        <span class="stat-value">${atleta.idade || '-'}</span>
                    </div>
                </div>
                
                <a href="AtletaPerfil.html?id=${atleta._id}" 
                   class="btn-ver-perfil"
                   style="display: inline-block; text-decoration: none; text-align: center; width: 100%;">
                    👁️ Ver Perfil Completo
                </a>
            </div>
        </div>
    `;
}

// ============================================
// ATUALIZAR ESTATÍSTICAS
// ============================================

function atualizarEstatisticas(atletas) {
    const totalAtletasEl = document.getElementById('totalAtletas');
    if (totalAtletasEl) {
        totalAtletasEl.textContent = atletas.length;
    }
    
    const totalVitorias = atletas.reduce((sum, a) => sum + (a.mma_vitorias || 0), 0);
    const totalVitoriasEl = document.getElementById('totalVitorias');
    if (totalVitoriasEl) {
        totalVitoriasEl.textContent = totalVitorias;
    }
    
    const totalFaixasPreta = atletas.filter(a => a.graduacao === 'Preta').length;
    const totalFaixasPretaEl = document.getElementById('totalFaixasPreta');
    if (totalFaixasPretaEl) {
        totalFaixasPretaEl.textContent = totalFaixasPreta;
    }
}

// ============================================
// FILTROS
// ============================================

const filtroFaixa = document.getElementById('filtroFaixa');
if (filtroFaixa) {
    filtroFaixa.addEventListener('change', () => aplicarFiltros());
}

const filtroBusca = document.getElementById('filtroBusca');
if (filtroBusca) {
    filtroBusca.addEventListener('input', () => aplicarFiltros());
}

const btnLimpar = document.getElementById('btnLimparFiltros');
if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
        if (filtroFaixa) filtroFaixa.value = '';
        if (filtroBusca) filtroBusca.value = '';
        renderizarAtletas(todosAtletas);
    });
}

function aplicarFiltros() {
    let filtrados = todosAtletas;
    
    const graduacao = filtroFaixa ? filtroFaixa.value : '';
    if (graduacao) {
        filtrados = filtrados.filter(a => a.graduacao === graduacao);
    }
    
    const busca = filtroBusca ? filtroBusca.value.toLowerCase() : '';
    if (busca) {
        filtrados = filtrados.filter(a => 
            a.nome.toLowerCase().includes(busca)
        );
    }
    
    renderizarAtletas(filtrados);
}

// ============================================
// MOSTRAR ERRO
// ============================================

function mostrarErro() {
    const container = document.getElementById('atletasGrid');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ef4444;">
                <h3>❌ Erro ao carregar atletas</h3>
                <p>Por favor, tente novamente mais tarde.</p>
            </div>
        `;
    }
}

// ============================================
// INICIALIZAR
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, iniciando carregamento de atletas...');
    carregarAtletas();
});

console.log('✅ Script Atletas totalmente carregado!');