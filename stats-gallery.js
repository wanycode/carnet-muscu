// ===== STATISTIQUES AVANCEES =====
function renderAdvancedStats(){
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const dayMs = 24 * 60 * 60 * 1000;
    const start30 = new Date(now.getTime() - 30 * dayMs);
    const start60 = new Date(now.getTime() - 60 * dayMs);
    const recent = data.sessions.filter(s => new Date(s.date) >= start30);
    const previous = data.sessions.filter(s => {
        const date = new Date(s.date);
        return date >= start60 && date < start30;
    });
    const recentVolume = recent.reduce((sum, session) => sum + calculateVolume(session), 0);
    const previousVolume = previous.reduce((sum, session) => sum + calculateVolume(session), 0);
    const recentSets = recent.reduce((sum, session) => sum + (session.exercises || []).reduce((count, ex) => count + (ex.sets || []).length, 0), 0);
    const activeDays = new Set(recent.map(s => formatDateInputFromSession(s.date))).size;
    const averagePerSession = recent.length ? recentVolume / recent.length : 0;
    const sessionsPerWeek = recent.length / (30 / 7);
    const change = previousVolume ? ((recentVolume - previousVolume) / previousVolume) * 100 : null;

    const el = document.getElementById("monthVolume");
    if(el) el.textContent = formatNumber(recentVolume) + " kg";
    const frequencyEl = document.getElementById("weekProgress");
    if(frequencyEl) frequencyEl.textContent = sessionsPerWeek.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    const changeEl = document.getElementById("totalStrength");
    if(changeEl) changeEl.textContent = change === null ? "—" : `${change > 0 ? "+" : ""}${Math.round(change)}%`;

    // Nombre de semaines d'affilée avec au moins une séance, en partant de la semaine actuelle.
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    let streak = 0;
    for(let offset = 0; offset < 52; offset++) {
        const weekStart = new Date(monday.getTime() - offset * 7 * dayMs);
        const weekEnd = new Date(weekStart.getTime() + 7 * dayMs);
        if(data.sessions.some(s => {
            const date = new Date(s.date);
            return date >= weekStart && date < weekEnd;
        })) streak++;
        else break;
    }
    const streakEl = document.getElementById("bestDay");
    if(streakEl) streakEl.textContent = `${streak} sem.`;

    const breakdownEl = document.getElementById("weeklyBreakdown");
    if(breakdownEl) {
        breakdownEl.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;">
                <div><strong>${recent.length}</strong><br><span class="sub">séances</span></div>
                <div><strong>${recentSets}</strong><br><span class="sub">séries</span></div>
                <div><strong>${formatNumber(averagePerSession)} kg</strong><br><span class="sub">moyenne / séance</span></div>
                <div><strong>${activeDays}</strong><br><span class="sub">jours entraînés</span></div>
            </div>`;
    }

    const trend = document.getElementById("volumeTrend");
    if(trend) {
        const weeks = [];
        for(let index = 7; index >= 0; index--) {
            const start = new Date(monday.getTime() - index * 7 * dayMs);
            const end = new Date(start.getTime() + 7 * dayMs);
            weeks.push({
                label: index === 0 ? "Cette sem." : `S-${index}`,
                volume: data.sessions.filter(s => {
                    const date = new Date(s.date);
                    return date >= start && date < end;
                }).reduce((sum, s) => sum + calculateVolume(s), 0)
            });
        }
        const max = Math.max(...weeks.map(week => week.volume), 1);
        trend.innerHTML = weeks.map(week => `
            <div style="height:100%;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:6px;min-width:0;">
                <span style="font-size:10px;color:var(--muted);white-space:nowrap;">${week.volume ? formatNumber(week.volume) : "0"}</span>
                <div title="${week.label}: ${formatNumber(week.volume)} kg" style="height:${Math.max(week.volume ? 8 : 2, Math.round(week.volume / max * 145))}px;width:100%;max-width:42px;background:var(--lime);border-radius:6px 6px 0 0;"></div>
                <span style="font-size:10px;color:var(--muted);white-space:nowrap;">${week.label}</span>
            </div>`).join("");
    }

    const distribution = document.getElementById("workoutDistribution");
    if(distribution) {
        const byWorkout = {};
        recent.forEach(session => {
            const name = session.name || "Séance sans nom";
            if(!byWorkout[name]) byWorkout[name] = { sessions: 0, volume: 0 };
            byWorkout[name].sessions++;
            byWorkout[name].volume += calculateVolume(session);
        });
        const entries = Object.entries(byWorkout).sort((a, b) => b[1].sessions - a[1].sessions);
        distribution.innerHTML = entries.length ? entries.map(([name, values]) => `
            <div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line);">
                <span>${escapeHtml(name)}</span>
                <strong>${values.sessions} séance${values.sessions > 1 ? "s" : ""} · ${formatNumber(values.volume)} kg</strong>
            </div>`).join("") : '<p class="sub">Ajoute des séances pour voir la répartition.</p>';
    }

    const recordsEl = document.getElementById("estimatedRecords");
    if(recordsEl) {
        const records = new Map();
        data.sessions.forEach(session => (session.exercises || []).forEach(exercise => {
            // Le 1RM estimé ne concerne que les exercices à charge en kg.
            if(exercise.type && exercise.type !== "weight") return;
            const key = exercise.exerciseKey || normalizeExerciseName(exercise.name);
            (exercise.sets || []).forEach(set => {
                if(set.isDropSet) return;
                const weight = Number(set.weight) || 0;
                const reps = Number(set.reps) || 0;
                if(weight <= 0 || reps <= 0 || reps > 20) return;
                const estimated = weight * (1 + reps / 30);
                if(!records.has(key) || records.get(key).value < estimated) {
                    records.set(key, { name: exercise.name, value: estimated });
                }
            });
        }));
        const best = [...records.values()].sort((a, b) => b.value - a.value).slice(0, 5);
        recordsEl.innerHTML = best.length ? best.map((record, index) => `
            <div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line);">
                <span>${index + 1}. ${escapeHtml(record.name)}</span>
                <strong>${formatNumber(record.value)} kg</strong>
            </div>`).join("") : '<p class="sub">Ajoute des séries avec charge et répétitions pour estimer tes 1RM.</p>';
    }
}

// ===== GALERIE PHOTOS =====
function renderPhotos(){
    const photos = JSON.parse(localStorage.getItem("photos") || "[]");
    const gallery = document.getElementById("photoGallery");
    if(!gallery) return;
    gallery.innerHTML = photos.map((p,i)=>`
        <div class="card" style="text-align:center">
            <img src="${p.data}" style="width:100%;height:150px;object-fit:cover;border-radius:8px">
            <p style="font-size:12px;margin:8px 0 0;color:var(--muted)">${p.date}</p>
            <button class="btn" style="width:100%;margin-top:8px;background:#ad4238;color:white;font-size:11px" onclick="deletePhoto(${i})">Supprimer</button>
        </div>
    `).join("");
}

function deletePhoto(index){
    const photos = JSON.parse(localStorage.getItem("photos") || "[]");
    photos.splice(index, 1);
    localStorage.setItem("photos", JSON.stringify(photos));
    renderPhotos();
}

document.addEventListener("DOMContentLoaded", () => {
    const uploadBtn = document.getElementById("uploadPhoto");
    if(uploadBtn){
        uploadBtn.addEventListener("click", ()=>{
            const input = document.getElementById("photoInput");
            const date = document.getElementById("photoDate").value || "Nouvelle photo";
            
            if(!input || !input.files[0]) {
                alert("Sélectionne une photo");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const photos = JSON.parse(localStorage.getItem("photos") || "[]");
                photos.push({date, data: e.target.result});
                localStorage.setItem("photos", JSON.stringify(photos));
                input.value = "";
                document.getElementById("photoDate").value = "";
                renderPhotos();
            };
            reader.readAsDataURL(input.files[0]);
        });
    }
});
