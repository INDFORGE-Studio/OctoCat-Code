/* OctoCat-Code — La tour (monde de Python) : construction de la grille d'un trajet vertical, et le robot qui la monte.
 * Module PUR (comme playsim.js, dont il réutilise la simulation « platform » : on ne fabrique ici que la grille).
 *
 * On grimpe un puits en zigzag : une suite de plateformes, chacune 1 ou 2 rangées plus haut que la précédente, qui vont vers la droite puis
 * reviennent vers la gauche, comme un serpent qui monte. Le sol du bas est plein : on ne tombe jamais dans le vide, une chute ramène sur une plateforme plus bas.
 *
 *       ┌──┐ ┌────┐          plateforme 5  →  on repart vers la droite…
 *       │ 4│ │ 3 │ ┌──┐     (chaque saut : 2 rangées de haut au plus, 1 colonne de vide au plus)
 *       └──┘ └────┘ │ 2│
 *       ▒▒▒▒▒▒▒▒▒▒▒▒└──┘
 *
 * spec = { platforms: [ { w, gap, rise, bits, candles, en, tough, hop, dash, fly, spikes, crumble, cp, gapBit, secret }, … ] }  (du bas vers le haut ; la première est le sol,
 *   la dernière est le sommet avec le terminal). Les colonnes `bits`, `en`… se comptent depuis le bord gauche de la plateforme (0 à w-1).
 *   w        largeur en colonnes (3 à 10)             gap   colonnes de vide avant celle-ci (0 à 1)         rise  hauteur de la marche (1 ou 2 rangées)
 *   crumble  la plateforme s'effrite quand on s'y pose
 *   gapBit   une pièce en l'air au milieu du vide qui précède (elle guide le saut)
 *   secret   une petite plateforme à côté, derrière 2 colonnes de vide, porte un portail doré : il mène à la salle secrète
 */
(function () {
  "use strict";

  var S = window.OctoSim, TILE = S.TILE;
  var COLS = 18;

  function buildTower(spec) {
    var list = spec.platforms, n = list.length, i;
    var totalRise = 0;
    for (i = 1; i < n; i++) totalRise += list[i].rise || 2;
    var R = totalRise + 9, rows = [], r, c;
    for (r = 0; r < R; r++) { rows.push([]); for (c = 0; c < COLS; c++) rows[r].push(" "); }
    function put(cc, rr, ch) { if (rr >= 0 && rr < R && cc >= 0 && cc < COLS) rows[rr][cc] = ch; }

    // le sol : plein sur toute la largeur (rangées du bas), le joueur part à gauche
    var floorRow = R - 1, plats = [{ l: 0, r: COLS - 1, ty: floorRow, floor: true }];
    for (c = 0; c < COLS; c++) put(c, floorRow, "#");
    put(1, floorRow - 1, "S");

    var ty = floorRow, warp = null, secrets = [];
    // Les plateformes vont par PAIRES de même sens : la 1re de la paire est atteinte par un saut par-dessus `gap` colonnes de vide (1 ou 2),
    // la 2e est collée à la 1re (une simple marche). Les paires alternent droite / gauche, et chaque demi-tour recule de `gap` colonnes par rapport à la 1re
    // plateforme de la paire d'avant : ainsi le bord d'où l'on saute n'est jamais sous la plateforme qui se trouve 4 rangées plus haut (le plafond serait trop bas).
    function layout(A) {
      var pos = [null], q;
      for (q = 1; q < n; q++) {
        var pp = list[q], pw = pp.w || 4, firstOf = (q - 1) % 2 === 0, m = Math.floor((q - 1) / 2), dm = m % 2 === 0 ? 1 : -1, g = Math.max(0, pp.gap != null ? pp.gap : 1), ll;
        if (q === 1) ll = A;
        else if (firstOf) { var a0 = pos[q - 2]; ll = dm < 0 ? a0.r - g - pw + 1 : a0.l + g; }
        else { var f0 = pos[q - 1]; ll = dm > 0 ? f0.r + 1 : f0.l - pw; }
        if (ll < 0 || ll + pw > COLS) return null;
        pos[q] = { l: ll, r: ll + pw - 1 };
      }
      return pos;
    }
    var placed = null, A;
    for (A = 4; A <= 13 && !placed; A++) placed = layout(A);
    if (!placed) throw new Error("tour : les plateformes ne tiennent pas dans la largeur");
    for (i = 1; i < n; i++) {
      var p = list[i], w = p.w || 4, rise = p.rise || 2, l = placed[i].l, rr;
      ty -= rise;
      var pl = { l: l, r: l + w - 1, ty: ty, crumble: !!p.crumble };
      plats.push(pl);
      for (c = pl.l; c <= pl.r; c++) {
        put(c, ty, p.crumble ? "~" : "#");
        if (i === 1) for (rr = ty + 1; rr < floorRow; rr++) put(c, rr, "#"); // la 1re marche est un bloc posé sur le sol
      }
      var base = ty - 1; // rangée juste au-dessus de la plateforme
      function feat(offs, ch, up) { (offs || []).forEach(function (o) { if (o >= 0 && o < w) put(pl.l + o, base - (up || 0), ch); }); }
      feat(p.bits, "o"); feat(p.candles, "c"); feat(p.en, "e"); feat(p.tough, "E"); feat(p.hop, "h"); feat(p.dash, "d"); feat(p.spikes, "^"); feat(p.fly, "f", 2);
      if (p.cp) put(pl.l + Math.min(1, w - 1), base, "C");
      if (p.gapBit && i > 1) { // une pièce en l'air dans le vide qui précède (sur la trajectoire du saut)
        var prv = plats[i - 1], gx = pl.l > prv.r ? prv.r + 1 : pl.r + 1;
        if (pl.l > prv.r + 1 || pl.r + 1 < prv.l) put(gx, ty, "o");
      }
      if (i === n - 1) put(pl.l + Math.max(0, Math.min(w - 1, p.end != null ? p.end : w - 2)), base, "T");
      if (p.secret) secrets.push(pl);
    }

    // salle secrète : une petite plateforme (3 colonnes) à côté d'une plateforme marquée `secret`, derrière 2 colonnes de vide, au même niveau ;
    // elle ne doit gêner aucun saut du parcours (aucune autre plateforme à moins de 4 rangées, ni au-dessus ni en dessous, sur ses colonnes)
    var order = [];
    secrets.forEach(function (sp) { // la plateforme marquée d'abord, puis les plus proches (on cherche une place libre)
      var at = plats.indexOf(sp);
      plats.map(function (q, qi) { return { q: q, d: Math.abs(qi - at) }; }).filter(function (e) { return !e.q.floor && e.q !== plats[plats.length - 1]; }) // (jamais sur la dernière : le terminal se trouve sur le chemin du portail et finit le niveau)
        .sort(function (u, v) { return u.d - v.d; }).forEach(function (e) { if (order.indexOf(e.q) < 0) order.push(e.q); });
    });
    order.forEach(function (pl) {
      if (warp) return;
      [-1, 1].forEach(function (side) {
        if (warp) return;
        var sl = side < 0 ? pl.l - 2 - 3 : pl.r + 3;
        if (sl < 0 || sl + 3 > COLS || pl.ty > floorRow - 4 || (sl < 4 && pl.ty > floorRow - 5)) return; // (assez haut pour ne jamais coiffer le joueur sur le sol, surtout près du départ)
        var clear = plats.every(function (q) {
          if (q === pl || q.floor) return true;
          return Math.abs(q.ty - pl.ty) > 3 || q.r < sl - 1 || q.l > sl + 3;
        });
        if (!clear) return;
        for (c = sl; c < sl + 3; c++) put(c, pl.ty, "#");
        // le portail est au BOUT de la petite plateforme (côté opposé au vide d'où l'on saute), les deux pièces sont avant lui : aucune pièce « derrière » le portail
        var wc = side < 0 ? sl : sl + 2;
        put(side < 0 ? sl + 1 : sl, pl.ty - 1, "o"); put(side < 0 ? sl + 2 : sl + 1, pl.ty - 1, "o");
        warp = { l: wc * TILE - 4, r: (wc + 1) * TILE + 4, t: (pl.ty - 2) * TILE, b: pl.ty * TILE, out: { x: (side < 0 ? pl.l + 0.5 : pl.r + 0.5) * TILE, y: pl.ty * TILE } };
      });
    });
    if (secrets.length && !warp) { // pas de place en hauteur : le portail doré est sur le sol de départ, tout à gauche (derrière le départ), les pièces sont avant la 1re marche
      // (jamais à droite de la 1re marche : cette poche sous la 2e plateforme est un cul-de-sac, on ne peut pas en remonter)
      var c0 = Math.max(2, placed[1].l - 5);
      [0, 1].forEach(function (d) { put(c0 + d, floorRow - 1, "o"); });
      warp = { l: -4, r: TILE + 4, t: (floorRow - 2) * TILE, b: floorRow * TILE, out: { x: 2.5 * TILE, y: floorRow * TILE } };
    }

    var grid = rows.map(function (row) { return row.join(""); });
    grid.tower = { cols: COLS, rows: R, platforms: plats };
    grid.route = plats.map(function (q) { return { l: q.l, r: q.r, x: (q.l + q.r + 1) / 2 * TILE, y: q.ty * TILE, crumble: q.crumble }; });
    if (warp) grid.warp = warp;
    return grid;
  }

  /** Les mesures de la tour (décor, tests) : hauteur totale et nombre de plateformes. */
  function towerInfo(grid) { return { heightPx: grid.tower.rows * TILE, widthPx: COLS * TILE, platforms: grid.tower.platforms.length }; }

  /**
   * Le robot de test de la tour : il vise la plus basse plateforme située plus haut que ses pieds, marche vers elle et saute au bord ;
   * en l'air il se dirige vers son centre. Il attaque ce qui est devant lui et saute par-dessus les pics.
   */
  function towerBot(sim) {
    var p = sim.player, route = sim.route, ab = sim.abilities || {}, jumpHold = 0, want = 1; // want : plateforme visée (on ne la change qu'au sol : en plein saut on garde son but)
    function solidAt(x, y) {
      var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (tx < 0 || tx >= sim.solid[0].length) return true;
      if (ty < 0 || ty >= sim.solid.length) return false;
      return sim.solid[ty][tx];
    }
    return function (dt) {
      var inp = { left: false, right: false, jump: false, attack: false, throw: false };
      var tgt = null, i, tx, tyy;
      if (p.onGround) { want = route.length; for (i = 0; i < route.length; i++) if (route[i].y < p.y - 10) { want = i; break; } }
      tgt = route[want] || null;
      if (tgt) { tx = tgt.x; tyy = tgt.y; } else { tx = sim.terminal.x; tyy = sim.terminal.y; }
      var dx = tx - p.x, dirx = dx >= 0 ? 1 : -1;
      var near = tgt ? (p.x < tgt.l * TILE ? tgt.l * TILE - p.x : p.x > (tgt.r + 1) * TILE ? p.x - (tgt.r + 1) * TILE : 0) : Math.abs(dx);
      var above = tgt && tyy < p.y - 10;
      var floorAhead = solidAt(p.x + dirx * 14, p.y + 4);
      if (Math.abs(dx) > 5) { inp.right = dx > 0; inp.left = dx < 0; }
      var spikeAhead = sim.spikes.some(function (s) { return (s.l - p.x) * dirx > 0 && Math.abs(s.l - p.x) < 46 && Math.abs(s.b - p.y) < 40; });
      var enemy = null;
      sim.enemies.forEach(function (e) { if (e.alive && (e.x - p.x) * dirx > 0 && Math.abs(e.x - p.x) < 64 && Math.abs(e.y - p.y) < 50) enemy = e; });
      if (enemy) {
        var edx = Math.abs(enemy.x - p.x);
        if (ab.shuriken && edx > 36) inp.throw = sim.time % 0.4 < 0.2;
        if (edx < 52) inp.attack = sim.time % 0.5 < 0.25;
      }
      var wantJump = false;
      if (p.onGround) {
        if (above && (near < 18 || !floorAhead)) wantJump = true;
        if (spikeAhead) wantJump = true;
        if (!above && !floorAhead && tgt && tyy >= p.y - 10) wantJump = false; // plus bas : on se laisse tomber
        jumpHold = 0;
      }
      if (wantJump) { inp.jump = !sim._lastJump; jumpHold = 0.36; }
      else if (jumpHold > 0 && !p.onGround) { inp.jump = true; jumpHold -= dt; }
      // double saut : en retombant près du niveau de la cible, tant qu'on n'est pas au-dessus d'elle
      if (!p.onGround && sim.botDouble && p.jumps < 2 && p.vy > 0 && near > 4 && p.y > tyy - 48) inp.jump = !sim._lastJump; // (en retombant juste sous le niveau de la plateforme visée, pas encore au-dessus d'elle)
      sim._lastJump = inp.jump;
      return inp;
    };
  }

  var basePlatformBot = S.platformBot;
  S.platformBot = function (sim) { return sim.vertical ? towerBot(sim) : basePlatformBot(sim); };
  S.buildTower = buildTower;
  S.towerInfo = towerInfo;
  S.TOWER = { COLS: COLS };
})();
