/* ============================================================
   DAILY CHECK & EMPLOI DU TEMPS — Carnet Muscu
   - Reproduction exacte avec ALIGNEMENT HORAIRE STRICT (grille CSS)
     * Mardi 8h et Mercredi 8h alignés sur la même ligne horizontale
     * Lundi : 8h-18h, perm 9h-10h, pause midi 12h-13h
     * Mardi : 8h-18h, pause midi 11h-12h
     * Mercredi : 11h-13h (matin libre jusqu'à 11h, fin 13h !)
     * Jeudi : 8h-15h (trou 12h-14h en Semaine A, 12h-13h en Semaine B)
     * Vendredi : 8h-15h, pause midi 12h-13h, EPS 13h-15h
     * Samedi & Dimanche : 100% libres
   - Pauses midi ultra-visibles et démarquées
   - Entraînement du jour héroïque avec aperçu des exercices
   - Heatmap de survie sur toute l'année scolaire (Sept 2026 - Juil 2027)
   ============================================================ */

(function(){
    "use strict";

    var STORAGE_PLAN = "carnetMuscu_schedule_planning";
    var STORAGE_SURVIVAL = "carnetMuscu_school_survival";
    var STORAGE_WEEK_TYPE = "carnetMuscu_schedule_week_type"; // "A" ou "B"

    // 1. Structure de l'emploi du temps avec blocs d'heures réels (8h à 18h)
    var WEEK_SCHEDULE_DATA = {
        mon: {
            name: "Lundi",
            short: "Lun",
            colIndex: 2,
            endHour: "18:00",
            lunchText: "12h00 - 13h00 (1h)",
            summary: "8h - 18h · Perm 9h-10h · Midi 12h-13h",
            getBlocks: function(){
                return [
                    { startH: 8, endH: 9, subject: "ESPAGNOL", teacher: "CHULIA JORDAN A.", room: "L213 LV", type: "lang" },
                    { startH: 9, endH: 10, subject: "HEURE DE PERM / TROU", teacher: "", room: "☕ Détente / Révisions", type: "perm" },
                    { startH: 10, endH: 12, subject: "TP PHYSIQUE-CHIMIE", teacher: "D'ALENCON L.", room: "L105 TP Lycée", type: "science" },
                    { startH: 12, endH: 13, subject: "PAUSE DÉJEUNER", teacher: "", room: "🍽️ Repas (12h - 13h)", type: "lunch" },
                    { startH: 13, endH: 14, subject: "ANGLAIS", teacher: "GROZOS L.", room: "L210 LV", type: "lang" },
                    { startH: 14, endH: 16, subject: "PHILOSOPHIE", teacher: "SORIA V.", room: "L027", type: "humanities" },
                    { startH: 16, endH: 18, subject: "MATHS EXPERTES", teacher: "MASSERON J.", room: "P101", type: "math" }
                ];
            },
            tip: "Journée 8h - 18h avec perm 9h-10h et midi 12h-13h. Séance tardive vers 18h45 ou repos complet."
        },
        tue: {
            name: "Mardi",
            short: "Mar",
            colIndex: 3,
            endHour: "18:00",
            lunchText: "11h00 - 12h00 (1h)",
            summary: "8h - 18h · Midi 11h-12h",
            getBlocks: function(){
                return [
                    { startH: 8, endH: 10, subject: "ENSEIGN. SCIENTIFIQUE", teacher: "NOEL F.", room: "L122 Phys Cours", type: "science" },
                    { startH: 10, endH: 11, subject: "ANGLAIS", teacher: "GROZOS L.", room: "L209 LV", type: "lang" },
                    { startH: 11, endH: 12, subject: "PAUSE DÉJEUNER", teacher: "", room: "🍽️ Repas anticipé (11h - 12h)", type: "lunch" },
                    { startH: 12, endH: 13, subject: "HISTOIRE-GEOGRAPHIE", teacher: "CHAVE-MAHIR F.", room: "C205", type: "humanities" },
                    { startH: 13, endH: 15, subject: "MATHEMATIQUES", teacher: "BONTEMPS E.", room: "P003", type: "math" },
                    { startH: 15, endH: 17, subject: "PHYSIQUE-CHIMIE", teacher: "D'ALENCON L.", room: "L114 Phys Cours", type: "science" },
                    { startH: 17, endH: 18, subject: "MATHS EXPERTES", teacher: "MASSERON J.", room: "P101", type: "math" }
                ];
            },
            tip: "Journée 8h - 18h avec pause midi de 11h à 12h. Préférer repos ou courte séance de décharge."
        },
        wed: {
            name: "Mercredi",
            short: "Mer",
            colIndex: 4,
            endHour: "13:00",
            lunchText: "Dès 13h00",
            summary: "11h - 13h · Matin libre · Après-midi libre dès 13h",
            getBlocks: function(){
                return [
                    { startH: 8, endH: 11, subject: "MATINÉE 100% LIBRE", teacher: "", room: "✨ Sommeil & Repos (8h-11h)", type: "golden-free" },
                    { startH: 11, endH: 12, subject: "HISTOIRE-GEOGRAPHIE", teacher: "CHAVE-MAHIR F.", room: "C205", type: "humanities" },
                    { startH: 12, endH: 13, subject: "ENSEIGN. SCIENTIFIQUE", teacher: "FULCRAND R.", room: "LYC - SALLES SVT", type: "science" }
                ];
            },
            tip: "🔥 CRÉNEAU EN OR : Fin à 13h00 ! L'après-midi parfait pour ta plus grosse séance (Pecs ou Legday) vers 14h30 !"
        },
        thu: {
            name: "Jeudi",
            short: "Jeu",
            colIndex: 5,
            endHour: "15:00",
            lunchText: "12h00 - 14h00 (Sem A) / 12h00 - 13h00 (Sem B)",
            summary: "8h - 15h · Trou midi · Fin 15h",
            getBlocks: function(weekType){
                var list = [
                    { startH: 8, endH: 10, subject: "PHILOSOPHIE", teacher: "SORIA V.", room: "L012", type: "humanities" },
                    { startH: 10, endH: 12, subject: "MATHEMATIQUES", teacher: "BONTEMPS E.", room: "L004", type: "math" }
                ];
                if(weekType === "B"){
                    list.push({ startH: 12, endH: 13, subject: "PAUSE DÉJEUNER", teacher: "", room: "🍽️ Repas (12h - 13h)", type: "lunch" });
                    list.push({ startH: 13, endH: 14, subject: "ENS. MORAL & CIVIQUE", teacher: "CHAVE-MAHIR F.", room: "C205 (Semaine B)", type: "humanities" });
                } else {
                    list.push({ startH: 12, endH: 14, subject: "TROU & PAUSE DÉJEUNER", teacher: "", room: "🍽️ Repas libre 2h (12h - 14h)", type: "lunch" });
                }
                list.push({ startH: 14, endH: 15, subject: "HISTOIRE-GEOGRAPHIE", teacher: "CHAVE-MAHIR F.", room: "C205", type: "humanities" });
                return list;
            },
            tip: "⭐ Fin des cours dès 15h00 ! (Trou 12h-14h en Sem A ou 12h-13h en Sem B). Parfait pour caler ta séance vers 15h30 !"
        },
        fri: {
            name: "Vendredi",
            short: "Ven",
            colIndex: 6,
            endHour: "15:00",
            lunchText: "12h00 - 13h00 (1h)",
            summary: "8h - 15h · Midi 12h-13h · EPS 13h-15h · Fin 15h",
            getBlocks: function(){
                return [
                    { startH: 8, endH: 10, subject: "PHYSIQUE-CHIMIE", teacher: "D'ALENCON L.", room: "L124 Phys Cours", type: "science" },
                    { startH: 10, endH: 12, subject: "MATHEMATIQUES", teacher: "BONTEMPS E.", room: "L006", type: "math" },
                    { startH: 12, endH: 13, subject: "PAUSE DÉJEUNER", teacher: "", room: "🍽️ Repas (12h - 13h)", type: "lunch" },
                    { startH: 13, endH: 15, subject: "ED. PHYSIQUE & SPORT. (EPS)", teacher: "CHAPA Y.", room: "EPS Gymnase", type: "eps" }
                ];
            },
            tip: "🏃 Journée 8h - 15h avec pause midi 12h-13h et EPS 13h-15h. Week-end dès 15h00 !"
        },
        sat: {
            name: "Samedi",
            short: "Sam",
            colIndex: 7,
            endHour: null,
            lunchText: "12h00 - 13h00",
            summary: "Samedi 100% Libre",
            getBlocks: function(){
                return [
                    { startH: 8, endH: 12, subject: "MATINÉE 100% LIBRE", teacher: "Pas de cours", room: "🏆 Énergie & Repos", type: "weekend" },
                    { startH: 12, endH: 13, subject: "PAUSE DÉJEUNER", teacher: "", room: "🍽️ Repas équilibré", type: "lunch" }
                ];
            },
            tip: "🌟 Samedi libre : moment idéal pour une séance intense (Legday ou Dos) en matinée (11h) ou début d'aprem !"
        },
        sun: {
            name: "Dimanche",
            short: "Dim",
            colIndex: 8,
            endHour: null,
            lunchText: "12h00 - 13h00",
            summary: "Dimanche 100% Libre",
            getBlocks: function(){
                return [
                    { startH: 8, endH: 12, subject: "MATINÉE LIBRE & CARDIO", teacher: "Pas de cours", room: "🏃 Running extérieur", type: "weekend" },
                    { startH: 12, endH: 13, subject: "PAUSE DÉJEUNER", teacher: "", room: "🍽️ Repas dominical", type: "lunch" }
                ];
            },
            tip: "🏃 Dimanche libre : parfait pour ta sortie Running au grand air ou repos complet avant la semaine !"
        }
    };

    var DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    // Répartition optimale adaptée aux fins de cours (13h le mercredi, 15h le jeudi/vendredi)
    var DEFAULT_PLAN = {
        mon: { type: "workout", id: 3, name: "ÉPAULES + ABDOS", time: "18h45" },
        tue: { type: "rest", id: null, name: "Repos", time: "" },
        wed: { type: "workout", id: 1, name: "PECS + BICEPS", time: "14h30" }, // fin 13h !
        thu: { type: "workout", id: 2, name: "TRICEPS + DOS", time: "15h30" }, // fin 15h !
        fri: { type: "rest", id: null, name: "Repos (après EPS)", time: "" },
        sat: { type: "workout", id: 4, name: "LEGDAY", time: "11h00" },
        sun: { type: "run", id: "run", name: "Running", time: "10h30" }
    };

    // ============================================================
    // GESTION DU STOCKAGE
    // ============================================================
    function loadPlan(){
        try {
            var raw = localStorage.getItem(STORAGE_PLAN);
            if(raw) return JSON.parse(raw);
        } catch(e){}
        return JSON.parse(JSON.stringify(DEFAULT_PLAN));
    }

    function savePlan(plan){
        try {
            localStorage.setItem(STORAGE_PLAN, JSON.stringify(plan));
        } catch(e){}
    }

    function loadSurvivalData(){
        try {
            var raw = localStorage.getItem(STORAGE_SURVIVAL);
            if(raw) return JSON.parse(raw);
        } catch(e){}
        return {};
    }

    function saveSurvivalData(data){
        try {
            localStorage.setItem(STORAGE_SURVIVAL, JSON.stringify(data));
        } catch(e){}
    }

    function getWeekType(){
        return localStorage.getItem(STORAGE_WEEK_TYPE) || "A";
    }

    function setWeekType(val){
        localStorage.setItem(STORAGE_WEEK_TYPE, val);
    }

    function getTodayKey(){
        var d = new Date();
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");
        return yyyy + "-" + mm + "-" + dd;
    }

    function getDayKeyFromDate(d){
        var jsDay = d.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        var map = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };
        return map[jsDay] || "mon";
    }

    function getAvailableWorkouts(){
        var list = [];
        if(window.data && Array.isArray(window.data.program) && window.data.program.length > 0){
            list = window.data.program.map(function(p){
                return {
                    id: p.id,
                    name: p.name,
                    exercises: Array.isArray(p.exercises) ? p.exercises : []
                };
            });
        } else {
            list = [
                { id: 1, name: "PECS + BICEPS", exercises: [{ name: "Haut chest press" }, { name: "Développé couché" }, { name: "Pec deck" }, { name: "Curl machine" }] },
                { id: 2, name: "TRICEPS + DOS", exercises: [{ name: "Tractions" }, { name: "Tirage horizontal" }, { name: "Tirage vertical" }, { name: "Dips" }] },
                { id: 3, name: "ÉPAULES + ABDOS", exercises: [{ name: "Shoulder press" }, { name: "Élévations latérales" }, { name: "Crunch machine" }] },
                { id: 4, name: "LEGDAY", exercises: [{ name: "Hack Squat" }, { name: "Leg extension" }, { name: "Presse à cuisses" }] }
            ];
        }
        return list;
    }

    function checkLoggedWorkoutToday(dateStr){
        dateStr = dateStr || getTodayKey();
        var result = { done: false, details: null, isRun: false };

        if(window.data && Array.isArray(window.data.sessions)){
            for(var i = 0; i < window.data.sessions.length; i++){
                var s = window.data.sessions[i];
                if(s && s.date){
                    var sDate = typeof s.date === "string" ? s.date.slice(0, 10) : "";
                    if(sDate === dateStr){
                        result.done = true;
                        result.details = s.programName || "Séance musculation";
                        return result;
                    }
                }
            }
        }

        if(window.data && Array.isArray(window.data.runs)){
            for(var j = 0; j < window.data.runs.length; j++){
                var r = window.data.runs[j];
                if(r && r.date){
                    var rDate = typeof r.date === "string" ? r.date.slice(0, 10) : "";
                    if(rDate === dateStr){
                        result.done = true;
                        result.details = (r.distanceKm ? r.distanceKm + " km" : "Sortie running");
                        result.isRun = true;
                        return result;
                    }
                }
            }
        }

        return result;
    }

    var currentTab = "today"; // "today", "timetable", "heatmap"

    // ============================================================
    // RENDU PRINCIPAL DU MODULE
    // ============================================================
    function renderDailyCheck(){
        var container = document.getElementById("dailycheckContainer");
        if(!container) return;

        var plan = loadPlan();
        var survival = loadSurvivalData();
        var todayKey = getTodayKey();
        var todayDayKey = getDayKeyFromDate(new Date());

        // Synchro automatique des séances faites
        var autoLogged = checkLoggedWorkoutToday(todayKey);
        if(!survival[todayKey]) survival[todayKey] = { school: false, workout: false };
        if(autoLogged.done && !survival[todayKey].workout){
            survival[todayKey].workout = true;
            survival[todayKey].autoLogged = true;
            survival[todayKey].loggedTitle = autoLogged.details;
            saveSurvivalData(survival);
        }

        var stats = computeSchoolYearStats(survival, plan);
        var wt = getWeekType();

        var html = '';

        // Barre d'en-tête & Onglets
        html += '<div class="dc-header-bar">';
        html += '  <div class="dc-tabs">';
        html += '    <button class="dc-tab-btn ' + (currentTab === "today" ? "active" : "") + '" onclick="window.__setDcTab(\'today\')">⚡ Daily Check du jour</button>';
        html += '    <button class="dc-tab-btn ' + (currentTab === "timetable" ? "active" : "") + '" onclick="window.__setDcTab(\'timetable\')">🗓️ Emploi du Temps Aligné (8h-18h)</button>';
        html += '    <button class="dc-tab-btn ' + (currentTab === "heatmap" ? "active" : "") + '" onclick="window.__setDcTab(\'heatmap\')">📊 Survie Année Scolaire (' + stats.schoolDaysSurvived + ' j)</button>';
        html += '  </div>';

        html += '  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
        html += '    <div class="dc-week-type-toggle">';
        html += '      <span>Jeudi :</span>';
        html += '      <button class="' + (wt === "A" ? "active" : "") + '" onclick="window.__toggleWeekType(\'A\')">Sem. A (Midi 12h-14h)</button>';
        html += '      <button class="' + (wt === "B" ? "active" : "") + '" onclick="window.__toggleWeekType(\'B\')">Sem. B (EMC 13h-14h)</button>';
        html += '    </div>';
        html += '    <div class="dc-streak-badge" title="Série de jours consécutifs validés">';
        html += '      <span class="dc-streak-flame">🔥</span>';
        html += '      <div>';
        html += '        <strong>' + stats.currentStreak + ' ' + (stats.currentStreak > 1 ? 'jours' : 'jour') + '</strong>';
        html += '        <small>Série en cours</small>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        if(currentTab === "today"){
            html += renderTodayView(plan, survival, todayKey, todayDayKey, autoLogged, stats, wt);
        } else if(currentTab === "timetable"){
            html += renderTimetableView(plan, todayDayKey, wt);
        } else if(currentTab === "heatmap"){
            html += renderHeatmapView(survival, plan, stats);
        }

        container.innerHTML = html;

        updateDashboardDailyWidget(survival, plan, todayKey, todayDayKey, stats);
    }

    // ============================================================
    // 1. VUE "DAILY CHECK DU JOUR"
    // ============================================================
    function renderTodayView(plan, survival, todayKey, todayDayKey, autoLogged, stats, wt){
        var dayInfo = WEEK_SCHEDULE_DATA[todayDayKey];
        var planned = plan[todayDayKey] || { type: "rest", name: "Repos" };
        var todaySurvival = survival[todayKey] || { school: false, workout: false };
        var isWeekend = (todayDayKey === "sat" || todayDayKey === "sun");
        var bothChecked = (todaySurvival.school || isWeekend) && todaySurvival.workout;

        var d = new Date();
        var dateFormatted = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
        dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

        var workouts = getAvailableWorkouts();
        var activeWorkoutObj = workouts.find(function(w){ return String(w.id) === String(planned.id); });

        var html = '<div class="dc-today-layout">';

        // COLONNE GAUCHE
        html += '<div style="display:flex;flex-direction:column;gap:18px;">';

        // CARTE HERO DU CHECK
        html += '<div class="card dc-hero-card ' + (bothChecked ? 'dc-perfect-day' : '') + '">';
        html += '  <div class="dc-hero-head">';
        html += '    <div>';
        html += '      <span class="eyebrow">⚡ DAILY CHECK · ' + dateFormatted + '</span>';
        html += '      <h2 style="font-size:24px;margin:4px 0 4px;">' + (bothChecked ? '🎉 Journée Parfaite 100% Validée !' : 'Ta mission de la journée') + '</h2>';
        html += '      <p class="sub" style="margin:0;font-size:13px;">' + dayInfo.summary + '</p>';
        html += '    </div>';
        if(bothChecked){
            html += '    <div class="dc-perfect-badge">💯 PARFAIT</div>';
        }
        html += '  </div>';

        html += '  <div class="dc-checks-grid">';

        // Case 1 : École
        html += '    <div class="dc-check-box ' + (todaySurvival.school ? 'checked' : '') + ' ' + (isWeekend ? 'weekend-free' : '') + '">';
        html += '      <label class="dc-check-label">';
        html += '        <input type="checkbox" id="checkSchool" ' + (todaySurvival.school ? 'checked' : '') + ' onchange="window.__toggleSurvivalCheck(\'school\')">';
        html += '        <div class="dc-check-custom"><span class="dc-check-icon">✓</span></div>';
        html += '        <div class="dc-check-text">';
        if(isWeekend){
            html += '          <strong>🎒 École : Week-end libre !</strong>';
            html += '          <span>Pas de cours aujourd\'hui, repos cérébral garanti.</span>';
        } else {
            html += '          <strong>🎒 J\'ai survécu aux cours aujourd\'hui</strong>';
            html += '          <span>' + (todaySurvival.school ? '✅ Journée de cours validée !' : 'Fin des cours à ' + dayInfo.endHour + ' · Coche une fois ta journée finie') + '</span>';
        }
        html += '        </div>';
        html += '      </label>';
        html += '    </div>';

        // Case 2 : Sport
        html += '    <div class="dc-check-box ' + (todaySurvival.workout ? 'checked' : '') + '">';
        html += '      <label class="dc-check-label">';
        html += '        <input type="checkbox" id="checkWorkout" ' + (todaySurvival.workout ? 'checked' : '') + ' onchange="window.__toggleSurvivalCheck(\'workout\')">';
        html += '        <div class="dc-check-custom"><span class="dc-check-icon">✓</span></div>';
        html += '        <div class="dc-check-text">';
        if(planned.type === "workout"){
            html += '          <strong>🏋️ Séance : ' + planned.name + '</strong>';
            html += '          <span>' + (todaySurvival.workout ? '✅ Séance validée & accomplie !' : 'Prévue vers ' + (planned.time || '15h30') + ' · Coche une fois terminée') + '</span>';
        } else if(planned.type === "run"){
            html += '          <strong>🏃 Sortie Running</strong>';
            html += '          <span>' + (todaySurvival.workout ? '✅ Sortie terminée avec succès !' : 'Sortie programmée vers ' + (planned.time || '10h30')) + '</span>';
        } else {
            html += '          <strong>🧘 Journée de Repos & Récupération</strong>';
            html += '          <span>' + (todaySurvival.workout ? '✅ Récupération respectée' : 'Coche pour valider ton repos programmé') + '</span>';
        }
        html += '        </div>';
        html += '      </label>';
        html += '    </div>';

        html += '  </div>';
        html += '</div>'; // Fin hero card

        // VITRINE HERO ENTRAÎNEMENT DU JOUR
        html += '<div class="card dc-workout-showcase">';
        html += '  <div class="dc-ws-top">';
        html += '    <div style="display:flex;align-items:center;gap:10px;">';
        html += '      <span class="dc-ws-badge">⚡ OBJECTIF SPORT DU JOUR</span>';
        html += '      <span class="dc-ws-time">🕒 ' + (planned.time ? "Prévu à " + planned.time : (dayInfo.endHour ? "Dès " + dayInfo.endHour : "Horaire libre")) + '</span>';
        html += '    </div>';
        html += '    <span class="dc-ws-status ' + (todaySurvival.workout ? 'done' : 'pending') + '">' + (todaySurvival.workout ? '✓ VALIDÉ' : 'À FAIRE') + '</span>';
        html += '  </div>';

        html += '  <div class="dc-ws-body">';
        if(planned.type === "workout"){
            html += '    <h3 class="dc-ws-title">🏋️ ' + planned.name + '</h3>';
            html += '    <p class="sub" style="margin:0 0 12px;font-size:12px;">Exercices programmés dans ton carnet :</p>';

            if(activeWorkoutObj && activeWorkoutObj.exercises && activeWorkoutObj.exercises.length > 0){
                html += '    <div class="dc-ws-exercise-chips">';
                activeWorkoutObj.exercises.slice(0, 6).forEach(function(ex){
                    var wText = (ex.weight !== undefined && ex.weight !== null && ex.weight !== "") ? ex.weight + "kg" : "";
                    var sText = ex.sets ? ex.sets + "×" + (ex.reps || "10") : "";
                    html += '<span class="dc-ws-chip"><b>' + ex.name + '</b>' + (sText ? ' <small>' + sText + (wText ? ' · ' + wText : '') + '</small>' : '') + '</span>';
                });
                html += '    </div>';
            }

            html += '    <div class="dc-ws-cta-row">';
            html += '      <button class="btn lime" style="font-weight:800;" onclick="window.__launchPlannedWorkout(' + planned.id + ')">🔥 DÉMARRER LA SÉANCE DANS LE CARNET →</button>';
            html += '      <button class="btn" style="background:#fff;border:1px solid var(--line);font-size:11px;" onclick="window.__setDcTab(\'timetable\')">Changer de séance</button>';
            html += '    </div>';

        } else if(planned.type === "run"){
            html += '    <h3 class="dc-ws-title">🏃 SORTIE RUNNING</h3>';
            html += '    <p class="sub" style="margin:0 0 14px;font-size:13px;">Course à pied extérieure ou tapis · Travail cardio & endurance.</p>';
            html += '    <div class="dc-ws-cta-row">';
            html += '      <button class="btn lime" style="font-weight:800;" onclick="showPage(\'running\')">🏃 OUVRIR LE RUNNING →</button>';
            html += '    </div>';

        } else {
            html += '    <h3 class="dc-ws-title">🧘 REPOS & RÉCUPÉRATION</h3>';
            html += '    <p class="sub" style="margin:0;font-size:13px;">Pas d\'entraînement lourd aujourd\'hui. Objectifs : hydratation (2.5L d\'eau) et 8h de sommeil pour reconstruire les fibres musculaires.</p>';
        }

        html += '  </div>';
        html += '</div>';

        html += '</div>'; // Fin colonne gauche

        // COLONNE DROITE : TIMELINE DU JOUR AVEC PAUSE MIDI
        html += '<div class="card dc-classes-card">';
        html += '  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;">';
        html += '    <div>';
        html += '      <p class="eyebrow" style="margin:0 0 2px;">CHRONOLOGIE DU JOUR</p>';
        html += '      <h3 style="margin:0;font-size:19px;">' + dayInfo.name + ' (' + (dayInfo.endHour ? 'Fin ' + dayInfo.endHour : 'Libre') + ')</h3>';
        html += '    </div>';
        html += '    <div class="dc-lunch-time-tag">🍽️ Midi : ' + dayInfo.lunchText + '</div>';
        html += '  </div>';

        if(dayInfo.tip){
            html += '  <div class="dc-tip-banner">' + dayInfo.tip + '</div>';
        }

        html += '  <div class="dc-timeline">';
        var blocks = dayInfo.getBlocks(wt);
        blocks.forEach(function(b){
            var isLunch = (b.type === "lunch");
            var isPerm = (b.type === "perm");

            if(isLunch){
                html += '    <div class="dc-lunch-prominent-card">';
                html += '      <div class="dc-lunch-prom-head">';
                html += '        <div class="dc-lunch-icon-badge">🍽️ PAUSE DÉJEUNER</div>';
                html += '        <div class="dc-lunch-time-tag">' + b.startH + 'h00 — ' + b.endH + 'h00 (' + (b.endH - b.startH) + 'h)</div>';
                html += '      </div>';
                html += '      <div class="dc-lunch-prom-title">' + b.subject + '</div>';
                html += '      <div class="dc-lunch-prom-sub">' + b.room + '</div>';
                html += '    </div>';
            } else {
                var slotClass = "dc-time-slot " + (b.type || "");
                html += '    <div class="' + slotClass + '">';
                html += '      <div class="dc-slot-time"><strong>' + String(b.startH).padStart(2, "0") + ':00</strong><span>' + String(b.endH).padStart(2, "0") + ':00</span></div>';
                html += '      <div class="dc-slot-body">';
                html += '        <div class="dc-slot-sub">' + b.subject + '</div>';
                if(b.teacher || b.room){
                    html += '        <div class="dc-slot-meta">';
                    if(b.teacher) html += '<span>👤 ' + b.teacher + '</span>';
                    if(b.room) html += '<span class="dc-room-tag">' + b.room + '</span>';
                    html += '        </div>';
                }
                html += '      </div>';
                html += '    </div>';
            }
        });

        // Entraînement prévu après la fin des cours
        if(planned.type !== "rest"){
            html += '    <div class="dc-timeline-workout-slot" style="margin-top:10px;">';
            html += '      <div class="dc-tw-time"><strong>' + (planned.time || (dayInfo.endHour || '15h30')) + '</strong><span>Prévu</span></div>';
            html += '      <div class="dc-tw-info">';
            html += '        <strong>' + (planned.type === "run" ? "🏃 Sortie Running" : "🏋️ Séance " + planned.name) + '</strong>';
            html += '        <span>Objectif physique du jour</span>';
            html += '      </div>';
            html += '      <button class="btn lime" style="padding:6px 12px;font-size:11px;" onclick="window.__launchPlannedWorkout(' + planned.id + ')">Lancer</button>';
            html += '    </div>';
        }

        html += '  </div>'; // Fin dc-timeline
        html += '</div>'; // Fin classes card

        // MINI STATS DE SURVIE EN BAS
        html += '<div class="card dc-stats-summary" style="grid-column:1 / -1;">';
        html += '  <div class="dc-stats-mini-grid">';
        html += '    <div><b>' + stats.schoolDaysSurvived + '</b><span>Jours de cours survécus 🎒</span></div>';
        html += '    <div><b>' + stats.workoutsDone + '</b><span>Séances & Runs accomplis 🏋️</span></div>';
        html += '    <div><b>' + stats.currentStreak + ' j</b><span>Série en cours 🔥</span></div>';
        html += '    <div><b>' + stats.bestStreak + ' j</b><span>Record de série 🏆</span></div>';
        html += '    <div><b>' + stats.successRate + '%</b><span>Taux de réussite annuel 📈</span></div>';
        html += '  </div>';
        html += '</div>';

        html += '</div>';
        return html;
    }

    // ============================================================
    // 2. VUE "EMPLOI DU TEMPS ALIGNÉ (GRILLE STRICTE 8h - 18h)"
    // ============================================================
    function renderTimetableView(plan, todayDayKey, wt){
        var workouts = getAvailableWorkouts();
        var html = '';

        // Barre d'outils
        html += '<div class="card" style="margin-bottom:18px;padding:18px 22px;">';
        html += '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">';
        html += '    <div>';
        html += '      <h3 style="margin:0 0 4px;font-size:19px;">🗓️ Emploi du Temps Aligné (Lundi à Dimanche)</h3>';
        html += '      <p class="sub" style="margin:0;font-size:13px;">Toutes les heures de cours (8h, 9h, 11h, 12h, 15h...) sont strictement alignées côte-à-côte à l\'horizontale.</p>';
        html += '    </div>';
        html += '    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">';
        html += '      <div class="dc-week-type-toggle">';
        html += '        <span>Semaine :</span>';
        html += '        <button class="' + (wt === "A" ? "active" : "") + '" onclick="window.__toggleWeekType(\'A\')">Sem. A (Midi 12h-14h)</button>';
        html += '        <button class="' + (wt === "B" ? "active" : "") + '" onclick="window.__toggleWeekType(\'B\')">Sem. B (EMC C205)</button>';
        html += '      </div>';
        html += '      <button class="btn lime" onclick="window.__applyOptimalPlan()">⚡ Répartition optimale</button>';
        html += '      <button class="btn" style="background:#f1f3ee;border:1px solid var(--line);" onclick="window.__resetPlan()">🔄 Réinitialiser</button>';
        html += '    </div>';
        html += '  </div>';

        // Compteur des 4 entraînements + running
        var assignedCount = 0;
        var runAssigned = 0;
        DAY_KEYS.forEach(function(k){
            if(plan[k] && plan[k].type === "workout") assignedCount++;
            if(plan[k] && plan[k].type === "run") runAssigned++;
        });

        html += '  <div class="dc-plan-summary-chips">';
        html += '    <span class="dc-plan-chip ' + (assignedCount === 4 ? 'done' : '') + '">🏋️ Musculation : <b>' + assignedCount + '/4 séances</b> ' + (assignedCount === 4 ? '✓ Parfait' : '') + '</span>';
        html += '    <span class="dc-plan-chip ' + (runAssigned >= 1 ? 'done' : '') + '">🏃 Running : <b>' + runAssigned + '/1 sortie</b> ' + (runAssigned >= 1 ? '✓ Parfait' : '') + '</span>';
        html += '    <span class="dc-plan-chip">🧘 Repos : <b>' + (7 - assignedCount - runAssigned) + ' jours</b></span>';
        html += '  </div>';
        html += '</div>';

        // GRILLE STRICTEMENT ALIGNÉE HORIZONTALEMENT
        html += '<div class="dc-schedule-wrapper">';
        html += '  <div class="dc-aligned-timegrid">';

        // 1. CELLULE D'ANGLE (COL 1, ROW 1)
        html += '    <div class="dc-grid-cell dc-grid-corner" style="grid-column:1; grid-row:1;">';
        html += '      <span style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;">HEURES</span>';
        html += '    </div>';

        // 2. EN-TÊTES DE JOURS (COL 2 À 8, ROW 1)
        DAY_KEYS.forEach(function(dayKey, idx){
            var col = idx + 2;
            var info = WEEK_SCHEDULE_DATA[dayKey];
            var planned = plan[dayKey] || { type: "rest", name: "Repos" };
            var isToday = (dayKey === todayDayKey);

            html += '    <div class="dc-grid-cell dc-grid-day-header ' + (isToday ? 'today-col' : '') + '" style="grid-column:' + col + '; grid-row:1;">';
            html += '      <div class="dc-col-dayname">' + info.name.toUpperCase() + (isToday ? ' <span class="today-tag">Aujourd\'hui</span>' : '') + '</div>';
            html += '      <div class="dc-col-meta">' + (info.endHour ? 'Fin ' + info.endHour : '100% Libre') + '</div>';

            // Sélecteur d'entraînement
            html += '      <select class="dc-col-inline-select" onchange="window.__updateDayPlan(\'' + dayKey + '\', this.value)">';
            html += '        <option value="rest" ' + (planned.type === "rest" ? "selected" : "") + '>🧘 Repos</option>';
            workouts.forEach(function(w){
                var isSel = (planned.type === "workout" && String(planned.id) === String(w.id));
                html += '        <option value="workout_' + w.id + '" ' + (isSel ? "selected" : "") + '>🏋️ ' + w.name + '</option>';
            });
            html += '        <option value="run" ' + (planned.type === "run" ? "selected" : "") + '>🏃 Running</option>';
            html += '      </select>';

            // Badge compact de la séance assignée
            if(planned.type === "workout"){
                html += '      <div class="dc-badge-planned workout">🏋️ ' + planned.name + '</div>';
            } else if(planned.type === "run"){
                html += '      <div class="dc-badge-planned run">🏃 Running</div>';
            } else {
                html += '      <div class="dc-badge-planned rest">🧘 Repos</div>';
            }
            html += '    </div>';
        });

        // 3. LABELS D'HEURES ALIGNÉS (COL 1, ROWS 2 À 12)
        var hoursLabels = [
            { h: "08:00", row: 2 },
            { h: "09:00", row: 3 },
            { h: "10:00", row: 4 },
            { h: "11:00", row: 5 },
            { h: "12:00", row: 6 },
            { h: "13:00", row: 7 },
            { h: "14:00", row: 8 },
            { h: "15:00", row: 9 },
            { h: "16:00", row: 10 },
            { h: "17:00", row: 11 },
            { h: "18:00", row: 12 }
        ];

        hoursLabels.forEach(function(hl){
            html += '    <div class="dc-grid-cell dc-grid-time-label" style="grid-column:1; grid-row:' + hl.row + ';">';
            html += '      <span>' + hl.h + '</span>';
            html += '    </div>';
        });

        // 4. PLACEMENT DE TOUS LES COURS (COL 2 À 8, ROW SELON HEURE DE DÉBUT / FIN)
        // Formule : startRow = startH - 8 + 2 ; endRow = endH - 8 + 2
        DAY_KEYS.forEach(function(dayKey, idx){
            var col = idx + 2;
            var info = WEEK_SCHEDULE_DATA[dayKey];
            var planned = plan[dayKey] || { type: "rest", name: "Repos" };
            var blocks = info.getBlocks(wt);

            blocks.forEach(function(b){
                var startRow = b.startH - 8 + 2;
                var endRow = b.endH - 8 + 2;
                var isLunch = (b.type === "lunch");

                var cellClass = "dc-grid-cell dc-grid-block " + (b.type || "");
                if(isLunch) cellClass += " lunch-cell";

                html += '    <div class="' + cellClass + '" style="grid-column:' + col + '; grid-row:' + startRow + ' / ' + endRow + ';">';
                if(isLunch){
                    html += '      <div class="dc-cell-lunch-icon">🍽️ PAUSE DÉJEUNER</div>';
                    html += '      <div class="dc-cell-lunch-time">' + b.startH + 'h00 - ' + b.endH + 'h00</div>';
                    html += '      <div class="dc-cell-subject" style="font-size:10px;color:#78350f;">' + b.room + '</div>';
                } else {
                    html += '      <div class="dc-cell-time">' + String(b.startH).padStart(2, "0") + ':00 - ' + String(b.endH).padStart(2, "0") + ':00</div>';
                    html += '      <div class="dc-cell-subject">' + b.subject + '</div>';
                    if(b.teacher) html += '      <div class="dc-cell-teacher">' + b.teacher + '</div>';
                    if(b.room) html += '      <div class="dc-cell-room">' + b.room + '</div>';
                }
                html += '    </div>';
            });

            // FIN DES COURS & ENTRAÎNEMENT DANS LA GRILLE
            if(dayKey === "wed"){
                // Mercredi libre dès 13h (row 7 à 13)
                html += '    <div class="dc-grid-cell dc-grid-block golden-free workout-target-slot" style="grid-column:' + col + '; grid-row:7 / 13;">';
                html += '      <div class="dc-cell-time">DÈS 13:00</div>';
                html += '      <div class="dc-cell-subject" style="color:#1c291e;font-weight:800;">🚀 APRÈS-MIDI 100% LIBRE</div>';
                if(planned.type !== "rest"){
                    html += '      <div class="dc-aligned-workout-banner">';
                    html += '        <strong>⚡ ' + (planned.type === "run" ? "RUNNING" : planned.name) + '</strong>';
                    html += '        <span>Prévu vers ' + (planned.time || '14h30') + '</span>';
                    html += '      </div>';
                }
                html += '    </div>';

            } else if(dayKey === "thu" || dayKey === "fri"){
                // Jeudi & Vendredi fin à 15h (row 9 à 13)
                html += '    <div class="dc-grid-cell dc-grid-block golden-free workout-target-slot" style="grid-column:' + col + '; grid-row:9 / 13;">';
                html += '      <div class="dc-cell-time">DÈS 15:00</div>';
                html += '      <div class="dc-cell-subject" style="color:#1c291e;font-weight:800;">⭐ FIN DES COURS (15h00)</div>';
                if(planned.type !== "rest"){
                    html += '      <div class="dc-aligned-workout-banner">';
                    html += '        <strong>⚡ ' + (planned.type === "run" ? "RUNNING" : planned.name) + '</strong>';
                    html += '        <span>Prévu vers ' + (planned.time || '15h30') + '</span>';
                    html += '      </div>';
                } else {
                    html += '      <div style="font-size:10px;color:#2e5735;margin-top:4px;">Repos & Soirée libre</div>';
                }
                html += '    </div>';

            } else if(dayKey === "mon" || dayKey === "tue"){
                // Lundi & Mardi fin à 18h (row 12 à 13)
                html += '    <div class="dc-grid-cell dc-grid-block free" style="grid-column:' + col + '; grid-row:12 / 13;">';
                html += '      <div class="dc-cell-time">18:00+</div>';
                if(planned.type !== "rest"){
                    html += '      <div class="dc-aligned-workout-banner compact">';
                    html += '        <strong>⚡ ' + (planned.type === "run" ? "RUNNING" : planned.name) + '</strong>';
                    html += '        <span>' + (planned.time || '18h45') + '</span>';
                    html += '      </div>';
                } else {
                    html += '      <div style="font-size:10px;color:var(--muted);font-weight:700;">Soirée libre · Repos</div>';
                }
                html += '    </div>';

            } else {
                // Samedi & Dimanche après-midi libre (row 7 à 13)
                html += '    <div class="dc-grid-cell dc-grid-block golden-free workout-target-slot" style="grid-column:' + col + '; grid-row:7 / 13;">';
                html += '      <div class="dc-cell-time">APRÈS-MIDI LIBRE</div>';
                html += '      <div class="dc-cell-subject" style="color:#1c291e;font-weight:800;">🏆 WEEK-END 100% LIBRE</div>';
                if(planned.type !== "rest"){
                    html += '      <div class="dc-aligned-workout-banner">';
                    html += '        <strong>⚡ ' + (planned.type === "run" ? "RUNNING" : planned.name) + '</strong>';
                    html += '        <span>Prévu vers ' + (planned.time || '11h00') + '</span>';
                    html += '      </div>';
                }
                html += '    </div>';
            }
        });

        html += '  </div>'; // Fin dc-aligned-timegrid
        html += '</div>'; // Fin dc-schedule-wrapper

        return html;
    }

    // ============================================================
    // 3. VUE "SURVIE ANNÉE SCOLAIRE & HEATMAP"
    // ============================================================
    function renderHeatmapView(survival, plan, stats){
        var html = '';

        html += '<div class="card" style="margin-bottom:18px;padding:22px;">';
        html += '  <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;margin-bottom:16px;">';
        html += '    <div>';
        html += '      <p class="eyebrow" style="margin:0 0 4px;">ANNÉE SCOLAIRE 2026 - 2027</p>';
        html += '      <h3 style="margin:0;font-size:22px;">📊 Carte de Survie & Discipline Annuelle</h3>';
        html += '      <p class="sub" style="margin:4px 0 0;">Chaque case représente un jour de l\'année scolaire (Septembre 2026 à Juillet 2027). Clique sur une case pour afficher ou valider.</p>';
        html += '    </div>';
        html += '    <div class="dc-legend">';
        html += '      <span class="dc-legend-item"><i class="sq sq-perfect"></i> Journée Parfaite (École + Sport)</span>';
        html += '      <span class="dc-legend-item"><i class="sq sq-half"></i> Survécu ou Sport validé</span>';
        html += '      <span class="dc-legend-item"><i class="sq sq-empty"></i> Non validé / À venir</span>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div class="stats" style="margin:14px 0 24px;">';
        html += '    <div class="card stat"><b style="color:#2e5735;">' + stats.schoolDaysSurvived + ' / ' + stats.totalSchoolDaysToDate + '</b><span>Jours de cours survécus 🎒</span></div>';
        html += '    <div class="card stat"><b style="color:#426e22;">' + stats.workoutsDone + '</b><span>Séances & Runs accomplis 🏋️</span></div>';
        html += '    <div class="card stat"><b style="color:#e68a00;">🔥 ' + stats.currentStreak + ' j</b><span>Série actuelle (Streak)</span></div>';
        html += '    <div class="card stat"><b style="color:#b87333;">🏆 ' + stats.bestStreak + ' j</b><span>Meilleur Record de Série</span></div>';
        html += '  </div>';

        html += '  <div class="dc-year-calendar-scroll">';
        html += renderSchoolYearHeatmapGrid(survival);
        html += '  </div>';

        html += '</div>';

        html += '<div id="dcDayDetailModal" class="dc-day-detail-panel" style="display:none;"></div>';
        return html;
    }

    function renderSchoolYearHeatmapGrid(survival){
        var months = [
            { year: 2026, month: 8, name: "Septembre 2026" },
            { year: 2026, month: 9, name: "Octobre 2026" },
            { year: 2026, month: 10, name: "Novembre 2026" },
            { year: 2026, month: 11, name: "Décembre 2026" },
            { year: 2027, month: 0, name: "Janvier 2027" },
            { year: 2027, month: 1, name: "Février 2027" },
            { year: 2027, month: 2, name: "Mars 2027" },
            { year: 2027, month: 3, name: "Avril 2027" },
            { year: 2027, month: 4, name: "Mai 2027" },
            { year: 2027, month: 5, name: "Juin 2027" },
            { year: 2027, month: 6, name: "Juillet 2027" }
        ];

        var todayKey = getTodayKey();
        var html = '<div class="dc-heatmap-months-grid">';

        months.forEach(function(m){
            html += '<div class="dc-heatmap-month-card">';
            html += '  <div class="dc-month-title">' + m.name + '</div>';
            html += '  <div class="dc-month-weekdays"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>';
            html += '  <div class="dc-month-days-cells">';

            var firstDay = new Date(m.year, m.month, 1);
            var lastDay = new Date(m.year, m.month + 1, 0);
            var totalDays = lastDay.getDate();

            var offset = (firstDay.getDay() + 6) % 7;
            for(var b = 0; b < offset; b++){
                html += '<span class="dc-day-cell empty"></span>';
            }

            for(var dayNum = 1; dayNum <= totalDays; dayNum++){
                var dateObj = new Date(m.year, m.month, dayNum);
                var dateKey = m.year + "-" + String(m.month + 1).padStart(2, "0") + "-" + String(dayNum).padStart(2, "0");
                var entry = survival[dateKey] || { school: false, workout: false };

                var isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
                var isToday = (dateKey === todayKey);
                var isPast = (dateKey < todayKey);

                var statusClass = "sq-empty";
                if((entry.school || isWeekend) && entry.workout){
                    statusClass = "sq-perfect";
                } else if(entry.school || entry.workout){
                    statusClass = "sq-half";
                } else if(isPast){
                    statusClass = "sq-missed";
                }

                var title = dateKey + " : " + (entry.school ? "🎒 École validée" : "🎒 École non cochée") + " · " + (entry.workout ? "🏋️ Sport validé" : "🏋️ Sport non coché");

                html += '<button type="button" class="dc-day-cell ' + statusClass + ' ' + (isToday ? 'today-ring' : '') + '" title="' + title + '" onclick="window.__openDayDetail(\'' + dateKey + '\')">';
                html += dayNum;
                html += '</button>';
            }

            html += '  </div>';
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    // ============================================================
    // STATISTIQUES & STREAKS
    // ============================================================
    function computeSchoolYearStats(survival, plan){
        var todayKey = getTodayKey();
        var schoolDaysSurvived = 0;
        var totalSchoolDaysToDate = 0;
        var workoutsDone = 0;

        var startDate = new Date(2026, 8, 1);
        var curDate = new Date(startDate);
        var todayObj = new Date();

        while(curDate <= todayObj){
            var yyyy = curDate.getFullYear();
            var mm = String(curDate.getMonth() + 1).padStart(2, "0");
            var dd = String(curDate.getDate()).padStart(2, "0");
            var key = yyyy + "-" + mm + "-" + dd;

            var isWeekend = (curDate.getDay() === 0 || curDate.getDay() === 6);
            if(!isWeekend){
                totalSchoolDaysToDate++;
            }

            var entry = survival[key];
            if(entry){
                if(entry.school) schoolDaysSurvived++;
                if(entry.workout) workoutsDone++;
            }

            curDate.setDate(curDate.getDate() + 1);
        }

        if(totalSchoolDaysToDate === 0) totalSchoolDaysToDate = 1;

        var currentStreak = 0;
        var bestStreak = 0;
        var streakBroken = false;
        var tempCheck = new Date();

        while(!streakBroken){
            var k = tempCheck.getFullYear() + "-" + String(tempCheck.getMonth() + 1).padStart(2, "0") + "-" + String(tempCheck.getDate()).padStart(2, "0");
            var isWk = (tempCheck.getDay() === 0 || tempCheck.getDay() === 6);
            var e = survival[k];

            if(k === todayKey && (!e || (!e.school && !e.workout))){
                tempCheck.setDate(tempCheck.getDate() - 1);
                continue;
            }

            if(e && ((e.school || isWk) || e.workout)){
                currentStreak++;
                tempCheck.setDate(tempCheck.getDate() - 1);
            } else {
                streakBroken = true;
            }

            if(currentStreak > 365) break;
        }

        bestStreak = Math.max(currentStreak, parseInt(localStorage.getItem("carnetMuscu_bestStreak") || "0", 10));
        localStorage.setItem("carnetMuscu_bestStreak", String(bestStreak));

        var successRate = Math.round((schoolDaysSurvived / totalSchoolDaysToDate) * 100);

        return {
            schoolDaysSurvived: schoolDaysSurvived,
            totalSchoolDaysToDate: totalSchoolDaysToDate,
            workoutsDone: workoutsDone,
            currentStreak: currentStreak,
            bestStreak: bestStreak,
            successRate: Math.min(100, Math.max(0, successRate))
        };
    }

    // ============================================================
    // WIDGET SUR LE DASHBOARD
    // ============================================================
    function updateDashboardDailyWidget(survival, plan, todayKey, todayDayKey, stats){
        var widget = document.getElementById("dashboardDailyCheckWidget");
        if(!widget) return;

        var dayInfo = WEEK_SCHEDULE_DATA[todayDayKey];
        var planned = plan[todayDayKey] || { type: "rest", name: "Repos" };
        var entry = survival[todayKey] || { school: false, workout: false };
        var isWeekend = (todayDayKey === "sat" || todayDayKey === "sun");

        var html = '';
        html += '<div class="dc-dash-widget-inner">';
        html += '  <div class="dc-dash-left">';
        html += '    <div style="display:flex;align-items:center;gap:8px;">';
        html += '      <span class="eyebrow" style="margin:0;color:var(--lime);">⚡ DAILY CHECK DU JOUR</span>';
        html += '      <span class="dc-dash-streak">🔥 ' + stats.currentStreak + ' j streak</span>';
        html += '    </div>';
        html += '    <h3 style="margin:4px 0 6px;color:#fff;font-size:18px;">' + dayInfo.name + ' · ' + (isWeekend ? 'Week-end libre' : dayInfo.summary) + '</h3>';
        html += '    <div class="dc-dash-badges">';
        html += '      <span class="dc-dash-badge ' + (entry.school || isWeekend ? 'active' : '') + '">🎒 École : ' + (entry.school ? 'Survécu ✓' : (isWeekend ? 'Repos' : 'À valider')) + '</span>';
        html += '      <span class="dc-dash-badge ' + (entry.workout ? 'active' : '') + '">🏋️ ' + (planned.type === "workout" ? planned.name : (planned.type === "run" ? "Running" : "Repos")) + ' : ' + (entry.workout ? 'Fait ✓' : 'Prévu') + '</span>';
        html += '      <span class="dc-dash-badge" style="background:rgba(255,255,255,0.08);">🍽️ Midi : ' + dayInfo.lunchText + '</span>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="dc-dash-right" style="display:flex;gap:8px;flex-wrap:wrap;">';
        if(planned.type === "workout" && !entry.workout){
            html += '    <button class="btn lime" onclick="window.__launchPlannedWorkout(' + planned.id + ')">🔥 Démarrer ' + planned.name + '</button>';
        }
        html += '    <button class="btn" style="background:rgba(255,255,255,0.15);color:#fff;" onclick="showPage(\'dailycheck\')">Ouvrir Daily Check →</button>';
        html += '  </div>';
        html += '</div>';

        widget.innerHTML = html;
        widget.style.display = "block";
    }

    // ============================================================
    // GESTION DES INTERACTIONS GLOBALES
    // ============================================================
    window.__setDcTab = function(tab){
        currentTab = tab;
        renderDailyCheck();
    };

    window.__toggleWeekType = function(val){
        setWeekType(val);
        renderDailyCheck();
    };

    window.__toggleSurvivalCheck = function(type){
        var survival = loadSurvivalData();
        var todayKey = getTodayKey();
        if(!survival[todayKey]) survival[todayKey] = { school: false, workout: false };

        if(type === "school"){
            survival[todayKey].school = !survival[todayKey].school;
        } else if(type === "workout"){
            survival[todayKey].workout = !survival[todayKey].workout;
        }

        saveSurvivalData(survival);
        renderDailyCheck();
    };

    window.__updateDayPlan = function(dayKey, value){
        var plan = loadPlan();
        var workouts = getAvailableWorkouts();

        if(value === "rest"){
            plan[dayKey] = { type: "rest", id: null, name: "Repos", time: "" };
        } else if(value === "run"){
            plan[dayKey] = { type: "run", id: "run", name: "Running", time: "10h30" };
        } else if(value.indexOf("workout_") === 0){
            var wId = parseInt(value.replace("workout_", ""), 10);
            var target = workouts.find(function(w){ return w.id === wId; });
            var defaultTimes = {
                mon: "18h45",
                tue: "18h45",
                wed: "14h30", // après fin 13h
                thu: "15h30", // après fin 15h
                fri: "15h30", // après fin 15h
                sat: "11h00",
                sun: "11h00"
            };
            plan[dayKey] = {
                type: "workout",
                id: wId,
                name: target ? target.name : "Séance " + wId,
                time: defaultTimes[dayKey] || "16h00"
            };
        }

        savePlan(plan);
        renderDailyCheck();
    };

    window.__applyOptimalPlan = function(){
        savePlan(DEFAULT_PLAN);
        renderDailyCheck();
        if(typeof alert === "function"){
            alert("✨ Répartition optimale appliquée avec succès !\n\n- Mercredi après fin à 13h (14h30) : PECS + BICEPS\n- Jeudi après fin à 15h (15h30) : TRICEPS + DOS\n- Samedi matin 11h00 : LEGDAY\n- Dimanche matin 10h30 : RUNNING\n- Lundi soir 18h45 : ÉPAULES + ABDOS\n- Mardi & Vendredi : Repos & Récupération");
        }
    };

    window.__resetPlan = function(){
        var ok = (typeof confirm === "function") ? confirm("Réinitialiser le planning de la semaine ?") : true;
        if(ok){
            var empty = {
                mon: { type: "rest", name: "Repos" },
                tue: { type: "rest", name: "Repos" },
                wed: { type: "rest", name: "Repos" },
                thu: { type: "rest", name: "Repos" },
                fri: { type: "rest", name: "Repos" },
                sat: { type: "rest", name: "Repos" },
                sun: { type: "rest", name: "Repos" }
            };
            savePlan(empty);
            renderDailyCheck();
        }
    };

    window.__launchPlannedWorkout = function(workoutId){
        if(typeof showPage === "function"){
            showPage("log");
            setTimeout(function(){
                var sel = document.getElementById("sessionProgramSelect");
                if(sel && workoutId){
                    sel.value = String(workoutId);
                    sel.dispatchEvent(new Event("change"));
                }
            }, 50);
        }
    };

    // Modal détail d'un jour heatmap
    window.__openDayDetail = function(dateKey){
        var modal = document.getElementById("dcDayDetailModal");
        if(!modal) return;

        var survival = loadSurvivalData();
        var entry = survival[dateKey] || { school: false, workout: false };

        var d = new Date(dateKey + "T12:00:00");
        var dateFormatted = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

        var html = '';
        html += '<div class="dc-modal-content card">';
        html += '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
        html += '    <h3 style="margin:0;font-size:18px;">📅 ' + dateFormatted + '</h3>';
        html += '    <button class="close" onclick="document.getElementById(\'dcDayDetailModal\').style.display=\'none\'">×</button>';
        html += '  </div>';
        html += '  <p class="sub" style="margin:0 0 16px;">Modifie ou valide rétroactivement ton statut pour ce jour :</p>';

        html += '  <div style="display:grid;gap:12px;margin-bottom:18px;">';
        html += '    <label class="dc-modal-check-row">';
        html += '      <input type="checkbox" id="modalCheckSchool" ' + (entry.school ? 'checked' : '') + '> 🎒 Survécu à l\'école ce jour';
        html += '    </label>';
        html += '    <label class="dc-modal-check-row">';
        html += '      <input type="checkbox" id="modalCheckWorkout" ' + (entry.workout ? 'checked' : '') + '> 🏋️ / 🏃 Entraînement accompli';
        html += '    </label>';
        html += '  </div>';

        html += '  <div style="display:flex;justify-content:flex-end;gap:8px;">';
        html += '    <button class="btn" onclick="document.getElementById(\'dcDayDetailModal\').style.display=\'none\'">Annuler</button>';
        html += '    <button class="btn lime" onclick="window.__saveDayDetail(\'' + dateKey + '\')">Enregistrer ce jour</button>';
        html += '  </div>';
        html += '</div>';

        modal.innerHTML = html;
        modal.style.display = "flex";
    };

    window.__saveDayDetail = function(dateKey){
        var survival = loadSurvivalData();
        if(!survival[dateKey]) survival[dateKey] = { school: false, workout: false };

        var chkSchool = document.getElementById("modalCheckSchool");
        var chkWorkout = document.getElementById("modalCheckWorkout");

        if(chkSchool) survival[dateKey].school = chkSchool.checked;
        if(chkWorkout) survival[dateKey].workout = chkWorkout.checked;

        saveSurvivalData(survival);
        document.getElementById("dcDayDetailModal").style.display = "none";
        renderDailyCheck();
    };

    window.renderDailyCheck = renderDailyCheck;

    document.addEventListener("DOMContentLoaded", function(){
        renderDailyCheck();

        var sec = document.getElementById("dailycheck");
        if(sec){
            try {
                var obs = new MutationObserver(function(){
                    if(!sec.classList.contains("hidden")) renderDailyCheck();
                });
                obs.observe(sec, { attributes: true, attributeFilter: ["class"] });
            } catch(e){}
        }
    });

})();
