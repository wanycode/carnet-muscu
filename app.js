const STORAGE_KEY = "carnetMuscuData";


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

const monthNames = [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];

const calendarIcons = {
    "LEGDAY": "🦵",
    "PECS + BICEPS": "💪",
    "TRICEPS + DOS": "🦾",
    "ÉPAULES + ABDOS": "🛡️"
};

const calendarState = {
    date: new Date()
};


function loadData(){

    const saved = localStorage.getItem(STORAGE_KEY);


    if(saved){

        data = JSON.parse(saved);

    }

    else{

        saveData();

    }

}



function saveData(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

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
}



function calculateVolume(session){

    let total = 0;


    session.exercises.forEach(ex=>{


        ex.sets.forEach(set=>{


            const weight = Number(set.weight) || 0;

            const reps = Number(set.reps) || 0;


            total += weight * reps;


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


}



document.addEventListener(
"DOMContentLoaded",
()=>{


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
    return calendarIcons[session.name] || "🏋️";
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
            html += `
                <div class="card" style="margin-bottom:14px;">
                    <h3>${getDayEmojiForSession(session)} ${session.name}</h3>
                    <p style="margin:6px 0 10px;color:var(--muted);">Volume: ${formatNumber(calculateVolume(session))} kg</p>
                    <p style="margin:0 0 10px;font-size:13px;color:var(--muted);">${session.note || "Aucune note"}</p>
                    <div style="font-size:13px;line-height:1.5;">
                        ${session.exercises.map(ex => `
                            <strong>${ex.name}</strong><br>
                            ${ex.sets.map((set,i)=>`Série ${i+1}: ${set.weight}kg x ${set.reps}`).join("<br>")}<br><br>
                        `).join("")}
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
    const recentSessions = data.sessions.slice(-4);
    const lastSession = recentSessions[recentSessions.length - 1];
    const previousSession = recentSessions[recentSessions.length - 2];

    if(!lastSession){
        return {
            title: "Coach IA prêt",
            text: "Ajoute 2 à 3 séances pour que l’assistant puisse analyser tes progrès et te proposer des conseils concrets.",
            bullets: [
                "Objectif recommandé : 3 séances cette semaine",
                "Focus : technique et récupération",
                "Prochaine action : enregistrer une séance"
            ]
        };
    }

    const lastVolume = calculateVolume(lastSession);
    const previousVolume = previousSession ? calculateVolume(previousSession) : lastVolume;
    const delta = lastVolume - previousVolume;
    const trend = delta > 0 ? "Tu progresses" : delta < 0 ? "Le volume est un peu plus bas" : "Le volume est stable";
    const nextWorkout = getNextWorkoutName(lastSession.name);
    const avgVolume = recentSessions.reduce((sum, session) => sum + calculateVolume(session), 0) / recentSessions.length;

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
        title: "Analyse IA locale",
        text: `${trend}. Le dernier volume est d’environ ${formatNumber(lastVolume)} kg, contre ${formatNumber(previousVolume)} kg avant.`,
        bullets: [
            `Prochaine séance conseillée : ${nextWorkout}`,
            advice,
            `Niveau de charge : ${delta >= 0 ? "à maintenir ou légèrement augmenter" : "à ajuster avec plus de récupération"}`
        ]
    };
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
    const askButton = document.getElementById("askAi");
    const aiPrompt = document.getElementById("aiPrompt");
    const reply = document.getElementById("aiReply");

    if(!askButton || !aiPrompt || !reply) return;

    askButton.addEventListener("click", ()=>{
        const advice = buildAiAdvice(aiPrompt.value);
        reply.innerHTML = `
            <div>
                <strong>${escapeHtml(advice.title)}</strong>
                <p>${escapeHtml(advice.text)}</p>
                <ul>
                    ${advice.bullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join("")}
                </ul>
            </div>
        `;
    });

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

    renderAiAssistant();

}

function getNextWorkoutName(lastWorkoutName){

    if(!lastWorkoutName){
        return data.program[0]?.name || "-";
    }

    if(lastWorkoutName === "ÉPAULES + ABDOS"){
        return "LEGDAY";
    }

    if(lastWorkoutName === "LEGDAY"){
        return "PECS + BICEPS";
    }

    if(lastWorkoutName === "PECS + BICEPS"){
        return "TRICEPS + DOS";
    }

    if(lastWorkoutName === "TRICEPS + DOS"){
        return "ÉPAULES + ABDOS";
    }

    return data.program[0]?.name || "-";

    const currentIndex =
        data.program.findIndex(
            workout => workout.name === lastWorkoutName
        );

    if(currentIndex === -1){
        return data.program[0]?.name || "-";
    }

    const nextIndex =
        (currentIndex + 1) % data.program.length;

    return data.program[nextIndex].name;

}


function calculateRecords(){


    let count = 0;


    const best = {};



    data.sessions.forEach(session=>{


        session.exercises.forEach(ex=>{


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



    data.program.forEach(workout=>{


        const card =
        document.createElement("div");


        card.className =
            "card template";



        let exercises="";



        workout.exercises.forEach(ex=>{


            exercises += `

            <div class="exercise">

                <b>${ex.name}</b>

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



}







function fillSessionSelect(){


    const select =
        document.getElementById("sessionSelect");



    if(!select) return;



    select.innerHTML="";



    data.program.forEach(workout=>{


        const option =
        document.createElement("option");



        option.value =
            workout.id;


        option.textContent =
            workout.name;



        select.appendChild(option);



    });



    select.onchange = ()=>{


        renderExerciseLogger(
            Number(select.value)
        );


    };



    renderExerciseLogger(
        Number(select.value)
    );



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



    workout.exercises.forEach((exercise,index)=>{


        const block =
        document.createElement("div");


        block.className =
            "logged";



        let rows="";



        for(let i=0;i<exercise.sets;i++){


            rows += `

            <tr>

            <td>

            Série ${i+1}

            </td>


            <td>

            <input 
            class="set-weight"
            data-ex="${index}"
            type="number"
            value="${exercise.weight}">

            </td>


            <td>

            <input
            class="set-reps"
            data-ex="${index}"
            type="number"
            value="${exercise.reps==="échec" ? 0 : exercise.reps}">

            </td>


            </tr>


            `;


        }



        block.innerHTML = `

        <h3>${exercise.name}</h3>


        <table>

        <tr>

        <th>Série</th>

        <th>Charge</th>

        <th>Reps</th>

        </tr>


        ${rows}


        </table>

        `;



        container.appendChild(block);



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


        exercises: []

    };



    workout.exercises.forEach((exercise,index)=>{


        const weights =
        document.querySelectorAll(
            `.set-weight[data-ex="${index}"]`
        );


        const reps =
        document.querySelectorAll(
            `.set-reps[data-ex="${index}"]`
        );



        const sets=[];



        weights.forEach((input,i)=>{


            sets.push({

                weight:
                Number(input.value)||0,


                reps:
                Number(reps[i].value)||0


            });


        });



        session.exercises.push({

            name: exercise.name,

            sets: sets

        });



    });



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


});








function renderHistory(){


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



    [...data.sessions]
    .reverse()
    .forEach(session=>{



        const item =
        document.createElement("div");



        item.className =
            "card historyItem";



        item.innerHTML = `


        <time>

        ${new Date(session.date)
        .toLocaleDateString("fr-FR")}

        </time>


        <b>

        ${session.name}

        </b>



        <span>

        ${formatNumber(
            calculateVolume(session)
        )} kg

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




        item.querySelector(".delete")
        .addEventListener(
        "click",
        e=>{
            e.stopPropagation();
            deleteSession(session.id);


        });

        item.querySelector(".edit")
        .addEventListener(
        "click",
        e=>{
            e.stopPropagation();
            openSessionEditor(session);


        });



        item.addEventListener(
        "click",
        e=>{


            if(e.target.classList.contains("delete") || e.target.classList.contains("edit"))
            return;


            openSessionEditor(session);


        });



        container.appendChild(item);



    });



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
        exercise.sets.forEach((set, setIndex)=>{
            rows += `
                <tr>
                    <td>Série ${setIndex + 1}</td>
                    <td>
                        <input
                            class="edit-set-weight"
                            data-ex="${exerciseIndex}"
                            type="number"
                            step="0.5"
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
            <div class="logged">
                <h3>${escapeHtml(exercise.name)}</h3>
                <table>
                    <tr>
                        <th>Série</th>
                        <th>Charge</th>
                        <th>Reps</th>
                    </tr>
                    ${rows}
                </table>
            </div>
        `;
    });

    content.innerHTML = html;
    modal.showModal();
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
    });

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







document.getElementById("editProgram")
?.addEventListener(
"click",
()=>{


    const modal =
    document.getElementById("programModal");


    renderProgramEditor();


    modal.showModal();


});







function renderProgramEditor(){


    const container =
    document.getElementById("programEditor");



    if(!container) return;



    container.innerHTML="";



    data.program.forEach(workout=>{


        const block =
        document.createElement("div");


        block.className="card";



        let html = `

        <h3>

        ${workout.name}

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



        block.innerHTML=html;


        container.appendChild(block);



    });



    document.querySelectorAll(".remove")
    .forEach(button=>{


        button.onclick=()=>{


            const workout =
            data.program.find(
            w=>w.id===Number(button.dataset.workout)
            );



            workout.exercises.splice(
                Number(button.dataset.index),
                1
            );



            renderProgramEditor();


        };


    });



}








document.getElementById("saveProgram")
?.addEventListener(
"click",
(e)=>{


    e.preventDefault();



    document.querySelectorAll(".edit-name")
    .forEach(input=>{


        const workout =
        data.program.find(
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
        data.program.find(
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
        data.program.find(
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
        data.program.find(
        w=>w.id===Number(input.dataset.workout)
        );



        workout.exercises[
        Number(input.dataset.index)
        ].reps =
        Number(input.value);



    });



    saveData();


    renderProgram();


    fillSessionSelect();



    document
    .getElementById("programModal")
    .close();



});







window.addEventListener(
"load",
()=>{


    renderDashboard();


});