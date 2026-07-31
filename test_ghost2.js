// test_ghost2.js — scénario additionnel : séances avec poids à 0

global.window = {};
global.document = {
    getElementById: function(id) {
        if (id === "sessionDate") return { value: "2026-07-31" };
        return null;
    }
};

// Scénario C : l'utilisateur a enregistré SANS remplir les poids
// (a cliqué "Enregistrer la séance" directement, sans toucher inputs)
// → weight reste à 0 → cleanSets vide → pas de ghost
const scenarios = {
    "C_sets_vides_weight_0": [
        { date: "2026-05-01T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 0, reps: 0}, {weight: 0, reps: 0}]}]},
        { date: "2026-05-08T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 0, reps: 0}, {weight: 0, reps: 0}]}]}
    ],
    "D_mix_vide_et_rempli": [
        // Avant : placeholders non remplis. Après : remplie.
        { date: "2026-05-01T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 0, reps: 0}, {weight: 0, reps: 0}]}]},
        { date: "2026-05-08T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 50, reps: 10}, {weight: 50, reps: 10}]}]}
    ],
    "E_AVEC_fix_sIsToday": [
        // 3 séances aujourd'hui mais on utilise la build function SANS sIsToday
        { date: "2026-07-31T08:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 80, reps: 8}]}]},
        { date: "2026-07-31T14:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 82.5, reps: 8}]}]},
        { date: "2026-07-31T20:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 85, reps: 8}]}]}
    ]
};

function norm(name) {
    return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function safeDate(s) {
    if (!s) return null;
    if (s instanceof Date) return isFinite(s.getTime()) ? s : null;
    if (typeof s === "string") { var t = Date.parse(s); return isFinite(t) ? new Date(t) : null; }
    return null;
}
function dayDiff(a, b) {
    var da = safeDate(a), db = safeDate(b);
    if (!da || !db) return null;
    return Math.max(0, Math.round(Math.abs(da.getTime() - db.getTime()) / 86400000));
}

function cleanSets(rawSets) {
    if (!Array.isArray(rawSets)) return [];
    return rawSets.filter(function(s){ return s && !s.isDropSet; })
        .map(function(s){ return { weight: Number(s.weight)||0, reps: Number(s.reps)||0 }; })
        .filter(function(s){ return s.weight > 0 && s.reps > 0; });
}

function isComparableType(t) { return t === "weight" || t === "time" || t === "elastic"; }

// VERSION SANS FIX sIsToday (ce que mon code faisait avant)
function buildPriorMapBuggy() {
    var map = {};
    var dateInputEl = document.getElementById("sessionDate");
    var today = (dateInputEl && dateInputEl.value) || "";
    var sorted = data.sessions.slice().sort(function(a, b) {
        return (safeDate(b.date) ? safeDate(b.date).getTime() : 0)
             - (safeDate(a.date) ? safeDate(a.date).getTime() : 0);
    });
    for (var i = 0; i < sorted.length; i++) {
        var s = sorted[i];
        if (!s || !s.exercises) continue;
        var sDateInput = s.date;
        var sIsToday = false;
        if (typeof sDateInput === "string" && sDateInput.slice(0, 10) === today) sIsToday = true;
        if (sIsToday) continue;
        for (var j = 0; j < s.exercises.length; j++) {
            var ex = s.exercises[j];
            if (!ex || !ex.name) continue;
            var type = ex.type || "weight";
            if (!isComparableType(type)) continue;
            var key = norm(ex.name);
            if (map[key]) continue;
            var cleaned = cleanSets(ex.sets);
            if (!cleaned.length) continue;
            map[key] = { sessionDate: sDateInput, dayAgo: dayDiff(today, sDateInput), type: type, sets: cleaned };
        }
    }
    return map;
}

// VERSION AVEC MON FIX (sIsToday supprimé)
function buildPriorMapFixed() {
    var map = {};
    var dateInputEl = document.getElementById("sessionDate");
    var today = (dateInputEl && dateInputEl.value) || "";
    var sorted = data.sessions.slice().sort(function(a, b) {
        return (safeDate(b.date) ? safeDate(b.date).getTime() : 0)
             - (safeDate(a.date) ? safeDate(a.date).getTime() : 0);
    });
    for (var i = 0; i < sorted.length; i++) {
        var s = sorted[i];
        if (!s || !s.exercises) continue;
        var sDateInput = s.date;
        for (var j = 0; j < s.exercises.length; j++) {
            var ex = s.exercises[j];
            if (!ex || !ex.name) continue;
            var type = ex.type || "weight";
            if (!isComparableType(type)) continue;
            var key = norm(ex.name);
            if (map[key]) continue;
            var cleaned = cleanSets(ex.sets);
            if (!cleaned.length) continue;
            map[key] = { sessionDate: sDateInput, dayAgo: dayDiff(today, sDateInput), type: type, sets: cleaned };
        }
    }
    return map;
}

for (const [name, sessions] of Object.entries(scenarios)) {
    console.log("\n=== Scénario " + name + " ===");
    global.data = { sessions: JSON.parse(JSON.stringify(sessions)) };
    const mapBuggy = buildPriorMapBuggy();
    const mapFixed = buildPriorMapFixed();
    console.log("  BUGGY (avec sIsToday) map keys:", Object.keys(mapBuggy));
    console.log("  FIXED (sans sIsToday) map keys:", Object.keys(mapFixed));
    const key = norm("DC");
    if (mapFixed[key]) {
        console.log("  ✅ My FIX WORKS:", JSON.stringify({ dayAgo: mapFixed[key].dayAgo, setsLen: mapFixed[key].sets.length }));
    } else {
        console.log("  ❌ FIX NE RÉSOUT PAS — autre cause !");
    }
}
