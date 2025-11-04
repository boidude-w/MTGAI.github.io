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
        
        const colors = [
            'rgba(240, 230, 210, 0.6)',
            'rgba(47, 110, 237, 0.6)',
            'rgba(100, 50, 150, 0.6)',
            'rgba(211, 32, 42, 0.6)',
            'rgba(0, 115, 62, 0.6)',
            'rgba(203, 161, 53, 0.6)'
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
        
        if (this.y < -10) this.y = window.innerHeight + 10;
        if (this.x < -10) this.x = window.innerWidth + 10;
        if (this.x > window.innerWidth + 10) this.x = -10;

        this.updatePosition(this.element);
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

class ParticleSystem {
    constructor(containerId, particleCount = 30) {
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
}

// ===================================
// LOGIN HANDLER
// ===================================
class LoginHandler {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.identifier = document.getElementById('identifier');
        this.password = document.getElementById('password');
        this.togglePassword = document.getElementById('togglePassword');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        this.guestLoginBtn = document.getElementById('guestLogin');
        this.fillDemoBtn = document.getElementById('fillDemo');
        
        this.init();
    }

    init() {
        // Check for registration success
        this.checkRegistrationSuccess();
        
        // Real-time validation
        this.identifier.addEventListener('input', () => this.validateIdentifier());
        this.password.addEventListener('input', () => this.validatePassword());
        
        // Toggle password visibility
        this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Guest login
        this.guestLoginBtn.addEventListener('click', () => this.handleGuestLogin());
        
        // Fill demo credentials
        this.fillDemoBtn.addEventListener('click', () => this.fillDemoCredentials());
    }

    checkRegistrationSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('registered') === 'true') {
            this.successMessage.classList.add('show');
            setTimeout(() => {
                this.successMessage.classList.remove('show');
            }, 5000);
        }
    }

    validateIdentifier() {
        const identifierMessage = document.getElementById('identifierMessage');
        const value = this.identifier.value.trim();
        
        if (value.length === 0) {
            this.setMessage(identifierMessage, '', '');
            return false;
        }
        
        if (value.length < 3) {
            this.setMessage(identifierMessage, 'Please enter a valid username or email', 'error');
            return false;
        }
        
        this.setMessage(identifierMessage, '', '');
        return true;
    }

    validatePassword() {
        const passwordMessage = document.getElementById('passwordMessage');
        const value = this.password.value;
        
        if (value.length === 0) {
            this.setMessage(passwordMessage, '', '');
            return false;
        }
        
        if (value.length < 6) {
            this.setMessage(passwordMessage, 'Password must be at least 6 characters', 'error');
            return false;
        }
        
        this.setMessage(passwordMessage, '', '');
        return true;
    }

    togglePasswordVisibility() {
        const type = this.password.type === 'password' ? 'text' : 'password';
        this.password.type = type;
        
        const eyeIcon = this.togglePassword.querySelector('.eye-icon');
        eyeIcon.textContent = type === 'password' ? '👁' : '👁‍🗨';
    }

    setMessage(element, message, type) {
        element.textContent = message;
        element.className = 'input-message';
        if (type) element.classList.add(type);
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.add('show');
        
        setTimeout(() => {
            this.errorMessage.classList.remove('show');
        }, 5000);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate fields
        const isIdentifierValid = this.validateIdentifier();
        const isPasswordValid = this.validatePassword();
        
        if (!isIdentifierValid || !isPasswordValid) {
            this.showError('Please fill in all fields correctly');
            return;
        }
        
        // Collect form data
        const formData = {
            identifier: this.identifier.value.trim(),
            password: this.password.value,
            remember: document.getElementById('remember').checked
        };
        
        // Disable submit button
        const submitBtn = this.form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Entering Arena...';
        
        try {
            const user = await this.loginUser(formData);
            
            // Store complete session data
            const sessionData = {
                username: user.username,
                email: user.email,
                manaColor: user.manaColor,
                loginTime: new Date().toISOString(),
                isGuest: false
            };
            
            if (formData.remember) {
                localStorage.setItem('userSession', JSON.stringify(sessionData));
            } else {
                sessionStorage.setItem('userSession', JSON.stringify(sessionData));
            }
            
            // Redirect to homepage
            window.location.href = '../HP.html';
        } catch (error) {
            this.showError(error.message || 'Login failed. Please check your credentials.');
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = 'Enter Arena';
        }
    }

    async loginUser(formData) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check demo credentials first
                if (formData.identifier === 'demo_user' && formData.password === 'Demo1234!') {
                    resolve({ 
                        id: 0,
                        username: 'demo_user', 
                        email: 'demo@arcanearena.com',
                        manaColor: 'blue'
                    });
                    return;
                }
                
                // Fetch users from db.json
                const response = await fetch('http://localhost:3000/users');
                const data = await response.json();
                let users = data.users || [];
                
                // If db.json is empty, try localStorage
                if (users.length === 0) {
                    users = JSON.parse(localStorage.getItem('users') || '[]');
                }
                
                // Find user by username or email
                const user = users.find(u => 
                    (u.username === formData.identifier || u.email === formData.identifier) &&
                    u.password === formData.password
                );
                
                if (user) {
                    // Remove password before resolving
                    const { password, ...userWithoutPassword } = user;
                    resolve(userWithoutPassword);
                } else {
                    reject(new Error('Invalid username or password'));
                }
            } catch (error) {
                console.error('Login error:', error);
                // Fallback to localStorage
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const user = users.find(u => 
                    (u.username === formData.identifier || u.email === formData.identifier) &&
                    u.password === formData.password
                );
                
                if (user) {
                    const { password, ...userWithoutPassword } = user;
                    resolve(userWithoutPassword);
                } else {
                    reject(new Error('Invalid username or password'));
                }
            }
        });
    }

    handleGuestLogin() {
        const guestSession = {
            username: 'Guest',
            email: 'guest@arcanearena.com',
            manaColor: 'colorless',
            isGuest: true,
            loginTime: new Date().toISOString()
        };
        
        sessionStorage.setItem('userSession', JSON.stringify(guestSession));
        window.location.href = '../HP.html';
    }

    fillDemoCredentials() {
        this.identifier.value = 'demo_user';
        this.password.value = 'Demo1234!';
        
        // Add visual feedback
        this.identifier.style.animation = 'pulse 0.5s ease';
        this.password.style.animation = 'pulse 0.5s ease';
        
        setTimeout(() => {
            this.identifier.style.animation = '';
            this.password.style.animation = '';
        }, 500);
    }
}

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle system
    new ParticleSystem('particles', 30);
    
    // Initialize login handler
    new LoginHandler();
    
    // Fade in animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    console.log('🎮 Login page initialized');
});

// Add pulse animation for demo fill
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
    }
`;
document.head.appendChild(style);