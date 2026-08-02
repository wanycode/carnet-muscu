// =====================================================================
// QUICK-MAP — Carte corporelle interactive (mini-page accessible via "MAP")
// =====================================================================
// Lit data.sessions. Pour chaque muscle, compte la charge (kg déplacé)
// sur la période choisie. Colore les <path class="map-muscle"> du SVG.
// La sélection d'un muscle ouvre le drill-down (#mapDetailPanel).
// =====================================================================

(function() {
    "use strict";

    var MUSCLE_KEYS = ["pecs", "biceps", "triceps", "dos", "epaules", "abdos", "jambes"];
    var MUSCLE_DISPLAY = {
        pecs:    "💪 Pectoraux",
        biceps:  "💪 Biceps",
        triceps: "🦾 Triceps",
        dos:     "🔙 Dos",
        epaules: "🛡️ Épaules",
        abdos:   "🎯 Abdominaux",
        jambes:  "🦵 Jambes"
    };

    // ---- Classifieurs (dupliqués depuis stats-extended.js — IIFE) ----
    function classifySessionMuscles(session) {
        if (!session || !session.name) return [];
        var n = session.name.toLowerCase();
        if (/pec.*bicep|bicep.*pec/.test(n)) return ["pecs", "biceps"];
        if (/tricep.*dos|dos.*tricep/.test(n)) return ["triceps", "dos"];
        if (/(épaule|epaules|epaules)/.test(n) && /abdo/.test(n)) return ["epaules", "abdos"];
        if (/(épaule|epaules|epaules)/.test(n)) return ["epaules"];
        if (/leg|jam|quad|moll/.test(n)) return ["jambes"];
        if (/trapec|pec/.test(n)) return ["pecs"];
        if (/abdo/.test(n)) return ["abdos"];
        if (/dos\b/.test(n)) return ["dos"];
        return [];
    }

    function classifyExerciseByName(name) {
        if (!name) return [];
        var n = name.toLowerCase();
        var groups = [];
        if (/pec|bench|bench press|développé couché|dev.*bar|chest press|push up|pompe/.test(n)) groups.push("pecs");
        // biceps (exclure leg curls qui contiennent "curl" + mot-clé jambe)
        var isLegExercise = /leg\s*curl|legcurl|leg-|jamb|ischio|hamstring|moll|quad\b|quadriceps|fessier|glute|femoral|mollet/.test(n);
        if ((/bicep/.test(n)) || (/curl/.test(n) && !isLegExercise)) groups.push("biceps");
        if (/tricep|extension|barre au front|skull crusher|press.*serré/.test(n)) groups.push("triceps");
        if (/tirage|rowing|row\b|pull|lat|tractions?|dos\b/.test(n)) groups.push("dos");
        if (/épaule|epaules|shoulder|élévation|lateral raise|press.*militaire|arnold/.test(n)) groups.push("epaules");
        if (/abdo|crunch|sit[- ]?up|plank|gainage/.test(n)) groups.push("abdos");
        if (/squat|leg|jam|fessier|mollet|lunge|hip thrust|deadlift|soulevé/.test(n)) groups.push("jambes");
        return groups;
    }

    // ---- Calcul de charge par muscle, par fenêtre ----
    function computeLoadByMuscle(sessions, days) {
        var byMuscle = {};
        MUSCLE_KEYS.forEach(function(k){ byMuscle[k] = { load: 0, sessions: 0, lastDate: null, exercises: {} }; });
        if (!Array.isArray(sessions) || typeof days !== "number") return byMuscle;

        var now = new Date(); now.setHours(23, 59, 59, 999);
        var cutoff = new Date(now.getTime() - days * 86400000);

        sessions.forEach(function(s) {
            if (!s || !s.date) return;
            var d = new Date(s.date);
            if (d < cutoff) return;

            var sGroups = classifySessionMuscles(s);
            if (sGroups.length === 0) return;
            var sesVolume = (typeof calculateVolume === "function") ? calculateVolume(s) : 0;
            var perGroup = sesVolume / sGroups.length;
            sGroups.forEach(function(g) {
                if (!byMuscle[g]) byMuscle[g] = { load: 0, sessions: 0, lastDate: null, exercises: {} };
                byMuscle[g].load += perGroup;
                byMuscle[g].sessions++;
                if (byMuscle[g].lastDate === null || d > byMuscle[g].lastDate) byMuscle[g].lastDate = d;
            });

            // Détail par exercice
            (s.exercises || []).forEach(function(ex) {
                if (ex.type && ex.type !== "weight") return;
                var exGroups = classifyExerciseByName(ex.name);
                if (exGroups.length === 0) exGroups = sGroups;
                if (exGroups.length === 0) return;
                var sets = ex.sets || [];
                sets.forEach(function(set) {
                    if (set.isDropSet) return;
                    var w = Number(set.weight) || 0, r = Number(set.reps) || 0;
                    if (w <= 0 || r <= 0 || r > 20) return;
                    var est = w * (1 + r / 30);
                    exGroups.forEach(function(g) {
                        if (!byMuscle[g]) return;
                        var exoName = ex.name || "Exercice";
                        if (!byMuscle[g].exercises[exoName]) {
                            byMuscle[g].exercises[exoName] = { lastDate: d, sets: 0, maxWeight: 0, bestEst1RM: 0 };
                        }
                        var rec = byMuscle[g].exercises[exoName];
                        rec.sets += 1;
                        if (w > rec.maxWeight) rec.maxWeight = w;
                        if (est > rec.bestEst1RM) rec.bestEst1RM = est;
                    });
                });
            });
        });

        return byMuscle;
    }

    function getColorForLoad(load, maxLoad) {
        if (load === 0 || maxLoad === 0) return "rgba(213,255,62,0.35)";
        var ratio = load / maxLoad;
        if (ratio < 0.25) return "rgba(213,255,62,0.30)";
        if (ratio < 0.50) return "rgba(213,255,62,0.55)";
        if (ratio < 0.80) return "rgba(213,255,62,0.85)";
        return "#ffa000";
    }

    var currentMode = "7j";

    function renderMap() {
        if (typeof data === "undefined" || !Array.isArray(data.sessions)) return;
        var days = currentMode === "30j" ? 30 : 7;
        var byMuscle = computeLoadByMuscle(data.sessions, days);
        var maxLoad = 0;
        Object.keys(byMuscle).forEach(function(k){ if (byMuscle[k].load > maxLoad) maxLoad = byMuscle[k].load; });

        var muscles = document.querySelectorAll(".map-muscle");
        var banner = document.getElementById("mapBalanceBanner");

        if (currentMode === "equilibre") {
            // Push vs PULL: re-coloration rouge/vert
            var push = ["pecs", "triceps", "epaules"];
            var pull = ["dos", "biceps"];
            var pushSum = push.reduce(function(s, k){ return s + (byMuscle[k] ? byMuscle[k].load : 0); }, 0);
            var pullSum = pull.reduce(function(s, k){ return s + (byMuscle[k] ? byMuscle[k].load : 0); }, 0);
            muscles.forEach(function(el) {
                var key = el.getAttribute("data-muscle");
                if (push.indexOf(key) >= 0) {
                    el.setAttribute("fill", pushSum > 0 ? "rgba(173,66,56,0.65)" : "transparent");
                } else if (pull.indexOf(key) >= 0) {
                    el.setAttribute("fill", pullSum > 0 ? "rgba(46,125,50,0.65)" : "transparent");
                } else {
                    // abdos & jambes neutres
                    el.setAttribute("fill", "rgba(108,117,108,0.18)");
                }
            });

            if (banner) {
                var ratio = pullSum > 0 ? pushSum / pullSum : (pushSum > 0 ? Infinity : 0);
                var verdict = "✓ Équilibre OK";
                var color = "var(--lime)";
                if (ratio === 0) { verdict = "Pas de données"; color = "var(--muted)"; }
                else if (ratio < 0.7) { verdict = "⚠️ Déficit PULL"; color = "#ad4238"; }
                else if (ratio > 1.4) { verdict = "⚠️ Excès PUSH"; color = "#ad4238"; }
                banner.style.display = "block";
                banner.innerHTML =
                    '<div style="padding:14px;background:#fbfdf8;border:1px solid var(--line);border-radius:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;align-items:center;">' +
                        '<div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">PUSH</div><div style="font-size:20px;font-weight:800;color:#ad4238;">' + formatNumber(pushSum) + ' kg</div></div>' +
                        '<div style="text-align:center;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">Ratio</div><div style="font-size:22px;font-weight:800;color:' + color + ';">' + (ratio === Infinity ? "∞" : ratio.toFixed(2)) + '</div><div style="font-size:11px;color:' + color + ';font-weight:700;">' + verdict + '</div></div>' +
                        '<div style="text-align:right;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">PULL</div><div style="font-size:20px;font-weight:800;color:#2e7d32;">' + formatNumber(pullSum) + ' kg</div></div>' +
                    '</div>';
            }
        } else {
            muscles.forEach(function(el) {
                var key = el.getAttribute("data-muscle");
                if (!byMuscle[key]) { el.setAttribute("fill", "transparent"); return; }
                el.setAttribute("fill", getColorForLoad(byMuscle[key].load, maxLoad));
            });
            if (banner) banner.style.display = "none";
        }

        var legend = document.getElementById("mapLegend");
        if (legend) {
            var modeLabel = currentMode === "30j" ? "30 derniers jours" : (currentMode === "equilibre" ? "Push vs Pull (30j)" : "7 derniers jours");
            legend.innerHTML =
                '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--muted);">' +
                    '<span style="font-size:11px;font-weight:600;">Repos</span>' +
                    '<div style="display:flex;gap:3px;">' +
                        '<div style="width:14px;height:14px;border-radius:3px;background:transparent;border:1px dashed var(--line);" title="Jamais"></div>' +
                        '<div style="width:14px;height:14px;border-radius:3px;background:rgba(213,255,62,0.30);"></div>' +
                        '<div style="width:14px;height:14px;border-radius:3px;background:rgba(213,255,62,0.55);"></div>' +
                        '<div style="width:14px;height:14px;border-radius:3px;background:rgba(213,255,62,0.85);"></div>' +
                        '<div style="width:14px;height:14px;border-radius:3px;background:#ffa000;"></div>' +
                    '</div>' +
                    '<span style="font-size:11px;font-weight:600;">Très chargé</span>' +
                    '<span style="margin-left:auto;font-weight:700;color:var(--lime);font-size:12px;">' + modeLabel + '</span>' +
                '</div>';
        }
    }

    function selectMuscle(key) {
        var panel = document.getElementById("mapDetailPanel");
        if (!panel) return;
        var days = currentMode === "30j" ? 30 : 7;
        var byMuscle = computeLoadByMuscle(data.sessions, days);
        var m = byMuscle[key];
        if (!m) return;

        document.querySelectorAll(".map-muscle").forEach(function(el) {
            if (el.getAttribute("data-muscle") === key) {
                el.setAttribute("stroke", "var(--lime)");
                el.setAttribute("stroke-width", "3");
            } else {
                el.setAttribute("stroke", "var(--line)");
                el.setAttribute("stroke-width", "1.5");
            }
        });

        var exoList = Object.keys(m.exercises).map(function(name){
            return { name: name, info: m.exercises[name] };
        }).sort(function(a, b){ return new Date(b.info.lastDate) - new Date(a.info.lastDate); });

        var periodLabel = currentMode === "30j" ? "30 derniers jours" : (currentMode === "equilibre" ? "toute période" : "7 derniers jours");

        var html =
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
                '<h2 style="margin:0;">' + (MUSCLE_DISPLAY[key] || key) + '</h2>' +
                '<button class="btn" id="mapDeselectBtn" style="padding:4px 10px;font-size:11px;background:transparent;border:1px solid var(--line);color:var(--muted);">× Fermer</button>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:14px 0;">' +
                '<div style="padding:10px;background:#fbfdf8;border-radius:8px;"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">Charge ' + periodLabel + '</div><div style="font-size:22px;font-weight:800;color:var(--lime);">' + formatNumber(m.load) + ' kg</div></div>' +
                '<div style="padding:10px;background:#fbfdf8;border-radius:8px;"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">Séances</div><div style="font-size:22px;font-weight:800;color:var(--ink);">' + m.sessions + '</div></div>' +
            '</div>' +
            '<p class="sub" style="font-size:11px;margin:0 0 8px;">Dernière stimulation : <strong>' + (m.lastDate ? formatDateInputFromSession(m.lastDate) : "—") + '</strong></p>' +
            '<h3 style="margin-top:14px;margin-bottom:6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:700;">Exercices associés</h3>';

        if (exoList.length === 0) {
            html += '<p class="sub" style="font-size:12px;">Aucun exercice logué sur cette période pour ce groupe.</p>';
        } else {
            html += exoList.slice(0, 6).map(function(exo) {
                return '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line);">' +
                    '<span style="font-size:13px;">' + escapeHtml(exo.name) + '</span>' +
                    '<strong style="font-size:11px;text-align:right;">' + exo.info.sets + ' séries <span class="sub">· max ' + exo.info.maxWeight + ' kg</span></strong>' +
                '</div>';
            }).join('');
        }

        panel.innerHTML = html;
        var deselect = document.getElementById("mapDeselectBtn");
        if (deselect) deselect.addEventListener("click", deselectMuscle);
    }

    function deselectMuscle() {
        document.querySelectorAll(".map-muscle").forEach(function(el) {
            el.setAttribute("stroke", "var(--line)");
            el.setAttribute("stroke-width", "1.5");
        });
        var panel = document.getElementById("mapDetailPanel");
        if (panel) panel.innerHTML = '<p class="sub" style="text-align:center;padding:24px 0;margin:0;">👆 Tape sur un muscle pour voir le détail (charge, séances, exercices associés).</p>';
    }

    function setMode(btn) {
        document.querySelectorAll('[data-map-mode]').forEach(function(b) {
            b.style.background = "transparent";
            b.style.color = "var(--muted)";
            b.style.borderColor = "var(--line)";
            b.style.fontWeight = "400";
        });
        btn.style.background = "var(--lime)";
        btn.style.color = "#1c291e";
        btn.style.borderColor = "var(--lime)";
        btn.style.fontWeight = "700";
        currentMode = btn.getAttribute("data-map-mode");
        renderMap();
        deselectMuscle();
    }

    function bindHooks() {
        if (typeof data === "undefined" || !Array.isArray(data.sessions)) return;

        document.querySelectorAll('[data-map-mode]').forEach(function(btn) {
            btn.addEventListener("click", function(){ setMode(btn); });
        });

        document.querySelectorAll(".map-muscle").forEach(function(el) {
            var key = el.getAttribute("data-muscle");
            el.addEventListener("click", function(){ selectMuscle(key); });
            el.addEventListener("touchstart", function(e) {
                e.preventDefault();
                selectMuscle(key);
            }, { passive: false });
        });

        // Re-render when MAP section becomes visible (e.g. after a new session was logged)
        var mapSection = document.getElementById("map");
        if (mapSection && typeof MutationObserver !== "undefined") {
            try {
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(m) {
                        if (m.attributeName === "class" && !mapSection.classList.contains("hidden")) {
                            try { renderMap(); deselectMuscle(); } catch (e) { console.warn("[MAP]", e); }
                        }
                    });
                });
                observer.observe(mapSection, { attributes: true, attributeFilter: ["class"] });
            } catch (e) { console.warn("[MAP observer]", e); }
        }

        try { renderMap(); } catch (e) { console.warn("[MAP]", e); }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindHooks);
    } else {
        bindHooks();
    }
})();
