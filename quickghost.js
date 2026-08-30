/* ============================================================
   QUICK GHOST — affronte tes séances passées, série par série
   ============================================================ */
(function(){
    "use strict";

    // ---------- Helpers ----------
    function norm(name){
        return String(name || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // strip accents (matches app.js normalizeExerciseName)
            .replace(/[^a-z0-9]/g, "");      // alphanumeric only
    }

    function safeDate(s){
        if(!s) return null;
        if(s instanceof Date) return isFinite(s.getTime()) ? s : null;
        if(typeof s === "string"){
            var t = Date.parse(s);
            return isFinite(t) ? new Date(t) : null;
        }
        return null;
    }

    function dayDiff(a, b){
        var da = safeDate(a), db = safeDate(b);
        if(!da || !db) return null;
        return Math.max(0, Math.round(Math.abs(da.getTime() - db.getTime()) / 86400000));
    }

    function todayStr(){
        var d = new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        var da = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + da;
    }

    function isComparableType(t){
        return t === "weight" || t === "time" || t === "elastic";
    }

    function unitFor(type){
        if(type === "time") return "s";
        if(type === "elastic") return "";
        return "kg";
    }

    function setVolume(s, type){
        var w = Number(s && s.weight) || 0;
        var r = Number(s && s.reps) || 0;
        if(type === "elastic" && w === 0) w = 1;
        return w * r;
    }

    function cleanSets(rawSets){
        if(!Array.isArray(rawSets)) return [];
        return rawSets
            .filter(function(s){ return s && !s.isDropSet; })
            .map(function(s){ return { weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }; })
            .filter(function(s){ return s.weight > 0 && s.reps > 0; });
    }

    function compareSet(mine, theirs, type){
        if(!mine || !theirs) return null;
        var myV = setVolume(mine, type);
        var ghV = setVolume(theirs, type);
        var diffW = mine.weight - theirs.weight;
        var diffR = mine.reps - theirs.reps;
        var denom = Math.max(ghV, 1);
        if(myV > ghV + 0.0001) return { status: "win", diffW: diffW, diffR: diffR, diffPct: ((myV - ghV) / denom) * 100 };
        if(myV < ghV - 0.0001) return { status: "loss", diffW: diffW, diffR: diffR, diffPct: ((myV - ghV) / denom) * 100 };
        // Volumes tied → tie-break on reps
        if(diffR > 0) return { status: "win", diffW: diffW, diffR: diffR, diffPct: 0 };
        if(diffR < 0) return { status: "loss", diffW: diffW, diffR: diffR, diffPct: 0 };
        return { status: "tie", diffW: 0, diffR: 0, diffPct: 0 };
    }

    function fmtDateFR(s){
        var d = safeDate(s);
        if(!d) return "?";
        var months = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
        return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
    }

    function fmtShortFR(s){
        var d = safeDate(s);
        if(!d) return "?";
        var months = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
        return d.getDate() + " " + months[d.getMonth()];
    }

    function buildDataRef(){
        if(typeof data !== "undefined" && data && (Array.isArray(data.sessions) || Array.isArray(data.program))) return data;
        try {
            var raw = localStorage.getItem("carnetMuscuData");
            if(raw) return JSON.parse(raw);
        } catch(_){}
        return null;
    }

    function escapeSafe(s){
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function levenshtein(a, b){
        if(a === b) return 0;
        if(!a) return b.length;
        if(!b) return a.length;
        var m = [];
        for(var i = 0; i <= b.length; i++){ m[i] = [i]; }
        for(var j = 0; j <= a.length; j++){ m[0][j] = j; }
        for(var i = 1; i <= b.length; i++){
            for(var j = 1; j <= a.length; j++){
                m[i][j] = b.charAt(i-1) === a.charAt(j-1) ? m[i-1][j-1] : Math.min(m[i-1][j-1] + 1, m[i][j-1] + 1, m[i-1][j] + 1);
            }
        }
        return m[b.length][a.length];
    }

    // Score de similarité 0..1 entre deux noms normalisés.
    // Utilisé pour ne JAMAIS associer deux exercices différents qui ne
    // partagent qu'un préfixe court (ex: "Curl barre" vs "Curl machine" →
    // préfixe 4 "curl" ne suffit pas à matcher).
    function matchScore(a, b){
        if(!a || !b) return 0;
        if(a === b) return 1;
        var maxLen = Math.max(a.length, b.length);
        if(maxLen < 4) return 0;
        var sim = 1 - levenshtein(a, b) / maxLen;
        // Bonus préfixe : si l'un commence par l'autre ET que le préfixe est
        // assez long (>= 5), on considère que c'est le même exercice
        // (ex: "developpecouche" vs "developpecoucheincline" → non, mais
        //  "developpecouche" vs "developpe couche" → après normalisation c'est direct).
        var shorter = Math.min(a.length, b.length);
        if(shorter >= 5 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)){
            sim = Math.max(sim, 0.85);
        }
        return sim;
    }

    function findBestGhost(direct, candidates, priorMap){
        // Stratégie : exact → score de similarité pondéré (jamais de préfixe 3-4 lettres).
        if(!direct || !candidates || !candidates.length) return null;
        if(priorMap[direct]) return { match: priorMap[direct], via: "direct" };
        var best = null, bestScore = 0.72; // seuil : on refuse les matches douteux
        for(var i = 0; i < candidates.length; i++){
            var c = candidates[i];
            if(!c || !c.norm) continue;
            var score = matchScore(direct, c.norm);
            if(score > bestScore){
                bestScore = score;
                best = c;
            }
        }
        if(best) return { match: priorMap[best.norm] || null, via: "fuzzy(" + Math.round(bestScore * 100) + "%)" };
        return null;
    }
    // Map<normalized exercise name> -> ghost session info
    function buildPriorMap(){
        var map = {};
        // app.js déclare `let data = {...}` au top-level de son script. EN JS,
        // `let` au top-level NE BIND PAS sur window (contrairement à `var`).
        // Donc `data` est toujours undefined. On regarde directement la
        // variable (script-scope partagé entre classic scripts) puis on fallback
        // sur localStorage si app.js n'a pas chargé.
        var dataRef;
        if(typeof data !== "undefined" && data && Array.isArray(data.sessions)){
            dataRef = data;
        } else {
            try {
                var raw = localStorage.getItem("carnetMuscuData");
                if(raw) dataRef = JSON.parse(raw);
            } catch(e){ dataRef = null; }
        }
        if(!dataRef || !Array.isArray(dataRef.sessions)){
            if(typeof console !== "undefined") console.warn("[GHOST] buildPriorMap: data.sessions not available");
            return map;
        }
        var dateInputEl = document.getElementById("sessionDate");
        var today = (dateInputEl && dateInputEl.value) || todayStr();
        var sessionsToScan = dataRef.sessions;
        var sorted = sessionsToScan.slice().sort(function(a,b){
            return (safeDate(b.date) ? safeDate(b.date).getTime() : 0) - (safeDate(a.date) ? safeDate(a.date).getTime() : 0);
        });
        if(typeof console !== "undefined"){
            console.log("[GHOST] buildPriorMap for today =", today, "| total sessions =", sorted.length);
        }
        var debugStats = { skipped_empty: 0, skipped_type: 0, skipped_nosets: 0, added: 0 };
        // Track all unique exercise names for fuzzy matching later
        var allCandidateKeys = [];
        for(var i = 0; i < sorted.length; i++){
            var s = sorted[i];
            if(!s || !s.exercises) { debugStats.skipped_empty++; continue; }
            // Date of this prior session. Deliberately do NOT skip today's session.
            var sDateInput = s.date;
            for(var j = 0; j < s.exercises.length; j++){
                var ex = s.exercises[j];
                if(!ex || !ex.name) { debugStats.skipped_empty++; continue; }
                var type = ex.type || "weight";
                if(!isComparableType(type)) { debugStats.skipped_type++; continue; }
                var key = norm(ex.name);
                if(map[key]) continue;
                var cleaned = cleanSets(ex.sets);
                if(!cleaned.length){
                    debugStats.skipped_nosets++;
                    if(typeof console !== "undefined"){
                        console.log("[GHOST]   ⚠ skipped '" + ex.name + "' — cleanSets returned [] (sets:", JSON.stringify(ex.sets || []) + ")");
                    }
                    continue;
                }
                map[key] = {
                    sessionDate: sDateInput,
                    sessionName: s.name || sDateInput || "",
                    dayAgo: dayDiff(today, sDateInput),
                    type: type,
                    sets: cleaned,
                    _rawName: ex.name
                };
                debugStats.added++;
                allCandidateKeys.push({ norm: key, raw: ex.name });
                // Alias : indexer aussi sous norm(ex.exerciseKey) si différent. Explication :
                // app.js écrit `exerciseKey: nameInput?.dataset.exerciseKey || normalizeExerciseName(name)`
                // à chaque sauvegarde (line 2452 app.js). Si l'utilisateur a retapé le nom
                // dans l'input ("DC" au lieu de "Développé couché"), ex.name devient "DC"
                // mais ex.exerciseKey reste "developpecouche". Sans cet alias, on rate le
                // matching côté historique. map[aliasKey] partage la même référence.
                var aliasKey = norm(ex.exerciseKey);
                if(aliasKey && aliasKey !== key && !map[aliasKey]){
                    map[aliasKey] = Object.assign({}, map[key]);
                    allCandidateKeys.push({ norm: aliasKey, raw: ex.name });
                }
            }
        }
        buildPriorMap._allCandidates = allCandidateKeys;
        if(typeof console !== "undefined"){
            console.log("[GHOST] buildPriorMap done:", Object.keys(map).length, "exercises |", JSON.stringify(debugStats), "| total candidates:", allCandidateKeys.length);
        }
        return map;
    }

    // ---------- Per-set snapshot from DOM ----------
    function readCurrentSets(block){
        var nameInput = block.querySelector("input.exercise-name");
        var name = nameInput ? nameInput.value : "";
        var table = block.querySelector("table.exercise-table");
        if(!table) return { name: name, type: "weight", sets: [] };
        var type = table.dataset.type || "weight";
        var rows = Array.from(table.querySelectorAll("tr[data-set-index]"));
        var sets = [];
        rows.forEach(function(r){
            if(r.classList.contains("dropset-row")) return; // ignore drop sets
            var wEl = r.querySelector(".set-weight");
            var rEl = r.querySelector(".set-reps");
            var w = wEl ? Number(wEl.value) : NaN;
            var rep = rEl ? Number(rEl.value) : NaN;
            if(isFinite(w) && isFinite(rep) && w > 0 && rep > 0){
                sets.push({ weight: w, reps: rep });
            }
        });
        return { name: name, type: type, sets: sets };
    }

    // ---------- Render ghost card ----------
    function renderCardInto(div, ghost, current){
        if(!div) return;
        var type = (current && current.type) || (ghost && ghost.type) || "weight";
        var unit = unitFor(type);
        var wins = 0, losses = 0, ties = 0;
        var mySets = (current && current.sets) || [];

        if(!ghost){
            var label = mySets.length
                ? "👻 Nouvel exercice : pas encore de fantôme à affronter"
                : "👻 Le fantôme apparaîtra quand tu auras des sets saisis";
            div.innerHTML = '<div class="ghost-card-inner ghost-empty">' + label + '</div>';
            return;
        }

        var headLine = '👻 <strong>Fantôme</strong> · il y a ' + (ghost.dayAgo == null ? "?" : ghost.dayAgo) + ' jour'
            + ((ghost.dayAgo != null && ghost.dayAgo > 1) ? "s" : "")
            + ' · ' + escapeSafe(ghost.sessionName || "");
        var maxLen = Math.max(mySets.length, ghost.sets.length);
        var rowsHtml = "";
        for(var i = 0; i < maxLen; i++){
            var mine = mySets[i];
            var theirs = ghost.sets[i];
            if(mine && theirs){
                var cmp = compareSet(mine, theirs, type);
                var st = cmp ? cmp.status : "tie";
                if(st === "win") wins++;
                else if(st === "loss") losses++;
                else ties++;
                var signW = cmp.diffW > 0 ? "+" : "";
                var signR = cmp.diffR > 0 ? "+" : "";
                var deltaTxt = "";
                if(cmp.diffW !== 0) deltaTxt += ' ' + (cmp.diffW > 0 ? "+" : "") + cmp.diffW + unit;
                if(cmp.diffR !== 0) deltaTxt += ' ' + (cmp.diffR > 0 ? "+" : "") + cmp.diffR + " reps";
                var icon = st === "win" ? "✅" : st === "loss" ? "❌" : "≈";
                rowsHtml += '<div class="ghost-row ghost-' + st + '">'
                    + '<span class="ghost-set-label">S' + (i + 1) + '</span>'
                    + '<span class="ghost-line">'
                    +     '<span class="ghost-you">' + mine.weight + unit + ' × ' + mine.reps + '</span>'
                    +     '<span class="ghost-vs">vs</span>'
                    +     '<span class="ghost-them">' + theirs.weight + unit + ' × ' + theirs.reps + '</span>'
                    + '</span>'
                    + (deltaTxt ? '<span class="ghost-delta">' + deltaTxt.trim() + '</span>' : '')
                    + '<span class="ghost-icon">' + icon + '</span>'
                + '</div>';
            } else if(mine && !theirs){
                rowsHtml += '<div class="ghost-row ghost-extra">'
                    + '<span class="ghost-set-label">S' + (i + 1) + '</span>'
                    + '<span class="ghost-line"><span class="ghost-you">' + mine.weight + unit + ' × ' + mine.reps + '</span></span>'
                    + '<span class="ghost-icon">⛰️</span>'
                + '</div>';
            } else if(!mine && theirs){
                rowsHtml += '<div class="ghost-row ghost-missing">'
                    + '<span class="ghost-set-label">S' + (i + 1) + '</span>'
                    + '<span class="ghost-line"><span class="ghost-them">' + theirs.weight + unit + ' × ' + theirs.reps + '</span></span>'
                    + '<span class="ghost-icon">—</span>'
                + '</div>';
            }
        }
        var verdict;
        if(!mySets.length){
            verdict = '<span class="ghost-verdict neutral">Saisis tes sets pour comparer</span>';
        } else if(wins > losses){
            verdict = '<span class="ghost-verdict win">' + wins + 'W · ' + losses + 'L · ' + ties + 'T</span>';
        } else if(losses > wins){
            verdict = '<span class="ghost-verdict loss">' + wins + 'W · ' + losses + 'L · ' + ties + 'T</span>';
        } else {
            verdict = '<span class="ghost-verdict tie">' + wins + 'W · ' + losses + 'L · ' + ties + 'T</span>';
        }
        div.innerHTML = '<div class="ghost-card-inner">'
            + '<div class="ghost-head">' + headLine + ' ' + verdict + '</div>'
            + '<div class="ghost-sets">' + rowsHtml + '</div>'
        + '</div>';
    }

    // ---------- In-log integration ----------
    function ensureGhostCard(block){
        var existing = block.querySelector(":scope > .ghost-card");
        if(existing) return existing;
        var card = document.createElement("div");
        card.className = "ghost-card";
        block.appendChild(card);
        return card;
    }

    function refreshOneBlock(block, priorMap){
        if(!block) return;
        var current = readCurrentSets(block);
        // Only render for comparable types
        if(!isComparableType(current.type)){
            var existing = block.querySelector(".ghost-card");
            if(existing) existing.remove();
            return;
        }
        var ghost = null;
        var matchVia = null;
        if(current.name && priorMap){
            // Preférer le data-exercise-key (programme-canonique, normalisé par app.js)
            // en plus de la valeur courante. Ça couvre les cas où l'utilisateur a
            // retapé manuellement le nom de l'exercice dans l'input.
            var candidates = buildPriorMap._allCandidates || [];
            var keys = [];
            var nameInputEl = block.querySelector("input.exercise-name");
            if(nameInputEl && nameInputEl.dataset && nameInputEl.dataset.exerciseKey){
                keys.push(nameInputEl.dataset.exerciseKey);
            }
            keys.push(norm(current.name));
            if(typeof console !== "undefined"){
                console.log("[GHOST] block try keys:", JSON.stringify(keys), "for current.name='" + current.name + "'");
            }
            for(var k = 0; k < keys.length; k++){
                var r = findBestGhost(keys[k], candidates, priorMap);
                if(r && r.match){
                    ghost = r.match;
                    matchVia = r.via;
                    break;
                }
            }
            if(ghost && typeof console !== "undefined"){
                console.log("[GHOST] matched '" + current.name + "' via " + matchVia);
            } else if(typeof console !== "undefined"){
                console.log("[GHOST] NO MATCH for '" + current.name + "' (norm='" + norm(current.name) + "', " + candidates.length + " candidates)");
            }
        }
        var card = ensureGhostCard(block);
        renderCardInto(card, ghost, current);
    }

    function refreshAllLog(){
        refreshing = true;
        try {
            var root = document.getElementById("exerciseLogger");
            if(!root) return; // refreshing reset in finally anyway
            var priorMap = buildPriorMap();
            var blocks = root.querySelectorAll("div[data-exercise-index]");
            for(var i = 0; i < blocks.length; i++){
                refreshOneBlock(blocks[i], priorMap);
            }
            // Also handle session-date change feedback (no-op if same)
            refreshSessionDateListener();
        } finally {
            refreshing = false;
        }
    }

    var logObserver = null;
    var refreshing = false; // busy flag to break MutationObserver feedback loop
    function setupLogObserver(){
        var root = document.getElementById("exerciseLogger");
        if(!root) return;
        // Defer initial render slightly to let app.js do its first pass
        setTimeout(refreshAllLog, 0);
        if(logObserver) logObserver.disconnect();
        logObserver = new MutationObserver(function(muts){
            if(refreshing) return; // ignore mutations WE caused during a refresh
            if(setupLogObserver._t) return;
            setupLogObserver._t = setTimeout(function(){
                setupLogObserver._t = null;
                refreshAllLog();
            }, 80);
        });
        logObserver.observe(root, { childList: true, subtree: true });
    }

    function setupLogInputListeners(){
        var root = document.getElementById("exerciseLogger");
        if(!root) return;
        // Delegated input listener — re-renders ONLY ghost cards, NEVER inputs
        root.addEventListener("input", function(e){
            var t = e.target;
            if(!t) return;
            if(!(t.classList && (t.classList.contains("set-weight") || t.classList.contains("set-reps") || t.classList.contains("exercise-name")))) return;
            if(setupLogInputListeners._t) clearTimeout(setupLogInputListeners._t);
            setupLogInputListeners._t = setTimeout(function(){
                setupLogInputListeners._t = null;
                refreshAllLog();
            }, 60);
        });
    }

    function refreshSessionDateListener(){
        var dateInput = document.getElementById("sessionDate");
        if(!dateInput) return;
        if(dateInput.dataset.ghostHooked === "1") return;
        dateInput.dataset.ghostHooked = "1";
        dateInput.addEventListener("change", function(){
            setTimeout(refreshAllLog, 0);
        });
    }

    // ---------- Global stats for #ghost page ----------
    function gatherBattles(){
        var dataRef;
        if(typeof data !== "undefined" && data && Array.isArray(data.sessions)){
            dataRef = data;
        } else {
            try {
                var raw = localStorage.getItem("carnetMuscuData");
                if(raw) dataRef = JSON.parse(raw);
            } catch(e){ dataRef = null; }
        }
        if(!dataRef || !Array.isArray(dataRef.sessions)) return [];
        // Sort ASC (oldest first) so we can walk forward in time
        var sorted = dataRef.sessions.slice().sort(function(a,b){
            return (safeDate(a.date) ? safeDate(a.date).getTime() : 0) - (safeDate(b.date) ? safeDate(b.date).getTime() : 0);
        });
        var battles = [];
        for(var i = 1; i < sorted.length; i++){
            var cur = sorted[i];
            if(!cur || !cur.exercises) continue;
            var curDate = cur.date;
            for(var j = 0; j < cur.exercises.length; j++){
                var ex = cur.exercises[j];
                if(!ex || !ex.name) continue;
                var type = ex.type || "weight";
                if(!isComparableType(type)) continue;
                var mySets = cleanSets(ex.sets);
                if(!mySets.length) continue;
                // Find the most recent prior session having this exercise (scanning backward)
                var ghost = null;
                for(var p = i - 1; p >= 0; p--){
                    var prev = sorted[p];
                    if(!prev || !prev.exercises) continue;
                    var matched = null;
                    for(var q = 0; q < prev.exercises.length; q++){
                        var pe = prev.exercises[q];
                        if(!pe || !pe.name) continue;
                        // Même exercice : priorité à exerciseKey (clé canonique sauvegardée
                        // par app.js), sinon nom normalisé. Evite d'affronter un exo
                        // différent qui porte un nom proche.
                        var sameEx = norm(pe.name) === norm(ex.name)
                            || (ex.exerciseKey && pe.exerciseKey && norm(pe.exerciseKey) === norm(ex.exerciseKey));
                        if(!sameEx) continue;
                        if(!isComparableType(pe.type || "weight")) continue;
                        var prevSets = cleanSets(pe.sets);
                        if(!prevSets.length) continue;
                        matched = {
                            sessionDate: prev.date,
                            sessionName: prev.name || "",
                            type: pe.type || "weight",
                            sets: prevSets,
                            dayAgo: dayDiff(curDate, prev.date)
                        };
                        break;
                    }
                    if(matched) { ghost = matched; break; }
                }
                if(!ghost) continue;
                // Compare sets
                var wins = 0, losses = 0, ties = 0, netPct = 0;
                var totalDelta = 0;
                var maxLen = Math.max(mySets.length, ghost.sets.length);
                for(var k = 0; k < maxLen; k++){
                    var cmp = compareSet(mySets[k], ghost.sets[k], type);
                    if(!cmp) continue;
                    if(cmp.status === "win") wins++;
                    else if(cmp.status === "loss") losses++;
                    else ties++;
                    if(cmp.diffPct) netPct += cmp.diffPct;
                    totalDelta += cmp.diffW || 0;
                }
                var status = wins > losses ? "win" : (losses > wins ? "loss" : "tie");
                battles.push({
                    sessionDate: curDate,
                    sessionName: cur.name || "",
                    exName: ex.name,
                    type: type,
                    wins: wins, losses: losses, ties: ties,
                    netPct: netPct,
                    totalDelta: totalDelta,
                    dayAgo: ghost.dayAgo,
                    mySets: mySets,
                    ghostSets: ghost.sets,
                    status: status
                });
            }
        }
        // Newest first
        battles.reverse();
        return battles;
    }

    function renderBattleCard(b, expanded){
        var unit = unitFor(b.type);
        var verdictTxt = b.status === "win" ? "Tu l'emportes" : b.status === "loss" ? "Fantôme mène" : "Égalité";
        var verdictClass = "ghost-battle " + b.status;
        var head = '<div class="' + verdictClass + '">'
            + '<div class="ghost-battle-head">'
            +     '<span class="ghost-battle-name">👻 ' + escapeSafe(b.exName) + '</span>'
            +     '<span class="ghost-battle-meta">' + fmtShortFR(b.sessionDate) + ' · vs il y a ' + (b.dayAgo == null ? "?" : b.dayAgo) + 'j</span>'
            + '</div>'
            + '<div class="ghost-battle-score">'
            +     '<span><b>' + b.wins + '</b>W</span>'
            +     '<span><b>' + b.losses + '</b>L</span>'
            +     '<span><b>' + b.ties + '</b>T</span>'
            +     '<span class="ghost-battle-verdict ' + b.status + '">' + verdictTxt + '</span>'
            + '</div>';
        if(expanded){
            var rowsHtml = "";
            var maxLen = Math.max(b.mySets.length, b.ghostSets.length);
            for(var i = 0; i < maxLen; i++){
                var mine = b.mySets[i];
                var theirs = b.ghostSets[i];
                if(mine && theirs){
                    var cmp = compareSet(mine, theirs, b.type);
                    var st = cmp ? cmp.status : "tie";
                    var signW = (cmp.diffW > 0) ? "+" : "";
                    var signR = (cmp.diffR > 0) ? "+" : "";
                    var icon = st === "win" ? "✅" : st === "loss" ? "❌" : "≈";
                    var delta = (cmp.diffW !== 0 ? signW + cmp.diffW + unit + " " : "") + (cmp.diffR !== 0 ? signR + cmp.diffR + " reps" : "");
                    rowsHtml += '<div class="ghost-row ghost-' + st + '">'
                        + '<span class="ghost-set-label">S' + (i + 1) + '</span>'
                        + '<span class="ghost-line">'
                        +     '<span class="ghost-you">' + mine.weight + unit + ' × ' + mine.reps + '</span>'
                        +     '<span class="ghost-vs">vs</span>'
                        +     '<span class="ghost-them">' + theirs.weight + unit + ' × ' + theirs.reps + '</span>'
                        + '</span>'
                        + (delta ? '<span class="ghost-delta">' + delta.trim() + '</span>' : '')
                        + '<span class="ghost-icon">' + icon + '</span>'
                    + '</div>';
                } else if(mine){
                    rowsHtml += '<div class="ghost-row ghost-extra">'
                        + '<span class="ghost-set-label">S' + (i + 1) + '</span>'
                        + '<span class="ghost-line"><span class="ghost-you">' + mine.weight + unit + ' × ' + mine.reps + '</span></span>'
                        + '<span class="ghost-icon">⛰️</span>'
                    + '</div>';
                } else if(theirs){
                    rowsHtml += '<div class="ghost-row ghost-missing">'
                        + '<span class="ghost-set-label">S' + (i + 1) + '</span>'
                        + '<span class="ghost-line"><span class="ghost-them">' + theirs.weight + unit + ' × ' + theirs.reps + '</span></span>'
                        + '<span class="ghost-icon">—</span>'
                    + '</div>';
                }
            }
            head += '<div class="ghost-sets">' + rowsHtml + '</div>';
        }
        head += '</div>';
        return head;
    }

    function buildRunGhostSection(){
        if(typeof computeRunGhostBattles !== "function") return '';
        if(typeof runGhostBattleHTML !== "function") return '';
        var runBattles = computeRunGhostBattles();
        if(!runBattles || !runBattles.length) return '';
        var wins = 0, losses = 0;
        for(var rb = 0; rb < runBattles.length; rb++){
            if(runBattles[rb].status === "win") wins++;
            else if(runBattles[rb].status === "loss") losses++;
        }
        var rate = (wins + losses) > 0 ? Math.round(100 * wins / (wins + losses)) : 0;
        var html = '';
        html += '<div class="ghost-section" style="margin-top:26px;padding-top:18px;border-top:2px dashed #f0e0d0;">';
        html += '  <div class="ghost-section-head">🏃 Ghost course — tes duels d\'allure</div>';
        html += '  <div class="run-ghost-hero">';
        html += '    <div class="ghost-stat big ' + (rate >= 60 ? "win" : rate >= 40 ? "tie" : "loss") + '"><b>' + rate + '%</b><span>win rate</span></div>';
        html += '    <div class="ghost-stat"><b>' + runBattles.length + '</b><span>duels</span></div>';
        html += '    <div class="ghost-stat win"><b>' + wins + '</b><span>gagnés</span></div>';
        html += '    <div class="ghost-stat loss"><b>' + losses + '</b><span>perdus</span></div>';
        html += '  </div>';
        var recentRun = runBattles[0];
        html += '  <div class="ghost-section-head" style="margin-top:12px;">📅 Dernier duel · ' + fmtShortFR(recentRun.date + "T12:00:00") + '</div>';
        html += runGhostBattleHTML(recentRun, true);
        if(runBattles.length > 1){
            html += '  <div class="ghost-section-head" style="margin-top:14px;">📜 Derniers duels</div>';
            for(var rb2 = 1; rb2 < Math.min(runBattles.length, 6); rb2++){
                html += runGhostBattleHTML(runBattles[rb2], false);
            }
        }
        html += '</div>';
        return html;
    }

    function renderGhostDashboard(){
        var root = document.getElementById("ghostStatsContainer");
        if(!root) return;
        var battles = gatherBattles();
        if(!battles.length){
            var emptyHtml = '<div class="empty">Pas encore de batailles. Fais une 2e séance avec un même exercice pour affronter ton fantôme 👻</div>';
            // Invite running : 1 seule sortie = duel d'allure à créer
            if(typeof data !== "undefined" && data.runs && data.runs.length === 1 && typeof computeRunGhostBattles === "function"){
                emptyHtml += '<div class="empty" style="margin-top:14px;">🏃 Ajoute une 2ᵉ sortie pour créer ton premier duel d\'allure contre ton fantôme.</div>';
            }
            root.innerHTML = emptyHtml + buildRunGhostSection();
            return;
        }
        // Aggregate
        var totalW = 0, totalL = 0, totalT = 0;
        for(var i = 0; i < battles.length; i++){
            totalW += battles[i].wins;
            totalL += battles[i].losses;
            totalT += battles[i].ties;
        }
        var rate = (totalW + totalL) > 0 ? Math.round(100 * totalW / (totalW + totalL)) : 0;
        var biggestBeat = battles[0], biggestLoss = battles[0];
        for(var j = 1; j < battles.length; j++){
            if(battles[j].status === "win" && (biggestBeat.status !== "win" || battles[j].netPct > biggestBeat.netPct)) biggestBeat = battles[j];
            if(battles[j].status === "loss" && (biggestLoss.status !== "loss" || battles[j].netPct < biggestLoss.netPct)) biggestLoss = battles[j];
        }
        // Current streak (most recent N consecutive "win")
        var streak = 0;
        for(var s = 0; s < battles.length; s++){
            if(battles[s].status === "win") streak++;
            else break;
        }
        var longestStreak = 0, run = 0;
        for(var r = 0; r < battles.length; r++){
            if(battles[r].status === "win") { run++; if(run > longestStreak) longestStreak = run; }
            else run = 0;
        }
        var lastBattle = battles[0];
        var rateColor = rate >= 60 ? "win" : rate >= 40 ? "tie" : "loss";

        var html = '';
        html += '<div class="ghost-hero">';
        html +=     '<div class="ghost-stat"><b>' + (totalW + totalL + totalT) + '</b><span>batailles</span></div>';
        html +=     '<div class="ghost-stat big ' + rateColor + '"><b>' + rate + '%</b><span>win rate</span></div>';
        html +=     '<div class="ghost-stat"><b>' + streak + '</b><span>série en cours</span></div>';
        html +=     '<div class="ghost-stat"><b>' + longestStreak + '</b><span>meilleure série</span></div>';
        html += '</div>';
        // Today's battle (most recent)
        html += '<div class="ghost-section">';
        html +=     '<div class="ghost-section-head">📅 Dernière bataille · ' + fmtShortFR(lastBattle.sessionDate) + '</div>';
        html +=     renderBattleCard(lastBattle, true);
        html += '</div>';
        // Last 10
        html += '<div class="ghost-section">';
        html +=     '<div class="ghost-section-head">📜 Tes 10 dernières batailles</div>';
        var recentCount = Math.min(10, battles.length);
        for(var k = 0; k < recentCount; k++){
            html += renderBattleCard(battles[k], false);
        }
        html += '</div>';
        // Biggest beats (always show when biggest exists; show "(la derniere)" if same as lastBattle)
        if(biggestBeat && biggestBeat.status === "win" && (biggestBeat !== lastBattle || totalW > 1)){
            html += '<div class="ghost-section">';
            html +=     '<div class="ghost-section-head">🏆 Plus grosse victoire' + (biggestBeat === lastBattle ? ' (la derniere)' : '') + '</div>';
            html +=     renderBattleCard(biggestBeat, false);
            html += '</div>';
        }
        // Biggest losses (always show when biggest exists; show "(la dernière)" if same as lastBattle)
        if(biggestLoss && biggestLoss.status === "loss" && (biggestLoss !== lastBattle || totalL > 1)){
            html += '<div class="ghost-section">';
            html +=     '<div class="ghost-section-head">💀 Battu par le fantôme' + (biggestLoss === lastBattle ? ' (la dernière)' : '') + '</div>';
            html +=     renderBattleCard(biggestLoss, false);
            html += '</div>';
        }
        // ============ 🏃 GHOST COURSE ============
        html += buildRunGhostSection();

        root.innerHTML = html;
    }

    function setupSectionObserver(){
        var sec = document.getElementById("ghost");
        if(!sec) return;
        // First render if already visible
        if(!sec.classList.contains("hidden") && sec.style.display !== "none"){
            renderGhostDashboard();
        }
        var mo = new MutationObserver(function(){
            var visible = !sec.classList.contains("hidden") && sec.style.display !== "none";
            if(visible) renderGhostDashboard();
        });
        mo.observe(sec, { attributes: true, attributeFilter: ["class", "style"] });
    }

    // ---------- Init ----------
    function init(){
        try {
            // Débypass cache PWA : si un Service Worker est enregistré (app installée
            // sur l'écran d'accueil iOS), le forcer à se désenregistrer pour que
            // le navigateur recharge le nouveau quickghost.js?v=26.
            if("serviceWorker" in navigator && navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
                navigator.serviceWorker.getRegistrations().then(function(regs){
                    regs.forEach(function(reg){ reg.unregister(); });
                    if(regs.length > 0){
                        console.log("[GHOST] Unregistered " + regs.length + " Service Worker(s) — reload imminent pour cache-bust.");
                    }
                }).catch(function(){});
            }
            // Confirm visible dans la page : change le <title> pour que l'utilisateur
            // voie en un coup d'œil dans l'onglet que le nouveau code tourne.
            try {
                if(document.title && document.title.indexOf("v2.0") === -1){
                    document.title = document.title + " [GHOST?v26]";
                }
            } catch(e){}
            setupLogObserver();
            setupLogInputListeners();
            setupSectionObserver();
            // Also listen for session-date changes globally (in case the input is replaced)
            var dateEl = document.getElementById("sessionDate");
            if(dateEl && dateEl.dataset && dateEl.dataset.ghostHooked !== "1"){
                if(dateEl.dataset.ghostHooked !== "1"){
                    dateEl.addEventListener("change", function(){ setTimeout(refreshAllLog, 0); });
                }
            }
        } catch(e){
            if(typeof console !== "undefined" && console.warn) console.warn("[GHOST]", e);
        }
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // ---------- Debug helpers (exposed on window for console inspection) ----------
    window.__ghostDebug = function(){
        var dateInputEl = document.getElementById("sessionDate");
        var today = (dateInputEl && dateInputEl.value) || "(uninitialized)";
        var sessions = (buildDataRef() && buildDataRef().sessions) || [];
        console.group("%c👻 GHOST DEBUG for " + today, "background:#1c291e;color:#d5ff3e;padding:4px 8px;border-radius:4px;font-weight:700;");
        console.log("dateInput.value :", today);
        console.log("data.sessions length :", sessions.length);
        sessions.forEach(function(s, i){
            var exs = s.exercises || [];
            var totalSets = 0, validSets = 0;
            exs.forEach(function(ex){
                (ex.sets || []).forEach(function(set){
                    totalSets++;
                    if(Number(set.weight) > 0 && Number(set.reps) > 0) validSets++;
                });
            });
            console.log("Session #" + i + " :", JSON.stringify(s.date).slice(0, 40), "| name:", s.name || "(none)", "| exo:", exs.length, "| sets: " + validSets + "/" + totalSets + " valides");
        });
        var map = buildPriorMap();
        console.log("%c→ priorMap keys (" + Object.keys(map).length + ") :", "color:#426e22;font-weight:700;", Object.keys(map));
        console.groupEnd();
        return map;
    };
    window.__ghostBuildPriorMap = buildPriorMap;

    // ---------- Inspector DOM actuel : révèle le matching en live ----------
    window.__ghostInspectDOM = function(){
        var out = [];
        var root = document.getElementById("exerciseLogger");
        out.push("=== DOM #exerciseLogger ===");
        if(!root){
            out.push("(introuvable — es-tu sur la page 'Ajouter une séance' ?)");
        } else {
            var blocks = root.querySelectorAll("div[data-exercise-index]");
            if(blocks.length === 0){
                out.push("(vide — choisis d'abord une séance dans le menu déroulant)");
            } else {
                for(var i = 0; i < blocks.length; i++){
                    var block = blocks[i];
                    var nameInput = block.querySelector("input.exercise-name");
                    var rawName = nameInput ? nameInput.value : "(none)";
                    var keyedName = nameInput ? (nameInput.dataset.exerciseKey || "(none)") : "(none)";
                    var directMatch = null;
                    var map = buildPriorMap();
                    if(rawName && rawName !== "(none)"){
                        directMatch = map[norm(rawName)] || null;
                    }
                    out.push("Bloc #" + i);
                    out.push("  raw.value          = '" + rawName + "'");
                    out.push("  dataset.exKey      = '" + keyedName + "'");
                    out.push("  normalized         = '" + norm(rawName) + "'");
                    out.push("  priorMap direct?   = " + (directMatch ? "OUI (" + (directMatch._rawName || "?") + ", " + directMatch.sessionDate + ")" : "NON"));
                }
            }
        }
        out.push("");
        out.push("=== data.program (7 séances types) ===");
        var __prRef;
        if(typeof data !== "undefined" && data && data.program) __prRef = data;
        else { try { var __pr = localStorage.getItem("carnetMuscuData"); var __pdd = __pr ? JSON.parse(__pr) : null; __prRef = (__pdd && __pdd.program) ? __pdd : { program: [] }; } catch(e){ __prRef = { program: [] }; } }
        var programs = (__prRef && __prRef.program) || [];
        for(var p = 0; p < programs.length; p++){
            var prg = programs[p];
            out.push("Programme #" + p + " : '" + (prg.name || "?") + "' (" + (prg.exercises || []).length + " exos)");
            (prg.exercises || []).forEach(function(ex){
                out.push("  → '" + ex.name + "'  (norm: '" + norm(ex.name) + "')");
            });
        }
        out.push("");
        out.push("=== Tous les ex.name UNIQUES dans data.sessions ===");
        var __svRef;
        if(typeof data !== "undefined" && data && data.sessions) __svRef = data;
        else { try { var __sv = localStorage.getItem("carnetMuscuData"); __svRef = __sv ? JSON.parse(__sv) : { sessions: [] }; } catch(e){ __svRef = { sessions: [] }; } }
        var sessions = (__svRef && __svRef.sessions) || [];
        var uniq = {};
        sessions.forEach(function(s){
            (s.exercises || []).forEach(function(ex){
                var k = norm(ex.name);
                if(!uniq[k]){
                    uniq[k] = { raw: ex.name, count: 0, dates: [] };
                }
                uniq[k].count++;
                if(uniq[k].dates.length < 3) uniq[k].dates.push((s.date || "").slice(0, 10));
            });
        });
        var sortedKeys = Object.keys(uniq).sort();
        sortedKeys.forEach(function(k){
            var u = uniq[k];
            out.push("  '" + u.raw + "' (norm: '" + k + "') — " + u.count + " séance(s), dates récentes: " + u.dates.join(", "));
        });
        var result = out.join("\n");
        try { console.log(result); } catch(e){}
        return result;
    };

    })();
