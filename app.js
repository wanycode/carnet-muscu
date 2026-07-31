const STORAGE_KEY = "carnetMuscuData";
const MAX_STORAGE_KEY = "carnetMuscuMax";


// Fonction de normalisation des noms d'exercices pour le suivi de progression
function normalizeExerciseName(name) {
    return String(name || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
        .replace(/[^a-z0-9]/g, "") // Garde seulement lettres et chiffres
        .trim();
}

// Ajoute à `store.program` les nouveaux programmes par défaut qui ne s'y trouvent pas.
// Ne touche jamais à un programme déjà existant ou personnalisé par l'utilisateur.
function ensureCanonicalWorkoutsPresent(store){
    // Garde-fou : si une seance canonique manque dans data.program (suite a une
    // ancienne migration, suppression manuelle ou rename), on la re-injecte avec un nouvel id.
    if(!Array.isArray(store.program) || !Array.isArray(defaultProgram)) return;
    const existingIds = store.program.map(function(w){ return Number(w.id) || 0; });
    let nextId = Math.max(0, ...existingIds) + 1;
    defaultProgram.forEach(function(seed){
        const alreadyHas = store.program.some(function(w){ return w.name === seed.name; });
        if(alreadyHas) return;
        const clone = JSON.parse(JSON.stringify(seed));
        clone.id = nextId++;
        store.program.push(clone);
    });
}

function ensureDefaultProgramSeeded(store){
    if(!Array.isArray(store.program) || !Array.isArray(defaultProgram)) return;
    defaultProgram.forEach(seed => {
        const exists = store.program.some(w => Number(w.id) === Number(seed.id));
        if(!exists){
            store.program.push(JSON.parse(JSON.stringify(seed)));
        }
    });
}

// Deux écritures d'un même exercice (accents, majuscules, espaces ou tirets)
// doivent alimenter la même progression.
function getExerciseDisplayName(name) {
    return String(name || "").trim().replace(/\s+/g, " ");
}

function getWorkoutMuscleKey(workoutName) {
    const name = normalizeExerciseName(workoutName);
    const muscles = [];
    if(name.includes("pec") || name.includes("chest")) muscles.push("pecs");
    if(name.includes("bicep")) muscles.push("biceps");
    if(name.includes("tricep")) muscles.push("triceps");
    if(name.includes("dos") || name.includes("back")) muscles.push("dos");
    if(name.includes("epaule") || name.includes("shoulder")) muscles.push("epaules");
    if(name.includes("abdo") || name.includes("core")) muscles.push("abdos");
    if(name.includes("leg") || name.includes("jambe") || name.includes("quad")) muscles.push("jambes");
    return muscles.sort().join("-") || name;
}

function getTipsForWorkout(workoutName) {
    const muscleKey = getWorkoutMuscleKey(workoutName);
    const tips = [];
    [...data.sessions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(session => {
            if(getWorkoutMuscleKey(session.name) !== muscleKey) return;
            (session.exercises || []).forEach(exercise => {
                const tip = String(exercise.tip || "").trim();
                if(tip && !tips.some(item => item.tip === tip)) {
                    tips.push({ name: getExerciseDisplayName(exercise.name), tip });
                }
            });
        });
    return tips;
}

function getStagnantExercisesForWorkout(workoutName) {
    const muscleKey = getWorkoutMuscleKey(workoutName);
    const historyByExercise = new Map();

    data.sessions.forEach(session => {
        if(getWorkoutMuscleKey(session.name) !== muscleKey) return;
        (session.exercises || []).forEach(exercise => {
            const key = exercise.exerciseKey || normalizeExerciseName(exercise.name);
            if(!key) return;
            const bestWeight = Math.max(0, ...(exercise.sets || [])
                .filter(set => !set.isDropSet)
                .map(set => Number(set.weight) || 0));
            if(bestWeight <= 0) return;
            if(!historyByExercise.has(key)) historyByExercise.set(key, { name: getExerciseDisplayName(exercise.name), entries: [] });
            historyByExercise.get(key).entries.push({ date: new Date(session.date), weight: bestWeight });
        });
    });

    return [...historyByExercise.values()]
        .filter(exercise => {
            const recent = exercise.entries.sort((a, b) => a.date - b.date).slice(-3);
            if(recent.length < 3) return false;
            const weights = recent.map(entry => entry.weight);
            return Math.max(...weights) - Math.min(...weights) < 2.5;
        })
        .map(exercise => exercise.name);
}

const defaultProgram = [

    {
        id: 1,
        name: "PECS + BICEPS",
        exercises: [
            {
                name: "Haut chest press",
                weight: 40,
                sets: 3,
                reps: 10
            },
            {
                name: "Développé couché",
                weight: 42.5,
                sets: 4,
                reps: 10
            },
            {
                name: "Pec deck",
                weight: 22.5,
                sets: 3,
                reps: 10
            },
            {
                name: "Curl machine",
                weight: 40,
                sets: 4,
                reps: 10
            },
            {
                name: "Curl hammer poulie",
                weight: 30,
                sets: 3,
                reps: 10
            },
            {
                name: "Curl unilateral dos poulie",
                weight: 17.5,
                sets: 3,
                reps: 10
            }
        ]
    },


    {
        id: 2,
        name: "TRICEPS + DOS",
        exercises: [
            {
                name: "Tractions",
                weight: 0,
                sets: 3,
                reps: "échec"
            },
            {
                name: "Tirage horizontal",
                weight: 50,
                sets: 3,
                reps: 10
            },
            {
                name: "Tirage vertical",
                weight: 60,
                sets: 3,
                reps: 10
            },
            {
                name: "Triceps pushdown poulie",
                weight: 45,
                sets: 3,
                reps: 10
            },
            {
                name: "Triceps extension",
                weight: 25,
                sets: 3,
                reps: 10
            },
            {
                name: "Dips",
                weight: 0,
                sets: 3,
                reps: 10
            }
        ]
    },


    {
        id: 3,
        name: "ÉPAULES + ABDOS",
        exercises: [
            {
                name: "Shoulder press",
                weight: 45,
                sets: 4,
                reps: 10
            },
            {
                name: "Elevation latérale poulie",
                weight: 12.5,
                sets: 3,
                reps: 10
            },
            {
                name: "Elevation frontale poulie",
                weight: 12.5,
                sets: 3,
                reps: 10
            },
            {
                name: "Elevation derrière poulie",
                weight: 12.5,
                sets: 3,
                reps: 10
            },
            {
                name: "Crunch machine",
                weight: 60,
                sets: 3,
                reps: 10
            },
            {
                name: "Captain's chair",
                weight: 0,
                sets: 3,
                reps: 10
            },
            {
                name: "Crunch machine oblique",
                weight: 5,
                sets: 3,
                reps: 10
            }
        ]
    },


    {
        id: 4,
        name: "LEGDAY",
        exercises: [
            {
                name: "Hack Squat",
                weight: 45,
                sets: 4,
                reps: 10
            },
            {
                name: "Leg extension",
                weight: 85,
                sets: 3,
                reps: 10
            },
            {
                name: "Leg curl",
                weight: 50,
                sets: 3,
                reps: 10
            },
            {
                name: "Leg press",
                weight: 90,
                sets: 4,
                reps: 10
            },
            {
                name: "Hip abduction",
                weight: 80,
                sets: 3,
                reps: 10
            }
        ]
    }

];



let data = {

    program: defaultProgram,

    sessions: []

};

let maxData = {
    records: []
};

const monthNames = [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];

const calendarIcons = {
    "LEGDAY": "🦵",
    "PECS + BICEPS": "💪",
    "TRICEPS + DOS": "🦾",
    "ÉPAULES + ABDOS": "🛡️",
    "ÉLASTIQUE": "➰"
};

// Les seuls programmes qui doivent apparaître dans la suggestion du dashboard,
// la liste du programme, et le sélecteur de séance. Toutes les séances perso
// (anciennes "ÉLASTIQUE", nouvelles via "+ Nouvelle séance") restent en
// localStorage mais ne s'affichent plus.
const CANONICAL_WORKOUT_NAMES = [
    "PECS + BICEPS",
    "TRICEPS + DOS",
    "ÉPAULES + ABDOS",
    "LEGDAY"
];

function getCanonicalWorkouts(){
    // Filtre les séances perso en gardant uniquement les 4 noms canoniques,
    // déduplique par nom (insensible à la casse) puis trie dans l'ordre canonique
    // défini dans CANONICAL_WORKOUT_NAMES (PECS+BICEPS en premier garanti).
    const list = (data.program || []).filter(function(w){
        const wKey = String(w.name || "").toLowerCase().trim();
        return CANONICAL_WORKOUT_NAMES.some(function(c){ return c.toLowerCase() === wKey; });
    });
    const seen = new Set();
    const deduped = [];
    list.forEach(function(w){
        const key = String(w.name || "").toLowerCase().trim();
        if(seen.has(key)) return;
        seen.add(key);
        deduped.push(w);
    });
    deduped.sort(function(a, b){
        const aKey = String(a.name || "").toLowerCase().trim();
        const bKey = String(b.name || "").toLowerCase().trim();
        return CANONICAL_WORKOUT_NAMES.findIndex(function(c){ return c.toLowerCase() === aKey; })
             - CANONICAL_WORKOUT_NAMES.findIndex(function(c){ return c.toLowerCase() === bKey; });
    });
    return deduped;
}

const calendarState = {
    date: new Date()
};function loadData(){

    const saved = localStorage.getItem(STORAGE_KEY);


    if(saved){

        data = JSON.parse(saved);

        migrateDataShape(data);    // persiste les seed/garanties canoniques

    }

    else{

        saveData();

    }



    const maxSaved = localStorage.getItem(MAX_STORAGE_KEY);
    if(maxSaved){
        maxData = JSON.parse(maxSaved);
    }
}

// Migration douce : ajoute les nouveaux champs optionnels à l'existant
// sans casser les données stockées. Idempotent.
function migrateDataShape(store){
    if(!store || typeof store !== "object") return;

    (store.program || []).forEach(workout => {
        if(!Object.prototype.hasOwnProperty.call(workout, "isCustom")){
            workout.isCustom = false;
        }
        if(!Object.prototype.hasOwnProperty.call(workout, "defaultType")){
            workout.defaultType = "weight";
        }
        (workout.exercises || []).forEach(ex => {
            if(!ex.type) ex.type = "weight";
            if(!Object.prototype.hasOwnProperty.call(ex, "circuitId")){
                ex.circuitId = null;
            }
        });
    });        (store.sessions || []).forEach(session => {
            (session.exercises || []).forEach(ex => {
                if(!ex.type) ex.type = "weight";
                if(!Object.prototype.hasOwnProperty.call(ex, "circuitId")){
                    ex.circuitId = null;
                }
            });
        });

        // Injecte les nouveaux programmes par défaut (ex: ÉLASTIQUE) sans
        // écraser ceux que l'utilisateur a déjà personnalisés.
        ensureDefaultProgramSeeded(store);

        // Garde-fou : si une séance canonique (PECS+BICEPS, TRICEPS+DOS,
        // ÉPAULES+ABDOS, LEGDAY) a été perdue du store (ancienne migration,
        // suppression manuelle, rename), on la re-injecte avec un nouvel id.
        ensureCanonicalWorkoutsPresent(store);

        // Persiste la migration si elle a modifié store.program.
        saveData();
    }



function saveData(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

}

function saveMaxData(){
    localStorage.setItem(MAX_STORAGE_KEY, JSON.stringify(maxData));
}



function formatNumber(number){

    if(Number.isInteger(number)){

        return number;

    }

    return number.toFixed(1);

}

function getTodayDateInputValue(){
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function sessionDateFromInput(value){
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

function formatDateInputFromSession(sessionDate){
    const date = new Date(sessionDate);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function initSessionDateField(){
    const input = document.getElementById("sessionDate");
    if(!input) return;
    if(!input.value){
        input.value = getTodayDateInputValue();
    }
}

function refreshSessionViews(){
    renderDashboard();
    renderHistory();
    renderCalendar();
    if(typeof initExerciseProgress === "function") initExerciseProgress();
}



function calculateVolume(session){

    let total = 0;


    session.exercises.forEach(ex=>{

        // Les séries en temps (gainage, ...) et en élastique à résistance
        // pondérée n'entrent pas dans le volume en kg.
        if(ex.type === "time") return;

        ex.sets.forEach(set=>{


            const weight = Number(set.weight) || 0;

            const reps = Number(set.reps) || 0;


            // Pour l'élastique, "weight" représente une résistance indicielle
            // (1=léger, 2=moyen, 3=fort). On l'exclut du volume en kg.
            const effectiveWeight = ex.type === "elastic" ? 0 : weight;


            total += effectiveWeight * reps;


        });


    });


    return total;

}



function getWeekSessions(){


    const now = new Date();


    const monday = new Date();

    monday.setDate(
        now.getDate() - ((now.getDay()+6)%7)
    );

    monday.setHours(0, 0, 0, 0);


    return data.sessions.filter(session=>{


        const sessionDate = new Date(session.date);

        sessionDate.setHours(0, 0, 0, 0);

        return sessionDate >= monday;


    });


}document.addEventListener(
"DOMContentLoaded",
()=>{
    // Stamp de version : permet de vérifier visuellement que le browser
    // sert bien le nouveau bundle (sinon le cache joue).
    console.log("%cCarnet Muscu V2 · build v2.0 (Mode rapide Épaules-Abdos)",
        "background:#d5ff3e;color:#1c291e;padding:4px 8px;border-radius:4px;font-weight:700;");


    loadData();


    initNavigation();


    renderDashboard();


    renderProgram();


    renderHistory();


    fillSessionSelect();


    fillProgressExercises();

    initSessionDateField();

    initAiAssistant();

    renderCalendar();


    const prevButton = document.getElementById("prevMonth");
    const nextButton = document.getElementById("nextMonth");
    const calendarModal = document.getElementById("calendarModal");

    if(prevButton){
        prevButton.addEventListener("click", ()=>{
            const date = calendarState.date;
            calendarState.date = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            renderCalendar();
        });
    }

    if(nextButton){
        nextButton.addEventListener("click", ()=>{
            const date = calendarState.date;
            calendarState.date = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            renderCalendar();
        });
    }

    if(calendarModal){
        calendarModal.addEventListener("click", e=>{
            if(e.target === calendarModal){
                calendarModal.close();
            }
        });
        const closeBtn = calendarModal.querySelector(".close");
        if(closeBtn){
            closeBtn.addEventListener("click", ()=>{
                calendarModal.close();
            });
        }
    }

    initSessionEditModal();

});
function initNavigation(){

    const links = document.querySelectorAll("nav a, [data-page]");


    links.forEach(link=>{


        link.addEventListener("click", e=>{


            e.preventDefault();


            const page = link.dataset.page;


            if(!page) return;


            showPage(page);


        });


    });


}



function showPage(page){


    const sections = document.querySelectorAll("main section");


    sections.forEach(section=>{


        section.classList.add("hidden");


    });


    const target = document.getElementById(page);


    if(target){

        target.classList.remove("hidden");

        if(page === "stats") renderAdvancedStats();
        if(page === "gallery") renderPhotos();

        if(page === "history") renderHistory();

        if(page === "calendar") renderCalendar();

    }



    if(page==="dashboard"){

        renderDashboard();

    }


    if(page==="programme"){

        renderProgram();

    }


    if(page==="history"){

        renderHistory();

    }


    if(page==="log"){

        fillSessionSelect();
        initSessionDateField();

    }


    if(page==="progress"){

        fillProgressExercises();

    }

    if(page==="calendar"){

        renderCalendar();

    }

    if(page==="calculator"){

        // Calculator page doesn't need specific rendering

    }

}





function getSessionsForDay(date){
    const normalized = new Date(date);
    normalized.setHours(0,0,0,0);

    return data.sessions.filter(session=>{
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0,0,0,0);
        return sessionDate.getTime() === normalized.getTime();
    });
}

function getDayEmojiForSession(session){
    if(!session) return "";
    if(calendarIcons[session.name]) return calendarIcons[session.name];
    // Fallback : déduit l'émoji du type par défaut de la séance (utile
    // pour les séances custom "Élastique" / "Temps" créées via + Nouvelle séance)
    var workout = data.program.find(function(w){ return w.name === session.name; });
    if(workout){
        if(workout.defaultType === "elastic") return "➰";
        if(workout.defaultType === "time") return "⏱️";
    }
    return "🏋️";
}

function renderCalendar(){
    const title = document.getElementById("calendarTitle");
    const grid = document.getElementById("calendarGrid");
    if(!title || !grid) return;

    const year = calendarState.date.getFullYear();
    const month = calendarState.date.getMonth();

    title.textContent = `${monthNames[month]} ${year}`;

    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weekdays = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
    const mobileWeekdays = ["L","M","M","J","V","S","D"];
    const useShortWeekdays = window.matchMedia("(max-width: 760px)").matches;
    const weekdayLabels = useShortWeekdays ? mobileWeekdays : weekdays;
    let html = weekdayLabels.map(day => `<div class="weekday">${day}</div>`).join("");

    for(let i = 0; i < startWeekday; i++){
        html += `<div class="day-cell empty"></div>`;
    }

    for(let day = 1; day <= daysInMonth; day++){
        const currentDate = new Date(year, month, day);
        const sessions = getSessionsForDay(currentDate);
        const session = sessions[0];
        const emoji = session ? getDayEmojiForSession(session) : "";

        html += `
            <div class="day-cell">
                <button class="day-button" data-day="${day}" ${sessions.length === 0 ? "disabled" : ""}>
                    <span class="day-number">${day}</span>
                    <span class="day-emoji">${emoji}</span>
                </button>
            </div>
        `;
    }

    grid.innerHTML = html;

    grid.querySelectorAll(".day-button").forEach(button=>{
        button.addEventListener("click", ()=>{
            const day = Number(button.dataset.day);
            const selectedDate = new Date(year, month, day);
            const sessions = getSessionsForDay(selectedDate);
            openCalendarModal(selectedDate, sessions);
        });
    });
}

function openCalendarModal(date, sessions){
    const modal = document.getElementById("calendarModal");
    const content = document.getElementById("calendarModalContent");
    if(!modal || !content) return;

    const dateLabel = date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    let html = `<h2>${dateLabel}</h2>`;

    if(sessions.length === 0){
        html += `<p>Aucune séance enregistrée.</p>`;
    } else {
        sessions.forEach(session => {
            const groups = groupExercisesForDisplay(session.exercises || []);
            const exercisesHtml = groups.map(group => {
                if(group.kind === "circuit"){
                    const inner = group.items.map(ex => `
                        <div class="circuit-item">
                            <span class="circuit-item-name">${escapeHtml(ex.name)}${renderExerciseTypeChip(ex)}</span>
                            <span class="circuit-item-sets">${renderExerciseSetsDetail(ex)}</span>
                            ${renderExerciseGainage(ex)}
                            ${ex.tip ? `<div class="exercise-tip-block"><strong style="font-size:11px;">💡 Conseil suivant</strong><br>${escapeHtml(ex.tip)}</div>` : ""}
                        </div>
                    `).join("");
                    return `
                        <div class="circuit-block circuit-block-${group.circuitId}">
                            <div class="circuit-block-badge">🔁 Circuit ${group.circuitId}</div>
                            <div class="circuit-block-content">${inner}</div>
                        </div>
                    `;
                }
                const ex = group.exercise;
                return `
                    <div class="logged">
                        <strong>${escapeHtml(ex.name)} ${renderExerciseTypeChip(ex)}</strong>
                        <div style="margin-top:4px;font-size:12px;">
                            ${renderExerciseSetsDetail(ex)}
                        </div>
                        ${renderExerciseGainage(ex)}
                        ${ex.tip ? `<div style="margin-top:6px;padding:8px 10px;background:#f7f8f5;border-left:3px solid var(--lime);border-radius:0 6px 6px 0;font-size:12px;"><strong style="font-size:11px;">💡 Conseil suivant</strong><br>${escapeHtml(ex.tip)}</div>` : ""}
                    </div>
                `;
            }).join("");

            html += `
                <div class="card" style="margin-bottom:14px;">
                    <h3>${getDayEmojiForSession(session)} ${escapeHtml(session.name)}</h3>
                    <p style="margin:6px 0 10px;color:var(--muted);">Volume: ${formatNumber(calculateVolume(session))} kg</p>
                    <p style="margin:0 0 10px;font-size:13px;color:var(--muted);">${escapeHtml(session.note || "Aucune note")}</p>
                    <div style="font-size:13px;line-height:1.6;">
                        ${exercisesHtml}
                        ${session.extraExercises && session.extraExercises.length > 0 ? `
                            <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">
                                <strong style="color:var(--muted);font-size:12px;">🏃 Exercices supplémentaires:</strong><br>
                                ${session.extraExercises.map(extra => `
                                    <span style="color:var(--muted);">${escapeHtml(extra.name)}</span> -
                                    ${extra.mode === 'time' ? `${extra.duration} min (${extra.intensity || 'intensité non précisée'})` : `${extra.sets} séries x ${extra.reps} reps @ ${extra.weight}kg`}
                                `).join("<br>")}
                            </div>
                        ` : ""}
                    </div>
                    <button type="button" class="btn lime edit-session-btn" data-session-id="${session.id}" style="margin-top:10px;">
                        Modifier
                    </button>
                </div>
            `;
        });
    }

    content.innerHTML = html;

    content.querySelectorAll(".edit-session-btn").forEach(button=>{
        button.addEventListener("click", ()=>{
            const session = data.sessions.find(item => item.id === Number(button.dataset.sessionId));
            if(!session) return;
            modal.close();
            openSessionEditor(session);
        });
    });

    modal.showModal();
}

function escapeHtml(value){
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildAiAdvice(prompt = ""){
    const recentSessions = data.sessions.slice(-10);
    const lastSession = recentSessions[recentSessions.length - 1];
    const previousSession = recentSessions[recentSessions.length - 2];

    if(!lastSession){
        return {
            title: "🎯 Coach IA prêt",
            text: "Ajoute 2 à 3 séances pour que l’assistant puisse analyser tes progrès et te proposer des conseils concrets.",
            bullets: [
                "📌 Objectif recommandé : 3 séances cette semaine",
                "💡 Focus : technique et récupération",
                "🚀 Prochaine action : enregistrer une séance"
            ]
        };
    }

    const lastVolume = calculateVolume(lastSession);
    const previousVolume = previousSession ? calculateVolume(previousSession) : lastVolume;
    const delta = lastVolume - previousVolume;
    const trend = delta > 0 ? "📈 Tu progresses bien !" : delta < 0 ? "📉 Le volume est un peu plus bas" : "➡️ Le volume est stable";
    const nextWorkout = getNextWorkoutName(lastSession.name);
    const avgVolume = recentSessions.reduce((sum, session) => sum + calculateVolume(session), 0) / recentSessions.length;
    const weekSessions = getWeekSessions().length;

    // Analyse des records personnels
    let newRecords = [];
    const best = {};
    data.sessions.forEach(session => {
        session.exercises.forEach(ex => {
            ex.sets.forEach(set => {
                const weight = Number(set.weight) || 0;
                if(!best[ex.name] || weight > best[ex.name]) {
                    if(best[ex.name] && weight > best[ex.name]) {
                        newRecords.push(ex.name);
                    }
                    best[ex.name] = weight;
                }
            });
        });
    });

    const normalizedPrompt = (prompt || "").toLowerCase();
    let advice = `Le meilleur prochain pas est d’enchaîner ${nextWorkout} avec une progression progressive : 1 série supplémentaire ou +2,5 kg sur un exercice de base si la technique reste propre.`;

    if(normalizedPrompt.includes("objectif") || normalizedPrompt.includes("semaine")){
        advice = `Objectif réaliste : viser ${Math.round(avgVolume / 1000)} à ${Math.round(avgVolume / 1000 + 1)}k de volume cette semaine en gardant la technique propre.`;
    } else if(normalizedPrompt.includes("repos") || normalizedPrompt.includes("récup") || normalizedPrompt.includes("recovery")){
        advice = "Pour récupérer, garde 1 à 2 jours sans surcharge, dors bien et privilégie l’hydratation et une mobilité légère.";
    } else if(normalizedPrompt.includes("jambes") || normalizedPrompt.includes("périm") || normalizedPrompt.includes("perim")){
        advice = `Comme tu as travaillé ${lastSession.name.toLowerCase()}, concentre-toi sur la qualité des séries et ajoute 1 répétition ou 2,5 kg sur un exercice de base si la forme reste propre.`;
    }

    return {
        title: "🤖 Coach IA",
        text: `${trend}. Le dernier volume est d’environ ${formatNumber(lastVolume)} kg, contre ${formatNumber(previousVolume)} kg avant.`,
        bullets: [
            `🎯 Prochaine séance : ${nextWorkout}`,
            advice,
            `Niveau de charge : ${delta >= 0 ? "à maintenir ou légèrement augmenter" : "à ajuster avec plus de récupération"}`
        ]
    };
}

function renderWeeklyBars(){
    const bars = document.querySelectorAll(".bar i");
    if(bars.length === 0) return;

    const now = new Date();
    const monday = new Date();
    monday.setDate(now.getDate() - ((now.getDay()+6)%7));
    monday.setHours(0, 0, 0, 0);

    const weekDays = [];
    for(let i = 0; i < 7; i++){
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        weekDays.push(day);
    }

    weekDays.forEach((day, index) => {
        const hasSession = data.sessions.some(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);
            const checkDay = new Date(day);
            checkDay.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === checkDay.getTime();
        });

        if(bars[index]){
            bars[index].classList.toggle("active", hasSession);
        }
    });
}

function renderAiAssistant(){
    const reply = document.getElementById("aiReply");
    if(!reply) return;

    const advice = buildAiAdvice();
    reply.innerHTML = `
        <div>
            <strong>${escapeHtml(advice.title)}</strong>
            <p>${escapeHtml(advice.text)}</p>
            <ul>
                ${advice.bullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join("")}
            </ul>
        </div>
    `;
}

function initAiAssistant(){
    const reply = document.getElementById("aiReply");
    const refreshButton = document.getElementById("refreshAi");

    if(!reply) return;

    if(refreshButton){
        refreshButton.addEventListener("click", ()=>{
            renderAiAssistant();
        });
    }

    renderAiAssistant();
}

function renderDashboard(){


    const sessions = getWeekSessions();


    const weekSessions =
        document.getElementById("weekSessions");


    if(weekSessions){

        weekSessions.textContent =
            sessions.length;

    }



    const last =
        data.sessions[data.sessions.length-1];



    const lastWorkout =
        document.getElementById("lastWorkout");



    if(lastWorkout){

        lastWorkout.textContent =
            last ? last.name : "-";

    }




    const volume =
        sessions.reduce(
            (total,session)=>
            total + calculateVolume(session),
            0
        );



    const weekVolume =
        document.getElementById("weekVolume");



    if(weekVolume){

        weekVolume.textContent =
            formatNumber(volume)+" kg";

    }




    const records =
        document.getElementById("records");



    if(records){

        records.textContent =
            calculateRecords();

    }



    const activity =
        document.getElementById("lastActivity");



    if(activity){


        if(!last){

            activity.innerHTML =
            "Aucune séance enregistrée.";


        }
        else{


            activity.innerHTML = `

            <b>${last.name}</b>

            <br>

            ${new Date(last.date).toLocaleDateString("fr-FR")}

            <br>

            ${formatNumber(calculateVolume(last))} kg déplacés

            `;


        }


    }


    const nextWorkout =
        document.getElementById("nextWorkout");

    if(nextWorkout){
        nextWorkout.textContent =
            getNextWorkoutName(last ? last.name : null);
    }

    const tipsContainer = document.getElementById("nextWorkoutTips");
    if(tipsContainer){
        const suggestedWorkout = getNextWorkoutName(last ? last.name : null);
        const tips = getTipsForWorkout(suggestedWorkout);
        const stagnantExercises = getStagnantExercisesForWorkout(suggestedWorkout);
        tipsContainer.innerHTML = [
            tips.length
                ? `<strong>Conseils de ta dernière séance similaire</strong>${tips.slice(0, 3).map(item => `<p><b>${escapeHtml(item.name)}</b> · ${escapeHtml(item.tip)}</p>`).join("")}`
                : "",
            stagnantExercises.length
                ? `<p><b>🤖 IA · À débloquer :</b> ${stagnantExercises.map(escapeHtml).join(", ")}.</p>`
                : ""
        ].filter(Boolean).join("");
    }

    renderAiAssistant();
    renderWeeklyBars();

}

function getNextWorkoutName(lastWorkoutName){
    const canonical = getCanonicalWorkouts();

    if(!lastWorkoutName){
        return canonical[0]?.name || "-";
    }
    const currentIndex =
        canonical.findIndex(
            workout => workout.name === lastWorkoutName
        );

    if(currentIndex === -1){
        return canonical[0]?.name || "-";
    }

    const nextIndex =
        (currentIndex + 1) % canonical.length;

    return canonical[nextIndex].name;

}function calculateRecords(){

    let count = 0;


    const best = {};



    data.sessions.forEach(session=>{


        session.exercises.forEach(ex=>{
            // Les exos sans charge (gainage, mobilité) ne sont pas comptés
            // comme records personnels.
            if(ex.type === "time") return;


            ex.sets.forEach(set=>{


                const weight =
                    Number(set.weight)||0;

                if(
                    !best[ex.name] ||
                    weight > best[ex.name]
                ){

                    best[ex.name]=weight;

                    count++;

                }


            });


        });


    });


    return count;


}






function renderProgram(){


    const container =
        document.getElementById("programContainer");


    if(!container) return;



    container.innerHTML="";



    getCanonicalWorkouts().forEach(workout=>{


        const card =
        document.createElement("div");


        card.className =
            "card template";



        let exercises="";



        workout.exercises.forEach(ex=>{

            // Trouver le meilleur 1RM pour cet exercice
            const bestRecord = maxData.records
                .filter(r => r.exercise === ex.name)
                .sort((a, b) => b.estimated1RM - a.estimated1RM)[0];
            
            const maxDisplay = bestRecord 
                ? `<span style="color:var(--lime);font-size:11px;margin-left:8px;">🏆 ${formatNumber(bestRecord.estimated1RM)}kg</span>` 
                : '';

            exercises += `

            <div class="exercise">

                <b>${ex.name}${maxDisplay}</b>

                <span>

                ${ex.weight} kg · ${ex.sets}×${ex.reps}

                </span>

            </div>

            `;


        });



        card.innerHTML = `

        <h2>

        ${workout.name}

        </h2>


        ${exercises}



        `;



        container.appendChild(card);



    });



}function fillSessionSelect(){


    const select =
        document.getElementById("sessionSelect");



    if(!select) return;    select.innerHTML="";


    // Construit la liste du <select> en dédupliquant par nom (insensible à la casse) :
    // les 4 séances canoniques en premier dans l'ordre canonique, puis les séances perso.
    // Garantit qu'on ne voit jamais deux fois "PECS + BICEPS" même si data.program
    // contient un doublon suite à une ancienne migration.
    const canonicalList = getCanonicalWorkouts();
    const canonicalIds = new Set(canonicalList.map(function(w){ return Number(w.id); }));
    const seenNames = new Set();
    const ordered = [];
    canonicalList.forEach(function(w){
        const key = String(w.name || "").toLowerCase().trim();
        if(!key || seenNames.has(key)) return;
        seenNames.add(key);
        ordered.push(w);
    });
    (data.program || []).forEach(function(w){
        if(canonicalIds.has(Number(w.id))) return;
        const key = String(w.name || "").toLowerCase().trim();
        if(!key || seenNames.has(key)) return;
        seenNames.add(key);
        ordered.push(w);
    });
    ordered.forEach(workout=>{


        const option =
        document.createElement("option");


        option.value =
            workout.id;

        const suffix = workout.isCustom ? " (perso)" : "";
        option.textContent =
            workout.name + suffix;


        select.appendChild(option);


    });




    select.onchange = ()=>{


        renderExerciseLogger(
            Number(select.value)
        );


        updateEpAbButtonVisibility();
    };




    renderExerciseLogger(
        Number(select.value)
    );
    updateEpAbButtonVisibility();




}

// Ouvre la modale de création d'une nouvelle séance.
function openNewSessionModal(){
    const modal = document.getElementById("newSessionModal");
    const nameInput = document.getElementById("newSessionName");
    const typeSelect = document.getElementById("newSessionType");
    if(!modal) return;
    if(nameInput) nameInput.value = "";
    if(typeSelect) typeSelect.value = "weight";
    modal.showModal();
    setTimeout(() => nameInput?.focus(), 50);
}

function handleCreateNewSession(event){
    event?.preventDefault();
    const modal = document.getElementById("newSessionModal");
    const nameInput = document.getElementById("newSessionName");
    const typeSelect = document.getElementById("newSessionType");
    const rawName = nameInput?.value?.trim() || "";
    if(!rawName){
        nameInput?.focus();
        return;
    }
    const defaultType = ["weight","elastic","time"].includes(typeSelect?.value) ? typeSelect.value : "weight";
    // Génère un id qui ne rentre pas en conflit avec ceux existants.
    const existingIds = data.program.map(w => Number(w.id) || 0);
    const newId = existingIds.length ? Math.max(...existingIds) + 1 : 1;
    const newWorkout = {
        id: newId,
        name: rawName,
        isCustom: true,
        defaultType,
        exercises: []
    };
    data.program.push(newWorkout);
    saveData();
    renderProgram();
    fillSessionSelect();
    const select = document.getElementById("sessionSelect");
    if(select){
        select.value = String(newId);
    }
    renderExerciseLogger(newId);
    modal?.close();
}
function renderExerciseLogger(id){


    const container =
        document.getElementById("exerciseLogger");


    if(!container) return;


    const workout =
        data.program.find(
            w=>w.id===id
        );


    if(!workout) return;


    container.innerHTML="";


    const defaultType = workout.defaultType || "weight";


    workout.exercises.forEach((exercise,index)=>{

        const exType = exercise.type || defaultType;

        const block =
        document.createElement("div");


        block.className =
            "logged exercise-block";

        block.dataset.exerciseIndex = index;
        if(exercise.circuitId){
            block.classList.add("circuit-" + exercise.circuitId);
        }


        let rows="";


        const headerLabels = getExerciseTableHeaders(exType);


        for(let i=0;i<exercise.sets;i++){


            rows += `

            <tr data-set-index="${i}">

            <td>

            Série ${i+1}

            </td>


            <td>

            <input
            class="set-weight"
            data-ex="${index}"
            type="number"
            step="${exType === 'time' ? '1' : '0.5'}"
            value="${escapeAttr(exercise.weight)}"
            placeholder="${escapeAttr(headerLabels.col1Placeholder)}">

            </td>


            <td>

            <input
            class="set-reps"
            data-ex="${index}"
            type="number"
            value="${exercise.reps==="échec" ? 0 : escapeAttr(exercise.reps)}"
            placeholder="${escapeAttr(headerLabels.col2Placeholder)}">

            </td>

            <td>
                <button type="button" class="add-dropset" data-ex="${index}" data-set="${i}" style="border:none;background:none;color:#426e22;font-size:14px;cursor:pointer;padding:4px;margin-right:4px;" title="Ajouter une baisse de charge">+ drop</button>
                <button type="button" class="remove-set" data-ex="${index}" data-set="${i}" style="border:none;background:none;color:#ad4238;font-size:16px;cursor:pointer;padding:4px;">×</button>
            </td>


            </tr>


            `;


        }


        block.innerHTML = `

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
            <div class="exercise-meta">
                <h3 style="margin:0;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <input type="text" class="exercise-name" data-ex="${index}" data-exercise-key="${normalizeExerciseName(exercise.name)}" value="${escapeAttr(exercise.name)}" style="font-size:14px;font-weight:700;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;padding:6px 8px;font:inherit;color:inherit;width:auto;">
                </h3>
                <div class="exercise-pickers">
                    <select class="exercise-type" data-ex="${index}" aria-label="Type d'exercice">
                        <option value="weight" ${exType === 'weight' ? 'selected' : ''}>⚖️ Poids</option>
                        <option value="time" ${exType === 'time' ? 'selected' : ''}>⏱️ Temps</option>
                        <option value="elastic" ${exType === 'elastic' ? 'selected' : ''}>➰ Élastique</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <button type="button" class="add-set" data-ex="${index}" style="border:0;background:none;color:#426e22;font:700 11px Manrope;padding:6px 8px;cursor:pointer;">+ Ajouter série</button>
                <button type="button" class="remove-exercise" data-ex="${index}" style="border:0;background:none;color:#ad4238;font:700 11px Manrope;padding:6px 8px;cursor:pointer;">Supprimer</button>
            </div>
        </div>

        <div style="margin-bottom:12px;">
            <label style="font-size:12px;color:var(--muted);">💡 Conseil pour la prochaine séance :</label>
            <input type="text" class="exercise-tip" data-ex="${index}" placeholder="Ex: +2.5kg si technique OK, focus sur la contraction..." style="width:100%;padding:8px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:6px;font:12px Manrope;margin-top:4px;">
        </div>


        <table class="exercise-table" data-type="${exType}">

        <tr>

        <th>Série</th>

        <th class="th-col1">${headerLabels.col1}</th>

        <th class="th-col2">${headerLabels.col2}</th>

        <th></th>

        </tr>


        ${rows}



        </table>

        `;


        container.appendChild(block);


    });

    // Add event listeners for new buttons
    container.querySelectorAll(".add-set").forEach(btn => {
        btn.addEventListener("click", () => {
            const exerciseIndex = Number(btn.dataset.ex);
            addSetToExercise(exerciseIndex);
        });
    });

    container.querySelectorAll(".remove-exercise").forEach(btn => {
        btn.addEventListener("click", () => {
            const exerciseIndex = Number(btn.dataset.ex);
            removeExercise(exerciseIndex);
        });
    });

    container.querySelectorAll(".remove-set").forEach(btn => {
        btn.addEventListener("click", () => {
            const exerciseIndex = Number(btn.dataset.ex);
            const setIndex = Number(btn.dataset.set);
            removeSetFromExercise(exerciseIndex, setIndex);
        });
    });

    container.querySelectorAll(".add-dropset").forEach(btn => {
        btn.addEventListener("click", () => {
            addDropSetToRow(Number(btn.dataset.ex), Number(btn.dataset.set));
        });
    });

    // Écouteurs pour le picker de type d'exercice (met à jour les en-têtes)
    container.querySelectorAll(".exercise-type").forEach(select => {
        select.addEventListener("change", () => {
            const exerciseIndex = Number(select.dataset.ex);
            updateExerciseTypeInLogger(exerciseIndex, select.value);
        });
    });

    // Add event listeners for real-time summary updates
    container.querySelectorAll(".set-weight, .set-reps").forEach(input => {
        input.addEventListener("input", updateSummary);
    });

    // Initial summary update
    updateSummary();
}

// Renvoie les labels d'en-têtes du tableau selon le type d'exercice.
function getExerciseTableHeaders(type){
    if(type === "time"){
        return { col1: "Durée (s)", col1Placeholder: "ex: 60", col2: "Intensité", col2Placeholder: "1-5" };
    }
    if(type === "elastic"){
        return { col1: "Résistance", col1Placeholder: "1 / 2 / 3", col2: "Reps", col2Placeholder: "15" };
    }
    return { col1: "Charge", col1Placeholder: "kg", col2: "Reps", col2Placeholder: "10" };
}

function escapeAttr(value){
    return String(value ?? "").replace(/"/g, "&quot;");
}

// Met à jour l'en-tête du tableau + réordonne le logger pour grouper visuellement les circuits.
function updateExerciseTypeInLogger(exerciseIndex, newType){
    const container = document.getElementById("exerciseLogger");
    const block = container?.querySelector(`[data-exercise-index="${exerciseIndex}"]`);
    if(!block) return;
    const table = block.querySelector("table");
    if(table){
        table.dataset.type = newType;
        const labels = getExerciseTableHeaders(newType);
        const th1 = table.querySelector(".th-col1");
        const th2 = table.querySelector(".th-col2");
        if(th1){
            th1.textContent = labels.col1;
        }
        if(th2){
            th2.textContent = labels.col2;
        }
        table.querySelectorAll(".set-weight, .set-reps").forEach(input => {
            if(input.classList.contains("set-weight")){
                input.placeholder = labels.col1Placeholder;
                input.step = newType === "time" ? "1" : "0.5";
            } else {
                input.placeholder = labels.col2Placeholder;
            }
        });
    }
    reorderLoggerForCircuit();
}

// Réordonne les blocs du logger pour placer côte à côte les exercices d'un même circuit.
// Préserve strictement l'ordre relatif des blocs non-circuit (pas de déplacements parasites).
function reorderLoggerForCircuit(){
    const container = document.getElementById("exerciseLogger");
    if(!container) return;
    const blocks = Array.from(container.querySelectorAll(".exercise-block"));

    function circuitIdOf(block){
        if(block.classList.contains("circuit-A")) return "A";
        if(block.classList.contains("circuit-B")) return "B";
        if(block.classList.contains("circuit-C")) return "C";
        if(block.classList.contains("circuit-D")) return "D";
        return "";
    }

    const groups = [];
    let bufferCircuitId = null;
    let buffer = [];
    blocks.forEach(block => {
        const cid = circuitIdOf(block);
        if(cid && cid === bufferCircuitId){
            buffer.push(block);
        } else {
            if(buffer.length) groups.push({ kind: "circuit", circuitId: bufferCircuitId, items: buffer });
            buffer = cid ? [block] : [];
            bufferCircuitId = cid || null;
            if(!cid){
                groups.push({ kind: "single", block });
            }
        }
    });
    if(buffer.length) groups.push({ kind: "circuit", circuitId: bufferCircuitId, items: buffer });

    groups.forEach(group => {
        if(group.kind === "circuit"){
            group.items.forEach(b => container.appendChild(b));
        } else {
            container.appendChild(group.block);
        }
    });
}

function removeExercise(exerciseIndex) {
    const container = document.getElementById("exerciseLogger");
    const block = container.querySelector(`[data-exercise-index="${exerciseIndex}"]`);
    if(block) {
        block.remove();
        // Reindex remaining exercises
        container.querySelectorAll(".exercise-block, .logged").forEach((block, idx) => {
            block.dataset.exerciseIndex = idx;
            const nameInput = block.querySelector(".exercise-name");
            if(nameInput) nameInput.dataset.ex = idx;
            block.querySelectorAll(".set-weight, .set-reps").forEach(input => {
                input.dataset.ex = idx;
            });
            block.querySelectorAll(".add-set, .remove-exercise").forEach(btn => {
                btn.dataset.ex = idx;
            });
            block.querySelectorAll(".remove-set").forEach(btn => {
                btn.dataset.ex = idx;
            });
            block.querySelectorAll(".add-dropset, .remove-dropset").forEach(btn => {
                btn.dataset.ex = idx;
            });
            block.querySelectorAll(".exercise-type").forEach(sel => {
                sel.dataset.ex = idx;
            });
        });
        updateSummary();
    }
}

function addNewExercise() {
    const container = document.getElementById("exerciseLogger");
    if(!container) return;

    // Récupère le type par défaut du programme en cours (depuis le select)
    const select = document.getElementById("sessionSelect");
    const currentWorkout = select ? data.program.find(w => w.id === Number(select.value)) : null;
    const exType = currentWorkout?.defaultType || "weight";
    const headerLabels = getExerciseTableHeaders(exType);

    const exerciseBlocks = container.querySelectorAll(".exercise-block");
    const newIndex = exerciseBlocks.length;

    const block = document.createElement("div");
    block.className = "card logged exercise-block";
    block.dataset.exerciseIndex = newIndex;
    block.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
            <div class="exercise-meta">
                <h3 style="margin:0;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <input type="text" class="exercise-name" data-ex="${newIndex}" placeholder="Nom de l'exercice" style="font-size:14px;font-weight:700;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;padding:6px 8px;font:inherit;color:inherit;width:auto;">
                </h3>
                <div class="exercise-pickers">
                    <select class="exercise-type" data-ex="${newIndex}" aria-label="Type d'exercice">
                        <option value="weight" ${exType === 'weight' ? 'selected' : ''}>⚖️ Poids</option>
                        <option value="time" ${exType === 'time' ? 'selected' : ''}>⏱️ Temps</option>
                        <option value="elastic" ${exType === 'elastic' ? 'selected' : ''}>➰ Élastique</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <button type="button" class="add-set" data-ex="${newIndex}" style="border:0;background:none;color:#426e22;font:700 11px Manrope;padding:6px 8px;cursor:pointer;">+ Ajouter série</button>
                <button type="button" class="remove-exercise" data-ex="${newIndex}" style="border:0;background:none;color:#ad4238;font:700 11px Manrope;padding:6px 8px;cursor:pointer;">Supprimer</button>
            </div>
        </div>

        <div style="margin-bottom:12px;">
            <label style="font-size:12px;color:var(--muted);">💡 Conseil pour la prochaine séance :</label>
            <input type="text" class="exercise-tip" data-ex="${newIndex}" placeholder="Ex: +2.5kg si technique OK, focus sur la contraction..." style="width:100%;padding:8px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:6px;font:12px Manrope;margin-top:4px;">
        </div>

        <table class="exercise-table" data-type="${exType}">
        <tr>
        <th>Série</th>
        <th class="th-col1">${headerLabels.col1}</th>
        <th class="th-col2">${headerLabels.col2}</th>
        <th></th>
        </tr>
        <tr data-set-index="0">
            <td>Série 1</td>
            <td>
                <input class="set-weight" data-ex="${newIndex}" type="number" step="${exType === 'time' ? '1' : '0.5'}" value="0" placeholder="${headerLabels.col1Placeholder}">
            </td>
            <td>
                <input class="set-reps" data-ex="${newIndex}" type="number" value="${exType === 'time' ? 3 : 10}" placeholder="${headerLabels.col2Placeholder}">
            </td>
            <td>
                <button type="button" class="add-dropset" data-ex="${newIndex}" data-set="0" style="border:none;background:none;color:#426e22;font-size:14px;cursor:pointer;padding:4px;margin-right:4px;" title="Ajouter drop set">+</button>
                <button type="button" class="remove-set" data-ex="${newIndex}" data-set="0" style="border:none;background:none;color:#ad4238;font-size:16px;cursor:pointer;padding:4px;" title="Supprimer">×</button>
            </td>
        </tr>
        </table>
    `;

    container.appendChild(block);

    // Add event listeners
    block.querySelector(".add-set").addEventListener("click", () => {
        addSetToExercise(Number(block.dataset.exerciseIndex));
    });

    block.querySelector(".remove-exercise").addEventListener("click", () => {
        removeExercise(Number(block.dataset.exerciseIndex));
    });

    block.querySelector(".remove-set").addEventListener("click", () => {
        removeSetFromExercise(Number(block.dataset.exerciseIndex), 0);
    });

    block.querySelector(".add-dropset")?.addEventListener("click", () => {
        addDropSetToRow(Number(block.dataset.exerciseIndex), 0);
    });

    block.querySelector(".exercise-type")?.addEventListener("change", (e) => {
        updateExerciseTypeInLogger(Number(block.dataset.exerciseIndex), e.target.value);
    });

    // Add event listeners for real-time summary updates
    block.querySelectorAll(".set-weight, .set-reps").forEach(input => {
        input.addEventListener("input", updateSummary);
    });

    updateSummary();
}

// Attacher l'événement au bouton d'ajout d'exercice
document.getElementById("addNewExercise")?.addEventListener("click", addNewExercise);
function addSetToExercise(exerciseIndex) {
    const container = document.getElementById("exerciseLogger");
    const block = container.querySelector(`[data-exercise-index="${exerciseIndex}"]`);
    if(!block) return;

    const table = block.querySelector("table");
    const tbody = table.querySelector("tbody") || table;
    const currentRows = tbody.querySelectorAll("tr[data-set-index]");
    const newIndex = currentRows.length;

    const exType = table?.dataset?.type || "weight";
    const headerLabels = getExerciseTableHeaders(exType);
    const weightDefaultVal = exType === "time" ? 30 : 0;
    const repsDefaultVal = exType === "time" ? 3 : 10;

    const newRow = document.createElement("tr");
    newRow.dataset.setIndex = newIndex;
    newRow.innerHTML = `
        <td>Série ${newIndex + 1}</td>
        <td>
            <input class="set-weight" data-ex="${exerciseIndex}" type="number" step="${exType === 'time' ? '1' : '0.5'}" value="${weightDefaultVal}" placeholder="${headerLabels.col1Placeholder}">
        </td>
        <td>
            <input class="set-reps" data-ex="${exerciseIndex}" type="number" value="${repsDefaultVal}" placeholder="${headerLabels.col2Placeholder}">
        </td>
        <td>
            <button type="button" class="add-dropset" data-ex="${exerciseIndex}" data-set="${newIndex}" style="border:none;background:none;color:#426e22;font-size:14px;cursor:pointer;padding:4px;margin-right:4px;" title="Ajouter drop set">+</button>
            <button type="button" class="remove-set" data-ex="${exerciseIndex}" data-set="${newIndex}" style="border:none;background:none;color:#ad4238;font-size:16px;cursor:pointer;padding:4px;" title="Supprimer">×</button>
        </td>
    `;

    tbody.appendChild(newRow);

    newRow.querySelector(".remove-set").addEventListener("click", () => {
        removeSetFromExercise(exerciseIndex, newIndex);
    });

    newRow.querySelector(".add-dropset")?.addEventListener("click", () => {
        addDropSetToRow(exerciseIndex, newIndex);
    });

    // Add event listeners for real-time summary updates
    newRow.querySelector(".set-weight").addEventListener("input", updateSummary);
    newRow.querySelector(".set-reps").addEventListener("input", updateSummary);

    updateSummary();
}

function addDropSetToRow(exerciseIndex, setIndex) {
    const container = document.getElementById("exerciseLogger");
    const block = container.querySelector(`[data-exercise-index="${exerciseIndex}"]`);
    if(!block) return;

    const table = block.querySelector("table");
    const tbody = table.querySelector("tbody") || table;
    const row = tbody.querySelector(`tr[data-set-index="${setIndex}"]`);
    if(!row) return;

    const exType = table?.dataset?.type || "weight";
    const headerLabels = getExerciseTableHeaders(exType);
    const weightDefaultVal = exType === "time" ? 30 : 0;
    const repsDefaultVal = exType === "time" ? 3 : 10;

    // Crée une ligne de drop set (sous-série)
    const dropSetRow = document.createElement("tr");
    dropSetRow.className = "dropset-row";
    dropSetRow.dataset.parentSet = setIndex;
    dropSetRow.innerHTML = `
        <td style="padding-left:20px;color:var(--muted);font-size:12px;">↳ Drop</td>
        <td>
            <input class="set-weight" data-ex="${exerciseIndex}" type="number" step="${exType === 'time' ? '1' : '0.5'}" value="${weightDefaultVal}" placeholder="${headerLabels.col1Placeholder}">
        </td>
        <td>
            <input class="set-reps" data-ex="${exerciseIndex}" type="number" value="${repsDefaultVal}" placeholder="${headerLabels.col2Placeholder}">
        </td>
        <td>
            <button type="button" class="remove-dropset" data-ex="${exerciseIndex}" data-parent="${setIndex}" style="border:none;background:none;color:#ad4238;font-size:14px;cursor:pointer;padding:4px;" title="Supprimer drop set">×</button>
        </td>
    `;

    // Insère après la ligne parente
    row.after(dropSetRow);

    dropSetRow.querySelector(".remove-dropset").addEventListener("click", () => {
        dropSetRow.remove();
        updateSummary();
    });

    // Add event listeners for real-time summary updates
    dropSetRow.querySelectorAll(".set-weight, .set-reps").forEach(input => {
        input.addEventListener("input", updateSummary);
    });

    updateSummary();
}

function removeSetFromExercise(exerciseIndex, setIndex) {
    const container = document.getElementById("exerciseLogger");
    const block = container.querySelector(`[data-exercise-index="${exerciseIndex}"]`);
    if(!block) return;

    const table = block.querySelector("table");
    const tbody = table.querySelector("tbody") || table;
    const row = tbody.querySelector(`tr[data-set-index="${setIndex}"]`);
    if(row) {
        // Supprimer aussi les drop sets associés
        const dropSets = tbody.querySelectorAll(`tr[data-parent-set="${setIndex}"]`);
        dropSets.forEach(ds => ds.remove());
        
        row.remove();
        // Reindex remaining rows
        tbody.querySelectorAll("tr[data-set-index]").forEach((row, idx) => {
            const oldIndex = row.dataset.setIndex;
            row.dataset.setIndex = idx;
            row.querySelector("td:first-child").textContent = `Série ${idx + 1}`;
            row.querySelector(".remove-set").dataset.set = idx;
            const addDropButton = row.querySelector(".add-dropset");
            if(addDropButton) addDropButton.dataset.set = idx;
            tbody.querySelectorAll(`tr[data-parent-set="${oldIndex}"]`).forEach(dropRow => {
                dropRow.dataset.parentSet = idx;
                dropRow.querySelector(".remove-dropset")?.setAttribute("data-parent", idx);
            });
        });
    }

    updateSummary();
}

function updateSummary() {
    const summaryExercises = document.getElementById("summaryExercises");
    const summarySets = document.getElementById("summarySets");
    const summaryVolume = document.getElementById("summaryVolume");
    
    if(!summaryExercises || !summarySets || !summaryVolume) return;

    const container = document.getElementById("exerciseLogger");
    const exerciseBlocks = container.querySelectorAll(".logged");
    
    let totalExercises = exerciseBlocks.length;
    let totalSets = 0;
    let totalVolume = 0;

    exerciseBlocks.forEach(block => {
        const rows = block.querySelectorAll("tr[data-set-index], tr.dropset-row");
        totalSets += rows.length;
        
        rows.forEach(row => {
            const weight = Number(row.querySelector(".set-weight")?.value) || 0;
            const reps = Number(row.querySelector(".set-reps")?.value) || 0;
            totalVolume += weight * reps;
        });
    });

    summaryExercises.textContent = totalExercises;
    summarySets.textContent = totalSets;
    summaryVolume.textContent = formatNumber(totalVolume) + " kg";
}

// Attacher l'événement au bouton d'ajout d'exercices supplémentaires
document.getElementById("addExtraExercise")?.addEventListener("click", addExtraExercise);

document.getElementById("createCustomSessionBtn")?.addEventListener("click", openNewSessionModal);
document.getElementById("newSessionForm")?.addEventListener("submit", handleCreateNewSession);
document.getElementById("cancelNewSession")?.addEventListener("click", () => {
    document.getElementById("newSessionModal")?.close();
});
document.getElementById("closeNewSession")?.addEventListener("click", () => {
    document.getElementById("newSessionModal")?.close();
});
document.getElementById("newSessionModal")?.addEventListener("click", (e) => {
    if(e.target.id === "newSessionModal"){
        document.getElementById("newSessionModal").close();
    }
});

// === Mode rapide ÉPAULES + ABDOS ===

// Affiche ou cache le bouton "Mode rapide" selon la séance sélectionnée.
// Le bouton apparaît pour toute séance contenant les muscles "epaules" + "abdos"
// dans sa clé (l'ordre alphabétique de getWorkoutMuscleKey peut donner
// "abdos-epaules" ou "epaules-abdos").
function updateEpAbButtonVisibility(){
    const btn = document.getElementById("epAbPresetBtn");
    if(!btn) return;
    const select = document.getElementById("sessionSelect");
    if(!select) return;
    const selectedWorkout = data.program.find(w => w.id === Number(select.value));
    if(!selectedWorkout){
        btn.style.display = "none";
        return;
    }
    const muscleKey = getWorkoutMuscleKey(selectedWorkout.name) || "";
    const isEpAb = muscleKey.includes("epaules") && muscleKey.includes("abdos");
    btn.style.display = isEpAb ? "block" : "none";
}

// Détecte le bloc Crunch machine dans le logger courant (par nom normalisé).
function findCrunchMachineBlock(container){
    if(!container) return null;
    const blocks = Array.from(container.querySelectorAll(".exercise-block, .logged"));
    // En premier : ce qui ressemble à "Crunch machine" (machine + crunch)
    let found = blocks.find(block => {
        const name = block.querySelector(".exercise-name")?.value || "";
        const n = normalizeExerciseName(name);
        return n.includes("crunchmachine") || (n.includes("machine") && n.includes("crunch"));
    });
    return found || null;
}

// Renumérote tous les blocs du logger (utilisé après suppression en masse).
function renumberExerciseBlocks(){
    const container = document.getElementById("exerciseLogger");
    if(!container) return;
    container.querySelectorAll(".exercise-block, .logged").forEach((block, idx) => {
        block.dataset.exerciseIndex = idx;
        const nameInput = block.querySelector(".exercise-name");
        if(nameInput) nameInput.dataset.ex = idx;
        block.querySelectorAll(".set-weight, .set-reps").forEach(input => {
            input.dataset.ex = idx;
        });
        block.querySelectorAll(".add-set, .remove-exercise").forEach(btn => {
            btn.dataset.ex = idx;
        });
        block.querySelectorAll(".remove-set").forEach(btn => {
            btn.dataset.ex = idx;
        });
        block.querySelectorAll(".add-dropset, .remove-dropset").forEach(btn => {
            btn.dataset.ex = idx;
        });
        block.querySelectorAll(".exercise-type").forEach(sel => {
            sel.dataset.ex = idx;
        });
    });
}

// Ajoute in-place le panneau "Gainage pendant les repos" sous le bloc cible.
function addGainageFieldToBlock(block){
    if(!block || block.querySelector(".gainage-field")) return;
    const div = document.createElement("div");
    div.className = "gainage-field";
    div.innerHTML = `
        <div style="font-size:11px;font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">
            ⏱️ Gainage pendant les repos
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;">
            <label style="gap:3px;">
                <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Durée totale (s)</span>
                <input type="number" class="gainage-duration" min="0" step="10" placeholder="Ex: 120" style="font-size:13px;">
            </label>
            <label style="gap:3px;">
                <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Type (optionnel)</span>
                <input type="text" class="gainage-type" placeholder="Ex: planche, side plank..." style="font-size:13px;">
            </label>
        </div>
    `;
    block.appendChild(div);
}

// Ajoute deux exercices "autres muscle" vides, pré-labellés.
function addOtherMuscleExercises(){
    const container = document.getElementById("exerciseLogger");
    if(!container) return;
    for(let i = 1; i <= 2; i++){
        addNewExercise();
        const blocks = Array.from(container.querySelectorAll(".exercise-block"));
        const last = blocks[blocks.length - 1];
        if(!last) continue;
        last.classList.add("other-muscle-slot");
        const nameInput = last.querySelector(".exercise-name");
        if(nameInput){
            nameInput.value = "";
            nameInput.placeholder = `🏋️ Exercice ${i} (autre muscle)`;
            nameInput.focus();
        }
    }
}

// Détecte si un bloc ressemble à un exo abdo (autre que Crunch machine).
function looksLikeOtherAbsExercise(block){
    const name = block.querySelector(".exercise-name")?.value || "";
    const n = normalizeExerciseName(name);
    const isCrunchMachine = n.includes("machine") && n.includes("crunch");
    if(isCrunchMachine) return false;
    return (
        n.includes("abdo") || n.includes("abdomin") || n.includes("abdominal") ||
        n.includes("captain") || n.includes("oblique") ||
        (n.includes("crunch") && !n.includes("machine"))
    );
}

// Active le mode rapide pour la séance ÉPAULES + ABDOS :
//  - Retire Captain's chair / Crunch machine oblique / autres abdos (sauf Crunch machine)
//  - Ajoute le panneau gainage sous le bloc Crunch machine
//  - Ajoute 2 blocs vides "Exercice (autre muscle)"
//  - Cache le bouton après application pour éviter les doublons.
function applyEpauleAbdoPreset(){
    const container = document.getElementById("exerciseLogger");
    if(!container) return;

    // Si l'utilisateur a déjà appliqué le mode rapide sur cette vue, on
    // le prévient et on ne fait rien (idempotent côté UX).
    if(container.querySelector(".gainage-field") ||
       container.querySelector(".other-muscle-slot")){
        alert("Le mode rapide a déjà été appliqué. Supprime d'abord les blocs ajoutés si tu veux recommencer.");
        return;
    }

    if(!confirm("Ce mode retire les autres exercices abdominaux et ajoute une zone \"Gainage pendant le repos\" dans le bloc Crunch machine, plus 2 blocs vides pour les exercices d'un autre muscle. Continuer ?")){
        return;
    }

    // 1. Identifier Crunch machine pour ne pas le supprimer, et repérer les autres abdos
    const crunchBlock = findCrunchMachineBlock(container);
    const blocks = Array.from(container.querySelectorAll(".exercise-block, .logged"));
    blocks.forEach(block => {
        if(block === crunchBlock) return;
        if(looksLikeOtherAbsExercise(block)){
            block.remove();
        }
    });

    // 2. Renuméroter
    renumberExerciseBlocks();

    // 3. Panneau gainage sous Crunch machine
    if(crunchBlock){
        addGainageFieldToBlock(crunchBlock);
    }

    // 4. 2 blocs vides "autre muscle"
    addOtherMuscleExercises();

    // 5. Résumé
    updateSummary();

    // 6. Masquer le bouton (il n'a plus rien à apporter sur cette session-log)
    const btn = document.getElementById("epAbPresetBtn");
    if(btn) btn.style.display = "none";
}

document.getElementById("epAbPresetBtn")?.addEventListener("click", applyEpauleAbdoPreset);


// Gestion des exercices supplémentaires
let extraExerciseCounter = 0;

function addExtraExercise() {
    const container = document.getElementById("extraExercisesContainer");
    if(!container) return;

    const exerciseId = extraExerciseCounter++;
    
    const exerciseDiv = document.createElement("div");
    exerciseDiv.className = "extra-exercise";
    exerciseDiv.dataset.exerciseId = exerciseId;
    exerciseDiv.style.cssText = "border-top:1px solid var(--line);padding:12px 0;margin-top:8px;";
    
    exerciseDiv.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input type="text" class="extra-exercise-name" placeholder="Nom (ex: Boxe, Vélo...)" style="flex:2;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
            <select class="extra-exercise-mode" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <option value="sets">Séries/Reps</option>
                <option value="time">Temps</option>
            </select>
            <button type="button" class="remove-extra-exercise" style="border:none;background:none;color:#ad4238;font-size:16px;cursor:pointer;padding:4px;">×</button>
        </div>
        <div class="extra-exercise-details">
            <!-- Sera rempli selon le mode choisi -->
        </div>
    `;
    
    container.appendChild(exerciseDiv);
    
    // Initialiser les détails par défaut (mode séries)
    updateExtraExerciseDetails(exerciseDiv.querySelector(".extra-exercise-mode"));
    
    // Attacher les événements
    exerciseDiv.querySelector(".extra-exercise-mode").addEventListener("change", (e) => {
        updateExtraExerciseDetails(e.target);
    });
    
    exerciseDiv.querySelector(".remove-extra-exercise").addEventListener("click", () => {
        exerciseDiv.remove();
    });
}

function updateExtraExerciseDetails(modeSelect) {
    const detailsDiv = modeSelect.closest(".extra-exercise").querySelector(".extra-exercise-details");
    const mode = modeSelect.value;
    
    if(mode === "time") {
        detailsDiv.innerHTML = `
            <div style="display:flex;gap:8px;">
                <input type="number" class="extra-exercise-duration" placeholder="Durée (min)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="text" class="extra-exercise-intensity" placeholder="Intensité (ex: légère, intense)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
            </div>
        `;
    } else {
        detailsDiv.innerHTML = `
            <div style="display:flex;gap:8px;">
                <input type="number" class="extra-exercise-sets" placeholder="Séries" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="number" class="extra-exercise-reps" placeholder="Reps" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="number" class="extra-exercise-weight" placeholder="Charge (kg)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
            </div>
        `;
    }
}

function getExtraExercises() {
    const container = document.getElementById("extraExercisesContainer");
    if(!container) return [];
    
    const extraExercises = [];
    container.querySelectorAll(".extra-exercise").forEach(div => {
        const name = div.querySelector(".extra-exercise-name")?.value || "";
        const mode = div.querySelector(".extra-exercise-mode")?.value || "sets";
        
        if(!name) return;
        
        const exercise = {
            name: name,
            mode: mode,
            isExtra: true
        };
        
        if(mode === "time") {
            exercise.duration = Number(div.querySelector(".extra-exercise-duration")?.value) || 0;
            exercise.intensity = div.querySelector(".extra-exercise-intensity")?.value || "";
        } else {
            exercise.sets = Number(div.querySelector(".extra-exercise-sets")?.value) || 0;
            exercise.reps = Number(div.querySelector(".extra-exercise-reps")?.value) || 0;
            exercise.weight = Number(div.querySelector(".extra-exercise-weight")?.value) || 0;
        }
        
        extraExercises.push(exercise);
    });
    
    return extraExercises;
}

function updateEditExtraDetails(modeSelect) {
    const detailsDiv = modeSelect.closest(".extra-exercise-edit").querySelector(".edit-extra-details");
    const index = modeSelect.dataset.index;
    const mode = modeSelect.value;
    
    if(mode === "time") {
        detailsDiv.innerHTML = `
            <div style="display:flex;gap:8px;">
                <input type="number" class="edit-extra-duration" data-index="${index}" placeholder="Durée (min)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="text" class="edit-extra-intensity" data-index="${index}" placeholder="Intensité" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
            </div>
        `;
    } else {
        detailsDiv.innerHTML = `
            <div style="display:flex;gap:8px;">
                <input type="number" class="edit-extra-sets" data-index="${index}" placeholder="Séries" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="number" class="edit-extra-reps" data-index="${index}" placeholder="Reps" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="number" class="edit-extra-weight" data-index="${index}" placeholder="Charge (kg)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
            </div>
        `;
    }
}

function addExtraExerciseEdit(content) {
    const container = content.querySelector(".card");
    const extraContainer = container.querySelector("h3").parentElement;
    const index = extraContainer.querySelectorAll(".extra-exercise-edit").length;
    
    const exerciseDiv = document.createElement("div");
    exerciseDiv.className = "extra-exercise-edit";
    exerciseDiv.style.cssText = "border-top:1px solid var(--line);padding:12px 0;margin-top:8px;";
    exerciseDiv.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input type="text" class="edit-extra-name" data-index="${index}" placeholder="Nom" style="flex:2;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
            <select class="edit-extra-mode" data-index="${index}" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <option value="sets">Séries/Reps</option>
                <option value="time">Temps</option>
            </select>
            <button type="button" class="remove-extra-edit" data-index="${index}" style="border:none;background:none;color:#ad4238;font-size:16px;cursor:pointer;padding:4px;">×</button>
        </div>
        <div class="edit-extra-details" data-index="${index}">
            <div style="display:flex;gap:8px;">
                <input type="number" class="edit-extra-sets" data-index="${index}" placeholder="Séries" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="number" class="edit-extra-reps" data-index="${index}" placeholder="Reps" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                <input type="number" class="edit-extra-weight" data-index="${index}" placeholder="Charge (kg)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
            </div>
        </div>
    `;
    
    extraContainer.insertBefore(exerciseDiv, extraContainer.querySelector("#addExtraEdit"));
    
    // Attacher les événements
    exerciseDiv.querySelector(".edit-extra-mode").addEventListener("change", (e) => {
        updateEditExtraDetails(e.target);
    });
    
    exerciseDiv.querySelector(".remove-extra-edit").addEventListener("click", (e) => {
        exerciseDiv.remove();
    });
}
document.getElementById("saveSession")?.addEventListener(
"click",
()=>{


    const select =
        document.getElementById("sessionSelect");

    const dateInput =
        document.getElementById("sessionDate");


    const workout =
        data.program.find(
            w=>w.id===Number(select.value)
        );



    if(!workout) return;

    if(!dateInput?.value){
        alert("Choisis une date pour la séance.");
        return;
    }



    const session = {

        id: Date.now(),

        name: workout.name,

        date: sessionDateFromInput(dateInput.value),

        note:
        document.getElementById("sessionNote").value,


        exercises: [],

        extraExercises: []

    };



    const logger = document.getElementById("exerciseLogger");
    logger?.querySelectorAll(".logged, .exercise-block").forEach(block => {
        const nameInput = block.querySelector(".exercise-name");
        const name = getExerciseDisplayName(nameInput?.value);
        if(!name) return;

        const exType = block.querySelector(".exercise-type")?.value || "weight";

        const sets = [];
        block.querySelectorAll("tr[data-set-index], tr.dropset-row").forEach(row => {
            sets.push({
                weight: Number(row.querySelector(".set-weight")?.value) || 0,
                reps: Number(row.querySelector(".set-reps")?.value) || 0,
                isDropSet: row.classList.contains("dropset-row"),
                parentSet: row.classList.contains("dropset-row") ? Number(row.dataset.parentSet) : null
            });
        });

        if(sets.length) {
            const newExercise = {
                name,
                // Garder la même courbe même si l'utilisateur renomme un
                // exercice du programme au moment de saisir sa séance.
                exerciseKey: nameInput?.dataset.exerciseKey || normalizeExerciseName(name),
                type: exType,
                sets,
                tip: String(block.querySelector(".exercise-tip")?.value || "").trim()
            };

            // Capture le gainage fait pendant les repos des séries (cas spécifique
            // de la séance ÉPAULES + ABDOS via le "Mode rapide").
            const gainageDuration = Number(block.querySelector(".gainage-duration")?.value) || 0;
            const gainageType = String(block.querySelector(".gainage-type")?.value || "").trim();
            if(gainageDuration > 0 || gainageType){
                newExercise.gainage = { duration: gainageDuration, type: gainageType };
            }

            session.exercises.push(newExercise);
        }
    });

    // Ajouter les exercices supplémentaires
    session.extraExercises = getExtraExercises();

    if(!session.exercises.length && !session.extraExercises.length){
        alert("Ajoute au moins un exercice avant d'enregistrer la séance.");
        return;
    }

    data.sessions.push(session);


    saveData();

    document.getElementById("sessionNote").value = "";
    initSessionDateField();

    refreshSessionViews();



    alert("Séance enregistrée 💪");



    showPage("dashboard");



});







document.getElementById("quickAdd")
?.addEventListener(
"click",
()=>{


    showPage("log");


});







document.getElementById("cancelLog")
?.addEventListener(
"click",
()=>{


    showPage("dashboard");


});function renderHistory(){


    const container =
    document.getElementById("historyContainer");



    if(!container) return;



    if(data.sessions.length===0){

        container.innerHTML=
        `<div class="empty">
        Aucune séance enregistrée.
        </div>`;

        return;
    }




    container.innerHTML="";



    [...data.sessions].reverse().forEach(session=>{


        const item =
        document.createElement("div");


        item.className =
            "card historyItem";


        const summary = buildSessionSummaryHTML(session);

        item.innerHTML = `
        <time>
        ${new Date(session.date)
        .toLocaleDateString("fr-FR")}
        </time>

        <div>
            <b>${escapeHtml(session.name)}</b>
            ${summary.chips}
            ${(session.exercises || []).filter(ex => ex.tip).map(ex => `<div class="history-tip"><strong>💡 ${escapeHtml(ex.name)}</strong> · ${escapeHtml(ex.tip)}</div>`).join("")}
        </div>

        <span>
        ${formatNumber(
            calculateVolume(session)
        )} kg
        ${session.extraExercises && session.extraExercises.length > 0 ? `(+ ${session.extraExercises.length} exo(s) sup.)` : ""}
        </span>

        <div class="history-actions">
        <button class="edit">
        Modifier
        </button>
        <button class="delete">
        Supprimer
        </button>
        </div>

        `;




        item.querySelector(".delete").addEventListener("click", e=>{
            e.stopPropagation();
            deleteSession(session.id);
        });

        item.querySelector(".edit").addEventListener("click", e=>{
            e.stopPropagation();
            openSessionEditor(session);
        });



        item.addEventListener("click", e=>{
            if(e.target.classList.contains("delete") || e.target.classList.contains("edit"))
            return;
            openSessionEditor(session);
        });



        container.appendChild(item);


    });




}

// Construit un résumé visuel (badges de circuits + chips de types) pour l'historique.
function buildSessionSummaryHTML(session){
    const exercises = session.exercises || [];
    const circuitIds = new Set();
    exercises.forEach(ex => { if(ex.circuitId) circuitIds.add(ex.circuitId); });
    const typeChips = exercises
        .map(ex => renderExerciseTypeChip(ex))
        .filter(Boolean);
    const uniqueChips = [];
    const seen = new Set();
    typeChips.forEach(chip => { if(!seen.has(chip)){ seen.add(chip); uniqueChips.push(chip); } });

    let chips = "";
    if(circuitIds.size > 0){
        chips += `<div class="exercise-chips">`;
        [...circuitIds].sort().forEach(id => {
            const count = exercises.filter(e => e.circuitId === id).length;
            chips += `<span class="chip-circuit" title="Super-set ${id}">🔁 Circuit ${id} · ${count}</span>`;
        });
        chips += `</div>`;
    }
    if(uniqueChips.length){
        chips += `<div class="exercise-chips">${uniqueChips.join("")}</div>`;
    }
    if(exercises.length > 0 && chips === ""){
        chips = `<div class="exercise-chips"><span class="muted-chip">${exercises.length} exo${exercises.length > 1 ? "s" : ""}</span></div>`;
    }
    return { chips };
}

function renderExerciseTypeChip(ex){
    if(ex.type === "time") return `<span class="chip-time">⏱️</span>`;
    if(ex.type === "elastic") return `<span class="chip-elastic">➰</span>`;
    return "";
}

// Regroupe les exercices adjacents partageant un même circuitId pour l'affichage détaillé.
function groupExercisesForDisplay(exercises){
    const groups = [];
    const circuitBuffer = new Map();
    exercises.forEach(ex => {
        if(ex.circuitId && ["A","B","C","D"].includes(ex.circuitId)){
            if(!circuitBuffer.has(ex.circuitId)) circuitBuffer.set(ex.circuitId, []);
            circuitBuffer.get(ex.circuitId).push(ex);
        } else {
            //Flush circuitBuffer des id différents si présents
            circuitBuffer.forEach((items, id) => {
                if(items.length){
                    groups.push({ kind: "circuit", circuitId: id, items });
                }
            });
            circuitBuffer.clear();
            groups.push({ kind: "single", exercise: ex });
        }
    });
    //Flush en fin
    circuitBuffer.forEach((items, id) => {
        if(items.length){
            groups.push({ kind: "circuit", circuitId: id, items });
        }
    });
    return groups;
}

// Affiche le détail (séries) d'un exercice selon son type.
function renderExerciseSetsDetail(ex){
    if(ex.type === "time"){
        return ex.sets.map((set, i) => {
            const dur = Number(set.weight) || 0; // on stocke la durée dans "weight"
            const intense = Number(set.reps) || 0;
            return `<span style="display:inline-block;margin-right:8px;">⏱️ ${dur}s${intense ? ` (intensité ${intense})` : ""}</span>`;
        }).join("");
    }
    if(ex.type === "elastic"){
        return ex.sets.map((set, i) => {
            const r = Number(set.weight) || 0;
            const reps = Number(set.reps) || 0;
            const label = r === 1 ? "léger" : r === 2 ? "moyen" : r >= 3 ? "fort" : "—";
            return `<span style="display:inline-block;margin-right:8px;">➰ ${label} x ${reps}</span>`;
        }).join("");
    }
    return ex.sets.map((set, i) => {
        if(set.isDropSet){
            return `<span style="color:var(--muted);display:inline-block;margin-right:8px;">↳ Drop ${set.weight}kg x ${set.reps}</span>`;
        }
        return `<span style="display:inline-block;margin-right:8px;">${set.weight}kg x ${set.reps}</span>`;
    }).join("");
}

// Rend le bloc "gainage pendant le repos" d'un exercice (si présent), pour le calendrier / historique.
function renderExerciseGainage(ex){
    if(!ex || !ex.gainage) return "";
    const dur = Number(ex.gainage.duration) || 0;
    const type = String(ex.gainage.type || "").trim();
    if(!dur && !type) return "";
    let html = `<div class="gainage-info">⏱️ <strong>Gainage pendant le repos :</strong> `;
    if(dur) html += `${dur}s`;
    if(dur && type) html += " · ";
    if(type) html += `<em>${escapeHtml(type)}</em>`;
    html += `</div>`;
    return html;
}








function deleteSession(id){


    data.sessions =
    data.sessions.filter(
        session=>session.id!==id
    );



    saveData();

    refreshSessionViews();



}

function openSessionEditor(session){
    const modal = document.getElementById("sessionEditModal");
    const content = document.getElementById("sessionEditContent");
    if(!modal || !content) return;

    modal.dataset.sessionId = String(session.id);

    let html = `
        <label>
            Date de la séance
            <input type="date" id="editSessionDate" value="${formatDateInputFromSession(session.date)}">
        </label>
        <label>
            Note générale
            <textarea id="editSessionNote" placeholder="Énergie, sensations, douleurs, remarques...">${escapeHtml(session.note || "")}</textarea>
        </label>
        <p class="sub" style="margin:0 0 12px;">${escapeHtml(session.name)}</p>
    `;

    session.exercises.forEach((exercise, exerciseIndex)=>{
        let rows = "";
        const exType = exercise.type || "weight";
        const headerLabels = getExerciseTableHeaders(exType);
        exercise.sets.forEach((set, setIndex)=>{
            rows += `
                <tr>
                    <td>Série ${setIndex + 1}</td>
                    <td>
                        <input
                            class="edit-set-weight"
                            data-ex="${exerciseIndex}"
                            type="number"
                            step="${exType === 'time' ? '1' : '0.5'}"
                            value="${set.weight}">
                    </td>
                    <td>
                        <input
                            class="edit-set-reps"
                            data-ex="${exerciseIndex}"
                            type="number"
                            value="${set.reps}">
                    </td>
                </tr>
            `;
        });

        html += `
            <div class="logged exercise-block ${exercise.circuitId ? 'circuit-' + exercise.circuitId : ''}">
                <div class="exercise-meta" style="margin-bottom:6px;">
                    <h3 style="margin:0;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-weight:700;font-size:14px;">${escapeHtml(exercise.name)}</span>
                    </h3>
                    <div class="exercise-pickers">
                        <select class="edit-exercise-type" data-ex="${exerciseIndex}" aria-label="Type d'exercice">
                            <option value="weight" ${exType === 'weight' ? 'selected' : ''}>⚖️ Poids</option>
                            <option value="time" ${exType === 'time' ? 'selected' : ''}>⏱️ Temps</option>
                            <option value="elastic" ${exType === 'elastic' ? 'selected' : ''}>➰ Élastique</option>
                        </select>
                    </div>
                </div>
                <table class="exercise-table" data-type="${exType}">
                    <tr>
                        <th>Série</th>
                        <th class="th-col1">${headerLabels.col1}</th>
                        <th class="th-col2">${headerLabels.col2}</th>
                    </tr>
                    ${rows}
                </table>
                ${exercise.gainage ? `
                    <div class="gainage-field" style="background:rgba(128,203,196,.10);border:1px dashed #80cbc4;">
                        <div style="font-size:11px;font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">
                            ⏱️ Gainage pendant les repos
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;">
                            <label style="gap:3px;">
                                <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Durée totale (s)</span>
                                <input type="number" class="edit-gainage-duration" data-ex="${exerciseIndex}" min="0" step="10" value="${exercise.gainage.duration || 0}" style="font-size:13px;">
                            </label>
                            <label style="gap:3px;">
                                <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Type (optionnel)</span>
                                <input type="text" class="edit-gainage-type" data-ex="${exerciseIndex}" value="${escapeHtml(exercise.gainage.type || '')}" style="font-size:13px;">
                            </label>
                        </div>
                    </div>
                ` : ""}
            </div>
        `;
    });

    // Ajouter les exercices supplémentaires
    if(session.extraExercises && session.extraExercises.length > 0){
        html += `
            <div class="card" style="margin-top:16px;padding:18px;">
                <h3 style="margin:0 0 12px;font-size:15px;">🏃 Exercices supplémentaires</h3>
        `;
        
        session.extraExercises.forEach((extra, index)=>{
            html += `
                <div class="extra-exercise-edit" style="border-top:1px solid var(--line);padding:12px 0;margin-top:8px;">
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" class="edit-extra-name" data-index="${index}" value="${escapeHtml(extra.name)}" placeholder="Nom" style="flex:2;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                        <select class="edit-extra-mode" data-index="${index}" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                            <option value="sets" ${extra.mode === 'sets' ? 'selected' : ''}>Séries/Reps</option>
                            <option value="time" ${extra.mode === 'time' ? 'selected' : ''}>Temps</option>
                        </select>
                        <button type="button" class="remove-extra-edit" data-index="${index}" style="border:none;background:none;color:#ad4238;font-size:16px;cursor:pointer;padding:4px;">×</button>
                    </div>
                    <div class="edit-extra-details" data-index="${index}">
                        ${extra.mode === 'time' ? `
                            <div style="display:flex;gap:8px;">
                                <input type="number" class="edit-extra-duration" data-index="${index}" value="${extra.duration || 0}" placeholder="Durée (min)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                                <input type="text" class="edit-extra-intensity" data-index="${index}" value="${escapeHtml(extra.intensity || '')}" placeholder="Intensité" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                            </div>
                        ` : `
                            <div style="display:flex;gap:8px;">
                                <input type="number" class="edit-extra-sets" data-index="${index}" value="${extra.sets || 0}" placeholder="Séries" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                                <input type="number" class="edit-extra-reps" data-index="${index}" value="${extra.reps || 0}" placeholder="Reps" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                                <input type="number" class="edit-extra-weight" data-index="${index}" value="${extra.weight || 0}" placeholder="Charge (kg)" style="flex:1;padding:6px;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;font:13px Manrope;">
                            </div>
                        `}
                    </div>
                </div>
            `;
        });
        
        html += `
                <button type="button" id="addExtraEdit" style="margin-top:12px;padding:6px 10px;font-size:11px;">+ Ajouter un exercice</button>
            </div>
        `;
    }

    content.innerHTML = html;
    modal.showModal();
    
    // Attacher les événements pour les exercices supplémentaires dans l'édition
    content.querySelectorAll(".edit-extra-mode").forEach(select => {
        select.addEventListener("change", (e) => {
            updateEditExtraDetails(e.target);
        });
    });
    
    content.querySelectorAll(".remove-extra-edit").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.target.closest(".extra-exercise-edit").remove();
        });
    });
    
    content.querySelector("#addExtraEdit")?.addEventListener("click", () => {
        addExtraExerciseEdit(content);
    });
}

function initSessionEditModal(){
    const modal = document.getElementById("sessionEditModal");
    const form = document.getElementById("sessionEditForm");
    const closeBtn = document.getElementById("closeSessionEdit");
    const cancelBtn = document.getElementById("cancelSessionEdit");

    if(!modal || !form) return;

    closeBtn?.addEventListener("click", ()=> modal.close());
    cancelBtn?.addEventListener("click", ()=> modal.close());

    modal.addEventListener("click", e=>{
        if(e.target === modal){
            modal.close();
        }
    });

    form.addEventListener("submit", e=>{
        e.preventDefault();
        saveEditedSession();
    });
}

function saveEditedSession(){
    const modal = document.getElementById("sessionEditModal");
    const sessionId = Number(modal?.dataset.sessionId);
    const session = data.sessions.find(item => item.id === sessionId);
    if(!session) return;

    const dateInput = document.getElementById("editSessionDate");
    const noteInput = document.getElementById("editSessionNote");

    if(!dateInput?.value){
        alert("Choisis une date pour la séance.");
        return;
    }

    session.date = sessionDateFromInput(dateInput.value);
    session.note = noteInput?.value || "";

    session.exercises.forEach((exercise, exerciseIndex)=>{
        const weights = document.querySelectorAll(`.edit-set-weight[data-ex="${exerciseIndex}"]`);
        const reps = document.querySelectorAll(`.edit-set-reps[data-ex="${exerciseIndex}"]`);

        exercise.sets.forEach((set, setIndex)=>{
            set.weight = Number(weights[setIndex]?.value) || 0;
            set.reps = Number(reps[setIndex]?.value) || 0;
        });

        // Récupération du type depuis le picker d'édition
        const typeSelect = document.querySelector(`.edit-exercise-type[data-ex="${exerciseIndex}"]`);
        if(typeSelect){
            exercise.type = typeSelect.value || "weight";
        }
        if(!exercise.type) exercise.type = "weight";

        // Capture aussi le gainage depuis l'éditeur (si un champ a été rendu)
        const editGainageDuration = document.querySelector(`.edit-gainage-duration[data-ex="${exerciseIndex}"]`);
        const editGainageType = document.querySelector(`.edit-gainage-type[data-ex="${exerciseIndex}"]`);
        if(editGainageDuration || editGainageType){
            const dur = Number(editGainageDuration?.value) || 0;
            const type = String(editGainageType?.value || "").trim();
            if(dur > 0 || type){
                exercise.gainage = { duration: dur, type };
            } else if(exercise.gainage){
                delete exercise.gainage;
            }
        }
    });

    // Sauvegarder les exercices supplémentaires modifiés
    const extraExercises = [];
    document.querySelectorAll(".extra-exercise-edit").forEach(div => {
        const name = div.querySelector(".edit-extra-name")?.value || "";
        const mode = div.querySelector(".edit-extra-mode")?.value || "sets";
        
        if(!name) return;
        
        const exercise = {
            name: name,
            mode: mode,
            isExtra: true
        };
        
        if(mode === "time") {
            exercise.duration = Number(div.querySelector(".edit-extra-duration")?.value) || 0;
            exercise.intensity = div.querySelector(".edit-extra-intensity")?.value || "";
        } else {
            exercise.sets = Number(div.querySelector(".edit-extra-sets")?.value) || 0;
            exercise.reps = Number(div.querySelector(".edit-extra-reps")?.value) || 0;
            exercise.weight = Number(div.querySelector(".edit-extra-weight")?.value) || 0;
        }
        
        extraExercises.push(exercise);
    });
    
    session.extraExercises = extraExercises;

    const editedDate = new Date(session.date);
    calendarState.date = new Date(editedDate.getFullYear(), editedDate.getMonth(), 1);

    saveData();
    refreshSessionViews();
    modal.close();
    alert("Séance modifiée ✅");
}




function fillProgressExercises(){


    const select =
    document.getElementById("exerciseProgress");



    if(!select) return;



    const exercises = [];



    data.program.forEach(workout=>{


        workout.exercises.forEach(ex=>{


            if(!exercises.includes(ex.name)){

                exercises.push(ex.name);

            }


        });


    });



    select.innerHTML="";



    exercises.forEach(name=>{


        const option =
        document.createElement("option");


        option.value=name;


        option.textContent=name;


        select.appendChild(option);



    });



    select.onchange=()=>{


        renderChart(select.value);


    };



    if(exercises.length){

        renderChart(exercises[0]);

    }



}
function renderChart(exerciseName){


    const box =
    document.getElementById("chartBox");


    if(!box) return;



    box.innerHTML="";



    const values=[];



    data.sessions.forEach(session=>{


        session.exercises.forEach(ex=>{


            if(ex.name===exerciseName){


                let best=0;


                ex.sets.forEach(set=>{


                    if(Number(set.weight)>best){

                        best=Number(set.weight);

                    }


                });



                values.push({

                    date:
                    new Date(session.date)
                    .toLocaleDateString("fr-FR",
                    {
                        day:"2-digit",
                        month:"2-digit"
                    }),

                    value:best

                });



            }


        });


    });



    if(values.length===0){


        box.innerHTML=
        `<div class="empty">
        Pas encore de données pour cet exercice.
        </div>`;


        return;


    }



    const max =
    Math.max(
        ...values.map(v=>v.value)
    );



    values.forEach(point=>{


        const div =
        document.createElement("div");


        div.className="point";



        const height =
        max===0
        ? 5
        :
        (point.value/max)*100;



        div.innerHTML=`

        <i style="height:${height}%">

        <b>${point.value}kg</b>

        </i>


        <span>

        ${point.date}

        </span>


        `;



        box.appendChild(div);



    });



}







let programEditorDraft = null;

document.getElementById("editProgram")
?.addEventListener(
"click",
()=>{


    const modal =
    document.getElementById("programModal");


    // Les modifications restent dans un brouillon tant que l'utilisateur ne sauvegarde pas.
    programEditorDraft = JSON.parse(JSON.stringify(data.program));
    renderProgramEditor();


    modal.showModal();


});







function renderProgramEditor(){


    const container =
    document.getElementById("programEditor");



    if(!container) return;



    container.innerHTML="";



    (programEditorDraft || data.program).forEach(workout=>{


        const block =
        document.createElement("div");


        block.className="card";



        let html = `

        <h3>

        <input type="text" class="workout-name-edit" data-workout="${workout.id}" value="${workout.name}" style="font-size:16px;font-weight:700;border:1px solid #dce2d9;background:#fbfcfa;border-radius:7px;padding:6px 8px;font:inherit;color:inherit;width:100%;">

        </h3>

        `;



        workout.exercises.forEach((ex,index)=>{


            html += `


            <div class="prog">


                <input
                class="edit-name"
                data-workout="${workout.id}"
                data-index="${index}"
                value="${ex.name}">


                <input
                class="edit-weight"
                type="number"
                data-workout="${workout.id}"
                data-index="${index}"
                value="${ex.weight}">


                <input
                class="edit-sets"
                type="number"
                data-workout="${workout.id}"
                data-index="${index}"
                value="${ex.sets}">


                <input
                class="edit-reps"
                type="number"
                data-workout="${workout.id}"
                data-index="${index}"
                value="${ex.reps}">


                <button
                class="remove"
                data-workout="${workout.id}"
                data-index="${index}">

                ×

                </button>


            </div>


            `;


        });

        html += `
            <button type="button" class="btn add-program-exercise" data-workout="${workout.id}" style="width:100%;margin-top:10px;padding:9px;">
                + Ajouter un exercice
            </button>
        `;



        block.innerHTML=html;


        container.appendChild(block);



    });



    document.querySelectorAll(".remove")
    .forEach(button=>{


        button.onclick=()=>{
            syncProgramEditorDraft();

            const workout =
            programEditorDraft.find(
            w=>w.id===Number(button.dataset.workout)
            );



            workout.exercises.splice(
                Number(button.dataset.index),
                1
            );



            renderProgramEditor();


        };


    });

    document.querySelectorAll(".add-program-exercise")
    .forEach(button=>{
        button.onclick=()=>{
            syncProgramEditorDraft();
            const workout = programEditorDraft.find(w => w.id === Number(button.dataset.workout));
            if(!workout) return;
            workout.exercises.push({ name: "Nouvel exercice", weight: 0, sets: 3, reps: 10 });
            renderProgramEditor();
        };
    });



}








function syncProgramEditorDraft(){
    if(!programEditorDraft) return;
    document.querySelectorAll(".workout-name-edit").forEach(input => {
        const workout = programEditorDraft.find(w => w.id === Number(input.dataset.workout));
        if(workout) workout.name = input.value.trim() || workout.name;
    });
    document.querySelectorAll(".prog").forEach(row => {
        const nameInput = row.querySelector(".edit-name");
        if(!nameInput) return;
        const workout = programEditorDraft.find(w => w.id === Number(nameInput.dataset.workout));
        const exercise = workout?.exercises[Number(nameInput.dataset.index)];
        if(!exercise) return;
        exercise.name = nameInput.value.trim() || "Nouvel exercice";
        exercise.weight = Number(row.querySelector(".edit-weight")?.value) || 0;
        exercise.sets = Number(row.querySelector(".edit-sets")?.value) || 0;
        exercise.reps = Number(row.querySelector(".edit-reps")?.value) || 0;
    });
}

document.getElementById("saveProgram")
?.addEventListener(
"click",
(e)=>{


    e.preventDefault();

    // Sauvegarder les noms des catégories
    document.querySelectorAll(".workout-name-edit")
    .forEach(input=>{
        const workout =
        programEditorDraft.find(
        w=>w.id===Number(input.dataset.workout)
        );
        if(workout){
            workout.name = input.value;
        }
    });

    document.querySelectorAll(".edit-name")
    .forEach(input=>{


        const workout =
        programEditorDraft.find(
        w=>w.id===Number(input.dataset.workout)
        );



        const index =
        Number(input.dataset.index);



        workout.exercises[index].name =
        input.value;



    });





    document.querySelectorAll(".edit-weight")
    .forEach(input=>{


        const workout =
        programEditorDraft.find(
        w=>w.id===Number(input.dataset.workout)
        );



        workout.exercises[
        Number(input.dataset.index)
        ].weight =
        Number(input.value);



    });





    document.querySelectorAll(".edit-sets")
    .forEach(input=>{


        const workout =
        programEditorDraft.find(
        w=>w.id===Number(input.dataset.workout)
        );



        workout.exercises[
        Number(input.dataset.index)
        ].sets =
        Number(input.value);



    });





    document.querySelectorAll(".edit-reps")
    .forEach(input=>{


        const workout =
        programEditorDraft.find(
        w=>w.id===Number(input.dataset.workout)
        );



        workout.exercises[
        Number(input.dataset.index)
        ].reps =
        Number(input.value);



    });



    data.program = programEditorDraft || data.program;
    programEditorDraft = null;
    saveData();


    renderProgram();


    fillSessionSelect();



    document
    .getElementById("programModal")
    .close();



});


// Accès direct à une page qui n'est pas présente dans la navigation.
function openQuickAccess(){
    const input = document.getElementById("quickAccessCode");
    if(!input) return;
    const code = input.value.trim().toLowerCase().replace(/\s+/g, "");
    const pages = {
        "1rm": "calculator",
        "map": "map",
        "tony": "tony",
        "ghost": "ghost"
    };
    const page = pages[code];
    if(page){
        input.value = "";
        input.style.borderColor = "";
        showPage(page);
        return;
    }
    input.style.borderColor = "#ad4238";
    input.value = "";
    input.placeholder = "Code inconnu — essaie 1RM, MAP ou GHOST";
    setTimeout(() => {
        input.style.borderColor = "";
        input.placeholder = "Entre le code 1RM, MAP ou GHOST";
    }, 2500);
}

document.getElementById("openQuickAccess")?.addEventListener("click", openQuickAccess);
document.getElementById("quickAccessCode")?.addEventListener("keydown", event => {
    if(event.key === "Enter") {
        event.preventDefault();
        openQuickAccess();
    }
});







window.addEventListener(
"load",
()=>{


    renderDashboard();

});

// ================= CALCULATEUR 1RM =================

function calculate1RM(weight, reps) {
    if (reps === 1) return weight;
    
    // Formule d'Epley
    const epley = weight * (1 + reps / 30);
    
    // Formule de Brzycki
    const brzycki = weight * 36 / (37 - reps);
    
    // Moyenne des deux formules
    return (epley + brzycki) / 2;
}

function initCalculator() {
    const calculateBtn = document.getElementById("calculate1RM");
    const weightInput = document.getElementById("calcWeight");
    const repsInput = document.getElementById("calcReps");
    const exerciseSelect = document.getElementById("calcExercise");
    
    // Remplir le sélecteur d'exercices
    if (exerciseSelect) {
        const allExercises = new Set();
        data.program.forEach(workout => {
            workout.exercises.forEach(ex => {
                allExercises.add(ex.name);
            });
        });
        
        allExercises.forEach(exName => {
            const option = document.createElement("option");
            option.value = exName;
            option.textContent = exName;
            exerciseSelect.appendChild(option);
        });
    }
    
    if (calculateBtn) {
        calculateBtn.addEventListener("click", () => {
            const exercise = exerciseSelect.value;
            const weight = parseFloat(weightInput.value);
            const reps = parseInt(repsInput.value);
            
            if (!exercise) {
                alert("Veuillez sélectionner un exercice");
                return;
            }
            
            if (!weight || !reps || reps < 1) {
                alert("Veuillez entrer des valeurs valides");
                return;
            }
            
            if (reps > 12) {
                alert("Pour une estimation précise, utilisez une série de 12 reps ou moins");
            }
            
            const estimated1RM = calculate1RM(weight, reps);
            
            // Sauvegarder le record
            const record = {
                id: Date.now(),
                exercise: exercise,
                weight: weight,
                reps: reps,
                estimated1RM: estimated1RM,
                date: new Date().toISOString()
            };
            
            maxData.records.unshift(record);
            saveMaxData();
            
            // Afficher le résultat
            document.getElementById("result1RM").textContent = formatNumber(estimated1RM) + " kg";
            document.getElementById("calcResult").style.display = "block";
            
            // Calculer les pourcentages
            document.getElementById("p90").textContent = formatNumber(estimated1RM * 0.9) + " kg";
            document.getElementById("p80").textContent = formatNumber(estimated1RM * 0.8) + " kg";
            document.getElementById("p70").textContent = formatNumber(estimated1RM * 0.7) + " kg";
            document.getElementById("p60").textContent = formatNumber(estimated1RM * 0.6) + " kg";
            
            // Afficher l'historique
            renderMaxHistory();
        });
    }
    
    renderMaxHistory();
}

function renderMaxHistory() {
    const historyContainer = document.getElementById("maxHistory");
    if (!historyContainer) return;
    
    if (maxData.records.length === 0) {
        historyContainer.innerHTML = '<div class="empty">Aucun 1RM enregistré.</div>';
        return;
    }
    
    // Grouper par exercice et garder le meilleur
    const bestByExercise = {};
    maxData.records.forEach(record => {
        if (!bestByExercise[record.exercise] || record.estimated1RM > bestByExercise[record.exercise].estimated1RM) {
            bestByExercise[record.exercise] = record;
        }
    });
    
    const sortedExercises = Object.values(bestByExercise).sort((a, b) => b.estimated1RM - a.estimated1RM);
    
    historyContainer.innerHTML = sortedExercises.map(record => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--line);">
            <div>
                <b style="display:block;font-size:14px;">${record.exercise}</b>
                <span style="font-size:12px;color:var(--muted);">${new Date(record.date).toLocaleDateString("fr-FR")}</span>
            </div>
            <b style="font-size:18px;color:var(--lime);">${formatNumber(record.estimated1RM)} kg</b>
        </div>
    `).join("");
}

// Initialiser le calculateur au chargement
document.addEventListener("DOMContentLoaded", initCalculator);
