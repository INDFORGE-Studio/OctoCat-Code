/* OctoCat-Code — Les énigmes dans plusieurs langages (Python, JavaScript, pseudo-code français).
 *
 * Les niveaux sont écrits en Python (code de départ, indices, conseils). Après le 1er tour des 10 niveaux, le joueur choisit
 * un autre langage pour le tour suivant : `OctoLangs.apply(def, langage)` renvoie une COPIE du niveau avec le code de départ,
 * les indices, la mission, les conseils (et la leçon) écrits pour ce langage. Le validateur ne change pas : l'interpréteur
 * comprend les trois écritures. Ce qui n'est pas redéfini ici reste identique (ex. niveaux 1 à 3 en pseudo-code).
 *
 *   fills : ce qui remplace les ??? (dans l'ordre) pour réussir : sert aux tests (`OctoLangs.solve`).
 */
(function () {
  "use strict";

  var LANGS = ["Python", "JavaScript", "Pseudo-code"];
  var INFO = {
    "Python": { icon: "🐍", tagline: "Le langage doux, avec des espaces pour ranger le code." },
    "JavaScript": { icon: "🌐", tagline: "Le langage des sites web, avec des { } et des ; ." },
    "Pseudo-code": { icon: "📝", tagline: "Du français presque normal : si… alors, pour… faire." }
  };

  var TIP_STAIR = "Ton code doit marcher quel que soit le nombre de marches.";

  var V = {
    1: {
      Python: { fills: ["200"] },
      JavaScript: {
        fills: ["200"],
        starter: "// 🐱 Un Glitch bloque le chemin !\n// Remplace les ??? par un nombre pour donner une vitesse de 200 à l'OctoCat.\n\nlet v_speed = ???;",
        hints: [
          "Une variable, c'est une boîte : le mot let, un nom, le signe =, puis ce qu'on met dedans.",
          "Remplace les ??? par un nombre. Le nom de la boîte est déjà écrit : v_speed.",
          "La réponse tient en une ligne : let v_speed = 200;"
        ],
        goal: "Écris **`let v_speed = 200;`**. Le `let` et le `;` sont déjà là : remplace seulement les `???` par la **valeur**, `200`, puis appuie sur ⚡ Compiler !",
        tips: [
          "Le mot `let` crée une nouvelle boîte, et le `;` termine la phrase (comme un point).",
          "Le signe `=` veut dire « mets dans la boîte ». Ce n'est pas le `=` des maths !",
          "Fais attention aux **majuscules** : `v_speed` et `V_Speed` sont deux boîtes différentes."
        ],
        lesson: "Une **variable**, c'est une **boîte avec une étiquette**. L'étiquette est le **nom** de la boîte. Dedans, on met une **valeur** (un nombre, par exemple). En JavaScript, on crée la boîte avec `let`, on met la valeur avec le signe `=`, et on finit par `;`."
      },
      "Pseudo-code": { fills: ["200"] }
    },
    2: {
      Python: { fills: ['v_debut + "cat"'] },
      JavaScript: {
        fills: ['v_debut + "cat"'],
        starter: "// 🗝️ Le gardien veut le mot secret : \"octocat\".\n// v_debut contient déjà le début : \"octo\".\n// Colle la fin \"cat\" avec le signe + à la place des ???\n\nlet v_debut = \"octo\";\nlet v_mot = ???;",
        hints: [
          "Un texte s'écrit entre guillemets. Pour coller deux textes, on utilise le signe +.",
          "Le début du mot est déjà dans v_debut. Il reste à lui coller la fin : \"cat\".",
          "La réponse : let v_mot = v_debut + \"cat\";"
        ]
      },
      "Pseudo-code": { fills: ['v_debut + "cat"'] }
    },
    3: {
      Python: { fills: ["v_caisses * v_poids_caisse"] },
      JavaScript: {
        fills: ["v_caisses * v_poids_caisse"],
        starter: "// 📦 v_caisses = le nombre de caisses. v_poids_caisse = le poids d'une caisse.\n// La charge totale = le nombre de caisses × le poids d'une caisse.\n// (Le signe pour multiplier est * )\n\nlet v_charge = ???;",
        hints: [
          "La charge totale, c'est le nombre de caisses multiplié par le poids d'une seule caisse.",
          "Le signe pour multiplier est *. Utilise les deux variables qui existent déjà.",
          "La réponse : let v_charge = v_caisses * v_poids_caisse;"
        ]
      },
      "Pseudo-code": { fills: ["v_caisses * v_poids_caisse"] }
    },
    4: {
      Python: { fills: ["v_cle and not v_garde"] },
      JavaScript: {
        fills: ["v_cle && !v_garde"],
        starter: "// 🚪 v_cle : l'OctoCat a la clé (true ou false).\n// v_garde : un garde veille devant la porte (true ou false).\n// La porte s'ouvre seulement s'il a la clé ET s'il n'y a PAS de garde.\n\nlet v_porte_ouverte = ???;",
        hints: [
          "Il faut deux choses en même temps : avoir la clé, et ne pas avoir de garde.",
          "« et » s'écrit && en JavaScript. « ne pas avoir » s'écrit !",
          "La réponse : let v_porte_ouverte = v_cle && !v_garde;"
        ],
        goal: "La porte s'ouvre **seulement** si l'OctoCat a la clé ET s'il n'y a PAS de garde. Écris ça pour **`v_porte_ouverte`**, avec `v_cle`, `v_garde` et les signes `&&` et `!`.",
        tips: [
          "`a && b` est vrai seulement si `a` ET `b` sont vrais.",
          "`!` retourne la lampe : `!true` vaut `false`.",
          "Ta réponse doit marcher dans les 4 cas possibles de `v_cle` et `v_garde`."
        ]
      },
      "Pseudo-code": {
        fills: ["v_cle et non v_garde"],
        starter: "# 🚪 v_cle : l'OctoCat a la clé (vrai ou faux).\n# v_garde : un garde veille devant la porte (vrai ou faux).\n# La porte s'ouvre seulement s'il a la clé ET s'il n'y a PAS de garde.\n\nv_porte_ouverte = ???",
        hints: [
          "Il faut deux choses en même temps : avoir la clé, et ne pas avoir de garde.",
          "« et » s'écrit et. « ne pas avoir » s'écrit non.",
          "La réponse : v_porte_ouverte = v_cle et non v_garde"
        ],
        goal: "La porte s'ouvre **seulement** si l'OctoCat a la clé ET s'il n'y a PAS de garde. Écris ça pour **`v_porte_ouverte`**, avec `v_cle`, `v_garde` et les mots `et` et `non`.",
        tips: [
          "`a et b` est vrai seulement si `a` ET `b` sont vrais.",
          "`non` retourne la lampe : `non vrai` vaut `faux`.",
          "Ta réponse doit marcher dans les 4 cas possibles de `v_cle` et `v_garde`."
        ]
      }
    },
    5: {
      Python: { fills: ["v_energie >= 50"] },
      JavaScript: {
        fills: ["v_energie >= 50"],
        starter: "// 🌉 Le pont s'effondre case par case !\n// Il tient seulement si l'OctoCat a assez d'énergie : 50 ou plus.\n// v_energie contient son énergie.\n\nlet v_pont = \"fragile\";\n\nif (???) {\n  v_pont = \"solide\";\n}",
        hints: [
          "Une condition compare deux choses avec ==, !=, <, >, <= ou >=. Elle se met entre les parenthèses du if.",
          "Le pont tient avec au moins 50 d'énergie. Compare v_energie à 50 avec « plus grand ou égal ».",
          "La réponse : if (v_energie >= 50) {"
        ],
        goal: "Écris la condition qui rend le pont `\"solide\"` quand **`v_energie`** vaut **50 ou plus**. Remplace les `???` entre les parenthèses du `if`.",
        tips: [
          "Un seul `=` **met** une valeur dans une boîte. Deux `==` **comparent**.",
          "En JavaScript, la condition est entre `( )` et ce qui en dépend est entre `{ }`.",
          "`>=` veut dire « plus grand **ou égal** » : `50 >= 50` est vrai !"
        ]
      },
      "Pseudo-code": {
        fills: ["v_energie >= 50"],
        starter: "# 🌉 Le pont s'effondre case par case !\n# Il tient seulement si l'OctoCat a assez d'énergie : 50 ou plus.\n# v_energie contient son énergie.\n\nv_pont = \"fragile\"\n\nsi ??? alors\n  v_pont = \"solide\"\nfin si",
        hints: [
          "Une condition compare deux choses avec ==, !=, <, >, <= ou >=. Elle se met entre si et alors.",
          "Le pont tient avec au moins 50 d'énergie. Compare v_energie à 50 avec « plus grand ou égal ».",
          "La réponse : si v_energie >= 50 alors"
        ],
        goal: "Écris la condition qui rend le pont `\"solide\"` quand **`v_energie`** vaut **50 ou plus**. Remplace les `???` entre `si` et `alors`.",
        tips: [
          "Un seul `=` **met** une valeur dans une boîte. Deux `==` **comparent**.",
          "En pseudo-code, ce qui dépend du `si` est écrit entre `alors` et `fin si`.",
          "`>=` veut dire « plus grand **ou égal** » : `50 >= 50` est vrai !"
        ]
      }
    },
    6: {
      Python: { fills: ["v_or >= 50"] },
      JavaScript: {
        fills: ["v_or >= 50"],
        starter: "// 💎 v_or = l'or de l'OctoCat. Le marchand le classe :\n//   100 ou plus -> \"riche\"   |   de 50 à 99 -> \"aise\"   |   moins de 50 -> \"pauvre\"\n\nlet v_titre = \"pauvre\";\nif (v_or >= 100) {\n  v_titre = \"riche\";\n} else if (???) {\n  v_titre = \"aise\";\n}",
        hints: [
          "Un client est « aise » à partir de 50 d'or. Le premier if a déjà pris les riches.",
          "La condition du else if compare v_or à 50 avec « plus grand ou égal ».",
          "La réponse : } else if (v_or >= 50) {"
        ],
        goal: "Complète le `else if` pour qu'un client qui a **de 50 à 99** d'or soit `\"aise\"`. Remplace les `???` par la condition.",
        tips: [
          "`else if` n'est regardé que si les cas **au-dessus** sont faux.",
          "`>=` veut dire « plus grand ou égal » : `50 >= 50` est vrai.",
          "Ta règle doit marcher pour toutes les bourses : 0, 49, 50, 99, 100…"
        ],
        lesson: "`if` / `else if` / `else` servent à choisir entre **plusieurs** possibilités, comme un aiguillage. On regarde le premier cas ; s'il est faux, on regarde le suivant (`else if` veut dire « sinon si ») ; et `else` (« sinon ») prend tout le reste. **Le premier cas vrai gagne**, les autres sont ignorés. On commence donc par le cas le plus difficile."
      },
      "Pseudo-code": {
        fills: ["v_or >= 50"],
        starter: "# 💎 v_or = l'or de l'OctoCat. Le marchand le classe :\n#   100 ou plus -> \"riche\"   |   de 50 à 99 -> \"aise\"   |   moins de 50 -> \"pauvre\"\n\nv_titre = \"pauvre\"\nsi v_or >= 100 alors\n  v_titre = \"riche\"\nsinon si ??? alors\n  v_titre = \"aise\"\nfin si",
        hints: [
          "Un client est « aise » à partir de 50 d'or. Le premier si a déjà pris les riches.",
          "La condition du sinon si compare v_or à 50 avec « plus grand ou égal ».",
          "La réponse : sinon si v_or >= 50 alors"
        ],
        goal: "Complète le `sinon si` pour qu'un client qui a **de 50 à 99** d'or soit `\"aise\"`. Remplace les `???` par la condition.",
        tips: [
          "`sinon si` n'est regardé que si les cas **au-dessus** sont faux.",
          "`>=` veut dire « plus grand ou égal » : `50 >= 50` est vrai.",
          "Ta règle doit marcher pour toutes les bourses : 0, 49, 50, 99, 100…"
        ],
        lesson: "`si` / `sinon si` / `sinon` servent à choisir entre **plusieurs** possibilités, comme un aiguillage. On regarde le premier cas ; s'il est faux, on regarde le suivant (`sinon si`) ; et `sinon` prend tout le reste. **Le premier cas vrai gagne**, les autres sont ignorés. On commence donc par le cas le plus difficile."
      }
    },
    7: {
      Python: { fills: ["v_commande"] },
      JavaScript: {
        fills: ["v_commande"],
        starter: "// ⚔️ L'enclume forge UNE épée à chaque tour de boucle.\n// La commande est dans v_commande : forge exactement cette quantité !\n\nlet v_epees = 0;\n\nfor (let i = 0; i < ???; i++) {\n  v_epees = v_epees + 1;\n}",
        hints: [
          "Une épée par tour : il faut autant de tours que d'épées commandées.",
          "Le nombre de tours, c'est v_commande. Mets cette variable après le signe < dans le for.",
          "La réponse : for (let i = 0; i < v_commande; i++) {"
        ],
        goal: "Complète le `for` pour forger **exactement** `v_commande` épées : écris **`v_commande`** à la place des `???`.",
        tips: [
          "`for (let i = 0; i < 3; i++)` fait **3 tours** : `i` vaut 0, 1, puis 2.",
          "Ce qui est dans la boucle est refait à **chaque tour**, dans l'ordre.",
          "La commande change à chaque partie : utilise la variable `v_commande`, pas un nombre fixe."
        ],
        lesson: "Une **boucle** répète une action sans qu'on ait besoin de l'écrire 10 fois ! Avec `for (let i = 0; i < 5; i++)`, l'action est faite **5 fois** (le compteur `i` vaut 0, 1, 2, 3, puis 4). Ce qui est répété est mis entre `{ }`."
      },
      "Pseudo-code": {
        fills: ["v_commande"],
        starter: "# ⚔️ L'enclume forge UNE épée à chaque tour de boucle.\n# La commande est dans v_commande : forge exactement cette quantité !\n\nv_epees = 0\n\npour i de 1 a ??? faire\n  v_epees = v_epees + 1\nfin pour",
        hints: [
          "Une épée par tour : il faut autant de tours que d'épées commandées.",
          "Le nombre de tours, c'est v_commande. Mets cette variable après le « a » du pour.",
          "La réponse : pour i de 1 a v_commande faire"
        ],
        goal: "Complète le `pour` pour forger **exactement** `v_commande` épées : écris **`v_commande`** à la place des `???`.",
        tips: [
          "`pour i de 1 a 3 faire` fait **3 tours** : `i` vaut 1, 2, puis 3.",
          "Ce qui est dans la boucle est refait à **chaque tour**, dans l'ordre.",
          "La commande change à chaque partie : utilise la variable `v_commande`, pas un nombre fixe."
        ],
        lesson: "Une **boucle** répète une action sans qu'on ait besoin de l'écrire 10 fois ! Avec `pour i de 1 a 5 faire`, l'action est faite **5 fois** (le compteur `i` vaut 1, 2, 3, 4, puis 5). Ce qui est répété est écrit entre `faire` et `fin pour`."
      }
    },
    8: {
      Python: { fills: ["v_marches + 1", "i"] },
      JavaScript: {
        fills: ["v_marches", "i"],
        starter: "// 🏯 Le temple a v_marches marches. La 1re donne 1 pièce, la 2e en donne 2, etc.\n// Additionne toutes les pièces dans v_total.\n\nlet v_total = 0;\nfor (let i = 1; i <= ???; i++) {\n  v_total = v_total + ???;\n}",
        hints: [
          "À chaque tour, ajoute à v_total le numéro de la marche : c'est la valeur de i.",
          "La dernière marche est v_marches : la boucle doit aller jusqu'à elle. Avec <=, le dernier tour est bien v_marches.",
          "La réponse : for (let i = 1; i <= v_marches; i++) {\n  v_total = v_total + i;\n}"
        ],
        goal: "Complète la boucle pour que **`v_total`** soit **1 + 2 + 3 + … jusqu'à `v_marches`**. Il y a **2 trous** à remplir : la fin de la boucle (après `<=`) et ce qu'on ajoute à chaque tour.",
        tips: [
          "`i` est le numéro de la marche en cours : 1, puis 2, puis 3…",
          "`i <= 4` va jusqu'à 4 **compris** ; `i < 4` s'arrêterait avant le 4.",
          TIP_STAIR
        ],
        lesson: "Une boucle peut **additionner au fur et à mesure** : on part d'une boîte à `0`, et à chaque tour on ajoute quelque chose dedans, comme une tirelire 🐷. Attention : `i < 5` s'arrête **avant** 5 ; pour aller **jusqu'à** 5, on écrit `i <= 5`."
      },
      "Pseudo-code": {
        fills: ["v_marches", "i"],
        starter: "# 🏯 Le temple a v_marches marches. La 1re donne 1 pièce, la 2e en donne 2, etc.\n# Additionne toutes les pièces dans v_total.\n\nv_total = 0\npour i de 1 a ??? faire\n  v_total = v_total + ???\nfin pour",
        hints: [
          "À chaque tour, ajoute à v_total le numéro de la marche : c'est la valeur de i.",
          "La dernière marche est v_marches : « pour i de 1 a … » doit aller jusqu'à elle.",
          "La réponse : pour i de 1 a v_marches faire\n  v_total = v_total + i\nfin pour"
        ],
        goal: "Complète la boucle pour que **`v_total`** soit **1 + 2 + 3 + … jusqu'à `v_marches`**. Il y a **2 trous** à remplir : la fin du `pour` (après `a`) et ce qu'on ajoute à chaque tour.",
        tips: [
          "`i` est le numéro de la marche en cours : 1, puis 2, puis 3…",
          "`pour i de 1 a 4` compte 1, 2, 3, 4 : le 4 est **compris**.",
          TIP_STAIR
        ],
        lesson: "Une boucle peut **additionner au fur et à mesure** : on part d'une boîte à `0`, et à chaque tour on ajoute quelque chose dedans, comme une tirelire 🐷. Avec `pour i de 1 a 5 faire`, `i` va de 1 **jusqu'à** 5 compris."
      }
    },
    9: {
      Python: { fills: ["i % 2 == 0"] },
      JavaScript: {
        fills: ["i % 2 == 0"],
        starter: "// 🔢 Les glitches sont numérotés de 1 à v_n. Les numéros PAIRS sont dangereux !\n// Compte-les dans v_pairs.\n// Astuce : un nombre est pair si le reste de sa division par 2 vaut 0.\n\nlet v_pairs = 0;\n\nfor (let i = 1; i <= v_n; i++) {\n  if (???) {\n    v_pairs = v_pairs + 1;\n  }\n}",
        hints: [
          "Un nombre est pair quand le reste de sa division par 2 est 0.",
          "Le reste s'obtient avec %. Pour comparer à 0, on écrit ==.",
          "La réponse : if (i % 2 == 0) {"
        ],
        goal: "Écris la condition qui reconnaît un numéro **pair**, pour compter combien il y en a de 1 à `v_n`. Remplace les `???` entre les parenthèses du `if`."
      },
      "Pseudo-code": {
        fills: ["i % 2 == 0"],
        starter: "# 🔢 Les glitches sont numérotés de 1 à v_n. Les numéros PAIRS sont dangereux !\n# Compte-les dans v_pairs.\n# Astuce : un nombre est pair si le reste de sa division par 2 vaut 0.\n\nv_pairs = 0\n\npour i de 1 a v_n faire\n  si ??? alors\n    v_pairs = v_pairs + 1\n  fin si\nfin pour",
        hints: [
          "Un nombre est pair quand le reste de sa division par 2 est 0.",
          "Le reste s'obtient avec %. Pour comparer à 0, on écrit ==.",
          "La réponse : si i % 2 == 0 alors"
        ],
        goal: "Écris la condition qui reconnaît un numéro **pair**, pour compter combien il y en a de 1 à `v_n`. Remplace les `???` entre `si` et `alors`."
      }
    },
    10: {
      Python: { fills: ["v_pv > 0"] },
      JavaScript: {
        fills: ["v_pv > 0"],
        starter: "// 👾 Le Glitch Gardien a 5 points de vie (v_pv).\n// Chaque tour de boucle = un coup d'épée de l'OctoCat.\n// Frappe tant qu'il lui reste des points de vie !\n\nlet v_pv = 5;\n\nwhile (???) {\n  v_pv = v_pv - 1;\n}",
        hints: [
          "while est suivi d'une condition entre parenthèses. La boucle continue tant que cette condition est vraie.",
          "Tant que le Gardien a des points de vie : compare v_pv à 0 avec « plus grand que ».",
          "La réponse : while (v_pv > 0) {"
        ],
        goal: "Complète le `while` : frappe le Gardien **tant qu'il lui reste des points de vie** (`v_pv` plus grand que 0). Remplace les `???` entre les parenthèses. Il doit tomber en **5 coups** exactement."
      },
      "Pseudo-code": {
        fills: ["v_pv > 0"],
        starter: "# 👾 Le Glitch Gardien a 5 points de vie (v_pv).\n# Chaque tour de boucle = un coup d'épée de l'OctoCat.\n# Frappe tant qu'il lui reste des points de vie !\n\nv_pv = 5\n\ntant que ??? faire\n  v_pv = v_pv - 1\nfin tant que",
        hints: [
          "tant que est suivi d'une condition. La boucle continue tant que cette condition est vraie.",
          "Tant que le Gardien a des points de vie : compare v_pv à 0 avec « plus grand que ».",
          "La réponse : tant que v_pv > 0 faire"
        ],
        goal: "Complète le `tant que` : frappe le Gardien **tant qu'il lui reste des points de vie** (`v_pv` plus grand que 0). Remplace les `???` entre `tant que` et `faire`. Il doit tomber en **5 coups** exactement.",
        lesson: "`tant que` veut dire « **tant que** » : la boucle recommence **tant que** sa condition est vraie. On s'en sert quand on ne sait pas combien de tours il faudra. Attention ! Si la condition ne devient **jamais** fausse, la boucle tourne **pour toujours** 😱. Il faut donc que quelque chose, dans la boucle, la fasse changer. (`pour` sert quand on connaît le nombre de tours.)"
      }
    }
  };

  function variantOf(id, lang) { return (V[id] && V[id][lang]) || null; }

  /** Copie du niveau écrite pour `lang` (le niveau d'origine n'est jamais modifié). Les exemples du briefing commencent par ce langage. */
  function apply(def, lang) {
    var v = variantOf(def.id, lang), b = Object.assign({}, def.briefing || {}), out;
    if (v) {
      if (v.goal) b.goal = v.goal;
      if (v.tips) b.tips = v.tips;
      if (v.lesson) b.lesson = v.lesson;
    }
    if (b.examples && b.examples[lang] != null) {
      var ex = {};
      ex[lang] = b.examples[lang];
      Object.keys(b.examples).forEach(function (name) { if (name !== lang) ex[name] = b.examples[name]; });
      b.examples = ex;
    }
    out = Object.assign({}, def, { briefing: b });
    if (v && v.starter) out.starter = v.starter;
    if (v && v.hints) out.hints = v.hints;
    return out;
  }

  /** Code de départ rempli avec la bonne réponse (seulement dans les lignes de code, pas dans les commentaires). */
  function solve(def, lang) {
    var v = variantOf(def.id, lang) || {}, py = variantOf(def.id, "Python") || {}, fills = (v.fills || py.fills || []).slice();
    var starter = apply(def, lang).starter;
    return starter.split("\n").map(function (line) {
      if (/^\s*(#|\/\/)/.test(line)) return line;
      return line.replace(/\?\?\?/g, function () { return fills.length ? fills.shift() : "???"; });
    }).join("\n");
  }

  window.OctoLangs = { LANGS: LANGS, INFO: INFO, apply: apply, solve: solve };
})();
