// MTG AI Battle - Main Game Logic

// Game State
let gameState = {
    player: {
        life: 20,
        deck: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        library: [],
        mana: 0,
        maxMana: 0,
        landsPlayedThisTurn: 0
    },
    ai: {
        life: 20,
        deck: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        library: [],
        mana: 0,
        maxMana: 0,
        landsPlayedThisTurn: 0
    },
    turn: 1,
    currentPlayer: 'player',
    phase: 'beginning',
    difficulty: 'medium',
    gameStarted: false,
    waitingForResponse: false
};

// Card Preview System Variables
let cardPreview = null;
let previewTimeout = null;

// Phase order
const PHASES = ['beginning', 'main1', 'combat', 'main2', 'end'];
const PHASE_NAMES = {
    beginning: 'Beginning Phase',
    main1: 'Main Phase',
    combat: 'Combat Phase',
    main2: 'Second Main Phase',
    end: 'End Phase'
};

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    // Initialize abilities system
    cardAbilitiesSystem = new CardAbilities();
    
    loadUserDecks();
    setupEventListeners();
    setupCardPreview();
    console.log('MTG AI Battle initialized');
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('endTurnBtn').addEventListener('click', endTurn);
    document.getElementById('passBtn').addEventListener('click', passPriority);
    document.getElementById('drawCardBtn').addEventListener('click', drawCard);
    
    // Menu buttons
    document.getElementById('menuBtn').addEventListener('click', () => {
        document.getElementById('menuModal').style.display = 'flex';
    });
    
    document.getElementById('closeMenu').addEventListener('click', closeMenu);
    document.getElementById('closeMenuBtn').addEventListener('click', closeMenu);
    document.getElementById('concessBtn').addEventListener('click', concessGame);
    document.getElementById('newGameBtn').addEventListener('click', resetToSetup);
    document.getElementById('rulesBtn').addEventListener('click', showRules);
    
    // Card modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('cardModal').style.display = 'none';
    });
}

// ...existing code...

// Add after setupEventListeners function (around line 80)
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Close modals/context menus with Escape
        if (e.key === 'Escape') {
            hideContextWheel();
            document.getElementById('cardModal').style.display = 'none';
            document.getElementById('menuModal').style.display = 'none';
            const analysisModal = document.querySelector('.card-analysis-modal');
            if (analysisModal) analysisModal.remove();
            const graveyardModal = document.querySelector('.graveyard-modal');
            if (graveyardModal) graveyardModal.remove();
            return;
        }

        // Don't process other keys if game hasn't started
        if (!gameState.gameStarted) return;

        // Handle keybinds
        switch(e.key.toLowerCase()) {
            case ' ':
            case 'spacebar':
                e.preventDefault();
                if (gameState.currentPlayer === 'player') {
                    endTurn();
                }
                break;

            case 'p':
                if (gameState.currentPlayer === 'player') {
                    passPriority();
                }
                break;

            case 'd':
                const drawBtn = document.getElementById('drawCardBtn');
                if (!drawBtn.disabled) {
                    drawCard();
                }
                break;

            case 'm':
                document.getElementById('menuModal').style.display = 'flex';
                break;

            case 'g':
                if (e.shiftKey) {
                    viewGraveyard('ai');
                } else {
                    viewGraveyard('player');
                }
                break;

            case 't':
                if (currentContextCard && currentContextPlayer === 'player') {
                    toggleCardTap(currentContextCard, 'player');
                }
                break;

            case 'a':
                if (currentContextCard && currentContextPlayer === 'player' && 
                    currentContextCard.type.includes('Creature')) {
                    attackWithCreature(currentContextCard, 'player');
                }
                break;

            case 'e':
                if (currentContextCard && currentContextPlayer === 'player') {
                    const abilities = cardAbilitiesSystem.parseCardAbilities(currentContextCard);
                    const activatedAbilities = abilities.filter(a => a.trigger === 'activated');
                    if (activatedAbilities.length > 0) {
                        showCardAbilitiesMenu(currentContextCard, 'player');
                    }
                }
                break;

            // Number keys 1-9 to play cards from hand
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                if (gameState.currentPlayer === 'player') {
                    const cardIndex = parseInt(e.key) - 1;
                    const card = gameState.player.hand[cardIndex];
                    if (card) {
                        if (card.type.includes('Land') || 
                            gameState.phase === 'main1' || 
                            gameState.phase === 'main2') {
                            playCard(card, 'player');
                            addLog(`Played ${card.name} using hotkey ${e.key}`);
                        } else {
                            addLog('Can only play non-land cards during main phase');
                        }
                    }
                }
                break;
        }
    });

    // Add visual indicators for keybinds
    addLog('💡 Keybinds: Space=End Turn | P=Pass | D=Draw | M=Menu | G=Graveyard | 1-9=Play Card');
}

// ...existing code...

// Update the initialize function to include keyboard shortcuts
function initialize() {
    loadDecks();
    setupEventListeners();
    setupCardPreview();
    setupKeyboardShortcuts(); // Add this line
    
    console.log('MTG AI Game initialized with CardAbilities system');
}

// Load user's saved decks
function loadUserDecks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    
    const deckSelection = document.getElementById('deckSelection');
    deckSelection.innerHTML = '';
    
    if (userDecks.length === 0) {
        deckSelection.innerHTML = `
            <div class="deck-option">
                <div class="deck-name">No Decks Available</div>
                <div class="deck-info">Please build a deck first</div>
            </div>
        `;
        return;
    }
    
    userDecks.forEach(deck => {
        const deckOption = document.createElement('div');
        deckOption.className = 'deck-option';
        deckOption.dataset.deckName = deck.name;
        
        const totalCards = deck.totalCards || deck.cards.reduce((sum, card) => sum + card.count, 0);
        
        deckOption.innerHTML = `
            <div class="deck-name">${deck.name}</div>
            <div class="deck-info">${totalCards} cards</div>
        `;
        
        deckOption.addEventListener('click', () => selectDeck(deckOption));
        deckSelection.appendChild(deckOption);
    });
}

// Select a deck
function selectDeck(element) {
    document.querySelectorAll('.deck-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
}

// Start the game
function startGame() {
    // Get selected deck
    const selectedDeck = document.querySelector('.deck-option.selected');
    if (!selectedDeck) {
        alert('Please select a deck!');
        return;
    }
    
    const deckName = selectedDeck.dataset.deckName;
    
    // Get difficulty
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    gameState.difficulty = difficulty;
    
    // Load player's deck
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    const playerDeck = userDecks.find(d => d.name === deckName);
    
    if (!playerDeck || !playerDeck.cards || playerDeck.cards.length === 0) {
        alert('Invalid deck selected!');
        return;
    }
    
    // Expand deck cards (convert counts to individual cards)
    gameState.player.library = expandDeck(playerDeck.cards);
    
    // Generate AI deck
    gameState.ai.library = generateAIDeck(difficulty);
    
    // Shuffle decks
    shuffleDeck(gameState.player.library);
    shuffleDeck(gameState.ai.library);
    
    // Draw opening hands
    for (let i = 0; i < 7; i++) {
        drawCardFromLibrary('player');
        drawCardFromLibrary('ai');
    }
    
    // Initialize game state
    gameState.player.life = 20;
    gameState.ai.life = 20;
    gameState.turn = 1;
    gameState.currentPlayer = 'player';
    gameState.phase = 'beginning';
    gameState.gameStarted = true;
    
    // Hide setup, show game
    document.getElementById('gameSetup').style.display = 'none';
    document.getElementById('gameBoard').style.display = 'flex';
    
    // Update UI
    updateUI();
    addLog('Game started! You go first.');
    addLog('Draw your opening hand of 7 cards.');
    
    // Start player's turn
    startPlayerTurn();
}

function startGame() {
    // Get selected deck
    const selectedDeck = document.querySelector('.deck-option.selected');
    if (!selectedDeck) {
        alert('Please select a deck!');
        return;
    }
    
    const deckName = selectedDeck.dataset.deckName;
    
    // Get difficulty
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    gameState.difficulty = difficulty;
    
    // Load player's deck
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    const playerDeck = userDecks.find(d => d.name === deckName);
    
    if (!playerDeck || !playerDeck.cards || playerDeck.cards.length === 0) {
        alert('Invalid deck selected!');
        return;
    }
    
    // Expand deck cards (convert counts to individual cards)
    gameState.player.library = expandDeck(playerDeck.cards);
    
    // Generate AI deck
    gameState.ai.library = generateAIDeck(difficulty);
    
    // Shuffle decks
    shuffleDeck(gameState.player.library);
    shuffleDeck(gameState.ai.library);
    
    // Draw opening hands
    for (let i = 0; i < 7; i++) {
        drawCardFromLibrary('player');
        drawCardFromLibrary('ai');
    }
    
    // Initialize game state
    gameState.player.life = 20;
    gameState.ai.life = 20;
    gameState.turn = 1;
    gameState.currentPlayer = 'player';
    gameState.phase = 'beginning';
    gameState.gameStarted = true;
    
    // Hide setup, show game
    document.getElementById('gameSetup').style.display = 'none';
    document.getElementById('gameBoard').style.display = 'flex';
    
    // Update UI
    updateUI();
    addLog('Game started! You go first.');
    addLog('Draw your opening hand of 7 cards.');
    
    // Offer mulligan
    offerMulligan('player');
}

function offerMulligan(player, mulliganCount = 0) {
    if (mulliganCount >= 2) {
        // Max 2 mulligans
        startFirstTurn();
        return;
    }
    
    if (player === 'player') {
        const keepHand = confirm(
            `Your starting hand:\n${gameState.player.hand.map(c => c.name).join('\n')}\n\n` +
            `Keep this hand? (Mulligan = shuffle back and draw ${7 - mulliganCount - 1} cards)`
        );
        
        if (!keepHand) {
            performMulligan('player', mulliganCount);
            offerMulligan('player', mulliganCount + 1);
        } else {
            // AI decides
            if (shouldAIMulligan(mulliganCount)) {
                performMulligan('ai', mulliganCount);
                addLog('AI took a mulligan');
            }
            startFirstTurn();
        }
    }
}

function performMulligan(player, count) {
    const hand = gameState[player].hand;
    const library = gameState[player].library;
    
    // Shuffle hand back
    library.push(...hand);
    shuffleDeck(library);
    
    // Draw new hand (7 minus mulligan count)
    hand.length = 0;
    for (let i = 0; i < (7 - count - 1); i++) {
        hand.push(library.pop());
    }
    
    addLog(`${player === 'player' ? 'You' : 'AI'} mulliganed to ${hand.length} cards`);
}

function shouldAIMulligan(count) {
    if (count >= 1) return false; // AI only mulligans once
    
    const hand = gameState.ai.hand;
    const landCount = hand.filter(c => c.type.includes('Land')).length;
    
    // Mulligan if 0-1 or 6-7 lands
    return landCount <= 1 || landCount >= 6;
}

function startFirstTurn() {
    gameState.turn = 1;
    startPlayerTurn();
}

// Expand deck (convert card counts to individual cards)
function expandDeck(cards) {
    const expanded = [];
    cards.forEach(card => {
        for (let i = 0; i < card.count; i++) {
            expanded.push({ ...card, id: `${card.id}-${i}`, instanceId: generateId() });
        }
    });
    return expanded;
}

// Generate AI deck based on difficulty
function generateAIDeck(difficulty) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUser ? currentUser.id : 'guest';
    const decks = JSON.parse(localStorage.getItem('mtgDecks')) || {};
    const userDecks = decks[userId] || [];
    
    // Try to use a random saved deck as AI deck
    if (userDecks.length > 0) {
        const randomDeck = userDecks[Math.floor(Math.random() * userDecks.length)];
        return expandDeck(randomDeck.cards);
    }
    
    // Fallback: generate a basic deck
    return generateBasicDeck();
}

// Generate a basic deck for AI
function generateBasicDeck() {
    const basicDeck = [];
    
    // Add 24 lands (Mountains and Forests)
    for (let i = 0; i < 12; i++) {
        basicDeck.push(createBasicCard('Mountain', 'Land', 0, 'Basic Land - Mountain'));
        basicDeck.push(createBasicCard('Forest', 'Land', 0, 'Basic Land - Forest'));
    }
    
    // Add 20 creatures
    for (let i = 0; i < 8; i++) {
        basicDeck.push(createBasicCard('Grizzly Bears', 'Creature - Bear', 2, '2/2', 2, 2));
    }
    for (let i = 0; i < 6; i++) {
        basicDeck.push(createBasicCard('Giant Spider', 'Creature - Spider', 4, '2/4 with Reach', 2, 4));
    }
    for (let i = 0; i < 6; i++) {
        basicDeck.push(createBasicCard('Hill Giant', 'Creature - Giant', 4, '3/3', 3, 3));
    }
    
    // Add 10 spells
    for (let i = 0; i < 4; i++) {
        basicDeck.push(createBasicCard('Lightning Bolt', 'Instant', 1, 'Deal 3 damage to any target'));
    }
    for (let i = 0; i < 3; i++) {
        basicDeck.push(createBasicCard('Giant Growth', 'Instant', 1, 'Target creature gets +3/+3 until end of turn'));
    }
    for (let i = 0; i < 3; i++) {
        basicDeck.push(createBasicCard('Shock', 'Instant', 1, 'Deal 2 damage to any target'));
    }
    
    // Add 6 more creatures to reach 60
    for (let i = 0; i < 6; i++) {
        basicDeck.push(createBasicCard('Runeclaw Bear', 'Creature - Bear', 2, '2/2', 2, 2));
    }
    
    return basicDeck;
}

// Create a basic card
function createBasicCard(name, type, cmc, text, power, toughness) {
    return {
        id: generateId(),
        instanceId: generateId(),
        name: name,
        type: type,
        cmc: cmc,
        manaCost: `{${cmc}}`,
        text: text,
        power: power,
        toughness: toughness,
        color: type.includes('Land') ? 'Colorless' : (name.includes('Bolt') || name.includes('Shock') ? 'Red' : 'Green'),
        colors: type.includes('Land') ? [] : (name.includes('Bolt') || name.includes('Shock') ? ['R'] : ['G']),
        imageUrl: null,
        tapped: false,
        counters: {},
        sickness: true
    };
}

// Generate unique ID
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Shuffle deck
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Draw card from library
function drawCardFromLibrary(player) {
    const playerState = gameState[player];
    
    if (playerState.library.length === 0) {
        addLog(`${player === 'player' ? 'You' : 'AI'} tried to draw from an empty library!`);
        if (player === 'player') {
            endGame('lose', 'You ran out of cards!');
        } else {
            endGame('win', 'AI ran out of cards!');
        }
        return null;
    }
    
    const card = playerState.library.shift();
    playerState.hand.push(card);
    
    if (player === 'player') {
        addLog(`You drew: ${card.name}`);
    } else {
        addLog('AI drew a card');
    }
    
    return card;
}

// Player draws a card (button action)
function drawCard() {
    if (gameState.phase !== 'beginning' || gameState.player.landsPlayedThisTurn > 0) {
        alert('You can only draw during the beginning phase!');
        return;
    }
    
    drawCardFromLibrary('player');
    updateUI();
}

// Start player turn
function startPlayerTurn() {
    gameState.currentPlayer = 'player';
    gameState.phase = 'beginning';
    gameState.player.landsPlayedThisTurn = 0;
    
    // Untap all permanents
    gameState.player.battlefield.forEach(card => {
        card.tapped = false;
        card.sickness = false;
    });
    
// Calculate available mana from untapped lands
gameState.player.mana = calculateAvailableMana('player');

// Draw card (skip first turn for player going first)
if (gameState.turn > 1) {
    drawCardFromLibrary('player');
    }
    
    addLog(`--- Turn ${gameState.turn}: Your Turn ---`);
    updateTurnIndicator();
    updateUI();
    
    // Enable draw button for beginning phase
    document.getElementById('drawCardBtn').disabled = false;
}

// End player turn
function endTurn() {
    addLog('You ended your turn.');
    
    // Reset mana
    gameState.player.mana = 0;
    
    // Disable draw button
    document.getElementById('drawCardBtn').disabled = true;
    
    // Start AI turn
    setTimeout(() => {
        startAITurn();
    }, 500);
}

// Start AI turn
function startAITurn() {
    gameState.currentPlayer = 'ai';
    gameState.phase = 'beginning';
    gameState.ai.landsPlayedThisTurn = 0;
    gameState.turn++;
    
    // Untap all permanents
    gameState.ai.battlefield.forEach(card => {
        card.tapped = false;
        card.sickness = false;
    });
    
    // Calculate available mana from untapped lands
    gameState.ai.mana = calculateAvailableMana('ai');
    
    // Draw card
    drawCardFromLibrary('ai');
    
    addLog(`--- Turn ${gameState.turn}: AI Turn ---`);
    updateTurnIndicator();
    updateUI();
    
    // AI takes actions
    setTimeout(() => {
        playAITurn();
    }, 1000);
}

// Play AI turn (uses AI.js)
async function playAITurn() {
    if (typeof AIPlayer === 'undefined') {
        console.error('AI player not loaded');
        endAITurn();
        return;
    }
    
    const ai = new AIPlayer(gameState.difficulty);
    await ai.takeTurn(gameState);
    
    endAITurn();
}

// End AI turn
function endAITurn() {
    addLog('AI ended their turn.');
    
    // Reset AI mana
    gameState.ai.mana = 0;
    
    // Start player turn
    setTimeout(() => {
        startPlayerTurn();
    }, 500);
}

// Pass priority
function passPriority() {
    addLog('You passed priority.');
    // In a full implementation, this would handle the stack and priority system
    // For now, it just moves to the next phase
    nextPhase();
}

// Move to next phase
function nextPhase() {
    const currentPhaseIndex = PHASES.indexOf(gameState.phase);
    
    if (currentPhaseIndex < PHASES.length - 1) {
        gameState.phase = PHASES[currentPhaseIndex + 1];
        addLog(`Moved to ${PHASE_NAMES[gameState.phase]}`);
        updateTurnIndicator();
    } else {
        endTurn();
    }
}


function calculateAvailableMana(player) {
    const manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    
    gameState[player].battlefield.forEach(card => {
        if (card.type.includes('Land') && !card.tapped) {
            // Dual lands
            if (card.text && card.text.includes('Tap: Add')) {
                const matches = card.text.match(/\{([WUBRGC])\}/g);
                if (matches) {
                    matches.forEach(m => {
                        const color = m.charAt(1);
                        manaPool[color]++;
                    });
                }
            }
            // Basic lands
            else if (card.name.includes('Plains')) manaPool.W++;
            else if (card.name.includes('Island')) manaPool.U++;
            else if (card.name.includes('Swamp')) manaPool.B++;
            else if (card.name.includes('Mountain')) manaPool.R++;
            else if (card.name.includes('Forest')) manaPool.G++;
            else manaPool.C++;
        }
        
        // Mana from creatures (like mana dorks)
        if (card.type.includes('Creature') && !card.tapped && 
            card.text && card.text.includes('Tap: Add')) {
            manaPool.G++; // Simplified
        }
    });
    
    return manaPool;
}

function canPayManaCost(manaPool, manaCost) {
    if (!manaCost) return true;
    
    const cost = parseManaCost(manaCost);
    let availableGeneric = 0;
    
    // Check colored mana requirements
    for (const [color, amount] of Object.entries(cost)) {
        if (color === 'generic') continue;
        
        if ((manaPool[color] || 0) < amount) {
            return false;
        }
    }
    
    // Calculate available generic mana
    for (const [color, amount] of Object.entries(manaPool)) {
        if (!cost[color]) {
            availableGeneric += amount;
        } else {
            availableGeneric += amount - cost[color];
        }
    }
    
    return availableGeneric >= (cost.generic || 0);
}

function parseManaCost(manaCost) {
    const cost = { generic: 0 };
    
    if (!manaCost) return cost;
    
    const matches = manaCost.match(/\{([^}]+)\}/g) || [];
    
    matches.forEach(match => {
        const symbol = match.replace(/[{}]/g, '');
        
        if (/^\d+$/.test(symbol)) {
            cost.generic += parseInt(symbol);
        } else {
            cost[symbol] = (cost[symbol] || 0) + 1;
        }
    });
    
    return cost;
}

// NEW: Auto-tap lands to pay for a card
function autoTapLands(player, manaCost) {
    const playerState = gameState[player];
    const untappedLands = playerState.battlefield.filter(card => 
        card.type.includes('Land') && !card.tapped
    );
    
    if (untappedLands.length < manaCost) {
        return false; // Not enough lands
    }
    
    // Tap the required number of lands
    for (let i = 0; i < manaCost && i < untappedLands.length; i++) {
        untappedLands[i].tapped = true;
        addLog(`${player === 'player' ? 'You' : 'AI'} tapped ${untappedLands[i].name} for mana`);
    }
    
    // Recalculate available mana
    playerState.mana = calculateAvailableMana(player);
    
    return true;
}

// Play a card from hand
function playCard(card, player) {
    const playerState = gameState[player];
    
    // Check if player can afford the card
    const availableMana = calculateAvailableMana(player);
    if (card.cmc > availableMana) {
        if (player === 'player') {
            alert('Not enough mana to play this card!');
        }
        return false;
    }
    
    // Remove from hand
    const handIndex = playerState.hand.findIndex(c => c.instanceId === card.instanceId);
    if (handIndex === -1) return false;
    
    playerState.hand.splice(handIndex, 1);
    
    // Handle different card types
    if (card.type.includes('Land')) {
        // Play land (doesn't cost mana)
        if (playerState.landsPlayedThisTurn >= 1) {
            if (player === 'player') {
                alert('You can only play one land per turn!');
            }
            playerState.hand.push(card); // Return to hand
            return false;
        }
        
        playerState.battlefield.push(card);
        playerState.landsPlayedThisTurn++;
        playerState.maxMana++;
        playerState.mana = calculateAvailableMana(player); // Recalculate
        
        addLog(`${player === 'player' ? 'You' : 'AI'} played ${card.name}`);
        
    } else {
        // Auto-tap lands to pay for the spell
        if (!autoTapLands(player, card.cmc)) {
            if (player === 'player') {
                alert('Failed to tap lands for mana!');
            }
            playerState.hand.push(card); // Return to hand
            return false;
        }
        
        if (card.type.includes('Creature')) {
            // Play creature
            card.sickness = true;
            card.tapped = false;
            playerState.battlefield.push(card);
            
            // Apply static abilities
            if (cardAbilitiesSystem) {
                const abilityMessages = cardAbilitiesSystem.applyStaticAbilities(card, gameState);
                abilityMessages.forEach(msg => addLog(msg));
                
                // Trigger ETB effects
                const etbMessages = cardAbilitiesSystem.triggerETBEffect(card, player, gameState);
                etbMessages.forEach(msg => addLog(msg));
            }
            
            addLog(`${player === 'player' ? 'You' : 'AI'} cast ${card.name}`);
            
        } else if (card.type.includes('Instant') || card.type.includes('Sorcery')) {
            // Cast instant/sorcery
            resolveSpell(card, player);
            playerState.graveyard.push(card);
            
            addLog(`${player === 'player' ? 'You' : 'AI'} cast ${card.name}`);
            
        } else {
            // Other permanents
            playerState.battlefield.push(card);
            addLog(`${player === 'player' ? 'You' : 'AI'} played ${card.name}`);
        }
    }
    
    updateUI();
    return true;
}

// Update attackWithCreature to use abilities
function attackWithCreature(card, player) {
    if (!cardAbilitiesSystem) {
        // Fallback to original behavior
        if (card.tapped) {
            alert('This creature is already tapped!');
            return false;
        }
        
        if (card.sickness) {
            alert('This creature has summoning sickness!');
            return false;
        }
        
        if (gameState.phase !== 'combat') {
            alert('You can only attack during combat phase!');
            return false;
        }
        
        const opponent = player === 'player' ? 'ai' : 'player';
        const damage = card.power || 0;
        
        card.tapped = true;
        gameState[opponent].life -= damage;
        
        addLog(`${player === 'player' ? 'You' : 'AI'} attacked with ${card.name} for ${damage} damage!`);
        
        updateUI();
        checkGameOver();
        return true;
    }

    // Check if can attack using abilities system
    const attackCheck = cardAbilitiesSystem.canAttack(card, player, gameState);
    if (!attackCheck.canAttack) {
        if (player === 'player') {
            alert(`Cannot attack: ${attackCheck.reason}`);
        }
        return false;
    }
    
    if (gameState.phase !== 'combat') {
        if (player === 'player') {
            alert('You can only attack during combat phase!');
        }
        return false;
    }
    
    const opponent = player === 'player' ? 'ai' : 'player';
    
    // Check for vigilance
    const abilities = cardAbilitiesSystem.getCardAbilities(card);
    const hasVigilance = abilities.some(a => a.name === 'Vigilance');
    
    if (!hasVigilance) {
        card.tapped = true;
    }
    
    // Trigger attack abilities
    const attackMessages = cardAbilitiesSystem.triggerAttackAbilities(card, player, gameState);
    attackMessages.forEach(msg => addLog(msg));
    
    // Resolve combat damage (no blocker for simplified version)
    const damageMessages = cardAbilitiesSystem.resolveCombatDamage(card, null, player, gameState);
    damageMessages.forEach(msg => addLog(msg));
    
    addLog(`${player === 'player' ? 'You' : 'AI'} attacked with ${card.name}`);
    
    updateUI();
    checkGameOver();
    return true;
}

// Resolve spell effects
function resolveSpell(card, player) {
    const opponent = player === 'player' ? 'ai' : 'player';
    
    // Basic spell effects
    if (card.name.includes('Lightning Bolt')) {
        gameState[opponent].life -= 3;
        addLog(`${card.name} deals 3 damage to ${opponent === 'player' ? 'you' : 'AI'}!`);
    } else if (card.name.includes('Shock')) {
        gameState[opponent].life -= 2;
        addLog(`${card.name} deals 2 damage to ${opponent === 'player' ? 'you' : 'AI'}!`);
    } else if (card.name.includes('Giant Growth')) {
        addLog(`${card.name} buffs a creature!`);
        // In full implementation, would target a creature
    }
    
    // Check for game over
    checkGameOver();
}

// Tap card for mana
function tapForMana(card, player) {
    if (card.tapped) {
        if (player === 'player') {
            alert('This card is already tapped!');
        }
        return false;
    }
    
    if (!card.type.includes('Land')) {
        if (player === 'player') {
            alert('Only lands can be tapped for mana!');
        }
        return false;
    }
    
    card.tapped = true;
    gameState[player].mana = calculateAvailableMana(player);
    
    addLog(`${player === 'player' ? 'You' : 'AI'} tapped ${card.name} for mana`);
    updateUI();
    return true;
}

// Add function to show and use card abilities
function showCardAbilitiesMenu(card, player) {
    if (!cardAbilitiesSystem) return;
    
    const abilities = cardAbilitiesSystem.getCardAbilities(card);
    const activatedAbilities = abilities.filter(a => a.trigger === 'activated');
    
    if (activatedAbilities.length === 0) {
        alert('This card has no activated abilities');
        return;
    }
    
    // Create abilities menu
    let menu = `${card.name} - Activated Abilities:\n\n`;
    activatedAbilities.forEach((ability, index) => {
        const cost = ability.effect.cost || 0;
        menu += `${index + 1}. ${ability.name} (Cost: ${cost} mana)\n`;
        menu += `   ${ability.effect.text}\n\n`;
    });
}

// Resolve spell effects
function resolveSpell(card, player) {
    const opponent = player === 'player' ? 'ai' : 'player';
    
    // Basic spell effects
    if (card.name.includes('Lightning Bolt')) {
        gameState[opponent].life -= 3;
        addLog(`${card.name} deals 3 damage to ${opponent === 'player' ? 'you' : 'AI'}!`);
    } else if (card.name.includes('Shock')) {
        gameState[opponent].life -= 2;
        addLog(`${card.name} deals 2 damage to ${opponent === 'player' ? 'you' : 'AI'}!`);
    } else if (card.name.includes('Giant Growth')) {
        addLog(`${card.name} buffs a creature!`);
        // In full implementation, would target a creature
    }
    
    // Check for game over
    checkGameOver();
}

// Check if game is over
function checkGameOver() {
    if (gameState.player.life <= 0) {
        endGame('lose', 'Your life reached 0!');
    } else if (gameState.ai.life <= 0) {
        endGame('win', 'AI life reached 0!');
    }
}

// End game
function endGame(result, reason) {
    gameState.gameStarted = false;
    
    const message = result === 'win' 
        ? `🎉 Victory! ${reason}`
        : `💀 Defeat! ${reason}`;
    
    addLog(`=== GAME OVER ===`);
    addLog(message);
    
    // Update stats
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && window.updateStats) {
        window.updateStats('gamesPlayed', (window.mtgStats?.gamesPlayed || 0) + 1);
        
        if (result === 'win') {
            window.updateStats('wins', (window.mtgStats?.wins || 0) + 1);
        } else {
            window.updateStats('losses', (window.mtgStats?.losses || 0) + 1);
        }
    }
    
    setTimeout(() => {
        alert(message);
        
        if (confirm('Play again?')) {
            resetToSetup();
        }
    }, 500);
}

// ...existing code...

// Update UI
function updateUI() {
    // Update life totals
    document.getElementById('playerLife').textContent = gameState.player.life;
    document.getElementById('aiLife').textContent = gameState.ai.life;
    
    // Update mana
    document.getElementById('playerMana').textContent = gameState.player.mana;
    document.getElementById('aiMana').textContent = gameState.ai.mana;
    
    // Update deck counts
    document.getElementById('playerDeckCount').textContent = gameState.player.library.length;
    document.getElementById('aiDeckCount').textContent = gameState.ai.library.length;
    
    // Update hand - FIX: Clear and render cards properly
    const playerHandElement = document.getElementById('playerHand');
    if (playerHandElement) {
        playerHandElement.innerHTML = '';
        gameState.player.hand.forEach(card => {
            const cardElement = createHandCardElement(card);
            playerHandElement.appendChild(cardElement);
        });
    }
    
    // Update AI hand count (don't show actual cards)
    const aiHandElement = document.getElementById('aiHand');
    if (aiHandElement) {
        aiHandElement.textContent = `AI Hand: ${gameState.ai.hand.length} cards`;
    }
    
    // Update battlefields
    displayBattlefield('player');
    displayBattlefield('ai');
    
    // Update graveyards
    document.getElementById('playerGraveyardCount').textContent = gameState.player.graveyard.length;
    document.getElementById('aiGraveyardCount').textContent = gameState.ai.graveyard.length;
}

// ...existing code...

// Display player's hand
function displayHand() {
    const handContainer = document.getElementById('playerHand');
    handContainer.innerHTML = '';
    
    gameState.player.hand.forEach(card => {
        const cardElement = createHandCardElement(card);
        handContainer.appendChild(cardElement);
    });
}

// Setup card preview system
function setupCardPreview() {
    cardPreview = document.getElementById('cardPreview');
    
    // Hide preview when mouse leaves the game board
    document.addEventListener('mousemove', (e) => {
        if (cardPreview.classList.contains('active')) {
            updatePreviewPosition(e);
        }
    });
}

// Show card preview on hover
function showCardPreview(card, event) {
    clearTimeout(previewTimeout);
    
    previewTimeout = setTimeout(() => {
        const preview = document.getElementById('cardPreview');
        
        preview.innerHTML = `
            ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}">` : ''}
            <div class="preview-info">
                <h3>${card.name}</h3>
                <p class="preview-type">${card.type}</p>
                <p class="preview-cost">${formatManaCost(card.manaCost || `{${card.cmc}}`)}</p>
                ${card.power !== undefined ? `
                    <p class="preview-stats">${card.power}/${card.toughness}</p>
                ` : ''}
                <p class="preview-text">${card.text || 'No text'}</p>
                ${card.tapped ? '<p class="preview-status">⟲ TAPPED</p>' : ''}
                ${card.sickness ? '<p class="preview-status">😴 SUMMONING SICKNESS</p>' : ''}
            </div>
        `;
        
        preview.classList.add('active');
        updatePreviewPosition(event);
    }, 300); // 300ms delay before showing
}

// Hide card preview
function hideCardPreview() {
    clearTimeout(previewTimeout);
    cardPreview.classList.remove('active');
}

// Update preview position based on mouse
function updatePreviewPosition(event) {
    const preview = cardPreview;
    const padding = 20;
    const previewWidth = 400;
    const previewHeight = preview.offsetHeight;
    
    let left = event.clientX + padding;
    let top = event.clientY - (previewHeight / 2);
    
    // Keep preview on screen
    if (left + previewWidth > window.innerWidth) {
        left = event.clientX - previewWidth - padding;
    }
    
    if (top < padding) {
        top = padding;
    }
    
    if (top + previewHeight > window.innerHeight - padding) {
        top = window.innerHeight - previewHeight - padding;
    }
    
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
}

// Create and show context wheel
function showContextWheel(card, player, event) {
    // Remove existing wheel
    hideContextWheel();
    
    const wheel = document.createElement('div');
    wheel.className = 'context-wheel active';
    wheel.style.left = `${event.clientX}px`;
    wheel.style.top = `${event.clientY}px`;
    
    // Store current context
    currentContextCard = card;
    currentContextPlayer = player;
    currentContextWheel = wheel;
    
    // Center icon (card icon)
    const center = document.createElement('div');
    center.className = 'context-wheel-center';
    center.textContent = '🎴';
    wheel.appendChild(center);
    
    // Create options array
    const options = [
        {
            icon: '🔍',
            label: 'Analyze',
            action: () => analyzeCard(card)
        }
    ];
    
    // Add ability option if card has abilities
    if (cardAbilitiesSystem) {
        const abilities = cardAbilitiesSystem.getCardAbilities(card);
        const activatedAbilities = abilities.filter(a => a.trigger === 'activated');
        
        if (activatedAbilities.length > 0) {
            options.push({
                icon: '⚡',
                label: 'Use Ability',
                action: () => showCardAbilitiesMenu(card, player)
            });
        }
    }
    
    // Add tap/untap option for lands and creatures
    if (card.type.includes('Land') || card.type.includes('Creature')) {
        options.push({
            icon: card.tapped ? '🔄' : '💤',
            label: card.tapped ? 'Untap' : 'Tap',
            action: () => toggleCardTap(card, player)
        });
    }
    
    // Add attack option for creatures in combat phase
    if (card.type.includes('Creature') && gameState.phase === 'combat' && 
        gameState.currentPlayer === player && !card.tapped && !card.sickness) {
        options.push({
            icon: '⚔️',
            label: 'Attack',
            action: () => attackWithCreature(card, player)
        });
    }
    
    // Calculate positions for options (circular layout)
    const radius = 100;
    const angleStep = (2 * Math.PI) / options.length;
    
    options.forEach((option, index) => {
        const angle = angleStep * index - Math.PI / 2; // Start from top
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        const optionEl = document.createElement('div');
        optionEl.className = 'context-wheel-option';
        optionEl.style.left = `${x}px`;
        optionEl.style.top = `${y}px`;
        optionEl.style.animationDelay = `${index * 0.05}s`;
        
        optionEl.innerHTML = `
            <div class="icon">${option.icon}</div>
            <div class="label">${option.label}</div>
        `;
        
        optionEl.addEventListener('click', (e) => {
            e.stopPropagation();
            hideContextWheel();
            option.action();
        });
        
        wheel.appendChild(optionEl);
    });
    
    document.body.appendChild(wheel);
    
    // Close wheel on click outside
    setTimeout(() => {
        document.addEventListener('click', hideContextWheel, { once: true });
    }, 100);
}

// Hide context wheel
function hideContextWheel() {
    if (currentContextWheel) {
        document.body.removeChild(currentContextWheel);
        currentContextWheel = null;
        currentContextCard = null;
        currentContextPlayer = null;
        document.removeEventListener('click', hideContextWheel);
    }
}

// Toggle card tap state
function toggleCardTap(card, player) {
    if (gameState.currentPlayer !== player) {
        alert("It's not your turn!");
        return;
    }
    
    if (card.type.includes('Land') && !card.tapped) {
        tapForMana(card, player);
    } else {
        card.tapped = !card.tapped;
        if (card.type.includes('Land')) {
            gameState[player].mana = calculateAvailableMana(player);
        }
        updateUI();
        addLog(`${player === 'player' ? 'You' : 'AI'} ${card.tapped ? 'tapped' : 'untapped'} ${card.name}`);
    }
}

// Analyze card (show detailed analysis)
function analyzeCard(card) {
    const modal = document.createElement('div');
    modal.className = 'card-analysis-modal active';
    
    // Analyze card abilities
    let abilitiesHTML = '<p style="color: #bbb;">No special abilities</p>';
    if (cardAbilitiesSystem) {
        const abilities = cardAbilitiesSystem.getCardAbilities(card);
        if (abilities.length > 0) {
            abilitiesHTML = '<ul class="ability-list">';
            abilities.forEach(ability => {
                let abilityDesc = ability.name;
                if (ability.effect && ability.effect.text) {
                    abilityDesc += `: ${ability.effect.text}`;
                }
                abilitiesHTML += `<li class="ability-item"><strong>${ability.name}</strong><br>${abilityDesc}</li>`;
            });
            abilitiesHTML += '</ul>';
        }
    }
    
    // Determine card strengths
    let strengths = [];
    let weaknesses = [];
    
    if (card.type.includes('Creature')) {
        if ((card.power || 0) > 3) strengths.push('High power');
        if ((card.toughness || 0) > 3) strengths.push('High toughness');
        if ((card.power || 0) < 2) weaknesses.push('Low power');
        if (card.cmc > 5) weaknesses.push('Expensive to cast');
        if (card.cmc <= 2) strengths.push('Low mana cost');
    }
    
    if (card.text) {
        const text = card.text.toLowerCase();
        if (text.includes('flying')) strengths.push('Evasion (Flying)');
        if (text.includes('trample')) strengths.push('Can deal excess damage');
        if (text.includes('draw')) strengths.push('Card advantage');
        if (text.includes('destroy')) strengths.push('Removal capability');
    }
    
    modal.innerHTML = `
        <div class="analysis-content">
            <span class="close-analysis">&times;</span>
            
            <div class="analysis-header">
                ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}">` : ''}
                <div class="analysis-title">
                    <h2>🔍 ${card.name}</h2>
                    <div class="card-type">${card.type}</div>
                </div>
            </div>
            
            ${card.power !== undefined ? `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Power</span>
                    <span class="stat-value">${card.power}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Toughness</span>
                    <span class="stat-value">${card.toughness}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mana Cost</span>
                    <span class="stat-value">${card.cmc}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Color</span>
                    <span class="stat-value">${card.color || 'Colorless'}</span>
                </div>
            </div>
            ` : `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Mana Cost</span>
                    <span class="stat-value">${card.cmc}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Color</span>
                    <span class="stat-value">${card.color || 'Colorless'}</span>
                </div>
            </div>
            `}
            
            <div class="analysis-section">
                <h3>📝 Card Text</h3>
                <p>${card.text || 'No card text available'}</p>
            </div>
            
            <div class="analysis-section">
                <h3>⚡ Abilities</h3>
                ${abilitiesHTML}
            </div>
            
            ${strengths.length > 0 ? `
            <div class="analysis-section">
                <h3>💪 Strengths</h3>
                ${strengths.map(s => `<p>• ${s}</p>`).join('')}
            </div>
            ` : ''}
            
            ${weaknesses.length > 0 ? `
            <div class="analysis-section">
                <h3>⚠️ Considerations</h3>
                ${weaknesses.map(w => `<p>• ${w}</p>`).join('')}
            </div>
            ` : ''}
            
            <div class="analysis-section">
                <h3>💡 Strategic Tips</h3>
                ${generateStrategicTips(card)}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal on click outside or close button
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    modal.querySelector('.close-analysis').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// Generate strategic tips for card
function generateStrategicTips(card) {
    const tips = [];
    
    if (card.type.includes('Creature')) {
        if (card.text && card.text.toLowerCase().includes('flying')) {
            tips.push('Can only be blocked by creatures with flying or reach');
        }
        if (card.text && card.text.toLowerCase().includes('haste')) {
            tips.push('Can attack immediately without summoning sickness');
        }
        if (card.cmc <= 2) {
            tips.push('Best played early in the game for aggressive strategies');
        }
        if (card.cmc >= 6) {
            tips.push('Consider ramping mana or saving for late game');
        }
    }
    
    if (card.type.includes('Instant')) {
        tips.push('Can be cast during opponent\'s turn for surprise plays');
    }
    
    if (card.type.includes('Sorcery')) {
        tips.push('Can only be cast during your main phase');
    }
    
    if (card.type.includes('Land')) {
        tips.push('Play one land per turn to increase available mana');
    }
    
    if (tips.length === 0) {
        tips.push('Use this card strategically based on the game situation');
    }
    
    return tips.map(tip => `<p>• ${tip}</p>`).join('');
}

// Create hand card element (UPDATED)
function createHandCardElement(card) {
    const div = document.createElement('div');
    div.className = 'hand-card';
    
    // Check if card is playable (use available mana, not total mana)
    const availableMana = calculateAvailableMana('player');
    const canPlay = card.cmc <= availableMana;
    if (canPlay && gameState.currentPlayer === 'player') {
        div.classList.add('playable');
    }
    
    div.innerHTML = `
        ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}">` : `
            <div style="padding: 10px; height: 100%; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; justify-content: center;">
                <div style="font-weight: bold; margin-bottom: 5px;">${card.name}</div>
                <div style="font-size: 0.8rem; color: #bbb;">${card.type}</div>
                ${card.power !== undefined ? `<div style="margin-top: 5px; color: #e74c3c;">${card.power}/${card.toughness}</div>` : ''}
            </div>
        `}
        <div class="card-cost">${card.cmc}</div>
    `;
    
    // Hover to show preview
    div.addEventListener('mouseenter', (e) => {
        showCardPreview(card, e);
    });
    
    div.addEventListener('mouseleave', () => {
        hideCardPreview();
    });
    
    // Left-click to play card
    div.addEventListener('click', (e) => {
        e.stopPropagation();
        hideCardPreview();
        if (gameState.currentPlayer === 'player') {
            if (card.type.includes('Land') || (gameState.phase === 'main1' || gameState.phase === 'main2')) {
                playCard(card, 'player');
            } else {
                alert('You can only play this during your main phase!');
            }
        }
    });
    
    // Right-click for context wheel
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideCardPreview();
        showContextWheel(card, 'player', e);
    });
    
    return div;
}

// Display battlefield
function displayBattlefield(player) {
    const battlefield = document.getElementById(`${player}Battlefield`);
    const label = battlefield.querySelector('.battlefield-label');
    battlefield.innerHTML = '';
    battlefield.appendChild(label);
    
    gameState[player].battlefield.forEach(card => {
        const cardElement = createBattlefieldCardElement(card, player);
        battlefield.appendChild(cardElement);
    });
}

// Create battlefield card element
function createBattlefieldCardElement(card, player) {
    const div = document.createElement('div');
    div.className = 'battlefield-card';
    
    if (card.tapped) {
        div.classList.add('tapped');
    }
    
    div.innerHTML = `
        ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}">` : `
            <div style="padding: 5px; height: 100%; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; justify-content: center; text-align: center;">
                <div style="font-weight: bold; font-size: 0.8rem; margin-bottom: 3px;">${card.name}</div>
                <div style="font-size: 0.65rem; color: #bbb;">${card.type.split(' - ')[0]}</div>
                ${card.power !== undefined ? `<div style="margin-top: 3px; color: #e74c3c; font-weight: bold;">${card.power}/${card.toughness}</div>` : ''}
            </div>
        `}
        ${card.power !== undefined ? `<div class="card-counter">${card.power}/${card.toughness}</div>` : ''}
    `;
    
    // Hover to show preview
    div.addEventListener('mouseenter', (e) => {
        showCardPreview(card, e);
    });
    
    div.addEventListener('mouseleave', () => {
        hideCardPreview();
    });
    
    if (player === 'player') {
        // Left-click for basic actions
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            hideCardPreview();
            if (card.type.includes('Land') && !card.tapped) {
                tapForMana(card, 'player');
            } else if (card.type.includes('Creature') && gameState.phase === 'combat') {
                attackWithCreature(card, 'player');
            }
        });
        
        // Right-click for context wheel
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideCardPreview();
            showContextWheel(card, 'player', e);
        });
    }
    
    return div;
}

// Show card detail modal
function showCardDetail(card) {
    document.getElementById('modalCardName').textContent = card.name;
    document.getElementById('modalCardType').textContent = card.type;
    document.getElementById('modalCardCost').textContent = `Mana Cost: ${card.cmc}`;
    document.getElementById('modalCardText').textContent = card.text || 'No card text available';
    
    if (card.power !== undefined) {
        document.getElementById('modalCardPower').textContent = `Power/Toughness: ${card.power}/${card.toughness}`;
    } else {
        document.getElementById('modalCardPower').textContent = '';
    }
    
    if (card.imageUrl) {
        document.getElementById('modalCardImage').src = card.imageUrl;
        document.getElementById('modalCardImage').style.display = 'block';
    } else {
        document.getElementById('modalCardImage').style.display = 'none';
    }
    
    document.getElementById('cardModal').style.display = 'flex';
}

// Update turn indicator
function updateTurnIndicator() {
    document.getElementById('currentPhase').textContent = PHASE_NAMES[gameState.phase];
    document.getElementById('currentTurn').textContent = gameState.currentPlayer === 'player' ? 'Your Turn' : 'AI Turn';
}

// Add log entry
function addLog(message) {
    const log = document.getElementById('gameLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Menu functions
function closeMenu() {
    document.getElementById('menuModal').style.display = 'none';
}

function concessGame() {
    if (confirm('Are you sure you want to concede?')) {
        endGame('lose', 'You conceded the game');
        closeMenu();
    }
}

function resetToSetup() {
    gameState.gameStarted = false;
    document.getElementById('gameBoard').style.display = 'none';
    document.getElementById('gameSetup').style.display = 'flex';
    closeMenu();
    
    // Reset game state
    gameState = {
        player: {
            life: 20,
            deck: [],
            hand: [],
            battlefield: [],
            graveyard: [],
            library: [],
            mana: 0,
            maxMana: 0,
            landsPlayedThisTurn: 0
        },
        ai: {
            life: 20,
            deck: [],
            hand: [],
            battlefield: [],
            graveyard: [],
            library: [],
            mana: 0,
            maxMana: 0,
            landsPlayedThisTurn: 0
        },
        turn: 1,
        currentPlayer: 'player',
        phase: 'beginning',
        difficulty: 'medium',
        gameStarted: false,
        waitingForResponse: false
    };
}

function showRules() {
    alert(`
MTG AI - Game Rules

TURN STRUCTURE:
1. Beginning Phase - Draw a card
2. Main Phase 1 - Play lands and spells
3. Combat Phase - Attack with creatures
4. Main Phase 2 - Play more spells
5. End Phase - Pass turn

KEYBOARD SHORTCUTS:
• Space - End Turn
• P - Pass Priority
• D - Draw Card
• M - Open Menu
• G - View Your Graveyard
• Shift+G - View Opponent's Graveyard
• 1-9 - Play card from hand (by position)
• T - Tap/Untap selected card
• A - Attack with selected creature
• E - Use card ability
• Escape - Close modals

BASIC RULES:
• Play one land per turn
• Tap lands for mana to cast spells
• Creatures have summoning sickness (can't attack first turn)
• Deal combat damage to reduce opponent's life to 0

Right-click creatures for more options!
    `);
    closeMenu();
}

// After combat attackers are declared
function declareBlockers(attackers) {
    if (attackers.length === 0) return;
    
    const defenders = gameState.ai.battlefield.filter(c => 
        c.type.includes('Creature') && !c.tapped
    );
    
    if (defenders.length === 0) {
        // No blockers, resolve damage
        attackers.forEach(attacker => {
            const damage = attacker.power || 0;
            gameState.ai.life -= damage;
            addLog(`${attacker.name} deals ${damage} damage (unblocked)`);
        });
        checkGameOver();
        return;
    }
    
    // AI assigns blockers
    attackers.forEach(attacker => {
        const blocker = selectBlocker(attacker, defenders);
        if (blocker) {
            resolveCombat(attacker, blocker);
            defenders.splice(defenders.indexOf(blocker), 1);
        } else {
            const damage = attacker.power || 0;
            gameState.ai.life -= damage;
            addLog(`${attacker.name} deals ${damage} damage (unblocked)`);
        }
    });
    
    checkGameOver();
}

function selectBlocker(attacker, defenders) {
    // AI logic: block if defender can survive or trade favorably
    for (const defender of defenders) {
        if (defender.toughness >= attacker.power) {
            return defender;
        }
    }
    return null;
}

function resolveCombat(attacker, blocker) {
    const attackerDamage = attacker.power || 0;
    const blockerDamage = blocker.power || 0;
    
    // Check for first strike
    if (attacker.hasFirstStrike && !blocker.hasFirstStrike) {
        blocker.toughness -= attackerDamage;
        if (blocker.toughness <= 0) {
            moveToGraveyard(blocker, 'ai');
            addLog(`${attacker.name} destroys ${blocker.name} (first strike)`);
            return;
        }
    }
    
    // Normal combat damage
    attacker.toughness -= blockerDamage;
    blocker.toughness -= attackerDamage;
    
    addLog(`${attacker.name} blocked by ${blocker.name}`);
    
    if (attacker.toughness <= 0) {
        moveToGraveyard(attacker, 'player');
        addLog(`${attacker.name} died`);
    }
    
    if (blocker.toughness <= 0) {
        moveToGraveyard(blocker, 'ai');
        addLog(`${blocker.name} died`);
    }
}

function moveToGraveyard(card, owner) {
    const battlefield = gameState[owner].battlefield;
    const index = battlefield.indexOf(card);
    if (index > -1) {
        battlefield.splice(index, 1);
        gameState[owner].graveyard.push(card);
        handleCreatureDeath(card, owner, gameState);
    }
}

// Add to gameState object
const gameStack = [];

function addToStack(spell, owner, targets = []) {
    const stackItem = {
        spell: spell,
        owner: owner,
        targets: targets,
        id: generateId()
    };
    
    gameStack.push(stackItem);
    addLog(`${owner === 'player' ? 'You' : 'AI'} cast ${spell.name}`);
    updateStackDisplay();
    
    // Give opponent chance to respond
    if (owner === 'player') {
        promptAIResponse();
    } else {
        promptPlayerResponse();
    }
}

function resolveStack() {
    if (gameStack.length === 0) return;
    
    // Resolve top of stack (LIFO)
    const stackItem = gameStack.pop();
    
    addLog(`Resolving ${stackItem.spell.name}...`);
    
    if (stackItem.spell.type.includes('Instant') || stackItem.spell.type.includes('Sorcery')) {
        resolveSpell(stackItem.spell, stackItem.owner);
        gameState[stackItem.owner].graveyard.push(stackItem.spell);
    }
    
    updateStackDisplay();
    
    // Continue resolving if more on stack
    if (gameStack.length > 0) {
        setTimeout(() => resolveStack(), 500);
    }
}

function updateStackDisplay() {
    // Add visual representation of stack
    const stackContainer = document.getElementById('stackContainer');
    if (!stackContainer) return;
    
    stackContainer.innerHTML = gameStack.map((item, index) => `
        <div class="stack-item" style="margin-top: ${index * 10}px">
            ${item.spell.name} (${item.owner})
        </div>
    `).join('');
}

// Export for other modules
window.handleCreatureDeath = handleCreatureDeath;

// Export for AI to use
window.gameState = gameState;
window.playCard = playCard;
window.tapForMana = tapForMana;
window.attackWithCreature = attackWithCreature;
window.updateUI = updateUI;
window.addLog = addLog;
window.calculateAvailableMana = calculateAvailableMana;

// NEW: View graveyard function
function viewGraveyard(player) {
    const graveyard = gameState[player].graveyard;
    
    const modal = document.createElement('div');
    modal.className = 'graveyard-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>🪦 ${player === 'player' ? 'Your' : "AI's"} Graveyard</h2>
            <div class="graveyard-cards">
                ${graveyard.map(card => `
                    <div class="graveyard-card">
                        <div class="card-name">${card.name}</div>
                        <div class="card-type">${card.type}</div>
                    </div>
                `).join('')}
                ${graveyard.length === 0 ? '<p>No cards in graveyard</p>' : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}