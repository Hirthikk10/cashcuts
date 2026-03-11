// API Base URL
// If running locally, use localhost. Otherwise, use the deployed Render backend URL.
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocal 
    ? "http://127.0.0.1:8000/api" 
    : "https://cashcuts-backend.onrender.com"; // You will replace this once your Render app is created.

// DOM Elements
const sectionTeam = document.getElementById('section-team');
const mainFlow = document.getElementById('main-flow');
const displayTeamName = document.getElementById('display-team-name');
const btnChangeTeam = document.getElementById('btn-change-team');
const navBtnHistory = document.getElementById('nav-btn-history');

const teamNameInput = document.getElementById('team-name');
const teamPasscodeInput = document.getElementById('team-passcode');
const btnTeamAccess = document.getElementById('btn-team-access');
const teamError = document.getElementById('team-error');

const pNames = document.querySelectorAll('.p-name');
const pPutIns = document.querySelectorAll('.p-putin');
const totalPutInEl = document.getElementById('total-put-in');

const gotBackInput = document.getElementById('money-got-back');
const debtClearInput = document.getElementById('debt-clear');
const totalCutsSlider = document.getElementById('total-cuts');
const cutsDisplayStr = document.getElementById('cuts-display');
const cutsTargetEl = document.getElementById('cuts-target');

const cutsListEl = document.getElementById('cuts-list');
const cutsAssignedTally = document.getElementById('cuts-assigned-tally');
const cutsTotalTally = document.getElementById('cuts-total-tally');
const cutError = document.getElementById('cut-error');

const btnCalculate = document.getElementById('btn-calculate');
const sectionResults = document.getElementById('section-results');

const resWinLoss = document.getElementById('res-win-loss');
const resDebtCleared = document.getElementById('res-debt-cleared');
const resRemaining = document.getElementById('res-remaining');
const resValPerCut = document.getElementById('res-val-per-cut');
const payoutListContainer = document.getElementById('payout-list');
const btnSaveLog = document.getElementById('btn-save-log');
const saveStatus = document.getElementById('save-status');

// Drawer Elements
const drawerDashboard = document.getElementById('drawer-dashboard');
const btnCloseDrawer = document.getElementById('close-drawer');

// State
let currentTeamId = null;
let currentTeamName = null;
let playersConfig = []; // [{name, put_in, cuts_assigned, payout}]
let finalCalculation = null;

// ===================================================
// EVENT LISTENERS
// ===================================================

// Live update put in total
pPutIns.forEach(input => {
    input.addEventListener('input', calculateTotalPutIn);
});

// Sync slider
totalCutsSlider.addEventListener('input', (e) => {
    const v = e.target.value;
    cutsDisplayStr.innerText = `${v} Cut${v > 1 ? 's' : ''}`;
    cutsTargetEl.innerText = v;
    cutsTotalTally.innerText = v;
    renderCutsAssignment();
    checkCutsValidity();
});

// Update names in cut assignments when they type
pNames.forEach(input => {
    input.addEventListener('change', renderCutsAssignment);
});

btnTeamAccess.addEventListener('click', handleTeamAccess);
btnChangeTeam.addEventListener('click', () => {
    currentTeamId = null;
    currentTeamName = null;
    mainFlow.classList.add('hidden');
    sectionTeam.classList.remove('hidden');
    navBtnHistory.style.display = 'none';
});

btnCalculate.addEventListener('click', performFinalCalculation);

navBtnHistory.addEventListener('click', openDashboard);
btnCloseDrawer.addEventListener('click', () => drawerDashboard.classList.add('hidden'));

btnSaveLog.addEventListener('click', saveCalculationToBackend);

// ===================================================
// TEAM LOGIC
// ===================================================
async function handleTeamAccess() {
    const name = teamNameInput.value.trim();
    const passcode = teamPasscodeInput.value.trim();

    if (!name) {
        teamError.innerText = "Team name is required.";
        return;
    }

    teamError.innerText = "Connecting...";
    btnTeamAccess.disabled = true;

    try {
        // Try login first (or create logic depending on your backend approach, 
        // normally we try register and if it fails due to existing name, try login).
        // Let's implement an elegant auto-detect flow: Create -> fallback to login.
        
        let response = await fetch(`${API_BASE}/teams`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, passcode})
        });

        if (response.status === 400) {
            // Name exists, let's try logging in instead
            response = await fetch(`${API_BASE}/teams/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name, passcode})
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Login failed");
            }
        } else if (!response.ok) {
            throw new Error("Failed to create team");
        }

        const teamData = await response.json();
        currentTeamId = teamData.id;
        currentTeamName = teamData.name;

        // Success
        teamError.innerText = "";
        displayTeamName.innerText = currentTeamName;
        sectionTeam.classList.add('hidden');
        mainFlow.classList.remove('hidden');
        navBtnHistory.style.display = 'flex';

        renderCutsAssignment();

    } catch (err) {
        teamError.innerText = err.message;
    } finally {
        btnTeamAccess.disabled = false;
    }
}

// ===================================================
// CALCULATION LOGIC
// ===================================================

function calculateTotalPutIn() {
    let total = 0;
    pPutIns.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    totalPutInEl.innerText = `$${total.toFixed(2)}`;
    return total;
}

function renderCutsAssignment() {
    cutsListEl.innerHTML = '';
    
    // Determine active players (who have truthy names)
    playersConfig = [];
    for (let i = 0; i < 4; i++) {
        const name = pNames[i].value.trim();
        const putIn = parseFloat(pPutIns[i].value) || 0;
        if (name || putIn > 0) {
            playersConfig.push({ name: name || `Player ${i+1}`, putIn, cuts: 0, refIndex: i });
        }
    }

    playersConfig.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'cut-row';
        row.innerHTML = `
            <span>${p.name}</span>
            <div class="cut-controls">
                <button onclick="changeCut(${idx}, -1)">-</button>
                <span id="p-cut-${idx}">0</span>
                <button onclick="changeCut(${idx}, 1)">+</button>
            </div>
        `;
        cutsListEl.appendChild(row);
    });
    
    checkCutsValidity();
}

window.changeCut = function(playerIdx, delta) {
    let currentCut = playersConfig[playerIdx].cuts;
    let newCut = currentCut + delta;
    if (newCut < 0) newCut = 0;

    // Optional: Prevent going over total? We'll let them and show an error.
    playersConfig[playerIdx].cuts = newCut;
    document.getElementById(`p-cut-${playerIdx}`).innerText = newCut;
    
    checkCutsValidity();
}

function checkCutsValidity() {
    let totalAssigned = playersConfig.reduce((sum, p) => sum + p.cuts, 0);
    const targetCuts = parseInt(totalCutsSlider.value);
    
    cutsAssignedTally.innerText = totalAssigned;
    const tallyEl = cutsAssignedTally.parentElement;
    
    if (totalAssigned === targetCuts) {
        tallyEl.className = 'cuts-tally success';
        cutError.innerText = "";
        return true;
    } else {
        tallyEl.className = 'cuts-tally error';
        if (totalAssigned > targetCuts) {
            cutError.innerText = "Too many cuts assigned!";
        } else {
            cutError.innerText = `Missing ${targetCuts - totalAssigned} cut(s).`;
        }
        return false;
    }
}

function performFinalCalculation() {
    if (!checkCutsValidity()) return;

    const totalPutIn = calculateTotalPutIn();
    const moneyGotBack = parseFloat(gotBackInput.value) || 0;
    const debtToClear = parseFloat(debtClearInput.value) || 0;
    const totalCuts = parseInt(totalCutsSlider.value) || 1;

    let winLoss = moneyGotBack - totalPutIn;
    let actualDebtCleared = 0;
    let remainingMoney = 0;
    let valuePerCut = 0;

    if (winLoss < 0) {
        // It's a loss. No money split. Debt isn't cleared.
        resWinLoss.innerText = `Loss: $${Math.abs(winLoss).toFixed(2)}`;
        resWinLoss.className = 'loss';
        resDebtCleared.innerText = `$0.00`;
        resRemaining.innerText = `$0.00`;
        resValPerCut.innerText = `$0.00`;
        
        // Payouts are essentially 0 mapping
        playersConfig.forEach(p => p.payout = 0);
        
    } else {
        // It's a win
        resWinLoss.innerText = `Win: $${winLoss.toFixed(2)}`;
        resWinLoss.className = 'win';

        // Clear debt
        if (winLoss >= debtToClear) {
            actualDebtCleared = debtToClear;
            remainingMoney = winLoss - debtToClear;
        } else {
            actualDebtCleared = winLoss;
            remainingMoney = 0; // Debt reduced, but no money to split
        }

        resDebtCleared.innerText = `$${actualDebtCleared.toFixed(2)}`;
        resRemaining.innerText = `$${remainingMoney.toFixed(2)}`;

        // Split cuts
        valuePerCut = totalCuts > 0 ? (remainingMoney / totalCuts) : 0;
        resValPerCut.innerText = `$${valuePerCut.toFixed(2)}`;

        // Calculate payouts
        playersConfig.forEach(p => {
            p.payout = p.cuts * valuePerCut;
        });
    }

    // Render Payouts
    payoutListContainer.innerHTML = '';
    playersConfig.forEach(p => {
        const d = document.createElement('div');
        d.className = `payout-row ${p.payout > 0 ? 'positive' : 'zero'}`;
        d.innerHTML = `
            <span>${p.name} Gets:</span>
            <span>$${p.payout.toFixed(2)}</span>
        `;
        payoutListContainer.appendChild(d);
    });

    // Save state for backend posting
    finalCalculation = {
        total_put_in: totalPutIn,
        total_got_back: moneyGotBack,
        profit_loss: winLoss,
        debt_cleared: actualDebtCleared,
        players: playersConfig.map(p => ({
            name: p.name,
            put_in: p.putIn,
            cuts_assigned: p.cuts,
            payout: p.payout
        }))
    };

    sectionResults.classList.remove('hidden');
    // Scroll to results
    sectionResults.scrollIntoView({ behavior: 'smooth' });
    saveStatus.innerText = "";
    saveStatus.style.color = 'inherit';
}

// ===================================================
// BACKEND SAVING & DASHBOARD
// ===================================================

async function saveCalculationToBackend() {
    if (!currentTeamId || !finalCalculation) {
        saveStatus.innerText = "Error: Missing team or calculation data.";
        return;
    }

    btnSaveLog.disabled = true;
    saveStatus.innerText = "Saving...";

    try {
        const response = await fetch(`${API_BASE}/teams/${currentTeamId}/calculations`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalCalculation)
        });

        if (!response.ok) throw new Error("Failed to save.");
        
        saveStatus.style.color = 'var(--success)';
        saveStatus.innerText = "Saved successfully! View in history.";
        btnSaveLog.style.display = 'none'; // Hide button after save
    } catch (err) {
        saveStatus.style.color = 'var(--danger)';
        saveStatus.innerText = "Error saving: " + err.message;
        btnSaveLog.disabled = false;
    }
}

async function openDashboard() {
    if (!currentTeamId) return;
    drawerDashboard.classList.remove('hidden');

    try {
        // Fetch summary
        const sumResp = await fetch(`${API_BASE}/teams/${currentTeamId}/summary`);
        const summary = await sumResp.json();
        const wProfit = document.getElementById('stat-weekly');
        const mProfit = document.getElementById('stat-monthly');
        
        wProfit.innerText = `$${summary.weekly_profit_loss.toFixed(2)}`;
        wProfit.style.color = summary.weekly_profit_loss >= 0 ? 'var(--success)' : 'var(--danger)';
        
        mProfit.innerText = `$${summary.monthly_profit_loss.toFixed(2)}`;
        mProfit.style.color = summary.monthly_profit_loss >= 0 ? 'var(--success)' : 'var(--danger)';

        // Fetch history
        const histResp = await fetch(`${API_BASE}/teams/${currentTeamId}/history?limit=10`);
        const historyData = await histResp.json();
        
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        if (historyData.length === 0) {
            historyList.innerHTML = `<div class="empty-state">No cuts yet!</div>`;
        } else {
            historyData.forEach(h => {
                const isWin = h.profit_loss >= 0;
                const d = new Date(h.date).toLocaleDateString();
                const card = document.createElement('div');
                card.className = 'history-card';
                card.innerHTML = `
                    <div class="history-date">${d} • Got back: $${h.total_got_back}</div>
                    <div class="history-grid">
                        <span>Result:</span>
                        <span class="${isWin ? 'history-profit' : 'history-loss'}">
                            ${isWin ? '+' : ''}$${h.profit_loss.toFixed(2)}
                        </span>
                    </div>
                `;
                historyList.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Dashboard error:", error);
    }
}
