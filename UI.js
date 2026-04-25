// ─── UI.js ───────────────────────────────────────────────────────────────────
// Handles all DOM interactions, rendering, modals, and player prompts.

document.addEventListener('DOMContentLoaded', () => {
    // ── MODE SELECTION ──────────────────────────────────────────────────────
    const modeModal = document.getElementById('mode-modal');
    const instrModal = document.getElementById('instructions-modal');

    document.getElementById('vs-bot-btn').addEventListener('click', () => {
        window.gameMode = 'bot';
        modeModal.style.display = 'none';
        instrModal.style.display = 'flex';
        document.getElementById('mode-label-display').textContent = '🤖 MODE: VS BOT';
    });

    document.getElementById('vs-human-btn').addEventListener('click', () => {
        window.gameMode = '2player';
        modeModal.style.display = 'none';
        instrModal.style.display = 'flex';
        document.getElementById('mode-label-display').textContent = '👥 MODE: 2 PLAYERS';
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        instrModal.style.display = 'none';
        document.getElementById('game-board').style.display = 'grid';
        initUI();
        setupActionMenu();
        setupCombatLog();
        setupCardIntel();
        createAIThinkingBadge();
        if (typeof startGameLoop === 'function') {
            startGameLoop();
        }
    });
});

// ── INIT ─────────────────────────────────────────────────────────────────────
function initUI() {
    renderResources('red');
    renderResources('blue');
    updateBoardVisuals();
}

// ── RESOURCE RENDERING ───────────────────────────────────────────────────────
// Maps UI colour ('red'/'blue') → faction key ('thailand'/'cambodia')
function factionKey(uiColor) {
    return uiColor === 'red' ? 'thailand' : 'cambodia';
}

function renderResources(uiColor) {
    const faction = factionKey(uiColor);
    const player   = gameState.players[faction];
    const powerId  = `${uiColor}-power-tracker`;
    const supplyId = `${uiColor}-supply-tracker`;
    const powerEl  = document.getElementById(powerId);
    const supplyEl = document.getElementById(supplyId);
    if (!powerEl || !supplyEl) return;

    // Remember old values to animate changes
    const oldPower  = parseInt(powerEl.dataset.value  || '0');
    const oldSupply = parseInt(supplyEl.dataset.value || '0');
    powerEl.dataset.value  = player.power;
    supplyEl.dataset.value = player.supply;

    _renderTracker(powerEl,  player.power,  10, 'circle',  'filled-power',  oldPower);
    _renderTracker(supplyEl, player.supply, 10, 'square', 'filled-supply', oldSupply);
}

function _renderTracker(container, value, max, shape, filledClass, oldValue) {
    // Only rebuild DOM if count changed
    const existing = container.querySelectorAll(`.${shape}`);
    if (existing.length !== max) {
        container.innerHTML = '';
        for (let i = 0; i < max; i++) {
            const el = document.createElement('div');
            el.classList.add(shape);
            if (i < value) el.classList.add(filledClass);
            container.appendChild(el);
        }
        return;
    }
    // Animate individual token changes
    const items = container.querySelectorAll(`.${shape}`);
    items.forEach((el, i) => {
        const shouldFill = i < value;
        const isFilled   = el.classList.contains(filledClass);
        if (shouldFill && !isFilled) {
            el.classList.add(filledClass);
            el.classList.remove('animate-drain');
            void el.offsetWidth;
            el.classList.add('animate-fill');
            setTimeout(() => el.classList.remove('animate-fill'), 400);
        } else if (!shouldFill && isFilled) {
            el.classList.add('animate-drain');
            setTimeout(() => {
                el.classList.remove(filledClass, 'animate-drain');
            }, 300);
        }
    });
}

// ── BOARD VISUALS ─────────────────────────────────────────────────────────────
function updateBoardVisuals() {
    // Update round counter
    const roundEl = document.getElementById('round-num');
    if (roundEl) roundEl.textContent = gameState.round;

    // Update HQ troops
    _renderTroops('red-hq-troops',  gameState.nodes.redCapital.occupants.thailand,  'thailand');
    _renderTroops('blue-hq-troops', gameState.nodes.blueCapital.occupants.cambodia, 'cambodia');

    // Update chance decks
    _renderChanceDeck('red-chance-deck',  gameState.players.thailand.hand[0]);
    _renderChanceDeck('blue-chance-deck', gameState.players.cambodia.hand[0]);

    // Update temples
    ['A', 'B', 'C'].forEach(id => {
        const node = gameState.nodes[id];
        const dom  = document.getElementById(`temple-${id.toLowerCase()}`);
        if (!dom) return;

        // Troops
        _renderTempleOccupants(id, node);

        // Flag / claim
        const flagEl = document.getElementById(`temple-${id.toLowerCase()}-flag`);
        if (flagEl) {
            if (node.claimant === 'thailand') flagEl.textContent = '🇹🇭';
            else if (node.claimant === 'cambodia') flagEl.textContent = '🇰🇭';
            else flagEl.textContent = '';
        }

        // Border / glow
        dom.classList.remove('claimed-thailand', 'claimed-cambodia', 'contested');
        if (node.state === 'Claimed' || (node.claimant && node.state === 'Occupied')) {
            dom.classList.add(node.claimant === 'thailand' ? 'claimed-thailand' : 'claimed-cambodia');
        } else if (node.state === 'Contested') {
            dom.classList.add('contested');
        }
    });

    // Status badges on capitals
    _updateStatusBadge('red-capital',  'thailand');
    _updateStatusBadge('blue-capital', 'cambodia');

    // Refresh resources for both
    renderResources('red');
    renderResources('blue');
}

function _renderTroops(containerId, count, faction) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const t = document.createElement('div');
        t.classList.add('troop', faction);
        t.textContent = faction === 'thailand' ? '⚔' : '⚔';
        el.appendChild(t);
    }
}

function _renderTempleOccupants(templeId, node) {
    const troopsEl = document.getElementById(`temple-${templeId.toLowerCase()}-troops`);
    if (!troopsEl) return;
    troopsEl.innerHTML = '';
    for (let i = 0; i < node.occupants.thailand; i++) {
        const t = document.createElement('div');
        t.classList.add('troop', 'thailand');
        t.textContent = '⚔';
        troopsEl.appendChild(t);
    }
    for (let i = 0; i < node.occupants.cambodia; i++) {
        const t = document.createElement('div');
        t.classList.add('troop', 'cambodia');
        t.textContent = '⚔';
        troopsEl.appendChild(t);
    }
}

function _renderChanceDeck(id, card) {
    const el = document.getElementById(id);
    if (!el) return;
    if (card) {
        el.innerHTML = `<strong>${card.name}</strong><span>${card.effect}</span>`;
    } else {
        el.innerHTML = `<span style="color:var(--text-dim)">No Card</span>`;
    }
}

function _updateStatusBadge(capitalId, faction) {
    const el = document.getElementById(capitalId);
    if (!el) return;
    let existing = el.querySelector('.status-badge');
    const isSanctioned = gameState.attackBan === faction;
    const isFrozen     = gameState.freezeDeployment[faction];

    if (isSanctioned || isFrozen) {
        if (!existing) { existing = document.createElement('div'); existing.classList.add('status-badge'); el.appendChild(existing); }
        if (isSanctioned) { existing.textContent = '⛔ SANCTIONED'; existing.className = 'status-badge badge-sanctioned'; }
        else { existing.textContent = '❄ FROZEN'; existing.className = 'status-badge badge-frozen'; }
    } else {
        if (existing) existing.remove();
    }
}

// ── VALID ACTIONS CALCULATOR ──────────────────────────────────────────────────
function getValidActions(faction) {
    const player  = gameState.players[faction];
    const capital = faction === 'thailand' ? gameState.nodes.redCapital : gameState.nodes.blueCapital;

    let canClaim = false;
    let canAttack = false;
    let hasContested = false;
    let totalInfantry = capital.occupants[faction];
    let canDeploy = false;

    Object.values(gameState.nodes).forEach(node => {
        if (node.type !== 'Temple') return;
        totalInfantry += node.occupants[faction];
        // Can claim: occupy a temple alone (no enemy), no existing claim by enemy
        if (node.occupants[faction] > 0 && node.occupants[_opponent(faction)] === 0 && node.claimant !== _opponent(faction)) {
            canClaim = true;
        }
        if (node.occupants.thailand > 0 && node.occupants.cambodia > 0) {
            hasContested = true;
        }
    });

    canAttack = hasContested && player.power >= 1 && gameState.attackBan !== faction;

    // Deploy: need supply, not frozen, and have troops somewhere that can advance
    const deploySources = _getDeploySources(faction);
    canDeploy = player.supply >= 1 && !gameState.freezeDeployment[faction] && deploySources.length > 0;

    // Repair: only if lostCombat is this faction, and has fewer than 3 total infantry
    const canRepair = gameState.lostCombat === faction && player.power >= 1 && player.supply >= 1 && totalInfantry < 3;

    return { canClaim, canAttack, canDeploy, canRepair };
}

function _opponent(faction) {
    return faction === 'thailand' ? 'cambodia' : 'thailand';
}

// Returns list of {from, to, cost} deploy moves available for a faction
function _getDeploySources(faction) {
    const moves = [];
    const isThailand = faction === 'thailand';

    // Deploy costs per edge: Thailand moves left-to-right (redCapital→A→B→C)
    // Cambodia moves right-to-left (blueCapital→C→B→A)
    // Cost: HQ→nearest temple = 2, any temple→next = 1
    const nodes   = gameState.nodes;
    const capital  = isThailand ? nodes.redCapital : nodes.blueCapital;

    if (isThailand) {
        if (capital.occupants.thailand > 0) {
            moves.push({ from: 'redCapital', to: 'A', cost: 2, label: 'HQ → Temple A' });
            moves.push({ from: 'redCapital', to: 'B', cost: 2, label: 'HQ → Temple B' });
            moves.push({ from: 'redCapital', to: 'C', cost: 3, label: 'HQ → Temple C' });
        }
        if (nodes.A.occupants.thailand > 0) {
            moves.push({ from: 'A', to: 'B', cost: 1, label: 'Temple A → Temple B' });
            moves.push({ from: 'A', to: 'C', cost: 2, label: 'Temple A → Temple C' });
        }
        if (nodes.B.occupants.thailand > 0) {
            moves.push({ from: 'B', to: 'C', cost: 1, label: 'Temple B → Temple C' });
            moves.push({ from: 'B', to: 'A', cost: 1, label: 'Temple B → Temple A' });
        }
        if (nodes.C.occupants.thailand > 0) {
            moves.push({ from: 'C', to: 'B', cost: 1, label: 'Temple C → Temple B' });
        }
    } else {
        if (capital.occupants.cambodia > 0) {
            moves.push({ from: 'blueCapital', to: 'C', cost: 2, label: 'HQ → Temple C' });
            moves.push({ from: 'blueCapital', to: 'B', cost: 2, label: 'HQ → Temple B' });
            moves.push({ from: 'blueCapital', to: 'A', cost: 3, label: 'HQ → Temple A' });
        }
        if (nodes.C.occupants.cambodia > 0) {
            moves.push({ from: 'C', to: 'B', cost: 1, label: 'Temple C → Temple B' });
            moves.push({ from: 'C', to: 'A', cost: 2, label: 'Temple C → Temple A' });
        }
        if (nodes.B.occupants.cambodia > 0) {
            moves.push({ from: 'B', to: 'A', cost: 1, label: 'Temple B → Temple A' });
            moves.push({ from: 'B', to: 'C', cost: 1, label: 'Temple B → Temple C' });
        }
        if (nodes.A.occupants.cambodia > 0) {
            moves.push({ from: 'A', to: 'B', cost: 1, label: 'Temple A → Temple B' });
        }
    }

    // Filter to what the player can afford & aren't moving troops that don't exist
    const supply = gameState.players[faction].supply;
    return moves.filter(m => {
        const sourceOcc = gameState.nodes[m.from].occupants[faction];
        return sourceOcc > 0 && m.cost <= supply;
    });
}
window._getDeploySources = _getDeploySources;

// ── PLAYER PROMPTS (return Promises) ─────────────────────────────────────────

// Show deploy target picker, resolves with {from,to,cost} or null (cancel)
window.promptDeployTarget = function(faction) {
    return new Promise(resolve => {
        const moves = _getDeploySources(faction);
        const modal  = document.getElementById('deploy-modal');
        const opts   = document.getElementById('deploy-options');
        const title  = document.getElementById('deploy-modal-title');
        const sub    = document.getElementById('deploy-modal-subtitle');

        title.textContent = 'Choose Deploy Target';
        sub.textContent   = `Supply available: ${gameState.players[faction].supply} · Cost shown per move`;
        opts.innerHTML    = '';

        const supply = gameState.players[faction].supply;

        moves.forEach(move => {
            const btn = document.createElement('button');
            btn.className = 'deploy-option-btn';
            btn.disabled  = move.cost > supply;
            btn.innerHTML = `<span>${move.label}</span><span class="deploy-cost-tag">${move.cost} Supply</span>`;
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(move);
            });
            opts.appendChild(btn);
        });

        document.getElementById('deploy-cancel-btn').onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };

        modal.style.display = 'flex';
    });
};

// Show claim target picker
window.promptClaimTarget = function(faction) {
    return new Promise(resolve => {
        const claimable = [];
        ['A','B','C'].forEach(id => {
            const node = gameState.nodes[id];
            if (node.occupants[faction] > 0 && node.occupants[_opponent(faction)] === 0) {
                claimable.push({ id, node });
            }
        });

        if (claimable.length === 0) { resolve(null); return; }
        if (claimable.length === 1) { resolve(claimable[0].id); return; }

        const modal = document.getElementById('claim-modal');
        const opts  = document.getElementById('claim-options');
        opts.innerHTML = '';

        claimable.forEach(({ id }) => {
            const btn = document.createElement('button');
            btn.className = 'deploy-option-btn';
            btn.innerHTML = `<span>Temple ${id}</span><span class="power-cost-tag">1 Power</span>`;
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(id);
            });
            opts.appendChild(btn);
        });

        document.getElementById('claim-cancel-btn').onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };
        modal.style.display = 'flex';
    });
};

// Show attack target picker
window.promptAttackTarget = function(faction) {
    return new Promise(resolve => {
        const contested = [];
        ['A','B','C'].forEach(id => {
            const node = gameState.nodes[id];
            if (node.occupants.thailand > 0 && node.occupants.cambodia > 0) {
                contested.push(id);
            }
        });

        if (contested.length === 0) { resolve(null); return; }
        if (contested.length === 1) { resolve(contested[0]); return; }

        const modal = document.getElementById('attack-modal');
        const opts  = document.getElementById('attack-options');
        opts.innerHTML = '';

        contested.forEach(id => {
            const node = gameState.nodes[id];
            const btn  = document.createElement('button');
            btn.className = 'deploy-option-btn';
            btn.innerHTML = `
                <span>Temple ${id} &nbsp;
                  <span style="color:var(--red-faction)">THA:${node.occupants.thailand}</span>
                  <span style="color:var(--blue-faction)"> CAM:${node.occupants.cambodia}</span>
                </span>
                <span class="power-cost-tag">1 Power</span>`;
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(id);
            });
            opts.appendChild(btn);
        });

        document.getElementById('attack-cancel-btn').onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };
        modal.style.display = 'flex';
    });
};

// ── DICE ROLL ANIMATION ───────────────────────────────────────────────────────
window.showDiceRoll = function(attackerFaction, defenderFaction, attackerRoll, defenderRoll) {
    return new Promise(resolve => {
        const modal        = document.getElementById('dice-modal');
        const atkDice      = document.getElementById('attacker-dice');
        const defDice      = document.getElementById('defender-dice');
        const atkLabel     = document.getElementById('attacker-label');
        const defLabel     = document.getElementById('defender-label');
        const resultEl     = document.getElementById('dice-result');
        const closeBtn     = document.getElementById('dice-close-btn');
        const titleEl      = document.getElementById('dice-title');

        atkLabel.textContent = attackerFaction === 'thailand' ? '🇹🇭 THAILAND' : '🇰🇭 CAMBODIA';
        defLabel.textContent = defenderFaction === 'thailand' ? '🇹🇭 THAILAND' : '🇰🇭 CAMBODIA';
        titleEl.textContent  = '⚔️ COMBAT ROLL';
        atkDice.textContent  = '?';
        defDice.textContent  = '?';
        atkDice.className    = 'dice';
        defDice.className    = 'dice';
        resultEl.textContent = '';
        closeBtn.style.display = 'none';
        modal.style.display  = 'flex';

        // Animate rolling for 1.2s then reveal
        atkDice.classList.add('rolling');
        defDice.classList.add('rolling');

        const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
        let tick = 0;
        const interval = setInterval(() => {
            atkDice.textContent = FACES[Math.floor(Math.random() * 6)];
            defDice.textContent = FACES[Math.floor(Math.random() * 6)];
            tick++;
        }, 80);

        setTimeout(() => {
            clearInterval(interval);
            atkDice.classList.remove('rolling');
            defDice.classList.remove('rolling');
            atkDice.textContent = attackerRoll;
            defDice.textContent = defenderRoll;

            if (attackerRoll > defenderRoll) {
                atkDice.classList.add('winner');
                defDice.classList.add('loser');
                resultEl.textContent = `${atkLabel.textContent} WINS THE ROLL!`;
            } else if (defenderRoll > attackerRoll) {
                defDice.classList.add('winner');
                atkDice.classList.add('loser');
                resultEl.textContent = `${defLabel.textContent} WINS THE ROLL!`;
            } else {
                resultEl.textContent = '🤝 TIE — Comparing Power resources…';
            }

            closeBtn.style.display = 'inline-block';
            closeBtn.onclick = () => {
                modal.style.display = 'none';
                resolve();
            };
        }, 1200);
    });
};

// ── 2-PLAYER PASS SCREEN ─────────────────────────────────────────────────────
window.showPassTurnScreen = function(nextFaction) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'pass-turn-overlay';
        const colorClass = nextFaction === 'thailand' ? 'red' : 'blue';
        const label = nextFaction === 'thailand' ? '🇹🇭 THAILAND' : '🇰🇭 CAMBODIA';
        overlay.innerHTML = `
            <div class="pass-turn-title ${colorClass}">${label}'S TURN</div>
            <div class="pass-turn-sub">Hand the device to the ${nextFaction === 'thailand' ? 'Thailand' : 'Cambodia'} player</div>
            <button class="pass-turn-btn">I'M READY →</button>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.pass-turn-btn').addEventListener('click', () => {
            overlay.remove();
            resolve();
        });
    });
};

// ── ACTION MENU ───────────────────────────────────────────────────────────────
function setupActionMenu() {
    const panel = document.createElement('div');
    panel.id = 'action-panel';
    panel.style.cssText = `
        position: fixed; right: 20px; top: 50%; transform: translateY(-50%);
        z-index: 100; display: flex; flex-direction: column;
        gap: 8px; min-width: 172px;
    `;
    document.body.appendChild(panel);

    let lastState = '';
    setInterval(() => {
        if (!gameState || !gameState.currentTurn) return;
        const faction  = gameState.currentTurn;
        const card     = gameState.players[faction]?.hand?.[0];
        const cardName = card ? card.name : 'No Card';
        const state    = window.isDefenderPhase ? `defend-${faction}` : `action-${faction}-${cardName}-${JSON.stringify(getValidActions(faction))}`;

        if (state === lastState) return;
        lastState = state;

        const valid = window.isDefenderPhase ? {} : getValidActions(faction);

        if (window.isDefenderPhase) {
            panel.innerHTML = `
                <h3 style="text-align:center; color:var(--red-faction); letter-spacing:2px; font-size:0.85rem; margin-bottom:4px;">⚔ DEFEND!</h3>
                <p class="status-note">Choose your response to the attack:</p>
                <button class="defend-engage" onclick="submitAction('Engage')">Engage in Battle</button>
                <button class="defend-retreat" onclick="submitAction('Retreat')">Retreat (costs 1 Power)</button>
            `;
        } else {
            const sanctioned = gameState.attackBan === faction ? ' ⛔' : '';
            const frozen     = gameState.freezeDeployment[faction] ? ' ❄' : '';
            panel.innerHTML = `
                <h3 style="text-align:center; letter-spacing:1px; font-size:0.85rem; margin-bottom:4px;">COMMANDS</h3>
                <p class="status-note">${faction === 'thailand' ? '🇹🇭 Thailand' : '🇰🇭 Cambodia'} · Round ${gameState.round}</p>
                <button onclick="submitAction('Deploy')" ${valid.canDeploy ? '' : 'disabled'}>Advance Forces${frozen}</button>
                <button onclick="submitAction('Claim')"  ${valid.canClaim ? '' : 'disabled'}>Claim Temple (1 P)</button>
                <button onclick="submitAction('Attack')" ${valid.canAttack ? '' : 'disabled'}>Attack (1 P)${sanctioned}</button>
                <button onclick="submitAction('Chance')" style="border-color:var(--power-color) !important; color:var(--power-color);">▶ ${cardName}</button>
                <button onclick="submitAction('Repair')" ${valid.canRepair ? '' : 'disabled'}>Repair (1P+1S)</button>
                <button onclick="submitAction('Pass')">Pass Turn</button>
            `;
        }
    }, 150);
}

window.submitAction = function(actionType) {
    if (window.resolveCurrentAction) {
        window.resolveCurrentAction(actionType);
        window.resolveCurrentAction = null;
    }
};

// ── COMBAT LOG ────────────────────────────────────────────────────────────────
function setupCombatLog() {
    const panel = document.createElement('div');
    panel.id = 'combat-log';
    panel.innerHTML = `<div id="log-header">COMMAND HISTORY</div><div id="log-content"></div>`;
    document.body.appendChild(panel);
}

window.addLogEntry = function(message, faction = 'system') {
    const content = document.getElementById('log-content');
    const panel   = document.getElementById('combat-log');
    if (!content) return;
    const entry = document.createElement('div');
    entry.classList.add('log-entry');
    if (faction === 'thailand') entry.classList.add('log-red');
    else if (faction === 'cambodia') entry.classList.add('log-blue');
    else entry.classList.add('log-system');
    entry.textContent = message;
    content.appendChild(entry);
    content.scrollTop = content.scrollHeight;
    if (panel) {
        panel.classList.remove('new-intel');
        void panel.offsetWidth;
        panel.classList.add('new-intel');
    }
};

// ── GAME OVER ─────────────────────────────────────────────────────────────────
window.showGameOver = function(message) {
    const overlay = document.createElement('div');
    overlay.className = 'gameover-overlay';
    overlay.innerHTML = `
        <div class="gameover-title">CONFLICT RESOLVED</div>
        <div class="gameover-msg">${message}</div>
        <button class="gameover-btn" onclick="location.reload()">Play Again</button>
    `;
    document.body.appendChild(overlay);
    const panel = document.getElementById('action-panel');
    if (panel) panel.style.display = 'none';
};

// ── ANIMATIONS ────────────────────────────────────────────────────────────────
window.playCombatAnimation = function(templeId) {
    const dom = document.getElementById(`temple-${templeId.toLowerCase()}`);
    if (!dom) return;
    dom.classList.add('combat-clash');
    setTimeout(() => dom.classList.remove('combat-clash'), 600);
};

window.triggerParticleExplosion = function(templeId, winnerColor) {
    const dom = document.getElementById(`temple-${templeId.toLowerCase()}`);
    if (!dom) return;
    const rect   = dom.getBoundingClientRect();
    const cx     = rect.left + rect.width / 2;
    const cy     = rect.top  + rect.height / 2;
    const color  = winnerColor === 'red' ? '#ff4757' : '#1e90ff';
    for (let i = 0; i < 22; i++) {
        const p   = document.createElement('div');
        p.classList.add('particle');
        p.style.backgroundColor = color;
        p.style.boxShadow = `0 0 8px ${color}`;
        p.style.left = `${cx}px`;
        p.style.top  = `${cy}px`;
        const angle    = Math.random() * Math.PI * 2;
        const distance = Math.random() * 90 + 40;
        p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 650);
    }
};

// ── CARD INTEL ────────────────────────────────────────────────────────────────
function setupCardIntel() {
    const btn = document.createElement('button');
    btn.id = 'card-intel-btn';
    btn.textContent = 'DATABASE: CARDS';
    document.body.appendChild(btn);

    const terminal = document.createElement('div');
    terminal.id = 'card-intel-terminal';
    terminal.innerHTML = `
        <h3>CLASSIFIED CHANCE DECK</h3>
        <div class="intel-entry"><strong>ASEAN Mediation</strong><span>Freeze opponent's troop deployment for 1 turn.</span></div>
        <div class="intel-entry"><strong>Border Closure</strong><span>Opponent loses 2 Power.</span></div>
        <div class="intel-entry"><strong>Historical Claim</strong><span>Gain +1 to your next combat roll.</span></div>
        <div class="intel-entry"><strong>UN Appeal</strong><span>Cost: 3 Power. Remove 1 opponent Infantry from any temple.</span></div>
        <div class="intel-entry"><strong>Media Victory</strong><span>Gain 2 Power immediately.</span></div>
        <div class="intel-entry"><strong>Sabotage</strong><span>Opponent loses 2 Supply.</span></div>
    `;
    document.body.appendChild(terminal);

    btn.addEventListener('click', () => {
        terminal.classList.toggle('active');
        if (terminal.classList.contains('active')) {
            btn.textContent = 'CLOSE DATABASE';
            btn.style.background = 'var(--power-color)';
            btn.style.color = 'var(--bg-color)';
        } else {
            btn.textContent = 'DATABASE: CARDS';
            btn.style.background = 'rgba(26,29,36,0.85)';
            btn.style.color = 'var(--power-color)';
        }
    });
}

// ── AI THINKING BADGE ─────────────────────────────────────────────────────────
function createAIThinkingBadge() {
    const badge = document.createElement('div');
    badge.id = 'ai-thinking';
    badge.textContent = '🤖 AI THINKING…';
    document.body.appendChild(badge);
}
window.setAIThinking = function(visible) {
    const el = document.getElementById('ai-thinking');
    if (el) el.style.display = visible ? 'block' : 'none';
    const panel = document.getElementById('action-panel');
    if (panel) {
        panel.style.opacity = visible ? '0.35' : '1';
        panel.style.pointerEvents = visible ? 'none' : 'auto';
    }
};
