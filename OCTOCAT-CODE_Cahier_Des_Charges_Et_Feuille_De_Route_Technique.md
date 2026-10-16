
📄 CAHIER DES CHARGES & FEUILLE DE ROUTE TECHNIQUE

Projet : OctoCat-Code
Format : Jeu éducatif web interactif (Gamified Learning Experience)
Plateforme cible : Site statique propulsé par Material for MkDocs
Moteur de jeu : KAPLAY.js (Rendu Canvas HTML5 2D)

1. VISION DU PROJET & PITCH

OctoCat-Code est un jeu d'aventure rétro en 2D conçu pour enseigner les fondamentaux de la programmation (de la logique pure aux langages réels comme Python et JavaScript).
La particularité technique réside dans son architecture : le site web est le jeu. L'aventure narrative et les cours théoriques sont rédigés en Markdown via MkDocs. Chaque page (chapitre/niveau) intègre un canvas KAPLAY.js synchronisé avec un interpréteur de code personnalisé. Le joueur progresse physiquement dans l'univers 2D en résolvant des énigmes de programmation directement dans l'interface du site.

2. NARRATIF & UNIVERS (LORE)

• Le Protagoniste : L'OctoCat, la célèbre mascotte hybride (chat-pieuvre) de GitHub.
• Le Monde : GitHubia, un cyber-univers persistant et périlleux où les concepts informatiques prennent vie.
• Antagoniste / Enjeux : Le monde est corrompu par le Grand Kernel Crash. Les structures de données s'effondrent. L'OctoCat doit restaurer les fichiers sources en franchissant des Portails à Code jalonnés de monstres (Glitches, Boucles Infinies).

3. GAMEPLAY & SYSTÈMES CORE

• Boucle de Gameplay :
	1. Lecture du Lore / Notion de code (Markdown).
	2. Visualisation de la situation de blocage dans le canvas 2D (KAPLAY).
	3. Écriture / Complétion du code dans l'éditeur du site.
	4. Compilation/Validation → Déclenchement de l'animation de résolution en 2D → Redirection vers le niveau suivant.
• Courbe d'apprentissage synchrone :
	• Zone 1 (Facile) : Logique pure, pseudo-code ou langage fictif (ex: AVANCER()).
	• Zone 2 (Moyen) : Choix entre HTML/CSS ou JavaScript pour manipuler l'environnement.
	• Zone 3 (Difficile) : Choix entre Python ou JavaScript (Node) pour des concepts algorithmiques avancés (boucles, fonctions, tableaux).

4. BACKLOG TECHNIQUE & TO-DO LIST (À destination du Développeur)


📁 Étape 1 : Architecture & Configuration MkDocs

• Initialiser le repository avec une structure Material for MkDocs standard.
• Configurer le fichier mkdocs.yml :
	• Activer les extensions pymdownx.superfences (blocs de code) et pymdownx.tabbed (sélecteur de langage Python/JS).
	• Injecter globalement le CDN de KAPLAY.js via la propriété extra_javascript.
	• Déclarer les scripts JS spécifiques à chaque niveau (ex: javascripts/level1.js).
• Mettre en place le State Management (localStorage) :
	• Créer un script global de persistance pour sauvegarder la progression du joueur (niveaux débloqués, langage choisi, succès).
	• Empêcher l'accès aux niveaux supérieurs si les variables de session du localStorage ne valident pas le niveau précédent.

🎨 Étape 2 : Asset Pipeline & Intégration Graphique KAPLAY

• Définir la charte graphique globale : Style rétro 8-bits / 16-bits (Pixel Art) respectant la palette de couleurs "Dark Mode" de GitHub.
• Intégrer les Spritesheets :
	• Animations de l'OctoCat (Idle, Run, Success, Fail).
	• Assets d'environnement (Portails fermés/ouverts, plateformes, décors de la Forêt des Syntaxes).
	• Sprites des ennemis (Glitches, entités de code corrompues).
• Développer le template de Canvas standard :
	• Créer un composant HTML <canvas> réutilisable de 600 × 250px à injecter proprement au milieu du Markdown sans briser le responsive design du thème Material.

⚙️ Étape 3 : Système d'Interprétation & Évaluation du Code

• Développer la passerelle JS / Canvas :
	• Exposer une API globale (window.gameEngine) permettant à l'interface MkDocs de communiquer des événements au canvas KAPLAY.
• Concevoir le système de validation (Sandbox de validation) :
	• Pour la Zone 1 : Évaluer une chaîne de caractères simple (Regex ou QCM).
	• Pour les Zones 2 & 3 : Mettre en place un mini-interpréteur sécurisé capable de parser l'input de l'utilisateur (vérification de la syntaxe, présence des mots-clés requis comme while, if, ou la valeur numérique attendue).
• Gérer les retours visuels (Feedbacks UI/UX) :
	• Si Succès : Déclencher la fonction KAPLAY qui ouvre le portail, anime l'OctoCat qui traverse l'écran, puis exécute un window.location.href vers la page suivante.
	• Si Échec : Déclencher une animation d'erreur (secousse de l'écran shake(), animation d'attaque du monstre) et afficher un message d'aide à la compilation dans le bloc Markdown.

🎮 Étape 4 : Level Design du Vertical Slice (Niveau 1 : La Forêt des Syntaxes)

• Rédiger la page docs/index.md (Le hub de départ et l'introduction narrative).
• Créer le script docs/javascripts/level1.js :
	• Initialiser la scène avec l'OctoCat à gauche, un monstre au centre et le portail verrouillé à droite.
	• Coder l'énigme de niveau facile (Ex: Assignation d'une variable de vitesse v_speed = 200).
	• Lier le bouton HTML ⚡ Compiler à la fonction de vérification pour animer la résolution en direct.