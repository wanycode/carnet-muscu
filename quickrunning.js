/* ============================================================
   RUNNING — course à pied
   Enregistre des sorties (distance, durée, note), calcule les
   stats globales (distance, allure, records) et affiche un
   graphique de distance par semaine + l'historique.
   Data : data.runs = [{ id, date: "YYYY-MM-DD", distanceKm,
                        durationMin, note }]
   ============================================================ */

// Allure en min/km → "5'12\"" / "38'\""
function formatRunPace(paceMinPerKm){
    if(!isFinite(paceMinPerKm) || paceMinPerKm <= 0) return "—";
    const total = Math.round(paceMinPerKm * 60);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${min}'${String(sec).padStart(2, "0")}"`;
}

// Format durée en minutes → "42 min" / "1 h 05"
function formatRunDuration(min){
    if(!min || min <= 0) return "—";
    if(min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

function getRunSorts(){
    return [...(data.runs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function computeRunStats(){
    const runs = getRunSorts();
    let totalKm = 0, totalMin = 0, longest = 0;
    let bestPace = Infinity;
    runs.forEach(run => {
        const km = Number(run.distanceKm) || 0;
        const min = Number(run.durationMin) || 0;
        totalKm += km;
        totalMin += min;
        if(km > longest) longest = km;
        if(km > 0 && min > 0){
            const pace = min / km;
            if(pace < bestPace) bestPace = pace;
        }
    });
    return {
        runs,
        totalKm,
        totalMin,
        longest,
        avgPace: totalKm > 0 ? totalMin / totalKm : 0,
        bestPace: isFinite(bestPace) ? bestPace : 0
    };
}

function getWeekMonday(anchor){
    const a = anchor ? new Date(anchor) : new Date();
    const day = (a.getDay() + 6) % 7; // lundi = 0
    return new Date(a.getFullYear(), a.getMonth(), a.getDate() - day, 12, 0, 0);
}

function renderRunning(){
    if(!document.getElementById("running")) return;
    renderRunGhost();
    const { runs, totalKm, totalMin, longest, avgPace, bestPace } = computeRunStats();

    const set = (id, text) => {
        const el = document.getElementById(id);
        if(el) el.textContent = text;
    };

    // Stats globales
    set("runTotalDistance", formatNumber(totalKm) + " km");
    set("runTotalCount", runs.length);
    set("runAvgPace", avgPace > 0 ? formatRunPace(avgPace) + "/km" : "—");
    set("runBestPace", bestPace > 0 ? formatRunPace(bestPace) + "/km" : "—");
    set("runTotalTime", formatRunDuration(totalMin));
    set("runLongest", longest > 0 ? formatNumber(longest) + " km" : "—");

    // Semaine et mois courants
    const now = new Date();
    const monday = getWeekMonday(now);
    let weekKm = 0, monthKm = 0;
    runs.forEach(run => {
        const d = new Date(run.date + "T12:00:00");
        if(d >= monday) weekKm += Number(run.distanceKm) || 0;
        if(d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()){
            monthKm += Number(run.distanceKm) || 0;
        }
    });
    set("runWeekDistance", formatNumber(weekKm) + " km");
    set("runMonthDistance", formatNumber(monthKm) + " km");

    renderRunWeekChart();
    renderRunHistory();
}

// Graphique en barres : distance par semaine (8 dernières semaines)
function renderRunWeekChart(){
    const container = document.getElementById("runWeekChart");
    if(!container) return;

    const runs = data.runs || [];
    if(runs.length === 0){
        container.innerHTML = '<div class="empty">Ajoute des sorties pour voir ta progression.</div>';
        return;
    }

    // 8 semaines, semaine courante incluse
    const weeks = [];
    const monday = getWeekMonday(new Date());
    for(let i = 7; i >= 0; i--){
        const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7, 12, 0, 0);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 12, 0, 0);
        let km = 0;
        runs.forEach(run => {
            const d = new Date(run.date + "T12:00:00");
            if(d >= start && d < end) km += Number(run.distanceKm) || 0;
        });
        weeks.push({
            label: start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
            km,
            isCurrent: i === 0
        });
    }
    const maxKm = Math.max(...weeks.map(w => w.km), 1);

    container.innerHTML = weeks.map(w => {
        const h = Math.max(2, Math.round((w.km / maxKm) * 100));
        return `
            <div class="run-week-col${w.isCurrent ? " current" : ""}" title="${w.label} : ${formatNumber(w.km)} km">
                <div class="run-week-bar-wrap">
                    <i class="run-week-bar" style="height:${h}%"></i>
                </div>
                <span class="run-week-label">${w.label}</span>
                <span class="run-week-value">${w.km > 0 ? formatNumber(w.km) : ""}</span>
            </div>
        `;
    }).join("");
}

function renderRunHistory(){
    const container = document.getElementById("runHistory");
    if(!container) return;

    const runs = getRunSorts();
    if(runs.length === 0){
        container.innerHTML = '<div class="empty">Aucune sortie enregistrée.</div>';
        return;
    }

    container.innerHTML = runs.map(run => {
        const km = Number(run.distanceKm) || 0;
        const min = Number(run.durationMin) || 0;
        const pace = km > 0 && min > 0 ? formatRunPace(min / km) + "/km" : "—";
        const dateLabel = new Date(run.date + "T12:00:00").toLocaleDateString("fr-FR", {
            weekday: "short", day: "numeric", month: "short", year: "numeric"
        });
        return `
            <div class="run-history-item" data-run-id="${run.id}">
                <div class="run-history-main">
                    <b>${formatNumber(km)} km</b>
                    <span class="run-history-date">${dateLabel}</span>
                </div>
                <div class="run-history-meta">
                    <span>⏱ ${min > 0 ? Math.round(min) + " min" : "—"}</span>
                    <span class="run-history-pace">${pace}</span>
                    ${run.note ? `<span class="run-history-note">${escapeHtml(run.note)}</span>` : ""}
                </div>
                <button type="button" class="delete run-delete" title="Supprimer cette sortie">Supprimer</button>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".run-delete").forEach(btn => {
        btn.addEventListener("click", () => {
            const item = btn.closest(".run-history-item");
            const id = Number(item.dataset.runId);
            const run = (data.runs || []).find(r => r.id === id);
            if(!run) return;
            const label = new Date(run.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            if(!confirm(`Supprimer la sortie du ${label} (${formatNumber(run.distanceKm)} km) ?`)) return;
            data.runs = (data.runs || []).filter(r => r.id !== id);
            saveData();
            renderRunning();
            if(typeof renderCalendar === "function") renderCalendar();
        });
    });
}

// ============ DASHBOARD : résumé Running ============
function renderRunDashboard(){
    const card = document.getElementById("runDashCard");
    if(!card) return;
    const runs = data.runs || [];
    if(!runs.length){
        card.style.display = "none";
        return;
    }
    card.style.display = "";
    const set = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };

    // Cette semaine
    const now = new Date();
    const monday = getWeekMonday(now);
    let weekKm = 0, weekCount = 0, totalKm = 0, bestPace = Infinity;
    runs.forEach(run => {
        const km = Number(run.distanceKm) || 0;
        const min = Number(run.durationMin) || 0;
        totalKm += km;
        const d = new Date(run.date + "T12:00:00");
        if(!isNaN(d) && d >= monday){ weekKm += km; weekCount++; }
        if(km > 0 && min > 0){ const p = min / km; if(p < bestPace) bestPace = p; }
    });
    set("runDashWeekKm", formatNumber(weekKm) + " km");
    set("runDashCount", weekCount);
    set("runDashTotal", formatNumber(totalKm) + " km");
    set("runDashBestPace", isFinite(bestPace) ? formatRunPace(bestPace) + "/km" : "—");
}

// ============ GHOST COURSE : dernière sortie vs sortie passée similaire ============
function computeRunGhostBattles(){
    const runs = (data.runs || [])
        .filter(r => (Number(r.distanceKm) || 0) > 0 && (Number(r.durationMin) || 0) > 0)
        .sort((a, b) => new Date(a.date + "T12:00:00") - new Date(b.date + "T12:00:00"));
    const battles = [];
    for(let i = 1; i < runs.length; i++){
        const cur = runs[i];
        const curKm = Number(cur.distanceKm);
        const curPace = Number(cur.durationMin) / curKm;
        // Sortie passée la plus proche en distance (±25 %), sinon la plus proche absolue
        let ghost = null, bestScore = Infinity;
        for(let j = i - 1; j >= 0; j--){
            const prev = runs[j];
            const diff = Math.abs(Number(prev.distanceKm) - curKm);
            const within = diff <= curKm * 0.25;
            const score = within ? diff - curKm * 0.5 : diff + curKm;
            if(score < bestScore){ bestScore = score; ghost = prev; }
        }
        if(!ghost) continue;
        const ghostPace = Number(ghost.durationMin) / Number(ghost.distanceKm);
        const tol = curPace * 0.005;
        const status = curPace < ghostPace - tol ? "win" : curPace > ghostPace + tol ? "loss" : "tie";
        battles.push({
            date: cur.date,
            distanceKm: curKm,
            durationMin: Number(cur.durationMin),
            pace: curPace,
            ghostDate: ghost.date,
            ghostPace: ghostPace,
            status: status
        });
    }
    return battles.reverse(); // plus récent d'abord
}

function runGhostBattleHTML(b, expanded){
    const statusTxt = b.status === "win" ? "Tu es plus rapide" : b.status === "loss" ? "Le fantôme gagne" : "Égalité";
    const d1 = new Date(b.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const d2 = new Date(b.ghostDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    let html = '<div class="run-ghost-battle ' + b.status + '">';
    html += '<div class="run-ghost-battle-head">';
    html += '  <span class="run-ghost-battle-name">🏃 ' + formatNumber(b.distanceKm) + ' km · ' + formatRunPace(b.pace) + '/km</span>';
    html += '  <span class="run-ghost-battle-meta">' + d1 + ' vs ' + d2 + '</span>';
    html += '</div>';
    html += '<div class="run-ghost-battle-score">';
    html += '  <span><b>Toi</b> ' + formatRunPace(b.pace) + '/km</span>';
    html += '  <span><b>Fantôme</b> ' + formatRunPace(b.ghostPace) + '/km</span>';
    html += '  <span class="run-ghost-battle-verdict ' + b.status + '">' + statusTxt + '</span>';
    html += '</div>';
    if(expanded && b.distanceKm){
        html += '<div class="run-ghost-detail"><span>Distance : <b>' + formatNumber(b.distanceKm) + ' km</b></span><span>Durée : <b>' + Math.round(b.durationMin) + ' min</b></span></div>';
    }
    html += '</div>';
    return html;
}

function renderRunGhost(){
    const card = document.getElementById("runGhostCard");
    const content = document.getElementById("runGhostContent");
    if(!card || !content) return;
    const battles = computeRunGhostBattles();
    if(!battles.length){
        card.style.display = "none";
        return;
    }
    card.style.display = "";
    const wins = battles.filter(b => b.status === "win").length;
    const losses = battles.filter(b => b.status === "loss").length;
    const rate = (wins + losses) > 0 ? Math.round(100 * wins / (wins + losses)) : 0;
    const recent = battles[0];
    let html = '<div class="run-ghost-hero">';
    html += '  <div class="ghost-stat big"><b>' + rate + '%</b><span>win rate</span></div>';
    html += '  <div class="ghost-stat"><b>' + battles.length + '</b><span>duels</span></div>';
    html += '  <div class="ghost-stat win"><b>' + wins + '</b><span>gagnés</span></div>';
    html += '  <div class="ghost-stat loss"><b>' + losses + '</b><span>perdus</span></div>';
    html += '</div>';
    html += '<div style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:4px 0 8px;">📅 Dernier duel</div>';
    html += runGhostBattleHTML(recent, true);
    if(battles.length > 1){
        html += '<div style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px;">📜 Derniers duels</div>';
        battles.slice(1, 6).forEach(b => { html += runGhostBattleHTML(b, false); });
    }
    content.innerHTML = html;
}

function initRunForm(){
    const dateInput = document.getElementById("runDate");
    if(dateInput && !dateInput.value) dateInput.value = getTodayDateInputValue();

    const saveBtn = document.getElementById("saveRun");
    if(saveBtn && !saveBtn.__runBound){
        saveBtn.__runBound = true;
        saveBtn.addEventListener("click", () => {
            const date = document.getElementById("runDate")?.value;
            const km = parseFloat(String(document.getElementById("runDistance")?.value || "").replace(",", "."));
            const min = parseFloat(String(document.getElementById("runDuration")?.value || "").replace(",", "."));
            const note = (document.getElementById("runNote")?.value || "").trim();

            if(!date){ alert("Choisis une date pour la sortie."); return; }
            if(!km || km <= 0){ alert("Entre une distance valide (en km)."); return; }
            if(!min || min <= 0){ alert("Entre une durée valide (en minutes)."); return; }

            if(!Array.isArray(data.runs)) data.runs = [];
            data.runs.push({ id: Date.now(), date, distanceKm: km, durationMin: min, note });
            saveData();

            document.getElementById("runDistance").value = "";
            document.getElementById("runDuration").value = "";
            document.getElementById("runNote").value = "";
            dateInput.value = getTodayDateInputValue();

            renderRunning();
            if(typeof renderCalendar === "function") renderCalendar();
            alert("Sortie enregistrée 🏃");
        });
    }

    const cancelBtn = document.getElementById("cancelRun");
    if(cancelBtn && !cancelBtn.__runBound){
        cancelBtn.__runBound = true;
        cancelBtn.addEventListener("click", () => { showPage("dashboard"); });
    }

    const quickAdd = document.getElementById("quickAddRun");
    if(quickAdd && !quickAdd.__runBound){
        quickAdd.__runBound = true;
        quickAdd.addEventListener("click", () => {
            const card = document.getElementById("runFormCard");
            if(card) card.scrollIntoView({ behavior: "smooth", block: "start" });
            const d = document.getElementById("runDate");
            if(d) setTimeout(() => d.focus({ preventScroll: true }), 300);
        });
    }
}

function initRunning(){
    initRunForm();
    renderRunning();
    renderRunDashboard();
}

document.addEventListener("DOMContentLoaded", initRunning);
