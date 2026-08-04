/* ============================================================
   QUICK INJURY PREDICTION — détecte 5 patterns dangereux dans
   l'historique et renvoie un score de risque 0-100 + actions
   concrètes pour les prévenir.
   ============================================================ */
(function(){
    "use strict";
    window.__injuryErr = null;
    try {

    var STORAGE_KEY = "carnetMuscuData";
    var FATIGUE_KEYWORDS = ["fatigu\u00e9", "fatigue", "douloureux", "douleur", "lourd", "cass\u00e9", "casse", "explose", "\u00e9puis\u00e9", "epuis\u00e9", "mal", "bless\u00e9", "souffre", "dur", "p\u00e9nible"];
    var WINDOW_WEEKS = 8; // Fenêtre d'analyse

    // ============================================================
    // DATA LOADERS + AGGREGATION
    // ============================================================
    function loadData(){
        try {
            var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            return Array.isArray(raw.sessions) ? raw.sessions : [];
        } catch(e) {
            window.__injuryErr = e.message;
            return [];
        }
    }
    function safeNum(s){ var n = parseFloat(s); return isNaN(n) ? 0 : n; }
    function sessionVolume(sess){
        var total = 0;
        try {
            (sess.exercises || []).forEach(function(ex){
                (ex.sets || []).forEach(function(st){
                    var reps = safeNum(st.reps);
                    var weight = safeNum(st.weight);
                    if(reps > 0 && reps < 50 && weight >= 0 && weight < 1000){
                        total += reps * (weight > 0 ? weight : 1);
                    }
                });
            });
        } catch(e){}
        return total;
    }
    function isoWeek(date){
        // Renvoie le numéro de semaine ISO depuis une epoch (approx)
        var ms = date.getTime();
        return Math.floor(ms / (7 * 86400000));
    }
    function aggregateWeeklyStats(sessions){
        // 1 seule passe sur toutes les séances
        var byWeek = {};
        var now = Date.now();
        sessions.forEach(function(s){
            if(!s || !s.date) return;
            var d = new Date(s.date);
            if(isNaN(d.getTime())) return;
            var wk = isoWeek(d);
            if(!byWeek[wk]) byWeek[wk] = { volume: 0, sessions: 0, notes: "", muscles: {}, date: d };
            byWeek[wk].volume += sessionVolume(s);
            byWeek[wk].sessions += 1;
            byWeek[wk].notes += " " + (s.notes || "");
            try {
                (s.exercises || []).forEach(function(ex){
                    var k = (ex.exerciseKey || ex.name || "").toLowerCase();
                    if(!k) return;
                    if(!byWeek[wk].muscles[k]) byWeek[wk].muscles[k] = { count: 0, weight: 0 };
                    byWeek[wk].muscles[k].count += (ex.sets || []).length;
                    var sum = 0;
                    (ex.sets || []).forEach(function(st){ sum += safeNum(st.weight); });
                    byWeek[wk].muscles[k].weight += sum;
                });
            } catch(e){}
        });
        // Tri par date
        var sorted = Object.keys(byWeek).map(function(k){ return byWeek[k]; });
        sorted.sort(function(a,b){ return a.date - b.date; });
        return sorted;
    }

    // ============================================================
    // 5 DÉTECTEURS DE RISQUE
    // ============================================================
    function detectVolumeJump(weeks){
        // 3 semaines consécutives avec augmentation >15% ? → élevé
        if(weeks.length < 4) return { score: 0, label: "Pas assez d'historique", reason: "" };
        var recent = weeks.slice(-Math.min(4, weeks.length));
        var increases = [];
        for(var i = 1; i < recent.length; i++){
            var prev = recent[i-1].volume;
            var curr = recent[i].volume;
            if(prev > 100){
                increases.push((curr - prev) / prev);
            }
        }
        if(increases.length < 2) return { score: 0, label: "Stable", reason: "Pas de saut de volume suspect." };
        var consecBig = 0;
        for(var j = 0; j < increases.length; j++){
            if(increases[j] > 0.15) consecBig++;
            else consecBig = 0;
        }
        if(consecBig >= 2){
            return { score: 75 + Math.min(consecBig * 5, 20), label: "Volume en surchauffe", reason: "Augmentation consecutive >15% sur " + (consecBig+1) + " semaines. Risque \u00e9lev\u00e9 de tendinite ou surcharge." };
        }
        if(increases.some(function(x){ return x > 0.10; })){
            return { score: 30, label: "Volume en hausse", reason: "Augmentation заметная, surveille ton ressenti les 2 prochaines semaines." };
        }
        return { score: 0, label: "Volume stable", reason: "Progression saine." };
    }
    function detectFatigueSignals(sessions){
        // Mots-clés dans les notes sur les 14 derniers jours
        var now = Date.now();
        var cutoffMs = 14 * 86400000;
        var hits = [];
        sessions.forEach(function(s, idx){
            if(!s || !s.date) return;
            var d = new Date(s.date);
            if(isNaN(d.getTime())) return;
            if(now - d.getTime() > cutoffMs) return;
            var note = (s.notes || "").toLowerCase();
            FATIGUE_KEYWORDS.forEach(function(kw){
                if(note.indexOf(kw.toLowerCase()) !== -1){
                    hits.push({ sessionIdx: idx, date: s.date, keyword: kw, snippet: s.notes || "" });
                }
            });
        });
        if(hits.length === 0) return { score: 0, label: "Aucun signal de fatigue r\u00e9cent", reason: "Tes 14 derniers jours sont clean." };
        if(hits.length >= 4) return { score: 80, label: "Fatigue r\u00e9p\u00e9t\u00e9e", reason: hits.length + " notes de fatigue/fatigue/douleur sur 14 jours." };
        if(hits.length >= 2) return { score: 50, label: "Signaux de fatigue", reason: hits.length + " notes flag sur 14 jours." };
        return { score: 25, label: "Vague signal de fatigue", reason: "1 signal faible, reste attentif." };
    }
    function detectOvertraining(weeks){
        if(weeks.length < 3) return { score: 0, label: "Pas assez d'historique", reason: "" };
        var recent = weeks.slice(-4);
        if(recent.length === 0) return { score: 0, label: "Aucun entrainement r\u00e9cent", reason: "Reprends doucement." };
        var avgPerWeek = recent.reduce(function(a,w){ return a + w.sessions; }, 0) / recent.length;
        if(avgPerWeek >= 6) return { score: 75, label: "Surentra\u00e9nement probable", reason: avgPerWeek.toFixed(1) + " s\u00e9ances/semaine en moyenne. Le muscle n'a pas le temps de r\u00e9cup\u00e9rer." };
        if(avgPerWeek >= 5) return { score: 40, label: "Cadence intense", reason: avgPerWeek.toFixed(1) + " s\u00e9ances/sem — proche du seuil de surentranement, int\u00e8gre 1 deload toutes les 4 sem." };
        return { score: 0, label: "Cadence saine", reason: avgPerWeek.toFixed(1) + " s\u00e9ances/sem — zone optimale pour la r\u00e9cup\u00e9ration." };
    }
    function detectRecoveryDeficit(sessions){
        // Paires de séances (mêmes groupes musculaires) \u00e9cart <48h
        if(sessions.length < 2) return { score: 0, label: "Pas assez d'historique", reason: "" };
        var now = Date.now();
        // Groupes par date avec set de muscles sollicit\u00e9s
        var sessionMuscles = [];
        sessions.slice(-30).forEach(function(s){
            if(!s || !s.date) return;
            var d = new Date(s.date);
            if(isNaN(d.getTime())) return;
            if(now - d.getTime() > 14 * 86400000) return; // r\u00e9cent
            var ms = {};
            try {
                (s.exercises || []).forEach(function(ex){
                    var muscles = window.getWorkoutMuscleKey ? window.getWorkoutMuscleKey(ex.name || "") : [];
                    if(typeof window.getWorkoutMuscleKey !== "function" || muscles.length === 0){
                        // fallback : utilise le nom directement comme "groupe"
                        var nm = (ex.name || "").toLowerCase().trim();
                        if(nm) ms[nm] = true;
                    } else {
                        muscles.forEach(function(m){ ms[m] = true; });
                    }
                });
            } catch(e){}
            sessionMuscles.push({ date: d, muscles: ms });
        });
        // Trouver paires \u00e9cart <48h avec recouvrement musculaire
        var overlaps = 0;
        var lastByMuscle = {};
        sessionMuscles.sort(function(a,b){ return a.date - b.date; });
        sessionMuscles.forEach(function(sess){
            Object.keys(sess.muscles).forEach(function(mg){
                if(lastByMuscle[mg]){
                    var gap = sess.date.getTime() - lastByMuscle[mg].getTime();
                    var gapH = gap / 3600000;
                    if(gapH < 48) overlaps++;
                }
                lastByMuscle[mg] = sess.date;
            });
        });
        if(overlaps >= 5) return { score: 70, label: "Pas assez de repos", reason: overlaps + " fois un m\u00eame groupe musculaire sollicit\u00e9 <48h." };
        if(overlaps >= 1) return { score: 30, label: "Quelques overlaps", reason: overlaps + " cas de recidive rapide." };
        return { score: 0, label: "R\u00e9cup\u00e9ration OK", reason: "Toujours >48h entre deux sollicitations du m\u00eame groupe." };
    }
    function detectPlateau(sessions){
        // Aucune progression de 1RM sur un exo sur 4+ semaines ?
        if(sessions.length < 5) return { score: 0, label: "Pas assez d'historique", reason: "" };
        // Pour chaque exo : trouver best weight * (1+reps/30) par semaine, v\u00e9rifier variance
        var exoByWeek = {};
        sessions.slice(-40).forEach(function(s){
            if(!s || !s.date) return;
            var d = new Date(s.date);
            if(isNaN(d.getTime())) return;
            var wk = isoWeek(d);
            try {
                (s.exercises || []).forEach(function(ex){
                    var key = (ex.exerciseKey || ex.name || "").toLowerCase().trim();
                    if(!key) return;
                    if(!exoByWeek[key]) exoByWeek[key] = {};
                    if(!exoByWeek[key][wk]) exoByWeek[key][wk] = 0;
                    (ex.sets || []).forEach(function(st){
                        var w = safeNum(st.weight);
                        var r = safeNum(st.reps);
                        if(w > 0 && r > 0 && r < 30){
                            var est = w * (1 + r / 30);
                            if(est > exoByWeek[key][wk]) exoByWeek[key][wk] = est;
                        }
                    });
                });
            } catch(e){}
        });
        var stuckExos = [];
        Object.keys(exoByWeek).forEach(function(key){
            var wks = Object.keys(exoByWeek[key]).sort();
            if(wks.length < 4) return;
            var last4 = wks.slice(-4).map(function(w){ return exoByWeek[key][w]; });
            var min = Math.min.apply(null, last4);
            var max = Math.max.apply(null, last4);
            if(max - min < 0.5) stuckExos.push(key); // <500g diff sur 4 semaines = stuck
        });
        if(stuckExos.length >= 3){
            return { score: 45, label: "Multi-plateaux", reason: stuckExos.length + " exercices stagnant sur 4 sem. Consid\u00e8re un changement de stimulus (slow-tempo, pause, supersets)." };
        }
        if(stuckExos.length >= 1){
            return { score: 15, label: "Quelques stagnations", reason: stuckExos.join(", ") + " stagne. Varier tempo/reps pour relancer." };
        }
        return { score: 0, label: "Progression fluide", reason: "Pas de plateau d\u00e9tect\u00e9 sur les exos suivis." };
    }

    // ============================================================
    // SCORE GLOBAL + ACTIONS
    // ============================================================
    function computeGlobalRisk(subRisks){
        // Pond\u00e9ration : Volume jump 0.20, Fatigue 0.20, Overtraining 0.20, Recovery 0.25, Plateau 0.15
        var weights = { volJump: 0.20, fatigue: 0.20, overtrain: 0.20, recovery: 0.25, plateau: 0.15 };
        var total = subRisks.volJump.score * weights.volJump
                  + subRisks.fatigue.score * weights.fatigue
                  + subRisks.overtrain.score * weights.overtrain
                  + subRisks.recovery.score * weights.recovery
                  + subRisks.plateau.score * weights.plateau;
        return Math.round(total);
    }
    function buildActions(risk, subRisks){
        var actions = [];
        if(subRisks.volJump.score >= 50){
            actions.push({ priority: "HAUTE", text: "🔻 **Réduis ton volume de 20%** cette semaine — la progression linéaire >15%/sem met les tendons en surcharge." });
        }
        if(subRisks.fatigue.score >= 50){
            actions.push({ priority: "HAUTE", text: "😴 **Prends un deload semaine** (60% des charges) — ton corps te dit stop." });
        }
        if(subRisks.overtrain.score >= 50){
            actions.push({ priority: "HAUTE", text: "⚠️ **L\u00e8ve le pied** : 6+ séances/sem n'est pas tenable. Vise 4-5 max." });
        }
        if(subRisks.recovery.score >= 50){
            actions.push({ priority: "MOYENNE", text: "📅 **Espacement** : laisse 48h минимум entre deux séances du même groupe musculaire." });
        }
        if(subRisks.plateau.score >= 30){
            actions.push({ priority: "MOYENNE", text: "🔄 **Varie le stimulus** : ajoute tempo lent (4-0-1-0), pauses 3s isométriques, ou supersets." });
        }
        // Pas de "Tout va bien" ici → le banner ALL CLEAR dans renderInjuryRisk couvre déjà ce cas
        return actions;
    }

    // ============================================================
    // UI — DONUT + LISTE + ACTIONS
    // ============================================================
    function escapeHtml(s){
        return String(s).replace(/[&<>"']/g, function(c){
            return ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c];
        });
    }
    function renderDonut(score){
        var color = score < 30 ? "#4caf50" : score < 60 ? "#ff9800" : "#ad4238";
        var C = 2 * Math.PI * 56; // circumference r=56
        var dash = (score / 100) * C;
        return '<div class="injury-donut">' +
            '<svg viewBox="0 0 140 140" width="140" height="140">' +
                '<circle cx="70" cy="70" r="56" fill="none" stroke="#e0e3dd" stroke-width="14"/>' +
                '<circle cx="70" cy="70" r="56" fill="none" stroke="' + color + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 70 70)"/>' +
                '<text x="70" y="65" text-anchor="middle" font-size="34" font-weight="900" fill="' + color + '">' + score + '</text>' +
                '<text x="70" y="88" text-anchor="middle" font-size="11" fill="#888380" font-weight="600">/100</text>' +
            '</svg>' +
        '</div>';
    }
    function severityClass(score){
        if(score < 30) return "ok";
        if(score < 60) return "warn";
        return "bad";
    }
    function renderInjuryRisk(){
        var container = document.getElementById("injuryRiskPanel");
        if(!container) return;
        var sessions = loadData();
        if(sessions.length === 0){
            container.innerHTML = '<p class="sub" style="text-align:center;padding:32px 16px;">📭 Aucune séance enregistrée.<br>Connecte tes séances pour activer l\'analyse de risque.</p>';
            return;
        }
        var weeks = aggregateWeeklyStats(sessions);
        var subRisks = {
            volJump: detectVolumeJump(weeks),
            fatigue: detectFatigueSignals(sessions),
            overtrain: detectOvertraining(weeks),
            recovery: detectRecoveryDeficit(sessions),
            plateau: detectPlateau(sessions)
        };
        var globalRisk = computeGlobalRisk(subRisks);
        var actions = buildActions(globalRisk, subRisks);

        var subHtml = Object.keys(subRisks).map(function(key){
            var r = subRisks[key];
            return '<div class="injury-row ' + severityClass(r.score) + '">' +
                '<div class="injury-row-head">' +
                    '<span class="injury-row-label">' + escapeHtml(r.label) + '</span>' +
                    '<span class="injury-row-score">' + r.score + '/100</span>' +
                '</div>' +
                '<p class="sub" style="margin:6px 0 0;font-size:11px;line-height:1.5;">' + escapeHtml(r.reason) + '</p>' +
            '</div>';
        }).join("");

        // ALL CLEAR explicite AVANT les actions recommandées (toujours affiché si globalRisk < 30)
        var allClearHtml = '';
        var allOk = Object.keys(subRisks).every(function(k){ return subRisks[k].score < 25; });
        if(allOk){
            allClearHtml = '<div class="injury-action ok" style="border-left:4px solid #4caf50;background:#e8f5e9;font-weight:700;">' +
                '<span class="injury-priority" style="background:#4caf50;color:white;">✅ ALL CLEAR</span>' +
                '<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:#2e7d32;">Aucun risque significatif détecté — Feu vert pour ta prochaine séance. Continue ton rythme, écoute tes signaux.</p>' +
            '</div>';
        }
        var actionsHtml = allClearHtml + actions.map(function(a){
            var cls = a.priority === "HAUTE" ? "bad" : a.priority === "MOYENNE" ? "warn" : "ok";
            return '<div class="injury-action ' + cls + '">' +
                '<span class="injury-priority">' + a.priority + '</span>' +
                '<p style="margin:6px 0 0;font-size:12px;line-height:1.5;">' + a.text + '</p>' +
            '</div>';
        }).join("");

        var verdict = globalRisk < 30
            ? '<p class="injury-verdict ok">🟢 <b>Risque faible</b> — Continue, mais écoute les signaux.</p>'
            : globalRisk < 60
            ? '<p class="injury-verdict warn">🟠 <b>Risque modéré</b> — Ralentis et observe.</p>'
            : '<p class="injury-verdict bad">🔴 <b>Risque élevé</b> — Déload immédiat recommandé.</p>';

        container.innerHTML =
            '<div class="injury-header">' +
                renderDonut(globalRisk) +
                '<div class="injury-header-meta">' +
                    verdict +
                    '<p class="sub" style="margin:10px 0 0;font-size:11px;">Analyse sur ' + weeks.length + ' semaine(s) · ' + sessions.length + ' séance(s)</p>' +
                '</div>' +
            '</div>' +
            '<h3 style="margin:24px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;">🩺 Patterns détectés</h3>' +
            '<div class="injury-list">' + subHtml + '</div>' +
            '<h3 style="margin:24px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;">🛠️ Actions recommandées</h3>' +
            '<div class="injury-actions">' + actionsHtml + '</div >';
    }
    function initInjuryRisk(){
        renderInjuryRisk();
    }
    window.__initInjuryRisk = initInjuryRisk;
    window.__renderInjuryRisk = renderInjuryRisk;

    // Auto-init au chargement + observer pour ré-affichage
    document.addEventListener("DOMContentLoaded", function(){
        var sec = document.getElementById("blessure");
        if(!sec) return;
        // Premier render si déjà visible (peu probable mais safe)
        initInjuryRisk();
        // Observer les changements de classe (.hidden toggled)
        try {
            var obs = new MutationObserver(function(){
                if(!sec.classList.contains("hidden")) initInjuryRisk();
            });
            obs.observe(sec, { attributes: true, attributeFilter: ["class"] });
        } catch(e){}
    });

    } catch(e){
        window.__injuryErr = e.message || String(e);
    }
})();
