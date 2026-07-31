// test_ghost.js — simulation du bug GHOST

global.window = {};
global.document = {
    getElementById: function(id) {
        if (id === "sessionDate") return { value: "2026-07-31" };
        return null;
    }
};

const scenarios = {
    "A_3_dates_differentes": [
        { date: "2026-05-05T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 70, reps: 8}, {weight: 72.5, reps: 8}, {weight: 72.5, reps: 7}]}]},
        { date: "2026-05-12T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 75, reps: 8}, {weight: 75, reps: 8}, {weight: 75, reps: 7}]}]},
        { date: "2026-05-19T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 77.5, reps: 8}, {weight: 77.5, reps: 8}, {weight: 77.5, reps: 7}]}]}
    ],
    "B_3_aujourd_hui": [
        { date: "2026-07-31T08:30:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 80, reps: 8}, {weight: 80, reps: 8}, {weight: 80, reps: 7}]}]},
        { date: "2026-07-31T14:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 82.5, reps: 8}, {weight: 82.5, reps: 8}, {weight: 82.5, reps: 7}]}]},
        { date: "2026-07-31T20:30:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 85, reps: 8}, {weight: 85, reps: 8}, {weight: 85, reps: 7}]}]}
    ]
};

function norm(name) {
    return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function safeDate(s) {
    if (!s) return null;
    if (s instanceof Date) return isFinite(s.getTime()) ? s : null;
    if (typeof s === "string") {
        var t = Date.parse(s);
        return isFinite(t) ? new Date(t) : null;
    }
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

// AVANT fix (avec sIsToday)
function buildPriorMapOld() {
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
            map[key] = {
                sessionDate: sDateInput,
                dayAgo: dayDiff(today, sDateInput),
                type: type,
                sets: cleaned
            };
        }
    }
    return map;
}

for (const [name, sessions] of Object.entries(scenarios)) {
    console.log("\n=== Scénario " + name + " ===");
    global.data = { sessions: JSON.parse(JSON.stringify(sessions)) };
    console.log("  #sessionDate =", document.getElementById("sessionDate").value);
    const mapOld = buildPriorMapOld();
    console.log("  map keys:", Object.keys(mapOld));
    const key = norm("DC");
    if (mapOld[key]) {
        console.log("  ✅ GHOST (old):", JSON.stringify({ dayAgo: mapOld[key].dayAgo, setsLen: mapOld[key].sets.length, weights: mapOld[key].sets.map(function(s){ return s.weight + 'x' + s.reps; }) }));
    } else {
        console.log("  ❌ PAS DE GHOST — bug reproduit");
    }
}
