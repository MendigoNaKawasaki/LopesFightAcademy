// ══════════════════════════════════════════════════════════════
// SLIDESHOW AUTOMÁTICO NO HERO
// ══════════════════════════════════════════════════════════════

let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const indicators = document.querySelectorAll('.indicator');
const slideDuration = 5000; // 5 segundos por imagem
let slideInterval;

// Função para mostrar slide específico
function showSlide(index) {
    // Remove active de todos os slides e indicadores
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    // Adiciona active ao slide e indicador atual
    slides[index].classList.add('active');
    indicators[index].classList.add('active');
    
    currentSlide = index;
}

// Função para próximo slide
function nextSlide() {
    let next = (currentSlide + 1) % slides.length;
    showSlide(next);
}

// Função para slide anterior
function prevSlide() {
    let prev = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(prev);
}

// Iniciar slideshow automático
function startSlideshow() {
    slideInterval = setInterval(nextSlide, slideDuration);
}

// Parar slideshow
function stopSlideshow() {
    clearInterval(slideInterval);
}

// Event listeners para indicadores
indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
        showSlide(index);
        stopSlideshow();
        startSlideshow(); // Reinicia o timer
    });
});

// Pausar slideshow quando hover no hero
const heroSection = document.querySelector('.hero');
if (heroSection) {
    heroSection.addEventListener('mouseenter', stopSlideshow);
    heroSection.addEventListener('mouseleave', startSlideshow);
}

// Controles de teclado (setas)
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevSlide();
        stopSlideshow();
        startSlideshow();
    } else if (e.key === 'ArrowRight') {
        nextSlide();
        stopSlideshow();
        startSlideshow();
    }
});

// Iniciar slideshow quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    showSlide(0); // Mostra o primeiro slide
    startSlideshow(); // Inicia rotação automática
});

// ══════════════════════════════════════════════════════════════
// SMOOTH SCROLL PARA LINKS INTERNOS
// ══════════════════════════════════════════════════════════════

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ══════════════════════════════════════════════════════════════
// ANIMAÇÃO DE ENTRADA DOS CLASS CARDS
// ══════════════════════════════════════════════════════════════

const cards = document.querySelectorAll('.class-card');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(20px)';
            setTimeout(() => {
                entry.target.style.transition = 'all 0.6s ease-out';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
        }
    });
}, { threshold: 0.1 });

cards.forEach(card => observer.observe(card));

// ══════════════════════════════════════════════════════════════
// PRELOAD DE IMAGENS DO SLIDESHOW
// ══════════════════════════════════════════════════════════════

// Precarregar todas as imagens do slideshow para transições suaves
window.addEventListener('load', () => {
    slides.forEach(slide => {
        const bgImage = slide.style.backgroundImage;
        if (bgImage) {
            const imageUrl = bgImage.slice(5, -2); // Remove url("...") 
            const img = new Image();
            img.src = imageUrl;
        }
    });
});

// ══════════════════════════════════════════════════════════════
// INFORMAÇÃO DE DEPURAÇÃO (REMOVER EM PRODUÇÃO)
// ══════════════════════════════════════════════════════════════

console.log('✅ Slideshow inicializado');
console.log(`📸 Total de slides: ${slides.length}`);
console.log(`⏱️ Duração por slide: ${slideDuration / 1000}s`);