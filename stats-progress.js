// Fonctions pour les graphiques de progression par exercice
function initExerciseProgress() {
    const select = document.getElementById("exerciseProgressSelect");
    if(!select) return;
    
    // Récupérer tous les exercices uniques
    const exercises = new Map();
    data.sessions.forEach(session => {
        session.exercises.forEach(ex => {
            const key = ex.exerciseKey || normalizeExerciseName(ex.name);
            if(key && !exercises.has(key)) exercises.set(key, getExerciseDisplayName(ex.name));
        });
        if(session.extraExercises) {
            session.extraExercises.forEach(ex => {
                if(ex.mode === 'sets') {
                    const key = normalizeExerciseName(ex.name);
                    if(key && !exercises.has(key)) exercises.set(key, getExerciseDisplayName(ex.name));
                }
            });
        }
    });
    
    // Remplir le select
    const selectedKey = select.value;
    select.innerHTML = '<option value="">Choisir un exercice</option>';
    exercises.forEach((name, key) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = name;
        select.appendChild(option);
    });
    if(exercises.has(selectedKey)) select.value = selectedKey;
    
    // Écouteur de changement
    select.onchange = () => {
        if(select.value) {
            renderExerciseProgressChart(select.value);
        } else {
            const chart = document.getElementById("exerciseProgressChart");
            chart.innerHTML = '<div class="empty" style="width:100%;text-align:center;padding:40px;">Sélectionne un exercice pour voir ta progression</div>';
        }
    };
}

function renderExerciseProgressChart(exerciseKey) {
    const chartContainer = document.getElementById("exerciseProgressChart");
    if(!chartContainer) return;
    
    // Récupérer les données de progression
    const values = [];
    data.sessions.forEach(session => {
        session.exercises.forEach(ex => {
            if((ex.exerciseKey || normalizeExerciseName(ex.name)) === exerciseKey) {
                // Pour les exos en temps (gainage...), on suit la durée cumulée.
                if(ex.type === "time") {
                    let totalDuration = 0;
                    ex.sets.forEach(set => {
                        totalDuration += Number(set.weight) || 0;
                    });
                    if(totalDuration > 0) {
                        values.push({ date: new Date(session.date), value: totalDuration, unit: "s" });
                    }
                    return;
                }
                // Pour les exos en élastique, on suit la résistance max utilisée.
                if(ex.type === "elastic") {
                    let best = 0;
                    ex.sets.forEach(set => {
                        if(Number(set.weight) > best) {
                            best = Number(set.weight);
                        }
                    });
                    if(best > 0) {
                        values.push({ date: new Date(session.date), value: best, unit: "niv." });
                    }
                    return;
                }
                let best = 0;
                ex.sets.forEach(set => {
                    if(Number(set.weight) > best) {
                        best = Number(set.weight);
                    }
                });
                if(best > 0) {
                    values.push({ date: new Date(session.date), value: best, unit: "kg" });
                }
            }
        });

        if(session.extraExercises) {
            session.extraExercises.forEach(ex => {
                if(normalizeExerciseName(ex.name) === exerciseKey && ex.mode === 'sets') {
                    if(ex.weight > 0) {
                        values.push({
                            date: new Date(session.date),
                            value: ex.weight
                        });
                    }
                }
            });
        }
    });
    
    if(values.length === 0) {
        chartContainer.innerHTML = '<div class="empty" style="width:100%;text-align:center;padding:40px;">Pas encore de données pour cet exercice</div>';
        return;
    }
    
    // Trier par date
    values.sort((a, b) => a.date - b.date);
    
    // Créer le canvas
    chartContainer.innerHTML = '<canvas id="progressCanvas"></canvas>';
    const canvas = document.getElementById("progressCanvas");
    const ctx = canvas.getContext("2d");
    
    // Rendre le canvas responsive
    function resizeCanvas() {
        const containerWidth = chartContainer.clientWidth;
        const containerHeight = 250;
        canvas.width = containerWidth * 2; // Pour la haute résolution
        canvas.height = containerHeight * 2;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        ctx.scale(2, 2);
        drawChart(values, containerWidth, containerHeight);
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

function drawChart(values, width, height) {
    const canvas = document.getElementById("progressCanvas");
    const ctx = canvas.getContext("2d");
    
    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);
    
    // Marges
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Trouver les valeurs min/max
    const maxWeight = Math.max(...values.map(v => v.value));
    const minWeight = Math.min(...values.map(v => v.value)) * 0.9;
    const weightRange = Math.max(maxWeight - minWeight, 1);
    const unit = values.find(v => v.unit)?.unit || "kg";
    
    // Dessiner les axes
    ctx.strokeStyle = '#e0e5dd';
    ctx.lineWidth = 1;
    
    // Axe Y
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();
    
    // Axe X
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Dessiner les lignes de grille horizontales
    const gridLines = 5;
    ctx.fillStyle = '#6c756c';
    ctx.font = '10px Manrope';
    ctx.textAlign = 'right';
    
    for(let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight * i / gridLines);
        const weight = maxWeight - (weightRange * i / gridLines);
        
        ctx.strokeStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        ctx.fillText(Math.round(weight) + unit, padding.left - 10, y + 4);
    }
    
    // Dessiner la ligne de progression
    ctx.strokeStyle = '#d5ff3e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    values.forEach((point, index) => {
        const x = values.length === 1 ? padding.left + chartWidth / 2 : padding.left + (chartWidth * index / (values.length - 1));
        const y = padding.top + chartHeight - ((point.value - minWeight) / weightRange * chartHeight);
        
        if(index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Dessiner les points
    values.forEach((point, index) => {
        const x = values.length === 1 ? padding.left + chartWidth / 2 : padding.left + (chartWidth * index / (values.length - 1));
        const y = padding.top + chartHeight - ((point.value - minWeight) / weightRange * chartHeight);
        
        ctx.fillStyle = '#1c291e';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#d5ff3e';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Dessiner les dates sur l'axe X
    ctx.fillStyle = '#6c756c';
    ctx.textAlign = 'center';
    
    const dateInterval = Math.ceil(values.length / 6); // Afficher max 6 dates
    values.forEach((point, index) => {
        if(index % dateInterval === 0 || index === values.length - 1) {
            const x = values.length === 1 ? padding.left + chartWidth / 2 : padding.left + (chartWidth * index / (values.length - 1));
            const dateStr = point.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            ctx.fillText(dateStr, x, height - padding.bottom + 20);
        }
    });
}

// Initialisation au chargement
window.addEventListener("load", () => {
    initExerciseProgress();
});
