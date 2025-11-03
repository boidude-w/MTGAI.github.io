// Card Abilities System - Handles keyword abilities and triggered effects

class CardAbilities {
    constructor() {
        this.abilities = this.initializeAbilities();
    }

    // Initialize all keyword abilities and their effects
    initializeAbilities() {
        return {
            // Combat abilities
            'Flying': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasFlying = true;
                    return 'Can only be blocked by creatures with flying or reach';
                }
            },
            'Trample': {
                type: 'combat',
                effect: (attacker, blocker, gameState) => {
                    const excessDamage = (attacker.power || 0) - (blocker ? blocker.toughness || 0 : 0);
                    if (excessDamage > 0) {
                        const defender = gameState.currentPlayer === 'player' ? 'ai' : 'player';
                        gameState[defender].life -= excessDamage;
                        return `${attacker.name} tramples for ${excessDamage} damage!`;
                    }
                    return null;
                }
            },
            'Haste': {
                type: 'static',
                effect: (card, gameState) => {
                    card.sickness = false;
                    return 'Can attack immediately';
                }
            },
            'First Strike': {
                type: 'combat',
                effect: (card, gameState) => {
                    card.hasFirstStrike = true;
                    return 'Deals combat damage before creatures without first strike';
                }
            },
            'Double Strike': {
                type: 'combat',
                effect: (card, gameState) => {
                    card.hasFirstStrike = true;
                    card.hasDoubleStrike = true;
                    return 'Deals both first-strike and regular combat damage';
                }
            },
            'Deathtouch': {
                type: 'combat',
                effect: (card, target) => {
                    if (target && target.toughness) {
                        return { destroy: true, reason: 'deathtouch' };
                    }
                    return null;
                }
            },
            'Lifelink': {
                type: 'combat',
                effect: (card, damage, owner, gameState) => {
                    gameState[owner].life += damage;
                    return `${owner === 'player' ? 'You' : 'AI'} gained ${damage} life from lifelink`;
                }
            },
            'Vigilance': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasVigilance = true;
                    return "Doesn't tap when attacking";
                }
            },
            'Hexproof': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasHexproof = true;
                    return "Can't be targeted by opponent's spells or abilities";
                }
            },
            'Indestructible': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasIndestructible = true;
                    return "Can't be destroyed";
                }
            },
            'Menace': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasMenace = true;
                    return 'Must be blocked by two or more creatures';
                }
            },
            'Reach': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasReach = true;
                    return 'Can block creatures with flying';
                }
            },
            'Defender': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasDefender = true;
                    return "Can't attack";
                }
            },
            'Flash': {
                type: 'static',
                effect: (card, gameState) => {
                    card.hasFlash = true;
                    return 'Can be cast at instant speed';
                }
            }
        };
    }

    // Parse card text for abilities
    parseCardAbilities(card) {
        if (!card.text) return [];
        
        const abilities = [];
        const text = card.text.toLowerCase();
        
        // Check for keyword abilities
        Object.keys(this.abilities).forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                abilities.push({
                    name: keyword,
                    data: this.abilities[keyword]
                });
            }
        });

        // Check for common triggered abilities
        if (text.includes('when') && text.includes('enters')) {
            abilities.push({
                name: 'ETB',
                trigger: 'enters_battlefield',
                effect: this.parseETBEffect(card.text)
            });
        }

        if (text.includes('whenever') && text.includes('attacks')) {
            abilities.push({
                name: 'Attack Trigger',
                trigger: 'attacks',
                effect: this.parseAttackTrigger(card.text)
            });
        }

        if (text.includes('tap') && text.includes(':')) {
            abilities.push({
                name: 'Activated Ability',
                trigger: 'activated',
                effect: this.parseActivatedAbility(card.text)
            });
        }

        return abilities;
    }

    // Parse ETB (Enters the Battlefield) effects
    parseETBEffect(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('draw')) {
            const match = text.match(/draw (\d+)/i);
            const cards = match ? parseInt(match[1]) : 1;
            return {
                type: 'draw',
                amount: cards
            };
        }
        
        if (lowerText.includes('gain') && lowerText.includes('life')) {
            const match = text.match(/gain (\d+) life/i);
            const life = match ? parseInt(match[1]) : 1;
            return {
                type: 'gainLife',
                amount: life
            };
        }
        
        if (lowerText.includes('damage')) {
            const match = text.match(/(\d+) damage/i);
            const damage = match ? parseInt(match[1]) : 1;
            return {
                type: 'damage',
                amount: damage
            };
        }
        
        if (lowerText.includes('destroy')) {
            return {
                type: 'destroy',
                target: lowerText.includes('creature') ? 'creature' : 'permanent'
            };
        }

        return { type: 'custom', text: text };
    }

    // Parse attack trigger effects
    parseAttackTrigger(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('gets +')) {
            const match = text.match(/gets \+(\d+)\/\+(\d+)/i);
            if (match) {
                return {
                    type: 'buff',
                    power: parseInt(match[1]),
                    toughness: parseInt(match[2])
                };
            }
        }
        
        if (lowerText.includes('create') && lowerText.includes('token')) {
            return {
                type: 'createToken'
            };
        }

        return { type: 'custom', text: text };
    }

    // Parse activated abilities
    parseActivatedAbility(text) {
        const lowerText = text.toLowerCase();
        
        // Check for mana costs
        const manaCost = this.parseManaCost(text);
        
        if (lowerText.includes('draw')) {
            return {
                type: 'draw',
                cost: manaCost,
                amount: 1
            };
        }
        
        if (lowerText.includes('damage')) {
            const match = text.match(/(\d+) damage/i);
            return {
                type: 'damage',
                cost: manaCost,
                amount: match ? parseInt(match[1]) : 1
            };
        }

        return { type: 'custom', cost: manaCost, text: text };
    }

    // Parse mana cost from text
    parseManaCost(text) {
        const match = text.match(/\{(\d+)\}/);
        return match ? parseInt(match[1]) : 0;
    }

    // Apply static abilities when card enters battlefield
    applyStaticAbilities(card, gameState) {
        const abilities = this.parseCardAbilities(card);
        const messages = [];

        abilities.forEach(ability => {
            if (ability.data && ability.data.type === 'static') {
                const message = ability.data.effect(card, gameState);
                if (message) messages.push(message);
            }
        });

        return messages;
    }

    // Trigger ETB effects
    triggerETBEffect(card, owner, gameState) {
        const abilities = this.parseCardAbilities(card);
        const messages = [];

        abilities.forEach(ability => {
            if (ability.trigger === 'enters_battlefield') {
                const message = this.resolveEffect(ability.effect, card, owner, gameState);
                if (message) messages.push(message);
            }
        });

        return messages;
    }

    // Trigger attack abilities
    triggerAttackAbilities(card, owner, gameState) {
        const abilities = this.parseCardAbilities(card);
        const messages = [];

        abilities.forEach(ability => {
            if (ability.trigger === 'attacks') {
                const message = this.resolveEffect(ability.effect, card, owner, gameState);
                if (message) messages.push(message);
            }
        });

        return messages;
    }

    // Resolve an ability effect
    resolveEffect(effect, card, owner, gameState) {
        if (!effect || !effect.type) return null;

        switch (effect.type) {
            case 'draw':
                for (let i = 0; i < effect.amount; i++) {
                    if (window.drawCardFromLibrary) {
                        window.drawCardFromLibrary(owner);
                    }
                }
                return `${owner === 'player' ? 'You' : 'AI'} drew ${effect.amount} card(s)`;

            case 'gainLife':
                gameState[owner].life += effect.amount;
                return `${owner === 'player' ? 'You' : 'AI'} gained ${effect.amount} life`;

            case 'damage':
                const opponent = owner === 'player' ? 'ai' : 'player';
                gameState[opponent].life -= effect.amount;
                return `${card.name} dealt ${effect.amount} damage to ${opponent === 'player' ? 'you' : 'AI'}`;

            case 'destroy':
                return `${card.name} can destroy target ${effect.target}`;

            case 'buff':
                card.power = (card.power || 0) + effect.power;
                card.toughness = (card.toughness || 0) + effect.toughness;
                return `${card.name} gets +${effect.power}/+${effect.toughness}`;

            case 'createToken':
                return `${card.name} creates a token`;

            default:
                return `${card.name} has a special ability`;
        }
    }

    // Activate an ability (for player or AI)
    activateAbility(card, abilityIndex, owner, gameState) {
        const abilities = this.parseCardAbilities(card);
        
        if (abilityIndex < 0 || abilityIndex >= abilities.length) {
            return { success: false, message: 'Invalid ability' };
        }

        const ability = abilities[abilityIndex];

        // Check if it's an activated ability
        if (ability.trigger === 'activated') {
            const cost = ability.effect.cost || 0;
            const availableMana = window.calculateAvailableMana ? 
                window.calculateAvailableMana(owner) : gameState[owner].mana;

            if (cost > availableMana) {
                return { 
                    success: false, 
                    message: `Not enough mana! Need ${cost}, have ${availableMana}` 
                };
            }

            // Check if card is tapped
            if (ability.effect.text && ability.effect.text.toLowerCase().includes('tap:')) {
                if (card.tapped) {
                    return { success: false, message: 'Card is already tapped' };
                }
                card.tapped = true;
            }

            // Pay mana cost by auto-tapping lands
            if (cost > 0 && window.autoTapLands) {
                if (!window.autoTapLands(owner, cost)) {
                    return { success: false, message: 'Failed to pay mana cost' };
                }
            }

            // Resolve the effect
            const message = this.resolveEffect(ability.effect, card, owner, gameState);
            
            if (window.updateUI) window.updateUI();
            
            return { 
                success: true, 
                message: message || `${card.name} activated ability` 
            };
        }

        return { success: false, message: 'Not an activated ability' };
    }

    // Handle combat damage with abilities
    resolveCombatDamage(attacker, blocker, attackerOwner, gameState) {
        const messages = [];
        const attackerAbilities = this.parseCardAbilities(attacker);
        const blockerAbilities = blocker ? this.parseCardAbilities(blocker) : [];

        // Check for first strike
        const attackerHasFirstStrike = attackerAbilities.some(a => 
            a.name === 'First Strike' || a.name === 'Double Strike'
        );
        const blockerHasFirstStrike = blocker ? blockerAbilities.some(a => 
            a.name === 'First Strike' || a.name === 'Double Strike'
        ) : false;

        // First strike damage
        if (attackerHasFirstStrike && !blockerHasFirstStrike && blocker) {
            blocker.toughness -= attacker.power || 0;
            messages.push(`${attacker.name} deals first strike damage`);
            
            if (blocker.toughness <= 0) {
                messages.push(`${blocker.name} is destroyed by first strike`);
                return messages; // Blocker dies before dealing damage
            }
        }

        // Regular combat damage
        const attackerDamage = attacker.power || 0;
        const defenderOwner = attackerOwner === 'player' ? 'ai' : 'player';

        if (blocker) {
            // Damage to blocker
            blocker.toughness -= attackerDamage;
            attacker.toughness -= blocker.power || 0;

            // Check for deathtouch
            const hasDeathtouch = attackerAbilities.some(a => a.name === 'Deathtouch');
            if (hasDeathtouch && attackerDamage > 0) {
                blocker.toughness = 0;
                messages.push(`${attacker.name}'s deathtouch destroys ${blocker.name}`);
            }

            // Check for lifelink
            const hasLifelink = attackerAbilities.some(a => a.name === 'Lifelink');
            if (hasLifelink) {
                gameState[attackerOwner].life += attackerDamage;
                messages.push(`${attackerOwner === 'player' ? 'You' : 'AI'} gained ${attackerDamage} life from lifelink`);
            }

            // Check for trample
            const hasTrample = attackerAbilities.some(a => a.name === 'Trample');
            if (hasTrample && blocker.toughness <= 0) {
                const excessDamage = attackerDamage - (blocker.toughness + (blocker.power || 0));
                if (excessDamage > 0) {
                    gameState[defenderOwner].life -= excessDamage;
                    messages.push(`${attacker.name} tramples for ${excessDamage} damage`);
                }
            }
        } else {
            // Unblocked damage to player
            gameState[defenderOwner].life -= attackerDamage;
            
            const hasLifelink = attackerAbilities.some(a => a.name === 'Lifelink');
            if (hasLifelink) {
                gameState[attackerOwner].life += attackerDamage;
                messages.push(`${attackerOwner === 'player' ? 'You' : 'AI'} gained ${attackerDamage} life from lifelink`);
            }
        }

        // Check for double strike
        const hasDoubleStrike = attackerAbilities.some(a => a.name === 'Double Strike');
        if (hasDoubleStrike && blocker && blocker.toughness > 0) {
            blocker.toughness -= attackerDamage;
            messages.push(`${attacker.name} deals double strike damage`);
        }

        return messages;
    }

    // Check if a creature can attack
    canAttack(card, owner, gameState) {
        const abilities = this.parseCardAbilities(card);
        
        // Check for defender
        if (abilities.some(a => a.name === 'Defender')) {
            return { canAttack: false, reason: 'Has defender' };
        }

        // Check for summoning sickness (unless has haste)
        if (card.sickness && !abilities.some(a => a.name === 'Haste')) {
            return { canAttack: false, reason: 'Summoning sickness' };
        }

        // Check if tapped
        if (card.tapped) {
            return { canAttack: false, reason: 'Already tapped' };
        }

        return { canAttack: true };
    }

    // Get all abilities of a card (for UI display)
    getCardAbilities(card) {
        return this.parseCardAbilities(card);
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardAbilities;
}