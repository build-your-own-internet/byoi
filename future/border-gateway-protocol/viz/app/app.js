'use strict';

const COLORS = {
  'eBGP': '#e53935', 'iBGP': '#fb8c00', 'OSPF': '#1e88e5',
  'OSPF-E1': '#8e24aa', 'OSPF-E2': '#00acc1', 'direct': '#43a047',
};
// Which topology edge a route of each class travels over.
const CLASS_RELATION = {
  'eBGP': 'ebgp', 'iBGP': 'ibgp',
  'OSPF': 'ospf', 'OSPF-E1': 'ospf', 'OSPF-E2': 'ospf',
};

const state = {
  bundle: null, cy: null, prefix: null, seq: 0, maxSeq: 0,
  playing: false, timer: null, edgeIndex: new Map(), orgColor: new Map(),
  selectedRouter: null, allMode: false,
};

function $(id) { return document.getElementById(id); }
const keyPair = (a, b, rel) => [a, b].sort().join('|') + '|' + rel;
const shortName = id => (id || '').replace('router-', '');
const prefixSortKey = p => p.split('/')[0].split('.').map(Number);

async function loadRun() {
  const params = new URLSearchParams(location.search);
  const url = params.get('run') || './run.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

function asOfOrg(topo, org) {
  const n = topo.nodes.find(x => x.org === org);
  return n ? String(n.as) : '0';
}

function buildGraph(topo) {
  const els = [];
  const orgs = [...new Set(topo.nodes.map(n => n.org))];
  const ases = [...new Set(topo.nodes.map(n => String(n.as)))];

  for (const as of ases)
    els.push({ data: { id: `as:${as}`, label: `AS${as}`, kind: 'as' } });

  for (const org of orgs) {
    const node = topo.nodes.find(n => n.org === org);
    state.orgColor.set(org, node.color);
    els.push({ data: {
      id: `org:${org}`, parent: `as:${asOfOrg(topo, org)}`,
      label: (node.org_label || org), color: node.color, kind: 'org',
    }});
  }

  for (const n of topo.nodes) {
    els.push({ data: {
      id: n.id, parent: `org:${n.org}`, label: n.label,
      color: n.color, kind: 'router', ips: (n.ips || []).join(', '),
    }});
  }

  for (const l of topo.links) {
    const id = `${l.source}__${l.target}__${l.relation}`;
    els.push({ data: { id, source: l.source, target: l.target, relation: l.relation } });
    state.edgeIndex.set(keyPair(l.source, l.target, l.relation), id);
  }
  return els;
}

const STYLE = [
  { selector: 'node[kind="as"]', style: {
    'label': 'data(label)', 'text-valign': 'top', 'text-halign': 'center',
    'font-size': 18, 'font-weight': 'bold', 'color': '#8b949e',
    'background-opacity': 0.04, 'background-color': '#ffffff',
    'border-width': 2, 'border-style': 'dashed', 'border-color': '#3a4252',
    'shape': 'round-rectangle', 'padding': 26, 'text-margin-y': -6,
  }},
  { selector: 'node[kind="org"]', style: {
    'label': 'data(label)', 'text-valign': 'top', 'text-halign': 'center',
    'font-size': 13, 'font-weight': 'bold', 'color': 'data(color)',
    'background-opacity': 0.10, 'background-color': 'data(color)',
    'border-width': 1, 'border-color': 'data(color)', 'border-opacity': 0.5,
    'shape': 'round-rectangle', 'padding': 16, 'text-margin-y': -4,
  }},
  { selector: 'node[kind="router"]', style: {
    'label': 'data(label)', 'text-valign': 'center', 'text-halign': 'center',
    'font-size': 12, 'font-weight': 'bold', 'color': '#fff',
    'text-outline-width': 2, 'text-outline-color': '#0e1116',
    'background-color': 'data(color)', 'width': 38, 'height': 38,
    'border-width': 2, 'border-color': '#0e1116',
  }},
  { selector: 'edge', style: {
    'curve-style': 'bezier', 'width': 1.6,
    'line-color': '#30363d', 'opacity': 0.18,
  }},
  { selector: 'edge[relation="ebgp"]', style: { 'line-style': 'solid' } },
  { selector: 'edge[relation="ibgp"]', style: { 'line-style': 'dashed' } },
  { selector: 'edge[relation="ospf"]', style: { 'line-style': 'dotted' } },
  { selector: 'node.router-selected', style: {
    'overlay-color': '#ffffff', 'overlay-opacity': 0.22, 'overlay-padding': 6 } },
];

const COSE_OPTS = {
  name: 'cose', animate: false, randomize: true, padding: 30,
  idealEdgeLength: 70, nodeOverlap: 14, nodeRepulsion: 9000,
  gravity: 0.5, nestingFactor: 1.1, numIter: 1200,
};

// A signature of the *shape* of the network. If nodes/links change, the cached
// layout is invalidated and we recompute; otherwise the map is identical run to
// run (positions are pinned from localStorage).
function topoSignature(topo) {
  const ns = topo.nodes.map(n => n.id).sort().join(',');
  const es = topo.links.map(l => [l.source, l.target, l.relation].sort().join('~'))
    .sort().join(',');
  let h = 5381;
  const s = ns + '|' + es;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'byoi-layout:' + (h >>> 0).toString(36);
}

function loadPositions(sig) {
  try { return JSON.parse(localStorage.getItem(sig) || 'null'); }
  catch { return null; }
}
function savePositions(sig) {
  const pos = {};
  state.cy.nodes('[kind="router"]').forEach(n => {
    const p = n.position();
    pos[n.id()] = { x: Math.round(p.x), y: Math.round(p.y) };
  });
  try { localStorage.setItem(sig, JSON.stringify(pos)); } catch {}
}

function relayout() {
  localStorage.removeItem(state.layoutSig);
  const l = state.cy.layout(COSE_OPTS);
  l.one('layoutstop', () => { savePositions(state.layoutSig); state.cy.fit(undefined, 40); });
  l.run();
}

function initCy(topo, forceRelayout = false) {
  const sig = topoSignature(topo);
  state.layoutSig = sig;
  const cached = forceRelayout ? null : loadPositions(sig);

  const els = buildGraph(topo);
  if (cached) {
    for (const el of els) {
      if (el.data.kind === 'router' && cached[el.data.id]) el.position = cached[el.data.id];
    }
  }

  state.cy = cytoscape({
    container: $('cy'),
    elements: els,
    style: STYLE,
    // Pinned positions -> deterministic 'preset'; otherwise compute once + cache.
    layout: cached ? { name: 'preset', fit: true, padding: 40 } : COSE_OPTS,
    wheelSensitivity: 0.25, minZoom: 0.2, maxZoom: 3,
  });
  if (!cached) state.cy.one('layoutstop', () => savePositions(sig));
  state.cy.fit(undefined, 40);

  // Click a router to inspect its routing table; click empty space to close.
  state.cy.on('tap', 'node[kind="router"]', e => openRib(e.target.id()));
  state.cy.on('tap', e => { if (e.target === state.cy) closeRib(); });

  // Drag a router to rearrange the map; the new layout persists across reloads.
  state.cy.on('dragfree', 'node[kind="router"]', () => savePositions(sig));
}

function renderLegend(legend) {
  $('legend').innerHTML = legend.map(l =>
    `<li><span class="swatch" style="background:${l.color}"></span>${l.label}</li>`
  ).join('');
}

function renderPrefixList(prefixes, filter = '') {
  const f = filter.trim().toLowerCase();
  const list = $('prefix-list');
  list.innerHTML = '';
  for (const p of prefixes) {
    if (f && !p.prefix.toLowerCase().includes(f) && !p.owner_org.includes(f)) continue;
    const color = state.orgColor.get(p.owner_org) || '#888';
    const div = document.createElement('div');
    div.className = 'prefix-item' + (p.prefix === state.prefix ? ' active' : '');
    div.innerHTML =
      `<span class="dot" style="background:${color}"></span>` +
      `<span class="pfx">${p.prefix}</span>` +
      `<span class="org">${p.owner_org}</span>`;
    div.onclick = () => selectPrefix(p.prefix);
    list.appendChild(div);
  }
}

// Latest event at or before `seq` for each router => {cls, nh}.
function stateAt(prefixObj, seq) {
  const out = new Map();
  for (const [router, events] of Object.entries(prefixObj.events)) {
    let chosen = null;
    for (const [s, cls, nh] of events) {
      if (s <= seq) chosen = { cls, nh }; else break;
    }
    if (chosen) out.set(router, chosen);
  }
  return out;
}

function resetGraphStyles() {
  state.cy.batch(() => {
    state.cy.nodes('[kind="router"]').forEach(n => {
      n.style({ 'opacity': 0.22, 'border-width': 2, 'border-color': '#0e1116' });
    });
    state.cy.edges().forEach(e => {
      e.removeStyle('line-color width opacity target-arrow-shape ' +
        'target-arrow-color source-arrow-shape source-arrow-color');
    });
  });
}

function applyTime(seq) {
  state.seq = seq;
  const snap = state.bundle.snapshots[seq];
  $('clock').textContent = `t = ${(snap ? snap.t_ms / 1000 : 0).toFixed(1)}s`;
  $('seq-label').textContent = `snap ${seq}/${state.maxSeq}`;
  $('scrubber').value = seq;
  refreshRib();
  if (state.allMode) { applyAllRoutes(seq); return; }
  if (!state.prefix) return;

  const pObj = state.bundle.prefixes.find(p => p.prefix === state.prefix);
  if (!pObj) return;
  const learned = stateAt(pObj, seq);

  resetGraphStyles();
  state.cy.batch(() => {
    for (const [router, { cls, nh }] of learned) {
      const color = COLORS[cls] || '#fff';
      const node = state.cy.getElementById(router);
      node.style({ 'opacity': 1, 'border-width': 4, 'border-color': color });
      // Light up the edge the route arrived over (nh -> router).
      const rel = CLASS_RELATION[cls];
      if (nh && rel) {
        const eid = state.edgeIndex.get(keyPair(router, nh, rel));
        const edge = eid && state.cy.getElementById(eid);
        if (edge && edge.length) {
          const arrowToTarget = edge.data('target') === router;
          edge.style({
            'line-color': color, 'width': 4, 'opacity': 0.95,
            [arrowToTarget ? 'target-arrow-shape' : 'source-arrow-shape']: 'triangle',
            [arrowToTarget ? 'target-arrow-color' : 'source-arrow-color']: color,
          });
        }
      }
    }
  });
  renderDetail(pObj, learned);
}

function renderDetail(pObj, learned) {
  const counts = {};
  for (const { cls } of learned.values()) counts[cls] = (counts[cls] || 0) + 1;
  const total = state.bundle.topology.nodes.length;
  const rows = Object.entries(counts).sort()
    .map(([c, n]) => `<tr><td class="k"><span style="color:${COLORS[c]}">${c}</span></td><td>${n}</td></tr>`)
    .join('');
  $('detail-body').innerHTML =
    `<table>
       <tr><td class="k">prefix</td><td class="mono">${pObj.prefix}</td></tr>
       <tr><td class="k">owner</td><td>${pObj.owner_org}</td></tr>
       <tr><td class="k">origin</td><td class="mono">${pObj.origins.join(', ') || '—'}</td></tr>
       <tr><td class="k">reached</td><td>${learned.size} / ${total} routers</td></tr>
       ${rows}
     </table>`;
}

// Reconstruct a router's routing table at `seq` by taking, for every prefix,
// the latest change-event at or before `seq`. EVENT = [seq,cls,nhRouter,nhIp,asPath,iface].
function ribAt(router, seq) {
  const rows = [];
  for (const p of state.bundle.prefixes) {
    const evs = p.events[router];
    if (!evs) continue;
    let cur = null;
    for (const e of evs) { if (e[0] <= seq) cur = e; else break; }
    if (!cur) continue;
    rows.push({ prefix: p.prefix, cls: cur[1], nhRouter: cur[2],
                nhIp: cur[3], asPath: cur[4], iface: cur[5] });
  }
  rows.sort((a, b) => {
    const ka = prefixSortKey(a.prefix), kb = prefixSortKey(b.prefix);
    for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });
  return rows;
}

function refreshRib() {
  const r = state.selectedRouter;
  if (!r) return;
  $('rib-title').textContent = shortName(r);
  const rows = ribAt(r, state.seq);
  $('rib-count').textContent = `${rows.length} route${rows.length === 1 ? '' : 's'}`;
  if (!rows.length) {
    $('rib-body').innerHTML = `<div class="empty">No routes yet at this point in time.</div>`;
    return;
  }
  const body = rows.map(row => {
    const color = COLORS[row.cls] || '#fff';
    const via = row.cls === 'direct'
      ? `direct · ${row.iface || ''}`
      : `${shortName(row.nhRouter) || row.nhIp || '?'}`;
    const ap = row.asPath ? row.asPath : '';
    const isCur = row.prefix === state.prefix ? ' class="cur-prefix"' : '';
    return `<tr${isCur}>` +
      `<td class="pfx">${row.prefix}</td>` +
      `<td class="proto" style="color:${color}">${row.cls}</td>` +
      `<td class="via">${via}</td>` +
      `<td class="via">${ap}</td></tr>`;
  }).join('');
  $('rib-body').innerHTML =
    `<table><thead><tr><th>prefix</th><th>proto</th><th>via</th><th>as-path</th></tr></thead>` +
    `<tbody>${body}</tbody></table>`;
}

function openRib(router) {
  state.selectedRouter = router;
  $('rib-panel').classList.remove('hidden');
  state.cy.nodes('[kind="router"]').removeClass('router-selected');
  state.cy.getElementById(router).addClass('router-selected');
  refreshRib();
}

function closeRib() {
  state.selectedRouter = null;
  $('rib-panel').classList.add('hidden');
  state.cy.nodes('[kind="router"]').removeClass('router-selected');
}

function dominantClass(classes) {
  const counts = {};
  for (const c of classes) counts[c] = (counts[c] || 0) + 1;
  let best = null, n = -1;
  for (const [c, k] of Object.entries(counts)) if (k > n) { best = c; n = k; }
  return best;
}

// "All routes" overview: aggregate every prefix's best route at time `seq` and
// paint the live control plane — each adjacency lit + colored + weighted by how
// many routes flow over it, each router bordered by its dominant learned proto.
function applyAllRoutes(seq) {
  const edgeAgg = new Map();   // edgeId -> {count, classes:[]}
  const totals = {};           // class -> route count network-wide
  let receiving = 0;

  resetGraphStyles();
  state.cy.batch(() => {
    for (const n of state.bundle.topology.nodes) {
      const rows = ribAt(n.id, seq);
      const nonDirect = rows.filter(r => r.cls !== 'direct');
      for (const r of rows) totals[r.cls] = (totals[r.cls] || 0) + 1;
      const node = state.cy.getElementById(n.id);
      if (nonDirect.length) {
        receiving++;
        const dom = dominantClass(nonDirect.map(r => r.cls));
        node.style({ 'opacity': 1, 'border-width': 3,
                     'border-color': COLORS[dom] || '#fff' });
      } else if (rows.length) {
        node.style({ 'opacity': 0.7 });   // has only its own direct nets
      }
      for (const r of nonDirect) {
        if (!r.nhRouter) continue;
        const rel = CLASS_RELATION[r.cls];
        const eid = rel && state.edgeIndex.get(keyPair(n.id, r.nhRouter, rel));
        if (!eid) continue;
        const agg = edgeAgg.get(eid) || { count: 0, classes: [] };
        agg.count++; agg.classes.push(r.cls);
        edgeAgg.set(eid, agg);
      }
    }
    for (const [eid, agg] of edgeAgg) {
      const color = COLORS[dominantClass(agg.classes)] || '#fff';
      state.cy.getElementById(eid).style({
        'line-color': color, 'opacity': 0.9,
        'width': 1.6 + Math.min(agg.count, 10) * 0.7,
      });
    }
  });
  renderAllDetail(totals, receiving);
}

function renderAllDetail(totals, receiving) {
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  const n = state.bundle.topology.nodes.length;
  const order = ['eBGP', 'iBGP', 'OSPF', 'OSPF-E1', 'OSPF-E2', 'direct'];
  const rows = order.filter(c => totals[c]).map(c =>
    `<tr><td class="k"><span style="color:${COLORS[c]}">${c}</span></td><td>${totals[c]}</td></tr>`
  ).join('');
  $('detail-body').innerHTML =
    `<table>
       <tr><td class="k">mode</td><td>all advertisements</td></tr>
       <tr><td class="k">best routes</td><td>${total} across the network</td></tr>
       <tr><td class="k">receiving</td><td>${receiving} / ${n} routers</td></tr>
       ${rows}
     </table>`;
}

function selectAllRoutes() {
  state.allMode = true;
  state.prefix = null;
  $('all-routes-btn').classList.add('active');
  document.querySelectorAll('.prefix-item').forEach(el => el.classList.remove('active'));
  $('overlay-hint').textContent = 'All advertisements — press ▶ to watch the control plane converge';
  applyTime(state.seq);
}

function selectPrefix(prefix) {
  state.allMode = false;
  $('all-routes-btn').classList.remove('active');
  state.prefix = prefix;
  document.querySelectorAll('.prefix-item').forEach(el => {
    el.classList.toggle('active', el.querySelector('.pfx').textContent === prefix);
  });
  $('overlay-hint').textContent = `${prefix} — press ▶ to watch it propagate`;
  applyTime(state.seq);
}

function setPlaying(on) {
  state.playing = on;
  $('play').textContent = on ? '❚❚' : '▶';
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
  if (on) {
    const speed = +$('speed').value;
    if (state.seq >= state.maxSeq) applyTime(0);
    state.timer = setInterval(() => {
      if (state.seq >= state.maxSeq) { setPlaying(false); return; }
      applyTime(state.seq + 1);
    }, speed);
  }
}

function wireControls() {
  $('play').onclick = () => setPlaying(!state.playing);
  $('rib-close').onclick = closeRib;
  $('all-routes-btn').onclick = selectAllRoutes;
  $('relayout').onclick = relayout;
  $('scrubber').oninput = e => { setPlaying(false); applyTime(+e.target.value); };
  $('speed').onchange = () => { if (state.playing) setPlaying(true); };
  $('prefix-search').oninput = e =>
    renderPrefixList(state.bundle.prefixes, e.target.value);
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!state.playing); }
    if (e.code === 'ArrowRight') applyTime(Math.min(state.maxSeq, state.seq + 1));
    if (e.code === 'ArrowLeft') applyTime(Math.max(0, state.seq - 1));
  });
}

async function main() {
  try {
    state.bundle = await loadRun();
  } catch (err) {
    $('overlay-hint').textContent = err.message;
    return;
  }
  const b = state.bundle;
  state.maxSeq = Math.max(0, b.seq_count - 1);

  const params = b.snapshots.length
    ? `${b.snapshots.length} snapshots · ${(b.snapshots.at(-1).t_ms / 1000).toFixed(0)}s · ${b.topology.nodes.length} routers`
    : '';
  $('run-meta').textContent = params;

  initCy(b.topology, new URLSearchParams(location.search).get('relayout') === '1');
  renderLegend(b.legend);
  renderPrefixList(b.prefixes);
  $('scrubber').max = state.maxSeq;
  wireControls();
  $('overlay-hint').textContent = 'Pick a prefix on the left to begin';

  // Deep-links: ?prefix= picks a prefix, ?seq= jumps to a snapshot.
  const qs = new URLSearchParams(location.search);
  const want = qs.get('prefix');
  const pick = b.prefixes.find(p => p.prefix === want) || b.prefixes[0];
  const seq = Math.max(0, Math.min(state.maxSeq, parseInt(qs.get('seq') || '0', 10) || 0));
  state.seq = seq;
  if (qs.get('all') === '1') selectAllRoutes();
  else if (pick) selectPrefix(pick.prefix);
  const router = qs.get('router');
  if (router && b.topology.nodes.some(n => n.id === router)) openRib(router);
  applyTime(seq);
}

main();
