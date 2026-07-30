// =====================================================================
// STATISTIQUES AVANCEES V2 — 7 nouveaux blocs visuels pour la page Stats
// =====================================================================
// Lit `data.sessions` (même schéma que stats-gallery.js), réutilise les
// helpers globaux: calculateVolume, normalizeExerciseName,
// getExerciseDisplayName, formatNumber, formatDateInputFromSession, escapeHtml.
// Chaque bloc s'auto-suffit avec un fallback "Pas de données" et le rendu
// est déclenché à l'ouverture de la page Stats + au chargement initial.
// =====================================================================

(function() {
    "use strict";

    var MUSCLE_COLORS = {
        pecs:    "#d5ff3e",
        biceps:  "#80cbc4",
        triceps: "#ffe082",
        dos:     "#a5d6a7",
        epaules: "#ffab91",
        abdos:   "#ce93d8",
        jambes:  "#90caf9"
    };
    var MUSCLE_LABELS = {
        pecs:    "💪 Pecs",
        biceps:  "💪 Biceps",
        triceps: "🦾 Triceps",
        dos:     "🔙 Dos",
        epaules: "🛡️ Épaules",
        abdos:   "🎯 Abdos",
        jambes:  "🦵 Jambes"
    };

    // ---------- Helpers internes ----------
    function safe(fn, fallback) {
        try { return fn(); } catch (e) { console.warn("[stats-v2]", e); return fallback; }
    }

    function getSessionVolume(session) {
        return typeof calculateVolume === "function" ? calculateVolume(session) : 0;
    }

    function filterByLastDays(sessions, n) {
        if (!Array.isArray(sessions)) return [];
        var now = new Date(); now.setHours(23, 59, 59, 999);
        var cutoff = new Date(now.getTime() - n * 86400000);
        return sessions.filter(function(s) { return new Date(s.date) >= cutoff; });
    }

    // Mappe le nom d'une séance à 1+ groupes musculaires.
    function classifySessionMuscles(session) {
        if (!session || !session.name) return [];
        var n = session.name.toLowerCase();
        if (/pec.*bicep|bicep.*pec/.test(n)) return ["pecs", "biceps"];
        if (/tricep.*dos|dos.*tricep/.test(n)) return ["triceps", "dos"];
        if (/épaule|epaules|epaules/.test(n) && /abdo/.test(n)) return ["epaules", "abdos"];
        if (/épaule|epaules|epaules/.test(n)) return ["epaules"];
        if (/leg|jam|quad|moll/.test(n)) return ["jambes"];
        if (/trapec|pec/.test(n)) return ["pecs"];
        if (/abdo/.test(n)) return ["abdos"];
        if (/dos\b/.test(n)) return ["dos"];
        if (typeof getWorkoutMuscleKey === "function") {
            var k = getWorkoutMuscleKey(session.name);
            if (k && MUSCLE_LABELS[k]) return [k];
        }
        return [];
    }

    function classifyExerciseByName(name) {
        if (!name) return [];
        var n = name.toLowerCase();
        var groups = [];
        // pecs
        if (/pec|bench|bench press|développé couché|dev.*bar|chest press|push up|pompe/.test(n)) groups.push("pecs");
        // biceps
        if (/bicep|curl/.test(n)) groups.push("biceps");
        // triceps
        if (/tricep|extension|barre au front|skull crusher|press.*serré/.test(n)) groups.push("triceps");
        // dos
        if (/tirage|rowing|row\b|pull|lat|tractions?|dos\b/.test(n)) groups.push("dos");
        // épaules
        if (/épaule|epaules|shoulder|élévation|lateral raise|press.*militaire|arnold/.test(n)) groups.push("epaules");
        // abdos
        if (/abdo|crunch|sit[- ]?up|plank|gainage/.test(n)) groups.push("abdos");
        // jambes
        if (/squat|leg|jam|fessier|mollet|lunge|hip thrust|deadlift|soulevé/.test(n)) groups.push("jambes");
        return groups;
    }

    // ---------- Bloc 1: 4 nouveaux Hero cards ----------
    function renderHeroStats(allSessions, recent30) {
        var bestSession = null, bestVolume = 0;
        allSessions.forEach(function(s) {
            var v = getSessionVolume(s);
            if (v > bestVolume) { bestVolume = v; bestSession = s; }
        });
        var el1 = document.getElementById("bestSessionVolume");
        var el1d = document.getElementById("bestSessionDate");
        if (el1) el1.textContent = allSessions.length === 0 ? "—" : formatNumber(bestVolume) + " kg";
        if (el1d) el1d.textContent = bestSession ? (bestSession.name + " · " + formatDateInputFromSession(bestSession.date)) : "Aucune séance";

        // Top exo (30j) en volume brut
        var exoVol = new Map(), exoSets = new Map();
        recent30.forEach(function(s) {
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var key = ex.exerciseKey || normalizeExerciseName(ex.name);
                if (!key) return;
                var vol = (ex.sets || []).reduce(function(sum, set) {
                    return sum + (Number(set.weight) || 0) * (Number(set.reps) || 0);
                }, 0);
                exoVol.set(key, (exoVol.get(key) || 0) + vol);
                exoSets.set(key, (exoSets.get(key) || 0) + (ex.sets || []).length);
            });
            if (s.extraExercises) {
                s.extraExercises.forEach(function(ex) {
                    if (ex.mode !== "sets") return;
                    var key = normalizeExerciseName(ex.name);
                    if (!key) return;
                    exoVol.set(key, (exoVol.get(key) || 0) + (Number(ex.weight) || 0) * (Number(ex.reps) || 0));
                    exoSets.set(key, (exoSets.get(key) || 0) + 1);
                });
            }
        });
        var topExoKey = null, topExoVol = 0;
        exoVol.forEach(function(vol, key) { if (vol > topExoVol) { topExoVol = vol; topExoKey = key; } });
        var el2 = document.getElementById("topExerciseName");
        var el2v = document.getElementById("topExerciseVolume");
        if (el2) el2.textContent = topExoKey ? getExerciseDisplayName(topExoKey) : "—";
        if (el2v) el2v.textContent = topExoKey ? (formatNumber(topExoVol) + " kg · " + exoSets.get(topExoKey) + " séries") : "Aucun exo sur 30j";

        // Jour préféré (historique complet)
        var dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        var dayCount = [0,0,0,0,0,0,0];
        allSessions.forEach(function(s) {
            var d = new Date(s.date).getDay();
            if (!isNaN(d)) dayCount[d]++;
        });
        var maxDay = Math.max.apply(null, dayCount);
        var favIdx = dayCount.indexOf(maxDay);
        var el3 = document.getElementById("favoriteDay");
        var el3c = document.getElementById("favoriteDayCount");
        if (el3) el3.textContent = maxDay === 0 ? "—" : dayNames[favIdx];
        if (el3c) el3c.textContent = maxDay === 0
            ? "Pas encore d'historique"
            : (maxDay + " séance" + (maxDay > 1 ? "s" : "") + " au total");

        // 1RM battus en 30j
        var byExoRec = new Map();
        allSessions.forEach(function(s) {
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var key = ex.exerciseKey || normalizeExerciseName(ex.name);
                if (!key) return;
                if (!byExoRec.has(key)) byExoRec.set(key, []);
                (ex.sets || []).forEach(function(set) {
                    if (set.isDropSet) return;
                    var w = Number(set.weight) || 0, r = Number(set.reps) || 0;
                    if (w <= 0 || r <= 0 || r > 20) return;
                    byExoRec.get(key).push({ date: new Date(s.date), est: w * (1 + r / 30) });
                });
            });
        });
        var recordsBeat = 0;
        var cutoffDate = new Date(new Date().getTime() - 30 * 86400000);
        byExoRec.forEach(function(records) {
            records.sort(function(a, b) { return a.date - b.date; });
            records.forEach(function(r, i) {
                if (r.date < cutoffDate) return;
                var earlierBest = 0;
                for (var j = 0; j < i; j++) {
                    if (records[j].est > earlierBest) earlierBest = records[j].est;
                }
                if (r.est > earlierBest && earlierBest > 0) recordsBeat++;
            });
        });
        var el4 = document.getElementById("recordsBeatCount");
        if (el4) el4.textContent = recordsBeat;
    }

    // ---------- Bloc 2: Tonnage par groupe musculaire ----------
    function renderMuscleGroupBars(allSessions) {
        var recent30 = filterByLastDays(allSessions, 30);
        var volumeByGroup = {};
        Object.keys(MUSCLE_LABELS).forEach(function(k) { volumeByGroup[k] = 0; });

        recent30.forEach(function(s) {
            var v = getSessionVolume(s);
            var groups = classifySessionMuscles(s);
            if (groups.length === 0) return;
            var per = v / groups.length;
            groups.forEach(function(g) { volumeByGroup[g] = (volumeByGroup[g] || 0) + per; });

            // exos supplémentaires (Extra Exercises): classification par nom
            if (s.extraExercises) {
                s.extraExercises.forEach(function(ex) {
                    if (ex.mode !== "sets") return;
                    var w = Number(ex.weight) || 0, r = Number(ex.reps) || 0;
                    if (w <= 0 || r <= 0) return;
                    var exGroups = classifyExerciseByName(ex.name);
                    if (exGroups.length === 0) return;
                    var perEx = (w * r) / exGroups.length;
                    exGroups.forEach(function(g) { volumeByGroup[g] = (volumeByGroup[g] || 0) + perEx; });
                });
            }
        });

        var totalVol = 0;
        Object.keys(volumeByGroup).forEach(function(k) { totalVol += volumeByGroup[k]; });

        var sorted = Object.keys(volumeByGroup)
            .map(function(k) { return [k, volumeByGroup[k]]; })
            .filter(function(p) { return p[1] > 0; })
            .sort(function(a, b) { return b[1] - a[1]; });

        var el = document.getElementById("muscleGroupBars");
        if (!el) return;
        if (sorted.length === 0) {
            el.innerHTML = '<p class="sub">Aucun tonnage enregistré sur les 30 derniers jours.</p>';
            return;
        }
        el.innerHTML = sorted.map(function(p) {
            var key = p[0], vol = p[1];
            var pct = totalVol > 0 ? (vol / totalVol) * 100 : 0;
            var barW = Math.max(pct, 2);
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line);">' +
                '<span style="min-width:110px;font-size:12px;">' + MUSCLE_LABELS[key] + '</span>' +
                '<div style="flex:1;background:#eef1eb;border-radius:6px;height:18px;overflow:hidden;">' +
                    '<div style="width:' + barW + '%;height:100%;background:' + MUSCLE_COLORS[key] + ';border-radius:6px;transition:width .4s;"></div>' +
                '</div>' +
                '<strong style="min-width:100px;text-align:right;font-size:12px;">' + formatNumber(vol) + ' kg · ' + pct.toFixed(0) + '%</strong>' +
                '</div>';
        }).join("");
    }

    // ---------- Bloc 3: Push vs Pull ----------
    function renderPushPull(allSessions) {
        var PUSH = new Set(["pecs", "triceps", "epaules"]);
        var PULL = new Set(["dos", "biceps"]);

        var recent30 = filterByLastDays(allSessions, 30);
        var pushVol = 0, pullVol = 0;
        recent30.forEach(function(s) {
            var v = getSessionVolume(s);
            var groups = classifySessionMuscles(s);
            if (groups.length === 0) return;
            var per = v / groups.length;
            groups.forEach(function(g) {
                if (PUSH.has(g)) pushVol += per;
                else if (PULL.has(g)) pullVol += per;
            });
        });

        var total = pushVol + pullVol;
        var pushPct = total > 0 ? (pushVol / total) * 100 : 50;
        var pullPct = total > 0 ? (pullVol / total) * 100 : 50;
        var ratio = pullVol > 0 ? pushVol / pullVol : Infinity;

        var verdict, verdictColor;
        if (total === 0)        { verdict = "Pas encore de données"; verdictColor = "var(--muted)"; }
        else if (ratio < 0.7)   { verdict = "⚠️ Déficit de pull — travaille le dos"; verdictColor = "#ad4238"; }
        else if (ratio > 1.4)   { verdict = "⚠️ Trop de push — équilibre tes dorsaux"; verdictColor = "#ad4238"; }
        else                    { verdict = "✓ Équilibre push/pull OK"; verdictColor = "var(--lime)"; }

        var el = document.getElementById("pushPullBalance");
        if (!el) return;
        if (total === 0) {
            el.innerHTML = '<p class="sub">Pas de données push/pull sur les 30 derniers jours.</p>';
            return;
        }
        el.innerHTML =
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">' +
                '<div style="padding:14px;background:#ffebee;border-radius:10px;text-align:center;">' +
                    '<div style="font-size:30px;font-weight:800;color:#ad4238">' + pushPct.toFixed(0) + '%</div>' +
                    '<div style="font-size:12px;margin-top:4px;">Push (pecs · triceps · épaules)</div>' +
                    '<div style="font-size:10px;color:var(--muted);margin-top:4px;">' + formatNumber(pushVol) + ' kg</div>' +
                '</div>' +
                '<div style="padding:14px;background:#e8f5e9;border-radius:10px;text-align:center;">' +
                    '<div style="font-size:30px;font-weight:800;color:#2e7d32">' + pullPct.toFixed(0) + '%</div>' +
                    '<div style="font-size:12px;margin-top:4px;">Pull (dos · biceps)</div>' +
                    '<div style="font-size:10px;color:var(--muted);margin-top:4px;">' + formatNumber(pullVol) + ' kg</div>' +
                '</div>' +
            '</div>' +
            '<div style="height:22px;background:#ffebee;border-radius:11px;overflow:hidden;display:flex;">' +
                '<div style="width:' + pushPct + '%;background:#ad4238;"></div>' +
                '<div style="width:' + pullPct + '%;background:var(--lime);"></div>' +
            '</div>' +
            '<div style="margin-top:10px;text-align:center;font-size:13px;color:' + verdictColor + ';font-weight:700;">' + verdict + '</div>';
    }

    // ---------- Bloc 4: Heatmap 30 jours (github-style) ----------
    function renderHeatmap(allSessions) {
        var now = new Date(); now.setHours(0, 0, 0, 0);
        var dayMs = 86400000;

        // volumeByDay: clé ISO locale (YYYY-MM-DD) -> volume total
        var volumeByDay = new Map();
        allSessions.forEach(function(s) {
            var key = formatDateInputFromSession(s.date);
            volumeByDay.set(key, (volumeByDay.get(key) || 0) + getSessionVolume(s));
        });

        // Construire les 30 derniers jours (J-29 → aujourd'hui)
        var cells = [];
        for (var i = 29; i >= 0; i--) {
            var day = new Date(now.getTime() - i * dayMs);
            var key = formatDateInputFromSession(day);
            cells.push({
                date: day,
                key: key,
                vol: volumeByDay.get(key) || 0,
                dateStr: day.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })
            });
        }

        // Pad pour aligner les colonnes sur la grille Monday-first
        var oldestWeekday = cells[0].date.getDay(); // 0=Dim..6=Sam
        var monOldest = (oldestWeekday + 6) % 7; // 0=Lun..6=Dim
        var padded = [];
        for (var p = 0; p < monOldest; p++) padded.push(null);
        cells.forEach(function(c) { padded.push(c); });
        while (padded.length % 7 !== 0) padded.push(null);

        // Découpage en lignes de 7
        var weeks = [];
        for (var w = 0; w < padded.length; w += 7) weeks.push(padded.slice(w, w + 7));

        // Couleur sur 5 niveaux selon max de volume parmi les cellules
        var maxVol = 0;
        cells.forEach(function(c) { if (c.vol > maxVol) maxVol = c.vol; });

        function getColor(vol) {
            if (vol === 0 || maxVol === 0) return "#f1f4ee";
            var r = vol / maxVol;
            if (r < 0.25) return "rgba(213,255,62,0.30)";
            if (r < 0.50) return "rgba(213,255,62,0.55)";
            if (r < 0.75) return "rgba(213,255,62,0.80)";
            return "#d5ff3e";
        }

        var colLabels = ["L","M","M","J","V","S","D"];
        var colLabelHtml = colLabels.map(function(l) {
            return '<div style="font-size:10px;color:var(--muted);text-align:center;">' + l + '</div>';
        }).join("");

        var weeksHtml = weeks.map(function(week) {
            var weekCells = week.map(function(c) {
                if (!c) return '<div style="width:26px;height:26px;"></div>';
                var color = getColor(c.vol);
                var title = c.dateStr + ' · ' + formatNumber(c.vol) + ' kg';
                return '<div title="' + title.replace(/"/g,'&quot;') + '" style="width:26px;height:26px;border-radius:4px;background:' + color + ';"></div>';
            }).join("");
            return '<div></div>' + weekCells;
        }).join("");

        var el = document.getElementById("weeklyHeatmap");
        if (!el) return;
        el.innerHTML =
            '<div style="display:grid;grid-template-columns:18px repeat(7,26px);gap:4px;align-items:center;margin-top:6px;">' +
                '<div></div>' + colLabelHtml + weeksHtml +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;margin-top:14px;font-size:11px;color:var(--muted);flex-wrap:wrap;">' +
                '<span>Moins</span>' +
                '<div style="display:flex;gap:3px;">' +
                    '<div style="width:14px;height:14px;border-radius:3px;background:#f1f4ee;border:1px solid var(--line);"></div>' +
                    '<div style="width:14px;height:14px;border-radius:3px;background:rgba(213,255,62,0.30);"></div>' +
                    '<div style="width:14px;height:14px;border-radius:3px;background:rgba(213,255,62,0.55);"></div>' +
                    '<div style="width:14px;height:14px;border-radius:3px;background:rgba(213,255,62,0.80);"></div>' +
                    '<div style="width:14px;height:14px;border-radius:3px;background:#d5ff3e;"></div>' +
                '</div>' +
                '<span>Plus</span>' +
                '<span style="margin-left:auto;">Max jour: <strong style="color:var(--lime)">' + formatNumber(maxVol) + ' kg</strong></span>' +
            '</div>';
    }

    // ---------- Bloc 5: Top progressions (% croissance 1RM en 30j) ----------
    function renderTopProgressions(allSessions) {
        var byExo = new Map();
        allSessions.forEach(function(s) {
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var key = ex.exerciseKey || normalizeExerciseName(ex.name);
                if (!key) return;
                if (!byExo.has(key)) byExo.set(key, []);
                (ex.sets || []).forEach(function(set) {
                    if (set.isDropSet) return;
                    var w = Number(set.weight) || 0, r = Number(set.reps) || 0;
                    if (w <= 0 || r <= 0 || r > 20) return;
                    byExo.get(key).push({ date: new Date(s.date), est: w * (1 + r / 30) });
                });
            });
        });

        var progressions = [];
        var cutoff30 = new Date(new Date().getTime() - 30 * 86400000);
        byExo.forEach(function(records, key) {
            if (records.length < 2) return;
            var recentMax = 0, previousMax = 0;
            records.forEach(function(r) {
                if (r.date >= cutoff30 && r.est > recentMax) recentMax = r.est;
                else if (r.date < cutoff30 && r.est > previousMax) previousMax = r.est;
            });
            if (recentMax > 0 && previousMax > 0) {
                var pct = ((recentMax - previousMax) / previousMax) * 100;
                if (pct > 0) progressions.push({ key: key, name: getExerciseDisplayName(key), pct: pct, recentMax: recentMax, previousMax: previousMax });
            }
        });

        progressions.sort(function(a, b) { return b.pct - a.pct; });
        var top = progressions.slice(0, 5);

        var el = document.getElementById("topProgressions");
        if (!el) return;
        if (top.length === 0) {
            el.innerHTML = '<p class="sub">Pas encore assez d\'historique (besoin d\'au moins 2 séances par exo sur 60 jours).</p>';
            return;
        }
        el.innerHTML = top.map(function(p, i) {
            return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line);">' +
                '<span style="min-width:24px;color:var(--muted);font-size:11px;font-weight:700;">#' + (i+1) + '</span>' +
                '<span style="flex:1;font-size:13px;">' + escapeHtml(p.name) + '</span>' +
                '<span style="font-size:11px;color:var(--muted);">' + formatNumber(p.previousMax.toFixed(0)) + ' → ' + formatNumber(p.recentMax.toFixed(0)) + ' kg</span>' +
                '<strong style="min-width:64px;text-align:right;color:var(--lime);font-size:14px;">+' + p.pct.toFixed(1) + '%</strong>' +
                '</div>';
        }).join("");
    }

    // ---------- Bloc 6: Records personnels (Big 3) ----------
    function renderPersonalRecords(allSessions) {
        var exoRecords = new Map(); // key -> {name, max1RM, maxReps, maxRepsWeight, maxVol}
        allSessions.forEach(function(s) {
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var key = ex.exerciseKey || normalizeExerciseName(ex.name);
                if (!key) return;
                if (!exoRecords.has(key)) exoRecords.set(key, {
                    name: ex.name, max1RM: 0, max1RMReps: 0, maxReps: 0, maxRepsWeight: 0, maxVol: 0, sessionTotal: 0
                });
                var rec = exoRecords.get(key);
                rec.sessionTotal = 0;
                (ex.sets || []).forEach(function(set) {
                    if (set.isDropSet) return;
                    var w = Number(set.weight) || 0, r = Number(set.reps) || 0;
                    if (w <= 0 || r <= 0 || r > 20) return;
                    var est = w * (1 + r / 30);
                    if (est > rec.max1RM) { rec.max1RM = est; rec.max1RMReps = r; }
                    if (r > rec.maxReps) { rec.maxReps = r; rec.maxRepsWeight = w; }
                    rec.sessionTotal += w * r;
                });
                if (rec.sessionTotal > rec.maxVol) rec.maxVol = rec.sessionTotal;
            });
        });

        var by1RM = Array.from(exoRecords.entries()).filter(function(p) { return p[1].max1RM > 0; })
                       .sort(function(a,b){ return b[1].max1RM - a[1].max1RM; }).slice(0,3);
        var byReps = Array.from(exoRecords.entries()).filter(function(p) { return p[1].maxReps > 0; })
                       .sort(function(a,b){ return b[1].maxReps - a[1].maxReps; }).slice(0,3);
        var byVol = Array.from(exoRecords.entries()).filter(function(p) { return p[1].maxVol > 0; })
                       .sort(function(a,b){ return b[1].maxVol - a[1].maxVol; }).slice(0,3);

        function box(title, items, formatter) {
            var itemsHtml = items.length === 0
                ? '<p class="sub" style="font-size:11px;margin:0;">Pas encore de données.</p>'
                : items.map(function(p, i) {
                    return '<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line);">' +
                        '<span style="font-size:13px;">' + (i+1) + '. ' + escapeHtml(p[1].name) + '</span>' +
                        '<strong style="font-size:13px;">' + formatter(p[1]) + '</strong>' +
                        '</div>';
                }).join("");
            return '<div style="padding:14px;background:#fbfdf8;border:1px solid var(--line);border-radius:10px;">' +
                '<h3 style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">' + title + '</h3>' +
                itemsHtml +
                '</div>';
        }

        var el = document.getElementById("personalRecordsGrid");
        if (!el) return;
        el.innerHTML = [
            box("🔥 Meilleurs 1RM estimés", by1RM, function(r) { return formatNumber(r.max1RM.toFixed(0)) + ' kg'; }),
            box("💯 Plus de reps en charge", byReps, function(r) { return r.maxReps + ' reps @ ' + r.maxRepsWeight + ' kg'; }),
            box("🏋️ Plus gros tonnage en 1 séance", byVol, function(r) { return formatNumber(r.maxVol.toFixed(0)) + ' kg'; })
        ].join("");
    }

    // ---------- Bloc 7: Stagnation (≥ 3 séances consécutives sans progression) ----------
    function renderStagnation(allSessions) {
        var byExo = new Map();
        var exNames = new Map();
        allSessions.forEach(function(s) {
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var key = ex.exerciseKey || normalizeExerciseName(ex.name);
                if (!key) return;
                if (!byExo.has(key)) byExo.set(key, []);
                if (!exNames.has(key)) exNames.set(key, ex.name);
                (ex.sets || []).forEach(function(set) {
                    if (set.isDropSet) return;
                    var w = Number(set.weight) || 0, r = Number(set.reps) || 0;
                    if (w <= 0 || r <= 0 || r > 20) return;
                    byExo.get(key).push({ date: new Date(s.date), est: w * (1 + r / 30) });
                });
            });
        });

        // Pour chaque exo: regarder les 3 dernières séances (distinctes par date)
        // Si best-1RM dans chaque séance est dans une fourchette de ±2.5% → stagnant.
        var stagnant = [];
        byExo.forEach(function(records, key) {
            // Regroupe par date (YYYY-MM-DD)
            var byDate = {};
            records.forEach(function(r) {
                var k = formatDateInputFromSession(r.date);
                if (!byDate[k]) byDate[k] = 0;
                if (r.est > byDate[k]) byDate[k] = r.est;
            });
            var dates = Object.keys(byDate).sort().reverse(); // newest first
            if (dates.length < 3) return;
            var last3 = [byDate[dates[0]], byDate[dates[1]], byDate[dates[2]]];
            var mx = Math.max.apply(null, last3);
            var mn = Math.min.apply(null, last3);
            if (mn > 0 && (mx - mn) / mn < 0.025) {
                stagnant.push({ key: key, name: exNames.get(key) || key, lastDate: dates[0], best: mx, sessions: 3 });
            }
        });

        var el = document.getElementById("stagnationList");
        if (!el) return;
        if (stagnant.length === 0) {
            el.innerHTML = '<p class="sub">✓ Aucun exercice en stagnation. Continue, ta progression est régulière.</p>';
            return;
        }
        el.innerHTML = stagnant.map(function(st) {
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff8e1;border-left:3px solid #ffa000;border-radius:0 6px 6px 0;margin-bottom:8px;">' +
                '<span style="font-size:18px;">💡</span>' +
                '<div style="flex:1;font-size:13px;">' +
                    '<strong>' + escapeHtml(st.name) + '</strong> stagne depuis ' + st.sessions + ' séances' +
                    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">Dernière: ' + st.lastDate + ' · ' + formatNumber(st.best.toFixed(0)) + ' kg estimé</div>' +
                '</div>' +
                '<span style="font-size:11px;color:#ad4238;font-weight:700;background:#fff;padding:4px 8px;border-radius:5px;">+2.5kg ?</span>' +
                '</div>';
        }).join("");
    }

    // ---------- Bloc 8: Fréquence par jour de semaine ----------
    function renderWeekdayFrequency(allSessions) {
        var dayNames = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
        var displayOrder = [1,2,3,4,5,6,0]; // Lundi -> Dimanche
        var counts = [0,0,0,0,0,0,0];
        var volumes = [0,0,0,0,0,0,0];
        allSessions.forEach(function(s) {
            var d = new Date(s.date).getDay();
            if (!isNaN(d)) { counts[d]++; volumes[d] += getSessionVolume(s); }
        });
        var maxCount = Math.max.apply(null, counts);
        var el = document.getElementById("weekdayFrequency");
        if (!el) return;
        if (maxCount === 0) { el.innerHTML = '<p class="sub">Pas encore de séances.</p>'; return; }
        var today = new Date().getDay();
        var bars = displayOrder.map(function(d) {
            var h = Math.max(Math.round((counts[d] / maxCount) * 110), 4);
            var av = counts[d] > 0 ? (volumes[d] / counts[d]) : 0;
            var title = dayNames[d] + ' · ' + counts[d] + ' séances · ' + formatNumber(av) + ' kg/séance moy';
            var isToday = (d === today);
            return '<div title="' + title.replace(/"/g,'&quot;') + '" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;flex:1;cursor:default;">' +
                '<div style="font-size:10px;color:var(--muted);margin-bottom:3px;">' + counts[d] + '</div>' +
                '<div style="width:70%;max-width:38px;background:' + (isToday ? 'var(--lime)' : 'rgba(213,255,62,0.55)') + ';border-radius:4px 4px 0 0;height:' + h + 'px;transition:background .2s;"></div>' +
                '<div style="font-size:11px;color:' + (isToday ? 'var(--ink)' : 'var(--muted)') + ';margin-top:6px;font-weight:' + (isToday ? '700' : '500') + ';">' + dayNames[d] + '</div>' +
                '</div>';
        }).join("");
        el.innerHTML = '<div style="display:flex;align-items:flex-end;gap:6px;height:170px;">' + bars + '</div>';
    }

    // ---------- Bloc 9: Heatmap annuelle (365 jours) ----------
    function renderYearHeatmap(allSessions) {
        var now = new Date(); now.setHours(0,0,0,0);
        var volumeByDay = new Map();
        allSessions.forEach(function(s) {
            var k = formatDateInputFromSession(s.date);
            volumeByDay.set(k, (volumeByDay.get(k) || 0) + getSessionVolume(s));
        });
        var cells = [];
        for (var i = 364; i >= 0; i--) {
            var day = new Date(now.getTime() - i * 86400000);
            var k = formatDateInputFromSession(day);
            cells.push({ date: day, vol: volumeByDay.get(k) || 0 });
        }
        var monOldest = (cells[0].date.getDay() + 6) % 7;
        var padded = [];
        for (var p = 0; p < monOldest; p++) padded.push(null);
        cells.forEach(function(c) { padded.push(c); });
        while (padded.length % 7 !== 0) padded.push(null);
        var weeks = [];
        for (var w = 0; w < padded.length; w += 7) weeks.push(padded.slice(w, w + 7));
        var maxVol = 0;
        cells.forEach(function(c) { if (c.vol > maxVol) maxVol = c.vol; });
        function getColor(vol) {
            if (vol === 0 || maxVol === 0) return "#f1f4ee";
            var r = vol / maxVol;
            if (r < 0.25) return "rgba(213,255,62,0.30)";
            if (r < 0.50) return "rgba(213,255,62,0.55)";
            if (r < 0.75) return "rgba(213,255,62,0.80)";
            return "#d5ff3e";
        }
        var colLabels = ["L","M","M","J","V","S","D"];
        var colLabelHtml = colLabels.map(function(l) {
            return '<div style="font-size:9px;color:var(--muted);text-align:center;height:11px;line-height:11px;">' + l + '</div>';
        }).join("");
        var weeksHtml = weeks.map(function(week) {
            var weekCells = week.map(function(c) {
                if (!c) return '<div style="width:11px;height:11px;"></div>';
                var title = c.date.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}) + ' · ' + formatNumber(c.vol) + ' kg';
                return '<div title="' + title.replace(/"/g,'&quot;') + '" style="width:11px;height:11px;border-radius:2px;background:' + getColor(c.vol) + ';"></div>';
            }).join("");
            return '<div style="display:flex;flex-direction:column;gap:2px;"><div style="height:11px;"></div>' + weekCells + '</div>';
        }).join("");
        var el = document.getElementById("yearHeatmap");
        if (!el) return;
        el.innerHTML = '<div style="overflow-x:auto;padding:8px 0;margin:0 -10px;">' +
            '<div style="display:flex;gap:2px;align-items:flex-start;width:max-content;padding:0 10px;">' +
                '<div style="display:flex;flex-direction:column;gap:2px;margin-right:6px;flex-shrink:0;">' + colLabelHtml + '</div>' +
                weeksHtml +
            '</div></div>';
    }

    // ---------- Bloc 10: Volume mois actuel vs mois précédent + sparkline 12 mois ----------
    function renderVolumeTrendMoM(allSessions) {
        var now = new Date(); now.setHours(23,59,59,999);
        function getMonthStart(offset) {
            var d = new Date(now);
            d.setDate(1);
            d.setMonth(d.getMonth() - offset);
            d.setHours(0,0,0,0);
            return d;
        }
        var monthNames = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
        var months = [];
        for (var i = 11; i >= 0; i--) {
            var start = getMonthStart(i);
            var end = new Date(start); end.setMonth(end.getMonth() + 1);
            var vol = allSessions
                .filter(function(s) { var d = new Date(s.date); return d >= start && d < end; })
                .reduce(function(sum, s) { return sum + getSessionVolume(s); }, 0);
            months.push({ label: monthNames[start.getMonth()], vol: vol, isCurrent: i === 0 });
        }
        var curVol = months[months.length - 1].vol;
        var prevVol = months[months.length - 2].vol;
        var delta = prevVol > 0 ? ((curVol - prevVol) / prevVol) * 100 : null;
        var maxVol = Math.max.apply(null, months.map(function(m) { return m.vol; }));
        var el = document.getElementById("volumeTrendMoM");
        if (!el) return;
        var bars = months.map(function(m) {
            var h = maxVol > 0 ? Math.max(Math.round((m.vol / maxVol) * 110), 2) : 2;
            var color = m.isCurrent ? "var(--lime)" : (m.vol > 0 ? "rgba(213,255,62,0.55)" : "#eef1eb");
            return '<div title="' + m.label + ' · ' + formatNumber(m.vol) + ' kg' + (m.isCurrent ? ' (ce mois)' : '') + '" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;flex:1;min-width:18px;cursor:default;">' +
                '<div style="font-size:9px;color:var(--muted);margin-bottom:2px;min-height:11px;">' + (m.vol > 0 ? Math.round(m.vol/1000) + 'k' : '') + '</div>' +
                '<div style="width:80%;max-width:30px;background:' + color + ';border-radius:3px 3px 0 0;height:' + h + 'px;"></div>' +
                '<div style="font-size:9px;color:var(--muted);margin-top:3px;">' + m.label + '</div>' +
                '</div>';
        }).join("");
        var deltaHtml = delta !== null
            ? ('<span style="color:' + (delta >= 0 ? 'var(--lime)' : '#ad4238') + ';font-weight:700;font-size:22px;">' + (delta >= 0 ? '↑' : '↓') + ' ' + (delta >= 0 ? '+' : '') + delta.toFixed(0) + '%</span>')
            : '<span style="color:var(--muted);font-size:13px;">Pas de mois précédent</span>';
        el.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">' +
                '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Ce mois</div>' +
                    '<div style="font-size:26px;font-weight:800;color:var(--lime);line-height:1.1;">' + formatNumber(curVol) + ' kg</div></div>' +
                '<div style="text-align:center;">' + deltaHtml + '</div>' +
                '<div style="text-align:right;"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Mois −1</div>' +
                    '<div style="font-size:18px;color:var(--muted);">' + formatNumber(prevVol) + ' kg</div></div>' +
            '</div>' +
            '<div style="display:flex;align-items:end;gap:3px;height:140px;margin-top:14px;padding:0 4px;">' + bars + '</div>';
    }

    // ---------- Bloc 11: Distribution intensité (léger / moyen / lourd) ----------
    function renderIntensityDistribution(allSessions) {
        var volumes = allSessions.map(function(s) { return getSessionVolume(s); }).filter(function(v) { return v > 0; });
        var el = document.getElementById("intensityDistribution");
        if (!el) return;
        if (volumes.length === 0) { el.innerHTML = '<p class="sub">Pas encore de séances avec volume.</p>'; return; }
        var sorted = volumes.slice().sort(function(a,b){ return a-b; });
        var min = sorted[0];
        var max = sorted[sorted.length - 1];
        var q1 = sorted[Math.floor(sorted.length / 4)];
        var q3 = sorted[Math.floor(sorted.length * 3 / 4)];
        var buckets = { 'Légères': 0, 'Moyennes': 0, 'Lourdes': 0 };
        var bucketVol = { 'Légères': 0, 'Moyennes': 0, 'Lourdes': 0 };
        allSessions.forEach(function(s) {
            var v = getSessionVolume(s);
            if (v <= 0) return;
            var b = v < q1 ? 'Légères' : (v <= q3 ? 'Moyennes' : 'Lourdes');
            buckets[b]++;
            bucketVol[b] += v;
        });
        var total = buckets['Légères'] + buckets['Moyennes'] + buckets['Lourdes'];
        var colors = { 'Légères': '#a5d6a7', 'Moyennes': '#ffe082', 'Lourdes': '#ffab91' };
        var icons = { 'Légères': '🌱', 'Moyennes': '⚡', 'Lourdes': '🔥' };
        var rows = ['Légères', 'Moyennes', 'Lourdes'].map(function(name) {
            var c = buckets[name];
            var pct = total > 0 ? (c / total) * 100 : 0;
            var avg = c > 0 ? bucketVol[name] / c : 0;
            var barW = Math.max(pct, 3);
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line);">' +
                '<span style="min-width:96px;font-size:12px;font-weight:600;">' + icons[name] + ' ' + name + '</span>' +
                '<div style="flex:1;background:#eef1eb;border-radius:6px;height:18px;overflow:hidden;">' +
                    '<div style="width:' + barW + '%;height:100%;background:' + colors[name] + ';border-radius:6px;transition:width .4s;"></div>' +
                '</div>' +
                '<span style="min-width:120px;text-align:right;font-size:12px;"><strong>' + c + '</strong>·séance' + (c > 1 ? 's' : '') + ' · ' + (avg > 0 ? formatNumber(avg.toFixed(0)) + ' kg moy' : '—') + '</span>' +
                '</div>';
        }).join('');
        el.innerHTML = '<div style="margin-bottom:10px;font-size:11px;color:var(--muted);">Seuils auto Q1/Q3 sur tes séances réelles (entre ' + formatNumber(min.toFixed(0)) + ' et ' + formatNumber(max.toFixed(0)) + ' kg).</div>' + rows;
    }

    // ---------- Bloc 12: Records perso PAR groupe musculaire ----------
    function renderPerMuscleRecords(allSessions) {
        var MUSCLES = Object.keys(MUSCLE_LABELS);
        var records = {};
        MUSCLES.forEach(function(m) { records[m] = { best1RM: 0, date: null, name: null, volume30j: 0 }; });
        var cutoff30 = new Date(new Date().getTime() - 30 * 86400000);
        allSessions.forEach(function(s) {
            var sessionDate = new Date(s.date);
            var sessionGroups = classifySessionMuscles(s);
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var exGroups = classifyExerciseByName(ex.name);
                if (exGroups.length === 0 && sessionGroups.length > 0) exGroups = sessionGroups;
                if (exGroups.length === 0) return;
                (ex.sets || []).forEach(function(set) {
                    if (set.isDropSet) return;
                    var w = Number(set.weight) || 0, r = Number(set.reps) || 0;
                    if (w <= 0 || r <= 0 || r > 20) return;
                    var est = w * (1 + r / 30);
                    var vol = w * r;
                    exGroups.forEach(function(g) {
                        if (!records[g]) return;
                        if (est > records[g].best1RM) {
                            records[g].best1RM = est;
                            records[g].date = sessionDate;
                            records[g].name = ex.name;
                        }
                        if (sessionDate >= cutoff30) {
                            records[g].volume30j += vol / exGroups.length;
                        }
                    });
                });
            });
        });
        var el = document.getElementById("perMuscleRecords");
        if (!el) return;
        var html = MUSCLES.map(function(m) {
            var r = records[m];
            return '<div style="padding:12px;border:1px solid var(--line);border-radius:10px;background:#fbfdf8;">' +
                '<div style="display:flex;align-items:center;gap:6px;">' +
                    '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + MUSCLE_COLORS[m] + ';"></span>' +
                    '<span style="flex:1;font-size:12px;font-weight:700;">' + MUSCLE_LABELS[m] + '</span>' +
                '</div>' +
                '<div style="margin-top:6px;font-size:20px;color:var(--lime);font-weight:800;line-height:1.1;">' +
                    (r.best1RM > 0 ? formatNumber(r.best1RM.toFixed(0)) + ' kg' : '—') +
                '</div>' +
                '<div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.4;">' +
                    (r.best1RM > 0
                        ? '🏷 ' + escapeHtml(r.name || '') + '<br>📅 ' + formatDateInputFromSession(r.date)
                        : 'Aucun record') +
                '</div>' +
                '<div style="font-size:10px;margin-top:6px;color:var(--muted);">' +
                    '30j: <strong style="color:var(--ink);">' + formatNumber(r.volume30j.toFixed(0)) + ' kg</strong>' +
                '</div>' +
                '</div>';
        }).join("");
        el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;">' + html + '</div>';
    }

    // ---------- Bloc 13: Records perdus (alerte rouge) ----------
    function renderLostRecords(allSessions) {
        var byExo = new Map();
        var exNames = new Map();
        allSessions.forEach(function(s) {
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var key = ex.exerciseKey || normalizeExerciseName(ex.name);
                if (!key) return;
                if (!byExo.has(key)) byExo.set(key, { peak: 0, peakDate: null, latest: 0, latestDate: null });
                if (!exNames.has(key)) exNames.set(key, ex.name);
                (ex.sets || []).forEach(function(set) {
                    if (set.isDropSet) return;
                    var w = Number(set.weight) || 0, r = Number(set.reps) || 0;
                    if (w <= 0 || r <= 0 || r > 20) return;
                    var est = w * (1 + r / 30);
                    var d = new Date(s.date);
                    var data = byExo.get(key);
                    if (est > data.peak) { data.peak = est; data.peakDate = d; }
                    if (!data.latestDate || d >= data.latestDate) {
                        data.latest = est;
                        data.latestDate = d;
                    }
                });
            });
        });
        var lost = [];
        var now = new Date();
        byExo.forEach(function(data, key) {
            if (data.peak <= 0) return;
            if (data.latest < data.peak) {
                var daysSincePeak = Math.floor((now - data.peakDate) / 86400000);
                if (daysSincePeak >= 14) {
                    lost.push({
                        name: exNames.get(key),
                        peak: data.peak,
                        peakDate: data.peakDate,
                        latest: data.latest,
                        daysSincePeak: daysSincePeak
                    });
                }
            }
        });
        lost.sort(function(a, b) { return b.daysSincePeak - a.daysSincePeak; });
        var el = document.getElementById("lostRecords");
        if (!el) return;
        if (lost.length === 0) {
            el.innerHTML = '<p class="sub">✓ Aucun record fragilisé sur 14+ jours. Tes performances sont stables ou en hausse.</p>';
            return;
        }
        el.innerHTML = lost.slice(0, 6).map(function(l) {
            var pct = ((l.peak - l.latest) / l.peak) * 100;
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#ffebee;border-left:3px solid #ad4238;border-radius:0 6px 6px 0;margin-bottom:8px;">' +
                '<span style="font-size:18px;">⚠️</span>' +
                '<div style="flex:1;font-size:13px;">' +
                    '<strong>' + escapeHtml(l.name) + '</strong> — record non retrouvé' +
                    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">Pic: ' + l.peak.toFixed(0) + ' kg il y a ' + l.daysSincePeak + 'j · Maintenant: ' + l.latest.toFixed(0) + ' kg (−' + pct.toFixed(0) + '%)</div>' +
                '</div>' +
                '</div>';
        }).join("");
    }

    // ---------- Master entry ----------
    function renderExtendedStats() {
        if (typeof data === "undefined" || !Array.isArray(data.sessions)) return;
        var all = data.sessions;
        var recent30 = filterByLastDays(all, 30);
        safe(function(){ renderHeroStats(all, recent30); });
        safe(renderMuscleGroupBars.bind(null, all));
        safe(renderPushPull.bind(null, all));
        safe(renderHeatmap.bind(null, all));
        safe(renderTopProgressions.bind(null, all));
        safe(renderPersonalRecords.bind(null, all));
        safe(renderStagnation.bind(null, all));
        safe(renderWeekdayFrequency.bind(null, all));
        safe(renderYearHeatmap.bind(null, all));
        safe(renderVolumeTrendMoM.bind(null, all));
        safe(renderIntensityDistribution.bind(null, all));
        safe(renderPerMuscleRecords.bind(null, all));
        safe(renderLostRecords.bind(null, all));
    }

    function bindHooks() {
        var navs = document.querySelectorAll('[data-page="stats"]');
        navs.forEach(function(el) {
            el.addEventListener("click", function() { setTimeout(renderExtendedStats, 30); });
        });
        // Initial render (pour que les conteneurs hidden soient déjà remplis)
        setTimeout(renderExtendedStats, 120);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindHooks);
    } else {
        bindHooks();
    }
})();
