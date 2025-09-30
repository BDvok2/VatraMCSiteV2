// Server configuration
const SERVER_IP = 'mc.vatra.fun';
const SERVER_PORT = 25565; // Default Minecraft port

 
 // Playtime API endpoint for backend proxy (configure to your server)
 const PLAYTIME_API = '/api/playtime';
 
 async function fetchPlaytimeSeconds(uuid) {
   try {
     const res = await fetch(`${PLAYTIME_API}?uuid=${encodeURIComponent(uuid)}`);
     if (!res.ok) return null;
     const data = await res.json();
     if (data?.seconds == null) return null;
     return Number(data.seconds);
   } catch (e) {
     return null;
   }
 }
 
 function formatDuration(seconds) {
   if (seconds == null) return 'Unknown';
   const h = Math.floor(seconds / 3600);
   const m = Math.floor((seconds % 3600) / 60);
   return `${h}h ${m}m`;
 }
 
// Account page quick preview handler (only if elements exist on this page)
const loginBtnEl = document.getElementById('login-btn');
if (loginBtnEl) {
    loginBtnEl.addEventListener('click', () => {
        const usernameInputEl = document.getElementById('username');
        const username = usernameInputEl ? usernameInputEl.value.trim() : '';
        if (!username) return;

        const loginContainerEl = document.getElementById('login-container');
        const appContainerEl = document.getElementById('app-container');
        if (loginContainerEl && appContainerEl) {
            loginContainerEl.classList.add('hidden');
            appContainerEl.classList.remove('hidden');
        }

        const playerUsernameEl = document.getElementById('player-username');
        if (playerUsernameEl) playerUsernameEl.textContent = username;

        const playerAvatarEl = document.getElementById('player-avatar');
        if (playerAvatarEl) {
            playerAvatarEl.src = `https://crafatar.com/avatars/${username}?overlay`;
        }

        const playerSkinEl = document.getElementById('player-skin');
        if (playerSkinEl) {
            playerSkinEl.src = `https://crafatar.com/renders/body/${username}?overlay`;
        }
    });
}



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
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.handleLogin());
        }
        if (this.usernameInput) {
            this.usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }

        // Logout button
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation buttons
        if (this.navButtons) {
            this.navButtons.forEach(btn => {
                if (btn.dataset.page) {
                    btn.addEventListener('click', () => this.showPage(btn.dataset.page));
                }
            });
        }
    }

    async checkAuth() {
        if (this.username && this.loginContainer && this.appContainer) {
            await this.loadPlayerData(this.username);
            this.showApp();
        } else if (this.loginContainer && this.appContainer) {
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
            this.loginBtn.disabled = true;
            this.loginBtn.textContent = 'Loading...';
            
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
            if (this.loginBtn) {
                this.loginBtn.disabled = false;
                this.loginBtn.textContent = 'Login';
            }
        }
    }

    async validateMinecraftUsername(username) {
        if (!username || username.length < 3 || username.length > 16) {
            return false;
        }
        return /^[a-zA-Z0-9_]+$/.test(username);
    }

    async loadPlayerData(username) {
        try {
            // Try CORS-friendly PlayerDB API first
            let playerUuid = null;
            let correctUsername = null;

            try {
                const playerDbResp = await fetch(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`);
                if (playerDbResp.ok) {
                    const pd = await playerDbResp.json();
                    if (pd && pd.success && pd.data && pd.data.player) {
                        playerUuid = pd.data.player.id; // no dashes
                        correctUsername = pd.data.player.username;
                    }
                }
            } catch (e) {
                // ignore and fallback
            }

            // Fallback to Mojang API via a public CORS proxy if PlayerDB failed
            if (!playerUuid || !correctUsername) {
                const proxiedUrl = `https://cors.isomorphic-git.org/https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`;
                const uuidResponse = await fetch(proxiedUrl);
                if (!uuidResponse.ok) {
                    throw new Error('Player not found');
                }
                const playerData = await uuidResponse.json();
                playerUuid = playerData.id;
                correctUsername = playerData.name;
            }
            
            // Store username and UUID for later use
            this.currentUser = {
                username: correctUsername,
                uuid: playerUuid,
                avatarUrl: `https://mc-heads.net/avatar/${playerUuid}/64`
            };
            
            // Update header
            if (this.playerUsername) this.playerUsername.textContent = correctUsername;
            
            if (this.playerAvatar) {
                this.playerAvatar.src = this.currentUser.avatarUrl;
                this.playerAvatar.alt = `${correctUsername}'s avatar`;
                this.playerAvatar.style.imageRendering = 'pixelated';
                
                this.playerAvatar.onerror = () => {
                    this.playerAvatar.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                    this.playerAvatar.style.imageRendering = 'pixelated';
                };
            }
            
            document.title = `VatraMC - ${correctUsername}`;
            
            // Update account page if it exists
            this.updateAccountPage();
        } catch (error) {
            console.error('Error loading player data:', error);
            if (this.playerUsername) this.playerUsername.textContent = username;
            if (this.playerAvatar) {
                this.playerAvatar.src = 'https://mc-heads.net/avatar/MHF_Steve/40';
                this.playerAvatar.alt = 'Default Minecraft avatar';
            }
        }
    }

    showPage(pageId) {
        if (!this.pages) return;
        
        this.pages.forEach(page => page.classList.remove('active'));
        
        const page = document.getElementById(`${pageId}-page`);
        if (page) {
            page.classList.add('active');
            
            // Update the page content when showing it
            if (pageId === 'account') {
                this.updateAccountPage();
            }
        }
        
        if (this.navButtons) {
            this.navButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.page === pageId);
            });
        }
    }

    handleLogout() {
        localStorage.removeItem('mc_username');
        this.username = null;
        this.showLogin();
    }

    showLogin() {
        if (this.loginContainer && this.appContainer) {
            this.loginContainer.classList.remove('hidden');
            this.appContainer.classList.add('hidden');
            if (this.usernameInput) {
                this.usernameInput.value = '';
                this.usernameInput.focus();
            }
        }
    }

    updateAccountPage() {
        if (!this.currentUser) return;
        
        const accountPage = document.getElementById('account-page');
        if (!accountPage) return;
        
        accountPage.innerHTML = `
            <div class="account-header">
                <img src="${this.currentUser.avatarUrl}" alt="${this.currentUser.username}'s avatar" class="account-avatar" style="image-rendering: pixelated; width: 100px; height: 100px; border-radius: 8px;">
                <h2>${this.currentUser.username}'s Account</h2>
            </div>
            <div class="account-details">
                <div class="detail-row">
                    <span class="detail-label">Username:</span>
                    <span class="detail-value">${this.currentUser.username}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">UUID:</span>
                    <span class="detail-value uuid">${this.currentUser.uuid}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Playtime:</span>
                    <span class="detail-value playtime">0h 0m</span>
                </div>
            </div>
        `;
        
        // Fetch and render real playtime if backend is available
        const playtimeEl = accountPage.querySelector('.detail-value.playtime');
        if (playtimeEl && this.currentUser?.uuid) {
            playtimeEl.textContent = 'Loading...';
            fetchPlaytimeSeconds(this.currentUser.uuid).then((secs) => {
                playtimeEl.textContent = formatDuration(secs);
            });
        }
    }
    
    showApp() {
        if (this.loginContainer && this.appContainer) {
            this.loginContainer.classList.add('hidden');
            this.appContainer.classList.remove('hidden');
            this.showPage('account');
        }
    }

    showMessage(message, type = 'error') {
        if (!this.loginMessage) return;
        
        this.loginMessage.textContent = message;
        this.loginMessage.className = 'login-message';
        this.loginMessage.classList.add(type);
        
        setTimeout(() => {
            if (this.loginMessage) {
                this.loginMessage.textContent = '';
                this.loginMessage.className = 'login-message';
            }
        }, 3000);
    }
}

// Attach menu button handlers after DOM is ready
(function attachMenuHandlers() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Navigation handlers
    const routes = {
      about: 'aboutus.html',
      map: 'map.html',
      account: 'account.html',
      'exit-btn': 'index.html',
      'exit-btn1': 'index.html',
    };

    Object.entries(routes).forEach(([id, href]) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          window.location.href = href;
        });
      }
    });

    // IP copy functionality
    const ipElement = document.querySelector('.ip');
    if (ipElement) {
      ipElement.style.cursor = 'pointer';
      ipElement.title = 'Click to copy IP';
      
      ipElement.addEventListener('click', () => {
        navigator.clipboard.writeText(SERVER_IP)
          .then(() => {
            const originalText = ipElement.textContent;
            ipElement.textContent = 'Copied!';
            setTimeout(() => {
              ipElement.textContent = originalText;
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy IP: ', err);
          });
      });
    }

    // Check server status
    checkServerStatus();
    // Update status every 30 seconds
    setInterval(checkServerStatus, 30000);
  }

  async function checkServerStatus() {
    const statusElement = document.querySelector('.server-status');
    const playersElement = document.querySelector('.players');
    
    if (!statusElement || !playersElement) return;

    try {
      // Using mcstatus.io API to check server status
      const response = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_IP}${SERVER_PORT ? ':' + SERVER_PORT : ''}`);
      const data = await response.json();
      
      if (data.online) {
        statusElement.classList.remove('offline');
        statusElement.classList.add('online');
        playersElement.textContent = `${data.players.online}/${data.players.max}`;
        playersElement.title = data.players.list ? data.players.list.join('\n') : '';
      } else {
        statusElement.classList.remove('online');
        statusElement.classList.add('offline');
        playersElement.textContent = 'Offline';
        playersElement.title = '';
      }
    } catch (error) {
      console.error('Error checking server status:', error);
      statusElement.classList.remove('online');
      statusElement.classList.add('offline');
      playersElement.textContent = 'Status unknown';
    }
  }
})();

// Initialize account manager if on account page
if (document.getElementById('login-container') || document.getElementById('app-container')) {
    document.addEventListener('DOMContentLoaded', () => {
        new AccountManager();
    });
}
