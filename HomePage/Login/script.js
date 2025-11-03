// Login form handler
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const usernameOrEmail = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Clear previous messages
    errorMessage.textContent = '';
    successMessage.textContent = '';
    
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('mtgUsers')) || [];
    
    // Find user
    const user = users.find(u => 
        (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
        u.password === password
    );
    
    if (!user) {
        errorMessage.textContent = 'Invalid username/email or password!';
        return;
    }
    
    // Set current user
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('mtgStats', JSON.stringify(user.stats));
    
    successMessage.textContent = 'Login successful! Redirecting...';
    
    // Redirect to home page after 1 second
    setTimeout(() => {
        window.location.href = '../HP.html';
    }, 1000);
});