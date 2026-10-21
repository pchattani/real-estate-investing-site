/* Pages: home (cities), city, area, sold record, methodology. */
(function () {
  const { fmt, esc, route } = REI;

  function banner(s) {
    return `<span class="badge">Data through ${fmt.month(s.data_through)}</span>` +
      (s.provisional_from ? `<span class="badge prov">Provisional from ${fmt.month(s.provisional_from)}</span>` : '') +
      `<span class="badge">Published ${s.as_of}</span>`;
  }
  function tiles(ch, extra = []) {
    const t = [['1 month', ch.m1], ['3 months', ch.m3], ['12 months', ch.m12], ['5 years', ch.y5], ['10 years', ch.y10]]
      .map(([k, v]) => `<div class="tile"><div class="k">${k}</div><div class="v ${v == null ? '' : v >= 0 ? 'up' : 'down'}">${fmt.pct(v)}</div><div class="s">index, to last complete month</div></div>`);
    return `<div class="tiles">${t.join('')}${extra.join('')}</div>`;
  }
  function sortable(table) {
    const ths = table.querySelectorAll('th[data-k]');
    ths.forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k, tb = table.tBodies[0], rows = [...tb.rows];
      const dir = th.classList.contains('on') && th.dataset.dir !== 'desc' ? 'desc' : 'asc';
      ths.forEach(x => x.classList.remove('on')); th.classList.add('on'); th.dataset.dir = dir;
      rows.sort((a, b) => { const x = parseFloat(a.dataset[k]), y = parseFloat(b.dataset[k]); const xv = isNaN(x) ? a.dataset[k] : x, yv = isNaN(y) ? b.dataset[k] : y; return (xv > yv ? 1 : xv < yv ? -1 : 0) * (dir === 'asc' ? 1 : -1); });
      rows.forEach(r => tb.appendChild(r));
    }));
  }
  function areaTable(cityKey, rows, cur, title, hasArea) {
    const psmTd = r => hasArea ? `<td>${r.psm12 == null ? '–' : fmt.money(r.psm12, cur) + '/m²'}</td>` : '';
    const tr = rows.map(r => `<tr data-name="${esc(r.name)}" data-n12="${r.n12}" data-med12="${r.med12 ?? ''}" data-psm12="${r.psm12 ?? ''}" data-med12_chg="${r.med12_chg ?? ''}" data-idx_m12="${r.idx_m12 ?? ''}">
      <td><a href="#/area/${cityKey}/${encodeURIComponent(r.code)}">${esc(r.name)}</a>${r.name !== r.code && !/^8[0-9a-f]{14}$/.test(r.code) ? ` <span class="mute mono">${esc(r.code)}</span>` : ''}</td>
      <td>${fmt.num(r.n12)}</td><td>${fmt.money(r.med12, cur)}</td>${psmTd(r)}<td class="${fmt.cls(r.med12_chg)}">${fmt.pct(r.med12_chg)}</td><td class="${fmt.cls(r.idx_m12)}">${fmt.pct(r.idx_m12)}</td></tr>`).join('');
    const t = REI.el(`<div class="card"><h2>${esc(title)}</h2><table class="t"><thead><tr><th data-k="name">Area</th><th data-k="n12">Sales 12m</th><th data-k="med12">Median 12m</th>${hasArea ? '<th data-k="psm12">Median per m²</th>' : ''}<th data-k="med12_chg">Median vs prior 12m</th><th data-k="idx_m12">Index 12m</th></tr></thead><tbody>${tr}</tbody></table>
      <p class="note">Median change mixes composition; the index column is the quality-controlled repeat-sales measure (shrunk toward the parent where sales are thin).</p></div>`);
    sortable(t.querySelector('table'));
    return t;
  }

  // ------------------------------------------------------------ home
  route('/', async (app) => {
    const cities = await Promise.all(REI.state.meta.cities.map(c => REI.city(c.key)));
    app.innerHTML = `<h1>Cities</h1><p class="sub">Sold-price analytics from open registers. Repeat-sales indices to postcode-district level, honest about what is still provisional.</p>
      <div class="cities">${cities.map(s => `<a class="city-card" href="#/city/${s.key}"><div class="n">${esc(s.name)}</div><div class="m">${s.tier === 'A1' ? 'Address-level sold records' : 'Index only'} · through ${fmt.month(s.data_through)}</div>
        <div class="tiles" style="margin:.5rem 0 0"><div class="tile"><div class="k">12m</div><div class="v ${s.changes.m12 >= 0 ? 'up' : 'down'}">${fmt.pct(s.changes.m12)}</div></div><div class="tile"><div class="k">Sales 12m</div><div class="v">${fmt.num(s.counts.sales_12m)}</div></div></div></a>`).join('')}</div>`;
    document.getElementById('attribution').textContent = cities.map(c => c.attribution).filter(Boolean).join(' ');
  });

  // ------------------------------------------------------------ city
  route('/city/:key', async (app, { key }) => {
    const s = await REI.city(key);
    const top = s.levels[0].key;
    app.innerHTML = `<div class="crumbs"><a href="#/">Cities</a> › ${esc(s.name)}</div>
      <div class="city-head"><h1>${esc(s.name)}</h1><span class="asof">${banner(s)}</span></div>
      ${tiles(s.changes, [`<div class="tile"><div class="k">Sales 12m</div><div class="v">${fmt.num(s.counts.sales_12m)}</div><div class="s">${fmt.num(s.counts.sales_total)} since ${s.index.period[0].slice(0, 4)}</div></div>`,
        `<div class="tile"><div class="k">Repeat-sale pairs</div><div class="v">${fmt.num(s.counts.pairs)}</div><div class="s">${fmt.num(s.counts.properties)} dwellings</div></div>`])}
      <div class="grid2"><div class="card"><h2>Repeat-sales index</h2><div id="c-index" class="chart"></div></div><div class="card"><h2>Volume and median price</h2><div id="c-vol" class="chart"></div></div></div>
      <div class="card" style="margin-top:1rem"><h2>Map</h2><div class="map-ctl"><span>Colour:</span><button data-m="med12" class="on">Median price</button>${s.has_area ? '<button data-m="psm12">Median per m²</button>' : ''}<button data-m="chg">12m median change</button><button data-m="n12">Sales count</button><span class="legend" id="legend"></span></div><div id="map" class="map"></div>
        <p class="note">Hexagons are H3 cells (resolution follows zoom). Zoom in past 13 inside an area page to see individual sales.</p></div>
      <div id="tiers" style="margin-top:1rem"></div>
      <div id="liq" style="margin-top:1rem"></div>
      <div id="tbl" style="margin-top:1rem"></div>`;
    REI.getJSON(`cities/${key}/tiers.json`).then(T => {
      const colors = { low: '#3fb950', mid: '#58a6ff', high: '#f0883e', flat: '#58a6ff', house: '#f0883e', new: '#d29922', existing: '#8b949e' };
      const names = { low: 'Low tier (bottom third)', mid: 'Middle tier', high: 'High tier (top third)', flat: 'Flats', house: 'Houses', new: 'New build', existing: 'Existing' };
      const blocks = Object.entries(T).map(([kind, groups]) => {
        const id = `t-${kind}`;
        const tiles = Object.entries(groups).map(([g, s]) => `<span class="badge">${names[g] || g}: 12m ${fmt.pct(s.changes.m12)} · 5y ${fmt.pct(s.changes.y5)}</span>`).join('');
        return { id, kind, groups, html: `<div class="card"><h2>${kind === 'tier' ? 'Price tiers' : kind === 'ptype' ? 'Flats vs houses' : 'New build vs existing'}</h2><div>${tiles}</div><div id="${id}" class="chart"></div></div>` };
      });
      document.getElementById('tiers').innerHTML = `<div class="grid2">${blocks.map(b => b.html).join('')}</div><p class="note">Tiers follow the first-sale price against trailing-12-month tertile breakpoints (the Case-Shiller convention), so a dwelling does not change tier because of its own return. Each line is a separate repeat-sales fit on the subset of pairs.</p>`;
      for (const b of blocks) {
        REI.charts.index(document.getElementById(b.id), { period: s.index.period, value: s.index.value, se: [] }, s.provisional_from,
          { base: fmt.month(s.base_period), name: `${s.name} (all)`, compare: Object.entries(b.groups).map(([g, t]) => ({ period: t.period, value: t.value, name: names[g] || g, color: colors[g] })) });
      }
    }).catch(() => {});
    REI.charts.index(document.getElementById('c-index'), s.index, s.provisional_from, { base: fmt.month(s.base_period) });
    REI.charts.volume(document.getElementById('c-vol'), s.volume, s.currency, s.provisional_from);
    REI.getJSON(`cities/${key}/liquidity.json`).then(L => {
      const so = L.seller_outcomes, co = L.cohorts;
      document.getElementById('liq').innerHTML = `<div class="grid2"><div class="card"><h2>Seller outcomes by year of sale</h2><div id="l1" class="chart"></div>
        <p class="note">From repeat-sale pairs: median gross gain on resale, share of resales below the purchase price, and share resold within two years. Last year is provisional.</p></div>
        <div class="card"><h2>Realised return by year of purchase</h2><div id="l2" class="chart"></div><p class="note">Median annualised return on dwellings bought in that year and since resold. Recent cohorts have short, selected holding periods.</p></div></div>
        <div class="card" style="margin-top:1rem"><h2>Holding period at resale</h2><div id="l3" class="chart"></div></div>`;
      const base = { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#9da7b3', size: 12 }, margin: { l: 56, r: 56, t: 16, b: 40 }, hovermode: 'x unified', xaxis: { gridcolor: '#1f2630' }, yaxis: { gridcolor: '#1f2630' }, legend: { orientation: 'h', y: 1.12 } };
      const cfg = { displayModeBar: false, responsive: true };
      Plotly.newPlot('l1', [
        { x: so.sale_year, y: so.median_gross_pct, type: 'bar', name: 'Median gross gain %', marker: { color: 'rgba(88,166,255,0.6)' } },
        { x: so.sale_year, y: so.loss_share_pct, type: 'scatter', mode: 'lines+markers', name: 'Sold at a loss %', yaxis: 'y2', line: { color: '#f85149' } },
        { x: so.sale_year, y: so.flip_share_pct, type: 'scatter', mode: 'lines+markers', name: 'Resold within 2y %', yaxis: 'y2', line: { color: '#d29922' } }],
        Object.assign({}, base, { yaxis2: { overlaying: 'y', side: 'right', gridcolor: 'rgba(0,0,0,0)', title: { text: 'Share %' } }, yaxis: Object.assign({ title: { text: 'Gross gain %' } }, base.yaxis) }), cfg);
      Plotly.newPlot('l2', [{ x: co.buy_year, y: co.median_annual_pct, type: 'bar', marker: { color: co.median_annual_pct.map(v => v >= 0 ? '#3fb950' : '#f85149') }, name: 'Median annualised %', hovertemplate: '%{y:.1f}% p.a.<extra></extra>' },
        { x: co.buy_year, y: co.loss_share_pct, type: 'scatter', mode: 'lines', yaxis: 'y2', name: 'Loss share %', line: { color: '#f85149', width: 1.5 } }],
        Object.assign({}, base, { yaxis2: { overlaying: 'y', side: 'right', gridcolor: 'rgba(0,0,0,0)', title: { text: 'Loss share %' } }, yaxis: Object.assign({ title: { text: 'Annualised %' } }, base.yaxis) }), cfg);
      const hp = L.holding_periods, cols = ['#1d4877', '#2e6fa5', '#58a6ff', '#9ecbff', '#c8e1ff', '#ffd27f', '#f0883e', '#f85149', '#b62324'];
      Plotly.newPlot('l3', hp.bins.map((b, j) => ({ x: hp.sale_year, y: hp.share.map(r => 100 * r[j]), type: 'bar', name: b, marker: { color: cols[j] } })),
        Object.assign({}, base, { barmode: 'stack', yaxis: Object.assign({ title: { text: 'Share of resales %' } }, base.yaxis), legend: { orientation: 'h', y: 1.15 } }), cfg);
    }).catch(() => {});
    document.getElementById('tbl').appendChild(areaTable(key, s.areas.filter(a => a.level === top), s.currency, `${s.levels[0].name}s`, s.has_area));
    if (s.levels[1]) document.getElementById('tbl').appendChild(areaTable(key, s.areas.filter(a => a.level === s.levels[1].key), s.currency, `${s.levels[1].name}s`, s.has_area));
    const m = await REI.map.mount('map', key, s, { legend: document.getElementById('legend') });
    document.querySelectorAll('.map-ctl button').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.map-ctl button').forEach(x => x.classList.remove('on')); b.classList.add('on'); m.setMetric(b.dataset.m); }));
    document.getElementById('attribution').textContent = s.attribution;
  });

  // ------------------------------------------------------------ area
  route('/area/:key/:code', async (app, { key, code }) => {
    const [s, a] = await Promise.all([REI.city(key), REI.area(key, code)]);
    const crumbs = [`<a href="#/">Cities</a>`, `<a href="#/city/${key}">${esc(s.name)}</a>`];
    if (a.parent) crumbs.push(`<a href="#/area/${key}/${encodeURIComponent(a.parent.code)}">${esc(a.parent.name)}</a>`);
    const lvName = (s.levels.find(l => l.key === a.level) || {}).name || a.level;
    const shrink = a.index ? a.index.shrink[a.index.period.indexOf(s.data_through)] : null;
    app.innerHTML = `<div class="crumbs">${crumbs.join(' › ')} › ${esc(a.name)}</div>
      <div class="city-head"><h1>${esc(a.name)}${a.name !== a.code ? ` <span class="mute mono">${esc(a.code)}</span>` : ''}</h1><span class="asof"><span class="badge">${esc(lvName)}</span>${banner(s)}</span></div>
      ${a.changes ? tiles(a.changes, [`<div class="tile"><div class="k">Sales 12m</div><div class="v">${fmt.num(a.n12)}</div><div class="s">median ${fmt.money(a.med12, s.currency)}</div></div>`,
        `<div class="tile"><div class="k">Own-data weight</div><div class="v">${shrink == null ? '–' : (100 * shrink).toFixed(0) + '%'}</div><div class="s">rest borrowed from ${a.parent ? esc(a.parent.name) : 'city'}</div></div>`]) : ''}
      <div class="grid2"><div class="card"><h2>Repeat-sales index vs ${esc(s.name)}</h2><div id="a-index" class="chart"></div></div>
        <div class="card"><h2>Map</h2><div class="map-ctl"><span class="legend" id="legend"></span></div><div id="map" class="map" style="height:360px"></div></div></div>
      <div id="children" style="margin-top:1rem"></div>
      <div class="card" style="margin-top:1rem"><h2>Recent sales</h2><div class="list">${a.recent.map(r => `<a class="row" href="#/sold/${key}/${encodeURIComponent(r.sd)}/${r.pk}"><span>${esc(r.a)} <span class="m mono">${esc(r.pc || '')}</span></span><span>${fmt.money(r.p, s.currency)}${r.m2 ? ` <span class="m">${fmt.money(r.p / r.m2, s.currency)}/m² · ${r.m2} m²</span>` : ''} <span class="m">${fmt.ptype(r.t)}${r.n ? ' · new' : ''} · ${r.d}</span></span></a>`).join('')}</div></div>`;
    if (a.index) REI.charts.index(document.getElementById('a-index'), a.index, s.provisional_from, { base: fmt.month(s.base_period), name: a.name, compare: [{ period: s.index.period, value: s.index.value, name: s.name }] });
    if (a.children.length) document.getElementById('children').appendChild(areaTable(key, a.children.map(c => Object.assign({}, c, { med12_chg: null })), s.currency, 'Within this area', s.has_area));
    const pts = a.recent.filter(r => r.lat != null);
    const m = await REI.map.mount('map', key, s, { legend: document.getElementById('legend'), zoom: 12 });
    // an area at the shard level (or just below it) loads its shard's sales for points and bounds
    const dist = a.level === s.shard_level ? a.code : (a.parent && a.parent.level === s.shard_level ? a.parent.code : null);
    if (dist) {
      const rows = await REI.salesDistrict(key, dist);
      const mine = a.level === s.shard_level ? rows : rows.filter(r => a.level === 'sector' ? (r.pc || '').startsWith(a.code) : true);
      const recent = mine.filter(r => r.d >= `${+s.data_through.slice(0, 4) - 3}-01-01`);
      m.addPoints(recent, s.currency);
      const lats = recent.map(r => r.lat).filter(v => v != null), lons = recent.map(r => r.lon).filter(v => v != null);
      if (lats.length) m.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]]);
    } else if (pts.length) {
      m.fitBounds([[Math.min(...pts.map(p => p.lon)), Math.min(...pts.map(p => p.lat))], [Math.max(...pts.map(p => p.lon)), Math.max(...pts.map(p => p.lat))]]);
    }
    document.getElementById('attribution').textContent = s.attribution;
  });

  // ------------------------------------------------------------ sold record (property history)
  route('/sold/:key/:dist/:pk', async (app, { key, dist, pk }) => {
    const s = await REI.city(key);
    const rows = (await REI.salesDistrict(key, dist)).filter(r => r.pk === pk).sort((a, b) => a.d < b.d ? -1 : 1);
    if (!rows.length) throw new Error('No sold records for this property key in this district');
    const last = rows[rows.length - 1];
    const idx = s.index;
    const atIdx = d => { const i = idx.period.indexOf(d.slice(0, 7)); return i >= 0 ? idx.value[i] : null; };
    const lines = rows.map((r, i) => {
      const prev = rows[i - 1];
      let ret = '', ann = '', vsIdx = '';
      if (prev) {
        const g = r.p / prev.p - 1, yrs = (new Date(r.d) - new Date(prev.d)) / 3.15576e10;
        ret = fmt.pct(100 * g); ann = yrs > 0 ? fmt.pct(100 * (Math.pow(1 + g, 1 / yrs) - 1)) + '/yr' : '';
        const i0 = atIdx(prev.d), i1 = atIdx(r.d);
        if (i0 && i1) vsIdx = `index ${fmt.pct(100 * (i1 / i0 - 1))}`;
      }
      return `<div class="hist"><span>${r.d}</span><span>${fmt.ptype(r.t)}${r.n ? ' · new build' : ''} ${fmt.own(r.o) ? '· ' + fmt.own(r.o) : ''}${r.m2 ? ` · ${r.m2} m²` : ''}</span><span class="p">${fmt.money(r.p, s.currency)}${r.m2 ? `<br><span class="mute" style="font-weight:400">${fmt.money(r.p / r.m2, s.currency)}/m²</span>` : ''}</span><span class="r ${fmt.cls(parseFloat(ret))}">${ret} <span class="mute">${ann}</span><br><span class="mute">${vsIdx}</span></span></div>`;
    }).join('');
    const i1 = atIdx(last.d), iNow = idx.value[idx.period.indexOf(s.data_through)];
    const rolled = i1 && iNow ? last.p * iNow / i1 : null;
    app.innerHTML = `<div class="crumbs"><a href="#/">Cities</a> › <a href="#/city/${key}">${esc(s.name)}</a> › <a href="#/area/${key}/${encodeURIComponent(dist)}">${esc(dist)}</a> › Sold record</div>
      <div class="sold-head"><h1>${esc(last.a)}</h1><span class="pc">${esc(last.pc || '')}</span><span class="asof">${banner(s)}</span></div>
      <div class="tiles"><div class="tile"><div class="k">Last sold</div><div class="v">${fmt.money(last.p, s.currency)}</div><div class="s">${last.d}</div></div>
        <div class="tile"><div class="k">Index-implied value today</div><div class="v">${rolled ? fmt.money(rolled, s.currency) : '–'}</div><div class="s">last price × ${esc(s.name)} index since sale; not a valuation</div></div>
        <div class="tile"><div class="k">Sales on record</div><div class="v">${rows.length}</div><div class="s">since ${rows[0].d.slice(0, 4)}</div></div></div>
      <div class="card"><h2>Sold history</h2><div class="hist head"><span>Date</span><span>Type</span><span class="p">Price</span><span class="r">Change</span></div>${lines}
        <p class="note">${s.key === 'singapore' ? 'HDB publishes no unit numbers, so records are grouped by block, street, storey band, flat type and floor area: a "dwelling" here is a unit type within a block band, and consecutive sales may be different but near-identical flats.' : 'Records paired by normalised address from the register; a changed address format can split one dwelling into two keys.'} The index-implied value rolls the last price forward by the city repeat-sales index and carries that index's uncertainty plus the dwelling's own idiosyncratic risk (roughly 15% for a typical dwelling). An attribute-based valuation with calibrated intervals follows in a later release.</p></div>`;
    document.getElementById('attribution').textContent = s.attribution;
  });

  // ------------------------------------------------------------ methodology
  route('/methodology', async (app) => {
    app.innerHTML = `<div class="prose"><h1>Methodology</h1>
      <h2>Repeat-sales index</h2><p>Geometric Bailey-Muth-Nourse regression on log price changes between consecutive sales of the same dwelling, with Case-Shiller interval weights (pair variance grows with holding period). Pairs held under six months, with annualised log returns above 100%, or beyond four robust standard deviations are excluded, as are non-arm's-length records (Price Paid category B).</p>
      <p>Areas are estimated jointly with the city in one sparse regression: each area's index is the parent's index plus a penalised deviation. Where an area-month has few pairs its deviation shrinks toward the parent; where it has many, its own data dominate. Each area page shows the resulting own-data weight. Standard errors are approximate (residual sigma over the square root of effective pairs).</p>
      <h2>Provisional data</h2><p>Registers fill in after the month ends. The last two months of Price Paid Data typically hold well under 90% of their eventual rows, so they are drawn dotted and excluded from the headline changes. A measured completeness curve replaces this fixed rule once several monthly vintages have been archived.</p>
      <h2>How dwellings are matched across sales</h2><p>London: normalised address from the register (postcode, building, unit, street); a changed address format can split one dwelling into two keys. New York: tax lot (BBL) plus apartment number; co-ops are share prices and are kept as their own ownership form. Singapore HDB: no unit numbers are published, so a key is block, street, storey band, flat type and floor area; a pair can be two different near-identical flats, making it a unit-type repeat-sales index.</p>
      <h2>What is not shown</h2><p>No listings, asking prices or days on market: this site uses sold and registered transactions only, from open official sources. No raw median comparisons across cities with different dwelling mixes, and price per m² only where the register carries floor area on a stated basis (HDB exclusive area; New York gross square feet, mostly houses).</p>
      <h2>Sources</h2><p>HM Land Registry Price Paid Data (OGL v3) and OS Code-Point Open (OGL v3). HDB resale flat prices via data.gov.sg (Singapore Open Data Licence) and OneMap (Singapore Land Authority). NYC Department of Finance annualized sales via NYC Open Data. BIS residential property prices and OECD analytical house price indicators for the country layer. Basemap: OpenFreeMap / OpenMapTiles / OpenStreetMap contributors.</p></div>`;
  });
})();
