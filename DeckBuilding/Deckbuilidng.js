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
// SCRYFALL API HANDLER
// ===================================
class ScryfallAPI {
    constructor() {
        this.baseUrl = 'https://api.scryfall.com';
        this.cache = new Map();
        this.requestDelay = 100; // Scryfall rate limit: 10 requests per second
        this.lastRequest = 0;
    }

    async delay() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        if (timeSinceLastRequest < this.requestDelay) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
        }
        this.lastRequest = Date.now();
    }

    async searchCards(query, filters = {}) {
        await this.delay();
        
        let searchQuery = query;
        
        // Add color filters
        if (filters.colors && filters.colors.length > 0) {
            const colorQuery = filters.colors.map(c => `c:${c}`).join(' OR ');
            searchQuery += ` (${colorQuery})`;
        }
        
        // Add type filter
        if (filters.type) {
            searchQuery += ` t:${filters.type}`;
        }
        
        // Add mana cost filter
        if (filters.minCost !== undefined || filters.maxCost !== undefined) {
            if (filters.minCost !== undefined) {
                searchQuery += ` cmc>=${filters.minCost}`;
            }
            if (filters.maxCost !== undefined) {
                searchQuery += ` cmc<=${filters.maxCost}`;
            }
        }
        
        // Add rarity filter
        if (filters.rarity) {
            searchQuery += ` r:${filters.rarity}`;
        }
        
        const cacheKey = `search:${searchQuery}:${filters.page || 1}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${this.baseUrl}/cards/search?q=${encodeURIComponent(searchQuery)}&page=${filters.page || 1}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return { data: [], has_more: false, total_cards: 0 };
                }
                throw new Error(`Scryfall API error: ${response.status}`);
            }
            
            const data = await response.json();
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching cards:', error);
            throw error;
        }
    }

    async getCardByName(name) {
        await this.delay();
        
        const cacheKey = `card:${name}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${this.baseUrl}/cards/named?exact=${encodeURIComponent(name)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Card not found: ${name}`);
            }
            
            const data = await response.json();
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching card:', error);
            throw error;
        }
    }

    async getRandomCards(count = 10) {
        await this.delay();
        
        try {
            const url = `${this.baseUrl}/cards/random`;
            const cards = [];
            
            for (let i = 0; i < count; i++) {
                const response = await fetch(url);
                if (response.ok) {
                    const card = await response.json();
                    cards.push(card);
                }
                await this.delay();
            }
            
            return cards;
        } catch (error) {
            console.error('Error fetching random cards:', error);
            throw error;
        }
    }
}

// ===================================
// DECK MANAGER
// ===================================
class DeckManager {
    constructor() {
        this.deck = [];
        this.deckName = 'Untitled Deck';
        this.maxDeckSize = 60;
        this.api = new ScryfallAPI();
        this.recommender = new DeckRecommender(this.api); // Add this line
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentFilters = {};
        this.currentSearchQuery = '';
        
        this.init();
    }


    init() {
        this.loadDeckFromStorage();
        this.setupEventListeners();
        this.updateDeckStats();
        this.updateDeckCountBadge();
        this.loadInitialCards();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('cardSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Filter controls
        document.getElementById('applyFiltersBtn').addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());

        // Color checkboxes
        document.querySelectorAll('.color-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });

        // Deck actions
        document.getElementById('saveDeckBtn').addEventListener('click', () => this.saveDeck());
        document.getElementById('exportDeckBtn').addEventListener('click', () => this.exportDeck());
        document.getElementById('clearDeckBtn').addEventListener('click', () => this.clearDeck());
        document.getElementById('newDeckBtn').addEventListener('click', () => this.newDeck());
        document.getElementById('viewDecksBtn').addEventListener('click', () => this.openDeckLibrary());
        document.getElementById('getRecommendationsBtn').addEventListener('click', () => this.getAIRecommendations());

        // Deck name
        document.getElementById('deckName').addEventListener('change', (e) => {
            this.deckName = e.target.value || 'Untitled Deck';
            this.saveDeckToStorage();
        });

        // View tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // Modal close buttons - Updated IDs to match HTML
        document.getElementById('closeDeckLibrary').addEventListener('click', () => this.closeDeckLibrary());
        document.getElementById('closeModal').addEventListener('click', () => this.closeCardPreview());
        
        // Also close modals when clicking overlay
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeDeckLibrary();
                    this.closeCardPreview();
                }
            });
        });
    }

    async loadInitialCards() {
        try {
            this.showLoading();
            const results = await this.api.searchCards('*', { page: 1 });
            this.displaySearchResults(results);
        } catch (error) {
            this.showError('Failed to load cards. Please try again.');
            console.error(error);
        }
    }

    async handleSearch() {
        const searchQuery = document.getElementById('cardSearch').value.trim();
        
        if (!searchQuery) {
            this.showToast('Please enter a search term', 'warning');
            return;
        }

        this.currentSearchQuery = searchQuery;
        this.currentPage = 1;
        
        try {
            this.showLoading();
            const results = await this.api.searchCards(searchQuery, {
                ...this.currentFilters,
                page: this.currentPage
            });
            this.displaySearchResults(results);
        } catch (error) {
            this.showError('Search failed. Please try again.');
            console.error(error);
        }
    }

    applyFilters() {
        const filters = {};
        
        // Color filters
        const selectedColors = Array.from(document.querySelectorAll('.color-checkbox:checked'))
            .map(cb => cb.value);
        if (selectedColors.length > 0) {
            filters.colors = selectedColors;
        }
        
        // Type filter
        const typeFilter = document.getElementById('typeFilter').value;
        if (typeFilter) {
            filters.type = typeFilter;
        }
        
        // Mana cost filter
        const minCost = document.getElementById('minCost').value;
        const maxCost = document.getElementById('maxCost').value;
        if (minCost) filters.minCost = parseInt(minCost);
        if (maxCost) filters.maxCost = parseInt(maxCost);
        
        // Rarity filter
        const rarityFilter = document.getElementById('rarityFilter').value;
        if (rarityFilter) {
            filters.rarity = rarityFilter;
        }
        
        this.currentFilters = filters;
        this.currentPage = 1;
        
        // Always perform a search when filters are applied
        this.performFilteredSearch();
    }

        async performFilteredSearch() {
        // Use current search query or default to all cards
        const searchQuery = this.currentSearchQuery || '*';
        
        try {
            this.showLoading();
            const results = await this.api.searchCards(searchQuery, {
                ...this.currentFilters,
                page: this.currentPage
            });
            this.displaySearchResults(results);
        } catch (error) {
            this.showError('Failed to apply filters. Please try again.');
            console.error(error);
        }
    }

    clearFilters() {
        document.querySelectorAll('.color-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('typeFilter').value = '';
        document.getElementById('minCost').value = '';
        document.getElementById('maxCost').value = '';
        document.getElementById('rarityFilter').value = '';
        
        this.currentFilters = {};
        
        if (this.currentSearchQuery) {
            this.handleSearch();
        }
    }

    displaySearchResults(results) {
        const resultsList = document.getElementById('resultsList');
        const resultsCount = document.getElementById('resultsCount');
        
        if (!results.data || results.data.length === 0) {
            resultsList.innerHTML = `
                <div class="empty-message">
                    <span class="empty-icon">🔍</span>
                    <p>No cards found</p>
                </div>
            `;
            resultsCount.textContent = '0 cards';
            return;
        }
        
        resultsCount.textContent = `${results.total_cards || results.data.length} cards`;
        
        resultsList.innerHTML = results.data.map(card => this.createCardResultElement(card)).join('');
        
        // Add event listeners to result cards
        resultsList.querySelectorAll('.result-card').forEach((cardElement, index) => {
            const card = results.data[index];
            cardElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-add-card')) {
                    this.showCardPreview(card);
                }
            });
            
            cardElement.querySelector('.btn-add-card').addEventListener('click', (e) => {
                e.stopPropagation();
                this.addCardToDeck(card);
            });
        });
        
        // Setup pagination
        this.setupPagination(results);
    }

    createCardResultElement(card) {
        const imageUrl = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || '';
        const manaCost = card.mana_cost || '';
        const type = card.type_line || '';
        
        return `
            <div class="result-card" data-card-id="${card.id}">
                <img src="${imageUrl}" alt="${card.name}" class="result-card-image">
                <div class="result-card-info">
                    <div class="result-card-name">${card.name}</div>
                    <div class="result-card-type">${type}</div>
                    <div class="result-card-cost">${this.formatManaCost(manaCost)}</div>
                </div>
                <button class="btn-add-card">+</button>
            </div>
        `;
    }

    setupPagination(results) {
        const container = document.getElementById('paginationContainer');
        
        if (!results.has_more && this.currentPage === 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="${this.currentPage - 1}">‹ Prev</button>`;
        }
        
        // Page numbers (show current and nearby pages)
        const maxButtons = 5;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        const endPage = startPage + maxButtons - 1;
        
        for (let i = startPage; i <= endPage && i <= this.currentPage + 2; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHTML += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`;
        }
        
        // Next button
        if (results.has_more) {
            paginationHTML += `<button class="pagination-btn" data-page="${this.currentPage + 1}">Next ›</button>`;
        }
        
        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
        
        // Add event listeners
        container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const page = parseInt(btn.dataset.page);
                await this.goToPage(page);
            });
        });
    }

    async goToPage(page) {
        this.currentPage = page;
        
        try {
            this.showLoading();
            const results = await this.api.searchCards(this.currentSearchQuery || '*', {
                ...this.currentFilters,
                page: this.currentPage
            });
            this.displaySearchResults(results);
            
            // Scroll to top of results
            document.getElementById('resultsList').scrollTop = 0;
        } catch (error) {
            this.showError('Failed to load page. Please try again.');
            console.error(error);
        }
    }

    addCardToDeck(card) {
        // Check deck size limit
        const totalCards = this.deck.reduce((sum, item) => sum + item.quantity, 0);
        if (totalCards >= this.maxDeckSize) {
            this.showToast('Deck is full (60 cards max)', 'warning');
            return;
        }
        
        // Check if card already exists
        const existingCard = this.deck.find(item => item.card.id === card.id);
        
        if (existingCard) {
            // Check 4-card limit (except basic lands)
            if (!card.type_line.includes('Basic Land') && existingCard.quantity >= 4) {
                this.showToast('Maximum 4 copies of this card', 'warning');
                return;
            }
            existingCard.quantity++;
        } else {
            this.deck.push({
                card: card,
                quantity: 1
            });
        }
        
        this.updateDeckDisplay();
        this.updateDeckStats();
        this.saveDeckToStorage();
        this.showToast(`Added ${card.name} to deck`, 'success');
    }

    removeCardFromDeck(cardId) {
        const cardIndex = this.deck.findIndex(item => item.card.id === cardId);
        
        if (cardIndex !== -1) {
            const cardName = this.deck[cardIndex].card.name;
            this.deck[cardIndex].quantity--;
            
            if (this.deck[cardIndex].quantity <= 0) {
                this.deck.splice(cardIndex, 1);
            }
            
            this.updateDeckDisplay();
            this.updateDeckStats();
            this.saveDeckToStorage();
            this.showToast(`Removed ${cardName} from deck`, 'info');
        }
    }

updateDeckDisplay() {
        const visualView = document.getElementById('decklistVisual');
        const textView = document.querySelector('#decklistText textarea.decklist-textarea');
        
        // Visual view
        if (this.deck.length === 0) {
            visualView.innerHTML = `
                <div class="empty-deck">
                    <span class="empty-icon">🃏</span>
                    <p>Your deck is empty</p>
                    <p class="empty-hint">Search and add cards to build your deck</p>
                </div>
            `;
        } else {
            visualView.innerHTML = this.deck.map(item => {
                const imageUrl = item.card.image_uris?.normal || item.card.card_faces?.[0]?.image_uris?.normal || '';
                return `
                    <div class="deck-card" data-card-id="${item.card.id}">
                        <img src="${imageUrl}" alt="${item.card.name}" class="deck-card-image">
                        <div class="deck-card-overlay">
                            <span class="deck-card-quantity">x${item.quantity}</span>
                            <button class="btn-remove-card" data-card-id="${item.card.id}">−</button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Add remove event listeners
            visualView.querySelectorAll('.btn-remove-card').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeCardFromDeck(btn.dataset.cardId);
                });
            });
            
            // Add preview event listeners
            visualView.querySelectorAll('.deck-card').forEach((cardElement, index) => {
                cardElement.addEventListener('click', () => {
                    this.showCardPreview(this.deck[index].card);
                });
            });
        }
        
        // Text view
        if (this.deck.length === 0) {
            textView.value = 'Your deck is empty';
        } else {
            const deckText = this.deck
                .sort((a, b) => {
                    const cmcA = a.card.cmc || 0;
                    const cmcB = b.card.cmc || 0;
                    return cmcA - cmcB;
                })
                .map(item => `${item.quantity}x ${item.card.name}`)
                .join('\n');
            textView.value = deckText;
        }
    }

    updateDeckStats() {
        const totalCards = this.deck.reduce((sum, item) => sum + item.quantity, 0);
        const totalCmc = this.deck.reduce((sum, item) => sum + (item.card.cmc || 0) * item.quantity, 0);
        const avgCmc = totalCards > 0 ? (totalCmc / totalCards).toFixed(1) : '0.0';
        
        document.getElementById('deckCount').textContent = totalCards;
        document.getElementById('avgCmc').textContent = avgCmc;
        
        this.updateManaCurve();
        this.updateColorDistribution();
    }

    updateManaCurve() {
        const manaCurve = {};
        for (let i = 0; i <= 6; i++) {
            manaCurve[i] = 0;
        }
        manaCurve['7+'] = 0;
        
        this.deck.forEach(item => {
            const cmc = item.card.cmc || 0;
            if (cmc >= 7) {
                manaCurve['7+'] += item.quantity;
            } else {
                manaCurve[cmc] += item.quantity;
            }
        });
        
        const maxCount = Math.max(...Object.values(manaCurve), 1);
        
        // Update bars
        Object.keys(manaCurve).forEach(cmc => {
            const bar = document.querySelector(`.curve-bar[data-cmc="${cmc}"]`);
            if (bar) {
                const fill = bar.querySelector('.bar-fill');
                const count = bar.querySelector('.bar-count');
                const percentage = (manaCurve[cmc] / maxCount) * 100;
                
                fill.style.height = `${percentage}%`;
                count.textContent = manaCurve[cmc];
            }
        });
        
        // Create smooth curve overlay
        this.drawManaCurve(manaCurve, maxCount);
    }

            drawManaCurve(manaCurve, maxCount) {
        const curveContainer = document.getElementById('manaCurve');
        
        // Remove existing canvas if present
        let canvas = curveContainer.querySelector('.curve-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'curve-canvas';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            curveContainer.appendChild(canvas);
        }
        
        const rect = curveContainer.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get data points
        const points = [];
        const keys = ['0', '1', '2', '3', '4', '5', '6', '7+'];
        const barWidth = canvas.width / keys.length;
        
        keys.forEach((key, index) => {
            const value = manaCurve[key] || 0;
            const percentage = value / maxCount;
            const x = (index + 0.5) * barWidth;
            const y = canvas.height - (percentage * (canvas.height - 40)); // Leave space for labels
            points.push({ x, y, value });
        });
        
        // Draw smooth curve using bezier curves
        if (points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(203, 161, 53, 0.8)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(203, 161, 53, 0.6)';
            
            // Start from first point
            ctx.moveTo(points[0].x, points[0].y);
            
            // Create smooth curve through all points
            for (let i = 0; i < points.length - 1; i++) {
                const current = points[i];
                const next = points[i + 1];
                
                // Calculate control points for smooth bezier curve
                const controlPointX = (current.x + next.x) / 2;
                
                ctx.quadraticCurveTo(
                    controlPointX, current.y,
                    next.x, next.y
                );
            }
            
            ctx.stroke();
            
            // Draw filled area under curve
            ctx.lineTo(points[points.length - 1].x, canvas.height - 20);
            ctx.lineTo(points[0].x, canvas.height - 20);
            ctx.closePath();
            
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(203, 161, 53, 0.3)');
            gradient.addColorStop(1, 'rgba(203, 161, 53, 0.05)');
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw data points
            points.forEach(point => {
                if (point.value > 0) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = '#CBA135';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(203, 161, 53, 0.8)';
                    ctx.fill();
                    ctx.strokeStyle = '#1A132B';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
        }
    }

    updateColorDistribution() {
        const colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
        
        this.deck.forEach(item => {
            const colors = item.card.colors || [];
            if (colors.length === 0 && item.card.type_line?.includes('Land')) {
                colorCounts.C += item.quantity;
            } else if (colors.length === 0) {
                colorCounts.C += item.quantity;
            } else {
                colors.forEach(color => {
                    colorCounts[color] += item.quantity;
                });
            }
        });
        
        const totalColoredCards = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
        
        // Update individual color bars (keep existing functionality)
        Object.keys(colorCounts).forEach(color => {
            const bar = document.querySelector(`.color-bar[data-color="${color}"]`);
            if (bar) {
                const fill = bar.querySelector('.color-fill');
                const count = bar.querySelector('.color-count');
                const percentage = totalColoredCards > 0 ? (colorCounts[color] / totalColoredCards) * 100 : 0;
                
                fill.style.width = `${percentage}%`;
                count.textContent = colorCounts[color];
            }
        });
        
        // Create stacked bar visualization
        this.createStackedColorBar(colorCounts, totalColoredCards);
    }

            createStackedColorBar(colorCounts, total) {
        const container = document.getElementById('colorDistribution');
        
        // Remove existing stacked bar if present
        let stackedBar = container.querySelector('.stacked-color-bar');
        if (stackedBar) {
            stackedBar.remove();
        }
        
        // Create new stacked bar
        stackedBar = document.createElement('div');
        stackedBar.className = 'stacked-color-bar';
        stackedBar.style.cssText = `
            display: flex;
            height: 40px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: var(--spacing-md);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            border: 2px solid rgba(203, 161, 53, 0.3);
        `;
        
        const colorConfig = {
            W: { color: 'rgba(240, 230, 210, 0.9)', label: '☀', name: 'White' },
            U: { color: 'rgba(47, 110, 237, 0.9)', label: '💧', name: 'Blue' },
            B: { color: 'rgba(157, 78, 221, 0.9)', label: '💀', name: 'Black' },
            R: { color: 'rgba(211, 32, 42, 0.9)', label: '🔥', name: 'Red' },
            G: { color: 'rgba(0, 115, 62, 0.9)', label: '🌿', name: 'Green' },
            C: { color: 'rgba(204, 204, 204, 0.9)', label: '◇', name: 'Colorless' }
        };
        
        if (total === 0) {
            stackedBar.innerHTML = `
                <div style="
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(10, 7, 15, 0.6);
                    color: rgba(240, 230, 210, 0.5);
                    font-size: 0.9rem;
                ">
                    No cards in deck
                </div>
            `;
        } else {
            Object.keys(colorConfig).forEach(color => {
                const count = colorCounts[color];
                if (count > 0) {
                    const percentage = (count / total) * 100;
                    const config = colorConfig[color];
                    
                    const segment = document.createElement('div');
                    segment.className = 'color-segment';
                    segment.style.cssText = `
                        flex: ${percentage};
                        background: ${config.color};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.25rem;
                        font-weight: 700;
                        color: white;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                        transition: all 0.3s ease;
                        cursor: pointer;
                        position: relative;
                        overflow: hidden;
                    `;
                    
                    segment.innerHTML = `
                        <span style="font-size: 1.2rem;">${config.label}</span>
                        <span style="font-size: 0.9rem;">${count}</span>
                    `;
                    
                    // Add hover effect
                    segment.addEventListener('mouseenter', function() {
                        this.style.transform = 'scaleY(1.1)';
                        this.style.filter = 'brightness(1.2)';
                        this.style.zIndex = '10';
                    });
                    
                    segment.addEventListener('mouseleave', function() {
                        this.style.transform = 'scaleY(1)';
                        this.style.filter = 'brightness(1)';
                        this.style.zIndex = '1';
                    });
                    
                    // Add tooltip
                    segment.title = `${config.name}: ${count} cards (${percentage.toFixed(1)}%)`;
                    
                    stackedBar.appendChild(segment);
                }
            });
        }
        
        // Insert at the beginning of color distribution section
        container.insertBefore(stackedBar, container.firstChild);
    }

    switchView(view) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.tab-btn[data-view="${view}"]`).classList.add('active');
        
        const visualView = document.getElementById('decklistVisual');
        const textView = document.getElementById('decklistText');
        
        if (view === 'visual') {
            visualView.style.display = 'grid';
            textView.style.display = 'none';
        } else {
            visualView.style.display = 'none';
            textView.style.display = 'block';
        }
    }


    saveDeck() {
        if (this.deck.length === 0) {
            this.showToast('Cannot save empty deck', 'warning');
            return;
        }
        
        const decks = this.getSavedDecks();
        const deckData = {
            id: Date.now(),
            name: this.deckName,
            cards: this.deck,
            totalCards: this.deck.reduce((sum, item) => sum + item.quantity, 0),
            colors: this.getDeckColors(),
            savedAt: new Date().toISOString()
        };
        
        // Check if deck with same name exists
        const existingIndex = decks.findIndex(d => d.name === this.deckName);
        if (existingIndex !== -1) {
            if (confirm('A deck with this name already exists. Overwrite?')) {
                decks[existingIndex] = deckData;
            } else {
                return;
            }
        } else {
            decks.push(deckData);
        }
        
        localStorage.setItem('savedDecks', JSON.stringify(decks));
        this.updateDeckCountBadge();
        this.showToast('Deck saved successfully!', 'success');
    }

    exportDeck() {
        if (this.deck.length === 0) {
            this.showToast('Cannot export empty deck', 'warning');
            return;
        }
        
        const deckText = this.deck
            .map(item => `${item.quantity}x ${item.card.name}`)
            .join('\n');
        
        const blob = new Blob([deckText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.deckName.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Deck exported!', 'success');
    }

    clearDeck() {
        if (this.deck.length === 0) return;
        
        if (confirm('Are you sure you want to clear the deck?')) {
            this.deck = [];
            this.updateDeckDisplay();
            this.updateDeckStats();
            this.saveDeckToStorage();
            this.showToast('Deck cleared', 'info');
        }
    }

    newDeck() {
        if (this.deck.length > 0 && !confirm('Start a new deck? Current deck will be cleared.')) {
            return;
        }
        
        this.deck = [];
        this.deckName = 'Untitled Deck';
        document.getElementById('deckName').value = this.deckName;
        this.updateDeckDisplay();
        this.updateDeckStats();
        this.saveDeckToStorage();
        this.showToast('New deck created', 'info');
    }

    openDeckLibrary() {
        const modal = document.getElementById('deckLibraryModal');
        const savedDecksList = document.getElementById('savedDecksList');
        const decks = this.getSavedDecks();
        
        if (decks.length === 0) {
            savedDecksList.innerHTML = `
                <div class="empty-message">
                    <span class="empty-icon">📚</span>
                    <p>No saved decks</p>
                </div>
            `;
        } else {
            savedDecksList.innerHTML = decks.map(deck => `
                <div class="saved-deck-card">
                    <div class="saved-deck-header">
                        <h3 class="saved-deck-name">${deck.name}</h3>
                        <div class="saved-deck-actions">
                            <button class="btn-icon btn-load-deck" data-deck-id="${deck.id}" title="Load Deck">
                                📂
                            </button>
                            <button class="btn-icon btn-duplicate-deck" data-deck-id="${deck.id}" title="Duplicate">
                                📋
                            </button>
                            <button class="btn-icon btn-delete-deck" data-deck-id="${deck.id}" title="Delete">
                                🗑
                            </button>
                        </div>
                    </div>
                    <div class="saved-deck-info">
                        <span class="saved-deck-stat">${deck.totalCards} cards</span>
                        <span class="saved-deck-colors">${deck.colors.join(' ')}</span>
                        <span class="saved-deck-date">${new Date(deck.savedAt).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners
            savedDecksList.querySelectorAll('.btn-load-deck').forEach(btn => {
                btn.addEventListener('click', () => this.loadDeck(parseInt(btn.dataset.deckId)));
            });
            
            savedDecksList.querySelectorAll('.btn-duplicate-deck').forEach(btn => {
                btn.addEventListener('click', () => this.duplicateDeck(parseInt(btn.dataset.deckId)));
            });
            
            savedDecksList.querySelectorAll('.btn-delete-deck').forEach(btn => {
                btn.addEventListener('click', () => this.deleteDeck(parseInt(btn.dataset.deckId)));
            });
        }
        
        modal.classList.add('active');
    }

    closeDeckLibrary() {
        document.getElementById('deckLibraryModal').classList.remove('active');
    }

    loadDeck(deckId) {
        const decks = this.getSavedDecks();
        const deck = decks.find(d => d.id === deckId);
        
        if (!deck) return;
        
        if (this.deck.length > 0 && !confirm('Loading this deck will replace your current deck. Continue?')) {
            return;
        }
        
        this.deck = deck.cards;
        this.deckName = deck.name;
        document.getElementById('deckName').value = this.deckName;
        this.updateDeckDisplay();
        this.updateDeckStats();
        this.saveDeckToStorage();
        this.closeDeckLibrary();
        this.showToast(`Loaded deck: ${deck.name}`, 'success');
    }

    duplicateDeck(deckId) {
        const decks = this.getSavedDecks();
        const deck = decks.find(d => d.id === deckId);
        
        if (!deck) return;
        
        const newDeck = {
            ...deck,
            id: Date.now(),
            name: `${deck.name} (Copy)`,
            savedAt: new Date().toISOString()
        };
        
        decks.push(newDeck);
        localStorage.setItem('savedDecks', JSON.stringify(decks));
        this.updateDeckCountBadge();
        this.openDeckLibrary(); // Refresh
        this.showToast('Deck duplicated', 'success');
    }

    deleteDeck(deckId) {
        if (!confirm('Are you sure you want to delete this deck?')) return;
        
        let decks = this.getSavedDecks();
        decks = decks.filter(d => d.id !== deckId);
        localStorage.setItem('savedDecks', JSON.stringify(decks));
        this.updateDeckCountBadge();
        this.openDeckLibrary(); // Refresh
        this.showToast('Deck deleted', 'info');
    }

    getSavedDecks() {
        return JSON.parse(localStorage.getItem('savedDecks') || '[]');
    }

    updateDeckCountBadge() {
        const badge = document.querySelector('.deck-count-badge');
        const count = this.getSavedDecks().length;
        badge.textContent = count;
    }

    getDeckColors() {
        const colors = new Set();
        const colorSymbols = {
            'W': '☀',
            'U': '💧',
            'B': '💀',
            'R': '🔥',
            'G': '🌿'
        };
        
        this.deck.forEach(item => {
            (item.card.colors || []).forEach(color => colors.add(colorSymbols[color] || color));
        });
        
        return Array.from(colors);
    }

    async getAIRecommendations() {
        if (this.deck.length === 0) {
            this.showToast('Add some cards to your deck first', 'warning');
            return;
        }
        
        this.showToast('🤖 AI analyzing your deck...', 'info');
        
        try {
            // Get AI recommendations
            const result = await this.recommender.getRecommendations(this.deck, {
                count: 10,
                focusArea: 'balanced'
            });

            // Show deck analysis
            this.displayDeckAnalysis(result.analysis);

            // Display recommendations
            if (result.recommendations && result.recommendations.length > 0) {
                this.displayRecommendations(result.recommendations);
                this.showToast(`Found ${result.recommendations.length} recommendations!`, 'success');
            } else {
                this.showToast('No recommendations found', 'info');
            }

            // Show suggestions if any
            if (result.suggestions && result.suggestions.length > 0) {
                this.displaySuggestions(result.suggestions);
            }

            // Show weaknesses
            if (result.weaknesses && result.weaknesses.length > 0) {
                this.displayWeaknesses(result.weaknesses);
            }

        } catch (error) {
            this.showToast('Failed to get recommendations', 'error');
            console.error(error);
        }
    }

        displayDeckAnalysis(analysis) {
        const archetype = this.recommender.detectArchetype(this.deck);
        
        console.log('📊 Deck Analysis:');
        console.log(`  Archetype: ${archetype.icon} ${archetype.archetype}`);
        console.log(`  Colors: ${analysis.colors.identity.join(', ') || 'Colorless'}`);
        console.log(`  Avg CMC: ${analysis.curve.avgCMC}`);
        console.log(`  Creatures: ${analysis.types.creature}`);
        console.log(`  Spells: ${analysis.types.instant + analysis.types.sorcery}`);
        console.log(`  Lands: ${analysis.types.land}`);
        
        if (analysis.themes.length > 0) {
            console.log(`  Themes: ${analysis.themes.map(t => t.name).join(', ')}`);
        }

        // Show archetype in toast
        this.showToast(`Deck Archetype: ${archetype.icon} ${archetype.archetype}`, 'info');
    }

        displaySuggestions(suggestions) {
        console.log('\n💡 Suggestions:');
        suggestions.forEach(suggestion => {
            const icon = suggestion.priority === 'high' ? '🔴' : '🟡';
            console.log(`  ${icon} [${suggestion.category}] ${suggestion.message}`);
        });

        // Show top suggestion in toast
        if (suggestions.length > 0) {
            const topSuggestion = suggestions.find(s => s.priority === 'high') || suggestions[0];
            setTimeout(() => {
                this.showToast(`💡 ${topSuggestion.message}`, 'info');
            }, 2000);
        }
    }

        displayWeaknesses(weaknesses) {
        console.log('\n⚠️ Weaknesses:');
        weaknesses.forEach(weakness => {
            const icon = weakness.severity === 'high' ? '🔴' : '🟡';
            console.log(`  ${icon} ${weakness.message}`);
        });
    }

    displayRecommendations(cards) {
        const resultsList = document.getElementById('resultsList');
        const resultsCount = document.getElementById('resultsCount');
        
        resultsCount.textContent = `${cards.length} recommendations`;
        resultsList.innerHTML = cards.map(card => this.createCardResultElement(card)).join('');
        
        // Add event listeners
        resultsList.querySelectorAll('.result-card').forEach((cardElement, index) => {
            const card = cards[index];
            cardElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-add-card')) {
                    this.showCardPreview(card);
                }
            });
            
            cardElement.querySelector('.btn-add-card').addEventListener('click', (e) => {
                e.stopPropagation();
                this.addCardToDeck(card);
            });
        });
        
        this.showToast('Recommendations loaded!', 'success');
    }

    showCardPreview(card) {
        const modal = document.getElementById('cardPreviewModal');
        const imageUrl = card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large || '';
        
        const previewHTML = `
            <div class="card-preview">
                <img src="${imageUrl}" alt="${card.name}" class="card-preview-image">
                <div class="card-details">
                    <h2 class="card-detail-name">${card.name}</h2>
                    <div class="card-detail-cost">${this.formatManaCost(card.mana_cost || '')}</div>
                    <div class="card-detail-type">${card.type_line}</div>
                    <div class="card-detail-text">${this.formatOracleText(card.oracle_text || '')}</div>
                    ${card.power && card.toughness ? `
                        <div class="card-detail-stats">${card.power}/${card.toughness}</div>
                    ` : ''}
                    <button class="btn btn-primary" onclick="deckManager.addCardToDeck(${JSON.stringify(card).replace(/"/g, '&quot;')})">
                        <span class="btn-icon">+</span>
                        Add to Deck
                    </button>
                </div>
            </div>
        `;
        
        document.querySelector('.modal-content').innerHTML = previewHTML;
        modal.classList.add('active');
    }

    closeCardPreview() {
        document.getElementById('cardPreviewModal').classList.remove('active');
    }

    formatManaCost(manaCost) {
        if (!manaCost) return '';
        
        return manaCost
            .replace(/{W}/g, '☀')
            .replace(/{U}/g, '💧')
            .replace(/{B}/g, '💀')
            .replace(/{R}/g, '🔥')
            .replace(/{G}/g, '🌿')
            .replace(/{C}/g, '◇')
            .replace(/{(\d+)}/g, '$1')
            .replace(/{X}/g, 'X')
            .replace(/{T}/g, '⟳');
    }

    formatOracleText(text) {
        if (!text) return '';
        
        return text
            .replace(/{W}/g, '☀')
            .replace(/{U}/g, '💧')
            .replace(/{B}/g, '💀')
            .replace(/{R}/g, '🔥')
            .replace(/{G}/g, '🌿')
            .replace(/{C}/g, '◇')
            .replace(/{T}/g, '⟳')
            .replace(/\n/g, '<br>');
    }

    saveDeckToStorage() {
        const deckData = {
            name: this.deckName,
            cards: this.deck
        };
        localStorage.setItem('currentDeck', JSON.stringify(deckData));
    }

    loadDeckFromStorage() {
        const deckData = localStorage.getItem('currentDeck');
        if (deckData) {
            const parsed = JSON.parse(deckData);
            this.deckName = parsed.name;
            this.deck = parsed.cards;
            document.getElementById('deckName').value = this.deckName;
            this.updateDeckDisplay();
        }
    }

    showLoading() {
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = `
            <div class="loading-message">
                <span class="loading-icon rotating">⏳</span>
                <p>Loading cards...</p>
            </div>
        `;
    }

    showError(message) {
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = `
            <div class="empty-message">
                <span class="empty-icon">⚠</span>
                <p>${message}</p>
            </div>
        `;
    }

    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${this.getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
}

// ===================================
// INITIALIZATION
// ===================================
let deckManager;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle system
    new ParticleSystem('particles', 30);
    
    // Initialize deck manager
    deckManager = new DeckManager();
    
    // Fade in animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    console.log('🃏 Deck Builder initialized');
    console.log('🔍 Scryfall API connected');
});