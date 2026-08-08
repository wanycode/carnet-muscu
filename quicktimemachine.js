/* ============================================================
   QUICK TIME MACHINE — projette ta progression vers un objectif
   à 3/6/12 mois via régression linéaire amortie (plateau réaliste).
   ============================================================ */
(function(){
    "use strict";
    window.__timeErr = null;
    try {

    var STORAGE_KEY = "carnetMuscuData";

    // ============================================================
    // LOADERS
    // ============================================================
    function loadData(){
        try {
            var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            return Array.isArray(raw.sessions) ? raw.sessions : [];
        } catch(e) {
            window.__timeErr = e.message;
            return [];
        }
    }
    function safeNum(s){ var n = parseFloat(s); return isNaN(n) ? 0 : n; }
    function isoWeek(date){
        return Math.floor(date.getTime() / (7 * 86400000));
    }

    // ============================================================
    // ANALYSE 1RM HEBDO PAR EXERCICE
    // ============================================================
    function exerciseWeeklyEstimates(sessions, exoKey){
        // Walking 1RM estimé = weight * (1 + reps/30) sur chaque set
        // Pour chaque semaine, garder le max
        if(!exoKey) return [];
        var target = exoKey.toLowerCase().trim();
        var weeksMap = {};
        sessions.forEach(function(s){
            if(!s || !s.date) return;
            var d = new Date(s.date);
            if(isNaN(d.getTime())) return;
            var wk = isoWeek(d);
            try {
                (s.exercises || []).forEach(function(ex){
                    var key = (ex.exerciseKey || ex.name || "").toLowerCase().trim();
                    if(!key) return;
                    // Match exact ou fuzzy amélioré
                    var isMatch = false;
                    if(key === target) {
                        isMatch = true;
                    } else if(target.indexOf("session:") === 0) {
                        // Match pour les séances complètes
                        var sessionName = target.replace("session:", "");
                        var sessionKey = (s.name || "").toLowerCase().trim();
                        isMatch = (sessionKey === sessionName || sessionKey.indexOf(sessionName) !== -1 || sessionName.indexOf(sessionKey) !== -1);
                    } else {
                        // Fuzzy match pour les exercices
                        var targetClean = target.replace(/[^a-z0-9]/g, "");
                        var keyClean = key.replace(/[^a-z0-9]/g, "");
                        isMatch = (keyClean === targetClean || keyClean.indexOf(targetClean) !== -1 || targetClean.indexOf(keyClean) !== -1);
                    }
                    if(!isMatch) return;
                    if(!weeksMap[wk]) weeksMap[wk] = { wk: wk, max: 0, date: d };
                    (ex.sets || []).forEach(function(st){
                        var w = safeNum(st.weight);
                        var r = safeNum(st.reps);
                        if(w > 0 && r > 0 && r < 30){
                            var est1rm = w * (1 + r / 30);
                            if(est1rm > weeksMap[wk].max) weeksMap[wk].max = est1rm;
                        }
                    });
                });
            } catch(e){}
        });
        return Object.keys(weeksMap).map(function(k){ return weeksMap[k]; }).sort(function(a,b){ return a.wk - b.wk; });
    }
    function listExercisesWithHistory(sessions){
        // Renvoie top exercices par fréquence. Multi-shape: s.exercises ou s.exerciseList.
        // Fallback: si aucun exo individuel tracké, utiliser le NOM DE SÉANCE comme "exo virtuel"
        // (l'utilisateur peut sélectionner sa séance pour projeter son 1RM global).
        var counts = {};
        var sessNames = {};
        (sessions || []).forEach(function(s){
            if(!s) return;
            try {
                var exList = s.exercises || s.exerciseList || [];
                var hasAny = exList.length > 0;
                exList.forEach(function(ex){
                    if(!ex) return;
                    var rawName = ex.name || ex.exerciseName || "Inconnu";
                    var key = (ex.exerciseKey || rawName).toLowerCase().trim();
                    if(!key) return;
                    if(!counts[key]) counts[key] = { name: rawName, key: key, count: 0, type: ex.type || "weight" };
                    counts[key].count += 1;
                    // Stocker le type d'exercice pour l'affichage
                    if(ex.type) counts[key].type = ex.type;
                });
                // Si pas d'exos dans la séance, on crée une entrée virtuelle basée sur le nom de séance
                if(!hasAny && s.name){
                    var sname = String(s.name).trim();
                    if(sname){
                        var skey = "session:" + sname.toLowerCase();
                        if(!sessNames[skey]) sessNames[skey] = { name: "🏋 "+sname+" (séance complète)", key: skey, count: 0, type: "session" };
                        sessNames[skey].count += 1;
                    }
                }
            } catch(e){}
        });
        var arr = Object.keys(counts).map(function(k){ return counts[k]; });
        Object.keys(sessNames).forEach(function(k){ arr.push(sessNames[k]); });
        arr.sort(function(a,b){ return b.count - a.count; });
        return arr.filter(function(e){ return e.count >= 1; }).slice(0, 15); // Augmenté à 15 pour plus d'exos
    }

    // ============================================================
    // RÉGRESSION LINÉAIRE + PROJECTION DAMPÉE
    // ============================================================
    function linearRegression(points){
        // points: [{x: weekIndex, y: value}, ...]
        var n = points.length;
        if(n < 2) return { slope: 0, intercept: points[0] ? points[0].y : 0, r2: 0, n: n };
        var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for(var i = 0; i < n; i++){
            sumX += points[i].x;
            sumY += points[i].y;
            sumXY += points[i].x * points[i].y;
            sumXX += points[i].x * points[i].x;
        }
        var denom = n * sumXX - sumX * sumX;
        if(Math.abs(denom) < 1e-9) return { slope: 0, intercept: points[n-1].y, r2: 0, n: n };
        var slope = (n * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        var meanY = sumY / n;
        var ssTot = 0, ssRes = 0;
        for(var j = 0; j < n; j++){
            var pred = slope * points[j].x + intercept;
            ssTot += (points[j].y - meanY) * (points[j].y - meanY);
            ssRes += (points[j].y - pred) * (points[j].y - pred);
        }
        var r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
        return { slope: slope, intercept: intercept, r2: r2, n: n };
    }
    function dampenedProjection(slope, weekStepFromNow, currentValue, totalHorizon){
        // Plateau math : Gain(t) = slope * t/(1+0.10*t)
        // À t=1 → 0.91*slope, à t=10 → 5*slope (rate halve), à t=52 → 8.6*slope
        var rawGain = slope * weekStepFromNow / (1 + 0.10 * weekStepFromNow);
        var projValue = currentValue + rawGain;
        // Plancher réaliste
        if(projValue < currentValue * 0.8) projValue = currentValue * 0.9;
        return projValue;
    }
    function confidenceBand(currentValue, slope, totalWeeks){
        // ± 30% sur la projection finale
        var avgProj = currentValue + slope * totalWeeks / (1 + 0.10 * totalWeeks);
        return {
            low: Math.max(currentValue * 0.9, avgProj * 0.70),
            high: avgProj * 1.30
        };
    }

    // ============================================================
    // REALITY CHECK
    // ============================================================
    function realityCheck(current, target, slope, horizonWeeks){
        if(slope <= 0){
            return { verdict: "STAGNANT", msg: "Pas de progression détectée sur les 8 dernières semaines. Change le stimulus (tempo, reps, exercices) avant de viser un objectif." };
        }
        var delta = target - current;
        var proj = current + slope * horizonWeeks / (1 + 0.10 * horizonWeeks);
        var gap = target - proj;
        var gapPct = (gap / target) * 100;
        if(gap < 0){
            return { verdict: "À PORTÉE", msg: "Sur ta pente actuelle (" + slope.toFixed(2) + " kg/sem), tu dépasses la cible. Vise un objectif plus ambitieux !" };
        }
        if(gapPct < 10){
            return { verdict: "ATTEIGNABLE", msg: "Tu y arrives avec ta progression actuelle. Maintiens 4-5 séances/sem, pas de deload imprévu." };
        }
        if(gapPct < 25){
            return { verdict: "AMBITIEUX", msg: "Faisable mais demande de la constance. Augmente légèrement le volume (+1-2 séries/sem) sur cet exo." };
        }
        var sessionsNeeded = Math.ceil(gap / (slope * 0.6)); // 60% efficiency boost
        return { verdict: "DIFFICILE", msg: "L'écart est de " + gap.toFixed(1) + " kg sur " + horizonWeeks + " sem. Possible seulement si tu programmes " + sessionsNeeded + " séances ciblées sur cet exo (+ tempo lent + deload toutes les 4 semaines)." };
    }

    // ============================================================
    // RENDER — SVG COURBE + RAPPEL
    // ============================================================
    function escapeHtml(s){
        return String(s).replace(/[&<>"']/g, function(c){
            return ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c];
        });
    }
    function formatNum(n){
        return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    }
    function renderCurve(actualPoints, futurePoints, band, currentValue, target, horizonWeeks){
        // Coord espace : X = semaines (-N à +horizon), Y = valeur en kg
        var padding = 40;
        var width = 800;
        var height = 320;
        var xMin = actualPoints.length > 0 ? actualPoints[0].x : -horizonWeeks;
        var xMax = horizonWeeks;
        var allY = actualPoints.map(function(p){ return p.y; })
            .concat(futurePoints.map(function(p){ return p.y; }))
            .concat([band.low, band.high, target]);
        var yMin = Math.min.apply(null, allY) * 0.9;
        var yMax = Math.max.apply(null, allY) * 1.08;
        function sx(x){ return padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding); }
        function sy(y){ return height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding); }
        // Lignes de grille horizontales (5 paliers)
        var gridLines = "";
        var yLabels = "";
        for(var i = 0; i <= 4; i++){
            var yval = yMin + (i / 4) * (yMax - yMin);
            var yy = sy(yval);
            gridLines += '<line x1="' + padding + '" y1="' + yy + '" x2="' + (width - padding) + '" y2="' + yy + '" stroke="#e0e3dd" stroke-width="1"/>';
            yLabels += '<text x="' + (padding - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="#888380">' + formatNum(yval) + '</text>';
        }
        var xLabels = "";
        var xSteps = [xMin, Math.floor(xMin/2), 0, Math.floor(xMax/2), xMax];
        xSteps.forEach(function(x){
            if(x !== xMin && x !== 0 && x !== xMax){
                var xx = sx(x);
                xLabels += '<text x="' + xx + '" y="' + (height - 10) + '" text-anchor="middle" font-size="10" fill="#888380">' + (x > 0 ? "+" : "") + x + ' sem</text>';
            }
        });
        xLabels += '<text x="' + sx(0) + '" y="' + (height - 10) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#1c291e">Aujourd\'hui</text>';
        xLabels += '<text x="' + sx(xMin) + '" y="' + (height - 10) + '" text-anchor="middle" font-size="10" fill="#888380">' + xMin + ' sem</text>';
        xLabels += '<text x="' + sx(xMax) + '" y="' + (height - 10) + '" text-anchor="middle" font-size="10" fill="#888380">+' + xMax + ' sem</text>';
        // Ligne actuelle (verte, points reliés)
        var actualPath = "";
        actualPoints.forEach(function(p, idx){
            var x = sx(p.x);
            var y = sy(p.y);
            actualPath += (idx === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
        });
        // Ligne future (projeté, pointillée)
        var futurePath = "";
        futurePoints.forEach(function(p, idx){
            var x = sx(p.x);
            var y = sy(p.y);
            futurePath += (idx === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
        });
        // Target line horizontale
        var ty = sy(target);
        var targetLine = '<line x1="' + sx(0) + '" y1="' + ty + '" x2="' + sx(xMax) + '" y2="' + ty + '" stroke="#ff9800" stroke-width="2" stroke-dasharray="6 4"/>';
        // Confidence band (polygone)
        var bandPoly = "";
        futurePoints.forEach(function(p, idx){
            bandPoly += (idx === 0 ? "M" : "L") + sx(p.x).toFixed(1) + " " + sy(p.y + (band.high - p.y) * 0.3).toFixed(1) + " ";
        });
        for(var k = futurePoints.length - 1; k >= 0; k--){
            bandPoly += "L" + sx(futurePoints[k].x).toFixed(1) + " " + sy(Math.max(band.low, futurePoints[k].y - (futurePoints[k].y - band.low) * 0.3)).toFixed(1) + " ";
        }
        bandPoly += "Z";
        return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;max-width:800px;display:block;margin:0 auto;">' +
            '<rect width="100%" height="100%" fill="#fbfcfa"/>' +
            gridLines + yLabels + xLabels +
            '<path d="' + bandPoly + '" fill="#b8e94c" fill-opacity="0.15"/>' +
            '<path d="' + actualPath + '" stroke="#4caf50" stroke-width="3" fill="none"/>' +
            '<path d="' + futurePath + '" stroke="#b8e94c" stroke-width="3" fill="none" stroke-dasharray="6 4"/>' +
            targetLine +
            // Points
            actualPoints.map(function(p){ return '<circle cx="' + sx(p.x) + '" cy="' + sy(p.y) + '" r="3" fill="#4caf50"/>'; }).join("") +
            // Target label
            '<text x="' + (width - padding - 4) + '" y="' + (ty - 4) + '" text-anchor="end" font-size="11" font-weight="700" fill="#ff9800">🎯 cible: ' + formatNum(target) + ' kg</text>' +
            // Légende
            '<rect x="' + padding + '" y="14" width="14" height="3" fill="#4caf50"/>' +
            '<text x="' + (padding + 18) + '" y="20" font-size="11" fill="#1c291e">Actuelle</text>' +
            '<rect x="' + (padding + 90) + '" y="14" width="14" height="3" fill="#b8e94c"/>' +
            '<text x="' + (padding + 108) + '" y="20" font-size="11" fill="#1c291e">Prédite (plage)</text>' +
        '</svg>';
    }
    function renderWeeklyPlan(slope, current, horizonWeeks, unitLabel){
        // Plan: 4 séances/sem, deload -20% toutes les 4 sem, +slope kg / sem avec amortissement
        var lines = [];
        var weeksDone = 0;
        var stepLabel = 0;
        var unit = unitLabel || "kg";
        while(weeksDone < horizonWeeks){
            var blockSize = 4;
            var blockIdx = Math.floor(weeksDone / 4);
            var isDeload = (blockSize > 0) && (weeksDone > 0) && (weeksDone % 4 === 0);
            var pct = isDeload ? 0.80 : 1.0;
            var blockStartVal = current + slope * (weeksDone) / (1 + 0.10 * weeksDone);
            var blockEndVal = current + slope * (weeksDone + blockSize - 1) / (1 + 0.10 * (weeksDone + blockSize - 1));
            var blockAvg = (blockStartVal + blockEndVal) / 2;
            var blockLoad = blockAvg * pct;
            var tag = isDeload ? "🔻 DELOAD" : "🏋️ Travail";
            lines.push('<div class="tm-block ' + (isDeload ? "deload" : "work") + '">' +
                '<span class="tm-block-tag">' + tag + '</span>' +
                '<span class="tm-block-label">Sem ' + (weeksDone + 1) + ' → ' + Math.min(weeksDone + 4, horizonWeeks) + '</span>' +
                '<span class="tm-block-load">' + formatNum(blockLoad) + ' ' + unit + ' cible</span>' +
            '</div>');
            weeksDone += blockSize;
            stepLabel++;
        }
        return lines.join("");
    }
    function renderTimeline(sessions, exoKey, target, horizonWeeks, currentOverride){
        // 1. Récupérer l'historique
        var weeks = exerciseWeeklyEstimates(sessions, exoKey);
        if(weeks.length < 2){
            return '<p class="sub" style="padding:24px;text-align:center;">📊 Pas assez d\'historique sur cet exo (besoin ≥2 séances).<br>Sélectionne un autre exo ou ajoute des séances.</p>';
        }
        // 2. Préparer points pour régression (x = numéro de semaine depuis la première)
        var firstWk = weeks[0].wk;
        var points = weeks.map(function(w){ return { x: w.wk - firstWk, y: w.max, date: w.date }; });
        var reg = linearRegression(points);
        // 3. Préparer la courbe future
        var lastWkIdx = points[points.length - 1].x;
        var futurePoints = [];
        var stepW = Math.max(1, Math.floor(horizonWeeks / 12));
        for(var t = stepW; t <= horizonWeeks; t += stepW){
            var projY = dampenedProjection(reg.slope, t, currentOverride || points[points.length - 1].y, horizonWeeks);
            futurePoints.push({ x: lastWkIdx + t, y: projY });
        }
        if(futurePoints.length === 0 || futurePoints[futurePoints.length - 1].x < lastWkIdx + horizonWeeks){
            futurePoints.push({ x: lastWkIdx + horizonWeeks, y: dampenedProjection(reg.slope, horizonWeeks, currentOverride || points[points.length - 1].y, horizonWeeks) });
        }
        // 4. Confidence band
        var band = confidenceBand(currentOverride || points[points.length - 1].y, reg.slope, horizonWeeks);
        // 5. Reality check
        var rc = realityCheck(currentOverride || points[points.length - 1].y, target, reg.slope, horizonWeeks);
        // 6. Build HTML
        var currentVal = currentOverride || points[points.length - 1].y;
        var projectedVal = futurePoints[futurePoints.length - 1].y;
        var delta = projectedVal - currentVal;
        var color = rc.verdict === "À PORTÉE" || rc.verdict === "ATTEIGNABLE" ? "ok" : rc.verdict === "AMBITIEUX" ? "warn" : rc.verdict === "STAGNANT" ? "bad" : "warn";
        
        // Déterminer le type d'exercice pour l'affichage
        var exoType = "poids";
        if(exoKey.indexOf("session:") === 0) exoType = "séance";
        else if(exoKey.indexOf("time") !== -1 || exoKey.indexOf("durée") !== -1) exoType = "temps";
        
        var unitLabel = exoType === "temps" ? "s" : "kg";
        
        return '<div class="tm-summary ' + color + '">' +
                '<div class="tm-stat"><span class="tm-stat-label">Actuelle</span><span class="tm-stat-value">' + formatNum(currentVal) + ' ' + unitLabel + '</span></div>' +
                '<div class="tm-stat"><span class="tm-stat-label">Prédite</span><span class="tm-stat-value">' + formatNum(projectedVal) + ' ' + unitLabel + '</span></div>' +
                '<div class="tm-stat"><span class="tm-stat-label">Cible</span><span class="tm-stat-value">' + formatNum(target) + ' ' + unitLabel + '</span></div>' +
                '<div class="tm-stat"><span class="tm-stat-label">' + (delta >= 0 ? "Gain prévu" : "Perte prévue") + '</span><span class="tm-stat-value">' + (delta >= 0 ? "+" : "") + formatNum(delta) + ' ' + unitLabel + '</span></div>' +
            '</div>' +
            renderCurve(points, futurePoints, band, currentVal, target, horizonWeeks) +
            '<div class="tm-reality ' + color + '">' +
                '<span class="tm-verdict">' + rc.verdict + '</span>' +
                '<p>' + escapeHtml(rc.msg) + '</p>' +
            '</div>' +
            '<h3 style="margin:24px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;">📅 Plan hebdo sur ' + horizonWeeks + ' semaines</h3>' +
            '<div class="tm-blocks">' + renderWeeklyPlan(reg.slope, currentVal, horizonWeeks, unitLabel) + '</div>' +
            '<div class="tm-info" style="margin-top:16px;padding:12px;background:#f7f8f5;border-radius:8px;font-size:11px;color:var(--muted);">' +
                '<strong>ℹ️ Comment ça marche :</strong><br>' +
                '• <strong>Actuelle</strong> : Ta meilleure performance récente (1RM estimé = charge × (1 + reps/30))<br>' +
                '• <strong>Prédite</strong> : Projection basée sur ta progression historique avec plateau réaliste<br>' +
                '• <strong>Cible</strong> : L\'objectif que tu veux atteindre<br>' +
                '• <strong>Plan hebdo</strong> : Charge cible par semaine avec deload automatique toutes les 4 semaines<br>' +
                '• Les exercices de type "temps" utilisent la durée en secondes au lieu du poids' +
            '</div>' +
            '<p class="sub" style="margin-top:12px;font-size:11px;line-height:1.5;">R² = ' + (reg.r2 * 100).toFixed(0) + '% · pente = ' + reg.slope.toFixed(3) + ' ' + unitLabel + '/sem · modèle = linéaire amortie (plateau)</p>';
    }
    function updateCurrentOnInput(){
        var currentInput = document.getElementById("tmCurrent");
        if(!currentInput) return;
        currentInput.addEventListener("input", function(){
            // L'utilisateur a changé la valeur manuellement, on respecte son choix
            // Pas de recalcul automatique
        });
    }
    function renderTimeMachine(){
        var container = document.getElementById("timeMachinePanel");
        if(!container) return;
        var sessions = loadData();
        var exerciseInput = document.getElementById("tmExo");
        var currentInput = document.getElementById("tmCurrent");
        var targetInput = document.getElementById("tmTarget");
        var horizonSelect = document.getElementById("tmHorizon");
        if(!exerciseInput || !currentInput || !targetInput || !horizonSelect) return;
        var exoKey = exerciseInput.value.trim();
        var target = parseFloat(targetInput.value);
        var horizonWeeks = parseInt(horizonSelect.value);
        if(!exoKey){
            container.innerHTML = '<p class="sub" style="text-align:center;padding:32px;">👆 Sélectionne un exercice et entre tes valeurs pour générer la projection.</p>';
            return;
        }
        if(!target || target <= 0){
            container.innerHTML = '<p class="sub" style="text-align:center;padding:32px;">⚠️ Entre une cible valide (kg) pour générer la projection.</p>';
            return;
        }
        if(!horizonWeeks || horizonWeeks <= 0){
            horizonWeeks = 12;
        }
        // Utiliser la valeur actuelle entrée par l'utilisateur, ou auto-calculer si vide
        var current = parseFloat(currentInput.value);
        if(!current || current <= 0){
            var weeks = exerciseWeeklyEstimates(sessions, exoKey);
            if(weeks.length > 0){
                current = weeks[weeks.length - 1].max;
                currentInput.value = current.toFixed(1);
            } else {
                current = 0;
            }
        }
        container.innerHTML = renderTimeline(sessions, exoKey, target, horizonWeeks, current);
    }
    function populateExoSelect(){
        var sel = document.getElementById("tmExo");
        if(!sel) return;
        var sessions = loadData();
        var exos = listExercisesWithHistory(sessions);
        if(exos.length === 0){
            sel.innerHTML = '<option value="">(aucun exo tracked)</option>';
            return;
        }
        
        // Ajouter un indicateur de type pour chaque exercice
        var typeIcon = function(type){
            if(type === "time") return "⏱️ ";
            if(type === "elastic") return "➰ ";
            if(type === "session") return "🏋️ ";
            return "⚖️ ";
        };
        
        sel.innerHTML = '<option value="">— Choisir un exo —</option>' +
            exos.map(function(e){ 
                var icon = typeIcon(e.type);
                var typeLabel = e.type === "time" ? "(temps)" : (e.type === "elastic" ? "(élastique)" : (e.type === "session" ? "(séance)" : "(poids)"));
                return '<option value="' + escapeHtml(e.key) + '">' + icon + escapeHtml(e.name) + ' ' + typeLabel + ' · ' + e.count + '×</option>'; 
            }).join("");
        // Auto-fill current value on selection
        sel.addEventListener("change", function(){
            var exoKey = sel.value.trim();
            if(!exoKey) return;
            var weeks = exerciseWeeklyEstimates(sessions, exoKey);
            if(weeks.length > 0){
                var cur = document.getElementById("tmCurrent");
                if(cur) cur.value = weeks[weeks.length - 1].max.toFixed(1);
            }
            renderTimeMachine();
        });
    }
    function initTimeMachine(){
        populateExoSelect();
        renderTimeMachine();
        updateCurrentOnInput();
    }
    window.__initTimeMachine = initTimeMachine;
    window.__renderTimeMachine = renderTimeMachine;

    document.addEventListener("DOMContentLoaded", function(){
        var sec = document.getElementById("timemachine");
        if(!sec) return;
        var btn = document.getElementById("tmComputeBtn");
        if(btn) btn.addEventListener("click", renderTimeMachine);
        var sample = document.getElementById("tmSampleBtn");
        if(sample){
            sample.addEventListener("click", function(){
                var sel = document.getElementById("tmExo");
                var cur = document.getElementById("tmCurrent");
                var tgt = document.getElementById("tmTarget");
                var hz = document.getElementById("tmHorizon");
                if(sel && sel.options.length > 1) sel.value = sel.options[1].value;
                if(cur) cur.value = "100";
                if(tgt) tgt.value = "130";
                if(hz) hz.value = "26";
                renderTimeMachine();
            });
        }
        initTimeMachine();
        try {
            var obs = new MutationObserver(function(){
                if(!sec.classList.contains("hidden")) initTimeMachine();
            });
            obs.observe(sec, { attributes: true, attributeFilter: ["class"] });
        } catch(e){}
    });

    } catch(e){
        window.__timeErr = e.message || String(e);
    }
})();
