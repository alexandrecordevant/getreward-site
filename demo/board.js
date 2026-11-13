/* Boards de démo GetReward : portefeuille cliquable, fiche détaillée, trésorerie à 13 semaines, formulaire.
   Données fictives, fournies par chaque page (window.BOARD). Aucun appel réseau sauf le formulaire. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var STATE = { ok: '✓ Sous contrôle', warn: '! À surveiller', bad: '✕ À traiter' };
  var FLAG = { warn: '! À surveiller', bad: '✕ À traiter' };

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(v, unit) {
    var s = Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
    return (v < 0 ? '−' : '') + s + ' ' + (unit || 'k€');
  }
  function pill(s) { return '<span class="pill ' + s + '">' + STATE[s] + '</span>'; }

  function chart(box, ent, weeks, unit, withScen) {
    box.innerHTML = '';
    var base = ent.treso, scen = withScen && ent.scenario ? base.map(function (v, i) { return Math.round((v + ent.scenario.delta[i]) * 10) / 10; }) : null;
    var W = 680, H = 270, L = 52, R = 18, T = 18, B = 30;
    var all = base.concat(scen || [], [ent.seuil ? ent.seuil.v : 0, 0]);
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var span = hi - lo || 1; lo -= span * 0.12; hi += span * 0.1;
    var x = function (i) { return L + i * (W - L - R) / (base.length - 1); };
    var y = function (v) { return T + (hi - v) * (H - T - B) / (hi - lo); };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Trésorerie prévue sur 13 semaines pour ' + ent.name });
    // grille et axe
    var raw = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 5, 10].filter(function (m) { return m * mag >= raw; })[0] * mag;
    for (var g = Math.ceil(lo / step) * step; g <= hi; g += step) {
      svg('line', { x1: L, x2: W - R, y1: y(g), y2: y(g), stroke: g === 0 ? 'var(--muted)' : 'var(--grid)', 'stroke-width': g === 0 ? 1.5 : 1 }, s);
      var t = svg('text', { x: L - 8, y: y(g) + 4, 'text-anchor': 'end' }, s); t.textContent = fmt(Math.round(g * 10) / 10, '');
    }
    weeks.forEach(function (w, i) {
      if (i % 2) return;
      var t = svg('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, s); t.textContent = w;
    });
    // seuil
    if (ent.seuil) {
      svg('line', { x1: L, x2: W - R, y1: y(ent.seuil.v), y2: y(ent.seuil.v), stroke: 'var(--bad)', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }, s);
      var st = svg('text', { x: W - R, y: y(ent.seuil.v) - 6, 'text-anchor': 'end', style: 'fill:var(--bad);font-weight:600' }, s);
      st.textContent = ent.seuil.label;
    }
    // aire et courbe de base
    var pts = base.map(function (v, i) { return x(i) + ',' + y(v); });
    svg('path', { d: 'M' + x(0) + ',' + y(Math.max(lo, Math.min(0, hi))) + 'L' + pts.join('L') + 'L' + x(base.length - 1) + ',' + y(Math.max(lo, Math.min(0, hi))) + 'Z', fill: 'var(--s1)', opacity: .1 }, s);
    svg('path', { d: 'M' + pts.join('L'), fill: 'none', stroke: 'var(--s1)', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
    if (scen) svg('path', { d: 'M' + scen.map(function (v, i) { return x(i) + ',' + y(v); }).join('L'), fill: 'none', stroke: 'var(--s2)', 'stroke-width': 2.5, 'stroke-dasharray': '7 5', 'stroke-linecap': 'round' }, s);
    // point bas
    function low(arr, color, above) {
      var m = 0; arr.forEach(function (v, i) { if (v < arr[m]) m = i; });
      svg('circle', { cx: x(m), cy: y(arr[m]), r: 6, fill: color, stroke: 'var(--surface)', 'stroke-width': 2 }, s);
      var t = svg('text', { x: Math.min(Math.max(x(m), L + 60), W - R - 60), y: y(arr[m]) + (above ? -12 : 22), 'text-anchor': 'middle', style: 'fill:var(--ink);font-weight:700' }, s);
      t.textContent = 'Point bas ' + fmt(arr[m], unit);
    }
    low(base, 'var(--s1)', false);
    if (scen) low(scen, 'var(--s2)', true);
    // survol
    var cross = svg('line', { y1: T, y2: H - B, stroke: 'var(--muted)', 'stroke-width': 1, opacity: 0 }, s);
    var hit = svg('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' }, s);
    box.appendChild(s);
    var tip = el('div', { class: 'tip', hidden: '' }); box.appendChild(tip);
    function move(ev) {
      var r = s.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
      var i = Math.max(0, Math.min(base.length - 1, Math.round((px - L) / ((W - L - R) / (base.length - 1)))));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
      tip.innerHTML = '<b>Semaine du ' + weeks[i] + '</b><br><i style="background:var(--s1)"></i>Prévu : ' + fmt(base[i], unit) +
        (scen ? '<br><i style="background:var(--s2)"></i>' + ent.scenario.short + ' : ' + fmt(scen[i], unit) : '') +
        (ent.events && ent.events[i] ? '<br><span style="color:var(--muted)">' + ent.events[i] + '</span>' : '');
      tip.hidden = false;
      tip.style.left = (x(i) * r.width / W) + 'px';
      tip.style.top = (y(Math.max(base[i], scen ? scen[i] : -Infinity)) * r.height / H) + 'px';
    }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', function () { tip.hidden = true; cross.setAttribute('opacity', 0); });
    // légende et tableau
    var lg = el('div', { class: 'legend' }, '<span><i style="border-color:var(--s1)"></i>Trésorerie prévue</span>' +
      (scen ? '<span><i style="border-color:var(--s2);border-top-style:dashed"></i>' + ent.scenario.short + '</span>' : '') +
      (ent.seuil ? '<span><i style="border-color:var(--bad);border-top-style:dashed"></i>' + ent.seuil.label + '</span>' : ''));
    box.appendChild(lg);
    var rows = weeks.map(function (w, i) {
      return '<tr><td>' + w + '</td><td class="num">' + fmt(base[i], unit) + '</td>' + (scen ? '<td class="num">' + fmt(scen[i], unit) + '</td>' : '') +
        '<td>' + (ent.events && ent.events[i] || '') + '</td></tr>';
    }).join('');
    box.appendChild(el('details', {}, '<summary>Voir les chiffres semaine par semaine</summary><div class="tablewrap"><table><thead><tr><th>Semaine du</th><th class="num">Prévu</th>' +
      (scen ? '<th class="num">' + ent.scenario.short + '</th>' : '') + '<th>Ce qui tombe</th></tr></thead><tbody>' + rows + '</tbody></table></div>'));
  }

  function detail(box, ent, B) {
    var kp = ent.kpis.map(function (k) {
      return '<div class="kpi' + (k.s ? ' ' + k.s : '') + '"><span>' + k.l + '</span><b>' + k.v + '</b>' +
        (k.s ? '<small class="flag">' + FLAG[k.s] + '</small>' : '') + (k.n ? '<small>' + k.n + '</small>' : '') + '</div>';
    }).join('');
    var al = ent.alertes.map(function (a) { return '<div class="alert ' + a.s + '"><b>' + (a.s === 'ok' ? '✓ ' : a.s === 'warn' ? '! ' : '✕ ') + a.t + '</b><p>' + a.x + '</p></div>'; }).join('');
    box.innerHTML =
      '<div class="dhead"><div><h3 style="font-size:1.5rem">' + ent.name + '</h3><p>' + ent.sub + '</p></div>' + pill(ent.state) + '</div>' +
      '<div class="kpis">' + kp + '</div>' +
      '<div class="card chartcard"><h3>Trésorerie prévue, 13 semaines</h3><p>' + (B.chartNote || 'Calculée depuis la banque, les factures à encaisser et à payer, les échéances sociales et fiscales.') + '</p><div class="chart"></div>' +
      (ent.scenario ? '<label class="scen"><input type="checkbox"><span>Simuler : ' + ent.scenario.label + '<small>' + ent.scenario.note + '</small></span></label>' : '') + '</div>' +
      '<div class="cols"><div><h3 style="margin-bottom:12px">Ce que l\'IA a repéré</h3><div class="alerts">' + al + '</div></div>' +
      '<div class="mot"><h3>' + (B.motTitre || 'Le commentaire du mois, préparé par l\'IA') + '</h3>' + ent.mot + '<p class="sig">' + (B.motSig || 'Brouillon à relire et à corriger avant envoi. Rien ne part sans vous.') + '</p></div></div>';
    var c = box.querySelector('.chart'), cb = box.querySelector('.scen input');
    chart(c, ent, B.weeks, B.unit, false);
    if (cb) cb.addEventListener('change', function () { chart(c, ent, B.weeks, B.unit, cb.checked); });
  }

  window.GRBoard = function (B) {
    var pf = document.getElementById('pf'), det = document.getElementById('detail');
    var head = '<tr>' + B.columns.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + '>' + c.h + '</th>'; }).join('') + '<th>État</th></tr>';
    var body = B.entities.map(function (e, i) {
      return '<tr data-i="' + i + '" aria-selected="false">' + e.cells.map(function (v, j) {
        return j === 0 ? '<td><button type="button" aria-controls="detail"><b>' + e.name + '</b><span>' + v + '</span></button></td>'
          : '<td' + (B.columns[j].num ? ' class="num"' : '') + '>' + v + '</td>';
      }).join('') + '<td>' + pill(e.state) + '</td></tr>';
    }).join('');
    pf.innerHTML = '<div class="tablewrap"><table class="pf"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
    function pick(i, scroll) {
      pf.querySelectorAll('tbody tr').forEach(function (r) { r.setAttribute('aria-selected', String(+r.dataset.i === i)); });
      detail(det, B.entities[i], B);
      if (scroll) det.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    pf.addEventListener('click', function (ev) { var r = ev.target.closest('tr[data-i]'); if (r) pick(+r.dataset.i, true); });
    pick(B.start || 0, false);
  };

  // Formulaire : Google Apps Script si ENDPOINT est renseigné, sinon e-mail prérempli.
  window.GRForm = function (domaine, endpoint) {
    var f = document.getElementById('f'); if (!f) return;
    var err = f.querySelector('.err'), send = f.querySelector('button[type=submit]'), label = send.textContent;
    var ref = ''; try { ref = (new URLSearchParams(location.search).get('r') || '').replace(/[^0-9A-Za-z-]/g, '').slice(0, 20); } catch (e) {}
    if (f.ref) f.ref.value = ref;
    if (endpoint && ref) try { fetch(endpoint, { method: 'POST', mode: 'no-cors', keepalive: true, body: new URLSearchParams({ type: 'vue', domaine: domaine, ref: ref }) }); } catch (e) {}
    function fail(m) { err.textContent = m; err.hidden = false; err.focus(); }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); err.hidden = true;
      if (!f.checkValidity()) { var bad = f.querySelector(':invalid:not(form)'); fail('Il manque une réponse : ' + (bad.closest('label').firstChild.textContent.trim() || 'un champ')); bad.focus(); return; }
      if (f.site && f.site.value) return;
      var data = new URLSearchParams(new FormData(f)); data.set('type', 'formulaire'); data.set('domaine', domaine);
      var done = function () { f.hidden = true; var t = document.getElementById('thanks'); t.hidden = false; t.focus(); };
      if (!endpoint) {
        var lines = []; data.forEach(function (v, k) { if (['site', 'type', 'accord'].indexOf(k) < 0 && v) lines.push(k + ' : ' + v); });
        location.href = 'mailto:contact@getreward.pro?subject=' + encodeURIComponent('Démo ' + domaine) + '&body=' + encodeURIComponent(lines.join('\n'));
        // Sans script Google, rien n'est envoyé par la page : on ne dit pas « c'est noté ».
        var th = document.getElementById('thanks');
        th.innerHTML = '<h3>Votre messagerie s\'ouvre avec le message prêt.</h3><p>Il ne reste qu\'à l\'envoyer. Si rien ne s\'ouvre, écrivez à <b>contact@getreward.pro</b> en indiquant votre structure : je vous réponds sous 24 h ouvrées.</p>';
        done(); return;
      }
      send.disabled = true; send.textContent = 'Envoi…';
      fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data }).then(done).catch(function () {
        send.disabled = false; send.textContent = label; fail("L'envoi n'a pas abouti. Réessayez, ou écrivez à contact@getreward.pro.");
      });
    });
  };
})();
