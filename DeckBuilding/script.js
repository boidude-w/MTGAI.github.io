// API Configuration
const SCRYFALL_API_BASE = 'https://api.scryfall.com';
let cardDatabase = [];
let filteredCards = [];
let currentDeck = [];
let isLoading = false;
let nextPageUrl = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadInitialCards();
    loadSavedDecks();
    updateDeckDisplay();
    
    // Event listeners
    document.getElementById('cardSearch').addEventListener('input', debounce(searchCards, 500));
    document.getElementById('colorFilter').addEventListener('change', searchCards);
    document.getElementById('typeFilter').addEventListener('change', searchCards);
    document.getElementById('manaFilter').addEventListener('change', searchCards);
    
    document.getElementById('saveDeckBtn').addEventListener('click', saveDeck);
    document.getElementById('loadDeckBtn').addEventListener('click', showLoadDeckDialog);
    document.getElementById('clearDeckBtn').addEventListener('click', clearDeck);
    document.getElementById('analyzeBtn')?.addEventListener('click', analyzeDeckWithAI);
    document.getElementById('buildDeckBtn')?.addEventListener('click', showBuildDeckDialog);
    
    // Infinite scroll for card list
    const cardList = document.getElementById('cardList');
    cardList.addEventListener('scroll', handleScroll);
    
    console.log('Deck Builder loaded with Scryfall API integration');
});

// Load initial cards from Scryfall API
async function loadInitialCards() {
    try {
        showLoadingMessage();
        // Load popular creatures by default
        const response = await fetch(`${SCRYFALL_API_BASE}/cards/search?q=type:creature&order=edhrec&page=1`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            cardDatabase = processCards(data.data);
            filteredCards = [...cardDatabase];
            nextPageUrl = data.has_more ? data.next_page : null;
            displayCards(filteredCards);
            hideLoadingMessage();
        }
    } catch (error) {
        console.error('Error loading cards:', error);
        showErrorMessage('Failed to load cards. Please try again.');
    }
}

// Process Scryfall cards into our format
function processCards(scryfallCards) {
    return scryfallCards.map(card => ({
        id: card.id,
        name: card.name,
        mana: card.cmc || 0,
        cmc: card.cmc || 0,
        color: getCardColor(card.colors),
        colors: card.colors || [],
        colorIdentity: card.color_identity || [],
        type: card.type_line || 'Unknown',
        subtype: extractSubtypes(card.type_line),
        power: card.power || undefined,
        toughness: card.toughness || undefined,
        text: card.oracle_text || 'No card text available',
        imageUrl: card.image_uris ? card.image_uris.normal : (card.card_faces && card.card_faces[0].image_uris ? card.card_faces[0].image_uris.normal : null),
        artist: card.artist,
        rarity: card.rarity,
        setName: card.set_name,
        manaCost: card.mana_cost || '',
        prices: card.prices,
        layout: card.layout
    }));
}

// Extract subtypes from type line
function extractSubtypes(typeLine) {
    if (!typeLine) return '';
    const parts = typeLine.split('—');
    return parts.length > 1 ? parts[1].trim() : '';
}

// Get primary card color
function getCardColor(colors) {
    if (!colors || colors.length === 0) return 'Colorless';
    if (colors.length > 1) return 'Multicolor';
    
    const colorMap = {
        'W': 'White',
        'U': 'Blue',
        'B': 'Black',
        'R': 'Red',
        'G': 'Green'
    };
    
    return colorMap[colors[0]] || 'Colorless';
}

// Build search query from all filters
function buildSearchQuery() {
    const searchTerm = document.getElementById('cardSearch').value.trim();
    const colorFilter = document.getElementById('colorFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const manaFilter = document.getElementById('manaFilter').value;
    
    let queryParts = [];
    
    // Add name search if provided
    if (searchTerm.length >= 2) {
        queryParts.push(`name:${searchTerm}`);
    }
    
    // Add color filter
    if (colorFilter) {
        if (colorFilter === 'Colorless') {
            queryParts.push('color:C');
        } else if (colorFilter === 'Multicolor') {
            queryParts.push('color>=2');
        } else {
            const colorCode = { 'White': 'W', 'Blue': 'U', 'Black': 'B', 'Red': 'R', 'Green': 'G' }[colorFilter];
            queryParts.push(`color=${colorCode}`);
        }
    }
    
    // Add type filter
    if (typeFilter) {
        queryParts.push(`type:${typeFilter}`);
    }
    
    // Add mana filter
    if (manaFilter) {
        if (manaFilter === '6+') {
            queryParts.push('cmc>=6');
        } else {
            queryParts.push(`cmc=${manaFilter}`);
        }
    }
    
    // If no filters selected, search for all cards
    if (queryParts.length === 0) {
        return 'type:creature'; // Default to creatures
    }
    
    return queryParts.join(' ');
}

// Search cards by name using Scryfall
async function searchCards() {
    try {
        showLoadingMessage();
        
        const query = buildSearchQuery();
        
        const response = await fetch(`${SCRYFALL_API_BASE}/cards/search?q=${encodeURIComponent(query)}&order=name`);
        
        // Handle case where no results found
        if (response.status === 404) {
            cardDatabase = [];
            filteredCards = [];
            displayCards([]);
            showErrorMessage('No cards found matching your search.');
            return;
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            cardDatabase = processCards(data.data);
            filteredCards = [...cardDatabase];
            nextPageUrl = data.has_more ? data.next_page : null;
            displayCards(filteredCards);
            hideLoadingMessage();
        } else {
            cardDatabase = [];
            filteredCards = [];
            displayCards([]);
            showErrorMessage('No cards found matching your search.');
        }
    } catch (error) {
        console.error('Error searching cards:', error);
        showErrorMessage('Search failed. Please try again.');
    }
}

// Filter cards based on current filter selections (removed - now handled by searchCards)
function filterCards() {
    searchCards();
}

// Display cards in the card list
function displayCards(cards) {
    const cardList = document.getElementById('cardList');
    cardList.innerHTML = '';
    
    if (cards.length === 0) {
        cardList.innerHTML = '<p style="text-align: center; color: #bbb; grid-column: 1/-1;">No cards found</p>';
        return;
    }
    
    cards.forEach(card => {
        const cardElement = createCardElement(card);
        cardList.appendChild(cardElement);
    });
}

// Create a card element
function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card-item';
    
    const inDeck = currentDeck.find(c => c.id === card.id);
    if (inDeck) {
        div.classList.add('in-deck');
    }
    
    // Format rarity display
    const rarityColors = {
        'common': '#333',
        'uncommon': '#6c757d',
        'rare': '#ffd700',
        'mythic': '#ff8c00'
    };
    
    div.innerHTML = `
        ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}" class="card-image" loading="lazy" onerror="this.style.display='none'">` : ''}
        ${card.rarity ? `<div class="card-rarity" style="background-color: ${rarityColors[card.rarity] || '#333'}">${card.rarity.charAt(0).toUpperCase()}</div>` : ''}
        <div class="card-name">${card.name}</div>
        <div class="card-mana">${formatManaCost(card.manaCost) || `CMC: ${card.cmc}`}</div>
        <div class="card-type">${card.type}${card.subtype ? ' - ' + card.subtype : ''}</div>
        ${card.power !== undefined ? `<div class="card-power">${card.power}/${card.toughness}</div>` : ''}
        <div class="card-text">${truncateText(card.text, 100)}</div>
    `;
    
    div.addEventListener('click', () => addCardToDeck(card));
    
    return div;
}

// Format mana cost with symbols
function formatManaCost(manaCost) {
    if (!manaCost) return '';
    
    // Replace mana symbols with colored text
    return manaCost
        .replace(/\{W\}/g, '⚪')
        .replace(/\{U\}/g, '🔵')
        .replace(/\{B\}/g, '⚫')
        .replace(/\{R\}/g, '🔴')
        .replace(/\{G\}/g, '🟢')
        .replace(/\{C\}/g, '◇')
        .replace(/\{(\d+)\}/g, '$1');
}

// Truncate long text
function truncateText(text, maxLength) {
    if (!text) return 'No text available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Add card to deck
function addCardToDeck(card) {
    const existingCard = currentDeck.find(c => c.id === card.id);
    
    // Check if it's a basic land
    const isBasicLand = card.type.includes('Basic Land');
    
    if (existingCard) {
        if (isBasicLand || existingCard.count < 4) {
            existingCard.count++;
        } else {
            alert('You can only have 4 copies of a non-basic land card!');
            return;
        }
    } else {
        currentDeck.push({ ...card, count: 1 });
    }
    
    updateDeckDisplay();
    displayCards(filteredCards);
}

// Remove card from deck
function removeCardFromDeck(cardId) {
    const cardIndex = currentDeck.findIndex(c => c.id === cardId);
    
    if (cardIndex !== -1) {
        currentDeck[cardIndex].count--;
        
        if (currentDeck[cardIndex].count === 0) {
            currentDeck.splice(cardIndex, 1);
        }
    }
    
    updateDeckDisplay();
    displayCards(filteredCards);
}

// Update deck display
function updateDeckDisplay() {
    const totalCards = currentDeck.reduce((sum, card) => sum + card.count, 0);
    document.getElementById('deckCount').textContent = totalCards;
    
    // Update card count color based on deck size
    const deckCountElement = document.getElementById('deckCount');
    if (totalCards < 60) {
        deckCountElement.style.color = '#e74c3c';
    } else if (totalCards === 60) {
        deckCountElement.style.color = '#2ecc71';
    } else {
        deckCountElement.style.color = '#f39c12';
    }
    
    // Update breakdown
    let creatures = 0, spells = 0, lands = 0, other = 0;
    
    currentDeck.forEach(card => {
        if (card.type.includes('Creature')) {
            creatures += card.count;
        } else if (card.type.includes('Instant') || card.type.includes('Sorcery')) {
            spells += card.count;
        } else if (card.type.includes('Land')) {
            lands += card.count;
        } else {
            other += card.count;
        }
    });
    
    document.getElementById('creatureCount').textContent = creatures;
    document.getElementById('spellCount').textContent = spells;
    document.getElementById('landCount').textContent = lands;
    document.getElementById('otherCount').textContent = other;
    
    // Display deck cards
    const deckContainer = document.getElementById('currentDeck');
    deckContainer.innerHTML = '';
    
    // Sort deck by type and CMC
    const sortedDeck = [...currentDeck].sort((a, b) => {
        if (a.type !== b.type) {
            const typeOrder = ['Land', 'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker'];
            const aOrder = typeOrder.findIndex(t => a.type.includes(t));
            const bOrder = typeOrder.findIndex(t => b.type.includes(t));
            return aOrder - bOrder;
        }
        return a.cmc - b.cmc;
    });
    
    sortedDeck.forEach(card => {
        const deckCardElement = createDeckCardElement(card);
        deckContainer.appendChild(deckCardElement);
    });
}

// Create deck card element
function createDeckCardElement(card) {
    const div = document.createElement('div');
    div.className = 'deck-card-item';
    
    div.innerHTML = `
        <div class="deck-card-info">
            <div class="deck-card-name">${card.name}</div>
            <div class="deck-card-details">${card.type} - ${formatManaCost(card.manaCost) || `CMC: ${card.cmc}`}</div>
        </div>
        <div class="deck-card-count">
            <button class="count-btn" data-card-id="${card.id}" data-action="remove">-</button>
            <span class="card-count">${card.count}</span>
            <button class="count-btn" data-card-id="${card.id}" data-action="add">+</button>
        </div>
    `;
    
    // Add event listeners to buttons
    const removeBtn = div.querySelector('[data-action="remove"]');
    const addBtn = div.querySelector('[data-action="add"]');
    
    removeBtn.addEventListener('click', () => removeCardFromDeck(card.id));
    addBtn.addEventListener('click', () => addCardToDeck(card));
    
    return div;
}

// Save deck
function saveDeck() {
    const deckName = document.getElementById('deckName').value.trim();
    
    if (!deckName) {
        alert('Please enter a deck name!');
        return;
    }
    
    if (currentDeck.length === 0) {
        alert('Your deck is empty!');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    if (!decks[userId]) {
        decks[userId] = [];
    }
    
    const existingDeckIndex = decks[userId].findIndex(d => d.name === deckName);
    
    const totalCards = currentDeck.reduce((sum, card) => sum + card.count, 0);
    
    const deck = {
        name: deckName,
        cards: currentDeck,
        totalCards: totalCards,
        createdAt: existingDeckIndex === -1 ? new Date().toISOString() : decks[userId][existingDeckIndex].createdAt,
        updatedAt: new Date().toISOString()
    };
    
    if (existingDeckIndex !== -1) {
        decks[userId][existingDeckIndex] = deck;
        alert('Deck updated successfully!');
    } else {
        decks[userId].push(deck);
        alert('Deck saved successfully!');
        
        // Update stats
        if (currentUser && window.updateStats) {
            window.updateStats('decksCreated', (window.mtgStats?.decksCreated || 0) + 1);
        }
    }
    
    localStorage.setItem('mtgDecks', JSON.stringify(decks));
    loadSavedDecks();
}

// Load saved decks
function loadSavedDecks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    
    const savedDecksList = document.getElementById('savedDecksList');
    savedDecksList.innerHTML = '';
    
    if (userDecks.length === 0) {
        savedDecksList.innerHTML = '<p style="color: #bbb; text-align: center;">No saved decks</p>';
        return;
    }
    
    userDecks.forEach((deck) => {
        const deckElement = document.createElement('div');
        deckElement.className = 'saved-deck-item';
        
        const totalCards = deck.totalCards || deck.cards.reduce((sum, card) => sum + card.count, 0);
        
        deckElement.innerHTML = `
            <div>
                <div class="saved-deck-name">${deck.name}</div>
                <div style="font-size: 0.85rem; color: #bbb;">${totalCards} cards</div>
            </div>
            <div class="saved-deck-actions">
                <button class="action-btn" data-deck-name="${deck.name}">Load</button>
                <button class="action-btn" data-deck-name="${deck.name}" data-action="delete">Delete</button>
            </div>
        `;
        
        // Add event listeners
        const loadBtn = deckElement.querySelector('[data-action="delete"]').previousElementSibling;
        const deleteBtn = deckElement.querySelector('[data-action="delete"]');
        
        loadBtn.addEventListener('click', () => loadDeck(deck.name));
        deleteBtn.addEventListener('click', () => deleteDeck(deck.name));
        
        savedDecksList.appendChild(deckElement);
    });
}

// Load a specific deck
function loadDeck(deckName) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    
    const deck = userDecks.find(d => d.name === deckName);
    
    if (deck) {
        currentDeck = deck.cards.map(card => ({ ...card }));
        document.getElementById('deckName').value = deck.name;
        updateDeckDisplay();
        displayCards(filteredCards);
        alert(`Deck "${deckName}" loaded successfully!`);
    }
}

// Delete a deck
function deleteDeck(deckName) {
    if (!confirm(`Are you sure you want to delete "${deckName}"?`)) {
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    
    decks[userId] = userDecks.filter(d => d.name !== deckName);
    localStorage.setItem('mtgDecks', JSON.stringify(decks));
    
    loadSavedDecks();
    alert(`Deck "${deckName}" deleted successfully!`);
}

// Clear current deck
function clearDeck() {
    if (currentDeck.length === 0) {
        alert('Deck is already empty!');
        return;
    }
    
    if (confirm('Are you sure you want to clear the current deck?')) {
        currentDeck = [];
        document.getElementById('deckName').value = '';
        updateDeckDisplay();
        displayCards(filteredCards);
    }
}

// Show load deck dialog
function showLoadDeckDialog() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    
    if (userDecks.length === 0) {
        alert('You have no saved decks!');
        return;
    }
    
    const deckNames = userDecks.map(d => `${d.name} (${d.totalCards || d.cards.reduce((sum, card) => sum + card.count, 0)} cards)`).join('\n');
    const selectedDeck = prompt(`Enter the name of the deck to load:\n\n${deckNames}`);
    
    if (selectedDeck) {
        // Extract just the deck name (remove card count)
        const deckName = selectedDeck.split(' (')[0];
        loadDeck(deckName);
    }
}

// Analyze deck with AI
async function analyzeDeckWithAI() {
    if (currentDeck.length === 0) {
        alert('Your deck is empty! Add some cards first.');
        return;
    }

    // Load the recommender script if not already loaded
    if (typeof DeckRecommender === 'undefined') {
        const script = document.createElement('script');
        script.src = 'DeckRecommender.js';
        document.head.appendChild(script);
        
        await new Promise(resolve => {
            script.onload = resolve;
        });
    }

    const recommender = new DeckRecommender();
    const result = await recommender.analyzeDeck(currentDeck);
    
    // Display results in a modal or alert
    showRecommendationsModal(result);
}

function showRecommendationsModal(result) {
    const modal = document.createElement('div');
    modal.className = 'recommendation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>🤖 AI Deck Analysis</h2>
            <div class="analysis-section">
                <h3>Deck Overview</h3>
                <p><strong>Archetype:</strong> ${result.analysis.archetype}</p>
                <p><strong>Total Cards:</strong> ${result.analysis.totalCards}</p>
                <p><strong>Average CMC:</strong> ${result.analysis.avgCMC}</p>
                <p><strong>Primary Colors:</strong> ${result.analysis.primaryColors.join(', ')}</p>
            </div>
            
            ${result.warnings.length > 0 ? `
            <div class="warnings-section">
                <h3>⚠️ Warnings</h3>
                ${result.warnings.map(w => `<p>${w}</p>`).join('')}
            </div>
            ` : ''}
            
            <div class="recommendations-section">
                <h3>💡 Recommendations</h3>
                ${result.recommendations.map((rec, i) => `
                    <div class="recommendation-item">
                        <strong>${i + 1}. [${rec.category}]</strong>
                        <p>${rec.reason}</p>
                        ${rec.cardName ? `<p class="card-suggestion">→ Try: ${rec.cardName}</p>` : ''}
                        ${rec.suggestedSearch ? `<button class="search-btn" onclick="searchFromRecommendation('${rec.suggestedSearch}')">Search These Cards</button>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function searchFromRecommendation(query) {
    // Close modal
    const modal = document.querySelector('.recommendation-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    
    // Perform search
    document.getElementById('cardSearch').value = query;
    searchCards();
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoadingMessage() {
    const cardList = document.getElementById('cardList');
    cardList.innerHTML = '<p style="text-align: center; color: #f39c12; grid-column: 1/-1;">🔍 Loading cards from Scryfall...</p>';
}

function hideLoadingMessage() {
    // Message will be replaced by cards
}

function showErrorMessage(message) {
    const cardList = document.getElementById('cardList');
    cardList.innerHTML = `<p style="text-align: center; color: #e74c3c; grid-column: 1/-1;">❌ ${message}</p>`;
}

function handleScroll(e) {
    const element = e.target;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100) {
        // Load more cards if available
        if (nextPageUrl && !isLoading) {
            loadMoreCards();
        }
    }
}

async function loadMoreCards() {
    if (isLoading || !nextPageUrl) return;
    
    isLoading = true;
    
    try {
        const response = await fetch(nextPageUrl);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const newCards = processCards(data.data);
            cardDatabase = [...cardDatabase, ...newCards];
            filteredCards = [...filteredCards, ...newCards];
            
            // Append new cards to existing display
            const cardList = document.getElementById('cardList');
            newCards.forEach(card => {
                const cardElement = createCardElement(card);
                cardList.appendChild(cardElement);
            });
            
            nextPageUrl = data.has_more ? data.next_page : null;
        }
    } catch (error) {
        console.error('Error loading more cards:', error);
    } finally {
        isLoading = false;
    }
}

// Add this new function after the analyzeDeckWithAI function
async function showBuildDeckDialog() {
    const modal = document.createElement('div');
    modal.className = 'recommendation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>🤖 AI Deck Builder</h2>
            <p style="color: #bbb; margin-bottom: 20px;">Let the AI build a complete deck for you!</p>
            
            <div class="build-deck-form">
                <div class="form-group">
                    <label>Deck Archetype:</label>
                    <select id="buildArchetype" class="filter-select">
                        <option value="Aggro">Aggro (Fast & Aggressive)</option>
                        <option value="Control">Control (Counterspells & Removal)</option>
                        <option value="Midrange" selected>Midrange (Balanced)</option>
                        <option value="Combo">Combo (Win Condition Combos)</option>
                        <option value="Tribal">Tribal (Creature Type Synergy)</option>
                        <option value="Balanced">Balanced (Mixed Strategy)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Colors:</label>
                    <div class="color-picker">
                        <label><input type="checkbox" value="W" class="color-checkbox"> ⚪ White</label>
                        <label><input type="checkbox" value="U" class="color-checkbox"> 🔵 Blue</label>
                        <label><input type="checkbox" value="B" class="color-checkbox"> ⚫ Black</label>
                        <label><input type="checkbox" value="R" class="color-checkbox" checked> 🔴 Red</label>
                        <label><input type="checkbox" value="G" class="color-checkbox" checked> 🟢 Green</label>
                    </div>
                </div>
                
                <div class="form-group" id="tribalTypeGroup" style="display: none;">
                    <label>Tribal Type:</label>
                    <input type="text" id="buildTribalType" placeholder="e.g., Elf, Goblin, Zombie" class="search-input">
                </div>
                
                <div class="form-group">
                    <label>Deck Size:</label>
                    <select id="buildDeckSize" class="filter-select">
                        <option value="60" selected>60 cards (Standard)</option>
                        <option value="40">40 cards (Limited)</option>
                        <option value="100">100 cards (Commander)</option>
                    </select>
                </div>
                
                <button class="btn btn-save" id="startBuildBtn" style="width: 100%; margin-top: 20px;">
                    🚀 Build My Deck!
                </button>
                
                <div id="buildProgress" style="display: none; margin-top: 20px;">
                    <p style="color: #f39c12; text-align: center;">
                        🔨 Building your deck... This may take a moment.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show/hide tribal type input based on archetype
    const archetypeSelect = modal.querySelector('#buildArchetype');
    const tribalGroup = modal.querySelector('#tribalTypeGroup');
    
    archetypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Tribal') {
            tribalGroup.style.display = 'block';
        } else {
            tribalGroup.style.display = 'none';
        }
    });
    
    // Close modal functionality
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Build deck button
    modal.querySelector('#startBuildBtn').addEventListener('click', async () => {
        await buildDeckWithAI(modal);
    });
}

async function buildDeckWithAI(modal) {
    const archetype = modal.querySelector('#buildArchetype').value;
    const deckSize = parseInt(modal.querySelector('#buildDeckSize').value);
    const tribalType = modal.querySelector('#buildTribalType').value.trim() || null;
    
    // Get selected colors
    const colorCheckboxes = modal.querySelectorAll('.color-checkbox:checked');
    const colors = Array.from(colorCheckboxes).map(cb => cb.value);
    
    if (colors.length === 0) {
        alert('Please select at least one color!');
        return;
    }
    
    // Show progress
    modal.querySelector('#startBuildBtn').style.display = 'none';
    modal.querySelector('#buildProgress').style.display = 'block';
    
    // Load the recommender script if not already loaded
    if (typeof DeckRecommender === 'undefined') {
        const script = document.createElement('script');
        script.src = 'DeckRecommender.js';
        document.head.appendChild(script);
        
        await new Promise(resolve => {
            script.onload = resolve;
        });
    }
    
    try {
        const recommender = new DeckRecommender();
        const result = await recommender.buildDeck({
            archetype: archetype,
            colors: colors,
            deckSize: deckSize,
            tribalType: tribalType
        });
        
        if (result.deck && result.deck.length > 0) {
            // Replace current deck with AI-built deck
            currentDeck = result.deck;
            
            // Set deck name
            const colorNames = colors.map(c => {
                const names = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
                return names[c];
            }).join('/');
            document.getElementById('deckName').value = `${archetype} ${colorNames}`;
            
            // Update display
            updateDeckDisplay();
            displayCards(filteredCards);
            
            // Close modal
            document.body.removeChild(modal);
            
            // Show success message
            alert(`✅ Successfully built ${archetype} deck with ${result.totalCards} cards!`);
        } else {
            alert('❌ Failed to build deck. Please try again.');
            modal.querySelector('#startBuildBtn').style.display = 'block';
            modal.querySelector('#buildProgress').style.display = 'none';
        }
    } catch (error) {
        console.error('Error building deck:', error);
        alert('❌ An error occurred while building the deck. Please try again.');
        modal.querySelector('#startBuildBtn').style.display = 'block';
        modal.querySelector('#buildProgress').style.display = 'none';
    }
}