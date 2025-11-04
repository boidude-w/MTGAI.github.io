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
// FORM VALIDATION
// ===================================
class SignupValidator {
    constructor() {
        this.form = document.getElementById('signupForm');
        this.username = document.getElementById('username');
        this.email = document.getElementById('email');
        this.password = document.getElementById('password');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.togglePassword = document.getElementById('togglePassword');
        this.errorMessage = document.getElementById('errorMessage');
        
        this.init();
    }

    init() {
        // Real-time validation
        this.username.addEventListener('input', () => this.validateUsername());
        this.email.addEventListener('input', () => this.validateEmail());
        this.password.addEventListener('input', () => {
            this.validatePassword();
            this.updatePasswordStrength();
        });
        this.confirmPassword.addEventListener('input', () => this.validateConfirmPassword());
        
        // Toggle password visibility
        this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    validateUsername() {
        const usernameMessage = document.getElementById('usernameMessage');
        const value = this.username.value.trim();
        
        if (value.length === 0) {
            this.setMessage(usernameMessage, '', '');
            return false;
        }
        
        if (value.length < 3) {
            this.setMessage(usernameMessage, 'Username must be at least 3 characters', 'error');
            return false;
        }
        
        if (value.length > 20) {
            this.setMessage(usernameMessage, 'Username must be less than 20 characters', 'error');
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            this.setMessage(usernameMessage, 'Username can only contain letters, numbers, and underscores', 'error');
            return false;
        }
        
        this.setMessage(usernameMessage, '✓ Username available', 'success');
        return true;
    }

    validateEmail() {
        const emailMessage = document.getElementById('emailMessage');
        const value = this.email.value.trim();
        
        if (value.length === 0) {
            this.setMessage(emailMessage, '', '');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(value)) {
            this.setMessage(emailMessage, 'Please enter a valid email address', 'error');
            return false;
        }
        
        this.setMessage(emailMessage, '✓ Email is valid', 'success');
        return true;
    }

    validatePassword() {
        const passwordMessage = document.getElementById('passwordMessage');
        const value = this.password.value;
        
        if (value.length === 0) {
            this.setMessage(passwordMessage, '', '');
            return false;
        }
        
        if (value.length < 8) {
            this.setMessage(passwordMessage, 'Password must be at least 8 characters', 'error');
            return false;
        }
        
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            this.setMessage(passwordMessage, 'Password must contain uppercase, lowercase, and numbers', 'error');
            return false;
        }
        
        this.setMessage(passwordMessage, '✓ Password is strong', 'success');
        return true;
    }

    validateConfirmPassword() {
        const confirmPasswordMessage = document.getElementById('confirmPasswordMessage');
        const value = this.confirmPassword.value;
        
        if (value.length === 0) {
            this.setMessage(confirmPasswordMessage, '', '');
            return false;
        }
        
        if (value !== this.password.value) {
            this.setMessage(confirmPasswordMessage, 'Passwords do not match', 'error');
            return false;
        }
        
        this.setMessage(confirmPasswordMessage, '✓ Passwords match', 'success');
        return true;
    }

    updatePasswordStrength() {
        const strengthBar = document.querySelector('.strength-bar');
        const value = this.password.value;
        
        if (value.length === 0) {
            strengthBar.className = 'strength-bar';
            return;
        }
        
        let strength = 0;
        
        if (value.length >= 8) strength++;
        if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
        if (/[0-9]/.test(value)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength++;
        
        strengthBar.className = 'strength-bar';
        
        if (strength <= 2) {
            strengthBar.classList.add('weak');
        } else if (strength === 3) {
            strengthBar.classList.add('medium');
        } else {
            strengthBar.classList.add('strong');
        }
    }

    togglePasswordVisibility() {
        const type = this.password.type === 'password' ? 'text' : 'password';
        this.password.type = type;
        this.confirmPassword.type = type;
        
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

    // Update handleSubmit to store user and redirect
    async handleSubmit(e) {
        e.preventDefault();
        
        const isUsernameValid = this.validateUsername();
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();
        
        if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
            this.showError('Please fix all errors before submitting');
            return;
        }
        
        const terms = document.getElementById('terms');
        if (!terms.checked) {
            this.showError('Please accept the Terms of Service and Privacy Policy');
            return;
        }
        
        const mana = document.querySelector('input[name="mana"]:checked');
        if (!mana) {
            this.showError('Please choose your mana affinity');
            return;
        }
        
        const formData = {
            username: this.username.value.trim(),
            email: this.email.value.trim(),
            password: this.password.value,
            manaColor: mana.value,
            createdAt: new Date().toISOString()
        };
        
        const submitBtn = this.form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Creating Account...';
        
        try {
            await this.registerUser(formData);
            
            // Store a flag to show success message on login page
            sessionStorage.setItem('registrationSuccess', 'true');
            
            // Redirect to login
            window.location.href = '../Login/Login.html?registered=true';
        } catch (error) {
            this.showError(error.message || 'Registration failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = 'Create Account';
        }
    }

    async registerUser(formData) {
        return new Promise(async (resolve, reject) => {
            try {
                // Fetch existing users from db.json
                const response = await fetch('http://localhost:3000/users');
                const data = await response.json();
                const users = data.users || [];
                
                // Check if user already exists
                if (users.find(u => u.username === formData.username)) {
                    reject(new Error('Username already exists'));
                    return;
                }
                
                if (users.find(u => u.email === formData.email)) {
                    reject(new Error('Email already registered'));
                    return;
                }
                
                // Add new user with unique ID
                const newUser = {
                    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                    ...formData
                };
                
                users.push(newUser);
                
                // Note: In a real application, you would send this to a backend API
                // For now, store in localStorage as fallback
                localStorage.setItem('users', JSON.stringify(users));
                
                console.log('User registered:', newUser);
                resolve(newUser);
            } catch (error) {
                console.error('Registration error:', error);
                // Fallback to localStorage
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                
                if (users.find(u => u.username === formData.username)) {
                    reject(new Error('Username already exists'));
                    return;
                }
                
                if (users.find(u => u.email === formData.email)) {
                    reject(new Error('Email already registered'));
                    return;
                }
                
                const newUser = {
                    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                    ...formData
                };
                
                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));
                resolve(newUser);
            }
        });
    }
}

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle system
    new ParticleSystem('particles', 30);
    
    // Initialize form validator
    new SignupValidator();
    
    // Fade in animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    console.log('🎮 Signup page initialized');
});