/* ============================================================
   QUICK NUTRITION — recap calories/protéines/etc. à partir
   de texte libre (pas d'Ollama, full local, comme le coach IA
   du dashboard).
   ============================================================ */
(function(){
    "use strict";
    window.__nutriErr = null;
    function localDateStr(d){ var y = d.getFullYear(); var m = String(d.getMonth()+1).padStart(2,'0'); var da = String(d.getDate()).padStart(2,'0'); return y + '-' + m + '-' + da; }
    if(typeof window.localDateStr !== "function"){ window.localDateStr = localDateStr; }
    // STORAGE_KEY vient de app.js (const lexical) ; en "use strict" + IIFE, on le résout une fois avec fallback dur
    // pour absorber tous les cas (ReferenceError, lexical scope, const non-attaché à window).
    var STORAGE_K = (function(){ try { return (typeof STORAGE_KEY !== "undefined" && STORAGE_KEY) ? STORAGE_KEY : "carnetMuscuData"; } catch(_e){ return "carnetMuscuData"; } })();
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
        { name:"biere", aliases:["biere","demi","pression","pinte"], category:"alcohol", kcal:43, p:0.5, g:3.5, l:0, alcoholG:3.5, defaultG:250, hint:"1 verre 25cL = 250 g" },
        { name:"vin", aliases:["vin","rouge","blanc","rose"], category:"alcohol", kcal:85, p:0.1, g:3, l:0, alcoholG:8.7, defaultG:130, hint:"1 verre = 130 g" },
        { name:"whisky", aliases:["whisky","whiskey","rhum","vodka","gin"], category:"alcohol", kcal:250, p:0, g:0, l:0, alcoholG:31.5, defaultG:40 },
        { name:"soda", aliases:["soda","coca","coca-cola","pepsi","fanta","sprite"], category:"sugar", kcal:42, p:0, g:11, l:0, defaultG:330, hint:"1 canette = 330 mL" },
        { name:"jus d orange", aliases:["jus d orange","jus d'orange","jus de fruit"], category:"sugar", kcal:45, p:0.7, g:10, l:0.2, defaultG:200, hint:"1 verre = 200 mL" },
        { name:"cafe", aliases:["cafe","expresso","espresso"], category:"beverage_drink", kcal:2, p:0.1, g:0, l:0, defaultG:50, hint:"1 tasse = 50 mL" },
        { name:"the", aliases:["the","the vert"], category:"beverage_drink", kcal:1, p:0, g:0.2, l:0, defaultG:200, hint:"1 tasse = 200 mL" },
        { name:"eau", aliases:["eau","verre d eau"], category:"beverage_drink", kcal:0, p:0, g:0, l:0, defaultG:200, hint:"1 verre = 200 mL" }
    ];

    // Base élargie : les valeurs sont des moyennes pour l'aliment *prêt à consommer*
    // (cuit/égoutté lorsque cela s'applique). Les alias couvrent le vocabulaire utilisé
    // dans un journal alimentaire français, pas seulement les noms "catalogue".
    // Une entrée précise l'emporte toujours sur une entrée générique grâce au matcher.
    ALL_FOODS.push.apply(ALL_FOODS, [
        {name:"porc maigre",aliases:["filet mignon","cote de porc","porc","longe de porc"],category:"protein",kcal:143,p:26,g:0,l:4,defaultG:150},
        {name:"veau",aliases:["veau","escalope de veau"],category:"protein",kcal:172,p:27,g:0,l:7,defaultG:150},
        {name:"agneau",aliases:["agneau","cotelette agneau"],category:"protein_red",kcal:250,p:25,g:0,l:16,defaultG:150},
        {name:"canard",aliases:["canard","magret"],category:"protein_fatty",kcal:201,p:19,g:0,l:14,defaultG:150},
        {name:"saumon fumé",aliases:["saumon fume"],category:"protein_fatty",kcal:180,p:22,g:0,l:10,omega3:true,defaultG:80},
        {name:"sardines",aliases:["sardines","sardine","maquereau","maquereaux"],category:"protein_fatty",kcal:208,p:25,g:0,l:11,omega3:true,defaultG:120},
        {name:"truite",aliases:["truite"],category:"protein_fatty",kcal:148,p:21,g:0,l:6.5,omega3:true,defaultG:150},
        {name:"crevettes",aliases:["crevette","crevettes","gambas"],category:"protein",kcal:99,p:24,g:0,l:.3,defaultG:120},
        {name:"surimi",aliases:["surimi"],category:"protein",kcal:95,p:8,g:15,l:.5,defaultG:100},
        {name:"seitan",aliases:["seitan"],category:"protein",kcal:141,p:25,g:12,l:2,defaultG:150},
        {name:"protéines en poudre",aliases:["whey","proteine en poudre","proteines en poudre","isolat","isolate","shake proteine","shaker proteine"],category:"protein",kcal:390,p:78,g:8,l:6,defaultG:30,unitG:30},
        {name:"yaourt protéiné",aliases:["yaourt proteine","yaourt proteine","yaourt hyperproteine","pudding proteine"],category:"protein",kcal:75,p:10,g:5,l:1,defaultG:150},
        {name:"kefir",aliases:["kefir","kéfir"],category:"protein",kcal:60,p:3.5,g:5,l:3,defaultG:200},
        {name:"ricotta",aliases:["ricotta"],category:"protein_cheese",kcal:174,p:11,g:3,l:13,defaultG:60},
        {name:"camembert",aliases:["camembert","brie","reblochon"],category:"protein_cheese",kcal:300,p:20,g:.5,l:24,defaultG:40},
        {name:"riz",aliases:["riz blanc","riz thai","riz jasmin","riz cantonais"],category:"carb",kcal:130,p:2.7,g:28,l:.3,defaultG:200},
        {name:"boulgour",aliases:["boulgour","bulgur","ble"],category:"carb_fiber",kcal:83,p:3.1,g:18.6,l:.2,fiber:4.5,defaultG:200},
        {name:"polenta",aliases:["polenta"],category:"carb",kcal:85,p:1.8,g:18,l:.4,defaultG:200},
        {name:"gnocchis",aliases:["gnocchi","gnocchis"],category:"carb",kcal:150,p:3.5,g:30,l:1,defaultG:200},
        {name:"nouilles",aliases:["nouilles","ramen","udon","nouilles chinoises"],category:"carb",kcal:140,p:4,g:28,l:1.5,defaultG:200},
        {name:"wrap",aliases:["wrap","tortilla","galette ble"],category:"carb",kcal:310,p:8,g:52,l:7,defaultG:60,unitG:60},
        {name:"pain de mie",aliases:["pain de mie","toast"],category:"carb",kcal:265,p:8,g:49,l:3,defaultG:30,unitG:30},
        {name:"bagel",aliases:["bagel"],category:"carb",kcal:270,p:10,g:53,l:1.5,defaultG:95,unitG:95},
        {name:"céréales petit-déjeuner",aliases:["cereales","corn flakes","special k","miel pops"],category:"carb",kcal:380,p:7,g:80,l:3,defaultG:40},
        {name:"purée de pommes de terre",aliases:["puree","ecrasee de pommes de terre"],category:"carb",kcal:100,p:2,g:17,l:3,defaultG:200},
        {name:"ratatouille",aliases:["ratatouille"],category:"legume",kcal:65,p:1.5,g:5,l:4,fiber:2,defaultG:200},
        {name:"soupe de légumes",aliases:["soupe","veloute","potage"],category:"legume",kcal:40,p:1.5,g:6,l:1,fiber:1.5,defaultG:300},
        {name:"petits pois",aliases:["petits pois","petit pois"],category:"legume_fiber",kcal:81,p:5,g:14,l:.4,fiber:5,defaultG:150},
        {name:"edamame",aliases:["edamame","edamames","feves de soja"],category:"legume_fiber",kcal:122,p:12,g:9,l:5,fiber:5,defaultG:100},
        {name:"maïs",aliases:["mais","maïs"],category:"legume",kcal:96,p:3.4,g:21,l:1.5,fiber:2.4,defaultG:100},
        {name:"asperges",aliases:["asperge","asperges"],category:"legume",kcal:20,p:2.2,g:3.9,l:.1,fiber:2.1,defaultG:150},
        {name:"chou-fleur",aliases:["chou fleur","chou-fleur"],category:"legume",kcal:25,p:1.9,g:5,l:.3,fiber:2,defaultG:150},
        {name:"endives",aliases:["endive","endives"],category:"legume",kcal:17,p:1.3,g:3.4,l:.2,fiber:3.1,defaultG:150},
        {name:"betterave",aliases:["betterave","betteraves"],category:"legume",kcal:43,p:1.6,g:10,l:.2,fiber:2.8,defaultG:120},
        {name:"oignon",aliases:["oignon","oignons"],category:"legume",kcal:40,p:1.1,g:9,l:.1,fiber:1.7,defaultG:80},
        {name:"ail",aliases:["ail"],category:"legume",kcal:149,p:6.4,g:33,l:.5,fiber:2.1,defaultG:8},
        {name:"pomme",aliases:["pomme","pommes"],category:"fruit",kcal:52,p:.3,g:14,l:.2,fiber:2.4,defaultG:150,unitG:150},
        {name:"clémentine",aliases:["clementine","clementines","mandarine"],category:"fruit",kcal:47,p:.9,g:12,l:.2,fiber:1.7,defaultG:75,unitG:75},
        {name:"pêche",aliases:["peche","peches","nectarine"],category:"fruit",kcal:39,p:.9,g:10,l:.3,fiber:1.5,defaultG:150,unitG:150},
        {name:"melon",aliases:["melon"],category:"fruit",kcal:34,p:.8,g:8,l:.2,fiber:.9,defaultG:200},
        {name:"citron",aliases:["citron","citrons"],category:"fruit",kcal:29,p:1.1,g:9,l:.3,fiber:2.8,defaultG:50},
        {name:"pruneaux",aliases:["pruneau","pruneaux"],category:"fruit",kcal:240,p:2.2,g:64,l:.4,fiber:7,defaultG:30,unitG:10},
        {name:"raisins secs",aliases:["raisins secs","raisin sec"],category:"fruit",kcal:299,p:3.1,g:79,l:.5,fiber:3.7,defaultG:30},
        {name:"beurre de cacahuète",aliases:["beurre de cacahuete","beurre cacahuete","purée de cacahuète","puree de cacahuete","peanut butter"],category:"lipid_good",kcal:588,p:25,g:20,l:50,fiber:6,goodFat:true,defaultG:20},
        {name:"pistaches",aliases:["pistache","pistaches"],category:"lipid_good",kcal:562,p:20,g:28,l:45,fiber:10,goodFat:true,defaultG:30},
        {name:"noix de cajou",aliases:["noix de cajou","cajou"],category:"lipid_good",kcal:553,p:18,g:30,l:44,fiber:3.3,goodFat:true,defaultG:30},
        {name:"graines",aliases:["graines de lin","lin","graines de courge","graines de tournesol"],category:"lipid_good",kcal:550,p:25,g:15,l:45,fiber:12,goodFat:true,defaultG:15},
        {name:"houmous",aliases:["houmous","hummus"],category:"lipid_good",kcal:240,p:8,g:18,l:15,fiber:5,goodFat:true,defaultG:60},
        {name:"mayonnaise",aliases:["mayonnaise","mayo"],category:"lipid_neutral",kcal:680,p:1,g:1,l:75,defaultG:15},
        {name:"sauce tomate",aliases:["sauce tomate","coulis de tomate"],category:"legume",kcal:35,p:1.5,g:5,l:1,fiber:1.5,defaultG:100},
        {name:"pesto",aliases:["pesto"],category:"lipid_good",kcal:450,p:5,g:8,l:43,goodFat:true,defaultG:25},
        {name:"crème fraîche",aliases:["creme fraiche","crème fraîche","creme"],category:"lipid_neutral",kcal:300,p:2,g:3,l:30,defaultG:30},
        {name:"compote",aliases:["compote","compote sans sucre"],category:"fruit",kcal:68,p:.2,g:16,l:.1,fiber:1.5,defaultG:100},
        {name:"barre protéinée",aliases:["barre proteinee","barre protéinée","protein bar"],category:"protein",kcal:370,p:30,g:35,l:12,defaultG:55,unitG:55},
        {name:"sandwich",aliases:["sandwich","panini","croque monsieur"],category:"junk",kcal:250,p:12,g:28,l:10,defaultG:220},
        {name:"tacos",aliases:["tacos","burrito"],category:"junk",kcal:230,p:11,g:22,l:11,defaultG:300},
        {name:"poke bowl",aliases:["poke bowl","poke"],category:"protein",kcal:145,p:8,g:18,l:4,defaultG:400},
        {name:"sushi",aliases:["sushi","sushis","maki","makis","california roll"],category:"protein",kcal:150,p:7,g:30,l:1.5,defaultG:180},
        {name:"omelette",aliases:["omelette"],category:"protein",kcal:154,p:11,g:2,l:11,defaultG:120},
        {name:"café au lait",aliases:["cafe au lait","café au lait","latte","cappuccino"],category:"beverage_drink",kcal:45,p:2.5,g:4,l:2,defaultG:250},
        {name:"boisson énergisante",aliases:["energy drink","red bull","monster"],category:"sugar",kcal:45,p:0,g:11,l:0,defaultG:250}
    ]);

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
    function readNutriStore(){ try { return JSON.parse(localStorage.getItem(STORAGE_K) || "{}"); } catch(_){ return {}; } }
    function writeNutriStore(store){ localStorage.setItem(STORAGE_K, JSON.stringify(store)); }
    function getNutriProfile(){ return readNutriStore().nutriProfile || null; }
    function getCustomFoods(){
        var foods = readNutriStore().nutriCustomFoods;
        return Array.isArray(foods) ? foods.filter(function(f){ return f && f.name && isFinite(f.kcal); }) : [];
    }
    function foodDatabase(){ return ALL_FOODS.concat(getCustomFoods()); }

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
        var profile = getNutriProfile();
        if(profile && Number(profile.weight) >= 35){
            var weight = clamp(Number(profile.weight), 35, 250);
            var goal = profile.goal || "maintain", activity = profile.activity || "medium";
            var activityKcal = {low:28, medium:33, high:38}[activity] || 33;
            var kcal = Math.round(weight * activityKcal + (goal === "gain" ? 250 : goal === "cut" ? -350 : 0));
            var protein = Math.round(weight * (goal === "cut" ? 2 : 1.8));
            var fat = Math.round(weight * .8);
            var carbs = Math.max(120, Math.round((kcal - protein * 4 - fat * 9) / 4));
            if(ctx.trainedToday) carbs += 35;
            else if(ctx.trainedYesterday) carbs += 15;
            if(ctx.intensity === "high") carbs += 25;
            return {p:protein, g:carbs, l:fat, kcal:protein*4+carbs*4+fat*9, fiber:30, omega3g:1.5, personalized:true, goal:goal};
        }
        // Sans poids, taille et objectif utilisateur, une "cible exacte" serait
        // trompeuse. Ces repères sont donc volontairement modérés et ne servent
        // qu'à contextualiser le score, jamais à poser un diagnostic.
        var pBase = 120, cBase = 260, lBase = 70;

        if(typeof data !== "undefined" && data && Array.isArray(data.sessions) && data.sessions.length >= 1 && typeof calculateVolume === "function"){
            var recent = data.sessions.slice(-6);
            var vols = recent.map(function(x){ return calculateVolume(x); }).filter(function(v){ return v > 0; });
            if(vols.length >= 1){
                var avg = vols.reduce(function(a,b){ return a+b; }, 0) / vols.length;
                pBase = clamp(Math.round(120 + (avg - 4500) * 0.006), 110, 155);
                cBase = clamp(Math.round(260 + (avg - 4500) * 0.012), 220, 360);
            }
        }
        if(ctx.trainedToday){ pBase += 15; cBase += 55; }
        else if(ctx.trainedYesterday){ pBase += 10; cBase += 30; }
        if(ctx.intensity === "high") { pBase += 5; cBase += 25; }
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
        var db = foodDatabase();
        for(var i = 0; i < db.length; i++){
            var f = db[i];
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

    function escapeRegExp(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

    // Retourne tous les aliments d'un texte, pas seulement le premier. Cela permet
    // d'analyser des saisies naturelles comme « poulet riz brocoli » sans imposer
    // des virgules ou des signes + entre chaque ingrédient.
    function findFoodsInText(token){
        var t = normalize(token).replace(/[’']/g, " ").replace(/[-/]/g, " ");
        var candidates = [];
        foodDatabase().forEach(function(food){
            (food.aliases || []).forEach(function(alias){
                var a = normalize(alias).replace(/[’']/g, " ").replace(/[-/]/g, " ").trim();
                if(a.length < 2) return;
                var re = new RegExp("(^|[^a-z0-9])(" + escapeRegExp(a) + ")(?=$|[^a-z0-9])", "g");
                var m;
                while((m = re.exec(t))){
                    candidates.push({ food:food, start:m.index + m[1].length, end:m.index + m[1].length + a.length, len:a.length });
                }
            });
        });
        candidates.sort(function(a,b){ return b.len - a.len || a.start - b.start; });
        var selected = [];
        candidates.forEach(function(candidate){
            var overlap = selected.some(function(x){ return candidate.start < x.end && candidate.end > x.start; });
            if(!overlap) selected.push(candidate);
        });
        return selected.sort(function(a,b){ return a.start - b.start; });
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

        // 200g / 200 g / 2.5kg / 250 ml. Pour les liquides courants,
        // 1 ml ≈ 1 g : assez précis pour les macros de lait, jus ou boissons.
        var gm = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|cl|l)\b/);
        if(gm){
            var v = parseFloat(gm[1].replace(",", "."));
            var unitWeight = { kg:1000, g:1, gr:1, ml:1, cl:10, l:1000 };
            return { g: v * unitWeight[gm[2]], explicit: true };
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
            var matches = findFoodsInText(s);
            matches.forEach(function(match, index){
                var food = match.food;
                // La quantité est cherchée juste avant l'aliment, puis juste après.
                // Une quantité ne peut pas être réutilisée par l'ingrédient suivant.
                var previousEnd = index ? matches[index - 1].end : Math.max(0, match.start - 24);
                var nextStart = index < matches.length - 1 ? matches[index + 1].start : Math.min(s.length, match.end + 18);
                var before = s.slice(previousEnd, match.start);
                var after = s.slice(match.end, nextStart);
                var qty = parseQuantity(before) || {g:null};
                if(qty.g == null && qty.count == null && qty.frac == null) qty = parseQuantity(after);
                var grams = qty.g;
                if(grams == null && qty.count != null && food.unitG != null) grams = Math.max(1, food.unitG * qty.count);
                else if(grams == null && qty.frac != null) grams = food.defaultG * qty.frac;
                else if(grams == null && qty.count != null) grams = (food.defaultG || 60) * qty.count;
                else if(grams == null) grams = food.defaultG;
                grams = clamp(grams, 1, 1500);
                results.push({ food:food, grams:grams, rawLine:s, quantityExplicit:!!qty.explicit });
            });
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
        var unmatched = rawLines.filter(function(line){ return findFoodsInText(line).length === 0; });
        return { lines: rawLines.length, items: merged, unmatched:unmatched };
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
            // alcoholG est exprimé en grammes d'éthanol pour 100 g/mL.
            if(f.alcoholG) { var aG = parseFloat(f.alcoholG) || 0; tot.alcoholG += aG * factor; }

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
        else if(pRatio < 0.8) pScore = 1.0 + 2.0 * linearMap(pRatio, 0.55, 0.8);
        // Une journée à 80–135 % de l'objectif est déjà très bien couverte :
        // ne pas retirer des points à un repas équilibré pour quelques grammes.
        else if(pRatio <= 1.35) pScore = 3.0;
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
        // Le score de qualité ne sanctionne pas une journée riche en aliments
        // complets parce qu'une cible énergétique personnelle est élevée.
        if(nCarb >= 2 && tot.g >= 160) gScore = Math.max(gScore, 2.0);
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
        if(hasLipidGood >= 1 && lRatio >= 0.45 && lRatio <= 1.35 && hasJunk === 0 && tot.alcoholG === 0) lScore = 1;
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
        if(foodCount >= 7 && nProteins >= 1 && nCarb >= 2 && nLegumes >= 1 && nFruit >= 1 && hasJunk === 0) tScore = 2;
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

    // Un seul aliment ou un seul repas ne représente pas une journée. Sans cette
    // garde, une poignée d'amandes pouvait être notée 3/10 et déclencher des
    // conseils absurdes sur les protéines ou les légumes de la "journée".
    function assessInputScope(text, score){
        var mealMarkers = String(text || "").match(/\b(matin|petit\s*dej|dejeuner|midi|brunch|gouter|collation|apres[- ]?midi|soir|diner|diner|repas)\b/gi) || [];
        var lines = String(text || "").split(/\r?\n/).filter(function(x){ return x.trim().length > 3; }).length;
        var hasSeveralMeals = mealMarkers.length >= 2 || lines >= 3;
        // Le seuil ne rend pas une saisie "saine" : il indique seulement que
        // l'utilisateur a probablement renseigné l'essentiel de sa journée.
        if(hasSeveralMeals || score.macros.kcal >= 900) return "day";
        return "partial";
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

        if(score.scope === "partial"){
            return [{ kind:"info", label:"Saisie partielle — pas de score journalier",
                text:"Tu as saisi " + Math.round(macros.kcal) + " kcal. Ajoute tes autres repas pour obtenir un bilan de journée fiable ; les cibles quotidiennes ne sont volontairement pas comparées ici." }];
        }

        // Analyse de l'historique pour des conseils plus intelligents
        var historyAnalysis = analyzeNutriHistory();

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
        
        // Conseils basés sur l'historique
        if(historyAnalysis.proteinTrend === 'declining'){
            tips.push({ kind:"warn", label:"Tendance proteines en baisse",
                text:"Sur les 7 derniers jours, tes apports proteiques diminuent. Priorise les sources proteiques pour maintenir la synthese musculaire." });
        } else if(historyAnalysis.proteinTrend === 'improving'){
            tips.push({ kind:"good", label:"Tendance proteines en hausse",
                text:"Excellent ! Tes apports proteiques augmentent. Continue comme ca pour une progression optimale." });
        }
        
        if(historyAnalysis.avgScore < 5 && historyAnalysis.daysAnalyzed >= 3){
            tips.push({ kind:"warn", label:"Moyenne faible cette semaine",
                text:"Ta moyenne sur 7 jours est de " + historyAnalysis.avgScore.toFixed(1) + "/10. Essaie d'augmenter la qualite globale avec plus de legumes et de proteines." });
        }
        
        if(historyAnalysis.junkFrequency > 0.4){
            tips.push({ kind:"warn", label:"Trop de junk food cette semaine",
                text:Math.round(historyAnalysis.junkFrequency * 100) + "% de tes repas contiennent des aliments transformes. Vise <20% pour une meilleure sante." });
        }
        
        if(score.total >= 8.5){
            tips.push({ kind:"good", label:"Excellente journee",
                text:"Tout y est et bien dose. Si c'est reproductible, c'est le combo qui fait la progression long terme." });
        } else if(score.total < 4 && tips.length < 2){
            tips.push({ kind:"warn", label:"Journee faible",
                text:"Pense a '1 proteine + 1 feculent + 1 legume vert + 1 fruit'. Ca suffit a passer 6/10." });
        }
        return tips.slice(0, 8);
    }

    function analyzeNutriHistory(){
        try {
            var raw = localStorage.getItem(STORAGE_K) || "{}";
            var data = JSON.parse(raw);
            var history = data.nutriHistory || [];
            
            if(history.length < 2){
                return { proteinTrend: 'stable', avgScore: 0, daysAnalyzed: 0, junkFrequency: 0 };
            }
            
            // Analyser les 7 derniers jours
            var sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            var recentHistory = history.filter(function(a){
                return new Date(a.date) >= sevenDaysAgo;
            });
            
            if(recentHistory.length === 0){
                return { proteinTrend: 'stable', avgScore: 0, daysAnalyzed: 0, junkFrequency: 0 };
            }
            
            // Trier par date
            recentHistory.sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
            
            // Calculer la tendance des protéines
            var proteinValues = recentHistory.map(function(a){
                return a.score && a.score.macros ? a.score.macros.p : 0;
            });
            
            var proteinTrend = 'stable';
            if(proteinValues.length >= 3){
                var firstHalf = proteinValues.slice(0, Math.floor(proteinValues.length / 2));
                var secondHalf = proteinValues.slice(Math.floor(proteinValues.length / 2));
                var firstAvg = firstHalf.reduce(function(a,b){ return a + b; }, 0) / firstHalf.length;
                var secondAvg = secondHalf.reduce(function(a,b){ return a + b; }, 0) / secondHalf.length;
                
                if(secondAvg > firstAvg * 1.1) proteinTrend = 'improving';
                else if(secondAvg < firstAvg * 0.9) proteinTrend = 'declining';
            }
            
            // Calculer le score moyen
            var scores = recentHistory.map(function(a){
                return a.score ? a.score.total : 0;
            });
            var avgScore = scores.reduce(function(a,b){ return a + b; }, 0) / scores.length;
            
            // Calculer la fréquence de junk food
            var junkCount = 0;
            recentHistory.forEach(function(a){
                if(a.score && a.score.categories && a.score.categories.junk >= 1){
                    junkCount++;
                }
            });
            var junkFrequency = junkCount / recentHistory.length;
            
            return {
                proteinTrend: proteinTrend,
                avgScore: avgScore,
                daysAnalyzed: recentHistory.length,
                junkFrequency: junkFrequency
            };
            
        } catch(e){
            return { proteinTrend: 'stable', avgScore: 0, daysAnalyzed: 0, junkFrequency: 0 };
        }
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

    function saveNutriAnalysis(inputText, score, targets, advice, dateKey){
        try {
            var raw = localStorage.getItem(STORAGE_K) || "{}";
            var data = JSON.parse(raw);
            if(!data.nutriHistory) data.nutriHistory = [];
            
            dateKey = dateKey || localDateStr(new Date());
            var analysis = {
                date: dateKey,
                input: inputText,
                score: score,
                targets: targets,
                advice: advice,
                timestamp: Date.now()
            };
            
            // Remplacer l'analyse du jour si elle existe, sinon ajouter
            var existingIndex = data.nutriHistory.findIndex(function(a){ return a.date === dateKey; });
            if(existingIndex >= 0){
                data.nutriHistory[existingIndex] = analysis;
            } else {
                data.nutriHistory.push(analysis);
            }
            
            // Garder seulement les 90 derniers jours
            if(data.nutriHistory.length > 90){
                data.nutriHistory.sort(function(a,b){ return b.timestamp - a.timestamp; });
                data.nutriHistory = data.nutriHistory.slice(0, 90);
            }
            
            localStorage.setItem(STORAGE_K, JSON.stringify(data));
            try { if(typeof window.refreshNutriViews === "function") window.refreshNutriViews(); } catch(e){}
            try { showNutriToast(dateKey); } catch(e){}
        } catch(e){
            console.error("Erreur sauvegarde analyse nutri:", e);
        }
    }

    function showNutriToast(dateKey){
        try {
            var existing = document.getElementById("nutriSaveToast");
            if(existing){ existing.remove(); }
            var parts = (dateKey || "").split("-");
            var niceDate = parts.length === 3 ? (parts[2] + "/" + parts[1] + "/" + parts[0]) : dateKey;
            var toast = document.createElement("div");
            toast.id = "nutriSaveToast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c291e;color:#d5ff3e;padding:14px 18px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.35);z-index:99999;display:flex;align-items:center;gap:14px;font:600 13px Manrope;animation:nutriToastIn 0.32s ease-out;border:1px solid #d5ff3e;max-width:92vw;flex-wrap:wrap;";
            toast.innerHTML =
                '<span style="font-size:18px;">✓</span>' +
                '<span>Analyse enregistrée pour le <b>' + niceDate + '</b></span>' +
                '<button type="button" data-toast-action="history" style="background:#d5ff3e;color:#1c291e;border:0;padding:7px 12px;font:700 11px Manrope;border-radius:8px;cursor:pointer;">📋 Historique nutri</button>' +
                '<button type="button" data-toast-action="calendar" style="background:#d5ff3e;color:#1c291e;border:0;padding:7px 12px;font:700 11px Manrope;border-radius:8px;cursor:pointer;">📅 Calendrier</button>' +
                '<button type="button" data-toast-action="dismiss" aria-label="Fermer" style="background:transparent;color:#d5ff3e;border:0;padding:0 6px;font:700 16px Manrope;cursor:pointer;opacity:0.7;">&times;</button>';
            document.body.appendChild(toast);
            toast.querySelector('[data-toast-action="history"]').addEventListener("click", function(){
                toast.remove();
                var lb = document.querySelector('[data-nutri-tab="history"]');
                if(lb && typeof lb.click === "function") lb.click();
                if(typeof showPage === "function") showPage("nutrition");
            });
            toast.querySelector('[data-toast-action="calendar"]').addEventListener("click", function(){
                toast.remove();
                if(typeof showPage === "function") showPage("calendar");
            });
            toast.querySelector('[data-toast-action="dismiss"]').addEventListener("click", function(){
                toast.remove();
            });
            setTimeout(function(){
                if(toast && toast.parentNode){ toast.style.transition = "opacity 0.4s ease, transform 0.4s ease"; toast.style.opacity = "0"; toast.style.transform = "translateX(-50%) translateY(20px)"; setTimeout(function(){ if(toast && toast.parentNode) toast.remove(); }, 420); }
            }, 6500);
        } catch(e){
            console.warn("showNutriToast failed:", e);
        }
    }

    function renderResult(panel, parsed, score, targets, advice){
        var html = "";

        var isPartial = score.scope === "partial";
        var ring = isPartial ? "#9c9c8a" : ringByScore(score.total);
        var ringDeg = isPartial ? 0 : Math.round((score.total / 10) * 360);
        html += '<div class="nutri-score-hero">';
        html += '  <div class="nutri-score-circle" style="background: conic-gradient(' + ring + ' ' + ringDeg + 'deg, #e0e5dd ' + ringDeg + 'deg);">';
        html += '    <div class="nutri-score-inner">';
        html += '      <div class="nutri-score-num" style="color:' + (isPartial ? "#6c756c" : colorByScore(score.total)) + '">' + (isPartial ? "—" : score.total.toFixed(1)) + '</div>';
        html += '      <div class="nutri-score-of">' + (isPartial ? "partiel" : "/10") + '</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="nutri-score-side">';
        html += '    <div class="nutri-score-title">🥗 ' + (isPartial ? "Saisie alimentaire" : "Recap nutrition") + '</div>';
        html += '    <div class="nutri-score-stats">' + score.macros.kcal + ' kcal · ' + parsed.items.length + ' items</div>';
        html += '    <div class="nutri-score-context">' + (isPartial ? 'Ajoute les autres repas pour un bilan journalier.' : escape(describeContext(score.ctx)) + (targets.personalized ? ' · 🎯 profil personnel' : ' · repères génériques')) + '</div>';
        html += '  </div>';
        html += '</div>';

        if(parsed.unmatched && parsed.unmatched.length){
            html += '<div class="nutri-card" style="border-left:3px solid #ffab91;padding:12px 14px">';
            html += '<div class="nutri-card-title">⚠️ À préciser pour une estimation fiable</div>';
            html += '<div style="font-size:12px;color:var(--text);line-height:1.5">Ces lignes ne correspondent pas encore à la base : ' + escape(parsed.unmatched.slice(0,3).join(' · ')) + '. Vérifie l’orthographe ou ajoute les ingrédients principaux.</div>';
            html += '</div>';
        }

        var macroSub = function(target, unit){ return isPartial ? "apport saisi · pas de comparaison/jour" : "cible " + target + " " + unit; };
        html += '<div class="nutri-grid">';
        html += macroBox("Proteines", score.macros.p + " g", macroSub(targets.p,"g"));
        html += macroBox("Glucides", score.macros.g + " g", macroSub(targets.g,"g"));
        html += macroBox("Lipides", score.macros.l + " g", macroSub(targets.l,"g"));
        html += macroBox("Fibres", score.macros.fiber + " g", macroSub(targets.fiber,"g"));
        html += '</div>';

        if(isPartial){
            html += '<div class="nutri-card" style="border-left:3px solid #9c9c8a"><div class="nutri-card-title">🧠 Analyse fiable : données insuffisantes</div><div style="font-size:12px;line-height:1.5;color:var(--text)">Cette saisie ressemble à un aliment ou à un repas isolé, pas à une journée. Aucun score, déficit ou conseil de récupération n’est déduit avant d’avoir plus de données.</div></div>';
        } else {
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
        }

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

            html += '<div class="nutri-card"><div class="nutri-card-title">✏️ Corriger les portions</div><div style="font-size:11px;color:var(--muted);margin-bottom:7px">Modifie un gramme, puis recalcule avec les valeurs corrigées.</div>';
            parsed.items.forEach(function(it, i){ html += '<div class="nutri-editor-row"><span>' + escape(it.food.name) + '</span><input type="number" min="1" value="' + Math.round(it.grams) + '" data-nutri-edit-grams="' + i + '"><span>g</span></div>'; });
            html += '<button class="btn lime" type="button" id="nutriApplyEdits" style="margin-top:10px;padding:8px 12px">Appliquer les corrections</button></div>';
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

        if(!isPartial){
            html += '<div class="nutri-card" id="nutriAiInsight"><div class="nutri-card-title">🤖 Coach IA local</div><div class="nutri-loading" style="font-size:12px">Analyse qualitative par l’IA locale…</div></div>';
        }

        // Disclaimer
        html += '<div class="nutri-disclaimer">Base locale étendue (aliments courants, portions cuites/égouttées). ' + (targets.personalized ? 'Les cibles sont calculées depuis ton profil et restent des estimations.' : 'Les cibles sont des repères génériques faute de profil renseigné.') + ' Le score n’est affiché que pour une journée suffisamment complète.</div>';

        panel.innerHTML = html;
        var editBtn = document.getElementById("nutriApplyEdits");
        if(editBtn) editBtn.addEventListener("click", function(){
            var values = panel.querySelectorAll("[data-nutri-edit-grams]");
            var lines = [];
            values.forEach(function(input){ var item = parsed.items[Number(input.dataset.nutriEditGrams)]; if(item) lines.push(Math.max(1, Number(input.value)||item.grams) + " g " + item.food.name); });
            var ta = document.getElementById("nutriInput"); if(ta){ ta.value = lines.join("\n"); runAnalysis(); }
        });
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
    // RENDER DEPUIS ANALYSE SAUVEGARDÉE (réutilisé calendrier + history)
    // ============================================================
    function renderNutriFromSaved(analysis){
        if(!analysis || !analysis.score || typeof analysis.score.total !== "number"){
            try { console.warn("renderNutriFromSaved: données corrompues pour", analysis && analysis.date); } catch(_){}
            return '<div class="empty" style="padding:14px;background:#fff;border-radius:8px;color:var(--muted);font-size:12px;line-height:1.5;">⚠ Analyse nutri corrompue pour ce jour (données manquantes).<br><button type="button" data-stale-nutri-date="' + (analysis && analysis.date ? analysis.date : "") + '" style="margin-top:8px;background:#ad4238;color:white;border:0;padding:5px 10px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">🗑️ Supprimer cette entrée</button></div>';
        }
        // Targets : si absents, on en synthétise depuis les macros du score (sinon return "" silencieux → UX cassée).
        var targets = analysis.targets;
        var targetsEstimated = false;
        if(!targets || typeof targets !== "object"){
            var pm = analysis.score.macros && analysis.score.macros.p || 0;
            var gm = analysis.score.macros && analysis.score.macros.g || 0;
            var lm = analysis.score.macros && analysis.score.macros.l || 0;
            targets = { p: pm * 1.5 || 150, g: gm * 1.5 || 320, l: lm * 1.5 || 80, fiber: 30, kcal: (pm*4 + gm*4 + lm*9) };
            targetsEstimated = true;
            try { console.warn("renderNutriFromSaved: cibles synthétisées (×1.5) pour", analysis.date); } catch(_){}
        }
        var score = patchLabels({
            total: analysis.score.total,
            breakdown: analysis.score.breakdown || {},
            macros: analysis.score.macros || {},
            ctx: analysis.score.ctx || { trainedToday:false, trainedYesterday:false, daysSinceLast:null }
        });
        var advice = analysis.advice || [];
        var html = "";

        var ring = ringByScore(score.total);
        var ringDeg = Math.round((score.total / 10) * 360);
        var inputCount = 0;
        if(analysis.input){
            inputCount = analysis.input.split(/[\n,]+/).filter(function(s){ return s.trim().length > 0; }).length;
            if(inputCount === 0) inputCount = 1;
        }

        html += '<div class="nutri-score-hero">';
        html += '  <div class="nutri-score-circle" style="background: conic-gradient(' + ring + ' ' + ringDeg + 'deg, #e0e5dd ' + ringDeg + 'deg);">';
        html += '    <div class="nutri-score-inner">';
        html += '      <div class="nutri-score-num" style="color:' + colorByScore(score.total) + '">' + score.total.toFixed(1) + '</div>';
        html += '      <div class="nutri-score-of">/10</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="nutri-score-side">';
        html += '    <div class="nutri-score-title">🥗 Recap nutrition</div>';
        html += '    <div class="nutri-score-stats">' + (score.macros.kcal || 0) + ' kcal · ' + inputCount + ' items</div>';
        html += '    <div class="nutri-score-context">' + escape(describeContext(score.ctx)) + '</div>';
        html += '  </div>';
        html += '</div>';

        if(targetsEstimated){
            html += '<div style="font-size:10px;color:#ad4238;background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:6px 10px;margin-bottom:8px;line-height:1.4;">⚠️ <b>Cibles estimées</b> (×1,5 de tes macros observés — données legacy sans targets enregistrés). Ré-enregistre depuis la page Nutrition pour fixer ça.</div>';
        }
        html += '<div class="nutri-grid">';
        html += macroBox("Proteines", (score.macros.p || 0) + " g", "cible " + (targets.p || 0) + " g");
        html += macroBox("Glucides", (score.macros.g || 0) + " g", "cible " + (targets.g || 0) + " g");
        html += macroBox("Lipides", (score.macros.l || 0) + " g", "cible " + (targets.l || 0) + " g");
        html += macroBox("Fibres", (score.macros.fiber || 0) + " g", "cible " + (targets.fiber || 30) + " g");
        html += '</div>';

        html += '<div class="nutri-card">';
        html += '  <div class="nutri-card-title">🎯 Detail du score</div>';
        ["proteins","carbs","lipids","variety","timing"].forEach(function(k){
            var bc = score.breakdown[k];
            if(!bc) return;
            var pct = Math.max(0, Math.min(100, (bc.score / bc.max) * 100));
            var barColor = pct >= 80 ? "#d5ff3e" : (pct >= 50 ? "#9c9c8a" : "#ad4238");
            html += '  <div class="nutri-row">';
            html += '    <div class="nutri-row-head"><span>' + (bc.icon||"") + ' ' + escape(bc.title||k) + '</span><b>' + bc.score.toFixed(1) + '/' + bc.max + '</b></div>';
            html += '    <div class="nutri-bar"><div class="nutri-bar-fill" style="width:' + pct.toFixed(0) + '%;background:' + barColor + '"></div></div>';
            html += '    <div class="nutri-row-detail">' + escape(bc.detail || "") + '</div>';
            html += '  </div>';
        });
        html += '</div>';

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

        if(analysis.input){
            var excerpt = analysis.input.length > 400 ? analysis.input.substring(0, 400) + "…" : analysis.input;
            html += '<div class="nutri-card">';
            html += '  <div class="nutri-card-title">🍽️ Aliments saisis</div>';
            html += '  <div class="nutri-input-excerpt" style="font-size:12px;color:var(--text);padding:10px 12px;background:#f7f8f5;border-radius:8px;line-height:1.5;white-space:pre-wrap;">' + escape(excerpt) + '</div>';
            html += '</div>';
        }

        return html;
    }

    function renderNutriCompactCard(analysis){
        if(!analysis || !analysis.score) return "";
        var score = analysis.score.total || 0;
        var scoreColor = score >= 8 ? "#1c291e" : (score >= 6.5 ? "#426e22" : (score >= 5 ? "#9c9c8a" : "#ad4238"));
        var dateObj = new Date(analysis.date);
        var dateLabel = isNaN(dateObj.getTime()) ? analysis.date : dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
        var macros = analysis.score.macros || {};
        var inputExcerpt = (analysis.input || "").substring(0, 120);
        if(analysis.input && analysis.input.length > 120) inputExcerpt += "…";
        return '<div class="card nutri-history-card" data-nutri-date="' + escape(analysis.date) + '" style="cursor:pointer;margin-bottom:10px;border-left:3px solid ' + scoreColor + ';">'
             + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">'
             + '  <div style="flex:1;min-width:0;">'
             + '    <time style="font-size:12px;color:var(--muted);font-weight:600;text-transform:lowercase;display:block;margin-bottom:6px;">' + escape(dateLabel) + '</time>'
             + '    <div style="font-size:11px;color:var(--text);line-height:1.4;opacity:0.85;">' + escape(inputExcerpt || "(aucun aliment saisi)") + '</div>'
             + '  </div>'
             + '  <div style="text-align:right;flex-shrink:0;">'
             + '    <div style="font-weight:800;font-size:22px;color:' + scoreColor + ';">' + score.toFixed(1) + '<span style="font-size:11px;color:var(--muted);font-weight:600;">/10</span></div>'
             + '    <div style="font-size:10px;color:var(--muted);margin-top:2px;">' + Math.round(macros.kcal || 0) + ' kcal · P' + Math.round(macros.p || 0) + ' · G' + Math.round(macros.g || 0) + ' · L' + Math.round(macros.l || 0) + '</div>'
             + '  </div>'
             + '</div>'
             + '<div class="history-actions" style="margin-top:10px;display:flex;gap:6px;">'
             + '  <button class="edit" data-action="open-calendar">📅 Voir le jour</button>'
             + '  <button data-action="delete-nutri" style="background:#ad4238;color:white;border:none;padding:6px 12px;font-size:11px;border-radius:6px;cursor:pointer;font-weight:600;">🗑️ Supprimer</button>'
             + '</div>'
             + '</div>';
    }

    function deleteNutriAnalysis(dateKey){
        try {
            var raw = localStorage.getItem(STORAGE_K) || "{}";
            var d = JSON.parse(raw);
            if(!d.nutriHistory) return false;
            var before = d.nutriHistory.length;
            d.nutriHistory = d.nutriHistory.filter(function(a){ return a.date !== dateKey; });
            if(d.nutriHistory.length === before) return false;
            localStorage.setItem(STORAGE_K, JSON.stringify(d));
            return true;
        } catch(e){ console.warn("deleteNutriAnalysis failed:", e); return false; }
    }

    // ============================================================
    // HOOK INIT
    // ============================================================
    function renderNutriHistory(){
        var container = document.getElementById("nutriHistoryList");
        if(!container) return;
        
        try {
            var raw = localStorage.getItem(STORAGE_K) || "{}";
            var data = JSON.parse(raw);
            var history = data.nutriHistory || [];
            
            if(history.length === 0){
                container.innerHTML = '<div class="empty" style="text-align:center;padding:32px;color:var(--muted);">Aucune analyse enregistrée</div>';
                return;
            }
            
            // Trier par date décroissante
            history.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
            
            var recent = history.slice(0,7), count = recent.length;
            var avg = recent.reduce(function(sum,a){ return sum + Number(a.score && a.score.total || 0); },0) / count;
            var avgP = recent.reduce(function(sum,a){ return sum + Number(a.score && a.score.macros && a.score.macros.p || 0); },0) / count;
            var avgKcal = recent.reduce(function(sum,a){ return sum + Number(a.score && a.score.macros && a.score.macros.kcal || 0); },0) / count;
            var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px"><div style="padding:10px;background:#f7f8f5;border-radius:8px"><b style="display:block;font-size:18px">' + avg.toFixed(1) + '/10</b><span style="font-size:10px;color:var(--muted)">score moyen · 7 derniers</span></div><div style="padding:10px;background:#f7f8f5;border-radius:8px"><b style="display:block;font-size:18px">' + Math.round(avgP) + ' g</b><span style="font-size:10px;color:var(--muted)">protéines / jour</span></div><div style="padding:10px;background:#f7f8f5;border-radius:8px"><b style="display:block;font-size:18px">' + Math.round(avgKcal) + '</b><span style="font-size:10px;color:var(--muted)">kcal / jour</span></div></div>';
            history.forEach(function(analysis){
                var date = new Date(analysis.date).toLocaleDateString("fr-FR", { weekday: 'short', day: 'numeric', month: 'short' });
                var score = analysis.score ? analysis.score.total : 0;
                var scoreColor = score >= 8 ? "#1c291e" : (score >= 6.5 ? "#426e22" : (score >= 5 ? "#9c9c8a" : "#ad4238"));
                
                html += '<div class="nutri-history-item" style="padding:12px;border-bottom:1px solid var(--line);cursor:pointer;">';
                html += '  <div style="display:flex;justify-content:space-between;align-items:center;">';
                html += '    <div style="font-weight:600;font-size:13px;">' + date + '</div>';
                html += '    <div style="font-weight:700;font-size:16px;color:' + scoreColor + '">' + score.toFixed(1) + '/10</div>';
                html += '  </div>';
                html += '  <div style="font-size:11px;color:var(--muted);margin-top:4px;">';
                if(analysis.score && analysis.score.macros){
                    var hm = analysis.score.macros;
                    html += '    ' + Math.round(hm.kcal) + ' kcal · P' + Math.round(hm.p) + ' · G' + Math.round(hm.g) + ' · L' + Math.round(hm.l);
                }
                html += '  </div>';
                html += '</div>';
            });
            
            container.innerHTML = html;
            
            // Ajouter les événements de clic pour recharger l'analyse
            container.querySelectorAll('.nutri-history-item').forEach(function(item, index){
                item.addEventListener('click', function(){
                    var analysis = history[index];
                    if(analysis && analysis.input){
                        document.getElementById("nutriInput").value = analysis.input;
                        // Switch vers l'onglet analyser
                        switchNutriTab('analyze');
                        // Relancer l'analyse
                        runAnalysis();
                    }
                });
            });
            
        } catch(e){
            container.innerHTML = '<div class="empty" style="text-align:center;padding:32px;color:var(--muted);">Erreur lors du chargement de l\'historique</div>';
        }
    }

    function switchNutriTab(tabName){
        var analyzeTab = document.getElementById("nutriAnalyzeTab");
        var historyTab = document.getElementById("nutriHistoryTab");
        var buttons = document.querySelectorAll('[data-nutri-tab]');
        
        if(tabName === 'analyze'){
            analyzeTab.classList.remove('hidden');
            historyTab.classList.add('hidden');
            buttons.forEach(function(btn){
                if(btn.dataset.nutriTab === 'analyze'){
                    btn.style.background = 'var(--lime)';
                    btn.style.color = '#1c291e';
                    btn.style.fontWeight = '700';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--muted)';
                    btn.style.fontWeight = '400';
                }
            });
        } else if(tabName === 'history'){
            analyzeTab.classList.add('hidden');
            historyTab.classList.remove('hidden');
            buttons.forEach(function(btn){
                if(btn.dataset.nutriTab === 'history'){
                    btn.style.background = 'var(--lime)';
                    btn.style.color = '#1c291e';
                    btn.style.fontWeight = '700';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--muted)';
                    btn.style.fontWeight = '400';
                }
            });
            renderNutriHistory();
        }
    }

    function lookupBarcodeProduct(){
        var input = document.getElementById("nutriBarcode"), status = document.getElementById("nutriBarcodeStatus");
        var code = (input && input.value || "").replace(/\D/g, "");
        if(code.length < 8){ status.textContent = "Entre un code EAN valide."; return; }
        status.textContent = "Recherche du produit…";
        fetch("https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(code) + ".json?fields=product_name,nutriments,serving_quantity")
            .then(function(r){ if(!r.ok) throw new Error("service indisponible"); return r.json(); })
            .then(function(result){
                var product = result.product || {}, n = product.nutriments || {}, name = product.product_name;
                if(!name || n["energy-kcal_100g"] == null) throw new Error("produit incomplet");
                document.getElementById("nutriCustomName").value = name;
                document.getElementById("nutriCustomKcal").value = Math.round(Number(n["energy-kcal_100g"]));
                document.getElementById("nutriCustomP").value = Number(n.proteins_100g || 0).toFixed(1);
                document.getElementById("nutriCustomG").value = Number(n.carbohydrates_100g || 0).toFixed(1);
                document.getElementById("nutriCustomL").value = Number(n.fat_100g || 0).toFixed(1);
                document.getElementById("nutriCustomPortion").value = Math.round(Number(product.serving_quantity || 100));
                status.textContent = "✓ Produit trouvé : vérifie puis ajoute-le.";
            }).catch(function(){ status.textContent = "Produit introuvable ou connexion indisponible."; });
    }

    // Le modèle ne calcule jamais les macros : elles viennent de la base locale.
    // Il sert à comprendre le contexte et formuler une recommandation cohérente.
    function requestNutriAi(text, score, targets){
        if(score.scope === "partial") return;
        var target = document.getElementById("nutriAiInsight");
        if(!target) return;
        var prompt = "Tu es un coach nutrition sportif francophone, prudent et concret. " +
            "Tu reçois une journée alimentaire et des macros DEJA CALCULEES. Ne les recalcules pas, ne les invente pas, ne donne pas de diagnostic médical. " +
            "Réponds uniquement en français, 90 mots maximum, avec : 1) un verdict court, 2) deux forces précises, 3) une seule amélioration utile si nécessaire. " +
            "Si la journée est équilibrée, dis-le clairement sans chercher un défaut artificiel.\n\n" +
            "Journal :\n" + text + "\n\nMacros calculées : " + score.macros.kcal + " kcal, protéines " + score.macros.p + " g, glucides " + score.macros.g + " g, lipides " + score.macros.l + " g, fibres " + score.macros.fiber + " g. " +
            "Repères utilisateur : P " + targets.p + " g, G " + targets.g + " g, L " + targets.l + " g. Score qualité calculé : " + score.total + "/10.";
        fetch("http://localhost:11434/api/generate", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({model:"llama3.2", prompt:prompt, stream:false, options:{temperature:0.25, num_predict:180}})})
            .then(function(r){ if(!r.ok) throw new Error("Ollama indisponible"); return r.json(); })
            .then(function(result){
                var answer = String(result.response || "").trim();
                if(!answer) throw new Error("réponse vide");
                target.innerHTML = '<div class="nutri-card-title">🤖 Coach IA local <span style="font-size:10px;color:#426e22">● connecté</span></div><div style="white-space:pre-wrap;font-size:12px;line-height:1.6;color:var(--text)">' + escape(answer) + '</div>';
            }).catch(function(){
                target.innerHTML = '<div class="nutri-card-title">🤖 Coach IA local</div><div style="font-size:12px;line-height:1.5;color:var(--muted)">IA locale non connectée. Installe et lance Ollama avec <b>ollama pull llama3.2</b> pour obtenir une analyse rédigée par un vrai modèle ; les macros restent fiables grâce au calcul local.</div>';
            });
    }

    function init(){
        var btn = document.getElementById("nutriAnalyzeBtn");
        var ta = document.getElementById("nutriInput");
        var out = document.getElementById("nutriResult");
        var sample = document.getElementById("nutriSample");
        var clearBtn = document.getElementById("nutriClearBtn");
        if(!btn || !ta || !out) return;

        var profile = getNutriProfile();
        if(profile){
            var pw = document.getElementById("nutriWeight"), pg = document.getElementById("nutriGoal"), pa = document.getElementById("nutriActivity");
            if(pw) pw.value = profile.weight || ""; if(pg) pg.value = profile.goal || "maintain"; if(pa) pa.value = profile.activity || "medium";
        }
        var profileBtn = document.getElementById("nutriSaveProfile");
        if(profileBtn) profileBtn.addEventListener("click", function(){
            var weight = Number(document.getElementById("nutriWeight").value);
            if(weight < 35 || weight > 250){ alert("Entre un poids entre 35 et 250 kg."); return; }
            var store = readNutriStore(); store.nutriProfile = {weight:weight, goal:document.getElementById("nutriGoal").value, activity:document.getElementById("nutriActivity").value}; writeNutriStore(store);
            profileBtn.textContent = "✓ Profil enregistré"; setTimeout(function(){ profileBtn.textContent = "Enregistrer le profil"; }, 1800);
        });
        var customBtn = document.getElementById("nutriSaveCustomFood");
        if(customBtn) customBtn.addEventListener("click", function(){
            var name = (document.getElementById("nutriCustomName").value || "").trim(), kcal = Number(document.getElementById("nutriCustomKcal").value);
            if(!name || !isFinite(kcal) || kcal < 0){ alert("Renseigne au minimum le nom et les kcal / 100 g."); return; }
            var food = {name:name, aliases:[name], category:"custom", kcal:kcal, p:Math.max(0,Number(document.getElementById("nutriCustomP").value)||0), g:Math.max(0,Number(document.getElementById("nutriCustomG").value)||0), l:Math.max(0,Number(document.getElementById("nutriCustomL").value)||0), defaultG:Math.max(1,Number(document.getElementById("nutriCustomPortion").value)||100)};
            var store = readNutriStore(); store.nutriCustomFoods = (store.nutriCustomFoods || []).filter(function(f){ return normalize(f.name) !== normalize(name); }); store.nutriCustomFoods.push(food); writeNutriStore(store);
            ["nutriCustomName","nutriCustomKcal","nutriCustomP","nutriCustomG","nutriCustomL","nutriCustomPortion"].forEach(function(id){ document.getElementById(id).value = ""; }); customBtn.textContent="✓ Ajouté"; setTimeout(function(){customBtn.textContent="Ajouter";},1500);
        });
        var barcodeBtn = document.getElementById("nutriLookupBarcode");
        if(barcodeBtn) barcodeBtn.addEventListener("click", lookupBarcodeProduct);

        // Date picker — défaut = aujourd'hui (sauf si __nutriTargetDate pré-renseigné)
        var dateIn = document.getElementById("nutriDateInput");
        if(dateIn && !dateIn.value){
            try {
                if(window.__nutriTargetDate){
                    dateIn.value = window.__nutriTargetDate;
                    try { delete window.__nutriTargetDate; } catch(_){}
                } else {
                    dateIn.value = localDateStr(new Date());
                }
            } catch(_){}
        }

        // Gestion des onglets
        document.querySelectorAll('[data-nutri-tab]').forEach(function(tabBtn){
            tabBtn.addEventListener('click', function(){
                switchNutriTab(tabBtn.dataset.nutriTab);
            });
        });

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
            score.scope = assessInputScope(text, score);
            patchLabels(score);
            score.items = parsed.items.length;
            var advice = generateAdvice(score, ctx, targets);

            try{
                if(parsed.items.length > 0 && score.scope === "day"){
                    // Sauvegarder l'analyse complète (date choisie par l'utilisateur via input date)
                    var dateIn = document.getElementById("nutriDateInput");
                    var dateKey = (dateIn && dateIn.value) ? dateIn.value : (localDateStr(new Date()));
                    saveNutriAnalysis(text, score, targets, advice, dateKey);
                }
            }catch(_){}

            renderResult(out, parsed, score, targets, advice);
            requestNutriAi(text, score, targets);
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
        score.scope = assessInputScope(ta.value || "", score);
        console.log("🥗 NUTRI", { items: parsed.items.length, ctx: ctx, score: score.total, breakdown: score.breakdown });
        return score;
    };
    window.__nutriParse = parseInput;
    window.__nutriAssessScope = function(text){ var p = parseInput(text); var s = scoreMeal(p, computeTargets(detectContext()), detectContext()); return assessInputScope(text, s); };
    window.__nutriEvaluate = function(text){ var p = parseInput(text), ctx = detectContext(), targets = computeTargets(ctx), s = scoreMeal(p, targets, ctx); s.scope = assessInputScope(text, s); return {score:s,targets:targets,items:p.items}; };

    // Exports placés dans le bloc try : en mode strict, les déclarations de
    // fonctions définies dans ce bloc ne sont pas visibles après son accolade.
    // Les exporter après le try faisait planter le module en fin d'initialisation.
    window.renderNutriFromSaved = renderNutriFromSaved;
    window.renderNutriCompactCard = renderNutriCompactCard;
    window.deleteNutriAnalysis = deleteNutriAnalysis;

    } catch(e) {
        window.__nutriErr = (e && e.message ? e.message : String(e)) + " :: " + ((e && e.stack) ? e.stack.split("\n").slice(0,4).join(" | ") : "no-stack");
        try { console.error("🛑 NUTRI IIFE crashed:", e); } catch(_){}
    }
})();
