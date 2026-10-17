/* Countries list and country page (BIS / OECD layer). */
(function () {
  const { fmt, esc, route } = REI;
  const countries = () => REI.getJSON('countries/index.json');
  const country = iso2 => REI.getJSON(`countries/${iso2}.json`);
  const z = v => v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(1) + 'σ';
  const clockName = { recovery: 'Recovery', boom: 'Boom', downturn: 'Downturn', trough: 'Trough' };

  function clock(div, rows) {
    const pts = rows.filter(r => r.pir_z != null && r.yoy != null);
    Plotly.newPlot(div, [{
      x: pts.map(r => r.pir_z), y: pts.map(r => r.yoy), text: pts.map(r => r.iso3), mode: 'markers+text', type: 'scatter', textposition: 'top center',
      textfont: { size: 10, color: '#9da7b3' }, marker: { size: 9, color: pts.map(r => r.yoy >= 0 ? '#3fb950' : '#f85149'), opacity: 0.85 },
      hovertemplate: '%{text}<br>price/income z: %{x:.1f}σ<br>real 1y: %{y:.1f}%<extra></extra>',
    }], {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#9da7b3', size: 12 }, margin: { l: 56, r: 16, t: 16, b: 48 }, hovermode: 'closest',
      xaxis: { title: { text: 'Standardised price-to-income, z vs own 20y history' }, gridcolor: '#1f2630', zeroline: true, zerolinecolor: '#30363d' },
      yaxis: { title: { text: 'Real house prices, 1y %' }, gridcolor: '#1f2630', zeroline: true, zerolinecolor: '#30363d' },
      shapes: [{ type: 'line', x0: 0.5, x1: 0.5, y0: 0, y1: 1, yref: 'paper', line: { color: '#d29922', width: 1, dash: 'dot' } }],
      annotations: [
        { x: -2.2, y: 1, yref: 'paper', text: 'Recovery', showarrow: false, font: { color: '#6e7781' } }, { x: 2.2, y: 1, yref: 'paper', text: 'Boom', showarrow: false, font: { color: '#6e7781' } },
        { x: 2.2, y: 0.03, yref: 'paper', text: 'Downturn', showarrow: false, font: { color: '#6e7781' } }, { x: -2.2, y: 0.03, yref: 'paper', text: 'Trough', showarrow: false, font: { color: '#6e7781' } }],
    }, { displayModeBar: false, responsive: true });
  }

  route('/countries', async (app) => {
    const d = await countries();
    const rows = d.countries.filter(r => r.last_period);
    const pos = rows.filter(r => r.real_1y != null), up = pos.filter(r => r.real_1y > 0).length;
    const stretched = rows.filter(r => r.pir_z != null && r.pir_z > 1).map(r => r.name);
    const turning = rows.filter(r => r.accel != null && r.accel < -2 && r.yoy > 0).map(r => r.name);
    app.innerHTML = `<div class="crumbs"><a href="#/">Home</a> › Countries</div><h1>Global read</h1>
      <p class="sub"><span class="badge">BIS and OECD data through ${fmt.month(rows.map(r => r.last_period).sort().slice(-1)[0])}</span><span class="badge">Published ${d.as_of}</span></p>
      <div class="card prose"><p><b>Breadth.</b> Real house prices rose over the past year in ${up} of ${pos.length} countries with data (${(100 * up / Math.max(1, pos.length)).toFixed(0)}%).
        <b>Stretched valuations</b> (standardised price-to-income more than one standard deviation above its own 20-year history): ${stretched.length ? esc(stretched.join(', ')) : 'none'}.
        <b>Momentum turning</b> (still rising but decelerating by more than two points): ${turning.length ? esc(turning.join(', ')) : 'none'}.</p>
        <p class="note">Generated from the numbers below with fixed wording; no model or language model writes this text.</p></div>
      <div class="grid2"><div class="card"><h2>Property clock</h2><div id="clock" class="chart" style="min-height:420px"></div></div>
        <div class="card"><h2>Real price change, 1 year</h2><div id="rank" class="chart"></div></div></div>
      <div class="card" style="margin-top:1rem"><h2>All countries</h2><table class="t" id="ct"><thead><tr><th data-k="name">Country</th><th data-k="region">Region</th><th data-k="last_period">Through</th><th data-k="real_1y">Real 1y</th><th data-k="real_5y">Real 5y p.a.</th><th data-k="real_10y">Real 10y p.a.</th><th data-k="dd_current">From peak</th><th data-k="pir_z">P/I z</th><th data-k="prr_z">P/R z</th><th data-k="trend_gap">Trend gap</th><th data-k="half_life_years">Half-life</th><th data-k="clock">Clock</th></tr></thead><tbody>
      ${rows.map(r => `<tr data-name="${esc(r.name)}" data-region="${r.region}" data-last_period="${r.last_period}" data-real_1y="${r.real_1y ?? ''}" data-real_5y="${r.real_5y ?? ''}" data-real_10y="${r.real_10y ?? ''}" data-dd_current="${r.dd_current ?? ''}" data-pir_z="${r.pir_z ?? ''}" data-prr_z="${r.prr_z ?? ''}" data-trend_gap="${r.trend_gap ?? ''}" data-half_life_years="${r.half_life_years ?? ''}" data-clock="${r.clock ?? ''}">
        <td><a href="#/country/${r.iso2}">${esc(r.name)}</a></td><td>${r.region}</td><td>${r.last_period}</td><td class="${fmt.cls(r.real_1y)}">${fmt.pct(r.real_1y)}</td><td class="${fmt.cls(r.real_5y)}">${fmt.pct(r.real_5y)}</td><td class="${fmt.cls(r.real_10y)}">${fmt.pct(r.real_10y)}</td><td class="${fmt.cls(r.dd_current)}">${fmt.pct(r.dd_current)}</td><td>${z(r.pir_z)}</td><td>${z(r.prr_z)}</td><td class="${fmt.cls(r.trend_gap)}">${fmt.pct(r.trend_gap)}</td><td>${r.half_life_years == null ? '–' : r.half_life_years.toFixed(1) + 'y'}</td><td>${clockName[r.clock] || '–'}</td></tr>`).join('')}</tbody></table>
      <p class="note">Real = deflated by CPI (BIS). P/I and P/R z-scores use the OECD standardised ratios against each country's own 20-year history. Trend gap: deviation from a 20-year log-linear trend of real prices. Half-life: AR(1) mean reversion of the trend gap.</p></div>`;
    clock(document.getElementById('clock'), rows);
    const rk = rows.filter(r => r.real_1y != null);
    REI.charts.ranking(document.getElementById('rank'), rk.map(r => r.name), rk.map(r => r.real_1y), { suffix: '%', xtitle: 'Real house prices, 1y %' });
    // reuse sortable from pages.js via a click bootstrap
    document.querySelectorAll('#ct th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k, tb = th.closest('table').tBodies[0], rws = [...tb.rows];
      const dir = th.classList.contains('on') && th.dataset.dir !== 'desc' ? 'desc' : 'asc';
      th.closest('tr').querySelectorAll('th').forEach(x => x.classList.remove('on')); th.classList.add('on'); th.dataset.dir = dir;
      rws.sort((a, b) => { const x = parseFloat(a.dataset[k]), y = parseFloat(b.dataset[k]); const xv = isNaN(x) ? a.dataset[k] : x, yv = isNaN(y) ? b.dataset[k] : y; return (xv > yv ? 1 : xv < yv ? -1 : 0) * (dir === 'asc' ? 1 : -1); });
      rws.forEach(r => tb.appendChild(r));
    }));
    document.getElementById('attribution').textContent = d.attribution;
  });

  route('/country/:iso2', async (app, { iso2 }) => {
    const c = await country(iso2);
    const s = c.stats, S = c.series;
    const tile = (k, v, cls, sub) => `<div class="tile"><div class="k">${k}</div><div class="v ${cls || ''}">${v}</div><div class="s">${sub || ''}</div></div>`;
    app.innerHTML = `<div class="crumbs"><a href="#/">Home</a> › <a href="#/countries">Countries</a> › ${esc(c.name)}</div>
      <div class="city-head"><h1>${esc(c.name)}</h1><span class="asof"><span class="badge">${c.region}</span><span class="badge">Data through ${fmt.month(s.last_period)}</span><span class="badge">Published ${c.as_of}</span></span></div>
      <div class="tiles">${tile('Real 1y', fmt.pct(s.real_1y), s.real_1y >= 0 ? 'up' : 'down', 'CPI-deflated')}${tile('Real 5y p.a.', fmt.pct(s.real_5y), s.real_5y >= 0 ? 'up' : 'down')}${tile('Real 10y p.a.', fmt.pct(s.real_10y), s.real_10y >= 0 ? 'up' : 'down')}
        ${tile('From real peak', fmt.pct(s.real_drawdown.current), s.real_drawdown.current < -0.5 ? 'down' : '', `peak ${s.real_drawdown.peak || '–'}`)}${tile('Price / income', z(s.pir_z), '', 'z vs own 20y')}${tile('Price / rent', z(s.prr_z), '', 'z vs own 20y')}
        ${tile('Trend gap', fmt.pct(s.trend_gap), s.trend_gap > 0 ? 'down' : 'up', 'vs 20y log trend')}${tile('Half-life', s.half_life_years == null ? '–' : s.half_life_years.toFixed(1) + ' yrs', '', 'AR(1) of the gap')}${tile('Clock', clockName[s.clock] || '–', '', 'valuation × momentum')}</div>
      <div class="grid2"><div class="card"><h2>Real and nominal house prices</h2><div id="c1" class="chart"></div></div><div class="card"><h2>Price-to-income and price-to-rent (standardised, 2015 = 100)</h2><div id="c2" class="chart"></div></div></div>
      <div class="card" style="margin-top:1rem"><h2>Real price drawdown from running peak</h2><div id="c3" class="chart" style="min-height:240px"></div></div>
      <p class="note">${esc(c.attribution)}</p>`;
    const base = { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#9da7b3', size: 12 }, margin: { l: 56, r: 16, t: 16, b: 40 }, hovermode: 'x unified', xaxis: { gridcolor: '#1f2630' }, yaxis: { gridcolor: '#1f2630' }, legend: { orientation: 'h', y: 1.1 } };
    const cfg = { displayModeBar: false, responsive: true };
    const tr = (ser, name, color) => ser ? [{ x: ser.date, y: ser.value, type: 'scatter', mode: 'lines', name, line: { color, width: 2 } }] : [];
    Plotly.newPlot('c1', [...tr(S.real, 'Real (2010 = 100)', '#58a6ff'), ...tr(S.nominal, 'Nominal (2010 = 100)', '#8b949e')], Object.assign({}, base, { yaxis: Object.assign({ type: 'log' }, base.yaxis) }), cfg);
    Plotly.newPlot('c2', [...tr(S.price_to_income, 'Price / income', '#f0883e'), ...tr(S.price_to_rent, 'Price / rent', '#3fb950'), ...tr(S.rent, 'Rent index', '#8b949e')], base, cfg);
    if (S.real) { let pk = -Infinity; const dd = S.real.value.map(v => { pk = Math.max(pk, v); return 100 * (v / pk - 1); }); Plotly.newPlot('c3', [{ x: S.real.date, y: dd, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: '#f85149', width: 1.5 }, fillcolor: 'rgba(248,81,73,0.2)', name: 'Drawdown %' }], base, cfg); }
    document.getElementById('attribution').textContent = c.attribution;
  });
})();
