# 🛕 Temple Border Clash

> A two-player (or solo vs AI) browser-based tactical strategy game inspired by the real Thailand–Cambodia border dispute over the **Preah Vihear Temple** — a UNESCO World Heritage Site that became a flashpoint for military standoffs and international diplomacy in the early 2000s.

---

<img width="1568" height="742" alt="image" src="https://github.com/user-attachments/assets/a61a9b6d-c5d9-424c-8a6a-e82e6e6c5be4" />


---

## 🎮 Overview

Temple Border Clash is a turn-based strategy game where two factions — **Thailand 🇹🇭 (Red)** and **Cambodia 🇰🇭 (Blue)** — compete for control of three contested border temples over 10 rounds. It blends resource management, tactical troop deployment, diplomatic card play, and risk-based dice combat into a tense showdown.

Play against the AI or pass the device between two players locally.

---

<img width="1568" height="746" alt="image" src="https://github.com/user-attachments/assets/72f0e190-8d79-4d21-8369-5c64fad6d9d9" />


---

## 🏆 Victory Conditions

| Type | Condition |
|---|---|
| 🏛️ **Diplomatic Victory** | Hold claims on at least **2 temples** after the opponent's turn |
| 💸 **Resource Victory** | Force the opponent to **0 Power or 0 Supply** at any point |
| ⚔️ **Military Victory** | Occupy **all 3 temples** simultaneously with no enemy presence |
| 🕊️ **Ceasefire Draw** | Neither side wins by Round 10 — most claimed temples wins; otherwise a stalemate |

---

## ⚙️ Turn Structure

Each turn has two phases:

### Phase 1 — Resource Phase (automatic)
- Gain **+1 Power** for every temple you have claimed with a flag
- If you control **zero temples**, gain **+1 Supply** instead

### Phase 2 — Action Phase (choose one)

| Command | Cost | Effect |
|---|---|---|
| **Advance Forces** | Supply (distance-based) | Move 1 infantry unit toward the enemy |
| **Claim Temple** | 1 Power | Plant your flag on a temple you occupy **alone** |
| **Attack** | 1 Power | Initiate dice combat at a **contested** temple |
| **Play Card** | Varies | Use your Chance card for a political or military effect |
| **Repair** | 1 Power + 1 Supply | Revive a destroyed unit *(only after losing combat)* |
| **Pass** | Free | Skip your action phase |

---

## 🗺️ The Board

The map is a linear chain of three temples — **A**, **B**, and **C** — connecting the two HQs:

```
THAILAND HQ ──── A ──── B ──── C ──── CAMBODIA HQ
```

Units advance one node at a time. Temples can be **Empty**, **Occupied**, **Contested**, or **Claimed**.

---

## 🚀 Deployment & Supply Costs

Supply cost is based on **distance travelled**:

| Move | Supply Cost |
|---|---|
| HQ → adjacent temple (A or C) | **2 Supply** |
| HQ → middle temple (B) | **2 Supply** |
| HQ → far temple (C or A) | **3 Supply** |
| Temple → adjacent temple | **1 Supply** |
| Temple → far temple (skipping one) | **2 Supply** |

You choose **exactly where** to send your troops each turn — no automatic movement.

---

## ⚔️ Combat System

When **Attack** is declared, the **defender** chooses:

- **Engage** — Both players roll a die. Highest roll wins the combat.
- **Retreat** — The defender's unit falls back to their HQ. Costs **1 Power**.

### Dice Roll
A live animated dice roll is shown on screen. The attacker and defender each roll a d6:

- **Higher roll wins** — the loser loses 1 infantry at that temple
- **Tie** — Power resources are compared; the faction with more Power wins
- **Power tie** — dice are re-rolled until a winner emerges

### After Combat
- The **loser** is eligible to use **Repair** on their next turn
- The **winner** is **sanctioned by the UN** and cannot attack on their very next turn

---

## ⚠️ UN Sanctions

If a unit is destroyed in combat, the UN intervenes:
- The **winning player cannot use Attack** on their next turn
- Movement, claiming, and card play remain permitted

---

## 🃏 Chance Card Database

| Card | Effect |
|---|---|
| **ASEAN Mediation** | Freeze opponent's troop deployment for 1 turn |
| **Border Closure** | Opponent loses 2 Power |
| **Historical Claim** | Gain +1 to your next combat roll |
| **UN Appeal** | Cost: 3 Power — Remove 1 opponent infantry from any temple |
| **Media Victory** | Gain 2 Power immediately |
| **Sabotage** | Opponent loses 2 Supply |

Each player holds one card at a time and draws a replacement after playing.

---

## 🎮 Game Modes

### 🤖 VS Bot
Play as **Thailand** against an AI-controlled **Cambodia**. The AI makes strategic decisions with a 1.2-second thinking delay for realism.

### 👥 2 Players (Pass & Play)
Both players share one device. A handoff screen is shown between turns so each player's card and resources remain private until it's their turn.

---

## 🚀 How to Run

1. Clone the repository:
```bash
git clone https://github.com/Aayx2hhh/Temple-Border-clash-game.git
cd Temple-Border-clash-game
```

2. Open `index.html` in your browser — no build step or server required.

> The game runs entirely in the browser using vanilla HTML, CSS, and JavaScript. No dependencies.

---

## 🛠️ Tech Stack

- **HTML / CSS / JavaScript** — vanilla, no frameworks
- **No external dependencies** — open `index.html` and play

### File Structure

| File | Purpose |
|---|---|
| `index.html` | Game layout, all modals (mode select, deploy, dice, etc.) |
| `style.css` | Dark tactical theme, animations, responsive layout |
| `UI.js` | All DOM rendering, player prompts, dice animation, board visuals |
| `game.js` | Game state, rules engine, turn loop, AI logic |

---

## 📖 Background & Inspiration

This game is loosely inspired by the **Preah Vihear Temple dispute** between Thailand and Cambodia — a real geopolitical conflict that escalated into armed border clashes in 2008–2011. The temple, awarded to Cambodia by the International Court of Justice in 1962, sits on a cliff along a contested border and became a symbol of national sovereignty for both nations.

The game mechanises the political, military, and resource dimensions of that conflict in an abstract, turn-based format.

---

## 📄 License

Open source — feel free to fork, modify, and build upon it.

---

*Made with strategy and spite.*
