// Sign up form handler
document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Clear previous messages
    errorMessage.textContent = '';
    successMessage.textContent = '';
    
    // Validation
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match!';
        return;
    }
    
    if (password.length < 6) {
        errorMessage.textContent = 'Password must be at least 6 characters long!';
        return;
    }
    
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('mtgUsers')) || [];
    const userExists = users.some(user => user.username === username || user.email === email);
    
    if (userExists) {
        errorMessage.textContent = 'Username or email already exists!';
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        username: username,
        email: email,
        password: password, // Note: In production, passwords should be hashed!
        createdAt: new Date().toISOString(),
        stats: {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            decksCreated: 0
        }
    };
    
    // Save user to localStorage
    users.push(newUser);
    localStorage.setItem('mtgUsers', JSON.stringify(users));
    
    // Set current user
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    localStorage.setItem('mtgStats', JSON.stringify(newUser.stats));
    
    successMessage.textContent = 'Account created successfully! Redirecting...';
    
    // Redirect to home page after 1.5 seconds
    setTimeout(() => {
        window.location.href = '../HP.html';
    }, 1500);
});