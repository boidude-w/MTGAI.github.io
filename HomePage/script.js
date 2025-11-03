// Check if user is logged in
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Update user info display
window.addEventListener('load', () => {
    const userInfo = document.getElementById('userInfo');
    
    if (currentUser) {
        userInfo.innerHTML = `
            <span class="welcome-text">Welcome, ${currentUser.username}!</span>
            <button class="btn btn-small" id="logoutBtn">Logout</button>
        `;
        
        // Logout handler
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
        // Load user's stats
        stats = currentUser.stats;
        localStorage.setItem('mtgStats', JSON.stringify(stats));
    } else {
        userInfo.innerHTML = `
            <button class="btn btn-small" id="loginBtn">Login</button>
            <button class="btn btn-small" id="signupBtn">Sign Up</button>
        `;
        
        // Login/Signup handlers
        document.getElementById('loginBtn').addEventListener('click', () => {
            window.location.href = 'Login/Login.html';
        });
        
        document.getElementById('signupBtn').addEventListener('click', () => {
            window.location.href = 'Signup/Signup.html';
        });
    }
    
    console.log('MTG AI Home Page Loaded');
    console.log('Current User:', currentUser);
    console.log('Current Stats:', stats);
});

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Save stats before logout
        if (currentUser) {
            const users = JSON.parse(localStorage.getItem('mtgUsers')) || [];
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) {
                users[userIndex].stats = stats;
                localStorage.setItem('mtgUsers', JSON.stringify(users));
            }
        }
        
        localStorage.removeItem('currentUser');
        window.location.reload();
    }
}

// Initialize stats from localStorage
let stats = JSON.parse(localStorage.getItem('mtgStats')) || {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    decksCreated: 0
};

// Stats button handler
document.getElementById('statsBtn').addEventListener('click', showStats);

function showStats() {
    const statsMessage = `
=== Your Stats ===
Games Played: ${stats.gamesPlayed}
Wins: ${stats.wins}
Losses: ${stats.losses}
Win Rate: ${stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : 0}%
Decks Created: ${stats.decksCreated}
    `;
    
    alert(statsMessage);
}

// Export stats for other pages
function updateStats(key, value) {
    stats[key] = value;
    localStorage.setItem('mtgStats', JSON.stringify(stats));
    
    // Update user stats in storage
    if (currentUser) {
        const users = JSON.parse(localStorage.getItem('mtgUsers')) || [];
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].stats = stats;
            localStorage.setItem('mtgUsers', JSON.stringify(users));
        }
    }
}

window.mtgStats = stats;
window.updateStats = updateStats;