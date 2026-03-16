// ============================================
// PERFIL COMPLETO DO ATLETA - atletaPerfil.js
// ============================================

console.log('✅ Script do perfil de atleta carregado!');

// Pegar ID do atleta da URL
const urlParams = new URLSearchParams(window.location.search);
const atletaId = urlParams.get('id');

console.log('📋 ID do atleta:', atletaId);

if (!atletaId) {
    document.getElementById('atletaContent').innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <h2 style="color: #ef4444;">❌ Erro</h2>
            <p style="color: #aaa;">ID do atleta não fornecido.</p>
            <a href="Atletas.html" style="color: #10b981; text-decoration: none; margin-top: 1rem; display: inline-block;">← Voltar para Atletas</a>
        </div>
    `;
} else {
    carregarPerfilAtleta(atletaId);
}

// ============================================
// CARREGAR PERFIL DO ATLETA
// ============================================

async function carregarPerfilAtleta(id) {
    console.log('📥 Carregando perfil do atleta:', id);
    
    try {
        // Usar rota pública (não precisa de token!)
        const response = await fetch(`/api/atletas/${id}`);
        
        console.log('📡 Resposta da API:', response.status);
        
        if (response.ok) {
            const atleta = await response.json();
            console.log('✅ Dados do atleta:', atleta);
            renderizarPerfil(atleta);
        } else {
            console.error('❌ Erro na resposta:', response.status);
            mostrarErro('Atleta não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        mostrarErro('Erro de conexão');
    }
}

// ============================================
// RENDERIZAR PERFIL
// ============================================

function renderizarPerfil(atleta) {
    console.log('🎨 Renderizando perfil de:', atleta.nome);
    
    // Atualizar breadcrumb
    const breadcrumbNome = document.getElementById('breadcrumbNome');
    if (breadcrumbNome) {
        breadcrumbNome.textContent = atleta.nome;
    }
    
    // Atualizar título da página
    document.title = `${atleta.nome} - LFA`;
    
    // Calcular idade se houver data de nascimento
    let idade = atleta.idade || '-';
    
    // Record MMA
    const recordMMA = `${atleta.mma_vitorias || 0}-${atleta.mma_derrotas || 0}-${atleta.mma_empates || 0}`;
    
    // Record BJJ
    const recordBJJ = `${atleta.bjj_vitorias || 0}-${atleta.bjj_derrotas || 0}`;
    
    // Data de registo formatada
    let dataRegisto = 'N/A';
    if (atleta.dataRegisto) {
        try {
            dataRegisto = new Date(atleta.dataRegisto).toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            console.log('⚠️ Erro ao formatar data:', e);
        }
    }
    
    // Avatar: foto real ou iniciais
    let fotoHTML;
    if (atleta.foto_url) {
        fotoHTML = `<img src="${atleta.foto_url}" alt="${atleta.nome}" style="width: 300px; height: 300px; object-fit: cover; border-radius: 12px; border: 3px solid #10b981; box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);">`;
    } else {
        const inicial = atleta.nome.charAt(0).toUpperCase();
        fotoHTML = `<div style="width: 300px; height: 300px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 6rem; color: white; font-weight: 700; border: 3px solid #10b981; box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);">
            ${inicial}
        </div>`;
    }
    
    const html = `
        <h1>${atleta.nome}</h1>
        <p style="text-align: center; font-size: 1.2rem; color: #10b981; margin-bottom: 2rem;">
            <strong>Graduação:</strong> <span class="badge">${atleta.graduacao || 'N/A'}</span>
        </p>

        <section>
            <div class="foto">
                ${fotoHTML}
            </div>
            <ul>
                <li><strong>Email:</strong> ${atleta.email || 'N/A'}</li>
                <li><strong>Idade:</strong> ${idade} anos</li>
                <li><strong>Altura:</strong> ${atleta.altura ? atleta.altura + ' m' : 'N/A'}</li>
                <li><strong>Peso:</strong> ${atleta.peso ? atleta.peso + ' kg' : 'N/A'}</li>
                <li><strong>Alcance:</strong> ${atleta.alcance ? atleta.alcance + ' cm' : 'N/A'}</li>
                <li><strong>Membro desde:</strong> ${dataRegisto}</li>
            </ul>
        </section>

        <section>
            <h2>🥊 Carreira de MMA</h2>
            <ul>
                <li><strong>Record:</strong> <span class="record-destaque">${recordMMA}</span></li>
                <li><strong>Vitórias:</strong> ${atleta.mma_vitorias || 0}</li>
                <li><strong>Derrotas:</strong> ${atleta.mma_derrotas || 0}</li>
                <li><strong>Empates:</strong> ${atleta.mma_empates || 0}</li>
                <li><strong>Especialidade:</strong> ${atleta.mma_especialidade || 'N/A'}</li>
            </ul>
        </section>

        <section>
            <h2>🤼 Carreira de BJJ</h2>
            <ul>
                <li><strong>Record:</strong> <span class="record-destaque">${recordBJJ}</span></li>
                <li><strong>Vitórias:</strong> ${atleta.bjj_vitorias || 0}</li>
                <li><strong>Derrotas:</strong> ${atleta.bjj_derrotas || 0}</li>
                <li><strong>Especialidade:</strong> ${atleta.bjj_especialidade || 'N/A'}</li>
            </ul>
        </section>

        <section>
            <h2>📝 Sobre ${atleta.nome}</h2>
            <p>
                ${atleta.sobre || 'Sem informações biográficas disponíveis.'}
            </p>
        </section>

        <div style="text-align: center; margin-top: 2rem;">
            <a href="Atletas.html" style="color: #10b981; text-decoration: none; font-size: 1.1rem; padding: 0.75rem 2rem; border: 2px solid #10b981; border-radius: 8px; display: inline-block; transition: all 0.3s;">
                ← Voltar para Atletas
            </a>
        </div>
    `;
    
    const container = document.getElementById('atletaContent');
    if (container) {
        container.innerHTML = html;
        console.log('✅ Perfil renderizado com sucesso!');
    } else {
        console.error('❌ Container atletaContent não encontrado!');
    }
}

// ============================================
// MOSTRAR ERRO
// ============================================

function mostrarErro(mensagem) {
    console.log('❌ Mostrando erro:', mensagem);
    
    const container = document.getElementById('atletaContent');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2 style="color: #ef4444;">❌ Erro</h2>
                <p style="color: #aaa;">${mensagem}</p>
                <a href="Atletas.html" style="color: #10b981; text-decoration: none; margin-top: 1rem; display: inline-block;">← Voltar para Atletas</a>
            </div>
        `;
    }
}

console.log('✅ Script do perfil de atleta totalmente carregado!');