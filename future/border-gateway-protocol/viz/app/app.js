'use strict';

const COLORS = {
  'eBGP': '#e53935', 'iBGP': '#fb8c00', 'OSPF': '#1e88e5',
  'OSPF-E1': '#8e24aa', 'OSPF-E2': '#00bfa5', 'direct': '#43a047',
};
// Per-class line treatment, used for both lit edges and the legend so the two
// always agree. 'dashpat' is a cytoscape line-dash-pattern (style 'dashed').
const LINE_STYLE = {
  'eBGP':    { style: 'solid' },
  'iBGP':    { style: 'dashed', dashpat: [6, 4] },
  'OSPF':    { style: 'dotted' },
  'OSPF-E1': { style: 'dashed', dashpat: [10, 4] },
  'OSPF-E2': { style: 'dashed', dashpat: [12, 3, 2, 3] },  // dash-dot
  'direct':  { style: 'solid' },
};
// The legend, defined here (not from the recording) so styling tweaks take
// effect without re-recording.
const LEGEND = [
  { key: 'eBGP', label: 'eBGP (between ASes)' },
  { key: 'iBGP', label: 'iBGP (within an AS)' },
  { key: 'OSPF', label: 'OSPF (intra / inter-area)' },
  { key: 'OSPF-E1', label: 'OSPF external type 1' },
  { key: 'OSPF-E2', label: 'OSPF external type 2' },
  { key: 'direct', label: 'directly connected' },
];
// Which topology edge a route of each class travels over.
const CLASS_RELATION = {
  'eBGP': 'ebgp', 'iBGP': 'ibgp',
  'OSPF': 'ospf', 'OSPF-E1': 'ospf', 'OSPF-E2': 'ospf',
};

const state = {
  bundle: null, cy: null, prefix: null, seq: 0, maxSeq: 0,
  playing: false, timer: null, edgeIndex: new Map(), orgColor: new Map(),
  selectedRouter: null, selectedEdge: null, selectedAs: null, ping: null,
  allMode: false, asOriginated: {},
};

function $(id) { return document.getElementById(id); }
const keyPair = (a, b, rel) => [a, b].sort().join('|') + '|' + rel;
const shortName = id => (id || '').replace('router-', '');
const prefixSortKey = p => p.split('/')[0].split('.').map(Number);

// ---- IP / CIDR helpers (for the ping path tracer) ----
const ipToInt = ip => ip.split('.').reduce((a, o) => ((a << 8) >>> 0) + (+o), 0) >>> 0;
function inCidr(ip, cidr) {
  const [net, m] = cidr.split('/');
  const mask = m === '0' ? 0 : (0xFFFFFFFF << (32 - +m)) >>> 0;
  return ((ipToInt(ip) & mask) >>> 0) === ((ipToInt(net) & mask) >>> 0);
}
// Longest-prefix-match in a router's RIB at `seq` for a destination IP.
function lpm(router, ip, seq) {
  let best = null, bestLen = -1;
  for (const r of ribAt(router, seq)) {
    const len = +r.prefix.split('/')[1];
    if (len > bestLen && inCidr(ip, r.prefix)) { best = r; bestLen = len; }
  }
  return best;
}
// Trace forwarding hop-by-hop from `src` toward `dstIp` using recorded RIBs.
// Ends when a router has a directly-connected route covering dstIp (it's on the
// destination's wire); the final on-link delivery to `destRouter` is appended so
// the drawn path actually reaches the destination. Returns segments + ok/reason.
function tracePath(src, dstIp, seq, destRouter) {
  const segs = [];
  const visited = new Set([src]);
  let cur = src;
  for (let i = 0; i < 64; i++) {
    const route = lpm(cur, dstIp, seq);
    if (!route) return { ok: false, segs, end: cur,
      reason: `no route to ${dstIp} at ${shortName(cur)}` };
    if (route.cls === 'direct' || !route.nhRouter) {
      // On `cur`'s wire. Add the last hop to the destination itself if needed.
      if (destRouter && cur !== destRouter) {
        segs.push({ from: cur, to: destRouter, prefix: route.prefix, cls: 'direct' });
        return { ok: true, segs, end: destRouter };
      }
      return { ok: true, segs, end: cur };
    }
    const next = route.nhRouter;
    segs.push({ from: cur, to: next, prefix: route.prefix, cls: route.cls });
    if (visited.has(next)) return { ok: false, segs, end: next,
      reason: `routing loop at ${shortName(next)}` };
    visited.add(next);
    cur = next;
  }
  return { ok: false, segs, end: cur, reason: 'path too long (>64 hops)' };
}

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

  for (const as of ases) {
    const blocks = asBlocks(as);
    els.push({ data: {
      id: `as:${as}`, kind: 'as',
      label: blocks ? `AS${as} · ${blocks}` : `AS${as}`,
    }});
  }

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
  { selector: 'edge.edge-selected', style: {
    'overlay-color': '#ffffff', 'overlay-opacity': 0.25, 'overlay-padding': 5 } },
  { selector: 'node.as-selected', style: {
    'border-color': '#ffffff', 'border-opacity': 0.9 } },
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
  state.cy.on('tap', 'node[kind="as"]', e => openAs(e.target.id()));
  state.cy.on('tap', 'edge', e => openEdge(e.target.id()));
  state.cy.on('tap', e => { if (e.target === state.cy) closeInspector(); });

  // Drag a router to rearrange the map; the new layout persists across reloads.
  state.cy.on('dragfree', 'node[kind="router"]', () => savePositions(sig));
}

// An SVG line swatch that mirrors how the edge is actually drawn (color + dash).
function legendSwatch(key) {
  const color = COLORS[key];
  const ls = LINE_STYLE[key] || { style: 'solid' };
  let dash = '';
  if (ls.style === 'dotted') dash = '2,3';
  else if (ls.dashpat) dash = ls.dashpat.join(',');
  else if (ls.style === 'dashed') dash = '6,4';
  return `<svg class="swatch" width="26" height="10" viewBox="0 0 26 10">` +
    `<line x1="1" y1="5" x2="25" y2="5" stroke="${color}" stroke-width="3"` +
    (dash ? ` stroke-dasharray="${dash}"` : '') + `/></svg>`;
}

function renderLegend() {
  const items = LEGEND.map(l =>
    `<li>${legendSwatch(l.key)}<span>${l.label}</span></li>`).join('');
  $('legend').innerHTML = items +
    `<li class="legend-note"><span class="arrow-glyph">→</span>` +
    `<span>points to the router that advertised the route (the next hop)</span></li>`;
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
      e.removeStyle('line-color width opacity line-style line-dash-pattern ' +
        'target-arrow-shape target-arrow-color source-arrow-shape source-arrow-color');
    });
  });
}

// Light an edge in a protocol's color + line treatment (so it matches the
// legend). `cls` selects the dash pattern; extra is merged in (e.g. arrows).
function litEdgeStyle(cls, color, width, opacity, extra = {}) {
  const ls = LINE_STYLE[cls] || { style: 'solid' };
  const s = { 'line-color': color, 'width': width, 'opacity': opacity, ...extra };
  if (ls.style === 'dotted') s['line-style'] = 'dotted';
  else if (ls.dashpat) { s['line-style'] = 'dashed'; s['line-dash-pattern'] = ls.dashpat; }
  else s['line-style'] = 'solid';
  return s;
}

function applyTime(seq) {
  state.seq = seq;
  const snap = state.bundle.snapshots[seq];
  $('clock').textContent = `t = ${(snap ? snap.t_ms / 1000 : 0).toFixed(1)}s`;
  $('seq-label').textContent = `snap ${seq}/${state.maxSeq}`;
  $('scrubber').value = seq;
  refreshInspector();
  if (state.ping) { drawPing(); return; }
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
          // Arrowhead points to the sender (the next hop that advertised it).
          const arrowToTarget = edge.data('target') === nh;
          edge.style(litEdgeStyle(cls, color, 4, 0.95, {
            [arrowToTarget ? 'target-arrow-shape' : 'source-arrow-shape']: 'triangle',
            [arrowToTarget ? 'target-arrow-color' : 'source-arrow-color']: color,
          }));
        }
      }
    }
    // Color the links between directly-connected (origin) routers green --
    // these are the shared segment the prefix lives on.
    const originSet = new Set(pObj.origins);
    if (originSet.size > 1) {
      state.cy.edges().forEach(e => {
        if (originSet.has(e.data('source')) && originSet.has(e.data('target'))) {
          e.style(litEdgeStyle('direct', COLORS.direct, 4, 0.95));
        }
      });
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

// Routes currently crossing an adjacency at `seq`, in both directions. A route
// to P "crosses" edge A-B (relation rel) if A's best route to P has next-hop B
// over a protocol of that relation (B advertised P to A), or vice-versa.
function edgeRoutesAt(eid, seq) {
  const edge = state.cy.getElementById(eid);
  const A = edge.data('source'), B = edge.data('target'), rel = edge.data('relation');
  const rows = [];
  const collect = (learner, advertiser) => {
    for (const r of ribAt(learner, seq)) {
      if (r.nhRouter === advertiser && CLASS_RELATION[r.cls] === rel) {
        rows.push({ prefix: r.prefix, cls: r.cls, from: advertiser, to: learner,
                    asPath: r.asPath });
      }
    }
  };
  collect(A, B);
  collect(B, A);
  rows.sort((a, b) => {
    const ka = prefixSortKey(a.prefix), kb = prefixSortKey(b.prefix);
    for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return a.from < b.from ? -1 : 1;
  });
  return { A, B, rel, rows };
}

const REL_INFO = {
  ebgp: ['eBGP', COLORS.eBGP], ibgp: ['iBGP', COLORS.iBGP], ospf: ['OSPF', COLORS.OSPF],
};

function renderRouterRib(r) {
  $('rib-title').textContent = shortName(r);
  const rows = ribAt(r, state.seq);
  $('rib-count').textContent = `${rows.length} route${rows.length === 1 ? '' : 's'}`;

  const others = state.bundle.topology.nodes
    .map(n => n.id).filter(id => id !== r).sort();
  const pingCtl =
    `<div class="ping-ctl"><span class="lbl">ping</span>` +
    `<select id="ping-target">` +
    others.map(id => `<option value="${id}">${shortName(id)}</option>`).join('') +
    `</select><button id="ping-go">trace ▸</button></div>`;

  let tableHtml;
  if (!rows.length) {
    tableHtml = `<div class="empty">No routes yet at this point in time.</div>`;
  } else {
    const body = rows.map(row => {
      const color = COLORS[row.cls] || '#fff';
      const via = row.cls === 'direct'
        ? `direct · ${row.iface || ''}`
        : `${shortName(row.nhRouter) || row.nhIp || '?'}`;
      const isCur = row.prefix === state.prefix ? ' class="cur-prefix"' : '';
      return `<tr${isCur}><td class="pfx">${row.prefix}</td>` +
        `<td class="proto" style="color:${color}">${row.cls}</td>` +
        `<td class="via">${via}</td><td class="via">${row.asPath || ''}</td></tr>`;
    }).join('');
    tableHtml =
      `<table><thead><tr><th>prefix</th><th>proto</th><th>via</th><th>as-path</th></tr></thead>` +
      `<tbody>${body}</tbody></table>`;
  }
  $('rib-body').innerHTML = pingCtl + tableHtml;
  $('ping-go').onclick = () => startPing(r, $('ping-target').value);
}

function renderEdgeRoutes(eid) {
  const { A, B, rel, rows } = edgeRoutesAt(eid, state.seq);
  const [relLabel, relColor] = REL_INFO[rel] || [rel, '#fff'];
  $('rib-title').innerHTML =
    `${shortName(A)} ⇄ ${shortName(B)} · <span style="color:${relColor}">${relLabel}</span>`;
  $('rib-count').textContent = `${rows.length} route${rows.length === 1 ? '' : 's'} crossing`;
  if (!rows.length) {
    $('rib-body').innerHTML =
      `<div class="empty">No routes crossing this link at this point in time.</div>`;
    return;
  }
  const body = rows.map(r => {
    const color = COLORS[r.cls] || '#fff';
    const dir = `${shortName(r.from)} → ${shortName(r.to)}`;
    const isCur = r.prefix === state.prefix ? ' class="cur-prefix"' : '';
    return `<tr${isCur}><td class="pfx">${r.prefix}</td>` +
      `<td class="proto" style="color:${color}">${r.cls}</td>` +
      `<td class="via">${dir}</td><td class="via">${r.asPath || ''}</td></tr>`;
  }).join('');
  $('rib-body').innerHTML =
    `<table><thead><tr><th>prefix</th><th>proto</th><th>direction</th><th>as-path</th></tr></thead>` +
    `<tbody>${body}</tbody></table>`;
}

// Prefixes that originate in each AS (its direct/origin networks), keyed by AS.
// A prefix belongs to the AS that owns its IP space (its org), not just whoever
// happens to be the first origin -- inter-AS link subnets are directly attached
// to routers in both ASes but are numbered in one AS's space.
function computeAsOriginated() {
  const nodeAs = {}, orgAs = {};
  for (const n of state.bundle.topology.nodes) {
    nodeAs[n.id] = n.as;
    orgAs[n.org] = n.as;  // org -> AS
  }
  const out = {};
  for (const p of state.bundle.prefixes) {
    if (!p.origins || !p.origins.length) continue;
    const as = orgAs[p.owner_org] ?? nodeAs[p.origins[0]];
    // Prefer origins that actually sit in this AS (drops the far end of a link).
    let origins = p.origins.filter(r => nodeAs[r] === as);
    if (!origins.length) origins = p.origins;
    (out[as] ||= []).push({ prefix: p.prefix, origins, org: p.owner_org });
  }
  for (const as of Object.keys(out)) {
    out[as].sort((a, b) => {
      const ka = prefixSortKey(a.prefix), kb = prefixSortKey(b.prefix);
      for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return 0;
    });
  }
  return out;
}

// A compact "/8 blocks this AS owns" string, e.g. "1/8" or "3,4,8,9,100+2/8".
function asBlocks(as) {
  const list = state.asOriginated[as] || [];
  const octs = [...new Set(list.map(o => +o.prefix.split('.')[0]))].sort((a, b) => a - b);
  if (!octs.length) return '';
  const shown = octs.slice(0, 5).join(',');
  const more = octs.length > 5 ? `+${octs.length - 5}` : '';
  return `${shown}${more}/8`;
}

function refreshInspector() {
  if (state.ping) renderPing();
  else if (state.selectedRouter) renderRouterRib(state.selectedRouter);
  else if (state.selectedEdge) renderEdgeRoutes(state.selectedEdge);
  else if (state.selectedAs) renderAsDetail(state.selectedAs);
}

function clearSelStyles() {
  state.cy.nodes('[kind="router"]').removeClass('router-selected');
  state.cy.nodes('[kind="as"]').removeClass('as-selected');
  state.cy.edges().removeClass('edge-selected');
}

function beginSelection() {
  state.selectedRouter = state.selectedEdge = state.selectedAs = null;
  state.ping = null;
  $('rib-panel').classList.remove('hidden');
  clearSelStyles();
}

function openRib(router) {
  beginSelection();
  state.selectedRouter = router;
  state.cy.getElementById(router).addClass('router-selected');
  applyTime(state.seq);  // render panel + restore the map's normal mode
}

function openEdge(eid) {
  beginSelection();
  state.selectedEdge = eid;
  state.cy.getElementById(eid).addClass('edge-selected');
  applyTime(state.seq);
}

function openAs(asId) {
  beginSelection();
  state.selectedAs = asId;
  state.cy.getElementById(asId).addClass('as-selected');
  applyTime(state.seq);
}

function renderAsDetail(asId) {
  const as = asId.replace('as:', '');
  const list = state.asOriginated[as] || [];
  $('rib-title').innerHTML = `AS${as} <span class="muted">· originated routes</span>`;
  $('rib-count').textContent = `${list.length} prefix${list.length === 1 ? '' : 'es'}`;
  if (!list.length) {
    $('rib-body').innerHTML = `<div class="empty">No prefixes originate in this AS.</div>`;
    return;
  }
  const body = list.map(o => {
    const isCur = o.prefix === state.prefix ? ' class="cur-prefix"' : '';
    return `<tr${isCur}><td class="pfx">${o.prefix}</td>` +
      `<td class="via">${o.origins.map(shortName).join(', ')}</td>` +
      `<td class="via">${o.org}</td></tr>`;
  }).join('');
  $('rib-body').innerHTML =
    `<table><thead><tr><th>prefix</th><th>origin</th><th>org</th></tr></thead>` +
    `<tbody>${body}</tbody></table>`;
}

const nodeById = id => state.bundle.topology.nodes.find(n => n.id === id);

function startPing(src, dst) {
  const sN = nodeById(src), dN = nodeById(dst);
  state.ping = { src, dst, srcIp: (sN.ips[0] || ''), dstIp: (dN.ips[0] || '') };
  state.selectedRouter = state.selectedEdge = state.selectedAs = null;
  $('rib-panel').classList.remove('hidden');
  clearSelStyles();
  applyTime(state.seq);  // renders ping panel (via refreshInspector) + map
}

function pingPathRows(res) {
  if (!res.segs.length) {
    return res.ok ? `<div class="hop muted">directly connected — no router hops</div>` : '';
  }
  return res.segs.map(s => {
    const color = COLORS[s.cls] || '#fff';
    return `<div class="hop"><span class="r">${shortName(s.from)}</span>` +
      `<span class="arr">→</span><span class="r">${shortName(s.to)}</span>` +
      `<span class="via">${s.prefix} <b style="color:${color}">${s.cls}</b></span></div>`;
  }).join('');
}

function pingBlock(label, fromIp, toIp, res, destRouter) {
  let status;
  if (res.ok) {
    status = res.end === destRouter
      ? `<span class="ok">✓ reached ${shortName(destRouter)}</span>`
      : `<span class="ok">✓ delivered on-link at ${shortName(res.end)}</span>`;
  } else {
    status = `<span class="fail">✗ ${res.reason}</span>`;
  }
  return `<div class="ping-block"><div class="ping-h">${label} ` +
    `<span class="muted mono">${fromIp} → ${toIp}</span></div>` +
    `<div class="ping-status">${status}</div>${pingPathRows(res)}</div>`;
}

function renderPing() {
  const p = state.ping;
  const sN = nodeById(p.src), dN = nodeById(p.dst);
  const fwd = tracePath(p.src, p.dstIp, state.seq, p.dst);
  const rev = tracePath(p.dst, p.srcIp, state.seq, p.src);
  p._fwd = fwd; p._rev = rev;  // stash for the map drawing

  $('rib-title').innerHTML = `ping · ${shortName(p.src)} → ${shortName(p.dst)}`;
  $('rib-count').textContent = `${fwd.segs.length} hop${fwd.segs.length === 1 ? '' : 's'} out`;

  const ipSel = (id, ips, sel) =>
    `<select id="${id}">${ips.map(ip =>
      `<option${ip === sel ? ' selected' : ''}>${ip}</option>`).join('')}</select>`;
  const ctrls =
    `<div class="ping-ctl"><span class="lbl">from</span>${ipSel('ping-srcip', sN.ips, p.srcIp)}` +
    `<span class="lbl">to</span>${ipSel('ping-dstip', dN.ips, p.dstIp)}` +
    `<button id="ping-back">↩ back</button></div>`;

  $('rib-body').innerHTML = ctrls +
    pingBlock('forward', p.srcIp, p.dstIp, fwd, p.dst) +
    pingBlock('return', p.dstIp, p.srcIp, rev, p.src);

  $('ping-srcip').onchange = e => { state.ping.srcIp = e.target.value; applyTime(state.seq); };
  $('ping-dstip').onchange = e => { state.ping.dstIp = e.target.value; applyTime(state.seq); };
  $('ping-back').onclick = () => openRib(state.ping.src);
}

const PING_FWD = '#ffd54f', PING_REV = '#4fc3f7';
function anyEdgeBetween(a, b) {
  const es = state.cy.edges().filter(e =>
    (e.data('source') === a && e.data('target') === b) ||
    (e.data('source') === b && e.data('target') === a));
  return es.length ? es[0] : null;
}
function highlightSeg(s, color, dashed) {
  const rel = CLASS_RELATION[s.cls];
  let edge = null;
  if (rel) {
    const eid = state.edgeIndex.get(keyPair(s.from, s.to, rel));
    edge = eid && state.cy.getElementById(eid);
  }
  if (!edge || !edge.length) edge = anyEdgeBetween(s.from, s.to);  // final on-link hop
  if (!edge || !edge.length) return;
  const toTarget = edge.data('target') === s.to;
  const st = {
    'line-color': color, 'width': 5, 'opacity': 1,
    'line-style': dashed ? 'dashed' : 'solid',
    [toTarget ? 'target-arrow-shape' : 'source-arrow-shape']: 'triangle',
    [toTarget ? 'target-arrow-color' : 'source-arrow-color']: color,
  };
  if (dashed) st['line-dash-pattern'] = [8, 4];
  edge.style(st);
}

function drawPing() {
  const { _fwd: fwd, _rev: rev, src, dst } = state.ping;
  resetGraphStyles();
  state.cy.batch(() => {
    const lit = (id, color) => state.cy.getElementById(id)
      .style({ 'opacity': 1, 'border-width': 3, 'border-color': color });
    lit(src, PING_FWD);
    for (const s of fwd.segs) { lit(s.to, PING_FWD); highlightSeg(s, PING_FWD, false); }
    lit(dst, PING_REV);
    for (const s of rev.segs) { lit(s.to, PING_REV); highlightSeg(s, PING_REV, true); }
  });
}

function closeInspector() {
  state.selectedRouter = state.selectedEdge = state.selectedAs = null;
  state.ping = null;
  $('rib-panel').classList.add('hidden');
  clearSelStyles();
  applyTime(state.seq);  // revert map to its normal mode (all-routes / single-prefix)
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
      const dom = dominantClass(agg.classes);
      const color = COLORS[dom] || '#fff';
      state.cy.getElementById(eid).style(
        litEdgeStyle(dom, color, 1.6 + Math.min(agg.count, 10) * 0.7, 0.9));
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
  $('rib-close').onclick = closeInspector;
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
  state.asOriginated = computeAsOriginated();  // before initCy (AS labels use it)

  const params = b.snapshots.length
    ? `${b.snapshots.length} snapshots · ${(b.snapshots.at(-1).t_ms / 1000).toFixed(0)}s · ${b.topology.nodes.length} routers`
    : '';
  $('run-meta').textContent = params;

  initCy(b.topology, new URLSearchParams(location.search).get('relayout') === '1');
  renderLegend();
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
  const edgeId = qs.get('edge');
  if (edgeId && state.cy.getElementById(edgeId).length) openEdge(edgeId);
  const asId = qs.get('as');
  if (asId && state.cy.getElementById(asId).length) openAs(asId);
  const pg = (qs.get('ping') || '').split(',');
  if (pg.length === 2 && nodeById(pg[0]) && nodeById(pg[1])) startPing(pg[0], pg[1]);
  applyTime(seq);
}

main();
