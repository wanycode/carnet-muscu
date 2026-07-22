// This replaces the original buildAiAdvice function
buildAiAdvice = function(prompt = ""){
    const recentSessions = data.sessions.slice(-10);
    const lastSession = recentSessions[recentSessions.length - 1];
    const previousSession = recentSessions[recentSessions.length - 2];

    if(!lastSession){
        return {
            title: "🎯 Coach IA prêt",
            text: "Ajoute 2 à 3 séances pour que l'assistant puisse analyser tes progrès et te proposer des conseils concrets.",
            bullets: [
                "📌 Objectif recommandé : 3 séances cette semaine",
                "💡 Focus : technique et récupération",
                "🚀 Prochaine action : enregistrer une séance"
            ]
        };
    }

    // Analyse détaillée par exercice
    const exerciseHistory = {};
    
    data.sessions.forEach(session => {
        session.exercises.forEach(ex => {
            if(!exerciseHistory[ex.name]) {
                exerciseHistory[ex.name] = [];
            }
            const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
            exerciseHistory[ex.name].push({
                date: new Date(session.date),
                weight: maxWeight,
                volume: ex.sets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)
            });
        });
    });

    // Détecter la stagnation par exercice
    const stagnantExercises = [];
    const progressingExercises = [];
    
    Object.keys(exerciseHistory).forEach(exName => {
        const history = exerciseHistory[exName].sort((a, b) => a.date - b.date);
        if(history.length >= 3) {
            const recent = history.slice(-3);
            const weights = recent.map(h => h.weight);
            const maxWeight = Math.max(...weights);
            const minWeight = Math.min(...weights);
            
            if(maxWeight - minWeight < 2.5) {
                stagnantExercises.push({ name: exName, currentWeight: maxWeight });
            } else {
                progressingExercises.push({ name: exName, currentWeight: maxWeight, gain: maxWeight - minWeight });
            }
        }
    });

    // Trouver le meilleur exercice à progresser
    let bestExerciseToProgress = null;
    if(progressingExercises.length > 0) {
        bestExerciseToProgress = progressingExercises[Math.floor(Math.random() * progressingExercises.length)];
    } else if(stagnantExercises.length > 0) {
        bestExerciseToProgress = stagnantExercises[Math.floor(Math.random() * stagnantExercises.length)];
    }

    // Analyse de la fréquence d'entraînement
    const last7Days = data.sessions.filter(s => {
        const sessionDate = new Date(s.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
    }).length;

    const last14Days = data.sessions.filter(s => {
        const sessionDate = new Date(s.date);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return sessionDate >= twoWeeksAgo;
    }).length;

    // Détection besoin de repos
    const needsRest = last7Days >= 5 || (last14Days >= 8 && last7Days >= 4);
    const isUndertraining = last7Days === 0 && last14Days < 3;

    // Génération de conseils variés
    const adviceTypes = [
        'progression',
        'stagnation', 
        'repos',
        'technique',
        'volume',
        'regularite'
    ];
    
    const selectedAdviceType = adviceTypes[Math.floor(Math.random() * adviceTypes.length)];
    
    let mainAdvice = "";
    let secondaryAdvice = "";
    let exerciseTip = "";

    if(selectedAdviceType === 'progression' && bestExerciseToProgress) {
        if(progressingExercises.length > 0) {
            mainAdvice = `💪 Continue sur ${bestExerciseToProgress.name} ! Tu progresses bien. Vise +2,5 kg ou +2 reps la prochaine fois.`;
        } else {
            mainAdvice = `🎯 Focus sur ${bestExerciseToProgress.name} : essaie une nouvelle technique (tempo, amplitude) pour débloquer la progression.`;
        }
    } else if(selectedAdviceType === 'stagnation' && stagnantExercises.length > 0) {
        const stagnant = stagnantExercises[Math.floor(Math.random() * stagnantExercises.length)];
        mainAdvice = `⚠️ Tu stagnes sur ${stagnant.name} (${stagnant.currentWeight} kg). Change l'approche : drop sets, supersets, ou +1 semaine de deload.`;
    } else if(selectedAdviceType === 'repos' && needsRest) {
        mainAdvice = `🛌 Tu t'entraînes beaucoup (${last7Days} séances/7j). Prends 1-2 jours de repos complet pour optimiser la récupération et la progression.`;
    } else if(selectedAdviceType === 'technique') {
        const nextWorkout = getNextWorkoutName(lastSession.name);
        if(nextWorkout.includes('PEC')) {
            exerciseTip = "💪 Pecs : focus sur la contraction au sommet, amplitude complète, pas d'élan.";
        } else if(nextWorkout.includes('LEG')) {
            exerciseTip = "🦵 Legday : échauffement hanches/chevilles, puis squat profond. Étirements post-séance.";
        } else if(nextWorkout.includes('DOS') || nextWorkout.includes('TRICEPS')) {
            exerciseTip = "🦾 Dos/Triceps : tire coudes serrés, extensions complètes, contrôle la descente.";
        } else {
            exerciseTip = "🛡️ Épaules/Abdos : contrôle le mouvement, pas d'élan. Rotation externe pour santé épaule.";
        }
        mainAdvice = exerciseTip;
    } else if(selectedAdviceType === 'volume') {
        const lastVolume = calculateVolume(lastSession);
        const avgVolume = recentSessions.reduce((sum, s) => sum + calculateVolume(s), 0) / recentSessions.length;
        mainAdvice = `📊 Volume dernière séance : ${formatNumber(lastVolume)} kg. Moyenne : ${formatNumber(avgVolume)} kg. ${lastVolume > avgVolume ? "Au-dessus de la moyenne, top !" : "Un peu sous la moyenne, c'est normal."}`;
    } else {
        mainAdvice = `🔥 Régularité : ${last7Days} séances cette semaine. ${last7Days >= 3 ? "Excellent rythme !" : "Essaie d'atteindre 3-4 séances."}`;
    }

    // Conseil secondaire intelligent
    if(needsRest && selectedAdviceType !== 'repos') {
        secondaryAdvice = "⚡ Attention : tu es proche de l'overtraining. Priorise le sommeil (7-9h) et l'hydratation.";
    } else if(isUndertraining && selectedAdviceType !== 'regularite') {
        secondaryAdvice = "📈 Tu es sous-entraîné. Augmente progressivement vers 3-4 séances par semaine.";
    } else if(stagnantExercises.length >= 2 && selectedAdviceType !== 'stagnation') {
        secondaryAdvice = `🔄 ${stagnantExercises.length} exercices en stagnation. Envisage une semaine de deload (charges réduites).`;
    } else if(bestExerciseToProgress && selectedAdviceType !== 'progression') {
        secondaryAdvice = `🎯 Cible prioritaire : ${bestExerciseToProgress.name} pour maximiser la progression.`;
    } else {
        secondaryAdvice = "💧 Hydratation + sommeil = progression. N'oublie pas les bases !";
    }

    // Conseil spécifique par exercice pour la prochaine séance
    const nextWorkout = getNextWorkoutName(lastSession.name);
    let specificExerciseAdvice = "";
    
    if(nextWorkout.includes('PEC')) {
        specificExerciseAdvice = "🎯 Prochaine séance Pecs : +2,5kg sur développé couché si la forme est là, sinon focus sur la contraction.";
    } else if(nextWorkout.includes('LEG')) {
        specificExerciseAdvice = "🎯 Prochaine séance Jambes : +1 répétition sur squat si technique OK, sinon maintiens les charges.";
    } else if(nextWorkout.includes('DOS')) {
        specificExerciseAdvice = "🎯 Prochaine séance Dos : +2,5kg sur tirage vertical si tu sens les dorsaux bien travailler.";
    } else if(nextWorkout.includes('ÉPAULE')) {
        specificExerciseAdvice = "🎯 Prochaine séance Épaules : amplitude parfaite sur élévations latérales, charge secondaire.";
    }

    const lastVolume = calculateVolume(lastSession);
    const previousVolume = previousSession ? calculateVolume(previousSession) : lastVolume;
    const delta = lastVolume - previousVolume;
    const trend = delta > 0 ? "📈 En progression" : delta < 0 ? "📉 Volume en baisse" : "➡️ Volume stable";
    const weekSessions = getWeekSessions().length;

    return {
        title: "🤖 Analyse IA locale",
        text: `${trend}. ${weekSessions} séance(s) cette semaine. ${stagnantExercises.length > 0 ? `${stagnantExercises.length} exercice(s) en stagnation.` : "Pas de stagnation détectée."}`,
        bullets: [
            mainAdvice,
            secondaryAdvice,
            specificExerciseAdvice,
            `📊 Force totale : ${Object.values(exerciseHistory).reduce((sum, hist) => {
                const max = Math.max(...hist.map(h => h.weight));
                return sum + max;
            }, 0)} kg en records personnels`
        ]
    };
};
