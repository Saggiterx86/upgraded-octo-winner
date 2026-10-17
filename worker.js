// ============================================================
// PART 1 — Constants + fetchInferOdds
// ============================================================

const SHEET_URL = "https://script.google.com/macros/s/AKfycbzw7m-k21dVDsq1-cd7-8itj50yMIcPBaBENtZVAdyE3YrZyG_M3B16YGoP9u3_vDQ/exec";
const OWNER_ID = "1821028384";

const LEAGUES = [
  { code: "PL", name: "Premier League", flag: "🏴" },
  { code: "ELC", name: "Championship", flag: "🏴" },
  { code: "PD", name: "La Liga", flag: "🇪🇸" },
  { code: "BL1", name: "Bundesliga", flag: "🇩🇪" },
  { code: "SA", name: "Serie A", flag: "🇮🇹" },
  { code: "FL1", name: "Ligue 1", flag: "🇫🇷" }
];

const SIX_LEAGUE_NAMES = ["premier league", "championship", "la liga", "bundesliga", "serie a", "ligue 1"];

const INFER_LEAGUES = {
  'lg_T9268DXK': 'Premier League',
  'lg_NVRGJ4SZ': 'Championship',
  'lg_28PAYC53': 'League One',
  'lg_WYMR6XBG': 'League Two',
  'lg_FH9KCTA5': 'National League',
  'lg_PYBWSDEA': 'La Liga',
  'lg_WHR6XBGZ': 'Segunda Division',
  'lg_QXCSBRME': 'Serie A',
  'lg_T99K68DX': 'Serie B',
  'lg_PGYWSDEA': 'Bundesliga',
  'lg_WG8R6XBG': '2. Bundesliga',
  'lg_CNSP3BPA': 'Ligue 1',
  'lg_YS9BW2MS': 'Ligue 2',
  'lg_EH3F3MDQ': 'Eredivisie',
  'lg_HB26EKC0': 'Primeira Liga',
  'lg_FA2KCTA5': 'Jupiler Pro League',
  'lg_EZF3MDQY': 'Austria Bundesliga',
  'lg_TKH68DXK': 'Denmark Superliga',
  'lg_D98PZVKX': 'Eliteserien',
  'lg_2MWAYC53': 'Allsvenskan'
};

const INFER_MAX_EVENTS_PER_LEAGUE = 50;
const INFER_OPEN_WINDOW_DAYS = 3;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/alert") return await handleAlert(request, env);
      if (url.pathname === "/migrate") return await handleMigrate(request, env);
      if (url.pathname === "/migrate-all") return await handleMigrateAll(request, env);
      if (url.pathname === "/migrate-misc") return await handleMigrateMisc(request, env);
      if (url.pathname === "/migrate-analysis") return await handleMigrateAnalysis(request, env);
      if (url.pathname === "/migrate-meta") return await handleMigrateMeta(request, env);
      if (url.pathname === "/db-sync" && request.method === "POST") {
  try {
    const body = await request.json();
    const rows = body.rows || [];
    if (!rows.length) return new Response("OK: 0");
    const stmt = env.DB.prepare(
      "INSERT OR REPLACE INTO matches (fixture_id,date,timestamp,league_id,league_name,country,tier,season,round,type,status,home_id,home,away_id,away,ft_home,ft_away,ht_home,ht_away,fetched_at,ahh,b365ahh,b365aha,b365o25,b365u25) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );
    const batch = rows.map(r => stmt.bind(
      r.fixture_id || "", r.date || "", r.timestamp || 0, r.league_id || 0, r.league_name || "",
      r.country || "", r.tier || 0, String(r.season || ""), r.round || "", r.type || "",
      r.status || "", r.home_id || 0, r.home || "", r.away_id || 0, r.away || "",
      r.ft_home === "" ? null : r.ft_home, r.ft_away === "" ? null : r.ft_away,
      r.ht_home === "" ? null : r.ht_home, r.ht_away === "" ? null : r.ht_away,
      r.fetched_at || "",
      r.ahh === "" ? null : r.ahh, r.b365ahh === "" ? null : r.b365ahh,
      r.b365aha === "" ? null : r.b365aha, r.b365o25 === "" ? null : r.b365o25,
      r.b365u25 === "" ? null : r.b365u25
    ));
    await env.DB.batch(batch);
    return new Response("OK: " + rows.length);
  } catch (e) {
    return new Response("ERR: " + e.message, { status: 500 });
  }
}

if (url.pathname === "/db-sync-ylog" && request.method === "POST") {
  try {
    const body = await request.json();
    const rows = body.rows || [];
    if (!rows.length) return new Response("OK: 0");
    const stmt = env.DB.prepare(
      "INSERT OR REPLACE INTO y_log (date, fixture_id, league, home, away, ft_home, ft_away, result, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const batch = rows.map(r => stmt.bind(
      r.date, r.fixture_id, r.league, r.home, r.away,
      r.ft_home, r.ft_away, r.result, new Date().toISOString()
    ));
    await env.DB.batch(batch);
    return new Response("OK: " + rows.length);
  } catch (e) {
    return new Response("ERR: " + e.message, { status: 500 });
  }
}
   if (url.pathname === "/db-sync-cups" && request.method === "POST") {
  try {
    const body = await request.json();
    const rows = body.rows || [];
    if (!rows.length) return new Response("OK: 0");
    const stmt = env.DB.prepare(
  "INSERT OR REPLACE INTO matches (fixture_id,date,timestamp,league_id,league_name,country,tier,season,round,type,status,home_id,home,away_id,away,ft_home,ft_away,ht_home,ht_away,fetched_at,ahh,b365ahh,b365aha,b365o25,b365u25) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
);
const batch = rows.map(r => stmt.bind(
  r.fixture_id || "", r.date || "", r.timestamp || 0, r.league_id || 0, r.league_name || "",
  r.country || "", r.tier || 0, String(r.season || ""), r.round || "", r.type || "",
  r.status || "", r.home_id || 0, r.home || "", r.away_id || 0, r.away || "",
  r.ft_home === "" ? null : r.ft_home, r.ft_away === "" ? null : r.ft_away,
  r.ht_home === "" ? null : r.ht_home, r.ht_away === "" ? null : r.ht_away,
  r.fetched_at || "",
  r.ahh === "" ? null : r.ahh, r.b365ahh === "" ? null : r.b365ahh,
  r.b365aha === "" ? null : r.b365aha, r.b365o25 === "" ? null : r.b365o25,
  r.b365u25 === "" ? null : r.b365u25
));
await env.DB.batch(batch);
    return new Response("OK: " + rows.length);
  } catch (e) {
    return new Response("ERR: " + e.message, { status: 500 });
  }
   }
      if(url.pathname === "/db-stats") {
        const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM matches").first();
        return new Response(JSON.stringify({ ok: true, matches: n.n }), { headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/db-leagues") {
        const { results } = await env.DB.prepare("SELECT DISTINCT league_name, COUNT(*) AS n FROM matches GROUP BY league_name ORDER BY n DESC LIMIT 30").all();
        return new Response(JSON.stringify({ ok: true, leagues: results }), { headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/db-seasons") {
        const { results } = await env.DB.prepare("SELECT season, COUNT(*) AS n FROM matches WHERE ft_home IS NOT NULL GROUP BY season ORDER BY n DESC LIMIT 10").all();
        return new Response(JSON.stringify({ ok: true, seasons: results }), { headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/db-ylog") {
        const { results } = await env.DB.prepare("SELECT date, home, away, ft_home, ft_away, result FROM y_log LIMIT 5").all();
        return new Response(JSON.stringify({ ok: true, rows: results }), { headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/db-meta") {
  const { results } = await env.DB.prepare("SELECT * FROM meta").all();
  return new Response(JSON.stringify({ ok: true, meta: results }), { headers: { "content-type": "application/json" } });
}
if (url.pathname === "/db-analysis") {
  const { results } = await env.DB.prepare("SELECT * FROM analysis").all();
  return new Response(JSON.stringify({ ok: true, analysis: results }), { headers: { "content-type": "application/json" } });
}
if (url.pathname === "/db-team") {
  const name = url.searchParams.get("name") || "";
  const like = "%" + name.toLowerCase() + "%";
  const { results } = await env.DB.prepare(
    "SELECT fixture_id, date, timestamp, home, away, ft_home, ft_away, ahh, league_name FROM matches WHERE LOWER(home) LIKE ? OR LOWER(away) LIKE ? ORDER BY timestamp DESC LIMIT 15"
  ).bind(like, like).all();
  return new Response(JSON.stringify({ ok: true, name, rows: results }), { headers: { "content-type": "application/json" } });
}
      if (request.method !== "POST") return new Response("Bot is running.");
      const update = await request.json();
      if (update.message) return await handleMessage(update.message, env);
      if (update.callback_query) return await handleCallback(update.callback_query, env);
      return new Response("OK");
    } catch (e) {
      console.log("ERR: " + e.message);
      return new Response("OK");
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshSheetCache(env));
    ctx.waitUntil(fetchInferOdds(env));
  }
};

async function handleAlert(request, env) {
  try {
    const body = await request.json();
    const msg = body.message || "Unknown error";
    await sendMessage(OWNER_ID, "🚨 " + msg, env);
    return new Response("OK");
  } catch (e) {
    return new Response("ERR: " + e.message, { status: 500 });
  }
}

// ⚠️ PART 1B က fetchInferOdds ကို ဒီအောက်မှာ ဆက်ထည့်မယ်
async function fetchInferOdds(env) {
  const key = env.SaggiterX_Bot;
  if (!key) { return 'no-key'; }
  const now = Date.now();
  const MM_OFFSET = 6 * 3600 * 1000 + 30 * 60 * 1000;

  const nowMM = new Date(now + MM_OFFSET);
  const y = nowMM.getUTCFullYear(), m = nowMM.getUTCMonth(), d = nowMM.getUTCDate();
  const hh = nowMM.getUTCHours();

  let targetDay;
  if (hh < 6) {
    targetDay = new Date(Date.UTC(y, m, d - 1));
  } else {
    targetDay = new Date(Date.UTC(y, m, d));
  }

  const winStart = Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate() - 3, 12, 0, 0) - MM_OFFSET;
  const winEnd = Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate() + 1, 6, 0, 0) - MM_OFFSET;

  const from = new Date(winStart).toISOString().slice(0, 10);
  const to = new Date(winEnd).toISOString().slice(0, 10);

  const allEvents = [];
  const debugLog = [];
  let skippedOutOfWindow = 0;

  for (const lgId of Object.keys(INFER_LEAGUES)) {
    const lgName = INFER_LEAGUES[lgId];
    try {
      const res = await fetch('https://api.infersports.dev/v1/events?sport=football&league=' + lgId + '&status=scheduled&limit=' + INFER_MAX_EVENTS_PER_LEAGUE, {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (!res.ok) { debugLog.push(lgName + ': HTTP ' + res.status); continue; }
      const data = await res.json();
      const list = (data && data.data) || [];
      if (!list.length) { debugLog.push(lgName + ': 0 ev'); continue; }
      let lgCount = 0, lgSkip = 0;
      for (const ev of list) {
        const ts = Date.parse(ev.scheduled_at);
        if (isNaN(ts)) { lgSkip++; continue; }
        if (ts < winStart || ts >= winEnd) { lgSkip++; skippedOutOfWindow++; continue; }
        allEvents.push({ lgId: lgId, lgName: lgName, ev: ev, ts: ts });
        lgCount++;
      }
      debugLog.push(lgName + ': ' + list.length + ' ev (used ' + lgCount + ', skip ' + lgSkip + ')');
    } catch (e) {
      debugLog.push(lgName + ': ERR');
    }
  }

  let savedOpen = 0, savedCur = 0;
  const archiveMap = {};
  const CHUNK = 20;
  for (let i = 0; i < allEvents.length; i += CHUNK) {
    const chunk = allEvents.slice(i, i + CHUNK);
    const ids = chunk.map(function(x) { return x.ev.id; });
    try {
      const res = await fetch('https://api.infersports.dev/v1/odds/batch', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_ids: ids, markets: 'asian_handicap,totals', period: 'full_time', format: 'decimal' })
      });
      if (!res.ok) { debugLog.push('batch HTTP ' + res.status); continue; }
      const data = await res.json();
      const entries = (data && data.data) || [];
      for (const entry of entries) {
        if (!entry || !entry.odds || !entry.odds.odds) continue;
        const meta = chunk.find(function(x) { return x.ev.id === entry.event_id; });
        if (!meta) continue;
        const lines = extractLines(entry.odds.odds);
        const ahLine = lines && lines.ah ? lines.ah.line : null;
        const totalLine = lines && lines.total ? lines.total.line : null;
        const payload = JSON.stringify({
          event_id: entry.event_id,
          league: meta.lgName,
          league_id: meta.lgId,
          home: meta.ev.home_team ? meta.ev.home_team.name : '',
          away: meta.ev.away_team ? meta.ev.away_team.name : '',
          scheduled_at: meta.ev.scheduled_at,
          odds: entry.odds.odds,
          fetched_at: new Date().toISOString()
        });
        const openKey = 'infer:' + entry.event_id + ':open';
        const curKey = 'infer:' + entry.event_id + ':current';
        const openExists = await env.BOT_KV.get(openKey);
        if (!openExists) { await env.BOT_KV.put(openKey, payload, { expirationTtl: 21 * 24 * 3600 }); savedOpen++; }
        await env.BOT_KV.put(curKey, payload, { expirationTtl: 14 * 24 * 3600 });
        savedCur++;
        if (!archiveMap[entry.event_id]) {
          archiveMap[entry.event_id] = {
            event_id: entry.event_id,
            league: meta.lgName,
            home: meta.ev.home_team ? meta.ev.home_team.name : '',
            away: meta.ev.away_team ? meta.ev.away_team.name : '',
            kickoff: meta.ev.scheduled_at,
            open_ah: openExists ? null : ahLine,
            cur_ah: ahLine,
            open_total: openExists ? null : totalLine,
            cur_total: totalLine,
            fetched_at: new Date().toISOString()
          };
        } else {
          archiveMap[entry.event_id].cur_ah = ahLine;
          archiveMap[entry.event_id].cur_total = totalLine;
          archiveMap[entry.event_id].fetched_at = new Date().toISOString();
        }
      }
    } catch (e) { debugLog.push('batch ERR: ' + e.message); }
  }

  try {
    const eventsPayload = [];
    for (const k of Object.keys(archiveMap)) eventsPayload.push(archiveMap[k]);
    if (eventsPayload.length) {
      const body = JSON.stringify({ events: eventsPayload });
      const url = SHEET_URL + '?action=archivewrite&data=' + encodeURIComponent(body);
      const ares = await fetch(url, { redirect: 'follow' });
      if (!ares.ok) debugLog.push('archive HTTP ' + ares.status);
      else debugLog.push('archive wrote ' + eventsPayload.length);
    }
  } catch (e) { debugLog.push('archive ERR: ' + e.message); }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const countKey = 'kvwrite:' + today;
    const prev = parseInt(await env.BOT_KV.get(countKey) || '0', 10);
    const thisRun = savedOpen + savedCur + 1;
    const newCount = prev + thisRun;
    await env.BOT_KV.put(countKey, String(newCount), { expirationTtl: 3 * 24 * 3600 });
    if (newCount >= 800 && prev < 800) {
      await sendMessage(OWNER_ID, "🚨 KV write: " + newCount + " / 1000\nDate: " + today, env);
    }
  } catch (e) { debugLog.push('kvwrite ERR: ' + e.message); }

  return 'Win: ' + from + ' -> ' + to + '\nO:' + savedOpen + ' C:' + savedCur + ' E:' + allEvents.length + ' Skip:' + skippedOutOfWindow + '\n\n' + debugLog.join('\n');
}
// ============================================================
// PART 2 — Formula + handleMessage + handleCallback
// ============================================================

async function evalFormula(eventId, env) {
  const openRaw = await env.BOT_KV.get('infer:' + eventId + ':open');
  const curRaw = await env.BOT_KV.get('infer:' + eventId + ':current');
  if (!openRaw || !curRaw) return null;
  const open = JSON.parse(openRaw);
  const cur = JSON.parse(curRaw);
  const o = extractLines(open.odds);
  const c = extractLines(cur.odds);
  if (!o || !c) return null;
  const bodyFlip = detectBodyFlip(o, c);
  const formula2 = checkFormula2(bodyFlip, c);
  const formula3 = checkFormula3(bodyFlip, o, c);
  const move = checkMovement(o, c);
  return { event_id: eventId, home: cur.home, away: cur.away, league: cur.league, scheduled_at: cur.scheduled_at, open: o, cur: c, bodyFlip: bodyFlip, formula2: formula2, formula3: formula3, move: move, fetched_at: cur.fetched_at };
}

function extractLines(odds) {
  if (!odds || !odds.length) return null;
  let ah = null, total = null;
  for (const q of odds) {
    if (q.status !== 'open') continue;
    if (q.market_type === 'asian_handicap' && !ah) ah = { line: q.line, prices: q.prices };
    if (q.market_type === 'totals' && !total) total = { line: q.line, prices: q.prices };
  }
  return { ah: ah, total: total };
}

function detectBodyFlip(o, c) {
  if (!o.ah || !c.ah) return false;
  const oLine = o.ah.line, cLine = c.ah.line;
  if (oLine === null || cLine === null) return false;
  if (oLine === 0 || cLine === 0) return false;
  return (oLine > 0 && cLine < 0) || (oLine < 0 && cLine > 0);
}

function checkFormula2(bodyFlip, c) {
  if (!bodyFlip) return { pass: false, reason: 'no-flip' };
  if (!c.total) return { pass: false, reason: 'no-total' };
  const line = c.total.line;
  if (line === null) return { pass: false, reason: 'no-line' };
  if (line < 2.5) return { pass: false, reason: 'below-2.5' };
  const over = c.total.prices.over, under = c.total.prices.under;
  if (!over || !under) return { pass: false, reason: 'no-prices' };
  if (line === 2.5) {
    if (over < under) return { pass: true, pick: 'OVER', line: line, over: over, under: under, note: '2.5-odds-low' };
    return { pass: false, reason: 'under-lower' };
  }
  if (Math.abs(over - under) <= 0.30) return { pass: true, pick: 'OVER', line: line, over: over, under: under, note: 'balance' };
  return { pass: false, reason: 'not-balanced' };
}

function checkFormula3(bodyFlip, o, c) {
  if (!bodyFlip) return { pass: false, reason: 'no-flip' };
  if (!o.total || !c.total) return { pass: false, reason: 'no-total' };
  if (o.total.line === null || c.total.line === null) return { pass: false, reason: 'no-line' };
  if (c.total.line < o.total.line) return { pass: true, pick: 'UNDER', openLine: o.total.line, curLine: c.total.line };
  return { pass: false, reason: 'not-below' };
}

function checkMovement(o, c) {
  if (!o.ah || !c.ah) return null;
  const ahUp = (c.ah.line !== null && o.ah.line !== null) ? (c.ah.line > o.ah.line ? 1 : (c.ah.line < o.ah.line ? -1 : 0)) : 0;
  const tUp = (c.total && o.total && c.total.line !== null && o.total.line !== null) ? (c.total.line > o.total.line ? 1 : (c.total.line < o.total.line ? -1 : 0)) : 0;
  if (ahUp > 0 && tUp > 0) return 'BOTH_UP';
  if (ahUp > 0 && tUp < 0) return 'BODY_UP_TOTAL_DOWN';
  if (ahUp < 0 && tUp > 0) return 'BODY_DOWN_TOTAL_UP';
  if (ahUp < 0 && tUp < 0) return 'BOTH_DOWN';
  return 'FLAT';
}

function nameMatchInfer(a, b) {
  const na = String(a || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nb = String(b || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0) return true;
  const ta = na.split(" ").filter(function(x) { return x.length >= 3; });
  const tb = nb.split(" ").filter(function(x) { return x.length >= 3; });
  if (!ta.length || !tb.length) return false;
  let hit = 0;
  ta.forEach(function(x) { if (tb.some(function(y) { return y === x || y.indexOf(x) === 0 || x.indexOf(y) === 0; })) hit++; });
  return hit / Math.max(ta.length, tb.length) >= 0.6;
}

function exactNameMatch(a, b) {
  const na = String(a || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nb = String(b || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!na || !nb) return false;
  return na === nb;
}

function nameMatchAlias(a, b, aliasMap) {
  const na = String(a || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nb = String(b || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = (aliasMap && aliasMap[na]) ? String(aliasMap[na]).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : na;
  const tb = (aliasMap && aliasMap[nb]) ? String(aliasMap[nb]).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : nb;
  if (ta === tb) return true;
  if (ta.indexOf(tb) >= 0 || tb.indexOf(ta) >= 0) return true;
  const la = ta.split(" ").filter(function(x) { return x.length >= 3; });
  const lb = tb.split(" ").filter(function(x) { return x.length >= 3; });
  if (!la.length || !lb.length) return false;
  let hit = 0;
  la.forEach(function(x) { if (lb.some(function(y) { return y === x || y.indexOf(x) === 0 || x.indexOf(y) === 0; })) hit++; });
  return hit / Math.max(la.length, lb.length) >= 0.6;
}

async function getInferAliases(env) {
  try {
    const raw = await env.BOT_KV.get("infer:aliases");
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.ts && (Date.now() - d.ts) < 6 * 3600 * 1000) return d.data;
    }
  } catch (e) {}
  try {
    const res = await fetch(SHEET_URL + "?action=inferalias", { redirect: "follow" });
    const data = JSON.parse(await res.text());
    if (data && data.ok && data.aliases) {
      try { await env.BOT_KV.put("infer:aliases", JSON.stringify({ ts: Date.now(), data: data.aliases }), { expirationTtl: 21600 }); } catch (e) {}
      return data.aliases;
    }
  } catch (e) {}
  return {};
}

async function findInferForTeam(teamName, env) {
  try {
    const aliases = await getInferAliases(env);
    const aliasTargets = {};
    for (const k of Object.keys(aliases)) {
      aliasTargets[k.toLowerCase()] = aliases[k];
    }
    const list = await env.BOT_KV.list({ prefix: 'infer:', limit: 1000 });
    const seen = {};
    const candidates = [];
    for (const k of list.keys) {
      if (k.name.indexOf(':current') < 0) continue;
      const id = k.name.replace('infer:', '').replace(':current', '');
      if (seen[id]) continue;
      seen[id] = 1;
      const raw = await env.BOT_KV.get(k.name);
      if (!raw) continue;
      const d = JSON.parse(raw);

// ✅ NEW: ပွဲပြီးသွားတဲ့ ဈေးကွက်ဟောင်းတွေကို လုံးဝ ကျော်သွားစေရန် (လက်ရှိအချိန်ထက် ကြီးတဲ့ပွဲကိုပဲ ယူမယ်)
const now = Date.now();
const schedTs = Date.parse(d.scheduled_at || '');
if (isNaN(schedTs) || schedTs <= now) continue;

const infHome = String(d.home || '').toLowerCase().trim();
const infAway = String(d.away || '').toLowerCase().trim();
      const infHomeTarget = aliasTargets[infHome] || d.home;
      const infAwayTarget = aliasTargets[infAway] || d.away;
      if (exactNameMatch(infHomeTarget, teamName) || exactNameMatch(infAwayTarget, teamName) ||
          exactNameMatch(d.home, teamName) || exactNameMatch(d.away, teamName)) {
        candidates.push({ id: id, exact: true, scheduled: d.scheduled_at || '' });
        continue;
      }
      if (nameMatchAlias(d.home, teamName, aliases) || nameMatchAlias(d.away, teamName, aliases)) {
        candidates.push({ id: id, exact: false, scheduled: d.scheduled_at || '' });
      }
    }
    candidates.sort(function(a, b) {
      if (a.exact !== b.exact) return a.exact ? -1 : 1;
      return String(b.scheduled).localeCompare(String(a.scheduled));
    });
    for (const c of candidates) {
      const f = await evalFormula(c.id, env);
      if (f) return f;
    }
    return null;
  } catch (e) { return null; }
}
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || "";
  if (String(chatId) !== OWNER_ID) return new Response("OK");
  if (text === "/start") { await sendMainMenu(chatId, env); return new Response("OK"); }
  if (text === "/refresh") {
  await sendMessage(chatId, "⏳ Refresh...", env);
  await env.BOT_KV.delete("streaks:cache");
  const r1 = await refreshSheetCache(env);
  await sendMessage(chatId, "📋 Sheet: " + r1 + "\n🔄 Streaks cache cleared", env);
  return new Response("OK");
  }
  if (text === "/audit") { await sendAudit(chatId, env); return new Response("OK"); }
  if (text === "/apiusage") { await sendApiUsage(chatId, env); return new Response("OK"); }
  if (text === "/roundstats") { await sendRoundStats(chatId, env); return new Response("OK"); }
  if (text === "/streakmatches") { await sendStreakMatches(chatId, env, 5); return new Response("OK"); }
  if (text === "/streaks") { await sendStreaks(chatId, env); return new Response("OK"); }
  if (text === "/vs") {
  await sendMessage(chatId, "🆚 A vs B\n\nData ဖြည့်ပါ (9 lines):\n1. A ov L5\n2. B ov L5\n3. A home L5\n4. B away L5\n5. Home HT\n6. Away HT\n7. H2H HT\n8. Body\n9. Total", env);
  return new Response("OK");
}
if (text.startsWith("/vs ")) {
  var vsLines = text.slice(4).trim().split("\n").map(function(x) { return x.trim(); }).filter(function(x) { return x; });
  if (vsLines.length < 9) {
    await sendMessage(chatId, "❌ 9 lines လိုတယ် — " + vsLines.length + " lines ပဲ ရတယ်", env);
    return new Response("OK");
  }
  var aOvr = Number(vsLines[0]) || 0;
  var bOvr = Number(vsLines[1]) || 0;
  var aHome = Number(vsLines[2]) || 0;
  var bAway = Number(vsLines[3]) || 0;
  var homeHT = Number(vsLines[4]) || 0;
  var awayHT = Number(vsLines[5]) || 0;
  var h2hHT = Number(vsLines[6]) || 0;
  var bodyLine = vsLines[7] || "";
  var totalLine = vsLines[8] || "";

  var ovFair = (aOvr + bOvr) / 10;
  var haFair = (aHome + bAway) / 10;
  var yPass = (ovFair > 2.5 && haFair > 2.5);
  var htTotal = homeHT + awayHT + h2hHT;
  var htPass = (htTotal >= 9);

  var bodyArr = ["1+20", "1+10", "1=", "1-10", "1-20"];
  var totalArr = ["3+20", "3+10", "3=", "3-10", "3-20"];
  var bodyHit = false, totalHit = false;
  for (var bi = 0; bi < bodyArr.length; bi++) {
    if (bodyLine.indexOf(bodyArr[bi]) >= 0) { bodyHit = true; break; }
  }
  for (var ti = 0; ti < totalArr.length; ti++) {
    if (totalLine.indexOf(totalArr[ti]) >= 0) { totalHit = true; break; }
  }
  var formulaPass = (bodyHit && totalHit);

  var out = "🆚 A vs B\n\n";
  out += "📈 Y (O2.5)\n";
  out += "Overall Fair: " + ovFair.toFixed(2) + (ovFair > 2.5 ? " ✅" : " ❌") + "\n";
  out += "HA Fair: " + haFair.toFixed(2) + (haFair > 2.5 ? " ✅" : " ❌") + "\n";
  out += "→ " + (yPass ? "⭐ PASS" : "⭐ FAIL") + "\n\n";
  out += "📈 HT Ratio\n";
  out += htTotal + "/15 → " + (htPass ? "⭐ PASS" : "⭐ FAIL") + "\n\n";
  out += "🎯 Body/Total\n";
  out += bodyLine + " | " + totalLine + "\n";
  out += "→ " + (formulaPass ? "အောက်သင်း ဂိုးသွင်းနိုင်ပဲ" : "အောက်သင်း ဂိုးသွင်းနိုင် မ ဟုတ်");

  await sendMessage(chatId, out, env);
  return new Response("OK");
}
  if (text === "/results") { await sendYResults(chatId, env, ""); return new Response("OK"); }
  if (text.startsWith("/results ")) {
    var d = text.slice(9).trim();
    await sendYResults(chatId, env, d);
    return new Response("OK");
  }
  if (text === "/inferlist") { await sendInferList(chatId, env); return new Response("OK"); }
  if (text === "/infercheck") { await sendInferCheck(chatId, env); return new Response("OK"); }
  if (text === "/inferfetch") { await sendMessage(chatId, "⏳ Infer fetch...", env); const r = await fetchInferOdds(env); await sendMessage(chatId, "📊 Infer:\n" + r, env); return new Response("OK"); }
  if (text === "/kv") {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const countKey = 'kvwrite:' + today;
      const raw = await env.BOT_KV.get(countKey);
      const count = raw ? Number(raw) : 0;
      const list = await env.BOT_KV.list({ prefix: 'infer:', limit: 1000 });
      const inferCount = list.keys.length;
      let txt = "📊 KV STATUS\n\n📅 " + today + "\n\n";
      txt += "Write today: " + count + " / 1000\n";
      txt += "Remaining: " + (1000 - count) + "\n\n";
      txt += "Infer keys: " + inferCount + "\n";
      await sendMessage(chatId, txt, env);
    } catch (e) {
      await sendMessage(chatId, "⚠️ KV error: " + e.message, env);
    }
    return new Response("OK");
  }
  if (text === "/showinferkey") {
    const k = env.SaggiterX_Bot || '';
    if (!k) { await sendMessage(chatId, "❌ No key", env); return new Response("OK"); }
    await sendMessage(chatId, "🔑 Infer key:\n\n" + k + "\n\nLength: " + k.length, env);
    return new Response("OK");
  }
  if (text === "/debugevent") {
    await sendMessage(chatId, "🔍 Fetching event...", env);
    try {
      const key = env.SaggiterX_Bot;
      const url = 'https://api.infersports.dev/v1/events?sport=football&league=lg_T9268DXK&status=scheduled&limit=2';
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + key } });
      const data = await res.json();
      const ev = (data.data && data.data[0]) ? data.data[0] : null;
      if (!ev) { await sendMessage(chatId, "❌ No event", env); return new Response("OK"); }
      const txt = JSON.stringify(ev, null, 2).substring(0, 3000);
      await sendMessage(chatId, "📋 Event fields:\n" + txt, env);
    } catch (e) {
      await sendMessage(chatId, "⚠️ " + e.message, env);
    }
    return new Response("OK");
  }
  if (text.startsWith("/result ")) {
    const parts = text.slice(8).trim().split(/\s+/);
    if (parts.length < 3) { await sendMessage(chatId, "❌ Format: /result EVENT_ID FT_HOME FT_AWAY", env); return new Response("OK"); }
    const evId = parts[0];
    const fh = parts[1];
    const fa = parts[2];
    try {
      const url = SHEET_URL + "?action=archivemanual&id=" + encodeURIComponent(evId) + "&h=" + encodeURIComponent(fh) + "&a=" + encodeURIComponent(fa);
      const r = await fetch(url, { redirect: "follow" });
      const d = JSON.parse(await r.text());
      if (d && d.ok) {
        await sendMessage(chatId, "✅ " + evId + " → " + d.ft_home + "-" + d.ft_away + "\nAH:" + d.ah + " | HA:" + d.ha + " | O/U:" + d.ou, env);
      } else {
        await sendMessage(chatId, "❌ " + (d.error || "fail"), env);
      }
    } catch (e) {
      await sendMessage(chatId, "⚠️ " + e.message, env);
    }
    return new Response("OK");
  }
  if (text.startsWith("/team ")) {
    const name = text.slice(6).trim();
    await sendTeamSearch(chatId, name, env);
    return new Response("OK");
  }
  const om = text.match(/^\s*(-?\d+\s*[+\-=]?\s*\d*)\s*\/\s*(\d+\s*[+\-=]?\s*\d*)\s*$/);
  if (om) {
    const saved = await getSavedMatch(env, chatId);
    if (!saved) { await sendMessage(chatId, "❌ ပွဲတစ်ပွဲ အရင်နှိပ်ပါ", env); return new Response("OK"); }
    if (!saved.upperTeam) { await sendMessage(chatId, "❌ အထက်ကြေး ရွေးပါ", env); return new Response("OK"); }
    const up = saved.upperTeam;
    const lo = up === saved.home ? saved.away : saved.home;
    const p = { upperTeam: up, lowerTeam: lo, leagueCode: saved.leagueCode, body: om[1].replace(/\s/g, ""), total: om[2].replace(/\s/g, "") };
    await runTrickCheck(chatId, p, env, saved.detailMsgId);
    return new Response("OK");
  }
  return new Response("OK");
}

async function handleCallback(query, env) {
  const chatId = query.message.chat.id;
  const data = query.data;
  if (String(chatId) !== OWNER_ID) return new Response("OK");
  await answerCallback(query.id, env);
  if (data === "football_analysis") { await sendFootballMenu(chatId, env); return new Response("OK"); }
  if (data === "current_round") {
    await sendMessage(chatId, "⏳ ရှာနေပါတယ်...", env);
    await runRoundScan(chatId, "current", env);
    return new Response("OK");
  }
  if (data === "next_round") {
    await sendMessage(chatId, "⏳ ရှာနေပါတယ်...", env);
    await runRoundScan(chatId, "next", env);
    return new Response("OK");
  }
  if (data === "other_league") { await sendOtherLeague(chatId, env); return new Response("OK"); }
  if (data === "audit") { await sendAudit(chatId, env); return new Response("OK"); }
  if (data === "apiusage") { await sendApiUsage(chatId, env); return new Response("OK"); }
  if (data === "roundstats") { await sendRoundStats(chatId, env); return new Response("OK"); }
  if (data === "streakmatches") { await sendStreakMatches(chatId, env, 5); return new Response("OK"); }
  if (data === "streaks") { await sendStreaks(chatId, env); return new Response("OK"); }
  if (data.startsWith("tm:")) {
    const id = data.slice(3);
    await sendTeamDetail(chatId, id, env, query.message.message_id);
    return new Response("OK");
  }
  if (data.startsWith("m:")) {
    const parts = data.split(":");
    await showMatchDetail(chatId, parts[1], parts[2], env, query.message.message_id);
    return new Response("OK");
  }
  if (data.startsWith("sm:")) {
    await showSheetMatchDetail(chatId, data.slice(3), env, query.message.message_id);
    return new Response("OK");
  }
  if (data.startsWith("fi:")) {
    const eventId = data.slice(3);
    await showInferDetail(chatId, eventId, env, query.message.message_id);
    return new Response("OK");
  }
  if (data.startsWith("il:")) {
    const lgId = data.slice(3);
    await sendInferLeague(chatId, lgId, env, query.message.message_id);
    return new Response("OK");
  }
  if (data === "up:A" || data === "up:B") {
    const saved = await getSavedMatch(env, chatId);
    if (!saved) { await sendMessage(chatId, "❌ State ပျက်သွားပါ", env); return new Response("OK"); }
    const up = data === "up:A" ? saved.home : saved.away;
    const lo = data === "up:A" ? saved.away : saved.home;
    saved.upperTeam = up;
    await saveMatchState(env, chatId, saved);
    let text = "✅ " + up + " = အထက်ကြေး\n";
    text += "⬇️ " + lo + " = အောက်ကြေး\n\n";
    text += "📝 ပေါက်ကြေး ရိုက်ထည့်ပါ:\n";
    text += "Body/Total (ဥပမာ - 1-20/3+20)";
    await sendMessage(chatId, text, env, undefined, query.message.message_id);
    return new Response("OK");
  }
  return new Response("OK");
}
// ============================================================
// PART 3-A — Infer Commands
// ============================================================

async function sendInferList(chatId, env) {
  try {
    const list = await env.BOT_KV.list({ prefix: 'infer:', limit: 1000 });
    const byLeague = {};
    const seen = {};
    for (const k of list.keys) {
      if (k.name.indexOf(':current') < 0) continue;
      const id = k.name.replace('infer:', '').replace(':current', '');
      if (seen[id]) continue;
      seen[id] = 1;
      const raw = await env.BOT_KV.get(k.name);
      if (!raw) continue;
      const d = JSON.parse(raw);
      if (!byLeague[d.league]) byLeague[d.league] = { lgId: d.league_id, count: 0 };
      byLeague[d.league].count++;
    }
    const lgNames = Object.keys(byLeague);
    if (!lgNames.length) { await sendMessage(chatId, "⚠️ Infer data မရပါ။ /refresh ရိုက်ပါ။", env); return; }
    let total = 0;
    lgNames.forEach(function(l) { total += byLeague[l].count; });
    let text = "📊 INFER LIST\n\n";
    text += "Total: " + total + " events in " + lgNames.length + " leagues\n\n";
    text += "👇 League ရွေးပါ:";
    const btns = [];
    lgNames.sort().forEach(function(l) {
      btns.push([{ text: l + " (" + byLeague[l].count + ")", callback_data: "il:" + byLeague[l].lgId }]);
    });
    await sendMessage(chatId, text, env, { inline_keyboard: btns });
  } catch (e) {
    await sendMessage(chatId, "⚠️ Infer list error: " + e.message, env);
  }
}

async function sendInferLeague(chatId, lgId, env, replyTo) {
  try {
    const list = await env.BOT_KV.list({ prefix: 'infer:', limit: 1000 });
    const evs = [];
    const seen = {};
    for (const k of list.keys) {
      if (k.name.indexOf(':current') < 0) continue;
      const id = k.name.replace('infer:', '').replace(':current', '');
      if (seen[id]) continue;
      seen[id] = 1;
      const raw = await env.BOT_KV.get(k.name);
      if (!raw) continue;
      const d = JSON.parse(raw);
      if (d.league_id !== lgId) continue;
      evs.push(d);
    }
    if (!evs.length) { await sendMessage(chatId, "❌ ပွဲ မရှိပါ", env); return; }
    evs.sort(function(a, b) { return String(a.scheduled_at).localeCompare(String(b.scheduled_at)); });
    let text = "📊 " + evs[0].league + "\n\n";
    evs.forEach(function(e, i) {
      text += (i+1) + ". " + e.home + " vs " + e.away + "\n";
      text += "   🕒 " + e.scheduled_at + "\n";
    });
    const btns = [];
    evs.slice(0, 20).forEach(function(e, i) {
      btns.push([{ text: (i+1) + ". " + e.home.slice(0,12) + " vs " + e.away.slice(0,12), callback_data: "fi:" + e.event_id }]);
    });
    await sendMessage(chatId, text, env, { inline_keyboard: btns }, replyTo);
  } catch (e) {
    await sendMessage(chatId, "⚠️ Infer league error: " + e.message, env);
  }
}

async function showInferDetail(chatId, eventId, env, replyTo) {
  const f = await evalFormula(eventId, env);
  if (!f) { await sendMessage(chatId, "❌ Infer data မရပါ", env); return; }
  let text = "📊 " + f.league + "\n";
  text += "🏟️ " + f.home + " vs " + f.away + "\n";
  text += "🕒 " + f.scheduled_at + "\n\n";
  text += "📈 Lines\n";
  text += "AH  Open: " + (f.open.ah ? f.open.ah.line : '-') + " | Now: " + (f.cur.ah ? f.cur.ah.line : '-') + "\n";
  text += "Tot Open: " + (f.open.total ? f.open.total.line : '-') + " | Now: " + (f.cur.total ? f.cur.total.line : '-') + "\n\n";
  text += "🔄 Flip: " + (f.bodyFlip ? 'YES' : 'no') + "\n";
  text += "↔️ Move: " + (f.move || '-') + "\n\n";
  if (f.formula2.pass) text += "🎯 F2: OVER " + f.formula2.line + " (O " + f.formula2.over + " / U " + f.formula2.under + ")\n";
  if (f.formula3.pass) text += "🎯 F3: UNDER (" + f.formula3.openLine + "→" + f.formula3.curLine + ")\n";
  if (!f.formula2.pass && !f.formula3.pass) text += "❌ Formula pass မရှိပါ";
  await sendMessage(chatId, text, env, undefined, replyTo);
}

async function sendInferCheck(chatId, env) {
  try {
    const key = env.SaggiterX_Bot;
    if (!key) { await sendMessage(chatId, "❌ key missing", env); return; }
    let text = "🔍 INFER CHECK\n\n";
    const lgList = Object.keys(INFER_LEAGUES);
    let totalPass = 0;
    for (const lgId of lgList) {
      const res = await fetch('https://api.infersports.dev/v1/events?sport=football&league=' + lgId + '&status=scheduled&limit=5', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = (data && data.data) || [];
      if (!list.length) continue;
      const lgName = INFER_LEAGUES[lgId];
      let lgText = "\n🏆 " + lgName + " (" + list.length + ")\n";
      let lgHasPass = false;
      for (let i = 0; i < list.length; i++) {
        const ev = list[i];
        const f = await evalFormula(ev.id, env);
        if (!f) continue;
        if (f.formula2.pass || f.formula3.pass || f.bodyFlip) {
          lgText += (i+1) + ". " + ev.home_team.name + " vs " + ev.away_team.name + "\n";
          lgText += "   AH: " + (f.open.ah ? f.open.ah.line : '-') + "→" + (f.cur.ah ? f.cur.ah.line : '-');
          lgText += " | Tot: " + (f.open.total ? f.open.total.line : '-') + "→" + (f.cur.total ? f.cur.total.line : '-') + "\n";
          lgText += "   Flip: " + (f.bodyFlip ? 'YES' : 'no') + " | " + (f.move || '-') + "\n";
          if (f.formula2.pass) lgText += "   🎯 F2: OVER " + f.formula2.line + "\n";
          if (f.formula3.pass) lgText += "   🎯 F3: UNDER\n";
          lgHasPass = true;
        }
      }
      if (lgHasPass) { text += lgText; totalPass++; }
    }
    if (totalPass === 0) text += "❌ Flip/Formula pass မရှိပါ";
    await sendMessage(chatId, text, env);
  } catch (e) {
    await sendMessage(chatId, "⚠️ Infer check error: " + e.message, env);
  }
}

function htStarsText(stars) {
  if (stars >= 3) return "\n⭐⭐⭐";
  if (stars === 2) return "\n⭐⭐";
  if (stars === 1) return "\n⭐";
  return "";
}
// ============================================================
// PART 3-B — Team Commands
// ============================================================

function formatSheetDetail(m) {
  let text = "\n📊 Points\n";
  text += "Overall : " + (typeof m.overallFair === "number" ? m.overallFair.toFixed(2) : "?") + "\n";
  text += "Home/Away : " + (typeof m.haFair === "number" ? m.haFair.toFixed(2) : "?") + "\n\n";
  if (m.o25 === "Y") text += "🎯 O2.5 = Y\n\n";
  if (m.htRatio) {
    text += "📊 HT Ratio\n" + m.htRatio + "\n";
    const stars = htStarsText(m.htStars);
    if (stars) text += "→ " + stars;
    if (m.htLatest3 === "YES") text += " (Latest 3 = 0-0 +⭐)";
    text += "\n\n";
  }
  if (m.ovOU) {
    text += "📊 O/U (5 ပွဲ)\n";
    text += "Overall : " + (m.ovOU || "?") + "\n";
    text += "Home    : " + (m.hOU || "?") + "\n";
    text += "Away    : " + (m.aOU || "?") + "\n";
    text += "H2H     : " + (m.h2hOU || "?") + "\n\n";
  }
  if (m.ovHA) {
    text += "📊 HA (5 ပွဲ)\n";
    text += "Overall : " + (m.ovHA || "?") + "\n";
    text += "Home    : " + (m.hHA || "?") + "\n";
    text += "Away    : " + (m.aHA || "?") + "\n";
    text += "H2H     : " + (m.h2hHA || "?") + "\n\n";
  }
  if (m.ovAH) {
    text += "📊 AH (5 ပွဲ)\n";
    text += "Overall : " + (m.ovAH || "?") + "\n";
    text += "Home    : " + (m.hAH || "?") + "\n";
    text += "Away    : " + (m.aAH || "?") + "\n";
    text += "H2H     : " + (m.h2hAH || "?") + "\n";
  }
  return text;
}

async function getFreshness(env) {
  const auditRaw = await env.BOT_KV.get("audit:cache");
  if (!auditRaw) return null;
  try {
    const a = JSON.parse(auditRaw);
    if (!a || !a.audit) return null;
    const g = function(k) { return a.audit[k] ? String(a.audit[k].value) : ""; };
    return { csvDate: g("last_csv_date"), apiDate: g("last_api_date") };
  } catch (e) { return null; }
}

async function sendAudit(chatId, env) {
  const auditRaw = await env.BOT_KV.get("audit:cache");
  if (!auditRaw) { await sendMessage(chatId, "⚠️ Audit မရပါ။ /refresh ရိုက်ပါ။", env); return; }
  let audit;
  try { audit = JSON.parse(auditRaw); } catch (e) { await sendMessage(chatId, "⚠️ Audit parse error", env); return; }
  const a = (audit && audit.audit) ? audit.audit : null;
  if (!a) { await sendMessage(chatId, "⚠️ Audit data မရပါ", env); return; }
  const g = function(k) { if (!a[k]) return "?"; return String(a[k].value !== undefined ? a[k].value : a[k]); };
  const gn = function(k) { if (!a[k] || !a[k].note) return ""; return String(a[k].note); };
  let text = "📋 AUDIT REPORT\n\n";
  text += "📅 " + g("target_date") + "\n";
  text += "🔄 " + g("run_at") + "\n\n";
  text += "📊 Data\n";
  text += "Cache : " + g("cache_rows") + " rows\n";
  text += "Deduped : " + g("deduped") + "\n";
  text += "Duplicates : " + g("duplicates") + "\n";
  text += "Completed : " + g("completed") + "\n\n";
  text += "📁 Sources\n";
  text += "CSV : " + g("csv_records") + " (" + g("last_csv_date") + " " + gn("last_csv_date") + ")\n";
  text += "API : " + g("api_records") + " (" + g("last_api_date") + " " + gn("last_api_date") + ")\n\n";
  text += "🎯 Target Stats\n";
  text += "In-scope : " + g("in_scope") + "\n";
  text += "O/U : " + g("o_count") + "O / " + g("u_count") + "U → " + g("o_pct") + "\n";
  text += "AH : " + g("ah_w") + "W / " + g("ah_l") + "L / " + g("ah_p") + "P → " + g("ah_w_pct") + "\n";
  text += "No-line : " + g("ah_no_line") + "\n\n";
  text += "⚙️ Status : " + g("status") + "\n";
  text += "⚠️ " + g("warnings");
  await sendMessage(chatId, text, env);
}

async function sendApiUsage(chatId, env) {
  try {
    const res = await fetch(SHEET_URL + "?action=apiusage", { redirect: "follow" });
    const data = JSON.parse(await res.text());
    if (!data || !data.ok) { await sendMessage(chatId, "⚠️ API usage မရပါ", env); return; }
    const today = data.today || "?";
    const todayCalls = data.today_calls || 0;
    const limit = Number(data.last_limit) || 100;
    const remaining = data.last_remaining === "" ? "?" : data.last_remaining;
    const lastRunAt = data.last_run_at || "?";
    const lastRunCalls = data.last_run_calls || 0;
    let text = "📊 API USAGE\n\n📅 " + today + "\n\n";
    text += "Today : " + todayCalls + " / " + limit + "\n";
    text += "Remaining : " + remaining + "\n";
    text += "Last run : " + lastRunCalls + " calls\n\n";
    text += "🕒 Last run at : " + lastRunAt;
    await sendMessage(chatId, text, env);
  } catch (e) {
    await sendMessage(chatId, "⚠️ API usage error: " + e.message, env);
  }
}

async function sendStreaks(chatId, env) {
  try {
    let data = await getStreaksCache(env);
    if (!data) {
      await sendMessage(chatId, "⚠️ Streaks မရပါ", env);
      return;
    }

    const allTeams = data.teams || [];
    const minStreak = data.minStreak || 4;
    const updated = (data.updated || "").slice(0, 10);

    const teams = allTeams.filter(function(t) {
      const lg = String(t.league || "").toLowerCase().trim();
      return SIX_LEAGUE_NAMES.indexOf(lg) >= 0;
    });

    let text = "📊 STREAKS (" + minStreak + "+) — 6 League\n📅 " + updated + "\n\n";

    if (!teams.length) {
      text += "❌ 6 League မှာ Streak " + minStreak + "+ မ ရှိပါ";
      await sendMessage(chatId, text, env);
      return;
    }

    const byLeague = {};
    teams.forEach(function(t) {
      const lg = t.league || "?";
      if (!byLeague[lg]) byLeague[lg] = [];
      byLeague[lg].push(t);
    });

    SIX_LEAGUE_NAMES.forEach(function(lgLower) {
      const lgKey = Object.keys(byLeague).find(function(k) {
        return k.toLowerCase().trim() === lgLower;
      });
      if (!lgKey) return;
      const list = byLeague[lgKey];
      text += "🏆 " + lgKey + " (" + list.length + ")\n";
      list.forEach(function(t) {
        const parts = [];
        const s = t.streaks || {};
        if (s.overall) {
          if (s.overall.ou) parts.push("O/U:" + s.overall.ou.value + s.overall.ou.count);
          if (s.overall.ha) parts.push("HA:" + s.overall.ha.value + s.overall.ha.count);
          if (s.overall.ah) parts.push("AH:" + s.overall.ah.value + s.overall.ah.count);
        }
        if (s.home) {
          const hParts = [];
          if (s.home.ou) hParts.push("O/U:" + s.home.ou.value + s.home.ou.count);
          if (s.home.ha) hParts.push("HA:" + s.home.ha.value + s.home.ha.count);
          if (s.home.ah) hParts.push("AH:" + s.home.ah.value + s.home.ah.count);
          if (hParts.length) parts.push("🏠 " + hParts.join(","));
        }
        if (s.away) {
          const aParts = [];
          if (s.away.ou) aParts.push("O/U:" + s.away.ou.value + s.away.ou.count);
          if (s.away.ha) aParts.push("HA:" + s.away.ha.value + s.away.ha.count);
          if (s.away.ah) aParts.push("AH:" + s.away.ah.value + s.away.ah.count);
          if (aParts.length) parts.push("✈️ " + aParts.join(","));
        }
        if (parts.length) text += "• " + t.name + " — " + parts.join(" | ") + "\n";
      });
      text += "\n";
    });

    if (text.length <= 4000) {
      await sendMessage(chatId, text, env);
    } else {
      let header = "📊 STREAKS (" + minStreak + "+) — 6 League\n📅 " + updated + "\n\n";
      let chunk = header;
      const lgKeys = SIX_LEAGUE_NAMES.map(function(lgLower) {
        return Object.keys(byLeague).find(function(k) {
          return k.toLowerCase().trim() === lgLower;
        });
      }).filter(Boolean);
      for (const lgKey of lgKeys) {
        const list = byLeague[lgKey];
        let block = "🏆 " + lgKey + " (" + list.length + ")\n";
        list.forEach(function(t) {
          const parts = [];
          const s = t.streaks || {};
          if (s.overall) {
            if (s.overall.ou) parts.push("O/U:" + s.overall.ou.value + s.overall.ou.count);
            if (s.overall.ha) parts.push("HA:" + s.overall.ha.value + s.overall.ha.count);
            if (s.overall.ah) parts.push("AH:" + s.overall.ah.value + s.overall.ah.count);
          }
          if (s.home) {
            const hParts = [];
            if (s.home.ou) hParts.push("O/U:" + s.home.ou.value + s.home.ou.count);
            if (s.home.ha) hParts.push("HA:" + s.home.ha.value + s.home.ha.count);
            if (s.home.ah) hParts.push("AH:" + s.home.ah.value + s.home.ah.count);
            if (hParts.length) parts.push("🏠" + hParts.join(","));
          }
          if (s.away) {
            const aParts = [];
            if (s.away.ou) aParts.push("O/U:" + s.away.ou.value + s.away.ou.count);
            if (s.away.ha) aParts.push("HA:" + s.away.ha.value + s.away.ha.count);
            if (s.away.ah) aParts.push("AH:" + s.away.ah.value + s.away.ah.count);
            if (aParts.length) parts.push("✈️" + aParts.join(","));
          }
          if (parts.length) block += "• " + t.name + " — " + parts.join(" | ") + "\n";
        });
        block += "\n";
        if ((chunk + block).length > 3900) {
          await sendMessage(chatId, chunk, env);
          chunk = block;
        } else {
          chunk += block;
        }
      }
      if (chunk.length) await sendMessage(chatId, chunk, env);
    }
  } catch (e) {
    await sendMessage(chatId, "⚠️ Streaks error: " + e.message, env);
  }
}

async function sendStreakMatches(chatId, env, minStreak) {
  try {
    const min = minStreak || 5;

    const MM_OFFSET = 6 * 3600 * 1000 + 30 * 60 * 1000;
    const nowMM = new Date(Date.now() + MM_OFFSET);
    const y = nowMM.getUTCFullYear(), m = nowMM.getUTCMonth(), d = nowMM.getUTCDate();
    const hh = nowMM.getUTCHours();
    let targetDay;
    if (hh < 6) targetDay = new Date(Date.UTC(y, m, d - 1));
    else targetDay = new Date(Date.UTC(y, m, d));
    const targetLabel = targetDay.toISOString().slice(0, 10);

    const startTs = Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate(), 6, 30, 0) - MM_OFFSET;
    const endTs = startTs + 24 * 3600 * 1000;

    const { results: fx } = await env.DB.prepare(
      "SELECT league_name, home, away, timestamp FROM matches WHERE timestamp >= ? AND timestamp < ? AND status = 'NS' ORDER BY league_name ASC, timestamp ASC"
    ).bind(startTs, endTs).all();

    if (!fx || !fx.length) {
      await sendMessage(chatId, "🔥 STREAK MATCHES (" + min + "+)\n📅 " + targetLabel + "\n\n❌ Streak match မ ရှိပါ", env);
      return;
    }

    const streaksData = await getStreaksCache(env);
    if (!streaksData || !streaksData.teams) {
      await sendMessage(chatId, "⚠️ Streaks မရပါ", env);
      return;
    }

    const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const teamMap = {};
    for (const t of streaksData.teams) {
      teamMap[norm(t.name)] = t;
    }

    function findTeam(name) {
      const q = norm(name);
      if (teamMap[q]) return teamMap[q];
      for (const k in teamMap) {
        if (k.indexOf(q) >= 0 || q.indexOf(k) >= 0) return teamMap[k];
      }
      return null;
    }

    function streakStr(t) {
      if (!t || !t.streaks) return "";
      const parts = [];
      const s = t.streaks;
      if (s.overall) {
        if (s.overall.ou && s.overall.ou.count >= min) parts.push("O/U:" + s.overall.ou.value + s.overall.ou.count);
        if (s.overall.ha && s.overall.ha.count >= min) parts.push("HA:" + s.overall.ha.value + s.overall.ha.count);
        if (s.overall.ah && s.overall.ah.count >= min) parts.push("AH:" + s.overall.ah.value + s.overall.ah.count);
      }
      return parts.join(",");
    }

    const byLeague = {};
    let totalMatches = 0, totalTeams = 0;

    for (const f of fx) {
      const hTeam = findTeam(f.home);
      const aTeam = findTeam(f.away);
      const hStr = streakStr(hTeam);
      const aStr = streakStr(aTeam);
      if (!hStr && !aStr) continue;

      const lg = f.league_name || "?";
      if (!byLeague[lg]) byLeague[lg] = [];
      byLeague[lg].push({ home: f.home, away: f.away, ts: f.timestamp, hStr, aStr });
      totalMatches++;
      if (hStr) totalTeams++;
      if (aStr) totalTeams++;
    }

    if (!totalMatches) {
      await sendMessage(chatId, "🔥 STREAK MATCHES (" + min + "+)\n📅 " + targetLabel + "\n\n❌ Streak match မ ရှိပါ", env);
      return;
    }

    let text = "🔥 STREAK MATCHES (" + min + "+)\n";
    text += "📅 " + targetLabel + "\n\n";

    for (const lg in byLeague) {
      text += "🏆 " + lg + "\n";
      for (const m of byLeague[lg]) {
        const timeMM = new Date(m.ts + MM_OFFSET).toISOString().slice(11, 16);
        let line = "• " + m.home + " vs " + m.away + " [" + timeMM + "]\n";
        if (m.hStr) line += "  🏠 " + m.home + ": " + m.hStr + "\n";
        if (m.aStr) line += "  ✈️ " + m.away + ": " + m.aStr + "\n";
        text += line;
      }
      text += "\n";
    }

    text += "Total: " + totalMatches + " matches / " + totalTeams + " teams";
    if (text.length > 4000) text = text.slice(0, 4000) + "\n...";

    await sendMessage(chatId, text, env);
  } catch (e) {
    await sendMessage(chatId, "⚠️ Streak Matches error: " + e.message, env);
  }
}

function streakLine(label, s) {
  if (!s) return label + " : -\n";
  return label + " : " + s.type + " " + s.count + " ဆက်\n";
}

async function sendTeamSearch(chatId, teamName, env) {
  if (!teamName) { await sendMessage(chatId, "❌ Format: /team Arsenal", env); return; }
  try {
    const like = "%" + teamName.toLowerCase() + "%";
    const { results } = await env.DB.prepare(
      "SELECT id, name, league, matches FROM (" +
      "SELECT home_id AS id, home AS name, league_name AS league, COUNT(*) AS matches FROM matches WHERE LOWER(home) LIKE ? GROUP BY home_id, home, league_name " +
      "UNION ALL " +
      "SELECT away_id AS id, away AS name, league_name AS league, COUNT(*) AS matches FROM matches WHERE LOWER(away) LIKE ? GROUP BY away_id, away, league_name" +
      ") GROUP BY id ORDER BY matches DESC LIMIT 20"
    ).bind(like, like).all();

    const teams = results || [];
    if (!teams.length) { await sendMessage(chatId, "❌ '" + teamName + "' ရှာမတွေ့ပါ", env); return; }
    if (teams.length === 1) { await sendTeamDetail(chatId, teams[0].id, env, null); return; }

    let text = "👥 '" + teamName + "' — " + teams.length + " matches\n\n";
    const btns = [];
    teams.forEach(function(t, i) {
      text += (i + 1) + ". " + t.name + " — " + t.league + " (" + t.matches + ")\n";
      btns.push([{ text: (i + 1) + ". " + t.name + " (" + t.league + ")", callback_data: "tm:" + t.id }]);
    });
    text += "\n👇 ရွေးပါ:";
    await sendMessage(chatId, text, env, { inline_keyboard: btns });
  } catch (e) {
    await sendMessage(chatId, "⚠️ Team search error: " + e.message, env);
  }
}

async function sendTeamDetail(chatId, teamId, env, replyTo) {
  try {
    const tid = Number(teamId);
    const { results: all } = await env.DB.prepare(
      "SELECT * FROM matches WHERE home_id = ? OR away_id = ? ORDER BY timestamp DESC LIMIT 30"
    ).bind(tid, tid).all();

    if (!all || !all.length) { await sendMessage(chatId, "❌ Team data မရပါ", env); return; }

    const first = all[0];
    const teamName = String(first.home_id) === String(tid) ? first.home : first.away;
    const league = first.league_name || "";

    const ouRes = (gf, ga) => gf + ga > 2.5 ? "O" : gf + ga < 2.5 ? "U" : "P";
    const haRes = (gf, ga) => gf > ga ? "W" : gf < ga ? "L" : "D";
    const ahRes = (gf, ga, ahh) => {
      const h = Number(ahh);
      if (isNaN(h)) return "?";
      const adj = gf + h - ga;
      return adj > 0 ? "W" : adj < 0 ? "L" : "P";
    };

    const recent = [];
    const homeL5 = [];
    const awayL5 = [];
    const ouSeq = [], haSeq = [], ahSeq = [];

    for (const m of all) {
  // ✅ NEW: NS နဲ့ ရလဒ်မရှိသေးတဲ့ပွဲတွေကို လုံးဝ ကျော်သွားစေရန်
  if (m.status === 'NS' || m.ft_home === null || m.ft_away === null || m.ft_home === "" || m.ft_away === "") continue;

  const isHome = String(m.home_id) === String(tid);
  const gf = isHome ? Number(m.ft_home) : Number(m.ft_away);
  const ga = isHome ? Number(m.ft_away) : Number(m.ft_home);
  if (isNaN(gf) || isNaN(ga)) continue;
      
      const rec = {
        date: m.date, home: m.home, away: m.away,
        fth: m.ft_home, fta: m.ft_away, hth: m.ht_home, hta: m.ht_away,
        side: isHome ? "H" : "A",
        ou: ouRes(gf, ga), ah: ahRes(gf, ga, m.ahh), ha: haRes(gf, ga)
      };
      if (recent.length < 5) recent.push(rec);
      if (isHome && homeL5.length < 5) homeL5.push(rec);
      if (!isHome && awayL5.length < 5) awayL5.push(rec);
      if (ouSeq.length < 10) { ouSeq.push(rec.ou); haSeq.push(rec.ha); ahSeq.push(rec.ah); }
    }

    const calcStreak = (seq) => {
      if (!seq.length) return null;
      const first = seq[0]; let c = 0;
      for (const s of seq) { if (s === first) c++; else break; }
      return c >= 4 ? { type: first, count: c } : null;
    };

    let text = "👥 " + teamName.toUpperCase() + "\n";
    if (league) text += "🏆 " + league + "\n";
    text += "\n";

    const sOu = calcStreak(ouSeq);
    const sHa = calcStreak(haSeq);
    const sAh = calcStreak(ahSeq);
    text += "📊 Streaks\n";
    if (sOu) text += "O/U : " + sOu.type + " " + sOu.count + " ဆက်\n";
    if (sHa) text += "HA  : " + sHa.type + " " + sHa.count + " ဆက်\n";
    if (sAh) text += "AH  : " + sAh.type + " " + sAh.count + " ဆက်\n";
    if (!sOu && !sHa && !sAh) text += "-\n";
    text += "\n";

    if (recent.length) {
      text += "📈 Recent " + recent.length + "\n";
      recent.forEach(function(r, i) {
        const score = r.fth + "-" + r.fta;
        const ht = (r.hth !== null && r.hta !== null && r.hth !== "") ? " (HT " + r.hth + "-" + r.hta + ")" : "";
        let line = (i + 1) + ". " + r.home + " " + score + " " + r.away + " [" + r.side + "]" + ht;
        line += " | HA:" + (r.ha || "?") + " | AH:" + (r.ah || "?") + " | O/U:" + (r.ou || "?");
        text += line + "\n";
      });
      text += "\n";
    }

    if (homeL5.length) {
      text += "🏠 Home L5\n";
      text += "HA  : " + homeL5.map(r => r.ha || "?").join(" ") + "\n";
      text += "AH  : " + homeL5.map(r => r.ah || "?").join(" ") + "\n";
      text += "O/U : " + homeL5.map(r => r.ou || "?").join(" ") + "\n\n";
    }

    if (awayL5.length) {
      text += "✈️ Away L5\n";
      text += "HA  : " + awayL5.map(r => r.ha || "?").join(" ") + "\n";
      text += "AH  : " + awayL5.map(r => r.ah || "?").join(" ") + "\n";
      text += "O/U : " + awayL5.map(r => r.ou || "?").join(" ") + "\n\n";
    }

    const infer = await findInferForTeam(teamName, env);
    if (infer) {
      text += "📊 Infer (next match)\n";
      text += "🏆 " + infer.league + "\n";
      text += "🏟️ " + infer.home + " vs " + infer.away + "\n";
      text += "🕒 " + infer.scheduled_at + "\n\n";
      text += "Open AH: " + (infer.open.ah ? infer.open.ah.line : '-') + " | Cur AH: " + (infer.cur.ah ? infer.cur.ah.line : '-') + "\n";
      text += "Open Tot: " + (infer.open.total ? infer.open.total.line : '-') + " | Cur Tot: " + (infer.cur.total ? infer.cur.total.line : '-') + "\n";
      text += "Flip: " + (infer.bodyFlip ? 'YES' : 'no') + " | Move: " + (infer.move || '-') + "\n";
      if (infer.formula2.pass) text += "🎯 F2: OVER " + infer.formula2.line + "\n";
      if (infer.formula3.pass) text += "🎯 F3: UNDER (" + infer.formula3.openLine + "→" + infer.formula3.curLine + ")\n";
    }

    if (text.length > 4000) text = text.slice(0, 4000) + "...";
    await sendMessage(chatId, text, env, undefined, replyTo);
  } catch (e) {
    await sendMessage(chatId, "⚠️ Team detail error: " + e.message, env);
  }
        }
// ============================================================
// PART 4A-1 — Menu + Helpers
// ============================================================

async function sendMainMenu(chatId, env) {
  try {
    await fetch(
      "https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "⌨️", reply_markup: { remove_keyboard: true } }) }
    );
  } catch (e) {}
  const kb = {
    inline_keyboard: [
      [{ text: "⚽ Football Analysis", callback_data: "football_analysis" }],
      [{ text: "📊 Streaks", callback_data: "streaks" }],
      [{ text: "🔥 Streak Matches", callback_data: "streakmatches" }],
      [{ text: "📋 Audit", callback_data: "audit" }],
      [{ text: "📊 API Usage", callback_data: "apiusage" }],
      [{ text: "📊 Round Stats", callback_data: "roundstats" }]
    ]
  };
  await sendMessage(chatId, "⚽ SaggiterX Football Bot\n\n/team [name] — Team stats\n/streaks — Streaks\n/streakmatches — Streak matches\n/inferlist — Infer events\n/infercheck — Formula check\n/inferfetch — Infer fetch now", env, kb);
}

async function sendFootballMenu(chatId, env) {
  const kb = {
    inline_keyboard: [
      [{ text: "📅 Current Round", callback_data: "current_round" }],
      [{ text: "📅 Next Round", callback_data: "next_round" }],
      [{ text: "⭐ Other League (O2.5)", callback_data: "other_league" }]
    ]
  };
  await sendMessage(chatId, "⚽ Football Analysis", env, kb);
}

async function sendMessage(chatId, text, env, kb, replyTo) {
  const body = { chat_id: chatId, text: text };
  if (kb) body.reply_markup = kb;
  if (replyTo) body.reply_parameters = { message_id: replyTo };
  return await fetch(
    "https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
}

async function answerCallback(id, env) {
  await fetch(
    "https://api.telegram.org/bot" + env.BOT_TOKEN + "/answerCallbackQuery",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: id }) }
  );
}

async function footballDataRequest(url, env) {
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY, "Accept": "application/json" }
  });
  const txt = await res.text();
  let data;
  try { data = JSON.parse(txt); }
  catch (e) { throw new Error("JSON err HTTP " + res.status); }
  if (!res.ok) throw new Error("HTTP " + res.status + ": " + (data.message || "?"));
  return data;
}

async function getCompetitionMatches(code, env) {
  return await footballDataRequest("https://api.football-data.org/v4/competitions/" + code + "/matches", env);
}

function formatMM(utcDate) {
  const ts = Date.parse(utcDate);
  if (isNaN(ts)) return "?";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Yangon",
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(ts);
}

async function getRoundMatches(code, mode, env) {
  const data = await getCompetitionMatches(code, env);
  const matches = Array.isArray(data.matches) ? data.matches : [];
  if (!matches.length) return { matchday: null, matches: [] };
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const withTs = matches.filter(function(m) {
    if (!m.utcDate) return false;
    const k = Date.parse(m.utcDate);
    return !isNaN(k);
  }).map(function(m) {
    return { m: m, ts: Date.parse(m.utcDate) };
  }).sort(function(a, b) { return a.ts - b.ts; });
  const future = withTs.filter(function(x) { return x.ts >= now; });
  if (!future.length) return { matchday: null, matches: [] };
  const in7 = future.filter(function(x) { return x.ts <= now + 7 * DAY; });
  const in14 = future.filter(function(x) { return x.ts > now + 7 * DAY && x.ts <= now + 14 * DAY; });
  let pick;
  if (mode === "current") {
    pick = in7.length ? in7 : future.slice(0, 20);
  } else {
    pick = in14.length ? in14 : (in7.length ? future.slice(in7.length, in7.length + 20) : future.slice(20, 40));
  }
  if (!pick.length) return { matchday: null, matches: [] };
  const md = pick[0].m.matchday;
  const target = (md !== null && md !== undefined) ? md : pick[0].m.id;
  const rm = withTs.filter(function(x) {
    const xmd = x.m.matchday;
    if (target !== null && xmd !== null && xmd !== undefined) return xmd === target;
    return false;
  }).sort(function(a, b) { return a.ts - b.ts; }).map(function(x) { return x.m; });
  const finalList = rm.length ? rm : pick.map(function(x) { return x.m; });
  return { matchday: target, matches: finalList };
}

function getNightDay(utcDate) {
  const ts = Date.parse(utcDate);
  if (isNaN(ts)) return null;
  const mm = ts + (6 * 60 + 30) * 60 * 1000;
  const d = new Date(mm);
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  if (hour >= 16) return day;
  if (hour < 6) return (day + 6) % 7;
  return null;
}

const HINT_RULES = [];
function registerHint(fn) { HINT_RULES.push(fn); }

function buildHints(lgCode, matches) {
  const hints = {};
  const byN = {};
  for (const m of matches) {
    const nd = getNightDay(m.utcDate);
    if (nd === null) continue;
    if (!byN[nd]) byN[nd] = [];
    byN[nd].push(m);
  }
  for (const ndStr of Object.keys(byN)) {
    const nd = parseInt(ndStr);
    const ms = byN[ndStr].slice().sort(function(a, b) { return Date.parse(a.utcDate) - Date.parse(b.utcDate); });
    const firstId = ms[0].id;
    const lastId = ms[ms.length - 1].id;
    if (nd === 5) {
      if (lgCode === "BL1" || lgCode === "FL1") for (const m of ms) hints[m.id] = "ဂိုးပေါ်";
    } else if (nd === 6) {
      if (lgCode === "PL") hints[firstId] = "ဂိုးအောက်";
      if (lgCode === "PD") hints[firstId] = "ဂိုးပေါ်";
      if (lgCode === "FL1") hints[lastId] = "ဂိုးအောက်";
    } else if (nd === 0) {
      if (lgCode === "BL1") for (const m of ms) hints[m.id] = "ဂိုးပေါ်";
      if (lgCode === "FL1") hints[firstId] = "ဂိုးပေါ်";
      if (lgCode === "SA") hints[firstId] = "ဂိုးပေါ်";
    }
  }
  for (const rule of HINT_RULES) {
    try { rule(hints, lgCode, matches, byN); } catch (e) { console.log("hint err: " + e.message); }
  }
  return hints;
}

function normName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function nameMatch(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0) return true;
  const ta = na.split(" ").filter(function(x) { return x.length >= 3; });
  const tb = nb.split(" ").filter(function(x) { return x.length >= 3; });
  if (!ta.length || !tb.length) return false;
  let hit = 0;
  ta.forEach(function(x) {
    if (tb.some(function(y) { return y === x || y.indexOf(x) === 0 || x.indexOf(y) === 0; })) hit++;
  });
  return hit / Math.max(ta.length, tb.length) >= 0.5;
}

async function findSheetO25(sheetData, home, away) {
  if (!sheetData || !sheetData.matches) return null;
  for (const m of sheetData.matches) {
    if (m.o25 !== "Y") continue;
    if (nameMatch(m.home, home) && nameMatch(m.away, away)) return m;
    if (nameMatch(m.home, away) && nameMatch(m.away, home)) return m;
  }
  return null;
}

async function findSheetAny(sheetData, home, away) {
  if (!sheetData || !sheetData.matches) return null;
  for (const m of sheetData.matches) {
    if (nameMatch(m.home, home) && nameMatch(m.away, away)) return m;
    if (nameMatch(m.home, away) && nameMatch(m.away, home)) return m;
  }
  return null;
}

async function getStreaksCache(env) {
  try {
    const raw = await env.BOT_KV.get("streaks:cache");
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.ts && (Date.now() - d.ts) < 30 * 60 * 1000) return d.data;
    }
  } catch (e) {}

  try {
    const { results } = await env.DB.prepare(
  "SELECT home_id, home, away_id, away, ft_home, ft_away, ahh, league_name, timestamp FROM matches WHERE ft_home IS NOT NULL ORDER BY timestamp DESC LIMIT 10000"
).all();

    if (!results || !results.length) return null;

    const MIN_STREAK = 4;
    const ouRes = (gf, ga) => (gf + ga) > 2.5 ? "O" : (gf + ga) < 2.5 ? "U" : "?";
    const ahRes = (gf, ga, ahh) => {
      const h = Number(ahh);
      if (isNaN(h)) return "?";
      const adj = gf + h - ga;
      return adj > 0 ? "W" : adj < 0 ? "L" : "P";
    };
    const haRes = (gf, ga) => gf > ga ? "W" : gf < ga ? "L" : "D";

    const idx = {};
    for (const r of results) {
      const hid = String(r.home_id), aid = String(r.away_id);
      if (!idx[hid]) idx[hid] = { name: r.home, league: "", matches: [] };
      if (!idx[aid]) idx[aid] = { name: r.away, league: "", matches: [] };
      idx[hid].league = r.league_name || idx[hid].league;
      idx[aid].league = r.league_name || idx[aid].league;
      idx[hid].matches.push({ side: "H", gf: Number(r.ft_home), ga: Number(r.ft_away), ahh: r.ahh, ts: r.timestamp });
      idx[aid].matches.push({ side: "A", gf: Number(r.ft_away), ga: Number(r.ft_home), ahh: r.ahh, ts: r.timestamp });
    }

    const calcStreak = (seq) => {
      if (!seq.length) return null;
      const first = seq[0]; let c = 0;
      for (const s of seq) { if (s === first) c++; else break; }
      return c >= MIN_STREAK ? { value: first, count: c } : null;
    };

    const teams = [];
    for (const tid in idx) {
      const t = idx[tid];
      t.matches.sort((a, b) => b.ts - a.ts);
      const last10 = t.matches.slice(0, 10);

      const ovOU = last10.map(m => ouRes(m.gf, m.ga));
      const ovAH = last10.map(m => ahRes(m.gf, m.ga, m.ahh));
      const ovHA = last10.map(m => haRes(m.gf, m.ga));
      const hOU = last10.filter(m => m.side === "H").map(m => ouRes(m.gf, m.ga));
      const hAH = last10.filter(m => m.side === "H").map(m => ahRes(m.gf, m.ga, m.ahh));
      const hHA = last10.filter(m => m.side === "H").map(m => haRes(m.gf, m.ga));
      const aOU = last10.filter(m => m.side === "A").map(m => ouRes(m.gf, m.ga));
      const aAH = last10.filter(m => m.side === "A").map(m => ahRes(m.gf, m.ga, m.ahh));
      const aHA = last10.filter(m => m.side === "A").map(m => haRes(m.gf, m.ga));

      const streaks = {};
      const ov = {};
      const o1 = calcStreak(ovOU); if (o1) ov.ou = o1;
      const o2 = calcStreak(ovAH); if (o2) ov.ah = o2;
      const o3 = calcStreak(ovHA); if (o3) ov.ha = o3;
      if (Object.keys(ov).length) streaks.overall = ov;

      const hm = {};
      const h1 = calcStreak(hOU); if (h1) hm.ou = h1;
      const h2 = calcStreak(hAH); if (h2) hm.ah = h2;
      const h3 = calcStreak(hHA); if (h3) hm.ha = h3;
      if (Object.keys(hm).length) streaks.home = hm;

      const am = {};
      const a1 = calcStreak(aOU); if (a1) am.ou = a1;
      const a2 = calcStreak(aAH); if (a2) am.ah = a2;
      const a3 = calcStreak(aHA); if (a3) am.ha = a3;
      if (Object.keys(am).length) streaks.away = am;

      if (Object.keys(streaks).length) {
        teams.push({ id: tid, name: t.name, league: t.league, streaks: streaks });
      }
    }

    const data = {
      ok: true,
      updated: new Date().toISOString(),
      minStreak: MIN_STREAK,
      totalRows: results.length,
      season: "",
      teams: teams,
      leagues: []
    };

    try { await env.BOT_KV.put("streaks:cache", JSON.stringify({ ts: Date.now(), data: data }), { expirationTtl: 1800 }); } catch (e) {}
    return data;
  } catch (e) {
    console.log("getStreaksCache D1 err: " + e.message);
    return null;
  }
}

function streakBadgeByName(teamName, streaks) {
  if (!streaks || !streaks.teams || !teamName) return "";
  const norm = function(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); };
  const q = norm(teamName);
  if (!q) return "";
  let best = null;
  for (let i = 0; i < streaks.teams.length; i++) {
    const t = streaks.teams[i];
    const n = norm(t.name);
    if (!n) continue;
    if (n === q) { best = t; break; }
    if (!best && (n.indexOf(q) >= 0 || q.indexOf(n) >= 0)) best = t;
  }
  if (!best || !best.streaks) return "";
  const parts = [];
  const s = best.streaks.overall || {};
  if (s.ha) parts.push("HA:" + s.ha.value + s.ha.count);
  if (s.ah) parts.push("AH:" + s.ah.value + s.ah.count);
  if (s.ou) parts.push("O/U:" + s.ou.value + s.ou.count);
  return parts.join(",");
}

function formatButtonDateTime(m) {
  const dateStr = String(m.date || "").trim();
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):?(\d{2}))?/);
  if (match) {
    const mm = match[2];
    const dd = match[3];
    const hh = match[4] || "";
    const mi = match[5] || "";
    if (hh && mi) return mm + "/" + dd + " " + hh + ":" + mi;
    return mm + "/" + dd;
  }
  const ts = Number(m.timestamp || 0);
  if (ts > 0) {
    const mmTime = new Date(ts + 6.5 * 3600 * 1000);
    const mm = String(mmTime.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(mmTime.getUTCDate()).padStart(2, "0");
    const hh = String(mmTime.getUTCHours()).padStart(2, "0");
    const mi = String(mmTime.getUTCMinutes()).padStart(2, "0");
    return mm + "/" + dd + " " + hh + ":" + mi;
  }
  return dateStr;
}

async function saveMatchState(env, chatId, s) {
  await env.BOT_KV.put("match:" + chatId, JSON.stringify(s), { expirationTtl: 3600 });
}
async function getSavedMatch(env, chatId) {
  const r = await env.BOT_KV.get("match:" + chatId);
  return r ? JSON.parse(r) : null;
}
async function clearMatchState(env, chatId) {
  await env.BOT_KV.delete("match:" + chatId);
}
// ============================================================
// PART 4A-2 — Round Scan + Match Detail
// ============================================================

async function runRoundScan(chatId, mode, env) {
  await sendMessage(chatId, mode === "current" ? "📅 CURRENT ROUND" : "📅 NEXT ROUND", env);
  const sheetCacheRaw = await env.BOT_KV.get("sheet:cache");
  let sheetData = null;
  if (sheetCacheRaw) { try { sheetData = JSON.parse(sheetCacheRaw); } catch (e) {} }
  let streaks = null;
  try { streaks = await getStreaksCache(env); } catch (e) {}
  let found = false;
  let first = true;
  for (const lg of LEAGUES) {
    if (!first) await new Promise(function(r) { setTimeout(r, 3000); });
    first = false;
    try {
      const result = await getRoundMatches(lg.code, mode, env);
      if (!result.matches || !result.matches.length) continue;
      found = true;
      const hints = buildHints(lg.code, result.matches);
      let text = lg.flag + " " + lg.name + "\nRound " + result.matchday + " — " + result.matches.length + " ပွဲ";
      const btns = [];
      for (const m of result.matches) {
        const h = (m.homeTeam && (m.homeTeam.shortName || m.homeTeam.name)) || "?";
        const a = (m.awayTeam && (m.awayTeam.shortName || m.awayTeam.name)) || "?";
        const k = formatMM(m.utcDate);
        const status = String(m.status || "").toUpperCase();
        let scoreStr = "";
        if (status === "FINISHED" && m.score && m.score.fullTime) {
          const ftH = m.score.fullTime.home, ftA = m.score.fullTime.away;
          if (ftH !== null && ftA !== null) scoreStr = " " + ftH + "-" + ftA;
        } else if ((status === "IN_PLAY" || status === "PAUSED") && m.score && m.score.fullTime) {
          const ftH = m.score.fullTime.home, ftA = m.score.fullTime.away;
          if (ftH !== null && ftA !== null) scoreStr = " " + ftH + "-" + ftA;
        }
        let prefix = "·";
        if (status === "FINISHED") prefix = "✅";
        else if (status === "IN_PLAY" || status === "PAUSED") prefix = "🔴";
        let sheetHit = null;
        if (sheetData) sheetHit = await findSheetO25(sheetData, m.homeTeam && m.homeTeam.name, m.awayTeam && m.awayTeam.name);
        if (sheetHit && status !== "FINISHED") {
          const stars = sheetHit.htStars || 0;
          if (stars >= 2) prefix = "⭐⭐";
          else if (stars === 1) prefix = "⭐";
        } else if (hints[m.id] && status !== "FINISHED") {
          prefix = "💡";
        }
        if (streaks && streaks.teams && status !== "FINISHED") {
          const hn = (m.homeTeam && (m.homeTeam.shortName || m.homeTeam.name)) || "";
          const an = (m.awayTeam && (m.awayTeam.shortName || m.awayTeam.name)) || "";
          const hb = streakBadgeByName(hn, streaks);
          const ab = streakBadgeByName(an, streaks);
          if (hb || ab) prefix = "💥";
        }
        const hShort = String(h).slice(0, 8);
        const aShort = String(a).slice(0, 8);
        const kShort = String(k).replace(",", "");
        const btnText = prefix + hShort + " vs " + aShort + scoreStr + " | " + kShort;
        btns.push([{ text: btnText, callback_data: "m:" + lg.code + ":" + m.id }]);
      }
      await sendMessage(chatId, text, env, { inline_keyboard: btns });
    } catch (e) {
      await sendMessage(chatId, lg.flag + " " + lg.name + "\n❌ " + e.message, env);
    }
  }
  if (!found) await sendMessage(chatId, "❌ ပွဲစဉ်မတွေ့ပါ", env);
}

async function sendOtherLeague(chatId, env) {
  const c = await env.BOT_KV.get("sheet:cache");
  if (!c) { await sendMessage(chatId, "❌ Cache မရပါ။ /refresh ရိုက်ပါ။", env); return; }
  const data = JSON.parse(c);
  if (!data.matches || !data.matches.length) { await sendMessage(chatId, "❌ Sheet data ဗလာ", env); return; }
  const others = data.matches.filter(function(m) {
    if (m.o25 !== "Y") return false;
    const n = String(m.league || "").toLowerCase().trim();
    return !SIX_LEAGUE_NAMES.some(function(x) { return n === x; });
  });
  if (!others.length) { await sendMessage(chatId, "⭐ Other League: O2.5=Y မရှိပါ", env); return; }
  const btns = [];
  const seen = {};
  others.forEach(function(m) {
    const key = String(m.id);
    if (seen[key]) return;
    seen[key] = true;
    const h = String(m.home || "?").slice(0, 5);
    const a = String(m.away || "?").slice(0, 5);
    const dt = formatButtonDateTime(m);
    btns.push([{ text: h + " vs " + a + " " + dt, callback_data: "sm:" + m.id }]);
  });
  await sendMessage(chatId, "OTHER LEAGUE (O2.5=Y)\n" + btns.length + " ပွဲ\n\n👇 ပွဲတစ်ပွဲ နှိပ်ပါ။", env, { inline_keyboard: btns });
}

async function showSheetMatchDetail(chatId, sheetId, env, replyTo) {
  const c = await env.BOT_KV.get("sheet:cache");
  if (!c) { await sendMessage(chatId, "❌ Cache မရပါ။ /refresh ရိုက်ပါ။", env); return; }
  const data = JSON.parse(c);
  const m = (data.matches || []).find(function(x) { return String(x.id) === String(sheetId); });
  if (!m) { await sendMessage(chatId, "❌ ပွဲရှာမတွေ့ပါ", env); return; }
  await saveMatchState(env, chatId, { leagueCode: null, matchId: String(m.id), home: m.home, away: m.away, upperTeam: null, detailMsgId: null });
  let text = "🏆 " + (m.league || "?") + "\n";
  text += "🏟️ " + m.home + " vs " + m.away + "\n";
  text += "🕒 " + (m.date || "?") + "\n";
  text += formatSheetDetail(m);

  const infer = await findInferForTeam(m.home, env) || await findInferForTeam(m.away, env);
  if (infer) {
    text += "\n📊 Infer (next match)\n";
    text += "🏆 " + infer.league + "\n";
    text += "🏟️ " + infer.home + " vs " + infer.away + "\n";
    text += "🕒 " + infer.scheduled_at + "\n";
    text += "Open AH: " + (infer.open.ah ? infer.open.ah.line : '-') + " | Cur AH: " + (infer.cur.ah ? infer.cur.ah.line : '-') + "\n";
    text += "Open Tot: " + (infer.open.total ? infer.open.total.line : '-') + " | Cur Tot: " + (infer.cur.total ? infer.cur.total.line : '-') + "\n";
    text += "Flip: " + (infer.bodyFlip ? 'YES' : 'no') + " | Move: " + (infer.move || '-') + "\n";
    if (infer.formula2.pass) text += "🎯 F2: OVER " + infer.formula2.line + "\n";
    if (infer.formula3.pass) text += "🎯 F3: UNDER (" + infer.formula3.openLine + "→" + infer.formula3.curLine + ")\n";
  } else {
    text += "\n📊 Infer: No data\n";
  }

  const fresh = await getFreshness(env);
  if (fresh) text += "\n📊 Data: CSV " + fresh.csvDate + " | API " + fresh.apiDate;
  text += "\n\n❓ ဘယ်အသင်းက အထက်ကြေးလဲ?";
  const kb = { inline_keyboard: [[{ text: "⬆️ " + m.home, callback_data: "up:A" }], [{ text: "⬆️ " + m.away, callback_data: "up:B" }]] };
  await sendMessage(chatId, text, env, kb, replyTo);
}

async function showMatchDetail(chatId, lgCode, matchId, env, replyTo) {
  try {
    const data = await getCompetitionMatches(lgCode, env);
    const m = (data.matches || []).find(function(x) { return String(x.id) === String(matchId); });
    if (!m) { await sendMessage(chatId, "❌ Data မရှိတော့ပါ", env); return; }
    const h = (m.homeTeam && m.homeTeam.name) || "?";
    const a = (m.awayTeam && m.awayTeam.name) || "?";
    const k = formatMM(m.utcDate);
    const lg = LEAGUES.find(function(x) { return x.code === lgCode; });
    await saveMatchState(env, chatId, { leagueCode: lgCode, matchId: matchId, home: h, away: a, upperTeam: null, detailMsgId: null });
    let text = "";
    if (lg) text += lg.flag + " " + lg.name + "\n";
    text += "🏟️ " + h + " vs " + a + "\n🕒 " + k + "\n📅 MD " + (m.matchday || "?");

    const status = String(m.status || "").toUpperCase();
    const ft = (m.score && m.score.fullTime) ? m.score.fullTime : null;
    const ht = (m.score && m.score.halfTime) ? m.score.halfTime : null;
    const ftH = ft && (ft.home !== null && ft.home !== undefined) ? ft.home : null;
    const ftA = ft && (ft.away !== null && ft.away !== undefined) ? ft.away : null;
    const htH = ht && (ht.home !== null && ht.home !== undefined) ? ht.home : null;
    const htA = ht && (ht.away !== null && ht.away !== undefined) ? ht.away : null;

    if (status === "FINISHED" && ftH !== null && ftA !== null) {
      text += "\n\n✅ ပြီးဆုံး — FT " + ftH + " - " + ftA;
      if (htH !== null && htA !== null) text += " (HT " + htH + " - " + htA + ")";
      const tot = ftH + ftA;
      const ouRes = tot > 2.5 ? "O" : (tot < 2.5 ? "U" : "P");
      const haRes = ftH > ftA ? "W" : (ftH < ftA ? "L" : "D");
      text += "\n📊 O/U: " + ouRes + " | HA: " + haRes;
    } else if (status === "IN_PLAY" || status === "PAUSED") {
      text += "\n\n⏳ ကစားနေဆဲ";
      if (ftH !== null && ftA !== null) text += " — " + ftH + " - " + ftA;
      if (htH !== null && htA !== null) text += " (HT " + htH + " - " + htA + ")";
    } else if (status === "SCHEDULED" || status === "TIMED") {
      text += "\n\n⏰ မ စရသေး";
    } else if (ftH !== null && ftA !== null) {
      text += "\n\n📊 " + status + " — " + ftH + " - " + ftA;
    }

    const streaks = await getStreaksCache(env);
    if (streaks && streaks.teams) {
      const hb = streakBadgeByName(h, streaks);
      const ab = streakBadgeByName(a, streaks);
      if (hb || ab) {
        text += "\n\n📊 Streak Hints";
        if (hb) text += "\n💥 " + h + "\n   " + hb;
        if (ab) text += "\n💥 " + a + "\n   " + ab;
      }
    }
    const sheetRaw = await env.BOT_KV.get("sheet:cache");
    if (sheetRaw) {
      try {
        const sd = JSON.parse(sheetRaw);
        const sm = await findSheetAny(sd, h, a);
        if (sm) text += formatSheetDetail(sm);
      } catch (e) {}
    }

    const infer = await findInferForTeam(h, env) || await findInferForTeam(a, env);
    if (infer) {
      text += "\n📊 Infer (next match)\n";
      text += "🏆 " + infer.league + "\n";
      text += "🏟️ " + infer.home + " vs " + infer.away + "\n";
      text += "🕒 " + infer.scheduled_at + "\n";
      text += "Open AH: " + (infer.open.ah ? infer.open.ah.line : '-') + " | Cur AH: " + (infer.cur.ah ? infer.cur.ah.line : '-') + "\n";
      text += "Open Tot: " + (infer.open.total ? infer.open.total.line : '-') + " | Cur Tot: " + (infer.cur.total ? infer.cur.total.line : '-') + "\n";
      text += "Flip: " + (infer.bodyFlip ? 'YES' : 'no') + " | Move: " + (infer.move || '-') + "\n";
      if (infer.formula2.pass) text += "🎯 F2: OVER " + infer.formula2.line + "\n";
      if (infer.formula3.pass) text += "🎯 F3: UNDER (" + infer.formula3.openLine + "→" + infer.formula3.curLine + ")\n";
    } else {
      text += "\n📊 Infer: No data\n";
    }

    const fresh = await getFreshness(env);
    if (fresh) text += "\n📊 Data: CSV " + fresh.csvDate + " | API " + fresh.apiDate;
    text += "\n\n❓ ဘယ်အသင်းက အထက်ကြေးလဲ?";
    const kb = { inline_keyboard: [[{ text: "⬆️ " + h, callback_data: "up:A" }], [{ text: "⬆️ " + a, callback_data: "up:B" }]] };
    await sendMessage(chatId, text, env, kb, replyTo);
  } catch (e) {
    await sendMessage(chatId, "⚠️ Match detail error: " + e.message, env);
  }
        }
// ============================================================
// PART 4B-1 — refreshSheetCache + Tricks + Round Stats + YResults
// ============================================================

async function refreshSheetCache(env) {
  try {
    const res = await fetch(SHEET_URL, { redirect: "follow" });
    const data = JSON.parse(await res.text());
    let count = 0;
    if (data && data.ok) {
      await env.BOT_KV.put("sheet:cache", JSON.stringify(data), { expirationTtl: 7200 });
      count = data.count || 0;
    }

    const auditData = JSON.parse(await (await fetch(SHEET_URL + "?action=audit", { redirect: "follow" })).text());
    if (auditData && auditData.ok) await env.BOT_KV.put("audit:cache", JSON.stringify(auditData), { expirationTtl: 7200 });

    const apiData = JSON.parse(await (await fetch(SHEET_URL + "?action=apiusage", { redirect: "follow" })).text());
    if (apiData && apiData.ok) await env.BOT_KV.put("api:cache", JSON.stringify(apiData), { expirationTtl: 7200 });

    return "OK:" + count;
  } catch (e) {
    return "ERR:" + e.message;
  }
}

const TRICKS = [];
function registerTrick(fn) { TRICKS.push(fn); }
function runTricks(p) {
  return TRICKS.map(function(fn) {
    try { return fn(p); } catch (e) { return { name: fn.name, pass: false, note: "err" }; }
  });
}

async function runTrickCheck(chatId, p, env, replyTo) {
  const results = runTricks(p);
  let out = "🧪 Odds Test\n\n";
  out += "⬆️ " + p.upperTeam + "\n";
  out += "⬇️ " + p.lowerTeam + "\n\n";
  out += "Body : " + p.body + "\n";
  out += "Total : " + p.total + "\n\n";
  out += "📌 Theories\n\n";
  let any = false, tip = "";
  for (const r of results) {
    if (r.pass) { any = true; out += "✅ " + r.name + "\n" + r.note + "\n\n"; tip = r.note; }
  }
  if (!any) out += "❌ မကိုက်ပါ\n";
  if (tip) out += "🎯 " + tip + " ⭐";
  await sendMessage(chatId, out, env, undefined, replyTo);
  await clearMatchState(env, chatId);
}

registerTrick(function theory1zone3zone(p) {
  const bOk = /^1(=|\+10|\+20|-10|-20)?$/.test(p.body);
  const tOk = /^3(=|-\d+)?$/.test(p.total);
  const pass = bOk && tOk;
  let note = "";
  if (pass) note = "အောက်အသင်း ဂိုးသွင်းနိုင်";
  else if (!bOk) note = "Body မကိုက် (" + p.body + ")";
  else note = "Total မကိုက် (" + p.total + ")";
  return { name: "Theory 2 — 1= / 3-", pass: pass, note: note };
});

registerTrick(function theoryLaLigaOver(p) {
  const isPD = p.leagueCode === "PD";
  const tm = p.total.match(/^3\+(\d+)$/);
  const tn = tm ? parseInt(tm[1]) : null;
  const tOk = tn !== null && tn >= 30 && tn <= 70;
  const bm = p.body.match(/^-(\d+)$/);
  const bn = bm ? parseInt(bm[1]) : null;
  const bOk = bn !== null && bn >= 50 && bn <= 100;
  const pass = isPD && tOk && bOk;
  let note = "";
  if (pass) note = "ဂိုးပေါ်";
  else if (!isPD) note = "La Liga မဟုတ် (" + (p.leagueCode || "?") + ")";
  else if (!tOk) note = "Total မကိုက်";
  else note = "Body မကိုက်";
  return { name: "Theory 3 — La Liga Over", pass: pass, note: note };
});

registerTrick(function theoryChampionshipOver(p) {
  const isELC = p.leagueCode === "ELC";
  const b = p.body;
  let bOk = false;
  if (b === "0") bOk = true;
  else if (/^-\d+$/.test(b)) { const n = parseInt(b.slice(1)); if (n >= 10 && n <= 100) bOk = true; }
  else if (/^1-(\d+)$/.test(b)) { const n = parseInt(b.match(/^1-(\d+)$/)[1]); if (n >= 10 && n <= 50) bOk = true; }
  const tm = p.total.match(/^3\+(\d+)$/);
  const tn = tm ? parseInt(tm[1]) : null;
  const tOk = tn !== null && tn >= 30 && tn <= 70;
  const pass = isELC && bOk && tOk;
  let note = "";
  if (pass) note = "ဂိုးပေါင်းအပေါ်";
  else if (!isELC) note = "Championship မ ဟုတ် (" + (p.leagueCode || "?") + ")";
  else if (!bOk) note = "Body မကိုက် (" + b + ")";
  else note = "Total မကိုက် (" + p.total + ")";
  return { name: "Theory 4 — Championship Over", pass: pass, note: note };
});

registerHint(function satChampionshipHint(hints, lgCode, matches, byN) {
  if (lgCode !== "ELC") return;
  if (!byN[6] || !byN[6].length) return;
  const ms = byN[6].slice().sort(function(a, b) { return Date.parse(a.utcDate) - Date.parse(b.utcDate); });
  hints[ms[0].id] = "O2.5";
});

async function sendRoundStats(chatId, env) {
  try {
    const SIX_IDS = [39, 40, 140, 78, 135, 61];
    const { results } = await env.DB.prepare(
      "SELECT league_id, league_name, round, ft_home, ft_away, ahh, timestamp FROM matches WHERE league_id IN (39,40,140,78,135,61) AND ft_home IS NOT NULL AND ft_away IS NOT NULL AND round IS NOT NULL AND round != '' ORDER BY league_id ASC, timestamp ASC"
    ).all();

    if (!results || !results.length) {
      await sendMessage(chatId, "❌ Round data မရပါ", env);
      return;
    }

    const ouRes = (h, a) => (h + a) > 2.5 ? "O" : (h + a) < 2.5 ? "U" : "?";
    const ahRes = (h, a, ahh) => {
      const v = Number(ahh);
      if (isNaN(v)) return "?";
      const adj = h + v - a;
      return adj > 0 ? "W" : adj < 0 ? "L" : "P";
    };
    const haRes = (h, a) => h > a ? "W" : h < a ? "L" : "D";

    const groups = {};
    for (const r of results) {
      const key = r.league_id + "|" + r.round;
      if (!groups[key]) groups[key] = { league_id: r.league_id, name: r.league_name, round: r.round, ou: [], ah: [], ha: [] };
      groups[key].ou.push(ouRes(Number(r.ft_home), Number(r.ft_away)));
      groups[key].ah.push(ahRes(Number(r.ft_home), Number(r.ft_away), r.ahh));
      groups[key].ha.push(haRes(Number(r.ft_home), Number(r.ft_away)));
    }

    const sorted = Object.values(groups).sort((a, b) => {
      const ai = SIX_IDS.indexOf(Number(a.league_id));
      const bi = SIX_IDS.indexOf(Number(b.league_id));
      return ai - bi;
    });

    const sixOU = [], sixAH = [], sixHA = [];
    for (const g of sorted) {
      for (const x of g.ou) sixOU.push(x);
      for (const x of g.ah) sixAH.push(x);
      for (const x of g.ha) sixHA.push(x);
    }

    let text = "📊 ROUND STATS — 6 League\n";
    text += "📅 " + new Date().toISOString().slice(0, 10) + "\n\n";

    text += "🎯 SIX COMBINED (" + sixOU.length + ")\n";
    text += "O/U : " + sixOU.join("") + "\n";
    text += "HA  : " + sixHA.join("") + "\n";
    text += "AH  : " + sixAH.join("") + "\n\n";

    for (const g of sorted) {
      text += "🏆 " + (g.name || "?") + " — " + g.round + " (" + g.ou.length + ")\n";
      text += "O/U : " + g.ou.join("") + "\n";
      text += "HA  : " + g.ha.join("") + "\n";
      text += "AH  : " + g.ah.join("") + "\n\n";
    }

    if (text.length > 4000) {
      let chunk = "📊 ROUND STATS — 6 League\n📅 " + new Date().toISOString().slice(0, 10) + "\n\n";
      chunk += "🎯 SIX COMBINED (" + sixOU.length + ")\nO/U : " + sixOU.join("") + "\nHA  : " + sixHA.join("") + "\nAH  : " + sixAH.join("") + "\n\n";
      await sendMessage(chatId, chunk, env);
      chunk = "";
      for (const g of sorted) {
        const block = "🏆 " + (g.name || "?") + " — " + g.round + " (" + g.ou.length + ")\nO/U : " + g.ou.join("") + "\nHA  : " + g.ha.join("") + "\nAH  : " + g.ah.join("") + "\n\n";
        if ((chunk + block).length > 3900) {
          await sendMessage(chatId, chunk, env);
          chunk = block;
        } else {
          chunk += block;
        }
      }
      if (chunk) await sendMessage(chatId, chunk, env);
    } else {
      await sendMessage(chatId, text, env);
    }
  } catch (e) {
    await sendMessage(chatId, "⚠️ Round Stats error: " + e.message, env);
  }
}

async function sendYResults(chatId, env, dateParam) {
  try {
    const MM_OFFSET = 6 * 3600 * 1000 + 30 * 60 * 1000;
    const now = Date.now();
    const nowMM = new Date(now + MM_OFFSET);
    const y = nowMM.getUTCFullYear();
    const m = nowMM.getUTCMonth();
    const d = nowMM.getUTCDate();
    const hh = nowMM.getUTCHours();

    let targetDay;
    if (dateParam) {
      const parts = dateParam.split("-");
      targetDay = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
    } else {
      if (hh < 6) targetDay = new Date(Date.UTC(y, m, d - 1));
      else targetDay = new Date(Date.UTC(y, m, d));
    }

    const startTs = Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate(), 6, 30, 0) - MM_OFFSET;
    const endTs = startTs + 24 * 3600 * 1000;

    const startDate = new Date(startTs).toISOString().slice(0, 10);
    const endDate = new Date(endTs).toISOString().slice(0, 10);
    const targetLabel = targetDay.toISOString().slice(0, 10);

    const { results } = await env.DB.prepare(
      "SELECT date, home, away, ft_home, ft_away, result FROM y_log WHERE date >= ? AND date < ? ORDER BY date ASC"
    ).bind(startDate + " 00:00", endDate + " 00:00").all();

    if (!results || !results.length) {
      await sendMessage(chatId, "📊 Y RESULTS — " + targetLabel + "\n\n❌ Y ပွဲ မ ရှိပါ", env);
      return;
    }

    let text = "📊 Y RESULTS — " + targetLabel + "\n\n";
    let pass = 0, fail = 0, pending = 0;

    for (const r of results) {
      var ft = "-";
      if (r.ft_home !== null && r.ft_home !== '' && r.ft_away !== null && r.ft_away !== '') {
        ft = r.ft_home + "-" + r.ft_away;
      }
      var res = r.result || "⏳";
      if (res === "✅") pass++;
      else if (res === "❌") fail++;
      else pending++;
      text += res + " " + r.home + " vs " + r.away + " | " + ft + "\n";
    }

    text += "\n✅ " + pass + " | ❌ " + fail + " | ⏳ " + pending;
    if (text.length > 4000) text = text.slice(0, 4000) + "\n...";

    await sendMessage(chatId, text, env);
  } catch (e) {
    await sendMessage(chatId, "⚠️ Y Results error: " + e.message, env);
  }
        }
// ============================================================
// PART 4B-2 — Migration + D1 Helpers
// ============================================================

async function handleMigrate(request, env) {
  try {
    const url = new URL(request.url);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit") || "500", 10);
    const apiUrl = SHEET_URL + "?action=cachematches&offset=" + offset + "&limit=" + limit;

    const res = await fetch(apiUrl);
    const json = await res.json();
    if (!json.ok) return new Response("Sheet error: " + JSON.stringify(json), { status: 500 });

    const rows = json.rows || [];
    if (!rows.length) return new Response(JSON.stringify({ ok: true, inserted: 0, total: json.total, offset }));

    const stmt = env.DB.prepare(
      "INSERT OR REPLACE INTO matches (fixture_id,date,timestamp,league_id,league_name,country,tier,season,round,type,status,home_id,home,away_id,away,ft_home,ft_away,ht_home,ht_away,fetched_at,ahh,b365ahh,b365aha,b365o25,b365u25) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );

    const batch = rows.map(r => stmt.bind(
      r.fixture_id || "", r.date || "", r.timestamp || 0, r.league_id || 0, r.league_name || "",
      r.country || "", r.tier || 0, String(r.season || ""), r.round || "", r.type || "",
      r.status || "", r.home_id || 0, r.home || "", r.away_id || 0, r.away || "",
      r.ft_home === "" ? null : r.ft_home, r.ft_away === "" ? null : r.ft_away,
      r.ht_home === "" ? null : r.ht_home, r.ht_away === "" ? null : r.ht_away,
      r.fetched_at || "",
      r.ahh === "" ? null : r.ahh, r.b365ahh === "" ? null : r.b365ahh,
      r.b365aha === "" ? null : r.b365aha, r.b365o25 === "" ? null : r.b365o25,
      r.b365u25 === "" ? null : r.b365u25
    ));

    await env.DB.batch(batch);
    const nextOffset = offset + rows.length;
    const done = nextOffset >= (json.total || 0);

    return new Response(JSON.stringify({ ok: true, inserted: rows.length, offset: nextOffset, total: json.total, done }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response("migrate err: " + e.message, { status: 500 });
  }
}

async function handleMigrateAll(request, env) {
  const CHUNK = 500;
  const url = new URL(request.url);
  let offset = parseInt(url.searchParams.get("offset") || "0", 10);
  let total = 0, insertedTotal = 0, loops = 0;

  try {
    while (true) {
      loops++;
      if (loops > 45) break;

      const apiUrl = SHEET_URL + "?action=cachematches&offset=" + offset + "&limit=" + CHUNK;
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (!json.ok) break;

      total = json.total || 0;
      const rows = json.rows || [];
      if (!rows.length) break;

      const stmt = env.DB.prepare(
        "INSERT OR REPLACE INTO matches (fixture_id,date,timestamp,league_id,league_name,country,tier,season,round,type,status,home_id,home,away_id,away,ft_home,ft_away,ht_home,ht_away,fetched_at,ahh,b365ahh,b365aha,b365o25,b365u25) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      );

      const batch = rows.map(r => stmt.bind(
        r.fixture_id || "", r.date || "", r.timestamp || 0, r.league_id || 0, r.league_name || "",
        r.country || "", r.tier || 0, String(r.season || ""), r.round || "", r.type || "",
        r.status || "", r.home_id || 0, r.home || "", r.away_id || 0, r.away || "",
        r.ft_home === "" ? null : r.ft_home, r.ft_away === "" ? null : r.ft_away,
        r.ht_home === "" ? null : r.ht_home, r.ht_away === "" ? null : r.ht_away,
        r.fetched_at || "",
        r.ahh === "" ? null : r.ahh, r.b365ahh === "" ? null : r.b365ahh,
        r.b365aha === "" ? null : r.b365aha, r.b365o25 === "" ? null : r.b365o25,
        r.b365u25 === "" ? null : r.b365u25
      ));

      await env.DB.batch(batch);
      insertedTotal += rows.length;
      offset += rows.length;
      if (offset >= total) break;
    }

    const countRes = await env.DB.prepare("SELECT COUNT(*) AS n FROM matches").first();
    return new Response(JSON.stringify({ ok: true, insertedTotal, sheetTotal: total, loops, d1Count: countRes ? countRes.n : 0 }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, err: e.message, insertedTotal, offset, loops }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

async function handleMigrateMisc(request, env) {
  const results = {};

  try {
    // 1. y_log
    {
      const r = await fetch(SHEET_URL + "?action=ylog");
      const j = await r.json();
      if (j.ok && j.rows.length) {
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO y_log (date, fixture_id, league, home, away, ft_home, ft_away, result, saved_at) VALUES (?,?,?,?,?,?,?,?,?)");
        const batch = j.rows.map(x => stmt.bind(
          x.date || "", x.fixture_id || "", x.league || "", x.home || "", x.away || "",
          x.ft_home === "" ? null : x.ft_home, x.ft_away === "" ? null : x.ft_away,
          x.result || "", x.saved_at || x.date || ""
        ));
        await env.DB.batch(batch);
        results.y_log = j.rows.length;
      } else results.y_log = 0;
    }

    // 2. team_alias
    {
      const r = await fetch(SHEET_URL + "?action=teamalias");
      const j = await r.json();
      if (j.ok && j.rows.length) {
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO team_alias (league, csv_name, api_id, api_name, status) VALUES (?,?,?,?,?)");
        const batch = j.rows.map(x => stmt.bind(
          x.league_code || "", x.csv_name || "", x.api_team_id || 0, x.api_name || "", x.status || ""
        ));
        await env.DB.batch(batch);
        results.team_alias = j.rows.length;
      } else results.team_alias = 0;
    }

    // 3. infer_alias
    {
      const r = await fetch(SHEET_URL + "?action=inferaliasraw");
      const j = await r.json();
      if (j.ok && j.rows.length) {
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO infer_alias (key, value) VALUES (?,?)");
        const batch = j.rows.map(x => stmt.bind(x.infer_name || "", x.sheet_name || ""));
        await env.DB.batch(batch);
        results.infer_alias = j.rows.length;
      } else results.infer_alias = 0;
    }

    // 4. league_map
    {
      const r = await fetch(SHEET_URL + "?action=leaguemap");
      const j = await r.json();
      if (j.ok && j.rows.length) {
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO league_map (id, country, tier, name, code, infer_id) VALUES (?,?,?,?,?,?)");
        const batch = j.rows.map(x => stmt.bind(
          x.league_id || 0, x.country || "", (typeof x.tier === "number" ? x.tier : 0),
          x.league_name || "", x.code || "", x.infer_id || ""
        ));
        await env.DB.batch(batch);
        results.league_map = j.rows.length;
      } else results.league_map = 0;
    }

    // 5. line_archive
    {
      const r = await fetch(SHEET_URL + "?action=linearchive");
      const j = await r.json();
      if (j.ok && j.rows.length) {
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO line_archive (id, date, league, home, away, kickoff, open_ah, cur_ah, open_total, cur_total, fetched_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
        const batch = j.rows.map(x => {
          const numOrNull = (v) => (v === undefined || v === null || v === "") ? null : v;
          const strOr = (v) => (v === undefined || v === null) ? "" : String(v);
          return stmt.bind(
            strOr(x.fixture_id) + "_" + strOr(x.date),
            strOr(x.date), strOr(x.league), strOr(x.home), strOr(x.away),
            strOr(x.kickoff), numOrNull(x.open_ah), numOrNull(x.cur_ah),
            numOrNull(x.open_total), numOrNull(x.cur_total), strOr(x.fetched_at)
          );
        });
        await env.DB.batch(batch);
        results.line_archive = j.rows.length;
      } else results.line_archive = 0;
    }

    // 6. meta
    {
      const r = await fetch(SHEET_URL + "?action=meta");
      const j = await r.json();
      if (j.ok && j.rows.length) {
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?,?)");
        const batch = j.rows.map(x => stmt.bind(x.key || "", x.value || ""));
        await env.DB.batch(batch);
        results.meta = j.rows.length;
      } else results.meta = 0;
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, err: e.message, results }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

// ============================================================
// D1 HELPERS
// ============================================================

async function dbGetMatchesBySeason(env, season) {
  const q = season
    ? "SELECT home_id, home, away_id, away, ft_home, ft_away, ht_home, ht_away, ahh, season, timestamp FROM matches WHERE season = ? AND ft_home IS NOT NULL ORDER BY timestamp DESC"
    : "SELECT home_id, home, away_id, away, ft_home, ft_away, ht_home, ht_away, ahh, season, timestamp FROM matches WHERE ft_home IS NOT NULL ORDER BY timestamp DESC";
  const stmt = season ? env.DB.prepare(q).bind(season) : env.DB.prepare(q);
  const { results } = await stmt.all();
  return results || [];
}

async function dbGetCurrentSeason(env) {
  const row = await env.DB.prepare(
    "SELECT season FROM matches WHERE ft_home IS NOT NULL AND season IS NOT NULL ORDER BY timestamp DESC LIMIT 1"
  ).first();
  return row ? String(row.season) : "";
}

async function dbGetTeamMatches(env, teamId, limit) {
  const lim = limit || 10;
  const { results } = await env.DB.prepare(
    "SELECT * FROM matches WHERE home_id = ? OR away_id = ? ORDER BY timestamp DESC LIMIT ?"
  ).bind(teamId, teamId, lim).all();
  return results || [];
}

async function dbFindTeam(env, name) {
  const { results } = await env.DB.prepare(
    "SELECT DISTINCT home_id AS id, home AS name, league_name FROM matches WHERE LOWER(home) LIKE ? UNION SELECT DISTINCT away_id AS id, away AS name, league_name FROM matches WHERE LOWER(away) LIKE ? LIMIT 20"
  ).bind("%" + name.toLowerCase() + "%", "%" + name.toLowerCase() + "%").all();
  return results || [];
}

async function dbGetRoundStats(env) {
  const { results } = await env.DB.prepare(
    "SELECT league_id, league_name, round, ft_home, ft_away, ahh, timestamp FROM matches WHERE league_id IN (39,40,140,78,135,61) AND ft_home IS NOT NULL AND round IS NOT NULL AND round != '' ORDER BY league_id, timestamp ASC"
  ).all();
  return results || [];
}

async function dbGetYLog(env, dateParam) {
  let q = "SELECT date, fixture_id, league, home, away, ft_home, ft_away, result FROM y_log";
  const binds = [];
  if (dateParam) { q += " WHERE date LIKE ?"; binds.push(dateParam + "%"); }
  q += " ORDER BY date DESC";
  const stmt = binds.length ? env.DB.prepare(q).bind(...binds) : env.DB.prepare(q);
  const { results } = await stmt.all();
  return results || [];
}

async function dbGetInferAliases(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM infer_alias").all();
  const map = {};
  for (const r of results || []) map[r.key] = r.value;
  return map;
                            }
async function handleMigrateAnalysis(request, env) {
  const out = await migrateAnalysis(env);
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
}

async function handleMigrateMeta(request, env) {
  const out = await migrateMeta(env);
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
}

async function migrateAnalysis(env) {
  try {
    const res = await fetch(SHEET_URL + '?action=default', { redirect: 'follow' });
    const data = await res.json();
    if (!data || !data.ok || !data.matches || !data.matches.length) {
      return { ok: false, error: 'no analysis rows' };
    }
    const stmt = env.DB.prepare(
      "INSERT OR REPLACE INTO analysis (" +
      "fixture_id, date, league, home, away, o25, " +
      "overall_fair, ha_fair, ht_ratio, ht_stars, ht_latest3, " +
      "own_ou, own_ha, own_ah, " +
      "ov_ou, ov_ha, ov_ah, " +
      "h_ou, h_ha, h_ah, " +
      "a_ou, a_ha, a_ah, " +
      "h2h_ou, h2h_ha, h2h_ah, note" +
      ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );
    const batch = data.matches.map(r => stmt.bind(
      String(r.id || ''), String(r.date || ''), String(r.league || ''),
      String(r.home || ''), String(r.away || ''), String(r.o25 || ''),
      (r.overallFair === '' || r.overallFair === undefined) ? null : Number(r.overallFair),
      (r.haFair === '' || r.haFair === undefined) ? null : Number(r.haFair),
      String(r.htRatio || ''), Number(r.htStars || 0), String(r.htLatest3 || ''),
      String(r.ownOU || ''), String(r.ownHA || ''), String(r.ownAH || ''),
      String(r.ovOU || ''), String(r.ovHA || ''), String(r.ovAH || ''),
      String(r.hOU || ''), String(r.hHA || ''), String(r.hAH || ''),
      String(r.aOU || ''), String(r.aHA || ''), String(r.aAH || ''),
      String(r.h2hOU || ''), String(r.h2hHA || ''), String(r.h2hAH || ''),
      String(r.note || '')
    ));
    await env.DB.batch(batch);
    return { ok: true, inserted: data.matches.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function migrateMeta(env) {
  try {
    const res = await fetch(SHEET_URL + '?action=meta', { redirect: 'follow' });
    const data = await res.json();
    if (!data || !data.ok || !data.rows || !data.rows.length) {
      return { ok: false, error: 'no meta rows' };
    }
    const stmt = env.DB.prepare(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)"
    );
    const batch = data.rows.map(r => stmt.bind(
      String(r.key || ''), String(r.value ?? '')
    ));
    await env.DB.batch(batch);
    return { ok: true, inserted: data.rows.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
    }
  // ============================================================
// STEP 2 — D1 Helpers (9)
// ============================================================

async function dbGetAllAnalysis(env) {
  const { results } = await env.DB.prepare("SELECT * FROM analysis").all();
  return results || [];
}

async function dbGetAnalysis(env, fixtureId) {
  return await env.DB.prepare("SELECT * FROM analysis WHERE fixture_id = ?").bind(fixtureId).first();
}

async function dbGetMeta(env, key) {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key = ?").bind(key).first();
  return row ? row.value : null;
}

async function dbSetMeta(env, key, value) {
  await env.DB.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").bind(key, value).run();
}

async function dbGetLineArchive(env, filter) {
  let q = "SELECT * FROM line_archive";
  let binds = [];
  if (filter && filter.date) { q += " WHERE date = ?"; binds.push(filter.date); }
  q += " ORDER BY date DESC LIMIT 100";
  const stmt = binds.length ? env.DB.prepare(q).bind(...binds) : env.DB.prepare(q);
  const { results } = await stmt.all();
  return results || [];
}

async function dbInsertLineArchive(env, rows) {
  if (!rows || !rows.length) return 0;
  const stmt = env.DB.prepare(
    "INSERT OR REPLACE INTO line_archive (id, date, league, home, away, kickoff, open_ah, cur_ah, open_total, cur_total, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const batch = rows.map(r => stmt.bind(
    r.id, r.date, r.league, r.home, r.away, r.kickoff,
    r.open_ah, r.cur_ah, r.open_total, r.cur_total, r.fetched_at
  ));
  await env.DB.batch(batch);
  return rows.length;
}

async function dbGetTeamAlias(env) {
  const { results } = await env.DB.prepare("SELECT * FROM team_alias").all();
  return results || [];
}

async function dbGetInferAlias(env) {
  const { results } = await env.DB.prepare("SELECT * FROM infer_alias").all();
  const map = {};
  for (const r of results || []) map[r.key] = r.value;
  return map;
}

async function dbGetLeagueMap(env) {
  const { results } = await env.DB.prepare("SELECT * FROM league_map").all();
  return results || [];
}
