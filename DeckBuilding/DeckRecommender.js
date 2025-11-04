// ===================================
// AI DECK RECOMMENDER SYSTEM
// ===================================

class DeckRecommender {
    constructor(scryfallAPI) {
        this.api = scryfallAPI;
        this.deckAnalysis = null;
    }

    // ===================================
    // DECK ANALYSIS
    // ===================================
    
    analyzeDeck(deck) {
        const analysis = {
            colors: this.analyzeColors(deck),
            curve: this.analyzeManaCurve(deck),
            types: this.analyzeCardTypes(deck),
            themes: this.detectThemes(deck),
            synergies: this.detectSynergies(deck),
            weaknesses: this.identifyWeaknesses(deck),
            totalCards: deck.reduce((sum, item) => sum + item.quantity, 0)
        };

        this.deckAnalysis = analysis;
        return analysis;
    }

    analyzeColors(deck) {
        const colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
        const colorIdentity = new Set();
        let totalColorPips = 0;

        deck.forEach(item => {
            const card = item.card;
            const quantity = item.quantity;

            // Count color pips in mana cost
            if (card.mana_cost) {
                const pips = card.mana_cost.match(/{[WUBRGC]}/g) || [];
                pips.forEach(pip => {
                    const color = pip.replace(/[{}]/g, '');
                    colorCounts[color] += quantity;
                    totalColorPips += quantity;
                });
            }

            // Add to color identity
            (card.colors || []).forEach(color => colorIdentity.add(color));
        });

        return {
            identity: Array.from(colorIdentity),
            distribution: colorCounts,
            totalPips: totalColorPips,
            isMonoColor: colorIdentity.size === 1,
            isTwoColor: colorIdentity.size === 2,
            isMultiColor: colorIdentity.size >= 3,
            primaryColor: this.getPrimaryColor(colorCounts),
            secondaryColor: this.getSecondaryColor(colorCounts)
        };
    }

    analyzeManaCurve(deck) {
        const curve = Array(8).fill(0); // 0-6, 7+
        let totalCMC = 0;
        let cardCount = 0;

        deck.forEach(item => {
            const cmc = item.card.cmc || 0;
            const quantity = item.quantity;
            const index = Math.min(cmc, 7);
            
            curve[index] += quantity;
            totalCMC += cmc * quantity;
            cardCount += quantity;
        });

        const avgCMC = cardCount > 0 ? totalCMC / cardCount : 0;

        return {
            curve: curve,
            avgCMC: avgCMC.toFixed(2),
            peak: curve.indexOf(Math.max(...curve)),
            lowEnd: curve.slice(0, 3).reduce((a, b) => a + b, 0), // 0-2 CMC
            midRange: curve.slice(3, 5).reduce((a, b) => a + b, 0), // 3-4 CMC
            highEnd: curve.slice(5).reduce((a, b) => a + b, 0) // 5+ CMC
        };
    }

    analyzeCardTypes(deck) {
        const types = {
            creature: 0,
            instant: 0,
            sorcery: 0,
            enchantment: 0,
            artifact: 0,
            planeswalker: 0,
            land: 0
        };

        deck.forEach(item => {
            const typeLine = item.card.type_line.toLowerCase();
            const quantity = item.quantity;

            if (typeLine.includes('creature')) types.creature += quantity;
            if (typeLine.includes('instant')) types.instant += quantity;
            if (typeLine.includes('sorcery')) types.sorcery += quantity;
            if (typeLine.includes('enchantment')) types.enchantment += quantity;
            if (typeLine.includes('artifact')) types.artifact += quantity;
            if (typeLine.includes('planeswalker')) types.planeswalker += quantity;
            if (typeLine.includes('land')) types.land += quantity;
        });

        return types;
    }

    detectThemes(deck) {
        const themes = [];
        const keywords = new Map();
        const tribes = new Map();

        deck.forEach(item => {
            const card = item.card;
            const text = (card.oracle_text || '').toLowerCase();
            const typeLine = (card.type_line || '').toLowerCase();

            // Detect keyword mechanics
            const keywordPatterns = [
                'flying', 'deathtouch', 'lifelink', 'trample', 'haste',
                'vigilance', 'first strike', 'double strike', 'menace',
                'hexproof', 'indestructible', 'flash', 'prowess',
                'token', 'counter', 'sacrifice', 'graveyard', 'draw',
                'discard', 'mill', 'exile', 'destroy', 'bounce'
            ];

            keywordPatterns.forEach(keyword => {
                if (text.includes(keyword)) {
                    keywords.set(keyword, (keywords.get(keyword) || 0) + item.quantity);
                }
            });

            // Detect tribal themes
            const tribalPatterns = [
                'goblin', 'elf', 'zombie', 'vampire', 'dragon', 'angel',
                'demon', 'wizard', 'warrior', 'soldier', 'merfolk', 'human'
            ];

            tribalPatterns.forEach(tribe => {
                if (typeLine.includes(tribe) || text.includes(tribe)) {
                    tribes.set(tribe, (tribes.get(tribe) || 0) + item.quantity);
                }
            });
        });

        // Identify dominant themes
        for (let [keyword, count] of keywords.entries()) {
            if (count >= 4) {
                themes.push({ type: 'mechanic', name: keyword, strength: count });
            }
        }

        for (let [tribe, count] of tribes.entries()) {
            if (count >= 5) {
                themes.push({ type: 'tribal', name: tribe, strength: count });
            }
        }

        return themes;
    }

    detectSynergies(deck) {
        const synergies = [];

        // Check for common synergy patterns
        const hasTokens = deck.some(item => 
            (item.card.oracle_text || '').toLowerCase().includes('token')
        );
        const hasCounters = deck.some(item => 
            (item.card.oracle_text || '').toLowerCase().includes('+1/+1 counter')
        );
        const hasGraveyard = deck.some(item => 
            (item.card.oracle_text || '').toLowerCase().includes('graveyard')
        );
        const hasSacrifice = deck.some(item => 
            (item.card.oracle_text || '').toLowerCase().includes('sacrifice')
        );

        if (hasTokens) synergies.push('token-generators');
        if (hasCounters) synergies.push('counter-synergy');
        if (hasGraveyard) synergies.push('graveyard-matters');
        if (hasSacrifice) synergies.push('sacrifice-theme');

        return synergies;
    }

    identifyWeaknesses(deck) {
        const weaknesses = [];
        const analysis = this.deckAnalysis || this.analyzeDeck(deck);
        const types = analysis.types;
        const curve = analysis.curve;
        const totalCards = analysis.totalCards;

        // Check creature count
        if (types.creature < 12) {
            weaknesses.push({
                type: 'low-creature-count',
                severity: 'high',
                message: 'Deck has very few creatures. Consider adding more threats.'
            });
        }

        // Check removal
        const removalCount = deck.filter(item => {
            const text = (item.card.oracle_text || '').toLowerCase();
            return text.includes('destroy') || text.includes('exile') || 
                   text.includes('bounce') || text.includes('counter target');
        }).reduce((sum, item) => sum + item.quantity, 0);

        if (removalCount < 4) {
            weaknesses.push({
                type: 'low-removal',
                severity: 'medium',
                message: 'Deck lacks removal spells. Add more interaction.'
            });
        }

        // Check mana curve
        if (curve.avgCMC > 4) {
            weaknesses.push({
                type: 'high-curve',
                severity: 'high',
                message: 'Average mana cost is too high. Add cheaper spells.'
            });
        }

        if (curve.lowEnd < 8) {
            weaknesses.push({
                type: 'slow-start',
                severity: 'medium',
                message: 'Not enough early game plays. Add more 1-3 CMC cards.'
            });
        }

        // Check land count
        if (types.land < 22 && totalCards >= 40) {
            weaknesses.push({
                type: 'low-land-count',
                severity: 'high',
                message: 'Not enough lands. Aim for 23-25 lands in a 60-card deck.'
            });
        }

        return weaknesses;
    }

    getPrimaryColor(colorCounts) {
        let maxColor = 'C';
        let maxCount = 0;

        for (let [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount && color !== 'C') {
                maxCount = count;
                maxColor = color;
            }
        }

        return maxColor;
    }

    getSecondaryColor(colorCounts) {
        const sorted = Object.entries(colorCounts)
            .filter(([color]) => color !== 'C')
            .sort((a, b) => b[1] - a[1]);

        return sorted.length > 1 ? sorted[1][0] : null;
    }

    // ===================================
    // RECOMMENDATION ENGINE
    // ===================================

    async getRecommendations(deck, options = {}) {
        const {
            count = 10,
            focusArea = 'balanced', // 'creatures', 'removal', 'card-draw', 'balanced'
            similarityWeight = 0.7
        } = options;

        if (deck.length === 0) {
            return {
                recommendations: [],
                analysis: null,
                message: 'Add cards to your deck first to get recommendations.'
            };
        }

        const analysis = this.analyzeDeck(deck);
        const recommendations = [];

        try {
            // Get recommendations based on focus area
            let searchResults;

            switch (focusArea) {
                case 'creatures':
                    searchResults = await this.recommendCreatures(analysis);
                    break;
                case 'removal':
                    searchResults = await this.recommendRemoval(analysis);
                    break;
                case 'card-draw':
                    searchResults = await this.recommendCardDraw(analysis);
                    break;
                case 'lands':
                    searchResults = await this.recommendLands(analysis);
                    break;
                default:
                    searchResults = await this.recommendBalanced(analysis);
            }

            // Score and rank recommendations
            const scoredCards = searchResults.map(card => ({
                card,
                score: this.scoreCard(card, analysis, similarityWeight)
            }));

            // Sort by score and take top results
            scoredCards.sort((a, b) => b.score - a.score);
            const topRecommendations = scoredCards.slice(0, count);

            return {
                recommendations: topRecommendations.map(r => r.card),
                analysis: analysis,
                weaknesses: analysis.weaknesses,
                suggestions: this.generateSuggestions(analysis)
            };

        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw error;
        }
    }

    async recommendCreatures(analysis) {
        const colors = analysis.colors.identity;
        const avgCMC = parseFloat(analysis.curve.avgCMC);

        let query = 't:creature';
        
        if (colors.length > 0) {
            const colorQuery = colors.map(c => `c:${c}`).join(' OR ');
            query += ` (${colorQuery})`;
        }

        // Focus on creatures in the deck's CMC range
        const targetCMC = Math.max(1, Math.min(Math.floor(avgCMC), 5));
        query += ` cmc<=${targetCMC + 2} cmc>=${Math.max(1, targetCMC - 1)}`;

        const results = await this.api.searchCards(query, { page: 1 });
        return results.data || [];
    }

    async recommendRemoval(analysis) {
        const colors = analysis.colors.identity;

        let query = '(o:destroy o:exile o:"return to hand") -t:creature';
        
        if (colors.length > 0) {
            const colorQuery = colors.map(c => `c:${c}`).join(' OR ');
            query += ` (${colorQuery})`;
        }

        query += ' cmc<=4';

        const results = await this.api.searchCards(query, { page: 1 });
        return results.data || [];
    }

    async recommendCardDraw(analysis) {
        const colors = analysis.colors.identity;

        let query = '(o:draw o:scry) -t:creature';
        
        if (colors.length > 0) {
            const colorQuery = colors.map(c => `c:${c}`).join(' OR ');
            query += ` (${colorQuery})`;
        }

        query += ' cmc<=4';

        const results = await this.api.searchCards(query, { page: 1 });
        return results.data || [];
    }

    async recommendLands(analysis) {
        const colors = analysis.colors.identity;

        if (colors.length === 0) {
            return [];
        }

        let query = 't:land -t:basic';
        
        if (colors.length === 1) {
            query += ` ci:${colors[0]}`;
        } else if (colors.length === 2) {
            query += ` ci:${colors[0]}${colors[1]}`;
        }

        const results = await this.api.searchCards(query, { page: 1 });
        return results.data || [];
    }

    async recommendBalanced(analysis) {
        const colors = analysis.colors.identity;
        const weaknesses = analysis.weaknesses;
        
        // Prioritize fixing weaknesses
        if (weaknesses.length > 0) {
            const primaryWeakness = weaknesses[0];
            
            switch (primaryWeakness.type) {
                case 'low-creature-count':
                    return this.recommendCreatures(analysis);
                case 'low-removal':
                    return this.recommendRemoval(analysis);
                case 'slow-start':
                    return this.recommendLowCMC(analysis);
                case 'low-land-count':
                    return this.recommendLands(analysis);
            }
        }

        // General balanced recommendations
        let query = '';
        
        if (colors.length > 0) {
            const colorQuery = colors.map(c => `c:${c}`).join(' OR ');
            query = `(${colorQuery})`;
        } else {
            query = 'c:c'; // colorless
        }

        query += ' cmc<=5 cmc>=2';

        const results = await this.api.searchCards(query, { page: 1 });
        return results.data || [];
    }

    async recommendLowCMC(analysis) {
        const colors = analysis.colors.identity;

        let query = 'cmc<=2';
        
        if (colors.length > 0) {
            const colorQuery = colors.map(c => `c:${c}`).join(' OR ');
            query += ` (${colorQuery})`;
        }

        const results = await this.api.searchCards(query, { page: 1 });
        return results.data || [];
    }

    scoreCard(card, analysis, similarityWeight) {
        let score = 0;

        // Color match bonus
        const cardColors = card.colors || [];
        const deckColors = analysis.colors.identity;
        
        if (cardColors.length === 0 || cardColors.every(c => deckColors.includes(c))) {
            score += 20;
        }

        // CMC curve fit
        const targetCMC = analysis.curve.peak;
        const cardCMC = card.cmc || 0;
        const cmcDiff = Math.abs(cardCMC - targetCMC);
        
        if (cmcDiff <= 1) score += 15;
        else if (cmcDiff <= 2) score += 8;

        // Type distribution balance
        const types = analysis.types;
        const typeLine = card.type_line.toLowerCase();

        if (typeLine.includes('creature') && types.creature < 20) score += 10;
        if (typeLine.includes('instant') && types.instant < 8) score += 8;
        if (typeLine.includes('sorcery') && types.sorcery < 8) score += 8;
        if (typeLine.includes('enchantment') && types.enchantment < 4) score += 5;

        // Synergy bonus
        const oracleText = (card.oracle_text || '').toLowerCase();
        analysis.synergies.forEach(synergy => {
            if (oracleText.includes(synergy.replace('-', ' '))) {
                score += 15;
            }
        });

        // Theme match bonus
        analysis.themes.forEach(theme => {
            if (oracleText.includes(theme.name) || typeLine.includes(theme.name)) {
                score += 12;
            }
        });

        // Rarity bonus (favor uncommon/rare over common)
        if (card.rarity === 'uncommon') score += 3;
        if (card.rarity === 'rare') score += 5;
        if (card.rarity === 'mythic') score += 2;

        return score;
    }

    generateSuggestions(analysis) {
        const suggestions = [];
        const types = analysis.types;
        const curve = analysis.curve;

        // Creature suggestions
        if (types.creature < 15) {
            suggestions.push({
                category: 'Creatures',
                message: `Add ${15 - types.creature} more creatures for a stronger board presence.`,
                priority: 'high'
            });
        }

        // Curve suggestions
        if (parseFloat(curve.avgCMC) > 3.5) {
            suggestions.push({
                category: 'Mana Curve',
                message: 'Your curve is too high. Add more low-cost spells (1-2 CMC).',
                priority: 'high'
            });
        }

        if (curve.lowEnd < 10) {
            suggestions.push({
                category: 'Early Game',
                message: 'Add more early game plays to improve consistency.',
                priority: 'medium'
            });
        }

        // Land suggestions
        const idealLands = 24;
        if (types.land < idealLands - 2) {
            suggestions.push({
                category: 'Mana Base',
                message: `Add ${idealLands - types.land} more lands for better mana consistency.`,
                priority: 'high'
            });
        }

        // Color balance
        if (analysis.colors.isMultiColor) {
            suggestions.push({
                category: 'Mana Fixing',
                message: 'Consider adding dual lands or mana fixing for your multi-color deck.',
                priority: 'medium'
            });
        }

        return suggestions;
    }

    // ===================================
    // DECK OPTIMIZATION
    // ===================================

    async optimizeDeck(deck, targetSize = 60) {
        const analysis = this.analyzeDeck(deck);
        const currentSize = analysis.totalCards;

        if (currentSize === targetSize) {
            return {
                message: 'Deck is already at optimal size.',
                recommendations: []
            };
        }

        if (currentSize < targetSize) {
            // Need to add cards
            const cardsNeeded = targetSize - currentSize;
            const recommendations = await this.getRecommendations(deck, {
                count: cardsNeeded,
                focusArea: 'balanced'
            });

            return {
                message: `Add ${cardsNeeded} more cards to reach ${targetSize} cards.`,
                recommendations: recommendations.recommendations
            };
        } else {
            // Need to remove cards
            const cardsToRemove = currentSize - targetSize;
            const weakestCards = this.identifyWeakestCards(deck, analysis);

            return {
                message: `Remove ${cardsToRemove} cards to reach ${targetSize} cards.`,
                cardsToRemove: weakestCards.slice(0, cardsToRemove)
            };
        }
    }

    identifyWeakestCards(deck, analysis) {
        return deck
            .map(item => ({
                ...item,
                score: this.scoreCard(item.card, analysis, 0.5)
            }))
            .sort((a, b) => a.score - b.score)
            .map(item => item.card);
    }

    // ===================================
    // DECK ARCHETYPE DETECTION
    // ===================================

    detectArchetype(deck) {
        const analysis = this.analyzeDeck(deck);
        const types = analysis.types;
        const curve = analysis.curve;

        // Aggro: Low curve, high creature count
        if (parseFloat(curve.avgCMC) <= 2.5 && types.creature >= 20) {
            return {
                archetype: 'Aggro',
                description: 'Fast, creature-heavy deck that aims to win quickly',
                icon: '⚡'
            };
        }

        // Control: High instant/sorcery count, few creatures
        if (types.instant + types.sorcery >= 20 && types.creature <= 12) {
            return {
                archetype: 'Control',
                description: 'Reactive deck that controls the game with spells',
                icon: '🛡️'
            };
        }

        // Midrange: Balanced curve and types
        if (curve.midRange >= 15 && types.creature >= 15 && types.creature <= 25) {
            return {
                archetype: 'Midrange',
                description: 'Balanced deck with efficient threats and answers',
                icon: '⚖️'
            };
        }

        // Combo: Specific synergies detected
        if (analysis.synergies.length >= 2) {
            return {
                archetype: 'Combo',
                description: 'Synergy-focused deck that combines cards for powerful effects',
                icon: '🔗'
            };
        }

        return {
            archetype: 'Unknown',
            description: 'Deck archetype is unclear - needs more development',
            icon: '❓'
        };
    }
}

// Export for use in Deckbuilding.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeckRecommender;
}