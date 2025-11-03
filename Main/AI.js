// MTG AI Opponent Logic

class AIPlayer {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.aggressiveness = this.getAggressiveness();
    }
    
    getAggressiveness() {
        switch (this.difficulty) {
            case 'easy':
                return 0.3;
            case 'hard':
                return 0.9;
            default: // medium
                return 0.6;
        }
    }
    
    async takeTurn(gameState) {
        // Main 1 phase - play lands and spells
        await this.mainPhase(gameState);
        
        // Combat phase - attack with creatures
        await this.combatPhase(gameState);
        
        // Main 2 phase - play more spells
        await this.mainPhase(gameState);
        
        return gameState;
    }
    
    async mainPhase(gameState) {
        // Play a land if we have one and haven't played one yet
        if (gameState.ai.landsPlayedThisTurn === 0) {
            const land = this.findLandInHand(gameState.ai.hand);
            if (land) {
                await this.delay(500);
                this.playLand(land, gameState);
            }
        }
        
        // Tap lands for mana
        await this.tapLandsForMana(gameState);
        
        // Play creatures and spells
        await this.playCheapestCards(gameState);
    }
    
    async combatPhase(gameState) {
        const attackers = this.selectAttackers(gameState);
        
        for (const attacker of attackers) {
            await this.delay(600);
            this.attack(attacker, gameState);
        }
    }
    
    findLandInHand(hand) {
        return hand.find(card => card.type.includes('Land'));
    }
    
    playLand(land, gameState) {
        const handIndex = gameState.ai.hand.findIndex(c => c.instanceId === land.instanceId);
        if (handIndex === -1) return;
        
        gameState.ai.hand.splice(handIndex, 1);
        gameState.ai.battlefield.push(land);
        gameState.ai.landsPlayedThisTurn++;
        gameState.ai.maxMana++;
        
        window.addLog(`AI played ${land.name}`);
        window.updateUI();
    }
    
    async tapLandsForMana(gameState) {
        // No longer needed - lands are auto-tapped when playing cards
        // Just recalculate available mana
        gameState.ai.mana = window.calculateAvailableMana('ai');
        window.updateUI();
    }
    
    async playCheapestCards(gameState) {
        // Sort hand by mana cost
        const playableCards = gameState.ai.hand
            .filter(card => !card.type.includes('Land'))
            .filter(card => card.cmc <= window.calculateAvailableMana('ai'))
            .sort((a, b) => {
                // Prioritize creatures in easy mode, mix in hard mode
                if (this.difficulty === 'easy') {
                    return a.cmc - b.cmc;
                } else {
                    // Hard mode plays more strategically
                    const aValue = this.evaluateCard(a, gameState);
                    const bValue = this.evaluateCard(b, gameState);
                    return bValue - aValue;
                }
            });
        
        for (const card of playableCards) {
            if (card.cmc <= window.calculateAvailableMana('ai')) {
                await this.delay(800);
                
                if (window.playCard(card, 'ai')) {
                    // Card was successfully played
                    break; // Play one card at a time in easy/medium
                }
            }
        }
    }
    
    evaluateCard(card, gameState) {
        let value = 0;
        
        // Creatures are valuable
        if (card.type.includes('Creature')) {
            value = (card.power || 0) + (card.toughness || 0);
            value += 10; // Base creature value
        }
        
        // Instants and sorceries
        if (card.type.includes('Instant') || card.type.includes('Sorcery')) {
            // Damage spells are valuable when opponent is low
            if (card.name.includes('Bolt') || card.name.includes('Shock')) {
                if (gameState.player.life <= 5) {
                    value = 100; // Prioritize finishing the game
                } else {
                    value = 15;
                }
            } else {
                value = 12;
            }
        }
        
        // Adjust for mana efficiency
        if (card.cmc > 0) {
            value = value / card.cmc;
        }
        
        return value;
    }
    
    selectAttackers(gameState) {
        const attackers = [];
        const creatures = gameState.ai.battlefield.filter(card =>
            card.type.includes('Creature') && 
            !card.tapped && 
            !card.sickness
        );
        
        if (this.difficulty === 'easy') {
            // Easy mode: attack with one creature
            if (creatures.length > 0 && Math.random() < this.aggressiveness) {
                attackers.push(creatures[0]);
            }
        } else if (this.difficulty === 'medium') {
            // Medium mode: attack with some creatures
            creatures.forEach(creature => {
                if (Math.random() < this.aggressiveness) {
                    attackers.push(creature);
                }
            });
        } else {
            // Hard mode: strategic attacking
            const playerCreatures = gameState.player.battlefield.filter(c => 
                c.type.includes('Creature') && !c.tapped
            );
            
            if (playerCreatures.length === 0) {
                // Attack with everything if no blockers
                attackers.push(...creatures);
            } else {
                // Attack with creatures that can survive or deal good damage
                creatures.forEach(creature => {
                    const power = creature.power || 0;
                    const toughness = creature.toughness || 0;
                    
                    // Attack if creature is strong or player is low
                    if (power >= 3 || gameState.player.life <= 5 || 
                        (Math.random() < this.aggressiveness && toughness >= 3)) {
                        attackers.push(creature);
                    }
                });
            }
        }
        
        return attackers;
    }
    
    attack(creature, gameState) {
        if (creature.tapped || creature.sickness) return;
        
        creature.tapped = true;
        const damage = creature.power || 0;
        gameState.player.life -= damage;
        
        window.addLog(`AI attacked with ${creature.name} for ${damage} damage!`);
        window.updateUI();
        
        // Check if player is defeated
        if (gameState.player.life <= 0) {
            window.checkGameOver && window.checkGameOver();
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIPlayer;
}