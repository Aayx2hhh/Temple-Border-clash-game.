// ─── game.js ──────────────────────────────────────────────────────────────────
// Core game engine: state, rules, turn loop, AI.

// ── LOGGING ──────────────────────────────────────────────────────────────────
function gameLog(msg, faction = 'system') {
    console.log(`[${faction}] ${msg}`);
    if (typeof window.addLogEntry === 'function') {
        window.addLogEntry(msg, faction);
    }
}

// ── CLASSES ───────────────────────────────────────────────────────────────────
class Player {
    constructor(faction) {
        this.faction  = faction;
        this.power    = 5;
        this.supply   = 5;
        this.infantry = 3;
        this.hand     = [];
    }
    modifyResource(type, amount) {
        if (type === 'power') {
            this.power  = Math.max(0, Math.min(10, this.power  + amount));
        } else if (type === 'supply') {
            this.supply = Math.max(0, Math.min(10, this.supply + amount));
        }
    }
}

class Node {
    constructor(id, type) {
        this.id        = id;
        this.type      = type; // 'Capital' | 'Temple'
        this.state     = 'Empty';
        this.occupants = { thailand: 0, cambodia: 0 };
        this.claimant  = null;
    }
    updateState() {
        if (this.occupants.thailand > 0 && this.occupants.cambodia > 0) {
            this.state    = 'Contested';
            this.claimant = null; // contested temples lose their claim
        } else if (this.occupants.thailand > 0 || this.occupants.cambodia > 0) {
            this.state = 'Occupied';
        } else if (this.claimant) {
            this.state = 'Claimed';
        } else {
            this.state = 'Empty';
        }
    }
}

// ── DECK ─────────────────────────────────────────────────────────────────────
const cardDefinitions = [
    { name: "ASEAN Mediation",  effect: "Freeze opponent's troop deployment for 1 turn" },
    { name: "Border Closure",   effect: "Opponent loses 2 Power" },
    { name: "Historical Claim", effect: "Gain +1 to your next combat roll" },
    { name: "UN Appeal",        cost: { power: 3 }, effect: "Remove 1 opponent Infantry from any temple" },
    { name: "Media Victory",    effect: "Gain 2 Power immediately" },
    { name: "Sabotage",         effect: "Opponent loses 2 Supply" }
];

function createDeck() {
    const deck = [...cardDefinitions, ...cardDefinitions];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// ── GAME STATE ────────────────────────────────────────────────────────────────
const gameState = {
    players: {
        thailand: new Player('thailand'),
        cambodia: new Player('cambodia')
    },
    nodes: {
        redCapital:  new Node('Bangkok',    'Capital'),
        A:           new Node('A',          'Temple'),
        B:           new Node('B',          'Temple'),
        C:           new Node('C',          'Temple'),
        blueCapital: new Node('Phnom Penh', 'Capital')
    },
    deck:                  createDeck(),
    currentTurn:           'thailand',
    round:                 1,
    attackBan:             null,          // faction that cannot attack next turn (UN sanction)
    freezeDeployment:      { thailand: false, cambodia: false },
    historicalClaimActive: null,          // faction that gets +1 on next roll
    lostCombat:            null           // faction that lost last combat (eligible to Repair)
};

// Initial setup
gameState.nodes.redCapital.occupants.thailand  = 3;
gameState.nodes.blueCapital.occupants.cambodia = 3;
gameState.players.thailand.hand.push(gameState.deck.pop());
gameState.players.cambodia.hand.push(gameState.deck.pop());

// ── HELPERS ───────────────────────────────────────────────────────────────────
function opponent(faction) {
    return faction === 'thailand' ? 'cambodia' : 'thailand';
}

function waitForAction() {
    return new Promise(resolve => { window.resolveCurrentAction = resolve; });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── MAIN GAME LOOP ────────────────────────────────────────────────────────────
async function startGameLoop() {
    gameLog("Operation initiated. Border lines active.", "system");

    while (gameState.round <= 10) {
        gameLog(`─── ROUND ${gameState.round} ───`, "system");

        // In 2-player mode, show pass screen before each turn
        if (window.gameMode === '2player') {
            await window.showPassTurnScreen('thailand');
        }
        await playTurn('thailand');
        if (checkVictoryConditions()) return;

        if (window.gameMode === '2player') {
            await window.showPassTurnScreen('cambodia');
        }
        await playTurn('cambodia');
        if (checkVictoryConditions()) return;

        gameState.round++;
    }

    // Ceasefire tiebreaker
    gameLog("UN MANDATED CEASEFIRE — counting claims.", "system");
    let thClaims = 0, camClaims = 0;
    Object.values(gameState.nodes).forEach(node => {
        if (node.type === 'Temple') {
            if (node.claimant === 'thailand') thClaims++;
            if (node.claimant === 'cambodia') camClaims++;
        }
    });
    if (thClaims > camClaims)       triggerGameOver('CEASEFIRE: Thailand wins by territorial majority!');
    else if (camClaims > thClaims)  triggerGameOver('CEASEFIRE: Cambodia wins by territorial majority!');
    else                            triggerGameOver('CEASEFIRE: Absolute Stalemate — draw!');
}

// ── TURN LOGIC ────────────────────────────────────────────────────────────────
async function playTurn(faction) {
    gameState.currentTurn = faction;

    // Update turn indicator
    const indicator = document.getElementById('current-player-display');
    if (indicator) {
        indicator.textContent = faction === 'thailand' ? 'THAILAND 🇹🇭' : 'CAMBODIA 🇰🇭';
        indicator.style.color = faction === 'thailand' ? '#ff4757' : '#1e90ff';
    }
    const phaseLabel = document.getElementById('turn-phase-label');
    if (phaseLabel) phaseLabel.textContent = 'RESOURCE PHASE';

    // Resource phase
    executeResourcePhase(faction);
    updateBoardVisuals();

    // Action phase
    if (phaseLabel) phaseLabel.textContent = 'ACTION PHASE';

    let actionTaken = false;
    while (!actionTaken) {
        let chosenAction;

        if (window.gameMode === 'bot' && faction === 'cambodia') {
            // AI turn
            window.setAIThinking(true);
            await sleep(1200);
            window.setAIThinking(false);
            chosenAction = triggerAIAction();
        } else {
            // Human turn — wait for button press
            chosenAction = await waitForAction();
        }

        // If the action opens a sub-modal (Deploy/Claim/Attack), the resolution
        // comes back as a sentinel. We handle cancels here (re-loop).
        const result = await executeAction(faction, chosenAction);
        if (result === 'cancelled') {
            // Action was cancelled by player — let them choose again
            continue;
        }
        actionTaken = true;
    }

    // End-of-turn cleanup
    gameState.freezeDeployment[faction] = false;
    if (gameState.attackBan   === faction) gameState.attackBan   = null;
    if (gameState.lostCombat  === faction) gameState.lostCombat  = null;

    updateBoardVisuals();
}

// ── RESOURCE PHASE ────────────────────────────────────────────────────────────
function executeResourcePhase(faction) {
    const player = gameState.players[faction];
    let controlled = 0;
    Object.values(gameState.nodes).forEach(node => {
        if (node.type === 'Temple' && node.claimant === faction) controlled++;
    });
    if (controlled > 0) {
        player.modifyResource('power', controlled);
        gameLog(`+${controlled} Power from ${controlled} claimed temple(s).`, faction);
    } else {
        player.modifyResource('supply', 1);
        gameLog(`No temples claimed — received +1 Supply.`, faction);
    }
    updateBoardVisuals();
}

// ── ACTION EXECUTION ──────────────────────────────────────────────────────────
// Returns 'cancelled' if player bailed out of a sub-modal, else undefined.
async function executeAction(faction, actionType) {
    const player  = gameState.players[faction];
    const capital = faction === 'thailand' ? gameState.nodes.redCapital : gameState.nodes.blueCapital;
    const opp     = opponent(faction);

    switch (actionType) {

        // ── DEPLOY ──────────────────────────────────────────────────────────
        case 'Deploy': {
            if (gameState.freezeDeployment[faction]) {
                gameLog(`Advance blocked by ASEAN Mediation!`, faction);
                return; // counts as action taken (lost the turn effect)
            }

            // Ask player (or AI already chose a move)
            let move;
            if (window.gameMode === 'bot' && faction === 'cambodia') {
                // AI already picked — use first affordable move
                const moves = window._getDeploySources(faction);
                if (moves.length === 0) { gameLog(`No valid moves available.`, faction); return; }
                move = moves[0];
            } else {
                move = await window.promptDeployTarget(faction);
                if (!move) return 'cancelled';
            }

            if (player.supply < move.cost) {
                gameLog(`Not enough Supply! Need ${move.cost}.`, faction);
                return 'cancelled';
            }

            // Execute the move
            gameState.nodes[move.from].occupants[faction]--;
            gameState.nodes[move.to].occupants[faction]++;
            player.modifyResource('supply', -move.cost);
            Object.values(gameState.nodes).forEach(n => { if (n.type === 'Temple') n.updateState(); });
            gameLog(`Deployed troops: ${move.label} (cost ${move.cost} Supply).`, faction);
            updateBoardVisuals();
            break;
        }

        // ── CLAIM ───────────────────────────────────────────────────────────
        case 'Claim': {
            // Validation: need a temple we occupy alone
            const claimable = ['A','B','C'].filter(id => {
                const n = gameState.nodes[id];
                return n.occupants[faction] > 0 && n.occupants[opp] === 0;
            });

            if (claimable.length === 0) {
                gameLog(`No eligible temples to claim — must occupy a temple alone.`, faction);
                return 'cancelled';
            }
            if (player.power < 1) {
                gameLog(`Not enough Power to claim.`, faction);
                return 'cancelled';
            }

            let targetId;
            if (window.gameMode === 'bot' && faction === 'cambodia') {
                targetId = claimable[0];
            } else {
                targetId = await window.promptClaimTarget(faction);
                if (!targetId) return 'cancelled';
            }

            player.modifyResource('power', -1);
            gameState.nodes[targetId].claimant = faction;
            gameState.nodes[targetId].updateState();
            gameLog(`Claimed Temple ${targetId} — flag planted!`, faction);
            updateBoardVisuals();
            break;
        }

        // ── ATTACK ───────────────────────────────────────────────────────────
        case 'Attack': {
            if (gameState.attackBan === faction) {
                gameLog(`UN Sanction active — cannot attack this turn!`, faction);
                return 'cancelled';
            }

            const contested = ['A','B','C'].filter(id => {
                const n = gameState.nodes[id];
                return n.occupants.thailand > 0 && n.occupants.cambodia > 0;
            });

            if (contested.length === 0) {
                gameLog(`No contested temples — need troops at the same temple as the enemy.`, faction);
                return 'cancelled';
            }
            if (player.power < 1) {
                gameLog(`Not enough Power to attack.`, faction);
                return 'cancelled';
            }

            let targetId;
            if (window.gameMode === 'bot' && faction === 'cambodia') {
                targetId = contested[0];
            } else {
                targetId = await window.promptAttackTarget(faction);
                if (!targetId) return 'cancelled';
            }

            const targetTemple = gameState.nodes[targetId];
            player.modifyResource('power', -1);
            updateBoardVisuals();
            gameLog(`Initiated attack at Temple ${targetId}!`, faction);

            // ── DEFENDER RESPONSE ──────────────────────────────────────────
            let defenderChoice;
            window.isDefenderPhase = true;

            if (window.gameMode === 'bot' && opp === 'cambodia') {
                // AI defending
                window.setAIThinking(true);
                await sleep(1000);
                window.setAIThinking(false);
                defenderChoice = aiDefendChoice();
            } else if (window.gameMode === 'bot' && opp === 'thailand') {
                // AI attacking, human defending
                defenderChoice = await waitForAction();
            } else {
                // 2-player: show pass screen then defender chooses
                await window.showPassTurnScreen(opp);
                defenderChoice = await waitForAction();
            }
            window.isDefenderPhase = false;

            // ── RETREAT ────────────────────────────────────────────────────
            if (defenderChoice === 'Retreat') {
                const defPlayer = gameState.players[opp];
                if (defPlayer.power < 1) {
                    gameLog(`${opp} cannot afford to retreat (needs 1 Power) — forced to Engage!`, 'system');
                    defenderChoice = 'Engage';
                } else {
                    defPlayer.modifyResource('power', -1);
                    const oppCapital = opp === 'thailand' ? gameState.nodes.redCapital : gameState.nodes.blueCapital;
                    targetTemple.occupants[opp]--;
                    oppCapital.occupants[opp]++;
                    targetTemple.updateState();
                    gameLog(`${opp} retreated to HQ — costs 1 Power.`, opp);
                    updateBoardVisuals();
                    break; // attack resolves without dice
                }
            }

            // ── ENGAGE → DICE ──────────────────────────────────────────────
            if (defenderChoice === 'Engage') {
                gameLog(`${opp} chose to ENGAGE!`, opp);

                let winner = null;
                let roundCount = 0;

                while (!winner) {
                    roundCount++;
                    let atkRoll = Math.floor(Math.random() * 6) + 1;
                    let defRoll = Math.floor(Math.random() * 6) + 1;

                    // Historical Claim bonus
                    if (gameState.historicalClaimActive === faction) {
                        atkRoll += 1;
                        gameLog(`Historical Claim used — +1 to attacker's roll.`, faction);
                        gameState.historicalClaimActive = null;
                    }

                    // Show dice animation
                    await window.showDiceRoll(faction, opp, atkRoll, defRoll);

                    if (atkRoll > defRoll) {
                        winner = faction;
                    } else if (defRoll > atkRoll) {
                        winner = opp;
                    } else {
                        // Tie → compare Power
                        gameLog(`Dice tied [${atkRoll}] — comparing Power: THA ${gameState.players.thailand.power} vs CAM ${gameState.players.cambodia.power}`, 'system');
                        if (gameState.players[faction].power > gameState.players[opp].power) {
                            winner = faction;
                            gameLog(`Power tiebreak: ${faction} wins.`, 'system');
                        } else if (gameState.players[opp].power > gameState.players[faction].power) {
                            winner = opp;
                            gameLog(`Power tiebreak: ${opp} wins.`, 'system');
                        } else {
                            gameLog(`Powers equal — re-rolling!`, 'system');
                            await sleep(600);
                        }
                    }
                }

                const loser = opponent(winner);
                gameLog(`Combat resolved — ${winner} wins! Enemy infantry destroyed.`, winner);

                // Animations
                if (typeof window.playCombatAnimation === 'function') {
                    window.playCombatAnimation(targetId);
                    if (typeof window.triggerParticleExplosion === 'function') {
                        window.triggerParticleExplosion(targetId, winner === 'thailand' ? 'red' : 'blue');
                    }
                    await sleep(700);
                }

                // Remove one losing troop
                targetTemple.occupants[loser] = Math.max(0, targetTemple.occupants[loser] - 1);

                // Winner claims the temple
                if (targetTemple.occupants[winner] > 0) {
                    targetTemple.claimant = winner;
                }

                // Track who lost (for Repair eligibility)
                gameState.lostCombat = loser;

                // UN sanction on winner
                gameState.attackBan = winner;
                gameLog(`UN Sanction: ${winner} cannot attack next turn.`, 'system');

                targetTemple.updateState();
                updateBoardVisuals();
            }
            break;
        }

        // ── REPAIR ───────────────────────────────────────────────────────────
        case 'Repair': {
            if (gameState.lostCombat !== faction) {
                gameLog(`Repair only available to the faction that just lost combat.`, faction);
                return 'cancelled';
            }
            let total = capital.occupants[faction];
            Object.values(gameState.nodes).forEach(n => {
                if (n.type === 'Temple') total += n.occupants[faction];
            });
            if (total >= 3) {
                gameLog(`Already at full infantry strength — no repair needed.`, faction);
                return 'cancelled';
            }
            if (player.power < 1 || player.supply < 1) {
                gameLog(`Not enough resources to repair (need 1 Power + 1 Supply).`, faction);
                return 'cancelled';
            }
            player.modifyResource('power',  -1);
            player.modifyResource('supply', -1);
            capital.occupants[faction]++;
            gameLog(`Repaired an infantry unit — returned to HQ.`, faction);
            updateBoardVisuals();
            break;
        }

        // ── CHANCE CARD ──────────────────────────────────────────────────────
        case 'Chance': {
            if (player.hand.length === 0) {
                gameLog(`No cards in hand.`, faction);
                return 'cancelled';
            }
            const card = player.hand.shift();
            gameLog(`Played card: [${card.name}]`, faction);

            switch (card.name) {
                case "ASEAN Mediation":
                    gameState.freezeDeployment[opp] = true;
                    gameLog(`${opp}'s deployment is frozen for 1 turn.`, 'system');
                    break;

                case "Border Closure":
                    gameState.players[opp].modifyResource('power', -2);
                    gameLog(`${opp} loses 2 Power.`, 'system');
                    break;

                case "Historical Claim":
                    gameState.historicalClaimActive = faction;
                    gameLog(`${faction} gains +1 to next combat roll.`, 'system');
                    break;

                case "UN Appeal":
                    if (player.power < 3) {
                        gameLog(`UN Appeal requires 3 Power — not enough! Card wasted.`, faction);
                    } else {
                        player.modifyResource('power', -3);
                        let removed = false;
                        ['A','B','C'].forEach(id => {
                            if (!removed && gameState.nodes[id].occupants[opp] > 0) {
                                gameState.nodes[id].occupants[opp]--;
                                gameState.nodes[id].updateState();
                                gameLog(`UN removed 1 ${opp} infantry from Temple ${id}.`, 'system');
                                removed = true;
                            }
                        });
                        if (!removed) gameLog(`No enemy infantry on temples to remove.`, 'system');
                    }
                    break;

                case "Media Victory":
                    player.modifyResource('power', 2);
                    gameLog(`${faction} gains 2 Power.`, 'system');
                    break;

                case "Sabotage":
                    gameState.players[opp].modifyResource('supply', -2);
                    gameLog(`${opp} loses 2 Supply.`, 'system');
                    break;
            }

            // Draw a replacement card
            if (gameState.deck.length > 0) {
                player.hand.push(gameState.deck.pop());
            }
            updateBoardVisuals();
            break;
        }

        // ── PASS ─────────────────────────────────────────────────────────────
        case 'Pass':
            gameLog(`${faction} passed the turn.`, faction);
            break;

        default:
            gameLog(`Unknown action: ${actionType}`, 'system');
    }
}

// ── VICTORY CHECK ─────────────────────────────────────────────────────────────
function checkVictoryConditions() {
    const th  = gameState.players.thailand;
    const cam = gameState.players.cambodia;

    // Resource depletion
    if (th.power <= 0 || th.supply <= 0) {
        triggerGameOver('🇰🇭 CAMBODIA WINS! Thailand exhausted all resources.');
        return true;
    }
    if (cam.power <= 0 || cam.supply <= 0) {
        triggerGameOver('🇹🇭 THAILAND WINS! Cambodia exhausted all resources.');
        return true;
    }

    const temples = [gameState.nodes.A, gameState.nodes.B, gameState.nodes.C];

    // Military: all 3 temples occupied by one side, none contested
    if (temples.every(t => t.occupants.thailand > 0 && t.occupants.cambodia === 0)) {
        triggerGameOver('🇹🇭 THAILAND WINS! Total border control secured.');
        return true;
    }
    if (temples.every(t => t.occupants.cambodia > 0 && t.occupants.thailand === 0)) {
        triggerGameOver('🇰🇭 CAMBODIA WINS! Total border control secured.');
        return true;
    }

    // Diplomatic: 2+ claims after opponent's turn
    let thClaims = 0, camClaims = 0;
    temples.forEach(t => {
        if (t.claimant === 'thailand') thClaims++;
        if (t.claimant === 'cambodia') camClaims++;
    });
    // Check after Cambodia moves (Thailand was last to benefit from its claim)
    if (gameState.currentTurn === 'cambodia' && thClaims >= 2) {
        triggerGameOver('🇹🇭 THAILAND WINS! International recognition secured — 2+ temples claimed.');
        return true;
    }
    if (gameState.currentTurn === 'thailand' && camClaims >= 2) {
        triggerGameOver('🇰🇭 CAMBODIA WINS! International recognition secured — 2+ temples claimed.');
        return true;
    }

    return false;
}

function triggerGameOver(message) {
    if (typeof window.showGameOver === 'function') window.showGameOver(message);
}

// ── AI LOGIC ─────────────────────────────────────────────────────────────────
function aiDefendChoice() {
    const cambodia = gameState.players.cambodia;
    const thailand = gameState.players.thailand;
    // Retreat if we have power AND we're outgunned on dice (random factor)
    if (cambodia.power >= 1 && (cambodia.power < thailand.power || Math.random() < 0.35)) {
        return 'Retreat';
    }
    return 'Engage';
}

function triggerAIAction() {
    const cambodia = gameState.players.cambodia;
    const opponent = gameState.players.thailand;
    const nodes    = gameState.nodes;

    let canClaim    = false;
    let hasContested = false;
    let totalInfantry = nodes.blueCapital.occupants.cambodia;

    ['A','B','C'].forEach(id => {
        const n = nodes[id];
        totalInfantry += n.occupants.cambodia;
        if (n.occupants.cambodia > 0 && n.occupants.thailand === 0 && n.claimant !== 'thailand') canClaim = true;
        if (n.occupants.cambodia > 0 && n.occupants.thailand > 0) hasContested = true;
    });

    const canDeploy  = cambodia.supply >= 1 && !gameState.freezeDeployment.cambodia && window._getDeploySources('cambodia').length > 0;
    const canAttack  = hasContested && cambodia.power >= 1 && gameState.attackBan !== 'cambodia';
    const canRepair  = gameState.lostCombat === 'cambodia' && cambodia.power >= 1 && cambodia.supply >= 1 && totalInfantry < 3;
    const card       = cambodia.hand[0];
    const canPlayCard = card && !(card.name === 'UN Appeal' && cambodia.power < 3);

    // Priority order
    if (canRepair)   return 'Repair';
    if (canAttack)   return 'Attack';
    if (canClaim && cambodia.power >= 1) return 'Claim';
    if (canPlayCard && Math.random() > 0.4) return 'Chance';
    if (canDeploy)   return 'Deploy';
    return 'Pass';
}
