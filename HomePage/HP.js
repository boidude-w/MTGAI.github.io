// ===================================
// PARTICLE SYSTEM
// ===================================
class Particle {
    constructor(container) {
        this.container = container;
        this.reset();
        this.element = this.createElement();
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 0.5 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.3;
        
        // Random mana color
        const colors = [
            'rgba(240, 230, 210, 0.6)', // White
            'rgba(47, 110, 237, 0.6)',   // Blue
            'rgba(100, 50, 150, 0.6)',   // Black/Purple
            'rgba(211, 32, 42, 0.6)',    // Red
            'rgba(0, 115, 62, 0.6)',     // Green
            'rgba(203, 161, 53, 0.6)'    // Gold
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    createElement() {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = `${this.size}px`;
        particle.style.height = `${this.size}px`;
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.background = this.color;
        particle.style.boxShadow = `0 0 ${this.size * 3}px ${this.color}`;
        this.updatePosition(particle);
        this.container.appendChild(particle);
        return particle;
    }

    updatePosition(element) {
        element.style.left = `${this.x}px`;
        element.style.top = `${this.y}px`;
        element.style.opacity = this.opacity;
    }

    update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        
        // Wrap around screen
        if (this.y < -10) {
            this.y = window.innerHeight + 10;
        }
        if (this.x < -10) {
            this.x = window.innerWidth + 10;
        }
        if (this.x > window.innerWidth + 10) {
            this.x = -10;
        }

        this.updatePosition(this.element);
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

class ParticleSystem {
    constructor(containerId, particleCount = 50) {
        this.container = document.getElementById(containerId);
        this.particles = [];
        this.particleCount = particleCount;
        this.init();
    }

    init() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new Particle(this.container));
        }
        this.animate();
    }

    animate() {
        this.particles.forEach(particle => particle.update());
        requestAnimationFrame(() => this.animate());
    }

    resize() {
        // Recreate particles on resize for better distribution
        this.particles.forEach(particle => particle.destroy());
        this.particles = [];
        this.init();
    }
}

// ===================================
// PARALLAX SCROLLING
// ===================================
class ParallaxEffect {
    constructor() {
        this.layers = document.querySelectorAll('.parallax-layer');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => this.handleScroll());
        this.handleScroll(); // Initial position
    }

    handleScroll() {
        const scrolled = window.pageYOffset;
        
        this.layers.forEach((layer, index) => {
            const speed = (index + 1) * 0.3;
            const yPos = -(scrolled * speed);
            layer.style.transform = `translateY(${yPos}px)`;
        });
    }
}

// ===================================
// NAVIGATION SCROLL EFFECT
// ===================================
class NavigationHandler {
    constructor() {
        this.nav = document.querySelector('.nav-bar');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => this.handleScroll());
        this.setupSmoothScroll();
        this.setupActiveLinks();
    }

    handleScroll() {
        if (window.scrollY > 100) {
            this.nav.style.background = 'rgba(26, 19, 43, 0.95)';
            this.nav.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.7)';
        } else {
            this.nav.style.background = 'rgba(26, 19, 43, 0.85)';
            this.nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        }
    }

    setupSmoothScroll() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        const offsetTop = targetElement.offsetTop - 80;
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }

    setupActiveLinks() {
        const sections = document.querySelectorAll('section[id]');
        
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY + 100;
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    this.navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        });
    }
}

// ===================================
// MANA CARD INTERACTIONS
// ===================================
class ManaCardHandler {
    constructor() {
        this.cards = document.querySelectorAll('.mana-card');
        this.init();
    }

    init() {
        this.cards.forEach(card => {
            card.addEventListener('mouseenter', (e) => this.handleHover(e));
            card.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            card.addEventListener('mouseleave', (e) => this.handleLeave(e));
        });
    }

    handleHover(e) {
        const card = e.currentTarget;
        card.style.transition = 'transform 0.3s ease';
    }

    handleMouseMove(e) {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `translateY(-10px) scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    handleLeave(e) {
        const card = e.currentTarget;
        card.style.transform = 'translateY(0) scale(1) rotateX(0) rotateY(0)';
    }
}

// ===================================
// STAT COUNTER ANIMATION
// ===================================
class StatCounter {
    constructor() {
        this.stats = document.querySelectorAll('.stat-number');
        this.animated = false;
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    this.animateCounters();
                    this.animated = true;
                }
            });
        }, { threshold: 0.5 });

        const statsSection = document.querySelector('.hero-stats');
        if (statsSection) {
            observer.observe(statsSection);
        }
    }

    animateCounters() {
        this.stats.forEach(stat => {
            const target = stat.textContent;
            
            // Handle infinity symbol
            if (target === '∞') {
                return;
            }
            
            const numericTarget = parseInt(target.replace(/\D/g, ''));
            const suffix = target.replace(/[\d]/g, '');
            const duration = 2000;
            const increment = numericTarget / (duration / 16);
            let current = 0;
            
            const counter = setInterval(() => {
                current += increment;
                if (current >= numericTarget) {
                    stat.textContent = numericTarget + suffix;
                    clearInterval(counter);
                } else {
                    stat.textContent = Math.floor(current) + suffix;
                }
            }, 16);
        });
    }
}

// ===================================
// BUTTON RIPPLE EFFECT
// ===================================
class ButtonEffects {
    constructor() {
        this.buttons = document.querySelectorAll('.btn');
        this.init();
    }

    init() {
        this.buttons.forEach(button => {
            button.addEventListener('mouseenter', (e) => this.createRipple(e));
        });
    }

    createRipple(e) {
        const button = e.currentTarget;
        const existingRipple = button.querySelector('.ripple');
        
        if (existingRipple) {
            existingRipple.remove();
        }
    }
}

// ===================================
// SCROLL REVEAL ANIMATIONS
// ===================================
class ScrollReveal {
    constructor() {
        this.elements = document.querySelectorAll('.feature-card, .mana-card');
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        this.elements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });
    }
}

// ===================================
// CURSOR TRAIL EFFECT
// ===================================
class CursorTrail {
    constructor() {
        this.trail = [];
        this.maxTrail = 20;
        this.init();
    }

    init() {
        document.addEventListener('mousemove', (e) => {
            if (Math.random() > 0.7) { // Reduce frequency
                this.createTrailParticle(e.clientX, e.clientY);
            }
        });
    }

    createTrailParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'cursor-trail';
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.borderRadius = '50%';
        particle.style.background = 'rgba(203, 161, 53, 0.6)';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.style.opacity = '0';
            particle.style.transform = 'scale(0)';
        }, 10);
        
        setTimeout(() => {
            particle.remove();
        }, 500);
    }
}

// ===================================
// SESSION HANDLER
// ===================================
class SessionHandler {
    constructor() {
        this.session = this.getSession();
        this.init();
    }

    getSession() {
        const sessionData = sessionStorage.getItem('userSession') || localStorage.getItem('userSession');
        return sessionData ? JSON.parse(sessionData) : null;
    }

    init() {
        if (this.session) {
            this.updateNavigation();
            this.displayWelcomeMessage();
        }
    }

    updateNavigation() {
        const navActions = document.querySelector('.nav-actions');
        
        if (this.session) {
            navActions.innerHTML = `
                <div class="user-profile">
                    <span class="user-name">${this.session.username}</span>
                    <button class="btn btn-secondary btn-logout" id="logoutBtn">Logout</button>
                </div>
            `;
            
            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        }
    }

    displayWelcomeMessage() {
        const hero = document.querySelector('.hero');
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'welcome-message';
        welcomeMsg.innerHTML = `
            <div class="welcome-content">
                <span class="welcome-icon">${this.getManaIcon(this.session.manaColor)}</span>
                <p class="welcome-text">Welcome back, <strong>${this.session.username}</strong>!</p>
            </div>
        `;
        
        hero.insertBefore(welcomeMsg, hero.firstChild);
        
        // Animate in
        setTimeout(() => {
            welcomeMsg.style.opacity = '1';
            welcomeMsg.style.transform = 'translateY(0)';
        }, 500);
        
        // Remove after 4 seconds
        setTimeout(() => {
            welcomeMsg.style.opacity = '0';
            welcomeMsg.style.transform = 'translateY(-20px)';
            setTimeout(() => welcomeMsg.remove(), 500);
        }, 4000);
    }

    getManaIcon(color) {
        const icons = {
            white: '☀',
            blue: '💧',
            black: '💀',
            red: '🔥',
            green: '🌿',
            colorless: '✦'
        };
        return icons[color] || '✦';
    }

    logout() {
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
        window.location.reload();
    }
}

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all systems
    const particleSystem = new ParticleSystem('particles', 50);
    const parallax = new ParallaxEffect();
    const navigation = new NavigationHandler();
    const manaCards = new ManaCardHandler();
    const statCounter = new StatCounter();
    const buttonEffects = new ButtonEffects();
    const scrollReveal = new ScrollReveal();
    const cursorTrail = new CursorTrail();
    const sessionHandler = new SessionHandler(); // Add this

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            particleSystem.resize();
        }, 250);
    });

    // Add loading animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);

    // Log initialization
    console.log('🎮 Arcane Arena initialized');
    console.log('✨ Particle system active');
    console.log('🌊 Parallax effects enabled');
});

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Smooth scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Get user preference for reduced motion
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Disable animations if user prefers reduced motion
if (prefersReducedMotion()) {
    document.documentElement.style.setProperty('--animation-duration', '0s');
}