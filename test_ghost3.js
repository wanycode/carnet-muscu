// test_ghost3.js — valide les diagnostics + le fix sIsToday via les helpers exposés

global.window = global;
global.console = console;

global.document = {
    getElementById: function(id) {
        if (id === "sessionDate") return { value: "2026-07-31" };
        return null;
    }
};

// ============= CENARIO E (3 séances aujourd'hui avec poids valides) =============
const dataE = {
    sessions: [
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

// ============= CENARIO C (sets avec weight=0 — placeholder non rempli) =============
const dataC = {
    sessions: [
        { date: "2026-05-01T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 0, reps: 0}, {weight: 0, reps: 0}]}]},
        { date: "2026-05-08T12:00:00.000Z", name: "PECS + BICEPS",
          exercises: [{name: "DC", type: "weight",
            sets: [{weight: 0, reps: 0}, {weight: 0, reps: 0}]}]}
    ]
};

// Charger quickghost.js comme un module ESM compatible : on l'évaluation dans
// le contexte global pour exposer __ghostDebug et __ghostBuildPriorMap
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'quickghost.js'), 'utf8');

function runScenario(label, sessions) {
    console.log("\n========== " + label + " ==========");
    global.data = sessions;
    // Reset captured logs
    const logs = [];
    const origLog = console.log;
    const origWarn = console.warn;
    console.log = function(...a) { logs.push(['log', a.join(' ')]); origLog.apply(console, a); };
    console.warn = function(...a) { logs.push(['warn', a.join(' ')]); origWarn.apply(console, a); };

    // Re-eval quickghost.js with current global state
    delete require.cache[path.join(__dirname, 'quickghost.js')];
    try { eval(src); } catch(e) { console.error("eval failed:", e.message); }

    console.log = origLog;
    console.warn = origWarn;
    
    const result = global.__ghostDebug();
    const map = result;
    
    console.log("→ map keys:", Object.keys(map));
    console.log("→ dc ghost:", map["dc"] ? "✅ FOUND dayAgo=" + map["dc"].dayAgo + " sets.length=" + map["dc"].sets.length : "❌ MISSING");
    console.log("→ diagnostic stack:");
    logs.filter(l => l[0] === 'log' && l[1].includes('[GHOST]')).forEach(l => console.log("  >", l[1].slice(0, 150)));
    
    // Reset helpers between runs
    delete global.__ghostDebug;
    delete global.__ghostBuildPriorMap;
}

runScenario("CENARIO E : 3 séances aujourd'hui avec poids valides", dataE);
runScenario("CENARIO C : séances avec poids=0 (non rempli)", dataC);
