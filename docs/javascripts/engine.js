/* OctoCat-Code — Moteur de jeu : une seule page, un canvas KAPLAY plein écran, des scènes.
 *
 * API publique : window.gameEngine
 *   registerScene(name, def)  scène autonome (le menu) : def.scene(k, h, ctx) -> { reset() }
 *   registerLevel(def)        niveau jouable (voir level1.js)
 *   on(event, cb)             'compile' | 'success' | 'fail' | 'hint'
 *   interpreter.run(code)     mini-interpréteur sécurisé (aucun eval)
 *   validators.*              regex / qcm / keywords / assignment
 *
 * Contrat d'un niveau :
 *   { id, title, zone, starter, hints[], briefing{ title, lore, lesson, examples, tips[], goal },
 *     validate(code, engine) -> {ok, messages[], data},
 *     scene(k, h, ctx) -> { success(result): Promise, fail(result): Promise, reset() } }
 * ctx = { go(sceneName), reserve (part basse de l'écran laissée à l'éditeur) }.
 */
(function () {
  "use strict";

  /* ======================================================================
   * 1. Mini-interpréteur sécurisé
   * Sous-ensemble commun à Python / JavaScript / pseudo-code : affectations de variables, nombres,
   * chaînes, booléens, + - * / %, comparaisons, et/ou/non, parenthèses, conditions if / sinon
   * et boucles while / for (plafonnées à 2000 tours).
   * Jamais d'eval ni de Function : parseur à liste blanche.
   * ==================================================================== */

  function stripComment(line) {
    var q = null;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { if (ch === q && line[i - 1] !== "\\") q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === "#") return line.slice(0, i);
      if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
    }
    return line;
  }

  function splitStatements(line) {
    var out = [], cur = "", q = null;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { cur += ch; if (ch === q && line[i - 1] !== "\\") q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === ";") { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); }).filter(Boolean);
  }

  var RESERVED = {
    and: 1, or: 1, not: 1, true: 1, false: 1, True: 1, False: 1, if: 1, else: 1, elif: 1,
    et: 1, ou: 1, non: 1, vrai: 1, faux: 1, si: 1, sinon: 1, alors: 1
  };
  var TRUE_WORDS = { true: 1, True: 1, vrai: 1 }, FALSE_WORDS = { false: 1, False: 1, faux: 1 };

  function tokenize(src) {
    var tokens = [], i = 0, m;
    while (i < src.length) {
      var rest = src.slice(i);
      if ((m = /^\s+/.exec(rest))) { i += m[0].length; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(rest))) { tokens.push({ t: "num", v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { tokens.push({ t: "id", v: m[0] }); i += m[0].length; continue; }
      if ((m = /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/.exec(rest))) {
        tokens.push({ t: "str", v: m[0].slice(1, -1) }); i += m[0].length; continue;
      }
      if ((m = /^(===|!==)/.exec(rest))) { tokens.push({ t: "op", v: m[0].slice(0, 2) }); i += 3; continue; } // comme en JavaScript
      if ((m = /^(==|!=|<=|>=|&&|\|\|)/.exec(rest))) { tokens.push({ t: "op", v: m[0] }); i += 2; continue; }
      if ("+-*/%()<>!".indexOf(rest[0]) >= 0) { tokens.push({ t: "op", v: rest[0] }); i++; continue; }
      if (rest[0] === "=") throw new Error("« = » donne une valeur à une variable ; pour comparer deux valeurs, utilise « == ».");
      throw new Error("caractère inattendu « " + rest[0] + " »");
    }
    return tokens;
  }

  /**
   * Évalue une expression : nombres, textes, booléens (true/false/True/False/vrai/faux), variables,
   * + - * / %, comparaisons (== != < > <= >=), et/ou/non (and or not && || !), parenthèses.
   * Jamais d'eval : parseur récursif descendant sur liste blanche.
   */
  function evalExpr(src, vars) {
    var toks = tokenize(src), p = 0;
    if (!toks.length) throw new Error("expression vide");
    function peek() { return toks[p]; }
    function isOp(v) { return peek() && peek().t === "op" && peek().v === v; }
    function isWord(list) { return peek() && peek().t === "id" && Object.prototype.hasOwnProperty.call(list, peek().v); }
    var AND = { and: 1, et: 1 }, OR = { or: 1, ou: 1 }, NOT = { not: 1, non: 1 };

    function atom() {
      var t = toks[p++];
      if (!t) throw new Error("expression incomplète");
      if (t.t === "num" || t.t === "str") return t.v;
      if (t.t === "id") {
        if (Object.prototype.hasOwnProperty.call(TRUE_WORDS, t.v)) return true;
        if (Object.prototype.hasOwnProperty.call(FALSE_WORDS, t.v)) return false;
        if (Object.prototype.hasOwnProperty.call(RESERVED, t.v)) throw new Error("« " + t.v + " » est un mot réservé, il ne peut pas être utilisé ici");
        if (!Object.prototype.hasOwnProperty.call(vars, t.v)) throw new Error("« " + t.v + " » n'est pas défini");
        return vars[t.v];
      }
      if (t.v === "(") {
        var v = orExpr();
        if (!isOp(")")) throw new Error("parenthèse fermante « ) » manquante");
        p++;
        return v;
      }
      if (t.v === "-") return -num(atom());
      throw new Error("« " + t.v + " » est inattendu ici");
    }
    function num(v) {
      if (typeof v === "string") throw new Error("opération impossible sur du texte");
      if (typeof v !== "number") throw new Error("opération impossible sur un booléen");
      return v;
    }
    function prod() {
      var v = atom();
      while (isOp("*") || isOp("/") || isOp("%")) {
        var o = toks[p++].v, r = atom();
        if (o === "*") v = num(v) * num(r);
        else if (num(r) === 0) throw new Error("division par zéro");
        else v = o === "/" ? num(v) / r : num(v) % r;
      }
      return v;
    }
    function sum() {
      var v = prod();
      while (isOp("+") || isOp("-")) {
        var o = toks[p++].v, r = prod();
        if (o === "+") v = (typeof v === "string" || typeof r === "string") ? String(v) + String(r) : num(v) + num(r);
        else v = num(v) - num(r);
      }
      return v;
    }
    function compare(a, op, b) {
      if (op === "==") return a === b;
      if (op === "!=") return a !== b;
      if (typeof a !== typeof b || typeof a === "boolean") throw new Error("comparaison impossible entre " + kind(a) + " et " + kind(b));
      return op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b;
    }
    function kind(v) { return typeof v === "number" ? "un nombre" : typeof v === "string" ? "du texte" : "un booléen"; }
    function comparison() {
      var left = sum(), result = null;
      while (peek() && peek().t === "op" && /^(==|!=|<=|>=|<|>)$/.test(peek().v)) {
        var op = toks[p++].v, right = sum(), ok = compare(left, op, right);
        result = result === null ? ok : result && ok; // a < b < c : comme en Python
        left = right;
      }
      return result === null ? left : result;
    }
    function notExpr() {
      if (isOp("!") || isWord(NOT)) { p++; return !truthy(notExpr()); }
      return comparison();
    }
    function andExpr() {
      var v = notExpr();
      while (isOp("&&") || isWord(AND)) { p++; var r = notExpr(); v = truthy(v) && truthy(r); }
      return v;
    }
    function orExpr() {
      var v = andExpr();
      while (isOp("||") || isWord(OR)) { p++; var r = andExpr(); v = truthy(v) || truthy(r); }
      return v;
    }
    var result = orExpr();
    if (p < toks.length) throw new Error("« " + toks[p].v + " » est inattendu ici");
    return result;
  }

  function truthy(v) { return !!v; }

  var ASSIGN = /^(?:(?:let|const|var)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*(.*)$/;

  /* --- structure du programme : affectations et conditions (if / sinon) en trois écritures --------------
   *   Python      if cond:  /  elif cond:  /  else:        (blocs par indentation, ou une seule ligne)
   *   JavaScript  if (cond) {  /  } else if (cond) {  /  } else {  /  }
   *   Pseudo-code si cond alors  /  sinon si cond alors  /  sinon  /  fin si
   * ----------------------------------------------------------------------------------------------------- */

  /** Lignes utiles : { n: numéro, indent, text }. */
  function logicalLines(code) {
    var out = [];
    String(code).split(/\r?\n/).forEach(function (raw, idx) {
      var body = stripComment(raw), text = body.trim();
      if (!text) return;
      out.push({ n: idx + 1, indent: /^[ \t]*/.exec(body)[0].replace(/\t/g, "    ").length, text: text });
    });
    return out;
  }

  /** Reconnaît un en-tête de condition ; renvoie { style, kind: if|elif|else|end, cond, rest } ou null. */
  /** Découpe « a, b » au niveau supérieur (hors parenthèses). */
  function splitArgs(src) {
    var out = [], depth = 0, cur = "";
    for (var i = 0; i < src.length; i++) {
      var ch = src[i];
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  }

  function classify(text) {
    var m;
    // boucles
    if ((m = /^while\s*(\(.*\))\s*\{\s*$/.exec(text))) return { style: "js", kind: "while", cond: m[1] };
    if ((m = /^for\s*\(\s*(?:let|var|const)?\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*;\s*([A-Za-z_]\w*)\s*(<=|<)\s*(.+?)\s*;\s*([A-Za-z_]\w*)\s*(?:\+\+|\+=\s*1)\s*\)\s*\{\s*$/.exec(text)) && m[3] === m[1] && m[6] === m[1]) {
      return { style: "js", kind: "for", name: m[1], from: m[2], to: m[5], inclusive: m[4] === "<=" };
    }
    if ((m = /^tant\s+que\s+(.+?)\s+faire\s*$/i.exec(text))) return { style: "fr", kind: "while", cond: m[1] };
    if ((m = /^pour\s+([A-Za-z_]\w*)\s+de\s+(.+?)\s+[aà]\s+(.+?)\s+faire\s*$/i.exec(text))) {
      return { style: "fr", kind: "for", name: m[1], from: m[2], to: m[3], inclusive: true };
    }
    if ((m = /^while\s+(.+?)\s*:\s*(.*)$/.exec(text))) return { style: "py", kind: "while", cond: m[1], rest: m[2] };
    if ((m = /^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)\s*:\s*(.*)$/.exec(text))) {
      var args = splitArgs(m[2]);
      if (args.length === 1 && args[0]) return { style: "py", kind: "for", name: m[1], from: "0", to: args[0], inclusive: false, rest: m[3] };
      if (args.length === 2) return { style: "py", kind: "for", name: m[1], from: args[0], to: args[1], inclusive: false, rest: m[3] };
      return { style: "py", kind: "for", name: m[1], bad: "range() attend un ou deux nombres : range(5) ou range(1, 6).", rest: m[3] };
    }
    if ((m = /^if\s*(\(.*\))\s*\{\s*$/.exec(text))) return { style: "js", kind: "if", cond: m[1] };
    if ((m = /^\}\s*else\s+if\s*(\(.*\))\s*\{\s*$/.exec(text))) return { style: "js", kind: "elif", cond: m[1] };
    if (/^\}\s*else\s*\{\s*$/.test(text)) return { style: "js", kind: "else" };
    if (/^\}\s*;?\s*$/.test(text)) return { style: "js", kind: "end" };
    if ((m = /^si\s+(.+?)\s+alors\s*$/i.exec(text))) return { style: "fr", kind: "if", cond: m[1] };
    if ((m = /^sinon\s+si\s+(.+?)\s+alors\s*$/i.exec(text))) return { style: "fr", kind: "elif", cond: m[1] };
    if (/^sinon\s*:?\s*$/i.test(text)) return { style: "fr", kind: "else" };
    if (/^fin\s*(si|tant\s*que|pour)\s*$/i.test(text)) return { style: "fr", kind: "end" };
    if ((m = /^if\s+(.+?)\s*:\s*(.*)$/.exec(text))) return { style: "py", kind: "if", cond: m[1], rest: m[2] };
    if ((m = /^elif\s+(.+?)\s*:\s*(.*)$/.exec(text))) return { style: "py", kind: "elif", cond: m[1], rest: m[2] };
    if ((m = /^else\s*:\s*(.*)$/.exec(text))) return { style: "py", kind: "else", rest: m[1] };
    return null;
  }

  /** Transforme les lignes en arbre ; les erreurs de structure sont ajoutées à `errors`. */
  function parseProgram(lines, errors) {
    var i = 0;

    function simple(stmtText, n) {
      var nodes = [];
      splitStatements(stmtText).forEach(function (stmt) {
        var m = ASSIGN.exec(stmt);
        if (m) {
          if (Object.prototype.hasOwnProperty.call(RESERVED, m[1])) errors.push({ line: n, msg: "« " + m[1] + " » est un mot réservé : choisis un autre nom de variable." });
          else nodes.push({ type: "assign", line: n, name: m[1], op: m[2], expr: m[3] });
          return;
        }
        var cmp = /^[A-Za-z_]\w*\s*==/.exec(stmt);
        var cond = /^(if|si|elif|else|sinon|while|for|tant|pour)\b/i.test(stmt);
        errors.push({
          line: n,
          msg: cmp ? "« == » compare deux valeurs ; pour donner une valeur à une variable, utilise un seul « = »."
            : cond ? "ligne de bloc mal écrite : en Python termine par « : », en JavaScript écris if (…) { ou while (…) {, en pseudo-code si … alors / tant que … faire."
              : "instruction non reconnue : « " + stmt + " »"
        });
      });
      return nodes;
    }

    function seq(isStop) {
      var nodes = [];
      while (i < lines.length && !isStop(lines[i])) {
        var L = lines[i], h = classify(L.text);
        if (h && h.kind === "if") nodes.push(parseIf());
        else if (h && (h.kind === "while" || h.kind === "for")) nodes.push(parseLoop());
        else if (h) {
          errors.push({ line: L.n, msg: h.kind === "end" ? "« " + L.text + " » ferme un bloc qui n'a jamais été ouvert." : "« " + L.text.split(/\s|:|\{/)[0] + " » sans « if / si » avant." });
          i++;
        } else { nodes.push.apply(nodes, simple(L.text, L.n)); i++; }
      }
      return nodes;
    }

    function isFrStop(x) {
      var c = classify(x.text);
      return !!c && c.style === "fr" && (c.kind === "else" || c.kind === "elif" || c.kind === "end");
    }

    function parseLoop() {
      var hl = lines[i], h = classify(hl.text), style = h.style, indent0 = hl.indent, body, c;
      i++;
      if (style === "py") {
        if (h.rest) body = simple(h.rest, hl.n);
        else {
          body = seq(function (x) { return x.indent <= indent0; });
          if (!body.length) errors.push({ line: hl.n, msg: "le bloc est vide : écris au moins une instruction, indentée, sous cette ligne." });
        }
      } else if (style === "js") {
        body = seq(function (x) { return x.text.charAt(0) === "}"; });
        c = lines[i] ? classify(lines[i].text) : null;
        if (c && c.style === "js" && c.kind === "end") i++;
        else errors.push({ line: hl.n, msg: "accolade fermante « } » manquante pour cette boucle." });
      } else {
        body = seq(isFrStop);
        c = lines[i] ? classify(lines[i].text) : null;
        if (c && c.style === "fr" && c.kind === "end") i++;
        else errors.push({ line: hl.n, msg: "« fin tant que » / « fin pour » manquant pour cette boucle." });
      }
      if (h.bad) { errors.push({ line: hl.n, msg: h.bad }); return { type: "noop" }; }
      return { type: h.kind, line: hl.n, cond: h.cond, name: h.name, from: h.from, to: h.to, inclusive: h.inclusive, body: body };
    }

    function parseIf() {
      var hl = lines[i], h = classify(hl.text), style = h.style, indent0 = hl.indent;
      var node = { type: "if", line: hl.n, branches: [], other: null };
      i++;
      var cur = { cond: h.cond, line: hl.n, body: [] }, rest = h.rest, inElse = false;
      for (;;) {
        var body;
        if (style === "py") {
          if (rest) body = simple(rest, hl.n);
          else {
            body = seq(function (x) { return x.indent <= indent0; });
            if (!body.length) errors.push({ line: hl.n, msg: "le bloc est vide : écris au moins une instruction, indentée, sous cette ligne." });
          }
        } else if (style === "js") {
          body = seq(function (x) { return x.text.charAt(0) === "}"; });
        } else {
          body = seq(isFrStop);
        }
        if (inElse) node.other = body; else { cur.body = body; node.branches.push(cur); }

        var nx = lines[i], c = nx ? classify(nx.text) : null;
        if (style === "py") {
          if (nx && nx.indent === indent0 && c && c.style === "py" && !inElse && (c.kind === "elif" || c.kind === "else")) {
            hl = nx; rest = c.rest; i++;
            if (c.kind === "elif") cur = { cond: c.cond, line: nx.n, body: [] }; else inElse = true;
            continue;
          }
          return node;
        }
        if (!c || c.style !== style) {
          errors.push({ line: hl.n, msg: style === "js" ? "accolade fermante « } » manquante pour ce if." : "« fin si » manquant pour ce « si »." });
          return node;
        }
        if (c.kind === "end") { i++; return node; }
        if (inElse) { errors.push({ line: nx.n, msg: "rien ne peut suivre « sinon » avant la fin du bloc." }); i++; return node; }
        hl = nx; i++;
        if (c.kind === "elif") cur = { cond: c.cond, line: nx.n, body: [] }; else inElse = true;
      }
    }

    return seq(function () { return false; });
  }

  var MAX_LOOPS = 2000; // garde-fou : une boucle qui ne s'arrête jamais ne fige pas la page

  function tick(tally, line) {
    tally.loops++;
    if (tally.loops > MAX_LOOPS) throw { limit: true, line: line };
  }

  function exec(nodes, vars, errors, tally) {
    nodes.forEach(function (nd) {
      if (nd.type === "noop") return;
      if (nd.type === "while") {
        for (;;) {
          var go;
          try { go = truthy(evalExpr(nd.cond, vars)); }
          catch (e) { errors.push({ line: nd.line, msg: e.message }); return; }
          if (!go) return;
          tick(tally, nd.line);
          exec(nd.body, vars, errors, tally);
        }
      }
      if (nd.type === "for") {
        var from, to;
        try { from = evalExpr(nd.from, vars); to = evalExpr(nd.to, vars); }
        catch (e) { errors.push({ line: nd.line, msg: e.message }); return; }
        if (typeof from !== "number" || typeof to !== "number") { errors.push({ line: nd.line, msg: "les bornes d'une boucle for doivent être des nombres." }); return; }
        var last = nd.inclusive ? to : to - 1;
        for (var n = from; n <= last; n++) {
          vars[nd.name] = n;
          tick(tally, nd.line);
          exec(nd.body, vars, errors, tally);
        }
        return;
      }
      if (nd.type === "assign") {
        try {
          var val = evalExpr(nd.expr, vars);
          if (nd.op !== "=") {
            if (!Object.prototype.hasOwnProperty.call(vars, nd.name)) throw new Error("« " + nd.name + " » n'est pas défini");
            val = evalExpr(nd.name + nd.op[0] + "(" + nd.expr + ")", vars);
          }
          vars[nd.name] = val;
          tally.count++;
        } catch (e) { errors.push({ line: nd.line, msg: e.message }); }
        return;
      }
      for (var b = 0; b < nd.branches.length; b++) {
        var branch = nd.branches[b], yes;
        try { yes = truthy(evalExpr(branch.cond, vars)); }
        catch (e) { errors.push({ line: branch.line, msg: e.message }); return; }
        if (yes) { exec(branch.body, vars, errors, tally); return; }
      }
      if (nd.other) exec(nd.other, vars, errors, tally);
    });
  }

  /** Exécute `code` et renvoie { vars, errors:[{line, msg}], statements }. */
  function run(code, env) {
    var vars = Object.assign({}, env || {}), errors = [], tally = { count: 0, loops: 0 };
    try { exec(parseProgram(logicalLines(code), errors), vars, errors, tally); }
    catch (e) {
      if (!e || !e.limit) throw e;
      errors.push({ line: e.line, msg: "plus de " + MAX_LOOPS + " tours de boucle : elle ne s'arrête jamais ? Vérifie que sa condition finit par devenir fausse." });
    }
    errors.sort(function (a, b) { return a.line - b.line; });
    return { vars: vars, errors: errors, statements: tally.count, loops: tally.loops };
  }

  /* ======================================================================
   * 2. Validateurs (zones 1, 2 et 3)
   * ==================================================================== */

  var validators = {
    /** Zone 1 : correspondance par expression régulière. */
    regex: function (code, re) {
      return { ok: re.test(code.trim()) };
    },
    /** Zone 1 : QCM — `answer` est l'index attendu. */
    qcm: function (choice, answer) {
      return { ok: choice === answer };
    },
    /** Zones 2/3 : mots-clés requis / interdits (while, if, for…). */
    keywords: function (code, opts) {
      var src = code.split(/\r?\n/).map(stripComment).join("\n");
      var missing = (opts.required || []).filter(function (w) { return !new RegExp("\\b" + w + "\\b").test(src); });
      var forbidden = (opts.forbidden || []).filter(function (w) { return new RegExp("\\b" + w + "\\b").test(src); });
      return { ok: !missing.length && !forbidden.length, missing: missing, forbidden: forbidden };
    },
    /** Vérifie qu'une variable vaut la valeur attendue après exécution. */
    assignment: function (code, name, expected) {
      var res = run(code);
      var has = Object.prototype.hasOwnProperty.call(res.vars, name);
      return {
        ok: !res.errors.length && has && res.vars[name] === expected,
        run: res, defined: has, value: res.vars[name]
      };
    }
  };

  /* ======================================================================
   * 3. Moteur : une seule page, un seul canvas plein écran, plusieurs scènes
   *    (hub + niveaux) et une interface de jeu en surimpression (briefing, éditeur, console).
   * ==================================================================== */

  var levels = {};
  var scenes = {};
  var listeners = {};
  var mounted = [];

  function emit(ev, payload) { (listeners[ev] || []).forEach(function (cb) { try { cb(payload); } catch (e) { console.error(e); } }); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function wait(k, s) { return new Promise(function (res) { k.wait(s, res); }); }

  /** Interpolation sur `dur` secondes ; fn(eased, raw) est appelée à chaque frame. */
  function tween(k, dur, fn, ease) {
    ease = ease || function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
    return new Promise(function (res) {
      var t = 0, c;
      c = k.onUpdate(function () {
        t += k.dt();
        var p = Math.min(t / dur, 1);
        fn(ease(p), p);
        if (p >= 1) { c.cancel(); res(); }
      });
    });
  }

  /** Musique : no-op si music.js n'est pas chargé (tests Node). */
  function music() {
    return window.OctoMusic || { unlock: function () {}, setMood: function () {}, setBattle: function () {}, isRunning: function () { return false; }, setVolume: function () {}, getVolume: function () { return 0.8; }, hit: function () {}, victory: function () {}, toggle: function () { return false; }, isMuted: function () { return false; } };
  }

  /* ---------- Interface de jeu (HTML en surimpression du canvas) ---------- */

  function createUI(host, hooks) {
    var root = el("div", "octo-ui");
    // --- fenêtre de briefing / dialogue ---
    var dialog = el("div", "octo-dialog"), card = el("div", "octo-dialog__card");
    dialog.appendChild(card);
    // --- panneau de code ---
    var panel = el("div", "octo-panel");
    var bar = el("div", "octo-panel__bar"), title = el("span", "octo-panel__title"), goal = el("span", "octo-panel__goal");
    bar.appendChild(title); bar.appendChild(goal);
    var editor = el("textarea", "octo-editor");
    editor.spellcheck = false;
    editor.setAttribute("autocapitalize", "off");
    editor.setAttribute("aria-label", "Éditeur de code");
    var actions = el("div", "octo-actions");
    var bCompile = el("button", "octo-btn octo-btn--primary", "⚡ Compiler");
    var bReset = el("button", "octo-btn", "↺ Réinitialiser");
    var bHint = el("button", "octo-btn", "💡 Indice");
    var bBrief = el("button", "octo-btn", "📜 Briefing");
    var bMenu = el("button", "octo-btn octo-btn--right", "⌂ Menu");
    [bCompile, bReset, bHint, bBrief, bMenu].forEach(function (b) { b.type = "button"; actions.appendChild(b); });
    var wallet = el("span", "octo-wallet", "🪙 0");
    wallet.setAttribute("title", "Tes pièces : elles servent à acheter des indices 💡");
    bBrief.after(wallet);
    var hintsBox = el("div", "octo-hints"); // les indices déjà payés restent affichés ici
    hintsBox.setAttribute("aria-live", "polite");
    var confirmBox = el("div", "octo-confirm"); // « tu veux vraiment la réponse ? » (vide = caché)
    confirmBox.setAttribute("role", "alertdialog");
    var head = el("div", "octo-panel__head");
    head.appendChild(bar); head.appendChild(hintsBox); head.appendChild(confirmBox);
    var konsole = el("pre", "octo-console");
    konsole.setAttribute("aria-live", "polite");
    panel.appendChild(head); panel.appendChild(editor); panel.appendChild(actions); panel.appendChild(konsole);
    root.appendChild(dialog); root.appendChild(panel);
    // bouton son : la musique démarre au premier geste, ce bouton la coupe / la relance
    var audio = el("div", "octo-audio");
    var mute = el("button", "octo-mute", music().isMuted() ? "♪ OFF" : "♪ ON");
    mute.type = "button";
    mute.setAttribute("aria-label", "Activer ou couper la musique");
    function syncMute() { mute.textContent = music().isMuted() ? "♪ OFF" : "♪ ON"; }
    mute.addEventListener("click", function () {
      var m = music();
      if (!m.isMuted() && !m.isRunning()) m.unlock(); // son « activé » mais pas encore démarré : ce clic le lance
      else m.toggle();
      syncMute(); mute.blur();
    });
    var vol = el("input", "octo-vol");
    vol.type = "range"; vol.min = "0"; vol.max = "100"; vol.step = "5";
    vol.value = String(Math.round(music().getVolume() * 100));
    vol.setAttribute("aria-label", "Volume de la musique");
    vol.addEventListener("input", function () {
      var m = music();
      m.setVolume(vol.value / 100);
      if (m.isMuted() && vol.value > 0) m.toggle(); // toucher au volume rallume le son
      else if (!m.isRunning() && !m.isMuted()) m.unlock();
      syncMute();
    });
    vol.addEventListener("change", function () { vol.blur(); });
    audio.appendChild(mute); audio.appendChild(vol);
    root.appendChild(audio);
    if (window.OctoSettings) window.OctoSettings.mountButton(audio); // ⚙ réglages (touches, son, affichage, remise à zéro)
    document.addEventListener("octo:audio", syncMute);
    host.appendChild(root);

    var def = null;
    // Les indices doux coûtent 5 pièces ; le DERNIER donne la réponse toute faite : 15 pièces (un trajet moyen en rapporte ~10), avec une demande de confirmation.
    var HINT_PRICE = 5, ANSWER_PRICE = 15;
    function hintPrice(i, total) { return total && i >= total - 1 ? ANSWER_PRICE : HINT_PRICE; }
    function isAnswerHint(i) { var t = (def && def.hints || []).length; return t > 0 && i === t - 1; }

    /** Affiche ce qui est payé (indices + mission), le prix du prochain indice et les pièces en poche. */
    function refreshHints() {
      if (!def) return;
      var P = window.OctoProgress, hints = def.hints || [], n = Math.min(P.paidHints(def.id), hints.length), coins = P.coins(), i;
      hintsBox.textContent = "";
      for (i = 0; i < n; i++) {
        var line = el("div", "octo-hint");
        line.appendChild(document.createTextNode("💡 Indice " + (i + 1) + "/" + hints.length + " : "));
        hintsBox.appendChild(rich(line, hints[i]));
      }
      var goalText = (def.briefing && def.briefing.goal) || "", locked = hints.length > 0 && n === 0;
      goal.textContent = "";
      goal.classList.toggle("is-locked", locked);
      if (locked) goal.textContent = "🔒 La mission s'affiche ici quand tu achètes un indice 💡";
      else rich(goal, goalText); // **gras** et `code` en vrais éléments (pas de signes visibles)
      wallet.textContent = "🪙 " + coins;
      if (n >= hints.length) { bHint.textContent = "💡 Plus d'indice"; bHint.disabled = !!hints.length; bHint.classList.remove("is-poor"); }
      else {
        var pr = hintPrice(n, hints.length);
        bHint.disabled = false; bHint.textContent = (isAnswerHint(n) ? "💡 La réponse · " : "💡 Indice · ") + pr + " 🪙"; bHint.classList.toggle("is-poor", coins < pr);
      }
      if (!isAnswerHint(n)) confirmBox.textContent = ""; // plus de question en attente
    }
    document.addEventListener("octo:progress", refreshHints);

    function log(text, kind) {
      konsole.appendChild(el("div", "octo-console__line" + (kind ? " octo-console__line--" + kind : ""), text));
      konsole.scrollTop = konsole.scrollHeight;
    }

    function show(node, on) {
      node.classList.toggle("is-open", !!on);
      // énigme (fenêtre ou éditeur ouverts) : la souris reste visible partout, même en plein écran
      document.documentElement.classList.toggle("octo-puzzle", dialog.classList.contains("is-open") || panel.classList.contains("is-open"));
    }

    /** Texte enrichi sans innerHTML : `code` devient une pastille de code, **gras** devient du gras (les deux peuvent s'imbriquer). */
    function rich(node, text) {
      var re = /\*\*(.+?)\*\*|`([^`]+)`/g, last = 0, m;
      text = String(text);
      while ((m = re.exec(text))) {
        if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
        if (m[1] != null) { var strong = el("strong"); rich(strong, m[1]); node.appendChild(strong); }
        else node.appendChild(el("code", "octo-key", m[2]));
        last = re.lastIndex;
      }
      if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
      return node;
    }
    function label(text) { return el("div", "octo-dialog__label", text); }

    function openBriefing(then) {
      var b = def.briefing || {};
      card.textContent = "";
      card.appendChild(el("h2", "octo-dialog__title", b.title || def.title));
      if (b.lore) { card.appendChild(label("📖 L'histoire")); card.appendChild(rich(el("p", "octo-dialog__lore"), b.lore)); }
      if (b.lesson) { card.appendChild(label("🧠 Pour comprendre")); card.appendChild(rich(el("p", "octo-dialog__text"), b.lesson)); }
      // la mission passe avant les exemples : c'est ce qu'il faut absolument voir (surtout sur petit écran)
      if (b.goal) { var g = el("div", "octo-dialog__goal"); g.appendChild(el("div", "octo-dialog__goal-title", "🎯 TA MISSION")); g.appendChild(rich(el("p", "octo-dialog__goal-text"), b.goal)); card.appendChild(g); }
      if (b.examples) {
        card.appendChild(label("👀 Regarde un exemple"));
        var tabs = el("div", "octo-tabs"), code = el("pre", "octo-dialog__code");
        Object.keys(b.examples).forEach(function (name, i) {
          var t = el("button", "octo-tab" + (i === 0 ? " is-on" : ""), name);
          t.type = "button";
          t.addEventListener("click", function () {
            Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove("is-on"); });
            t.classList.add("is-on"); code.textContent = b.examples[name];
            if (name === "Python" || name === "JavaScript") window.OctoProgress.setLanguage(name);
          });
          tabs.appendChild(t);
          if (i === 0) code.textContent = b.examples[name];
        });
        card.appendChild(tabs); card.appendChild(code);
      }
      if ((b.tips || []).length) card.appendChild(label("💡 Petits conseils"));
      (b.tips || []).forEach(function (t) { var p = el("p", "octo-dialog__tip", "▸ "); card.appendChild(rich(p, t)); });
      var foot = el("div", "octo-dialog__foot");
      var go = el("button", "octo-btn octo-btn--primary", def.comingSoon ? "◂ RETOUR AU MENU" : "J'AI COMPRIS, JE JOUE ! ▶");
      go.type = "button";
      go.addEventListener("click", function () {
        show(dialog, false);
        if (def.comingSoon) hooks.menu(); else { show(panel, true); editor.focus(); }
        if (then) then();
      });
      foot.appendChild(go); card.appendChild(foot);
      show(dialog, true);
      go.focus();
    }

    function setBusy(b) { bCompile.disabled = b; bReset.disabled = b; }

    bCompile.addEventListener("click", function () { hooks.compile(); });
    bMenu.addEventListener("click", function () { hooks.menu(); });
    bReset.addEventListener("click", function () {
      editor.value = def.starter; konsole.textContent = "";
      log("// Le code est revenu au début. Tu peux recommencer !", "dim");
      hooks.reset();
    });
    bBrief.addEventListener("click", function () { show(panel, false); openBriefing(function () { show(panel, true); }); });
    bHint.addEventListener("click", function () {
      var P = window.OctoProgress, hints = def.hints || [], n = P.paidHints(def.id);
      if (!hints.length || n >= hints.length) return;
      var price = hintPrice(n, hints.length);
      if (P.coins() < price) { refreshHints(); refuse(n, price); return; } // pas assez de pièces : refus (gentil), rien n'est payé ni montré
      if (isAnswerHint(n)) { askAnswer(n, price); return; } // la réponse toute faite : on demande d'abord
      buyHint(price);
    });
    function buyHint(price) {
      var P = window.OctoProgress;
      confirmBox.textContent = "";
      if (!P.payHint(def.id, price)) { refreshHints(); return; }
      P.grant("curious");
      emit("hint", { level: def.id });
      refreshHints(); // « octo:progress » l'a déjà fait, mais on ne dépend pas de l'ordre des écouteurs
      log("💡 Indice acheté (−" + price + " 🪙). Il reste affiché en haut.", "dim");
    }
    /** Pas assez de pièces : un refus rigolo, avec ce qu'il manque et comment en gagner. Rien n'est payé. */
    function refuse(n, price) {
      var have = window.OctoProgress.coins(), lack = price - have, answer = isAnswerHint(n);
      confirmBox.textContent = "";
      var msg = el("div", "octo-confirm__text");
      rich(msg, answer
        ? "🐕 **Ouaf, refusé !** Laita a fouillé ta poche : la réponse toute faite coûte **" + price + " 🪙** et tu n'en as que **" + have + "**. Il t'en manque **" + lack + "** ! Ramasse des pièces (et cherche les trous secrets 🤫), ou creuse-toi la tête : tu en es capable ! 💪"
        : "🐕 **Ouaf, la poche est trop légère !** Cet indice coûte **" + price + " 🪙** et tu en as **" + have + "**. Il t'en manque **" + lack + "** : ramasse des pièces pendant les trajets, ou relis le 📜 Briefing, il est gratuit !");
      var row = el("div", "octo-confirm__row"), ok = el("button", "octo-btn", "OK, je cherche encore !");
      ok.type = "button";
      ok.addEventListener("click", function () { confirmBox.textContent = ""; });
      row.appendChild(ok); confirmBox.appendChild(msg); confirmBox.appendChild(row);
      confirmBox.classList.add("is-refused");
      log("🪙 Pas assez de pièces (" + have + "/" + price + ").", "hint");
    }
    /** Avertissement avant l'indice qui donne la réponse : il faut confirmer. */
    function askAnswer(n, price) {
      var coins = window.OctoProgress.coins();
      confirmBox.textContent = ""; confirmBox.classList.remove("is-refused");
      var msg = el("div", "octo-confirm__text");
      rich(msg, "⚠️ **Attention !** Cet indice te donne **la réponse toute faite** : il n'y aura plus rien à chercher. Il coûte **" + price + " 🪙** (tu en as " + coins + "). Tu veux vraiment le payer ?");
      var row = el("div", "octo-confirm__row");
      var yes = el("button", "octo-btn octo-btn--warn", "Oui, je paie " + price + " 🪙"), no = el("button", "octo-btn", "Non, je garde mes pièces");
      yes.type = "button"; no.type = "button";
      yes.addEventListener("click", function () { buyHint(price); });
      no.addEventListener("click", function () { confirmBox.textContent = ""; log("👍 D'accord, tes pièces sont gardées.", "dim"); });
      row.appendChild(yes); row.appendChild(no);
      confirmBox.appendChild(msg); confirmBox.appendChild(row);
      no.focus(); // par sécurité, « Non » est sélectionné d'office
    }
    editor.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey) { // indentation plutôt que perte de focus
        e.preventDefault();
        var s = editor.selectionStart, t = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + "  " + editor.value.slice(t);
        editor.selectionStart = editor.selectionEnd = s + 2;
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); hooks.compile();
      }
    });

    return {
      log: log, setBusy: setBusy,
      clearLog: function () { konsole.textContent = ""; },
      code: function () { return editor.value; },
      /** Hub : aucune interface. */
      hide: function () { show(dialog, false); show(panel, false); def = null; },
      /** Niveau : briefing d'abord, puis éditeur. */
      showLevel: function (d) {
        def = d; confirmBox.textContent = "";
        title.textContent = "NIVEAU " + d.id + " · " + d.title;
        refreshHints();
        editor.value = d.starter || "";
        editor.rows = Math.max(4, (d.starter || "").split("\n").length + 1);
        konsole.textContent = "";
        log("// Écris ta réponse à la place des ???, puis clique sur ⚡ Compiler (ou Ctrl+Entrée).", "dim");
        setBusy(false); show(panel, false);
        openBriefing();
      }
    };
  }

  /* ---------- Jeu : KAPLAY plein écran + scènes ---------- */

  function startGame(host) {
    if (typeof window.kaplay !== "function") {
      host.appendChild(el("p", "octo-hero__error", "KAPLAY n'a pas pu être chargé : le jeu est indisponible."));
      return null;
    }
    var canvas = el("canvas", "octo-canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "OctoCat-Code : un jeu d'aventure pour apprendre à programmer");
    var stage = el("div", "octo-stage");
    stage.appendChild(canvas); host.appendChild(stage);
    // téléphone en portrait : le jeu se joue en paysage
    var rotate = el("div", "octo-rotate");
    rotate.appendChild(el("p", "octo-rotate__icon", "↻"));
    rotate.appendChild(el("p", "octo-rotate__text", "TOURNE TON APPAREIL"));
    rotate.appendChild(el("p", "octo-rotate__sub", "Le jeu se joue en mode paysage."));
    host.appendChild(rotate);

    // Hauteur logique selon le format de la fenêtre : le monde (600 de large) tient toujours en entier.
    var dpr = window.devicePixelRatio || 1;
    var aspect = window.innerWidth / window.innerHeight;
    var H = Math.round(Math.min(360, Math.max(250, 600 / aspect)));
    var W = Math.max(200, Math.round(H * aspect));
    var k = window.kaplay({
      canvas: canvas, width: W, height: H, global: false,
      background: [13, 17, 23], crisp: true, texFilter: "nearest",
      focus: false, debug: false, touchToMouse: false,
      pixelDensity: Math.min(window.OctoFX && window.OctoFX.modest() ? 4 : 6, Math.max(1, window.innerHeight * dpr / H)) // net sur grands écrans ; plafonné à 4 sur appareils modestes
    });
    canvas.style.width = "100%"; canvas.style.height = "100%";
    var rawShake = k.shake; // « secousses de l'écran » : réglable dans le menu ⚙
    k.shake = function (n) { if (!window.OctoSettings || window.OctoSettings.get("shake")) rawShake.call(k, n); };
    window.OctoSprites.registerAll(k);
    if (window.OctoSprites.registerRun) window.OctoSprites.registerRun(k);
    // apparences : « octo » et « laita » deviennent « octo-sN » / « laita-sN » selon le tour (N = 0 à 3), lu au moment où l'objet est créé
    var rawSprite = k.sprite, skinMemo = null;
    document.addEventListener("octo:progress", function () { skinMemo = null; });
    k.sprite = function (name, opt) {
      if (name === "octo" || name === "laita") {
        if (skinMemo === null) skinMemo = window.OctoProgress ? window.OctoProgress.skin() : 0;
        if (skinMemo) name = name + "-s" + skinMemo;
      }
      return rawSprite.call(k, name, opt);
    };
    if (window.OctoLogo) window.OctoLogo.register(k); // lettres du logo de l'accueil
    var applyFx = window.OctoFX ? window.OctoFX.install(k) : function () {}; // post-traitement (halo, étalonnage)
    var helpers = {
      wait: function (s) { return wait(k, s); },
      tween: function (d, fn, e) { return tween(k, d, fn, e); },
      palette: window.OctoSprites.palette
    };

    // les navigateurs n'autorisent le son qu'après un geste : le premier clic ou la première touche lance la musique
    function unlockAudio(e) {
      if (e && e.target && e.target.closest && e.target.closest(".octo-audio")) return; // les commandes du son gèrent leur propre clic
      music().unlock();
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    }
    document.addEventListener("pointerdown", unlockAudio);
    document.addEventListener("keydown", unlockAudio);

    var P = window.OctoProgress, cur = { name: null, def: null, ctrl: null }, busy = false;
    if (/[?&]unlock=all\b/.test(window.location.search)) P.unlockAll();

    function nextName(id) { return levels[id + 1] ? "level" + (id + 1) : "hub"; }

    /** Navigation : "hub", "levelN" (trajet puis énigme ; opts.skip = directement l'énigme). */
    function goTo(name, opts) {
      var m = /^level(\d+)$/.exec(name), target = name;
      if (m && !P.isUnlocked(parseInt(m[1], 10))) { name = "hub"; target = "hub"; m = null; }
      else if (m && levels[m[1]] && levels[m[1]].run && !(opts && opts.skip)) target = "run" + m[1];
      busy = false;
      document.documentElement.setAttribute("data-octo-scene", name); // le menu ⚙ s'en sert (bouton « Accueil » seulement hors de l'accueil)
      try { window.history.replaceState(null, "", name === "hub" ? window.location.pathname : "#" + name); } catch { /* ignoré */ }
      k.go(target);
    }

    document.addEventListener("octo:home", function () { goTo("hub"); }); // bouton « Accueil » du menu ⚙

    var ui = createUI(host, {
      menu: function () { goTo("hub"); },
      reset: function () { if (cur.ctrl && cur.ctrl.reset) cur.ctrl.reset(); },
      compile: function () {
        var def = cur.def;
        if (busy || !def || !def.validate || !cur.ctrl) return;
        emit("compile", { level: def.id });
        ui.clearLog();
        ui.log("$ octo-compile niveau-" + def.id, "dim");
        var result;
        try { result = def.validate(ui.code(), api); }
        catch (e) { result = { ok: false, messages: ["Erreur interne du validateur : " + e.message] }; }
        (result.messages || []).forEach(function (m) { ui.log(m, result.ok ? "ok" : "err"); });
        busy = true; ui.setBusy(true);
        if (result.ok) {
          var gained = P.complete(def.id), lapUp = gained.lap; // lapUp : "lap" (tour fini) ou "end" (3e tour fini : crédits)
          ui.log("✔ Bravo, ça marche ! 🎉", "ok");
          gained.forEach(function (key) { ui.log("🏆 Succès débloqué : " + P.achievements[key].title, "gold"); });
          emit("success", { level: def.id, result: result });
          music().victory();
          cur.ctrl.success(result).then(function () {
            ui.log(lapUp === "end" ? "→ Les crédits arrivent…" : lapUp === "lap" ? "→ Tour terminé ! Retour à l'accueil…" : levels[def.id + 1] ? "→ Le portail s'ouvre vers le niveau suivant…" : "→ Retour au menu…", "dim");
            window.setTimeout(function () { goTo(lapUp === "end" && scenes.credits ? "credits" : nextName(def.id)); }, 600);
          });
        } else {
          P.recordFail(def.id);
          ui.log("✗ Pas encore… lis le message ci-dessus et réessaie : tu peux y arriver ! (Le bouton 💡 Indice t'aide, il coûte des pièces 🪙.)", "err");
          emit("fail", { level: def.id, result: result });
          music().hit();
          cur.ctrl.fail(result).then(function () { busy = false; ui.setBusy(false); });
        }
      }
    });

    // Easter egg des torches (scenery.js) : la magie ouvre le portail sans avoir résolu l'énigme. Rien n'est validé (ni pièces, ni succès de niveau,
    // ni fin de tour) : on débloque seulement le niveau suivant. Le moteur refuse pendant une animation (compilation en cours).
    var magicTaken = false;
    document.addEventListener("octo:magic", function (e) {
      if (busy || !cur.def || !/^level\d+$/.test(cur.name || "") || !e.detail) return;
      magicTaken = true; busy = true; ui.setBusy(true); e.detail.take = true;
      ui.log("✨ La magie ouvre le portail… même sans la solution !", "gold");
    });
    document.addEventListener("octo:magic-exit", function () {
      if (!magicTaken || !cur.def) return;
      magicTaken = false;
      ui.log(levels[cur.def.id + 1] ? "→ Tu passes le portail vers le niveau suivant (l'énigme t'attendra si tu reviens !)" : "→ Retour à l'accueil…", "dim");
      P.unlockAfter(cur.def.id);
      window.setTimeout(function () { goTo(nextName(cur.def.id)); }, 300);
    });

    function leave() { magicTaken = false; if (cur.ctrl && cur.ctrl.destroy) cur.ctrl.destroy(); cur.ctrl = null; }

    /** Trajet au clavier (plateformes / beat'em up) avant l'énigme du niveau. */
    function enterRun(def) {
      leave();
      cur.name = "run" + def.id; cur.def = null;
      ui.hide();
      music().setMood(0); music().setBattle(false);
      applyFx();
      cur.ctrl = window.OctoPlay.createRun(k, helpers, def, { finish: function () { goTo("level" + def.id, { skip: true }); } });
      canvas.focus();
    }

    function enter(name, def, isLevel) {
      leave();
      cur.name = name; cur.def = def; cur.ctrl = null;
      music().setMood(isLevel && def.mood != null ? def.mood : 0);
      music().setBattle(isLevel && !!def.combat); // combat : musique épique, seulement pour les niveaux qui le demandent
      var ctx = { go: goTo, host: host, name: name, reserve: isLevel ? 0.4 : 0 };
      applyFx();
      cur.ctrl = def.scene(k, helpers, ctx);
      if (isLevel) ui.showLevel(window.OctoLangs ? window.OctoLangs.apply(def, P.lang()) : def); else { ui.hide(); canvas.focus(); }
    }

    Object.keys(scenes).forEach(function (name) { k.scene(name, function () { enter(name, scenes[name], false); }); });
    Object.keys(levels).forEach(function (id) {
      k.scene("level" + id, function () { enter("level" + id, levels[id], true); });
      if (levels[id].run && window.OctoPlay) k.scene("run" + id, function () { enterRun(levels[id]); });
    });

    // Reprise : #levelN rouvre le niveau (s'il est débloqué), sinon on démarre au menu.
    var start = /^#level\d+$/.test(window.location.hash) ? window.location.hash.slice(1) : "hub";
    if (/^level\d+$/.test(start) && !(levels[start.slice(5)] && P.isUnlocked(parseInt(start.slice(5), 10)))) start = "hub";
    if (P.creditsPending() && scenes.credits) start = "credits"; // le jeu est fini mais les crédits n'ont pas été vus (page fermée en route)
    k.onLoad(function () { goTo(start); });

    // Le format de la fenêtre a changé : on recompose la vue (rechargement). Jamais en plein écran : recharger la page
    // le ferait quitter (écran noir puis retour à la fenêtre) ; le canvas garde alors son format et s'entoure de bandes (CSS).
    var timer = null;
    host.style.setProperty("--octo-aspect", (W / H).toFixed(4));
    function relayout() {
      if (document.fullscreenElement) return;
      if (Math.abs(window.innerWidth / window.innerHeight / aspect - 1) > 0.06) window.location.reload();
    }
    window.addEventListener("resize", function () { window.clearTimeout(timer); timer = window.setTimeout(relayout, 400); });
    // Plein écran : la souris est cachée (même dans un niveau) ; un clic molette la montre ou la cache à nouveau.
    var root = document.documentElement, cursorToast = null;
    function toast(text) {
      if (!cursorToast) { cursorToast = el("div", "octo-toast"); host.appendChild(cursorToast); }
      cursorToast.textContent = text; cursorToast.classList.add("is-on");
      window.clearTimeout(cursorToast.__t); cursorToast.__t = window.setTimeout(function () { cursorToast.classList.remove("is-on"); }, 2600);
    }
    document.addEventListener("mousedown", function (e) {
      if (e.button !== 1 || !document.fullscreenElement) return;
      e.preventDefault();
      toast(root.classList.toggle("octo-hide-cursor") ? "Souris cachée · clic molette pour la montrer" : "Souris visible · clic molette pour la cacher");
    });
    document.addEventListener("auxclick", function (e) { if (e.button === 1 && document.fullscreenElement) e.preventDefault(); });
    // Plein écran : le clic droit sert à lancer le shuriken, pas à ouvrir le menu du navigateur (sauf dans un champ de texte : coller).
    document.addEventListener("contextmenu", function (e) {
      if (!document.fullscreenElement) return;
      var t = e.target && e.target.tagName;
      if (t !== "TEXTAREA" && t !== "INPUT") e.preventDefault();
    });
    document.addEventListener("fullscreenchange", function () {
      root.classList.toggle("octo-fs-on", !!document.fullscreenElement);
      var hide = !!document.fullscreenElement && (!window.OctoSettings || window.OctoSettings.get("hideCursor") !== false);
      root.classList.toggle("octo-hide-cursor", hide);
      if (hide) toast("Souris cachée · clic molette pour la montrer");
      window.clearTimeout(timer);
      if (!document.fullscreenElement) timer = window.setTimeout(relayout, 900); // retour à la fenêtre : format redevenu normal, sinon on recompose
    });

    host.__kaplay = k;
    return { k: k, goTo: goTo };
  }

  function mountGame(host) {
    if (host.__octo) return;
    host.__octo = true;
    host.classList.add("octo-hero");
    host.innerHTML = "";
    if (startGame(host)) mounted.push(host);
  }

  var api = {
    version: "0.2.0",
    interpreter: { run: run, evalExpr: evalExpr },
    validators: validators,
    registerLevel: function (def) { levels[def.id] = def; },
    registerScene: function (name, def) { scenes[name] = def; },
    on: function (ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return api; },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll(".octo-scene[data-fullscreen]"), mountGame);
    },
    get levels() { return levels; },
    get mounted() { return mounted; }
  };

  window.gameEngine = api;

  function boot() { api.mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
