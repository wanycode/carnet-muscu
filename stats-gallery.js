// ===== STATISTIQUES AVANCEES =====
function renderAdvancedStats(){
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let monthVolume = 0;
    let dayCount = {};
    let allRecords = {};
    
    data.sessions.forEach(session => {
        const sessionDate = new Date(session.date);
        if(sessionDate >= monthStart){
            monthVolume += calculateVolume(session);
        }
        
        const dayName = sessionDate.toLocaleDateString("fr-FR",{weekday:"long"});
        dayCount[dayName] = (dayCount[dayName]||0) + 1;
        
        session.exercises.forEach(ex => {
            ex.sets.forEach(set => {
                const w = Number(set.weight)||0;
                if(!allRecords[ex.name] || w > allRecords[ex.name]){
                    allRecords[ex.name] = w;
                }
            });
        });
    });
    
    const el = document.getElementById("monthVolume");
    if(el) el.textContent = formatNumber(monthVolume) + " kg";
    
    const bestDay = Object.keys(dayCount).sort((a,b)=>dayCount[b]-dayCount[a])[0] || "-";
    const bestEl = document.getElementById("bestDay");
    if(bestEl) bestEl.textContent = bestDay.charAt(0).toUpperCase() + bestDay.slice(1);
    
    const totalStrength = Object.values(allRecords).reduce((a,b)=>a+b,0);
    const strengthEl = document.getElementById("totalStrength");
    if(strengthEl) strengthEl.textContent = formatNumber(totalStrength) + " kg";
    
    // Progression semaine
    const weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
    const twoWeeksAgo = new Date(now.getTime() - 14*24*60*60*1000);
    let thisWeekVol = 0, lastWeekVol = 0;
    data.sessions.forEach(s => {
        const d = new Date(s.date);
        if(d >= weekAgo) thisWeekVol += calculateVolume(s);
        else if(d >= twoWeeksAgo) lastWeekVol += calculateVolume(s);
    });
    const progress = lastWeekVol > 0 ? Math.round((thisWeekVol - lastWeekVol)/lastWeekVol*100) : 0;
    const progEl = document.getElementById("weekProgress");
    if(progEl) progEl.textContent = (progress>0?"+":"") + progress + "%";
    
    // Détail par semaine
    let weeks = {};
    data.sessions.forEach(s => {
        const d = new Date(s.date);
        const week = "Sem " + Math.ceil((d.getDate())/7);
        weeks[week] = (weeks[week]||0) + calculateVolume(s);
    });
    const breakdown = Object.entries(weeks).map(([w,v])=>`${w}: ${formatNumber(v)} kg`).join("<br>");
    const breakdownEl = document.getElementById("weeklyBreakdown");
    if(breakdownEl) breakdownEl.innerHTML = breakdown;
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
