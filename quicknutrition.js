/* ============================================================
   QUICK NUTRITION — recap calories/protéines/etc. à partir
   de texte libre (pas d'Ollama, full local, comme le coach IA
   du dashboard).
   ============================================================ */
(function(){
    "use strict";
    window.__nutriErr = null;
    try {

    // ============================================================
    // DB DES ALIMENTS — valeurs pour 100 g (sauf indication).
    // Chaque entrée : aliases[] pour matcher plusieurs façons
    // de taper le nom, category pour la variété, defaultG pour
    // une portion "standard" quand l'utilisateur ne précise rien.
    // ============================================================
    var ALL_FOODS = [
        // ============ PROTÉINES ANIMALES ============
        { name:"poulet", aliases:["poulet","blanc de poulet","escalope de poulet","filet de poulet","dinde","escalope"], category:"protein", kcal:165, p:31, g:0, l:3.6, defaultG:150 },
        { name:"dinde", aliases:["dinde","escalope de dinde"], category:"protein", kcal:135, p:29, g:0, l:1, defaultG:150 },
        { name:"boeuf", aliases:["boeuf","steak","viande hachee","hache de boeuf"], category:"protein_red", kcal:250, p:26, g:0, l:15, defaultG:150 },
        { name:"steak hache 5", aliases:["steak hache 5","hache 5","5 pour cent"], category:"protein_red", kcal:135, p:22, g:0, l:5, defaultG:150 },
        { name:"steak hache 15", aliases:["steak hache 15","hache 15","15 pour cent"], category:"protein_red", kcal:215, p:20, g:0, l:15, defaultG:150 },
        { name:"jambon", aliases:["jambon","jambon blanc"], category:"protein_cured", kcal:145, p:21, g:1, l:7, defaultG:60, unitG:30, hint:"1 tranche = 30 g · 2 tranches = 60 g" },
        { name:"jambon de dinde", aliases:["jambon de dinde"], category:"protein_cured", kcal:110, p:21, g:1, l:2, defaultG:60, hint:"1 tranche = 30 g" },
        { name:"saucisson", aliases:["saucisson","chorizo","rosette","jambon cru"], category:"protein_cured", kcal:350, p:25, g:1, l:28, defaultG:40, unitG:10, hint:"1 rondelle = 10 g · 2-3 rondelles = portion" },
        { name:"saucisse", aliases:["saucisse","knacki","merguez","chipolata"], category:"protein_cured", kcal:300, p:12, g:1, l:27, defaultG:80 },
        { name:"oeuf", aliases:["oeuf","oeufs"], category:"protein", kcal:155, p:13, g:1, l:11, defaultG:100, unitG:60, hint:"1 oeuf = 60 g · defaultG 100 = portion 2 oeufs" },
        { name:"blanc d oeuf", aliases:["blanc d oeuf","blanc d'oeuf","blanc"], category:"protein", kcal:52, p:11, g:0.7, l:0.2, defaultG:100 },
        { name:"thon", aliases:["thon","thon en conserve"], category:"protein", kcal:116, p:26, g:0, l:1, defaultG:120 },
        { name:"thon au naturel", aliases:["thon au naturel","thon nature"], category:"protein", kcal:100, p:23, g:0, l:1, defaultG:120 },
        { name:"saumon", aliases:["saumon","pave de saumon"], category:"protein_fatty", kcal:208, p:20, g:0, l:13, omega3:true, defaultG:150 },
        { name:"cabillaud", aliases:["cabillaud","morue","dos de cabillaud","colin"], category:"protein", kcal:82, p:18, g:0, l:0.7, defaultG:180 },
        { name:"crevettes", aliases:["crevettes","crevette","gambas"], category:"protein", kcal:99, p:24, g:0, l:0.3, defaultG:120 },
        { name:"tofu", aliases:["tofu"], category:"protein", kcal:144, p:17, g:3, l:9, defaultG:150 },
        { name:"tempeh", aliases:["tempeh"], category:"protein", kcal:193, p:19, g:9, l:11, defaultG:130 },

        // ============ PRODUITS LAITIERS ============
        { name:"skyr", aliases:["skyr"], category:"protein", kcal:65, p:11, g:4, l:0.5, defaultG:150, hint:"1 pot = 150 g" },
        { name:"yaourt grec", aliases:["yaourt grec","yogourt grec","grec"], category:"protein", kcal:97, p:9, g:3.5, l:5, defaultG:150, hint:"1 pot = 150 g" },
        { name:"yaourt nature", aliases:["yaourt nature","yaourt","yogourt","yaourt vanille","yaourt fraise"], category:"protein", kcal:65, p:4, g:6, l:2.5, defaultG:125, hint:"1 pot = 125 g" },
        { name:"fromage blanc 0", aliases:["fromage blanc 0","fromage blanc zero","faisselle 0"], category:"protein", kcal:45, p:8, g:4, l:0, defaultG:100 },
        { name:"fromage blanc", aliases:["fromage blanc","faisselle","petit suisse"], category:"protein", kcal:80, p:8, g:4, l:4, defaultG:100 },
        { name:"fromage", aliases:["fromage","emmental","comte","gruyere","cheddar","mozzarella"], category:"protein_cheese", kcal:350, p:25, g:1, l:27, defaultG:40 },
        { name:"parmesan", aliases:["parmesan","parmigiano"], category:"protein_cheese", kcal:430, p:38, g:4, l:29, defaultG:20, unitG:5, hint:"1 c.a.c = 5 g · copeaux = 20 g" },
        { name:"feta", aliases:["feta"], category:"protein_cheese", kcal:265, p:14, g:4, l:21, defaultG:60 },
        { name:"cottage cheese", aliases:["cottage cheese","cottage"], category:"protein", kcal:98, p:11, g:3.4, l:4.3, defaultG:100 },
        { name:"lait", aliases:["lait","lait entier"], category:"protein", kcal:65, p:3.2, g:4.8, l:3.5, defaultG:200, hint:"1 verre = 200 mL" },
        { name:"lait ecreme", aliases:["lait ecreme","lait zero","lait 0"], category:"protein", kcal:35, p:3.4, g:5, l:0.2, defaultG:200, hint:"1 verre = 200 mL" },
        { name:"lait d avoine", aliases:["lait d avoine","lait avoine"], category:"beverage_drink", kcal:48, p:1, g:7, l:1.5, defaultG:200, hint:"1 verre = 200 mL" },
        { name:"lait d amande", aliases:["lait d amande","lait amande"], category:"beverage_drink", kcal:24, p:0.5, g:0.6, l:2.5, defaultG:200, hint:"1 verre = 200 mL" },

        // ============ FÉCULENTS / GLUCIDES LENTS ============
        { name:"riz basmati", aliases:["riz basmati","riz","du riz"], category:"carb", kcal:130, p:2.7, g:28, l:0.3, defaultG:200, hint:"1 bol cuit = 200 g" },
        { name:"riz complet", aliases:["riz complet"], category:"carb_fiber", kcal:110, p:2.6, g:23, l:0.9, fiber:1.8, defaultG:200 },
        { name:"pates", aliases:["pates","spaghetti","penne","coquillettes","macaroni","linguine"], category:"carb", kcal:131, p:5, g:25, l:1.1, defaultG:200, hint:"1 assiette cuite = 200 g" },
        { name:"pates completes", aliases:["pates completes","semi completes"], category:"carb_fiber", kcal:124, p:5.5, g:23, l:1.5, fiber:3, defaultG:200 },
        { name:"pain", aliases:["pain","baguette","tranche de pain","tartine","demi baguette"], category:"carb", kcal:265, p:9, g:49, l:1.5, defaultG:50, hint:"1 tranche = 35-50 g" },
        { name:"pain complet", aliases:["pain complet","pain aux cereales"], category:"carb_fiber", kcal:235, p:9, g:41, l:2, fiber:6, defaultG:50 },
        { name:"patate douce", aliases:["patate douce","patates douces","douce"], category:"carb_fiber", kcal:86, p:1.6, g:20, l:0.1, fiber:3, defaultG:200 },
        { name:"pomme de terre", aliases:["pomme de terre","patate","pdt","pommes de terre"], category:"carb", kcal:77, p:2, g:17, l:0.1, defaultG:200 },
        { name:"quinoa", aliases:["quinoa"], category:"carb_fiber", kcal:120, p:4.4, g:21, l:1.9, fiber:2.8, defaultG:200 },
        { name:"semoule", aliases:["semoule","couscous"], category:"carb", kcal:112, p:3.8, g:23, l:0.2, defaultG:200 },
        { name:"lentilles", aliases:["lentilles","lentille"], category:"legume_fiber", kcal:116, p:9, g:20, l:0.4, fiber:8, defaultG:200 },
        { name:"pois chiches", aliases:["pois chiches","pois chiche"], category:"legume_fiber", kcal:164, p:8.9, g:27, l:2.6, fiber:7.6, defaultG:150 },
        { name:"haricots rouges", aliases:["haricots rouges","haricot rouge"], category:"legume_fiber", kcal:127, p:8.7, g:23, l:0.5, fiber:6.4, defaultG:150 },
        { name:"flocons d avoine", aliases:["flocons d avoine","avoine","muesli"], category:"carb_fiber", kcal:367, p:13, g:58, l:7, fiber:10, defaultG:60, hint:"1 bol = 60 g" },
        { name:"muesli", aliases:["muesli","granola"], category:"carb_fiber", kcal:420, p:11, g:60, l:13, fiber:7, defaultG:60 },

        // ============ LÉGUMES ============
        { name:"brocoli", aliases:["brocoli","brocolis"], category:"legume", kcal:34, p:2.8, g:7, l:0.4, defaultG:150 },
        { name:"epinards", aliases:["epinards","epinard"], category:"legume", kcal:23, p:3, g:3.6, l:0.4, defaultG:150 },
        { name:"salade", aliases:["salade","laitue","batavia","mache","roquette"], category:"legume", kcal:15, p:1.4, g:2.9, l:0.2, defaultG:80 },
        { name:"tomate", aliases:["tomate","tomates"], category:"legume", kcal:18, p:0.9, g:3.9, l:0.2, defaultG:120 },
        { name:"poivron", aliases:["poivron","poivrons"], category:"legume", kcal:30, p:1, g:6, l:0.3, defaultG:120 },
        { name:"courgette", aliases:["courgette","courgettes"], category:"legume", kcal:17, p:1.2, g:3.1, l:0.3, defaultG:150 },
        { name:"carotte", aliases:["carotte","carottes"], category:"legume", kcal:41, p:0.9, g:10, l:0.2, defaultG:120 },
        { name:"haricots verts", aliases:["haricots verts","haricot vert"], category:"legume", kcal:31, p:1.8, g:7, l:0.2, defaultG:150 },
        { name:"concombre", aliases:["concombre"], category:"legume", kcal:15, p:0.6, g:3.6, l:0.1, defaultG:150 },
        { name:"aubergine", aliases:["aubergine","aubergines"], category:"legume", kcal:25, p:1, g:6, l:0.2, defaultG:150 },
        { name:"champignon", aliases:["champignon","champignons","de paris"], category:"legume", kcal:22, p:3.1, g:3.3, l:0.3, defaultG:120 },
        { name:"poireau", aliases:["poireau","poireaux"], category:"legume", kcal:30, p:1.5, g:7, l:0.3, defaultG:120 },
        { name:"chou", aliases:["chou","chou blanc","chou rouge","chou vert","chou frise","kale"], category:"legume", kcal:30, p:2, g:5, l:0.3, defaultG:120 },

        // ============ FRUITS ============
        { name:"banane", aliases:["banane","bananes"], category:"fruit", kcal:89, p:1.1, g:23, l:0.3, defaultG:120, unitG:120, hint:"1 banane = 120 g · demi banane = 60 g" },
        { name:"pomme", aliases:["pomme","pommes"], category:"fruit", kcal:52, p:0.3, g:14, l:0.2, defaultG:150, unitG:150, hint:"1 pomme = 150 g" },
        { name:"orange", aliases:["orange","oranges"], category:"fruit", kcal:47, p:0.9, g:12, l:0.1, defaultG:130, unitG:130, hint:"1 orange = 130 g" },
        { name:"myrtilles", aliases:["myrtille","myrtilles","blueberry","blueberries"], category:"fruit", kcal:57, p:0.7, g:14, l:0.3, defaultG:100, hint:"portion standard = 100 g (bol). '1 myrtille' n'est pas ambigu → c'est le bol." },
        { name:"fraises", aliases:["fraise","fraises"], category:"fruit", kcal:32, p:0.7, g:7.7, l:0.3, defaultG:150, hint:"portion standard = 150 g (bol). '1 fraise' n'est pas ambigu → c'est le bol." },
        { name:"ananas", aliases:["ananas"], category:"fruit", kcal:50, p:0.5, g:13, l:0.1, defaultG:150 },
        { name:"mangue", aliases:["mangue"], category:"fruit", kcal:60, p:0.8, g:15, l:0.4, defaultG:150 },
        { name:"kiwi", aliases:["kiwi","kiwis"], category:"fruit", kcal:61, p:1.1, g:15, l:0.5, fiber:3, defaultG:80, unitG:80, hint:"1 kiwi = 80 g · barquette 2 = 160 g" },
        { name:"framboises", aliases:["framboise","framboises"], category:"fruit", kcal:52, p:1.2, g:12, l:0.7, defaultG:100, hint:"portion standard = 100 g (bol). '1 framboise' n'est pas ambigu → c'est le bol." },
        { name:"mures", aliases:["mure","mures","mûre","mûres","blackberry","mure de ronce","mûres de ronce"], category:"fruit", kcal:43, p:1.4, g:9.6, l:0.5, fiber:5, defaultG:100, hint:"portion standard = 100 g (bol). '1 mûre' n'est pas ambigu → c'est le bol." },
        { name:"cerises", aliases:["cerise","cerises","griottes","bigarreau"], category:"fruit", kcal:50, p:1, g:12, l:0.3, defaultG:120, hint:"portion standard = 120 g (bol). '1 cerise' n'est pas ambigu → c'est le bol." },
        { name:"cassis", aliases:["cassis","cassis"], category:"fruit", kcal:63, p:1.4, g:15, l:0.4, defaultG:80 },
        { name:"groseilles", aliases:["groseille","groseilles"], category:"fruit", kcal:56, p:1.4, g:13, l:0.2, defaultG:80 },
        { name:"dattes", aliases:["datte","dattes"], category:"fruit", kcal:277, p:1.8, g:75, l:0.2, defaultG:30, hint:"portion standard = 30 g. '1 datte' n'est pas ambigu → c'est la portion." },
        { name:"figues seches", aliases:["figue","figues","figues seches"], category:"fruit", kcal:249, p:3, g:58, l:1, defaultG:40, hint:"portion standard = 40 g. '1 figue' n'est pas ambigu → c'est la portion." },
        { name:"abricot frais", aliases:["abricot frais","abricots frais"], category:"fruit", kcal:48, p:1.4, g:11, l:0.4, fiber:2, defaultG:120 },
        { name:"abricots secs", aliases:["abricot sec","abricots secs","abricot seche","abricots seches"], category:"fruit", kcal:241, p:3.4, g:63, l:0.5, defaultG:30, hint:"portion standard = 30 g. '1 abricot sec' n'est pas ambigu → c'est la portion." },
        { name:"raisin", aliases:["raisin","raisins"], category:"fruit", kcal:69, p:0.7, g:18, l:0.2, defaultG:100, hint:"portion standard = 100 g (grappe). '1 raisin' n'est pas ambigu → c'est la portion." },
        { name:"poire", aliases:["poire","poires"], category:"fruit", kcal:57, p:0.4, g:15, l:0.1, defaultG:150, hint:"1 poire = 150 g" },
        { name:"pasteque", aliases:["pasteque","melon d eau"], category:"fruit", kcal:30, p:0.6, g:7.6, l:0.2, defaultG:200 },

        // ============ LIPIDES SAINS ============
        { name:"huile olive", aliases:["huile d olive","huile olive","huile d'olive"], category:"lipid_good", kcal:884, p:0, g:0, l:100, goodFat:true, defaultG:10, hint:"1 cs = 10 g" },
        { name:"olive", aliases:["olive","olives"], category:"lipid_good", kcal:115, p:0.8, g:6, l:11, goodFat:true, defaultG:30, unitG:4, hint:"1 olive = 4 g · poignee = 30 g" },
        { name:"avocat", aliases:["avocat","avocats"], category:"lipid_good", kcal:160, p:2, g:9, l:15, fiber:7, goodFat:true, defaultG:120, hint:"1/2 avocat = 80 g" },
        { name:"amandes", aliases:["amande","amandes"], category:"lipid_good", kcal:579, p:21, g:22, l:50, goodFat:true, defaultG:30, hint:"portion standard = 30 g (1 poignée). '1 amande' n'est pas ambigu → c'est 1 poignée." },
        { name:"noix", aliases:["noix","cerneaux","cerneau"], category:"lipid_good", kcal:654, p:15, g:14, l:65, goodFat:true, omega3:true, defaultG:30, hint:"portion standard = 30 g (1 poignée). '1 noix' n'est pas ambigu → c'est 1 poignée." },
        { name:"noisettes", aliases:["noisette","noisettes"], category:"lipid_good", kcal:628, p:15, g:17, l:61, goodFat:true, omega3:true, defaultG:30, hint:"portion standard = 30 g (1 poignée). '1 noisette' n'est pas ambigu → c'est 1 poignée." },
        { name:"beurre de cacahuete", aliases:["beurre de cacahuete","cacahuete","peanut butter","cacahuete"], category:"lipid_good", kcal:588, p:25, g:20, l:50, goodFat:true, defaultG:20, hint:"1 cs = 20 g" },
        { name:"graines de chia", aliases:["graines de chia","chia"], category:"lipid_good", kcal:486, p:17, g:42, l:31, fiber:34, goodFat:true, omega3:true, defaultG:15 },
        { name:"beurre", aliases:["beurre"], category:"lipid_neutral", kcal:717, p:0.9, g:0.1, l:81, defaultG:10, hint:"1 noisette = 10 g" },
        { name:"fromage rape", aliases:["fromage rape","rape"], category:"lipid_neutral", kcal:380, p:28, g:2, l:28, defaultG:20 },

        // ============ SUCRES / EXCES ============
        { name:"nutella", aliases:["nutella","pate a tartiner"], category:"lipid_sugar", kcal:539, p:5, g:58, l:31, defaultG:20, hint:"1 cs = 20 g" },
        { name:"confiture", aliases:["confiture"], category:"sugar", kcal:280, p:0.4, g:65, l:0, defaultG:20 },
        { name:"miel", aliases:["miel"], category:"sugar", kcal:304, p:0.3, g:82, l:0, defaultG:20, unitG:15, hint:"1 c.a.s = 15 g · 1 c.a.c = 5 g" },
        { name:"sucre", aliases:["sucre","sucre roux","cassonade"], category:"sugar", kcal:387, p:0, g:100, l:0, defaultG:5, unitG:5, hint:"1 c.a.c = 5 g · 1 morceau = 5 g" },
        { name:"chocolat", aliases:["chocolat","carre de chocolat","carre chocolat"], category:"sugar_fat", kcal:550, p:7, g:60, l:30, defaultG:20, unitG:8, hint:"1 carre = 8 g · 2-3 carres = portion snack" },
        { name:"biscuit", aliases:["biscuit","biscuits","cookie"], category:"sugar_fat", kcal:450, p:7, g:65, l:18, defaultG:20 },
        { name:"chips", aliases:["chips","chips de pomme de terre"], category:"junk", kcal:535, p:7, g:53, l:34, defaultG:30 },
        { name:"croissant", aliases:["croissant"], category:"junk", kcal:420, p:8, g:45, l:23, defaultG:60 },
        { name:"pain au chocolat", aliases:["pain au chocolat","chocolatine"], category:"junk", kcal:430, p:8, g:48, l:25, defaultG:60 },
        { name:"pizza", aliases:["pizza","part de pizza"], category:"junk", kcal:270, p:11, g:33, l:10, defaultG:150 },
        { name:"burger", aliases:["burger","hamburger","big mac","cheeseburger"], category:"junk", kcal:295, p:14, g:30, l:14, defaultG:230 },
        { name:"frite", aliases:["frite","frites"], category:"junk", kcal:312, p:3.4, g:41, l:15, defaultG:100 },
        { name:"kebab", aliases:["kebab"], category:"junk", kcal:250, p:14, g:25, l:10, defaultG:200 },
        { name:"sushi", aliases:["sushi","maki"], category:"protein", kcal:150, p:7, g:30, l:1.5, defaultG:120 },
        { name:"curry", aliases:["curry"], category:"junk", kcal:180, p:8, g:12, l:12, defaultG:200 },
        { name:"glace", aliases:["glace","creme glacee"], category:"sugar_fat", kcal:200, p:3, g:24, l:11, defaultG:80 },

        // ============ BOISSONS ============
        { name:"biere", aliases:["biere","demi","pression","pinte"], category:"alcohol", kcal:43, p:0.5, g:3.5, l:0, alcoholG:"4.5", defaultG:250, hint:"1 verre 25cL = 250 g" },
        { name:"vin", aliases:["vin","rouge","blanc","rose"], category:"alcohol", kcal:85, p:0.1, g:3, l:0, alcoholG:"11", defaultG:130, hint:"1 verre = 130 g" },
        { name:"whisky", aliases:["whisky","whiskey","rhum","vodka","gin"], category:"alcohol", kcal:250, p:0, g:0, l:0, alcoholG:"40", defaultG:40 },
        { name:"soda", aliases:["soda","coca","coca-cola","pepsi","fanta","sprite"], category:"sugar", kcal:42, p:0, g:11, l:0, defaultG:330, hint:"1 canette = 330 mL" },
        { name:"jus d orange", aliases:["jus d orange","jus d'orange","jus de fruit"], category:"sugar", kcal:45, p:0.7, g:10, l:0.2, defaultG:200, hint:"1 verre = 200 mL" },
        { name:"cafe", aliases:["cafe","expresso","espresso"], category:"beverage_drink", kcal:2, p:0.1, g:0, l:0, defaultG:50, hint:"1 tasse = 50 mL" },
        { name:"the", aliases:["the","the vert"], category:"beverage_drink", kcal:1, p:0, g:0.2, l:0, defaultG:200, hint:"1 tasse = 200 mL" },
        { name:"eau", aliases:["eau","verre d eau"], category:"beverage_drink", kcal:0, p:0, g:0, l:0, defaultG:200, hint:"1 verre = 200 mL" }
    ];

    // ============================================================
    // CATÉGORIES
    // ============================================================
    var PROTEIN_CATS = ["protein","protein_red","protein_cured","protein_fatty","protein_cheese"];
    var CARB_CATS = ["carb","carb_fiber"];
    var LEGUME_CATS = ["legume","legume_fiber"];
    var LIPID_GOOD_CATS = ["lipid_good"];
    var BAD_CATS = ["junk","sugar_fat","sugar","lipid_sugar","alcohol"];

    // ============================================================
    // HELPERS
    // ============================================================
    function normalize(s){
        return String(s||"").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/œ/g,"oe").replace(/æ/g,"ae");
    }
    function clamp(x, lo, hi){ x = Number(x); if(!isFinite(x)) return lo; if(x<lo) return lo; if(x>hi) return hi; return x; }
    function round1(x){ return Math.round(x*10)/10; }
    function escape(s){
        return String(s==null?"":s)
            .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    }
    function linearMap(x, a, b){ if(!(b > a)) return 0; return clamp((x-a)/(b-a), 0, 1); }

    // ============================================================
    // ÉVALUATION DE LA SÉANCE (pour le contexte nutrition)
    // ============================================================
    function detectContext(){
        var ctx = { trainedToday:false, trainedYesterday:false, muscleGroups:[], intensity:"medium", daysSinceLast:null };
        if(typeof data === "undefined" || !data || !Array.isArray(data.sessions)) return ctx;

        var today = new Date(); today.setHours(0,0,0,0);
        var lastSession = null, lastDate = null;

        for(var i = data.sessions.length - 1; i >= 0; i--){
            var s = data.sessions[i];
            if(!s || !s.date) continue;
            var sd = new Date(s.date); sd.setHours(0,0,0,0);
            if(!lastDate || sd.getTime() > lastDate.getTime()){
                lastDate = sd;
                lastSession = s;
            }
        }
        if(!lastDate) return ctx;

        var daysSince = Math.round((today.getTime() - lastDate.getTime()) / 86400000);
        ctx.daysSinceLast = daysSince;
        ctx.trainedToday = daysSince === 0;
        ctx.trainedYesterday = daysSince === 1;

        if(lastSession && typeof getWorkoutMuscleKey === "function"){
            var muscles = (getWorkoutMuscleKey(lastSession.name) || "").split("-").filter(Boolean);
            ctx.muscleGroups = muscles;
        }

        if(typeof calculateVolume === "function" && lastSession && data.sessions.length >= 3){
            var recent = data.sessions.slice(-6);
            var vols = recent.map(function(x){ return calculateVolume(x); }).filter(function(v){ return v > 0; });
            if(vols.length >= 2){
                var avg = vols.reduce(function(a,b){ return a+b; }, 0) / vols.length;
                var meV = calculateVolume(lastSession);
                if(meV > avg * 1.15) ctx.intensity = "high";
                else if(meV < avg * 0.85) ctx.intensity = "low";
                else ctx.intensity = "medium";
            }
        }
        return ctx;
    }

    // ============================================================
    // BESOINS CIBLES (estimés depuis le volume — pas de body-weight)
    // ============================================================
    function computeTargets(ctx){
        var pBase = 130, cBase = 320, lBase = 80;

        if(typeof data !== "undefined" && data && Array.isArray(data.sessions) && data.sessions.length >= 1 && typeof calculateVolume === "function"){
            var recent = data.sessions.slice(-6);
            var vols = recent.map(function(x){ return calculateVolume(x); }).filter(function(v){ return v > 0; });
            if(vols.length >= 1){
                var avg = vols.reduce(function(a,b){ return a+b; }, 0) / vols.length;
                pBase = Math.round(110 + (avg - 3000) * 0.012);
                if(pBase < 110) pBase = 110;
                if(pBase > 200) pBase = 200;
                cBase = Math.round(260 + (avg - 3000) * 0.022);
                if(cBase < 220) cBase = 220;
                if(cBase > 450) cBase = 450;
            }
        }
        if(ctx.trainedToday){ pBase += 20; cBase += 80; }
        else if(ctx.trainedYesterday){ pBase += 10; cBase += 40; }
        if(ctx.intensity === "high") pBase += 10;
        return { p:pBase, g:cBase, l:lBase, kcal: pBase*4 + cBase*4 + lBase*9, fiber:30, omega3g:1.5 };
    }

    // ============================================================
    // PARSER — quantité + DB
    // ============================================================
    function findFood(token){
        var t = normalize(token);
        if(!t || t.length < 2) return null;
        // On parcourt dans l'ordre : alias le plus long d'abord pour
        // éviter "riz complet" matché par "riz" tout court.
        var matches = [];
        for(var i = 0; i < ALL_FOODS.length; i++){
            var f = ALL_FOODS[i];
            for(var j = 0; j < f.aliases.length; j++){
                var a = normalize(f.aliases[j]);
                if(a.length < 2) continue;
                if(t.indexOf(a) !== -1){
                    matches.push({ f:f, len:a.length });
                }
            }
        }
        if(!matches.length) return null;
        matches.sort(function(x,y){ return y.len - x.len; });
        return matches[0].f;
    }

    function parseQuantity(token){
        var t = String(token||"").toLowerCase().trim();

        // ½ ¼ ¾ + multiplicateur
        if(/[½¼¾⅓⅔]/.test(t)){
            var fracMap = { "½":0.5, "¼":0.25, "¾":0.75, "⅓":0.33, "⅔":0.67 };
            var m = t.match(/½|¼|¾|⅓|⅔/);
            var pre = t.split(m[0])[0];
            var preN = parseFloat((pre.match(/[\d.]+/) || ["1"])[0]) || 1;
            return { g: null, frac: fracMap[m[0]] * preN, explicit:false, ratio: true };
        }

        // 200g / 200 g / 2.5kg
        var gm = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr)\b/);
        if(gm){
            var v = parseFloat(gm[1].replace(",", "."));
            return { g: gm[2] === "kg" ? v * 1000 : v, explicit: true };
        }

        // 2 tranches / 2 pots / 2 bols / 1 cs
        var unitMult = {
            "tranche":30,"tranches":30,"rondelle":15,"rondelles":15,
            "part":80,"parts":80,"pot":150,"pots":150,"bol":60,"bols":60,
            "tasse":200,"tasses":200,"verre":200,"verres":200,
            "demi":250,"demis":250,"pinte":500,"pintes":500,
            "canette":330,"canettes":330,
            "cs":10,"cuillere":10,"cuilleres":10,"cuillere a cafe":5,
            "noisette":10,"poignee":30,"poignees":30
        };
        var um = t.match(/(\d+(?:[.,]\d+)?)\s+([a-zà-ÿ ]+?)(?:\s|$)/);
        if(um){
            var n = parseFloat(um[1].replace(",", "."));
            var unit = normalize(um[2]).trim();
            var mult = unitMult[unit] || unitMult[unit.replace(/s$/,"")] || null;
            if(mult){ return { g: n * mult, unit: unit, explicit: true }; }
        }

        // "1 oeuf" → handled via defaultG × 1
        var numSimple = t.match(/^(\d+(?:[.,]\d+)?)\s+/);
        if(numSimple){
            return { g: null, count: parseFloat(numSimple[1].replace(",", ".")), explicit:false };
        }
        return { g: null, explicit:false };
    }

    function parseLine(line){
        var results = [];
        var segments = line.split(/[,;]|(?:\s+\+\s)|(?:\s+et\s+)/);
        segments.forEach(function(seg){
            var s = seg.trim();
            if(!s) return;
            var qty = parseQuantity(s);
            var food = findFood(s);
            if(!food){
                var words = s.split(/\s+/).slice(0,3).join(" ");
                food = findFood(words);
            }
            if(!food){
                var parts = s.split(/\s+/);
                for(var pi = Math.min(parts.length-1, 4); pi >= 0 && !food; pi--){
                    food = findFood(parts.slice(0, pi+1).join(" "));
                }
            }
            if(!food) return;
            var grams = qty.g;
            // PRIORITY: if user typed "1 X" or "2 X" (count-based) and the food has a
            // per-unit weight (unitG), use unitG * count. This fixes the generic
            // bug where "1 amande" inflated to 30g (defaultG) instead of ~1.5g.
            // v91: floor 1g (au lieu de 5g) pour des valeurs REALISTES meme sur petites unités.
            // "1 amande" = 1.5g (pas 5g), "1 datte" = 8g, "3 amandes" = 4.5g, etc.
            // Si l'utilisateur veut arrondir à la portion, il tape "30 g amandes" ou "1 poignee amandes".
            if(grams == null && qty.count != null && food.unitG != null){
                grams = Math.max(1, food.unitG * qty.count);
            } else if(grams == null && qty.frac != null){
                grams = food.defaultG * qty.frac;
            } else if(grams == null && qty.count != null){
                grams = (food.defaultG || 60) * qty.count;
            } else if(grams == null){
                grams = food.defaultG;
            }
            // v91: plus de clamp if(grams < 5) grams = 5 — laisser les petites valeurs realistes
            // (1.5g amandes, 0.6g raisin, etc.) mais cap à 1500g pour eviter les abus.
            if(grams > 1500) grams = 1500;
            results.push({ food: food, grams: grams, rawLine: s });
        });
        return results;
    }

    function parseInput(text){
        if(!text) return { lines: 0, items: [] };
        var rawLines = text.split(/\r?\n|(?:^|\s)[•\-\*]\s+/)
            .map(function(l){ return l.trim(); })
            .filter(function(l){ return l.length > 0; });
        var items = [];
        rawLines.forEach(function(l){
            parseLine(l).forEach(function(it){ items.push(it); });
        });
        var merged = [];
        items.forEach(function(it){
            var key = it.food.name;
            var existing = merged.find(function(m){ return m.food.name === key; });
            if(existing){
                existing.grams += it.grams;
                existing.rawLines.push(it.rawLine);
            } else {
                merged.push({ food: it.food, grams: it.grams, rawLines: [it.rawLine] });
            }
        });
        return { lines: rawLines.length, items: merged };
    }

    // ============================================================
    // SCORING (5 composantes pondérées → /10)
    // ============================================================
    function scoreMeal(parsed, targets, ctx){
        var tot = { kcal:0, p:0, g:0, l:0, fiber:0, omega3:0, alcoholG:0 };
        var nProteins = 0, nLegumes = 0, nLipids = 0, nCarb = 0, nFruit = 0;
        var hasLipidGood = 0, hasJunk = 0, foodCount = parsed.items.length;

        parsed.items.forEach(function(it){
            var f = it.food;
            var factor = it.grams / 100;
            tot.kcal += f.kcal * factor;
            tot.p += (f.p || 0) * factor;
            tot.g += (f.g || 0) * factor;
            tot.l += (f.l || 0) * factor;
            tot.fiber += (f.fiber || 0) * factor;
            if(f.omega3) tot.omega3 += (f.l || 0) * factor * 0.3;
            if(f.alcoholG) { var aG = parseFloat(f.alcoholG) || 0; tot.alcoholG += aG * (it.grams / (f.hint ? parseFloat((f.hint.match(/=\s*(\d+)/)||[0,250])[1]) : 250)); }

            if(PROTEIN_CATS.indexOf(f.category) !== -1) nProteins++;
            if(LEGUME_CATS.indexOf(f.category) !== -1) nLegumes++;
            if(LIPID_GOOD_CATS.indexOf(f.category) !== -1) nLipids++;
            if(CARB_CATS.indexOf(f.category) !== -1) nCarb++;
            if(f.category === "fruit") nFruit++;
            if(f.goodFat) hasLipidGood++;
            if(BAD_CATS.indexOf(f.category) !== -1) hasJunk++;
        });

        // ========== P (sur 3.0) ==========
        var pRatio = targets.p > 0 ? (tot.p / targets.p) : 1;
        var pScore;
        if(pRatio < 0.3) pScore = 0;
        else if(pRatio < 0.55) pScore = 1.0 * linearMap(pRatio, 0.3, 0.55);
        else if(pRatio < 0.85) pScore = 1.0 + 1.0 * linearMap(pRatio, 0.55, 0.85);
        else if(pRatio <= 1.25) pScore = 2.0 + 1.0 * linearMap(pRatio, 0.85, 1.25);
        else pScore = 3.0 - Math.min(1.0, (pRatio - 1.25) * 1.5);
        pScore = clamp(pScore, 0, 3);

        // ========== G (sur 2.0) ==========
        var gRatio = targets.g > 0 ? (tot.g / targets.g) : 1;
        var gScore;
        if(tot.g === 0){
            gScore = ctx.trainedToday ? 0.3 : 0.8;
        } else if(gRatio < 0.4) gScore = 0.4;
        else if(gRatio < 0.7) gScore = 0.4 + 0.8 * linearMap(gRatio, 0.4, 0.7);
        else if(gRatio < 1.0)  gScore = 1.2 + 0.6 * linearMap(gRatio, 0.7, 1.0);
        else if(gRatio <= 1.3) gScore = 1.8 + 0.2 * linearMap(gRatio, 1.0, 1.3);
        else gScore = 2.0 - Math.min(0.6, (gRatio - 1.3) * 0.8);
        if(tot.fiber >= targets.fiber * 0.8) gScore = Math.min(2.0, gScore + 0.1);
        gScore = clamp(gScore, 0, 2);

        // ========== L (sur 1.0) ==========
        var lRatio = targets.l > 0 ? (tot.l / targets.l) : 0.5;
        var lScore = 0.5;
        if(hasLipidGood >= 1) lScore += 0.3;
        if(tot.omega3 > 0) lScore += 0.15;
        if(hasJunk >= 2) lScore -= 0.4;
        if(lRatio > 1.6) lScore -= 0.2;
        if(tot.alcoholG > 10) lScore -= 0.2;
        lScore = clamp(lScore, 0, 1);

        // ========== Variété (sur 2.0) ==========
        var div = 0;
        if(nProteins >= 1) div++;
        if(nCarb >= 1) div++;
        if(nLegumes >= 1) div++;
        if(nFruit >= 1 || nLegumes >= 2) div += 0.5;
        if(hasLipidGood >= 1) div++;
        if(foodCount >= 5) div += 0.3;
        if(foodCount <= 1 && nProteins >= 1) div -= 0.4;
        var vScore = clamp(div, 0, 2);

        // ========== Timing (sur 2.0) ==========
        var tScore = 1.0;
        if(ctx.trainedToday){
            if(nProteins >= 1 && nCarb >= 1) tScore += 0.6;
            else if(nProteins >= 1) tScore += 0.3;
            if(hasJunk >= 2) tScore -= 0.4;
        } else if(ctx.trainedYesterday){
            if(nProteins >= 2) tScore += 0.4;
        } else if(ctx.daysSinceLast != null && ctx.daysSinceLast >= 3){
            if(hasLipidGood >= 1) tScore += 0.2;
        }
        if(tot.alcoholG > 20) tScore -= 0.3;
        tScore = clamp(tScore, 0, 2);

        var total = pScore + gScore + lScore + vScore + tScore;
        total = Math.round(total * 10) / 10;

        return {
            total: total,
            breakdown: {
                proteins: { score: round1(pScore), max: 3,
                    detail: Math.round(tot.p) + " g vs cible " + targets.p + " g (" + Math.round(pRatio*100) + "%)" },
                carbs: { score: round1(gScore), max: 2,
                    detail: Math.round(tot.g) + " g vs cible " + targets.g + " g (" + Math.round(gRatio*100) + "%)" },
                lipids: { score: round1(lScore), max: 1,
                    detail: (hasLipidGood ? "lipides sains (ω-3 / olive) vus" : "majoritairement saturés") +
                        " · lipides totaux " + Math.round(tot.l) + " g" },
                variety: { score: round1(vScore), max: 2,
                    detail: nProteins + " proteines · " + nLegumes + " legumes · " + nLipids + " lipides sains · " + foodCount + " aliments" },
                timing: { score: round1(tScore), max: 2, detail: timingDetail(ctx, nProteins, nCarb, hasJunk) }
            },
            macros: { kcal: Math.round(tot.kcal), p: round1(tot.p), g: round1(tot.g), l: round1(tot.l),
                fiber: round1(tot.fiber), omega3: round1(tot.omega3), alcoholG: round1(tot.alcoholG) },
            categories: { protein: nProteins, legume: nLegumes, lipid: nLipids, junk: hasJunk, fruit: nFruit, carb: nCarb },
            ctx: ctx
        };
    }

    function timingDetail(ctx, np, hc, hj){
        if(ctx.trainedToday) return "entrainement aujourd'hui · combo P+G " + (np&&hc?"detecte":"manquant") + " · junk " + (hj>=2?"presents":"OK");
        if(ctx.trainedYesterday) return "recup d'hier · P " + (np>=2?"renforce":"a renforcer");
        if(ctx.daysSinceLast != null && ctx.daysSinceLast >= 3) return "repos · lipides + legumes prioritaires";
        return "repos entre seances";
    }

    // ============================================================
    // CONSEILS
    // ============================================================
    function generateAdvice(score, ctx, targets){
        var tips = [];
        var b = score.breakdown;
        var macros = score.macros;
        var cats = score.categories;

        if(b.proteins.score < 2.0){
            var missing = Math.round(targets.p - macros.p);
            if(missing > 0){
                tips.push({ kind:"warn", label:"Proteines en dessous du besoin",
                    text:"Il te manque ~" + missing + " g. " + suggestProtein(ctx) });
            }
        } else if(b.proteins.score >= 2.5){
            tips.push({ kind:"good", label:"Proteines au rendez-vous",
                text:"Tu couvres " + Math.round(macros.p/targets.p*100) + "% du besoin. Recup + synthese OK 👍" });
        }
        if(ctx.trainedToday && b.carbs.score < 1.5){
            tips.push({ kind:"warn", label:"Recharge glucidique prioritaire",
                text:"Tu t'es entraine aujourd'hui : vise ~" + Math.round(targets.g) + " g de glucides (riz, pates, patate douce, fruits). Restauration du glycogen." });
        } else if(ctx.trainedYesterday && b.carbs.score < 1.5){
            tips.push({ kind:"info", label:"Glucides en recuperation",
                text:"Seance hier — encore en recuperation, ~" + Math.round(targets.g) + " g recommandes." });
        }
        if(cats.legume === 0){
            tips.push({ kind:"warn", label:"Pas de legumes",
                text:"Aucun legume. Vise 2-3 portions (brocoli, epinards, poivron, courgette). Fibres, potassium, magnesium." });
        }
        if(cats.legume >= 1 && macros.fiber < 15){
            tips.push({ kind:"info", label:"Fibres un peu justes",
                text:"Tes fibres sont a " + macros.fiber + " g. Un kiwi ou du riz complet aide a passer 25 g/j." });
        }
        if(cats.lipid === 0){
            tips.push({ kind:"info", label:"Lipides sains absents",
                text:"Aucune source d'omega-3 ou d'huile olive. Une poignee d'amandes ou un pavé de saumon couvre la journee." });
        }
        if(cats.junk >= 2){
            tips.push({ kind:"warn", label:"Trop de produits transformes",
                text: cats.junk + " items en categorie junk. Apport en gras satures et sucre sans micronutriments utiles." });
        }
        if(macros.alcoholG > 20){
            tips.push({ kind:"warn", label:"Alcool present",
                text:"~" + Math.round(macros.alcoholG) + " g d'alcool : la recuperation musculaire est freinee de 20-30% le lendemain." });
        }
        if(score.total >= 8.5){
            tips.push({ kind:"good", label:"Excellente journee",
                text:"Tout y est et bien dose. Si c'est reproductible, c'est le combo qui fait la progression long terme." });
        } else if(score.total < 4 && tips.length < 2){
            tips.push({ kind:"warn", label:"Journee faible",
                text:"Pense a '1 proteine + 1 feculent + 1 legume vert + 1 fruit'. Ca suffit a passer 6/10." });
        }
        return tips.slice(0, 6);
    }

    function suggestProtein(ctx){
        if(ctx.intensity === "high") return "150 g de poulet ou 4 oeufs + 1 pot de skyr.";
        if(ctx.trainedToday) return "150 g de poulet / tofu + 1 pot de skyr ou 2 tranches jambon.";
        return "100 g de poulet ou 200 g de skyr ou 200 g de lentilles.";
    }

    // ============================================================
    // RENDU HTML
    // ============================================================
    function colorByScore(s){
        if(s >= 8) return "#1c291e";
        if(s >= 6.5) return "#426e22";
        if(s >= 5) return "#9c9c8a";
        if(s >= 3) return "#ffab91";
        return "#ad4238";
    }
    function ringByScore(s){
        if(s >= 8) return "#d5ff3e";
        if(s >= 6.5) return "#2e7d32";
        if(s >= 5) return "#9c9c8a";
        if(s >= 3) return "#ffab91";
        return "#ad4238";
    }

    function patchLabels(score){
        var map = { proteins:"Proteines", carbs:"Glucides", lipids:"Lipides", variety:"Variete", timing:"Timing" };
        Object.keys(map).forEach(function(k){
            if(score.breakdown[k]) score.breakdown[k].title = map[k];
        });
        var icons = { proteins:"💪", carbs:"🌾", lipids:"🥑", variety:"🌈", timing:"⏱️" };
        Object.keys(icons).forEach(function(k){
            if(score.breakdown[k]) score.breakdown[k].icon = icons[k];
        });
        return score;
    }

    function renderResult(panel, parsed, score, targets, advice){
        var html = "";

        var ring = ringByScore(score.total);
        var ringDeg = Math.round((score.total / 10) * 360);
        html += '<div class="nutri-score-hero">';
        html += '  <div class="nutri-score-circle" style="background: conic-gradient(' + ring + ' ' + ringDeg + 'deg, #e0e5dd ' + ringDeg + 'deg);">';
        html += '    <div class="nutri-score-inner">';
        html += '      <div class="nutri-score-num" style="color:' + colorByScore(score.total) + '">' + score.total.toFixed(1) + '</div>';
        html += '      <div class="nutri-score-of">/10</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="nutri-score-side">';
        html += '    <div class="nutri-score-title">🥗 Recap nutrition</div>';
        html += '    <div class="nutri-score-stats">' + score.macros.kcal + ' kcal · ' + parsed.items.length + ' items</div>';
        html += '    <div class="nutri-score-context">' + escape(describeContext(score.ctx)) + '</div>';
        html += '  </div>';
        html += '</div>';

        html += '<div class="nutri-grid">';
        html += macroBox("Proteines", score.macros.p + " g", "cible " + targets.p + " g");
        html += macroBox("Glucides", score.macros.g + " g", "cible " + targets.g + " g");
        html += macroBox("Lipides", score.macros.l + " g", "cible " + targets.l + " g");
        html += macroBox("Fibres", score.macros.fiber + " g", "cible " + targets.fiber + " g");
        html += '</div>';

        html += '<div class="nutri-card">';
        html += '  <div class="nutri-card-title">🎯 Detail du score</div>';
        ["proteins","carbs","lipids","variety","timing"].forEach(function(k){
            var bc = score.breakdown[k];
            var pct = (bc.score / bc.max) * 100;
            var barColor = pct >= 80 ? "#d5ff3e" : (pct >= 50 ? "#9c9c8a" : "#ad4238");
            html += '  <div class="nutri-row">';
            html += '    <div class="nutri-row-head"><span>' + (bc.icon||"") + ' ' + escape(bc.title||k) + '</span><b>' + bc.score.toFixed(1) + '/' + bc.max + '</b></div>';
            html += '    <div class="nutri-bar"><div class="nutri-bar-fill" style="width:' + pct.toFixed(0) + '%;background:' + barColor + '"></div></div>';
            html += '    <div class="nutri-row-detail">' + escape(bc.detail) + '</div>';
            html += '  </div>';
        });
        html += '</div>';

        if(parsed.items.length){
            html += '<div class="nutri-card">';
            html += '  <div class="nutri-card-title">🍽️ Aliments identifies (' + parsed.items.length + ')</div>';
            parsed.items.forEach(function(it){
                var factor = it.grams / 100;
                var pkc = Math.round(it.food.kcal * factor);
                var prefix = (it.food.category === "junk" || it.food.category === "sugar_fat" || it.food.category === "sugar") ? "⚠️ " : (it.food.goodFat ? "✅ " : "▫️ ");
                html += '  <div class="nutri-item">';
                html += '    <span class="nutri-item-name">' + prefix + escape(it.food.name) + '</span>';
                html += '    <span class="nutri-item-portion">' + Math.round(it.grams) + ' g</span>';
                html += '    <span class="nutri-item-macro">' + pkc + ' kcal · P' + Math.round((it.food.p||0)*factor) + ' · G' + Math.round((it.food.g||0)*factor) + ' · L' + Math.round((it.food.l||0)*factor) + '</span>';
                html += '  </div>';
            });
            html += '</div>';
        }

        if(advice.length){
            html += '<div class="nutri-card">';
            html += '  <div class="nutri-card-title">💡 Conseils personnalises</div>';
            advice.forEach(function(a){
                html += '  <div class="nutri-tip nutri-tip-' + a.kind + '">';
                html += '    <div class="nutri-tip-label">' + escape(a.label) + '</div>';
                html += '    <div class="nutri-tip-text">' + escape(a.text) + '</div>';
                html += '  </div>';
            });
            html += '</div>';
        }

        // Disclaimer
        html += '<div class="nutri-disclaimer">Estimations à partir d\'une base de données locale de ~100 aliments courants. Pour une analyse fine, consulte un diététicien ou utilise un suivi médical. Le score est indicatif.</div>';

        panel.innerHTML = html;
    }

    function describeContext(ctx){
        if(ctx.trainedToday) return "🔥 Tu as entrainé aujourd'hui — focus P+G";
        if(ctx.trainedYesterday) return "🛌 Récup d'hier — protéines ++";
        if(ctx.daysSinceLast == null) return "🌱 Pas encore de séance enregistrée";
        if(ctx.daysSinceLast >= 3) return "🌿 " + ctx.daysSinceLast + " jours sans salle";
        return "Repos entre séances";
    }

    function macroBox(label, val, sub){
        return '<div class="nutri-macro"><div class="nutri-macro-label">' + escape(label) + '</div>' +
            '<div class="nutri-macro-val">' + escape(val) + '</div>' +
            '<div class="nutri-macro-sub">' + escape(sub) + '</div></div>';
    }

    // ============================================================
    // HOOK INIT
    // ============================================================
    function init(){
        var btn = document.getElementById("nutriAnalyzeBtn");
        var ta = document.getElementById("nutriInput");
        var out = document.getElementById("nutriResult");
        var sample = document.getElementById("nutriSample");
        var clearBtn = document.getElementById("nutriClearBtn");
        if(!btn || !ta || !out) return;

        if(sample){
            sample.addEventListener("click", function(){
                ta.value = "Ce matin : 2 tartines pain complet + beurre de cacahuète + 1 banane\n" +
                    "Midi : 150 g poulet grillé + riz basmati + brocoli + 1 cs huile olive\n" +
                    "16h : skyr 150 g + myrtilles + poignée d'amandes\n" +
                    "Soir : pâtes complètes 200 g + parmesan + 1 verre de vin rouge";
            });
        }
        if(clearBtn){
            clearBtn.addEventListener("click", function(){
                ta.value = "";
                out.innerHTML = "";
                ta.focus();
            });
        }
        btn.addEventListener("click", runAnalysis);
        ta.addEventListener("keydown", function(e){
            if((e.ctrlKey || e.metaKey) && e.key === "Enter"){ e.preventDefault(); runAnalysis(); }
        });
    }

    function runAnalysis(){
        var ta = document.getElementById("nutriInput");
        var out = document.getElementById("nutriResult");
        if(!ta || !out) return;
        var text = ta.value || "";

        if(text.trim().length < 8){
            out.innerHTML = '<div class="nutri-empty">Écris au moins quelques lignes — un repas par ligne, ex :<pre style="margin:8px 0;padding:10px;background:#f7f8f5;border-radius:6px;font:11px monospace;white-space:pre-wrap;">' +
                'matin : 2 tartines beurre cacahuète + oeuf\n' +
                'midi : poulet 150g + riz brocoli\n' +
                'soir : pates + fromage + 1 bière</pre>' +
                '<button class="btn lime" id="nutriSample2" style="margin-top:6px;">Charger un exemple</button>';
            var b = document.getElementById("nutriSample2");
            if(b) b.addEventListener("click", function(){ var s = document.getElementById("nutriSample"); if(s) s.click(); });
            return;
        }

        out.innerHTML = '<div class="nutri-loading">🥗 Analyse en cours…</div>';
        setTimeout(function(){
            var parsed = parseInput(text);
            var ctx = detectContext();
            var targets = computeTargets(ctx);
            var score = scoreMeal(parsed, targets, ctx);
            patchLabels(score);
            score.items = parsed.items.length;
            var advice = generateAdvice(score, ctx, targets);

            try{
                if(parsed.items.length > 0){
                    if(!data.nutritionLogs) data.nutritionLogs = [];
                    data.nutritionLogs.push({
                        date: new Date().toISOString(),
                        input: text.length > 600 ? text.slice(0,600) : text,
                        score: score.total,
                        macros: score.macros
                    });
                    if(data.nutritionLogs.length > 30) data.nutritionLogs.splice(0, data.nutritionLogs.length - 30);
                    if(typeof saveData === "function") saveData();
                }
            }catch(_){}

            renderResult(out, parsed, score, targets, advice);
        }, 120);
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // ============================================================
    // DEBUG
    // ============================================================
    window.__nutriDebug = function(){
        var ta = document.getElementById("nutriInput");
        if(!ta) return "(#nutriInput introuvable)";
        var parsed = parseInput(ta.value || "");
        var ctx = detectContext();
        var targets = computeTargets(ctx);
        var score = scoreMeal(parsed, targets, ctx);
        console.log("🥗 NUTRI", { items: parsed.items.length, ctx: ctx, score: score.total, breakdown: score.breakdown });
        return score;
    };

    } catch(e) {
        window.__nutriErr = (e && e.message ? e.message : String(e)) + " :: " + ((e && e.stack) ? e.stack.split("\n").slice(0,4).join(" | ") : "no-stack");
        try { console.error("🛑 NUTRI IIFE crashed:", e); } catch(_){}
    }
})();
