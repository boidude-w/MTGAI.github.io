// Deck Recommender AI - Analyzes deck and suggests improvements + Builds decks from scratch

class DeckRecommender {
    constructor() {
        this.SCRYFALL_API_BASE = 'https://api.scryfall.com';
        this.recommendations = [];
    }

    // Main function to analyze deck and get recommendations
    async analyzeDeck(currentDeck) {
        if (!currentDeck || currentDeck.length === 0) {
            return {
                analysis: 'No cards in deck to analyze.',
                recommendations: [],
                warnings: []
            };
        }

        const analysis = this.performDeckAnalysis(currentDeck);
        const recommendations = await this.generateRecommendations(currentDeck, analysis);

        return {
            analysis: analysis,
            recommendations: recommendations,
            warnings: this.getWarnings(analysis)
        };
    }

    // NEW: Build a complete deck from scratch
    async buildDeck(options = {}) {
        const {
            archetype = 'Balanced',  // Aggro, Control, Midrange, Combo, Tribal, Balanced
            colors = ['R', 'G'],      // Array of color letters: W, U, B, R, G
            deckSize = 60,
            tribalType = null,        // e.g., 'Elf', 'Goblin', 'Zombie'
            budget = 'any'            // 'budget', 'moderate', 'any'
        } = options;

        console.log(`Building ${archetype} deck with colors: ${colors.join(', ')}`);

        try {
            const deck = [];
            const landCount = Math.ceil(deckSize * 0.4); // 40% lands
            const nonLandCount = deckSize - landCount;

            // Step 1: Add lands
            const lands = await this.fetchLands(colors, landCount);
            lands.forEach(card => deck.push(card));

            // Step 2: Build core strategy based on archetype
            const coreCards = await this.buildCoreByArchetype(archetype, colors, tribalType, nonLandCount, budget);
            coreCards.forEach(card => deck.push(card));

            // Step 3: Balance the deck
            const balancedDeck = this.balanceDeck(deck, deckSize);

            return {
                deck: balancedDeck,
                archetype: archetype,
                colors: colors,
                totalCards: balancedDeck.reduce((sum, card) => sum + card.count, 0),
                message: `Successfully built ${archetype} deck!`
            };
        } catch (error) {
            console.error('Error building deck:', error);
            return {
                deck: [],
                error: 'Failed to build deck. Please try again.',
                message: error.message
            };
        }
    }

    // Fetch lands for the deck
    async fetchLands(colors, count) {
        const lands = [];
        
        try {
            // Add basic lands
            const basicLandsPerColor = Math.floor(count / colors.length);
            
            for (const color of colors) {
                const landName = this.getBasicLandName(color);
                const response = await fetch(
                    `${this.SCRYFALL_API_BASE}/cards/named?exact=${encodeURIComponent(landName)}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    lands.push(this.convertToCardFormat(data, basicLandsPerColor));
                }
                
                // Small delay to respect API rate limits
                await this.delay(100);
            }

            // Add dual lands if multi-color
            if (colors.length > 1) {
                const dualLandCount = count - (basicLandsPerColor * colors.length);
                const dualLands = await this.fetchDualLands(colors, dualLandCount);
                lands.push(...dualLands);
            }

        } catch (error) {
            console.error('Error fetching lands:', error);
        }

        return lands;
    }

    // Get basic land name from color
    getBasicLandName(color) {
        const landMap = {
            'W': 'Plains',
            'U': 'Island',
            'B': 'Swamp',
            'R': 'Mountain',
            'G': 'Forest'
        };
        return landMap[color] || 'Wastes';
    }

    // Fetch dual/tap lands
    async fetchDualLands(colors, count) {
        const lands = [];
        
        try {
            const colorQuery = colors.map(c => `color:${c}`).join(' ');
            const query = `type:land ${colorQuery} (t:land produces)`;
            
            const response = await fetch(
                `${this.SCRYFALL_API_BASE}/cards/search?q=${encodeURIComponent(query)}&order=edhrec`
            );

            if (response.ok) {
                const data = await response.json();
                const selectedLands = data.data.slice(0, Math.ceil(count / 4)); // Diversity
                
                selectedLands.forEach(card => {
                    lands.push(this.convertToCardFormat(card, 4));
                });
            }
        } catch (error) {
            console.error('Error fetching dual lands:', error);
        }

        return lands;
    }

    // Build core cards based on archetype
    async buildCoreByArchetype(archetype, colors, tribalType, cardCount, budget) {
        const cards = [];
        const colorString = colors.join('');

        try {
            switch (archetype) {
                case 'Aggro':
                    cards.push(...await this.buildAggroDeck(colorString, cardCount, budget));
                    break;
                
                case 'Control':
                    cards.push(...await this.buildControlDeck(colorString, cardCount, budget));
                    break;
                
                case 'Midrange':
                    cards.push(...await this.buildMidrangeDeck(colorString, cardCount, budget));
                    break;
                
                case 'Combo':
                    cards.push(...await this.buildComboDeck(colorString, cardCount, budget));
                    break;
                
                case 'Tribal':
                    cards.push(...await this.buildTribalDeck(colorString, tribalType, cardCount, budget));
                    break;
                
                default:
                    cards.push(...await this.buildBalancedDeck(colorString, cardCount, budget));
            }
        } catch (error) {
            console.error(`Error building ${archetype} core:`, error);
        }

        return cards;
    }

    // Build aggro deck
    async buildAggroDeck(colors, count, budget) {
        const cards = [];
        
        // Low cost creatures (60%)
        const creatures = await this.fetchCardsByQuery(
            `type:creature color:${colors} cmc<=3 (haste OR trample)`,
            Math.ceil(count * 0.6)
        );
        cards.push(...creatures);

        // Burn spells (20%)
        const burn = await this.fetchCardsByQuery(
            `type:instant color:${colors} cmc<=3 (damage OR destroy)`,
            Math.ceil(count * 0.2)
        );
        cards.push(...burn);

        // Pump spells (20%)
        const pump = await this.fetchCardsByQuery(
            `type:instant color:${colors} cmc<=2 (gets OR power)`,
            Math.ceil(count * 0.2)
        );
        cards.push(...pump);

        return cards;
    }

    // Build control deck
    async buildControlDeck(colors, count, budget) {
        const cards = [];

        // Counterspells (25%)
        const counters = await this.fetchCardsByQuery(
            `type:instant color:${colors} counter`,
            Math.ceil(count * 0.25)
        );
        cards.push(...counters);

        // Removal (25%)
        const removal = await this.fetchCardsByQuery(
            `(type:instant OR type:sorcery) color:${colors} (destroy OR exile)`,
            Math.ceil(count * 0.25)
        );
        cards.push(...removal);

        // Card draw (25%)
        const draw = await this.fetchCardsByQuery(
            `(type:instant OR type:sorcery) color:${colors} draw`,
            Math.ceil(count * 0.25)
        );
        cards.push(...draw);

        // Win conditions (25%)
        const finishers = await this.fetchCardsByQuery(
            `type:creature color:${colors} cmc>=5`,
            Math.ceil(count * 0.25)
        );
        cards.push(...finishers);

        return cards;
    }

    // Build midrange deck
    async buildMidrangeDeck(colors, count, budget) {
        const cards = [];

        // Early creatures (30%)
        const early = await this.fetchCardsByQuery(
            `type:creature color:${colors} cmc>=2 cmc<=3`,
            Math.ceil(count * 0.3)
        );
        cards.push(...early);

        // Mid-game threats (40%)
        const mid = await this.fetchCardsByQuery(
            `type:creature color:${colors} cmc>=4 cmc<=6`,
            Math.ceil(count * 0.4)
        );
        cards.push(...mid);

        // Removal and interaction (30%)
        const interaction = await this.fetchCardsByQuery(
            `color:${colors} (destroy OR exile OR counter)`,
            Math.ceil(count * 0.3)
        );
        cards.push(...interaction);

        return cards;
    }

    // Build combo deck
    async buildComboDeck(colors, count, budget) {
        const cards = [];

        // Combo pieces (40%)
        const combo = await this.fetchCardsByQuery(
            `color:${colors} (when OR whenever) (enters OR cast)`,
            Math.ceil(count * 0.4)
        );
        cards.push(...combo);

        // Tutors (20%)
        const tutors = await this.fetchCardsByQuery(
            `color:${colors} search your library`,
            Math.ceil(count * 0.2)
        );
        cards.push(...tutors);

        // Protection (20%)
        const protection = await this.fetchCardsByQuery(
            `color:${colors} (hexproof OR indestructible OR counter)`,
            Math.ceil(count * 0.2)
        );
        cards.push(...protection);

        // Card draw (20%)
        const draw = await this.fetchCardsByQuery(
            `color:${colors} draw`,
            Math.ceil(count * 0.2)
        );
        cards.push(...draw);

        return cards;
    }

    // Build tribal deck
    async buildTribalDeck(colors, tribalType, count, budget) {
        const cards = [];
        const type = tribalType || 'Elf';

        // Tribal creatures (70%)
        const creatures = await this.fetchCardsByQuery(
            `type:creature color:${colors} t:${type}`,
            Math.ceil(count * 0.7)
        );
        cards.push(...creatures);

        // Tribal synergy (20%)
        const synergy = await this.fetchCardsByQuery(
            `color:${colors} ${type}`,
            Math.ceil(count * 0.2)
        );
        cards.push(...synergy);

        // Support spells (10%)
        const support = await this.fetchCardsByQuery(
            `color:${colors} (draw OR destroy)`,
            Math.ceil(count * 0.1)
        );
        cards.push(...support);

        return cards;
    }

    // Build balanced deck
    async buildBalancedDeck(colors, count, budget) {
        const cards = [];

        // Creatures (50%)
        const creatures = await this.fetchCardsByQuery(
            `type:creature color:${colors}`,
            Math.ceil(count * 0.5)
        );
        cards.push(...creatures);

        // Spells (30%)
        const spells = await this.fetchCardsByQuery(
            `(type:instant OR type:sorcery) color:${colors}`,
            Math.ceil(count * 0.3)
        );
        cards.push(...spells);

        // Other (20%)
        const other = await this.fetchCardsByQuery(
            `color:${colors} (type:artifact OR type:enchantment)`,
            Math.ceil(count * 0.2)
        );
        cards.push(...other);

        return cards;
    }

    // Fetch cards by query
    async fetchCardsByQuery(query, maxCount) {
        const cards = [];
        
        try {
            const response = await fetch(
                `${this.SCRYFALL_API_BASE}/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`
            );

            if (response.ok) {
                const data = await response.json();
                const selectedCards = data.data.slice(0, maxCount);
                
                selectedCards.forEach(card => {
                    // Add 2-4 copies of each card (except legends)
                    const count = card.type_line.includes('Legendary') ? 1 : Math.min(4, Math.floor(Math.random() * 3) + 2);
                    cards.push(this.convertToCardFormat(card, count));
                });
            }

            await this.delay(100); // Rate limiting
        } catch (error) {
            console.error('Error fetching cards:', error);
        }

        return cards;
    }

    // Convert Scryfall card to deck format
    convertToCardFormat(scryfallCard, count = 1) {
        return {
            id: scryfallCard.id,
            name: scryfallCard.name,
            mana: scryfallCard.cmc || 0,
            cmc: scryfallCard.cmc || 0,
            color: this.getCardColor(scryfallCard.colors),
            colors: scryfallCard.colors || [],
            colorIdentity: scryfallCard.color_identity || [],
            type: scryfallCard.type_line || 'Unknown',
            subtype: this.extractSubtypes(scryfallCard.type_line),
            power: scryfallCard.power || undefined,
            toughness: scryfallCard.toughness || undefined,
            text: scryfallCard.oracle_text || 'No card text available',
            imageUrl: scryfallCard.image_uris ? scryfallCard.image_uris.normal : 
                     (scryfallCard.card_faces && scryfallCard.card_faces[0].image_uris ? 
                      scryfallCard.card_faces[0].image_uris.normal : null),
            artist: scryfallCard.artist,
            rarity: scryfallCard.rarity,
            setName: scryfallCard.set_name,
            manaCost: scryfallCard.mana_cost || '',
            prices: scryfallCard.prices,
            layout: scryfallCard.layout,
            count: count
        };
    }

    // Get primary card color
    getCardColor(colors) {
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

    // Extract subtypes from type line
    extractSubtypes(typeLine) {
        if (!typeLine) return '';
        const parts = typeLine.split('—');
        return parts.length > 1 ? parts[1].trim() : '';
    }

    // Balance deck to target size
    balanceDeck(cards, targetSize) {
        let totalCards = cards.reduce((sum, card) => sum + card.count, 0);
        
        // If too many cards, reduce counts
        while (totalCards > targetSize) {
            const cardToReduce = cards.find(c => c.count > 1 && !c.type.includes('Land'));
            if (cardToReduce) {
                cardToReduce.count--;
                totalCards--;
            } else {
                break;
            }
        }

        // If too few cards, increase counts or add more
        while (totalCards < targetSize) {
            const cardToIncrease = cards.find(c => c.count < 4 && !c.type.includes('Basic Land'));
            if (cardToIncrease) {
                cardToIncrease.count++;
                totalCards++;
            } else {
                break;
            }
        }

        return cards.filter(card => card.count > 0);
    }

    // Delay helper for API rate limiting
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Analyze current deck composition
    performDeckAnalysis(deck) {
        const totalCards = deck.reduce((sum, card) => sum + card.count, 0);
        
        // Count card types
        const typeCount = {
            creatures: 0,
            spells: 0,
            lands: 0,
            artifacts: 0,
            enchantments: 0,
            planeswalkers: 0
        };

        // Color distribution
        const colorCount = {
            W: 0, U: 0, B: 0, R: 0, G: 0, C: 0
        };

        // Mana curve
        const manaCurve = {
            0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0
        };

        // Keywords and themes
        const keywords = {};
        const themes = [];

        deck.forEach(card => {
            const count = card.count;

            // Type counting
            if (card.type.includes('Creature')) typeCount.creatures += count;
            if (card.type.includes('Instant') || card.type.includes('Sorcery')) typeCount.spells += count;
            if (card.type.includes('Land')) typeCount.lands += count;
            if (card.type.includes('Artifact')) typeCount.artifacts += count;
            if (card.type.includes('Enchantment')) typeCount.enchantments += count;
            if (card.type.includes('Planeswalker')) typeCount.planeswalkers += count;

            // Color counting
            if (card.colors && card.colors.length > 0) {
                card.colors.forEach(color => {
                    colorCount[color] = (colorCount[color] || 0) + count;
                });
            } else {
                colorCount.C += count;
            }

            // Mana curve
            const cmc = card.cmc || 0;
            if (cmc >= 6) {
                manaCurve['6+'] += count;
            } else {
                manaCurve[cmc] = (manaCurve[cmc] || 0) + count;
            }

            // Extract keywords and themes
            if (card.text) {
                this.extractKeywordsAndThemes(card.text, keywords, themes);
            }
        });

        // Determine primary colors
        const primaryColors = Object.entries(colorCount)
            .filter(([color, count]) => count > 0 && color !== 'C')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([color]) => color);

        // Determine deck archetype
        const archetype = this.determineDeckArchetype(typeCount, keywords, themes);

        return {
            totalCards,
            typeCount,
            colorCount,
            primaryColors,
            manaCurve,
            keywords,
            themes,
            archetype,
            avgCMC: this.calculateAverageCMC(deck)
        };
    }

    // Extract keywords and themes from card text
    extractKeywordsAndThemes(text, keywords, themes) {
        const commonKeywords = [
            'Flying', 'Trample', 'Haste', 'First Strike', 'Double Strike',
            'Deathtouch', 'Lifelink', 'Vigilance', 'Hexproof', 'Indestructible',
            'Flash', 'Defender', 'Menace', 'Reach', 'Ward',
            'Draw', 'Counter', 'Destroy', 'Exile', 'Token',
            'Graveyard', 'Sacrifice', 'Discard', 'Mill'
        ];

        const themesPatterns = {
            'Tribal': /Elf|Goblin|Zombie|Vampire|Dragon|Merfolk|Human|Wizard/i,
            'Graveyard': /graveyard|flashback|reanimate|return.*from.*graveyard/i,
            'Tokens': /token|populate|convoke/i,
            'Voltron': /equipment|aura|attach/i,
            'Control': /counter|destroy|exile|remove/i,
            'Aggro': /haste|trample|double strike/i,
            'Ramp': /search.*land|mana|land.*battlefield/i,
            'Combo': /when.*enter|whenever.*cast/i
        };

        // Extract keywords
        commonKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
                keywords[keyword] = (keywords[keyword] || 0) + 1;
            }
        });

        // Extract themes
        Object.entries(themesPatterns).forEach(([theme, pattern]) => {
            if (pattern.test(text) && !themes.includes(theme)) {
                themes.push(theme);
            }
        });
    }

    // Determine deck archetype
    determineDeckArchetype(typeCount, keywords, themes) {
        const creatureRatio = typeCount.creatures / (typeCount.creatures + typeCount.spells + typeCount.artifacts + typeCount.enchantments);

        if (creatureRatio > 0.6 && (keywords['Haste'] || keywords['Trample'])) {
            return 'Aggro';
        } else if (typeCount.spells > typeCount.creatures && keywords['Counter']) {
            return 'Control';
        } else if (themes.includes('Ramp') || typeCount.lands > 20) {
            return 'Midrange';
        } else if (themes.includes('Combo')) {
            return 'Combo';
        } else if (themes.includes('Tribal')) {
            return 'Tribal';
        } else if (creatureRatio > 0.5) {
            return 'Creature-based';
        } else {
            return 'Balanced';
        }
    }

    // Calculate average CMC
    calculateAverageCMC(deck) {
        const nonLands = deck.filter(card => !card.type.includes('Land'));
        if (nonLands.length === 0) return 0;

        const totalCMC = nonLands.reduce((sum, card) => sum + (card.cmc * card.count), 0);
        const totalNonLandCards = nonLands.reduce((sum, card) => sum + card.count, 0);

        return (totalCMC / totalNonLandCards).toFixed(2);
    }

    // Generate card recommendations
    async generateRecommendations(deck, analysis) {
        const recommendations = [];

        // Recommend cards based on mana curve
        if (analysis.manaCurve[2] < 8 && analysis.totalCards < 60) {
            recommendations.push({
                category: 'Mana Curve',
                reason: 'Your deck needs more 2-cost cards for early game',
                suggestedSearch: `cmc=2 color:${analysis.primaryColors.join('')}`
            });
        }

        // Recommend removal spells
        const removalCount = Object.keys(analysis.keywords).filter(k => 
            ['Destroy', 'Exile', 'Counter'].includes(k)
        ).length;
        
        if (removalCount < 3) {
            recommendations.push({
                category: 'Removal',
                reason: 'Consider adding more removal spells',
                suggestedSearch: `type:instant destroy color:${analysis.primaryColors.join('')}`
            });
        }

        // Recommend lands based on color
        const landRatio = analysis.typeCount.lands / analysis.totalCards;
        const idealLands = Math.ceil(60 * 0.4); // 40% lands

        if (analysis.typeCount.lands < idealLands && analysis.totalCards > 40) {
            recommendations.push({
                category: 'Mana Base',
                reason: `You need approximately ${idealLands - analysis.typeCount.lands} more lands`,
                suggestedSearch: `type:land color:${analysis.primaryColors.join('')}`
            });
        }

        // Recommend synergy cards
        if (analysis.themes.includes('Tribal')) {
            const tribalType = this.detectTribalType(deck);
            if (tribalType) {
                recommendations.push({
                    category: 'Synergy',
                    reason: `Enhance your ${tribalType} tribal theme`,
                    suggestedSearch: `type:creature ${tribalType}`
                });
            }
        }

        // Recommend card draw
        const drawCount = analysis.keywords['Draw'] || 0;
        if (drawCount < 3 && analysis.archetype !== 'Aggro') {
            recommendations.push({
                category: 'Card Advantage',
                reason: 'Add more card draw to maintain resources',
                suggestedSearch: `oracle:"draw cards" color:${analysis.primaryColors.join('')}`
            });
        }

        // Archetype-specific recommendations
        recommendations.push(...this.getArchetypeRecommendations(analysis));

        // Get specific card recommendations from Scryfall
        const specificCards = await this.fetchSpecificRecommendations(analysis, deck);
        recommendations.push(...specificCards);

        return recommendations.slice(0, 10); // Limit to top 10 recommendations
    }

    // Detect tribal type
    detectTribalType(deck) {
        const tribalTypes = {};
        
        deck.forEach(card => {
            if (card.subtype) {
                const subtypes = card.subtype.split(' ');
                subtypes.forEach(type => {
                    tribalTypes[type] = (tribalTypes[type] || 0) + card.count;
                });
            }
        });

        const sorted = Object.entries(tribalTypes).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 && sorted[0][1] >= 5 ? sorted[0][0] : null;
    }

    // Get archetype-specific recommendations
    getArchetypeRecommendations(analysis) {
        const recommendations = [];

        switch (analysis.archetype) {
            case 'Aggro':
                recommendations.push({
                    category: 'Aggro Strategy',
                    reason: 'Add more low-cost aggressive creatures',
                    suggestedSearch: `type:creature cmc<=3 (haste OR trample)`
                });
                break;

            case 'Control':
                recommendations.push({
                    category: 'Control Strategy',
                    reason: 'Include more counterspells and board wipes',
                    suggestedSearch: `(type:instant counter) OR (destroy all creatures)`
                });
                break;

            case 'Midrange':
                recommendations.push({
                    category: 'Midrange Strategy',
                    reason: 'Add powerful mid-game threats',
                    suggestedSearch: `type:creature cmc>=4 cmc<=6`
                });
                break;

            case 'Combo':
                recommendations.push({
                    category: 'Combo Strategy',
                    reason: 'Find tutors and protection spells',
                    suggestedSearch: `(search your library) OR (hexproof OR indestructible)`
                });
                break;
        }

        return recommendations;
    }

    // Fetch specific card recommendations from Scryfall
    async fetchSpecificRecommendations(analysis, currentDeck) {
        const recommendations = [];
        
        try {
            // Build query based on deck colors and archetype
            const colors = analysis.primaryColors.join('');
            const query = `color:${colors} cmc<=${Math.ceil(analysis.avgCMC) + 1}`;
            
            const response = await fetch(
                `${this.SCRYFALL_API_BASE}/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`
            );

            if (response.ok) {
                const data = await response.json();
                const cardNames = currentDeck.map(c => c.name.toLowerCase());
                
                // Filter out cards already in deck
                const suggestedCards = data.data
                    .filter(card => !cardNames.includes(card.name.toLowerCase()))
                    .slice(0, 5);

                suggestedCards.forEach(card => {
                    recommendations.push({
                        category: 'Suggested Card',
                        reason: `Popular ${card.type_line} in your colors`,
                        cardName: card.name,
                        cardData: card
                    });
                });
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        }

        return recommendations;
    }

    // Get warnings about deck composition
    getWarnings(analysis) {
        const warnings = [];

        // Check total card count
        if (analysis.totalCards < 60) {
            warnings.push(`⚠️ Deck has only ${analysis.totalCards} cards. Minimum recommended: 60`);
        } else if (analysis.totalCards > 60) {
            warnings.push(`⚠️ Deck has ${analysis.totalCards} cards. Consider trimming to 60 for consistency`);
        }

        // Check land count
        if (analysis.typeCount.lands < 20) {
            warnings.push('⚠️ Low land count may cause mana issues');
        } else if (analysis.typeCount.lands > 28) {
            warnings.push('⚠️ High land count may reduce spell density');
        }

        // Check mana curve
        if (analysis.avgCMC > 4) {
            warnings.push('⚠️ High average CMC may be too slow');
        } else if (analysis.avgCMC < 2 && analysis.typeCount.lands < 20) {
            warnings.push('⚠️ Very low curve - ensure you have card draw');
        }

        // Check color balance
        if (analysis.primaryColors.length > 2) {
            warnings.push('⚠️ 3+ colors may require better mana fixing');
        }

        return warnings;
    }

    // Format recommendations for display
    formatRecommendations(result) {
        let output = `\n=== DECK ANALYSIS ===\n`;
        output += `Archetype: ${result.analysis.archetype}\n`;
        output += `Total Cards: ${result.analysis.totalCards}\n`;
        output += `Average CMC: ${result.analysis.avgCMC}\n`;
        output += `Primary Colors: ${result.analysis.primaryColors.join(', ')}\n\n`;

        if (result.warnings.length > 0) {
            output += `=== WARNINGS ===\n`;
            result.warnings.forEach(warning => {
                output += `${warning}\n`;
            });
            output += '\n';
        }

        output += `=== RECOMMENDATIONS ===\n`;
        result.recommendations.forEach((rec, index) => {
            output += `${index + 1}. [${rec.category}] ${rec.reason}\n`;
            if (rec.cardName) {
                output += `   → Card: ${rec.cardName}\n`;
            }
            if (rec.suggestedSearch) {
                output += `   → Search: ${rec.suggestedSearch}\n`;
            }
            output += '\n';
        });

        return output;
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeckRecommender;
}