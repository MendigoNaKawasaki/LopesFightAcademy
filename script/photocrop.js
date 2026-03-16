// ============================================
// SISTEMA DE CROP DE IMAGEM - photoCrop.js
// ============================================

console.log('✅ Sistema de crop de imagem carregado!');

let cropState = {
    imageFile: null,
    imageElement: null,
    cropBox: null,
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    startCropX: 0,
    startCropY: 0,
    startCropWidth: 0,
    startCropHeight: 0,
    currentZoom: 1
};

// ============================================
// INICIALIZAR CROP QUANDO SELECIONAR IMAGEM
// ============================================

const fotoInput = document.getElementById('fotoInput');
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
const cropBox = document.getElementById('cropBox');
const cropZoom = document.getElementById('cropZoom');
const zoomValue = document.getElementById('zoomValue');
const closeCropModal = document.getElementById('closeCropModal');
const cancelCrop = document.getElementById('cancelCrop');
const confirmCrop = document.getElementById('confirmCrop');
const cropSizeDisplay = document.getElementById('cropSize');

if (fotoInput) {
    // SOBRESCREVER o evento anterior
    fotoInput.removeEventListener('change', fotoInput.onchange);
    
    fotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        
        if (!file) return;
        
        console.log('📁 Ficheiro selecionado:', file.name);
        
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
        
        // Abrir modal de crop
        openCropModal(file);
    });
}

// ============================================
// ABRIR MODAL DE CROP
// ============================================

function openCropModal(file) {
    console.log('🖼️ Abrindo modal de crop...');
    
    cropState.imageFile = file;
    
    // Carregar imagem no modal
    const reader = new FileReader();
    reader.onload = (e) => {
        cropImage.src = e.target.result;
        cropImage.onload = () => {
            console.log('✅ Imagem carregada:', cropImage.naturalWidth, 'x', cropImage.naturalHeight);
            initializeCropBox();
            cropModal.style.display = 'flex';
        };
    };
    reader.readAsDataURL(file);
}

// ============================================
// INICIALIZAR CROP BOX
// ============================================

function initializeCropBox() {
    cropState.imageElement = cropImage;
    cropState.cropBox = cropBox;
    cropState.currentZoom = 1;
    
    // Reset zoom
    cropZoom.value = 100;
    zoomValue.textContent = '100%';
    cropImage.style.transform = 'scale(1)';
    
    // Centralizar crop box
    const imgRect = cropImage.getBoundingClientRect();
    const size = Math.min(imgRect.width, imgRect.height, 300);
    
    cropBox.style.width = size + 'px';
    cropBox.style.height = size + 'px';
    
    updateCropSize();
    
    // Adicionar event listeners
    addCropEventListeners();
}

// ============================================
// EVENT LISTENERS DO CROP
// ============================================

function addCropEventListeners() {
    // Arrastar crop box
    cropBox.addEventListener('mousedown', startDrag);
    
    // Redimensionar pelos cantos
    const handles = cropBox.querySelectorAll('.crop-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', startResize);
    });
    
    // Zoom
    cropZoom.addEventListener('input', (e) => {
        const zoom = e.target.value / 100;
        cropState.currentZoom = zoom;
        cropImage.style.transform = `scale(${zoom})`;
        zoomValue.textContent = e.target.value + '%';
    });
    
    // Fechar modal
    closeCropModal.addEventListener('click', closeCropModalHandler);
    cancelCrop.addEventListener('click', closeCropModalHandler);
    
    // Confirmar crop
    confirmCrop.addEventListener('click', performCrop);
    
    // Mouse move e up global
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// ============================================
// ARRASTAR CROP BOX
// ============================================

function startDrag(e) {
    if (e.target.classList.contains('crop-handle')) return;
    
    e.preventDefault();
    cropState.isDragging = true;
    cropState.startX = e.clientX;
    cropState.startY = e.clientY;
    
    const rect = cropBox.getBoundingClientRect();
    const parent = cropImage.getBoundingClientRect();
    
    cropState.startCropX = rect.left - parent.left;
    cropState.startCropY = rect.top - parent.top;
}

function onMouseMove(e) {
    if (cropState.isDragging) {
        const dx = e.clientX - cropState.startX;
        const dy = e.clientY - cropState.startY;
        
        const imgRect = cropImage.getBoundingClientRect();
        const boxRect = cropBox.getBoundingClientRect();
        
        let newX = cropState.startCropX + dx;
        let newY = cropState.startCropY + dy;
        
        // Limites
        newX = Math.max(0, Math.min(newX, imgRect.width - boxRect.width));
        newY = Math.max(0, Math.min(newY, imgRect.height - boxRect.height));
        
        cropBox.style.left = newX + 'px';
        cropBox.style.top = newY + 'px';
        cropBox.style.transform = 'none';
        
    } else if (cropState.isResizing) {
        handleResize(e);
    }
}

function onMouseUp() {
    cropState.isDragging = false;
    cropState.isResizing = false;
    cropState.resizeHandle = null;
}

// ============================================
// REDIMENSIONAR CROP BOX
// ============================================

function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    
    cropState.isResizing = true;
    cropState.resizeHandle = e.target.className;
    cropState.startX = e.clientX;
    cropState.startY = e.clientY;
    
    const rect = cropBox.getBoundingClientRect();
    cropState.startCropWidth = rect.width;
    cropState.startCropHeight = rect.height;
    cropState.startCropX = rect.left - cropImage.getBoundingClientRect().left;
    cropState.startCropY = rect.top - cropImage.getBoundingClientRect().top;
}

function handleResize(e) {
    const dx = e.clientX - cropState.startX;
    const dy = e.clientY - cropState.startY;
    
    const imgRect = cropImage.getBoundingClientRect();
    let newWidth = cropState.startCropWidth;
    let newHeight = cropState.startCropHeight;
    let newX = cropState.startCropX;
    let newY = cropState.startCropY;
    
    // Manter proporção quadrada
    const size = Math.max(newWidth, newHeight);
    
    if (cropState.resizeHandle.includes('crop-se')) {
        newWidth = cropState.startCropWidth + dx;
        newHeight = cropState.startCropHeight + dy;
    } else if (cropState.resizeHandle.includes('crop-sw')) {
        newWidth = cropState.startCropWidth - dx;
        newHeight = cropState.startCropHeight + dy;
        newX = cropState.startCropX + dx;
    } else if (cropState.resizeHandle.includes('crop-ne')) {
        newWidth = cropState.startCropWidth + dx;
        newHeight = cropState.startCropHeight - dy;
        newY = cropState.startCropY + dy;
    } else if (cropState.resizeHandle.includes('crop-nw')) {
        newWidth = cropState.startCropWidth - dx;
        newHeight = cropState.startCropHeight - dy;
        newX = cropState.startCropX + dx;
        newY = cropState.startCropY + dy;
    }
    
    // Manter quadrado
    const finalSize = Math.max(50, Math.min(newWidth, newHeight, imgRect.width, imgRect.height));
    
    cropBox.style.width = finalSize + 'px';
    cropBox.style.height = finalSize + 'px';
    cropBox.style.left = newX + 'px';
    cropBox.style.top = newY + 'px';
    cropBox.style.transform = 'none';
    
    updateCropSize();
}

// ============================================
// ATUALIZAR DISPLAY DO TAMANHO
// ============================================

function updateCropSize() {
    const width = parseInt(cropBox.style.width) || 300;
    const height = parseInt(cropBox.style.height) || 300;
    cropSizeDisplay.textContent = `Tamanho: ${width}x${height}px`;
}

// ============================================
// FECHAR MODAL
// ============================================

function closeCropModalHandler() {
    cropModal.style.display = 'none';
    fotoInput.value = '';
    cropImage.src = '';
}

// ============================================
// REALIZAR CROP
// ============================================

async function performCrop() {
    console.log('✂️ Recortando imagem...');
    
    confirmCrop.disabled = true;
    confirmCrop.textContent = '⏳ Recortando...';
    
    try {
        // Obter posição e tamanho do crop box em relação à imagem REAL
        const imgRect = cropImage.getBoundingClientRect();
        const boxRect = cropBox.getBoundingClientRect();
        
        const scaleX = cropImage.naturalWidth / imgRect.width / cropState.currentZoom;
        const scaleY = cropImage.naturalHeight / imgRect.height / cropState.currentZoom;
        
        const cropX = (boxRect.left - imgRect.left) * scaleX;
        const cropY = (boxRect.top - imgRect.top) * scaleY;
        const cropWidth = boxRect.width * scaleX;
        const cropHeight = boxRect.height * scaleY;
        
        console.log('📐 Crop:', { cropX, cropY, cropWidth, cropHeight });
        
        // Criar canvas e recortar
        const canvas = document.getElementById('cropCanvas');
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Carregar imagem original
        const img = new Image();
        img.src = URL.createObjectURL(cropState.imageFile);
        
        await new Promise((resolve) => {
            img.onload = resolve;
        });
        
        // Desenhar parte recortada
        ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,  // Source
            0, 0, cropWidth, cropHeight            // Destination
        );
        
        // Converter para blob
        canvas.toBlob(async (blob) => {
            console.log('📦 Blob criado:', blob.size, 'bytes');
            
            // Criar nome limpo e único para o ficheiro
            // Adicionar timestamp para garantir unicidade e evitar cache
            const extension = cropState.imageFile.type === 'image/png' ? '.png' : '.jpg';
            const timestamp = Date.now();
            const cleanFileName = `foto_${timestamp}${extension}`;
            
            console.log('📋 Nome do ficheiro:', cleanFileName);
            
            // Criar File object com nome limpo e único
            const croppedFile = new File([blob], cleanFileName, {
                type: cropState.imageFile.type
            });
            
            // Fechar modal
            cropModal.style.display = 'none';
            
            // Enviar para servidor
            await uploadCroppedImage(croppedFile);
            
        }, cropState.imageFile.type, 0.95);
        
    } catch (error) {
        console.error('❌ Erro ao recortar:', error);
        alert('❌ Erro ao recortar imagem');
    } finally {
        confirmCrop.disabled = false;
        confirmCrop.textContent = '✓ Recortar e Enviar';
    }
}

// ============================================
// UPLOAD DA IMAGEM RECORTADA
// ============================================

async function uploadCroppedImage(file) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('❌ Sessão expirada! Faça login novamente.');
        window.location.href = 'index.html';
        return;
    }
    
    const formData = new FormData();
    formData.append('foto', file);
    
    console.log('📤 Enviando imagem recortada...');
    console.log('📋 Nome do ficheiro:', file.name);
    console.log('📋 Tamanho:', file.size, 'bytes');
    console.log('📋 Tipo:', file.type);
    
    try {
        const response = await fetch('/api/perfil/foto', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('📡 Status da resposta:', response.status);
        
        // Tentar ler resposta como JSON
        let data;
        try {
            data = await response.json();
            console.log('📸 Resposta:', data);
        } catch (jsonError) {
            console.error('❌ Erro ao ler JSON:', jsonError);
            const text = await response.text();
            console.error('📋 Resposta (texto):', text);
            throw new Error('Resposta inválida do servidor');
        }
        
        if (response.ok) {
            alert('✅ Foto atualizada com sucesso!');
            
            // Atualizar localStorage
            const utilizadorStr = localStorage.getItem('utilizador');
            if (utilizadorStr) {
                const utilizador = JSON.parse(utilizadorStr);
                utilizador.foto_url = data.foto_url;
                localStorage.setItem('utilizador', JSON.stringify(utilizador));
            }
            
            // Recarregar página para mostrar nova foto
            location.reload();
            
        } else {
            throw new Error(data.erro || data.detalhes || 'Erro ao fazer upload');
        }
        
    } catch (error) {
        console.error('❌ Erro completo:', error);
        console.error('📋 Stack:', error.stack);
        
        // Mensagem mais detalhada
        let mensagem = '❌ Erro ao enviar foto:\n\n';
        
        if (error.message.includes('Failed to fetch')) {
            mensagem += 'Não foi possível conectar ao servidor.\n';
            mensagem += 'Verifique se o servidor está a correr!\n\n';
            mensagem += 'Execute: node server.js';
        } else {
            mensagem += error.message;
        }
        
        alert(mensagem);
    }
}

console.log('✅ Sistema de crop totalmente carregado!');