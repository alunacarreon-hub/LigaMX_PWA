// ─── UTILS ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function formatFecha(str) {
  const d = new Date(str);
  const days   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
}

function confBadge(c, text) {
  const cls = c === 'Alta' ? 'alta' : c === 'Media' ? 'media' : 'baja';
  return `<span class="badge badge-${cls}">${text || c}</span>`;
}

function parseForma(str) {
  if (!str) return [];
  const results = [];
  const re = /([WDL])\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const inside = m[2];
    const parts  = inside.split(' vs ');
    results.push({ result: m[1], score: parts[0].trim(), rival: parts[1] ? parts[1].trim() : '' });
  }
  return results;
}

function parseH2H(str) {
  if (!str || str === 'Sin H2H' || str === 'Sin historial') return [];
  return str.split('\n').filter(l => l.trim()).map(l => {
    const parts = l.trim().split(/\s{2,}/);
    return { fecha: parts[0] || '', partido: parts.slice(1).join(' ') };
  });
}

function renderClaudeText(text) {
  if (!text) return '<em class="empty">Sin análisis disponible</em>';
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  let html = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { html += '<br>'; continue; }

    // Bold inline
    const formatted = trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    if (/^\*\*[A-ZÁÉÍÓÚ\s]+\*\*$/.test(trimmed)) {
      // Section header like **ANÁLISIS**
      html += `<div class="claude-head">${formatted}</div>`;
    } else if (trimmed.startsWith('•') || trimmed.startsWith('·')) {
      html += `<div class="claude-bullet">${formatted}</div>`;
    } else if (/\*\*PICK FINAL/.test(trimmed)) {
      html += `<div class="claude-pick">${formatted}</div>`;
    } else if (/\*\*CONFIANZA/.test(trimmed)) {
      html += `<div class="claude-conf">${formatted}</div>`;
    } else {
      html += `<p>${formatted}</p>`;
    }
  }
  return html;
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const HEADERS = {
  inicio:   { title: null,        sub: 'Liga MX · Pronósticos' },
  tabla:    { title: 'Tabla',     sub: 'Posiciones General' },
  contexto: { title: 'Contexto',  sub: 'Información adicional' },
  tracker:  { title: 'Tracker',   sub: 'Historial de picks' },
};

function switchSection(name) {
  document.querySelectorAll('.section').forEach(s =>
    s.classList.toggle('active', s.id === `section-${name}`)
  );
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.section === name)
  );
  const data  = window.APP_DATA;
  const jLabel = data?.jornada?.replace('Regular Season - ', 'Jornada ') || 'Jornada';
  const h = HEADERS[name];
  $('header-title').textContent = h.title || jLabel;
  $('header-sub').textContent   = h.sub;
  document.querySelector('.main-content').scrollTop = 0;
}

function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
}

// ─── SECTION: INICIO ──────────────────────────────────────────────────────────
function renderInicio() {
  const sec = $('section-inicio');
  const { partidos } = window.APP_DATA;

  if (!partidos?.length) {
    sec.innerHTML = '<div class="empty">Sin partidos disponibles</div>';
    return;
  }

  sec.innerHTML = partidos.map((p, i) => {
    const confCls = p.pick_principal?.confianza === 'Alta' ? 'alta'
      : p.pick_principal?.confianza === 'Media' ? 'media' : 'baja';

    const altChips = (p.alternos || []).map(a =>
      `<div class="alterno-chip"><strong>${a.marcador}</strong> · ${a.prob}%</div>`
    ).join('');

    // Pick valor
    const pv = p.pick_valor;
    const pickValorHTML = pv ? `
      <div class="sec-label">Pick Valor</div>
      <div class="pv-row">
        <span class="badge badge-pick badge-valor">${pv.marcador}</span>
        <span class="pv-detail">${pv.prob}% · edge <strong>${pv.edge}x</strong> vs público casual</span>
      </div>` : '';

    // Odds
    const odds = p.odds;
    const oddsHTML = odds && !odds.sin_odds ? `
      <div class="sec-label">Mercado · <span style="font-weight:400;font-size:11px">${odds.bookmaker}</span></div>
      <div class="odds-grid">
        <div class="odds-cell">
          <span class="odds-label">Local</span>
          <span class="odds-val">${odds.odds_1x2.local}</span>
          <span class="odds-imp">${odds.implied_prob_1x2.local}%</span>
        </div>
        <div class="odds-cell">
          <span class="odds-label">Empate</span>
          <span class="odds-val">${odds.odds_1x2.empate}</span>
          <span class="odds-imp">${odds.implied_prob_1x2.empate}%</span>
        </div>
        <div class="odds-cell">
          <span class="odds-label">Visita</span>
          <span class="odds-val">${odds.odds_1x2.visitante}</span>
          <span class="odds-imp">${odds.implied_prob_1x2.visitante}%</span>
        </div>
      </div>
      ${odds.señal_valor ? `<div class="odds-signal">⚡ ${odds.señal_valor}</div>` : ''}
      ${odds.over_under_25 ? `<div class="odds-ou">O/U 2.5 — Over ${odds.over_under_25.odds.over} (${odds.over_under_25.probs.over}%) · Under ${odds.over_under_25.odds.under} (${odds.over_under_25.probs.under}%)</div>` : ''}
    ` : '';

    // Clima
    const climaHTML = p.clima && !p.clima.sin_forecast
      ? `<div class="clima-row">🌤 ${p.clima.condiciones}</div>` : '';

    // H2H
    const h2hItems = parseH2H(p.h2h);
    const h2hInicioHTML = h2hItems.length ? `
      <div class="sec-label">H2H — Últimos 5</div>
      ${h2hItems.map(h => `
        <div class="h2h-row">
          <span class="h2h-fecha">${h.fecha}</span>
          <span class="h2h-partido">${h.partido}</span>
        </div>`).join('')}` : '';

    return `
    <div class="card" id="mc-${i}">
      <div class="card-header mc-header" data-idx="${i}">
        <div class="match-left">
          <div class="match-teams">${p.home} vs ${p.away}</div>
          <div class="match-date">${formatFecha(p.fecha)}</div>
        </div>
        <div class="match-right">
          <span class="badge badge-pick badge-${confCls}">${p.pick_principal?.marcador || '?-?'}</span>
          <span class="badge badge-${confCls}">${p.pick_principal?.confianza}</span>
        </div>
        <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="card-body hidden" id="mc-body-${i}">
        <div class="pills-row">
          <div class="pill pill-l">
            <span class="pill-label">Local</span>
            <span class="pill-pct">${p.prob_1x2?.local}%</span>
          </div>
          <div class="pill pill-x">
            <span class="pill-label">Empate</span>
            <span class="pill-pct">${p.prob_1x2?.empate}%</span>
          </div>
          <div class="pill pill-v">
            <span class="pill-label">Visita</span>
            <span class="pill-pct">${p.prob_1x2?.visitante}%</span>
          </div>
        </div>
        ${altChips ? `
          <div class="sec-label">Alternos</div>
          <div class="alternos-row">${altChips}</div>
        ` : ''}
        ${pickValorHTML}
        ${oddsHTML}
        ${climaHTML}
        ${h2hInicioHTML}
        <div class="claude-wrap">
          <button class="claude-toggle" id="ct-${i}" data-idx="${i}">
            <span>Análisis Claude</span>
            <span class="caret">▾</span>
          </button>
          <div class="claude-body hidden" id="cb-${i}">
            ${renderClaudeText(p.analisis_claude)}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Event delegation
  sec.addEventListener('click', e => {
    const header = e.target.closest('.mc-header');
    if (header) {
      const idx  = header.dataset.idx;
      const card = $(`mc-${idx}`);
      const body = $(`mc-body-${idx}`);
      card.classList.toggle('expanded');
      body.classList.toggle('hidden');
      return;
    }
    const toggle = e.target.closest('.claude-toggle');
    if (toggle) {
      const idx  = toggle.dataset.idx;
      const body = $(`cb-${idx}`);
      toggle.classList.toggle('open');
      body.classList.toggle('hidden');
    }
  });
}

// ─── SECTION: TABLA ───────────────────────────────────────────────────────────
function renderTabla() {
  const sec    = $('section-tabla');
  const { tabla } = window.APP_DATA;

  if (!tabla?.length) {
    sec.innerHTML = '<div class="empty">Sin datos de tabla</div>';
    return;
  }

  const rows = tabla.map(t => {
    const gdCls = t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : 'gd-zero';
    const gdStr = t.gd > 0 ? `+${t.gd}` : String(t.gd);
    const formaBadges = (t.forma || '').split('').map(c => {
      const cls = c === 'W' ? 'w' : c === 'D' ? 'd' : 'l';
      return `<span class="fm fm-${cls}">${c}</span>`;
    }).join('');
    const zonaCls = t.pos <= 8 ? 'zona-liguilla' : t.pos >= 16 ? 'zona-descenso' : '';
    return `
    <tr class="${zonaCls}">
      <td>${t.pos}</td>
      <td>${t.equipo}</td>
      <td class="td-pts">${t.pts}</td>
      <td>${t.j}</td>
      <td>${t.g}</td>
      <td>${t.e}</td>
      <td>${t.p}</td>
      <td>${t.gf}</td>
      <td>${t.gc}</td>
      <td class="${gdCls}">${gdStr}</td>
      <td><div class="forma-mini-row">${formaBadges}</div></td>
    </tr>`;
  }).join('');

  sec.innerHTML = `
    <div class="tabla-scroll">
      <table class="tabla">
        <thead>
          <tr>
            <th>#</th><th>Equipo</th><th>Pts</th><th>J</th>
            <th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>GD</th><th>Forma</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding: 10px 0 6px; display:flex; gap:16px; font-size:11px; color:var(--text-light);">
      <span style="color:var(--blue); font-weight:700;">●</span> Liguilla (1–8)
      <span style="color:var(--baja-fg); font-weight:700;">●</span> Descenso (16–18)
    </div>
  `;
}

// ─── SECTION: CONTEXTO ────────────────────────────────────────────────────────
function renderContexto() {
  const sec = $('section-contexto');
  const { partidos } = window.APP_DATA;

  if (!partidos?.length) {
    sec.innerHTML = '<div class="empty">Sin datos de contexto</div>';
    return;
  }

  sec.innerHTML = partidos.map((p, i) => {
    // ── FORMA ──
    const makeFormaRows = (formaStr, label) => {
      const items = parseForma(formaStr);
      if (!items.length) return `<div class="inj-empty">Sin datos de forma</div>`;
      return items.map(f => {
        const cls = f.result === 'W' ? 'w' : f.result === 'D' ? 'd' : 'l';
        return `
        <div class="forma-row">
          <span class="badge-wdl badge-${cls}">${f.result}</span>
          <span class="forma-score">${f.score}</span>
          ${f.rival ? `<span class="forma-rival">vs ${f.rival}</span>` : ''}
        </div>`;
      }).join('');
    };

    // ── H2H ──
    const h2hItems = parseH2H(p.h2h);
    const h2hHTML = h2hItems.length
      ? h2hItems.map(h => `
        <div class="h2h-row">
          <span class="h2h-fecha">${h.fecha}</span>
          <span class="h2h-partido">${h.partido}</span>
        </div>`).join('')
      : `<div class="inj-empty">Sin historial H2H</div>`;

    // ── LESIONES ──
    const inj = p.injuries || { home: [], away: [] };
    const fmtPlayers = (list, label) => {
      const titulo = `<div class="inj-team-label">${label}</div>`;
      if (!list?.length) return titulo + `<div class="inj-empty">Sin bajas reportadas</div>`;
      return titulo + list.map(pl => {
        const tipoCls = pl.tipo?.toLowerCase().includes('suspen') ? 'inj-suspension' : 'inj-lesion';
        return `
        <div class="inj-player">
          <span class="inj-name">${pl.jugador}</span>
          <span class="inj-tipo ${tipoCls}">${pl.tipo}</span>
          ${pl.razon ? `<span class="inj-razon">${pl.razon}</span>` : ''}
        </div>`;
      }).join('');
    };

    // ── CONDICIONES ──
    const ar = p.arbitro_stats;
    const arbLine = ar?.n >= 5
      ? `${p.arbitro} · ${ar.n} partidos · avg ${ar.avg_goles} goles · ${ar.home_win_rate}% local gana`
      : `${p.arbitro || 'N/A'} · Sin historial suficiente`;

    const dFmt = r => {
      if (!r?.dias) return 'Sin datos';
      const warn = r.factor < 1 ? ` <span class="cond-warn">⚠ desgaste ×${r.factor}</span>` : '';
      return `${r.dias} días${warn}`;
    };

    const condHTML = `
      <div class="cond-row">
        <span class="cond-label">Árbitro</span>
        <span class="cond-val">${arbLine}</span>
      </div>
      <div class="cond-row">
        <span class="cond-label">Clima</span>
        <span class="cond-val">${p.clima?.sin_forecast ? 'No disponible' : (p.clima?.condiciones || 'N/A')}</span>
      </div>
      <div class="cond-row">
        <span class="cond-label">Altitud</span>
        <span class="cond-val">${p.altitud?.metros != null ? `${p.altitud.metros}m — ${p.altitud.efecto}` : 'No mapeada'}</span>
      </div>
      <div class="cond-row">
        <span class="cond-label">Descanso local</span>
        <span class="cond-val">${dFmt(p.descanso_local)}</span>
      </div>
      <div class="cond-row">
        <span class="cond-label">Descanso visit.</span>
        <span class="cond-val">${dFmt(p.descanso_visitante)}</span>
      </div>`;

    return `
    <div class="card" id="ctx-${i}">
      <div class="card-header ctx-header" data-idx="${i}">
        <span class="ctx-match-teams">${p.home} vs ${p.away}</span>
        <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="card-body hidden" id="ctx-body-${i}">
        <div class="tab-bar" id="ctx-tabs-${i}">
          <button class="tab-btn active" data-tab="forma"      data-card="${i}">Forma</button>
          <button class="tab-btn"        data-tab="h2h"        data-card="${i}">H2H</button>
          <button class="tab-btn"        data-tab="lesiones"   data-card="${i}">Lesiones</button>
          <button class="tab-btn"        data-tab="condiciones" data-card="${i}">Condiciones</button>
        </div>
        <div class="tab-panel active" id="ctx-${i}-forma">
          <div class="inj-team-label">Local — ${p.home}</div>
          ${makeFormaRows(p.forma_local)}
          <div class="inj-team-label" style="margin-top:10px;">Visitante — ${p.away}</div>
          ${makeFormaRows(p.forma_visitante)}
        </div>
        <div class="tab-panel" id="ctx-${i}-h2h">${h2hHTML}</div>
        <div class="tab-panel" id="ctx-${i}-lesiones">
          ${fmtPlayers(inj.home, `Local — ${p.home}`)}
          ${fmtPlayers(inj.away, `Visitante — ${p.away}`)}
        </div>
        <div class="tab-panel" id="ctx-${i}-condiciones">${condHTML}</div>
      </div>
    </div>`;
  }).join('');

  // Event delegation
  sec.addEventListener('click', e => {
    const header = e.target.closest('.ctx-header');
    if (header) {
      const idx  = header.dataset.idx;
      const card = $(`ctx-${idx}`);
      const body = $(`ctx-body-${idx}`);
      card.classList.toggle('expanded');
      body.classList.toggle('hidden');
      return;
    }
    const tabBtn = e.target.closest('.tab-btn[data-tab]');
    if (tabBtn) {
      const cardIdx = tabBtn.dataset.card;
      const tabName = tabBtn.dataset.tab;
      // Update buttons
      document.querySelectorAll(`#ctx-tabs-${cardIdx} .tab-btn`).forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tabName)
      );
      // Update panels
      ['forma','h2h','lesiones','condiciones'].forEach(t => {
        const panel = $(`ctx-${cardIdx}-${t}`);
        if (panel) panel.classList.toggle('active', t === tabName);
      });
    }
  });
}

// ─── SECTION: TRACKER ─────────────────────────────────────────────────────────
function renderTracker() {
  const sec = $('section-tracker');
  const td  = window.TRACKER_DATA;

  if (!td) {
    sec.innerHTML = '<div class="empty">Sin datos de tracker</div>';
    return;
  }

  const { resumen, jornadas, picks } = td;
  const pctExacto = resumen.total_picks > 0
    ? Math.round(resumen.aciertos_exacto / resumen.total_picks * 100) : 0;
  const pct1x2    = resumen.total_picks > 0
    ? Math.round(resumen.aciertos_1x2    / resumen.total_picks * 100) : 0;

  // Metrics
  const metricsHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-val">${pctExacto}%</div>
        <div class="metric-label">Exacto</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${pct1x2}%</div>
        <div class="metric-label">1X2</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${resumen.total_picks}</div>
        <div class="metric-label">Total picks</div>
      </div>
    </div>`;

  // Bar chart
  const CHART_H = 100;
  const barsHTML = (jornadas || []).map(j => {
    const exactH = Math.round((j.exacto / j.total) * CHART_H);
    const addH   = Math.round(((j.resultado_1x2 - j.exacto) / j.total) * CHART_H);
    return `
    <div class="bar-group">
      <div class="bar-col">
        <div class="bar-inner">
          ${addH   > 0 ? `<div class="bar-seg-add"   style="height:${addH}px;"></div>` : ''}
          ${exactH > 0 ? `<div class="bar-seg-exact" style="height:${exactH}px;"></div>` : ''}
        </div>
      </div>
      <span class="bar-label">${j.j}</span>
    </div>`;
  }).join('');

  const chartHTML = `
    <div class="chart-card">
      <div class="chart-title">Aciertos por jornada</div>
      <div class="chart-legend">
        <div class="legend-item"><div class="legend-dot dot-exact"></div> Exacto</div>
        <div class="legend-item"><div class="legend-dot dot-add"></div> Solo 1X2</div>
      </div>
      <div class="chart-bars">${barsHTML}</div>
    </div>`;

  // Picks history
  const picksHTML = (picks || []).map(pk => {
    let badges = '';
    if (pk.acierto_exacto) {
      badges = `<span class="badge badge-exacto">Exacto</span><span class="badge badge-1x2ok">1X2</span>`;
    } else if (pk.acierto_1x2) {
      badges = `<span class="badge badge-partial">1X2 ✓</span>`;
    } else {
      badges = `<span class="badge badge-miss">Miss</span>`;
    }
    return `
    <div class="pick-row">
      <div class="pick-left">
        <div class="pick-partido">${pk.partido}</div>
        <div class="pick-info">${pk.jornada} · Pick: <strong>${pk.pick}</strong> · Real: <strong>${pk.real}</strong></div>
      </div>
      <div class="pick-right">${badges}</div>
    </div>`;
  }).join('');

  sec.innerHTML = `
    ${metricsHTML}
    ${chartHTML}
    <div class="picks-card">
      <div class="picks-title">Historial — Jornada 13</div>
      ${picksHTML || '<div class="empty">Sin picks registrados</div>'}
    </div>
  `;
}

// ─── OVERLAY (loading / error) ────────────────────────────────────────────────
function createOverlay() {
  const el = document.createElement('div');
  el.id = 'overlay';
  el.className = 'overlay';
  document.getElementById('app').appendChild(el);
  return el;
}

function showLoading() {
  const ov = $('overlay') || createOverlay();
  ov.style.display = 'flex';
  ov.innerHTML = `
    <div class="spinner"></div>
    <span class="overlay-msg">Cargando datos…</span>
  `;
}

function showError(msg) {
  const ov = $('overlay') || createOverlay();
  ov.style.display = 'flex';
  ov.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="#dc2626"/>
    </svg>
    <span class="overlay-title">No se pudo cargar la data</span>
    <span class="overlay-msg">${msg || 'Intenta de nuevo'}</span>
    <button class="retry-btn" onclick="initApp()">Reintentar</button>
  `;
}

function hideOverlay() {
  const ov = $('overlay');
  if (ov) ov.style.display = 'none';
}

// ─── RENDER ALL ───────────────────────────────────────────────────────────────
function renderAll() {
  renderInicio();
  renderTabla();
  renderContexto();
  renderTracker();
  initNav();
  const jLabel = window.APP_DATA?.jornada?.replace('Regular Season - ', 'Jornada ') || 'Jornada';
  $('header-title').textContent = jLabel;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function initApp() {
  showLoading();
  try {
    await window.loadAppData();
    hideOverlay();
    renderAll();
  } catch (e) {
    showError(e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  initApp();
});
