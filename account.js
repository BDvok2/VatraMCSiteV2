// Account Management
class AccountManager {
    constructor() {
        this.username = localStorage.getItem('mc_username');
        this.initElements();
        this.setupEventListeners();
        this.checkAuth();
    }

    initElements() {
        // Login elements
        this.loginContainer = document.getElementById('login-container');
        this.appContainer = document.getElementById('app-container');
        this.usernameInput = document.getElementById('username');
        this.loginBtn = document.getElementById('login-btn');
        this.loginMessage = document.getElementById('login-message');
        
        // App elements
        this.playerUsername = document.getElementById('player-username');
        this.playerAvatar = document.getElementById('player-avatar');
        this.logoutBtn = document.getElementById('logout-btn');
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.pages = document.querySelectorAll('.page');
    }

    setupEventListeners() {
        // Login form
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Logout button
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        // Navigation buttons
        this.navButtons.forEach(btn => {
            if (btn.dataset.page) {
                btn.addEventListener('click', () => this.showPage(btn.dataset.page));
            }
        });
    }

    async checkAuth() {
        if (this.username) {
            await this.loadPlayerData(this.username);
            this.showApp();
        } else {
            this.showLogin();
        }
    }

    async handleLogin() {
        const username = this.usernameInput.value.trim();
        
        if (!username) {
            this.showMessage('Please enter a username', 'error');
            return;
        }

        try {
            // Show loading state
            this.loginBtn.disabled = true;
            this.loginBtn.textContent = 'Loading...';
            
            // In a real app, you would verify the username with your backend
            // For now, we'll just simulate a successful login
            const isValid = await this.validateMinecraftUsername(username);
            
            if (isValid) {
                this.username = username;
                localStorage.setItem('mc_username', username);
                await this.loadPlayerData(username);
                this.showApp();
            } else {
                this.showMessage('Invalid Minecraft username', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Error connecting to server', 'error');
        } finally {
            this.loginBtn.disabled = false;
            this.loginBtn.textContent = 'Login';
        }
    }

    async validateMinecraftUsername(username) {
        // Basic validation - in a real app, you would check against Mojang's API
        if (!username || username.length < 3 || username.length > 16) {
            return false;
        }
        // Only allow alphanumeric characters and underscores
        return /^[a-zA-Z0-9_]+$/.test(username);
    }

    async loadPlayerData(username) {
        try {
            // First, get the player's UUID from their username
            const uuidResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
            if (!uuidResponse.ok) {
                throw new Error('Player not found');
            }
            
            const playerData = await uuidResponse.json();
            const playerUuid = playerData.id;
            
            // Set the player's username (using the correct capitalization from the API)
            const correctUsername = playerData.name;
            this.playerUsername.textContent = correctUsername;
            
            // Get the player's avatar using mc-heads.net
            this.playerAvatar.src = `https://mc-heads.net/avatar/${playerUuid}/64`;
            this.playerAvatar.alt = `${correctUsername}'s avatar`;
            this.playerAvatar.style.imageRendering = 'pixelated';
            
            // Store the username in the header and page title
            document.title = `VatraMC - ${correctUsername}`;
            
            // Add a fallback in case the image fails to load
            this.playerAvatar.onerror = () => {
                this.playerAvatar.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                this.playerAvatar.style.imageRendering = 'pixelated';
            };
        } catch (error) {
            console.error('Error loading player data:', error);
            // Fallback to default Steve head if there's an error
            this.playerUsername.textContent = username;
            this.playerAvatar.src = 'https://mc-heads.net/avatar/MHF_Steve/40';
            this.playerAvatar.alt = 'Default Minecraft avatar';
        }
    }

    showPage(pageId) {
        // Hide all pages
        this.pages.forEach(page => page.classList.remove('active'));
        
        // Show the selected page
        const page = document.getElementById(`${pageId}-page`);
        if (page) {
            page.classList.add('active');
        }
        
        // Update active nav button
        this.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageId);
        });
    }

    handleLogout() {
        localStorage.removeItem('mc_username');
        this.username = null;
        this.showLogin();
    }

    showLogin() {
        this.loginContainer.classList.remove('hidden');
        this.appContainer.classList.add('hidden');
        this.usernameInput.value = '';
        this.usernameInput.focus();
    }

    showApp() {
        this.loginContainer.classList.add('hidden');
        this.appContainer.classList.remove('hidden');
        this.showPage('main');
    }

    showMessage(message, type = 'error') {
        this.loginMessage.textContent = message;
        this.loginMessage.className = 'login-message';
        this.loginMessage.classList.add(type);
        
        // Clear message after 3 seconds
        setTimeout(() => {
            this.loginMessage.textContent = '';
            this.loginMessage.className = 'login-message';
        }, 3000);
    }
}

// Initialize the account manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const accountManager = new AccountManager();
});
