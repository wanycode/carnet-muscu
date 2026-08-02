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
            const normalizedName = normalizeExerciseName(ex.name);
            if(!exerciseHistory[normalizedName]) {
                exerciseHistory[normalizedName] = {
                    originalName: ex.name,
                    history: []
                };
            }
            const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
            exerciseHistory[normalizedName].history.push({
                date: new Date(session.date),
                weight: maxWeight,
                volume: ex.sets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)
            });
        });
    });

    // Détecter la stagnation par exercice
    const stagnantExercises = [];
    const progressingExercises = [];
    
    Object.keys(exerciseHistory).forEach(normalizedName => {
        const exData = exerciseHistory[normalizedName];
        const history = exData.history.sort((a, b) => a.date - b.date);
        if(history.length >= 3) {
            const recent = history.slice(-3);
            const weights = recent.map(h => h.weight);
            const maxWeight = Math.max(...weights);
            const minWeight = Math.min(...weights);
            
            if(maxWeight - minWeight < 2.5) {
                stagnantExercises.push({ name: exData.originalName, currentWeight: maxWeight });
            } else {
                progressingExercises.push({ name: exData.originalName, currentWeight: maxWeight, gain: maxWeight - minWeight });
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

    // Détection besoin de repos (améliorée)
    const needsRest = last7Days >= 5 || (last14Days >= 8 && last7Days >= 4);
    const isUndertraining = last7Days === 0 && last14Days < 3;
    
    // Détection de deload intelligent
    const deloadRecommendation = detectDeloadNeed(recentSessions);
    
    // Prédiction de performance
    const performancePrediction = predictNextPerformance(exerciseHistory, lastSession);

    // Génération de conseils variés
    const adviceTypes = [
        'progression',
        'stagnation', 
        'repos',
        'technique',
        'volume',
        'regularite',
        'prediction',
        'deload'
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
    } else if(selectedAdviceType === 'deload' && deloadRecommendation.needed) {
        mainAdvice = `🔄 ${deloadRecommendation.reason}. Je recommande une semaine de deload : réduis toutes les charges de 40-50% et maintiens le volume.`;
    } else if(selectedAdviceType === 'prediction' && performancePrediction.prediction) {
        mainAdvice = `🔮 Prédiction IA : ${performancePrediction.prediction}. Basé sur ta progression récente et ta récupération.`;
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
    } else if(deloadRecommendation.needed && selectedAdviceType !== 'deload') {
        secondaryAdvice = `⚠️ ${deloadRecommendation.reason}. Considère un deload pour éviter le plateau.`;
    } else if(performancePrediction.prediction && selectedAdviceType !== 'prediction') {
        secondaryAdvice = `🔮 ${performancePrediction.prediction}`;
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

    // Construire la liste des exercices en stagnation
    let stagnantList = "";
    if(stagnantExercises.length > 0) {
        stagnantList = stagnantExercises.map(ex => `${ex.name} (${ex.currentWeight}kg)`).join(", ");
    }

    const nextWorkoutTips = getTipsForWorkout(nextWorkout);
    const savedTipsBullet = nextWorkoutTips.length
        ? `📝 Tes notes pour ${nextWorkout} : ${nextWorkoutTips.slice(0, 2).map(item => `${item.name} — ${item.tip}`).join(" · ")}`
        : "";

    // Intégrer l'analyse de forme et technique
    const formAnalysis = analyzeFormAndTechnique();
    const formBullet = formAnalysis.issues.length > 0
        ? `⚠️ ${formAnalysis.issues[0].message} — ${formAnalysis.issues[0].recommendation}`
        : "";

    return {
        title: "🤖 Analyse IA avancée",
        text: `${trend}. ${weekSessions} séance(s) cette semaine. ${stagnantExercises.length > 0 ? `Stagnation : ${stagnantList}` : "Pas de stagnation détectée."}`,
        bullets: [
            mainAdvice,
            secondaryAdvice,
            specificExerciseAdvice,
            savedTipsBullet,
            formBullet,
            `📊 Force totale : ${Object.values(exerciseHistory).reduce((sum, exData) => {
                const max = Math.max(...exData.history.map(h => h.weight));
                return sum + max;
            }, 0)} kg en records personnels`
        ].filter(b => b) // Filtrer les bullets vides
    };
};

// Fonction de détection de deload intelligent
function detectDeloadNeed(recentSessions) {
    if (recentSessions.length < 4) {
        return { needed: false, reason: "" };
    }

    const volumes = recentSessions.slice(-4).map(s => calculateVolume(s));
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const lastVolume = volumes[volumes.length - 1];
    
    // Si le volume a baissé de plus de 20% par rapport à la moyenne
    if (lastVolume < avgVolume * 0.8) {
        return { needed: true, reason: "Ton volume a significativement baissé ces dernières séances" };
    }

    // Si 3+ exercices en stagnation
    const exerciseHistory = {};
    data.sessions.forEach(session => {
        session.exercises.forEach(ex => {
            const key = normalizeExerciseName(ex.name);
            if (!exerciseHistory[key]) exerciseHistory[key] = [];
            const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
            exerciseHistory[key].push({ date: new Date(session.date), weight: maxWeight });
        });
    });

    let stagnantCount = 0;
    Object.values(exerciseHistory).forEach(history => {
        if (history.length >= 3) {
            const recent = history.slice(-3).sort((a, b) => a.date - b.date);
            const weights = recent.map(h => h.weight);
            if (Math.max(...weights) - Math.min(...weights) < 2.5) stagnantCount++;
        }
    });

    if (stagnantCount >= 3) {
        return { needed: true, reason: `${stagnantCount} exercices sont en stagnation` };
    }

    // Si fréquence d'entraînement très élevée sans progression
    const last7Days = data.sessions.filter(s => {
        const sessionDate = new Date(s.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
    }).length;

    if (last7Days >= 6) {
        return { needed: true, reason: "Tu t'entraînes très intensivement cette semaine" };
    }

    return { needed: false, reason: "" };
}

// Fonction de prédiction de performance
function predictNextPerformance(exerciseHistory, lastSession) {
    if (!lastSession || Object.keys(exerciseHistory).length === 0) {
        return { prediction: null };
    }

    // Trouver l'exercice principal de la prochaine séance
    const nextWorkout = getNextWorkoutName(lastSession.name);
    let targetExercise = null;
    
    Object.keys(exerciseHistory).forEach(key => {
        const exData = exerciseHistory[key];
        const normalizedName = normalizeExerciseName(exData.originalName);
        
        if (nextWorkout.includes('PEC') && (normalizedName.includes('pec') || normalizedName.includes('chest'))) {
            targetExercise = exData;
        } else if (nextWorkout.includes('LEG') && (normalizedName.includes('leg') || normalizedName.includes('squat'))) {
            targetExercise = exData;
        } else if (nextWorkout.includes('DOS') && (normalizedName.includes('dos') || normalizedName.includes('back'))) {
            targetExercise = exData;
        } else if (nextWorkout.includes('ÉPAULE') && normalizedName.includes('epaule')) {
            targetExercise = exData;
        }
    });

    if (!targetExercise || targetExercise.history.length < 2) {
        return { prediction: null };
    }

    const history = targetExercise.history.sort((a, b) => a.date - b.date);
    const recent = history.slice(-3);
    
    // Calculer la tendance de progression
    const weights = recent.map(h => h.weight);
    const avgRecent = weights.reduce((a, b) => a + b, 0) / weights.length;
    const maxWeight = Math.max(...weights);
    
    // Prédire la prochaine charge basée sur la tendance
    if (weights.length >= 2) {
        const trend = weights[weights.length - 1] - weights[weights.length - 2];
        const predictedWeight = Math.max(0, weights[weights.length - 1] + trend);
        
        if (trend > 0) {
            return { 
                prediction: `Tu devrais pouvoir atteindre ${formatNumber(predictedWeight)}kg sur ${targetExercise.originalName} aujourd'hui (+${formatNumber(trend)}kg de progression)` 
            };
        } else if (trend < -1) {
            return { 
                prediction: `Considère de réduire la charge sur ${targetExercise.originalName} aujourd'hui à ${formatNumber(predictedWeight)}kg pour récupérer` 
            };
        }
    }

    return { prediction: null };
};
