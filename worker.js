// =============================================================
// SaggiterX Bot — Full Worker Code (with Infer Mapping)
// ============================================================

const OWNER_ID = "1821028384"; 

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    try {
      // 1. CSV လက်ခံမယ့် Route (Python ကနေ ပို့ရင်)
      if (url.pathname === "/admin/import-csv" && request.method === "POST") {
        return await importCsv(request, env);
      }

      // 2. Database ရှင်းမယ့် Route
      if (url.pathname === "/admin/wipe" && request.method === "POST") {
        await env.DB.prepare("DELETE FROM matches").run();
        await env.DB.prepare("DELETE FROM infer_odds").run();
        await env.DB.prepare("DELETE FROM y_log").run();
        return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
      }

      // 3. Stats စစ်မယ့် Route
      if (url.pathname === "/admin/stats") {
        const m = await env.DB.prepare("SELECT COUNT(*) n FROM matches").first();
        const i = await env.DB.prepare("SELECT COUNT(*) n FROM infer_odds").first();
        return new Response(JSON.stringify({ matches: m.n, infer_odds: i.n }), { headers: { "content-type": "application/json" } });
      }

      // 4. Telegram Bot ချိတ်ဆက်မှု
      if (request.method === "POST") {
        const update = await request.json();
        if (update.message) return await onMessage(update.message, env);
        if (update.callback_query) return await onCallback(update.callback_query, env);
        return new Response("OK");
      }

      return new Response("Bot is running.");
    } catch (e) {
      console.log("Error:", e.message);
      return new Response("OK");
    }
  },

  // 5. Cron Trigger (အလိုအလျောက် Fixtures ဒေါင်းရန်)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(fetchFixturesAuto(env));
  }
};

// ============================================================
// TELEGRAM MESSAGE HANDLER
// ============================================================
async function onMessage(msg, env) {
  const chatId = String(msg.chat.id);
  if (chatId !== OWNER_ID) return new Response("OK"); 
  const text = msg.text || "";

  if (text === "/start") {
    await send(env, chatId, "⚽ SaggiterX Bot\n\n/stats — Database စစ်ရန်\n/team [name] — Team Stats\n/fixtures — နောက်လာမယ့် ပွဲစဉ်များ\n/inferfetch — InferSports ဒေတာဆွဲရန်");
    return new Response("OK");
  }

  if (text === "/stats") {
    const m = await env.DB.prepare("SELECT COUNT(*) n FROM matches").first();
    const i = await env.DB.prepare("SELECT COUNT(*) n FROM infer_odds").first();
    await send(env, chatId, `📊 <b>Database Stats</b>\n\nပွဲစဉ်: ${m.n} ပွဲ\nInfer Odds: ${i.n} ခု`);
    return new Response("OK");
  }

  if (text.startsWith("/team ")) {
    const name = text.slice(6).trim();
    if (!name) {
      await send(env, chatId, "❌ အသင်းနာမည် ထည့်ပါ။ ဥပမာ - /team Arsenal");
      return new Response("OK");
    }
    await send(env, chatId, `⏳ ${name} ရဲ့ ဒေတာတွေ ရှာနေပါတယ်...`);
    
    const { results: matches } = await env.DB.prepare(
      "SELECT * FROM matches WHERE LOWER(home) LIKE ? OR LOWER(away) LIKE ? ORDER BY timestamp DESC LIMIT 20"
    ).bind(`%${name.toLowerCase()}%`, `%${name.toLowerCase()}%`).all();
    
    if (!matches || matches.length === 0) {
      await send(env, chatId, `❌ "${name}" ဆိုတဲ့ အသင်းကို ရှာမတွေ့ပါဘူး။`);
      return new Response("OK");
    }
    
    const teamName = matches[0].home.toLowerCase().includes(name.toLowerCase()) ? matches[0].home : matches[0].away;
    
    let msgText = `👥 <b>${teamName}</b>\n\n`;
    const recent5 = matches.filter(m => m.ft_home !== null && m.ft_away !== null).slice(0, 5);
    msgText += `📈 နောက်ဆုံး ${recent5.length} ပွဲ\n`;
    recent5.forEach(m => {
      const isHome = m.home.toLowerCase().includes(teamName.toLowerCase());
      const gf = isHome ? m.ft_home : m.ft_away;
      const ga = isHome ? m.ft_away : m.ft_home;
      const res = gf > ga ? "✅ W" : (gf < ga ? "❌ L" : "➖ D");
      msgText += `• ${m.home} ${m.ft_home}-${m.ft_away} ${m.away} [${res}]\n`;
    });
    
    await send(env, chatId, msgText);
    return new Response("OK");
  }

  if (text === "/fixtures") {
    await send(env, chatId, "⏳ နောက်လာမယ့် ပွဲစဉ်တွေ ရှာနေပါတယ်...");
    try {
      const now = Date.now();
      const { results } = await env.DB.prepare(
        "SELECT * FROM matches WHERE timestamp >= ? AND status = 'NS' ORDER BY timestamp ASC LIMIT 30"
      ).bind(now).all();
      
      if (!results || results.length === 0) {
        await send(env, chatId, "📅 နောက်လာမယ့် ပွဲစဉ် မရှိပါဘူး။");
        return new Response("OK");
      }
      
      let msgText = "📅 <b>Upcoming Fixtures</b>\n\n";
      let currentLeague = "";
      
      for (const m of results) {
        if (m.league_name !== currentLeague) {
          msgText += `\n🏆 <b>${m.league_name}</b>\n`;
          currentLeague = m.league_name;
        }
        const dt = new Date(m.timestamp);
        const dateStr = dt.toLocaleDateString("en-GB", { timeZone: "Asia/Yangon", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        msgText += `• ${m.home} vs ${m.away} (${dateStr})\n`;
      }
      
      if (msgText.length > 4000) msgText = msgText.slice(0, 4000) + "\n...";
      await send(env, chatId, msgText);
    } catch (e) {
      await send(env, chatId, `⚠️ Error: ${e.message}`);
    }
    return new Response("OK");
  }

if (text === "/inferfetch") {
  await send(env, chatId, "⏳ InferSports ကနေ ဒေတာတွေ ဆွဲနေပါတယ်...");
  await syncInferOdds(env);
  await send(env, chatId, "✅ InferSports ဒေတာ ဆွဲပြီးပါပြီ။");
  return new Response("OK");
}

// 👇 ဒီနေရာမှာ ထည့်ပါ 👇
if (text === "/testinfer") {
  await send(env, chatId, "⏳ InferSports API ကို စမ်းသပ်နေပါတယ်...");
  const key = env.SaggiterX_Bot || env.INFER_KEY;
  if (!key) {
    await send(env, chatId, "❌ Infer Key မရှိပါ။");
    return new Response("OK");
  }

  try {
    const res = await fetch(
      `https://api.infersports.dev/v1/events?sport=football&league=lg_T9268DXK&status=scheduled&limit=3`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    
    if (!res.ok) {
       await send(env, chatId, `❌ HTTP Error: ${res.status}`);
       return new Response("OK");
    }

    const data = await res.json();
    const events = data.data || [];
    
    if (events.length === 0) {
      await send(env, chatId, "❌ InferSports မှာ ပွဲစဉ် မရှိပါ။");
      return new Response("OK");
    }

    let msgText = "🧪 <b>Test Infer API (EPL)</b>\n\n";
    for (const ev of events) {
      const dt = new Date(ev.scheduled_at);
      msgText += `🏟️ ${ev.home_team.name} vs ${ev.away_team.name}\n`;
      msgText += `🕒 ${dt.toISOString()}\n\n`;
    }
    
    await send(env, chatId, msgText);
  } catch (e) {
    await send(env, chatId, `⚠️ Error: ${e.message}`);
  }
  return new Response("OK");
}
// 👆 ဒီအထိပါ 👆

  if (msg.document) {
    const doc = msg.document;
    if (doc.file_name.toLowerCase().endsWith(".csv")) {
      await send(env, chatId, "⏳ CSV ဖတ်နေပါတယ်...");
      
      const fileRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${doc.file_id}`);
      const fileData = await fileRes.json();
      const fileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.result.file_path}`;
      
      const csvRes = await fetch(fileUrl);
      const csvText = await csvRes.text();
      
      const fileName = doc.file_name.replace(/\s*\(\d+\)/g, "").trim().toLowerCase();
      
      if (fileName === "fixtures.csv") {
        const lines = csvText.split("\n");
        const header = lines[0].split(",");
        const idx = {};
        header.forEach((h, i) => { if (idx[h.trim()] === undefined) idx[h.trim()] = i; });
        
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const c = line.split(",");
          const div = c[idx["Div"]] || "";
          const home = c[idx["HomeTeam"]] || "";
          const away = c[idx["AwayTeam"]] || "";
          if (!home || !away || !div) continue;
          
          const dateStr = c[idx["Date"]] || "";
          const timeStr = c[idx["Time"]] || "00:00";
          const dt = parseDate(dateStr);
          if (!dt) continue;
          
          try {
            const [h, m] = timeStr.split(":");
            dt.setHours(Number(h) || 0, Number(m) || 0);
          } catch(e) {}
          
          const ts = dt.getTime();
          
          rows.push({
            fixture_id: "FX-" + div + "-" + ts + "-" + home + "-" + away,
            date: fmtDate(dt),
            timestamp: ts,
            league_id: 0,
            league_name: div,
            country: "",
            tier: 0,
            season: "2627",
            round: "",
            status: "NS",
            home_id: 0,
            home: home,
            away_id: 0,
            away: away,
            ft_home: null, ft_away: null, ht_home: null, ht_away: null,
            ahh: toNum(c[idx["AHh"]]),
            b365ahh: null, b365aha: null, b365o25: null, b365u25: null
          });
        }
        
        if (rows.length === 0) {
          await send(env, chatId, "❌ Fixtures ဖိုင်ထဲမှာ ပွဲစဉ် မတွေ့ပါဘူး။");
          return new Response("OK");
        }
        
        const stmt = env.DB.prepare(`
          INSERT OR REPLACE INTO matches
          (fixture_id, date, timestamp, league_id, league_name, country, tier, season, round, status,
           home_id, home, away_id, away, ft_home, ft_away, ht_home, ht_away,
           ahh, b365ahh, b365aha, b365o25, b365u25, fetched_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);
        
        const batch = rows.map(r => stmt.bind(
          r.fixture_id, r.date, r.timestamp, r.league_id, r.league_name,
          r.country, r.tier, r.season, r.round, r.status,
          r.home_id, r.home, r.away_id, r.away,
          r.ft_home, r.ft_away, r.ht_home, r.ht_away,
          r.ahh, r.b365ahh, r.b365aha, r.b365o25, r.b365u25,
          new Date().toISOString()
        ));
        
        await env.DB.batch(batch);
        await send(env, chatId, `✅ Fixtures ထဲက လာမယ့်ပွဲစဉ် ${rows.length} ပွဲ ထည့်ပြီးပါပြီ။`);
        return new Response("OK");
      }
      
      const leagueCode = fileName.replace(".csv", "").toUpperCase();
      const LEAGUES = {
        "E0":  {id: 39,  name: "Premier League",       country: "England",     tier: 1},
        "E1":  {id: 40,  name: "Championship",         country: "England",     tier: 2},
        "E2":  {id: 41,  name: "League One",           country: "England",     tier: 3},
        "E3":  {id: 42,  name: "League Two",           country: "England",     tier: 4},
        "EC":  {id: 43,  name: "National League",      country: "England",     tier: 5},
        "SC0": {id: 179, name: "Scottish Premiership", country: "Scotland",    tier: 1},
        "SP1": {id: 140, name: "La Liga",              country: "Spain",       tier: 1},
        "SP2": {id: 141, name: "Segunda Division",     country: "Spain",       tier: 2},
        "I1":  {id: 135, name: "Serie A",              country: "Italy",       tier: 1},
        "I2":  {id: 136, name: "Serie B",              country: "Italy",       tier: 2},
        "D1":  {id: 78,  name: "Bundesliga",           country: "Germany",     tier: 1},
        "D2":  {id: 79,  name: "2. Bundesliga",        country: "Germany",     tier: 2},
        "F1":  {id: 61,  name: "Ligue 1",              country: "France",      tier: 1},
        "F2":  {id: 62,  name: "Ligue 2",              country: "France",      tier: 2},
        "N1":  {id: 88,  name: "Eredivisie",           country: "Netherlands", tier: 1},
        "B1":  {id: 144, name: "Jupiler Pro League",   country: "Belgium",     tier: 1},
        "P1":  {id: 94,  name: "Primeira Liga",        country: "Portugal",    tier: 1},
        "T1":  {id: 203, name: "Super Lig",            country: "Turkey",      tier: 1},
        "G1":  {id: 197, name: "Super League Greece",  country: "Greece",      tier: 1}
      };

      const info = LEAGUES[leagueCode];
      if (!info) {
        await send(env, chatId, "❌ ဒီဖိုင်နာမည်ကို မသိပါဘူး။ E0.csv, E1.csv စသဖြင့် ဖြစ်ရပါမယ်။");
        return new Response("OK");
      }
      
      const lines = csvText.split("\n");
      const header = lines[0].split(",");
      const idx = {};
      header.forEach((h, i) => { if (idx[h.trim()] === undefined) idx[h.trim()] = i; });
      
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const c = line.split(",");
        const home = c[idx["HomeTeam"]] || "";
        const away = c[idx["AwayTeam"]] || "";
        if (!home || !away) continue;
        
        const dateStr = c[idx["Date"]] || "";
        const dt = parseDate(dateStr);
        if (!dt) continue;
        
        const ts = dt.getTime();
        const hId = teamId(home, leagueCode);
        const aId = teamId(away, leagueCode);
        
        rows.push({
          fixture_id: "FD" + fmtDate(dt) + "-" + hId + "-" + aId,
          date: fmtDate(dt),
          timestamp: ts,
          league_id: info.id,
          league_name: info.name,
          country: info.country,
          tier: info.tier,
          season: "2627",
          round: "",
          status: "FT",
          home_id: hId,
          home: home,
          away_id: aId,
          away: away,
          ft_home: toNum(c[idx["FTHG"]]),
          ft_away: toNum(c[idx["FTAG"]]),
          ht_home: toNum(c[idx["HTHG"]]),
          ht_away: toNum(c[idx["HTAG"]]),
          ahh: toNum(c[idx["AHh"]]),
          b365ahh: toNum(c[idx["B365AHH"]]),
          b365aha: toNum(c[idx["B365AHA"]]),
          b365o25: toNum(c[idx["B365>2.5"]]),
          b365u25: toNum(c[idx["B365<2.5"]])
        });
      }
      
      if (rows.length === 0) {
        await send(env, chatId, "❌ ဖိုင်ထဲမှာ ပွဲစဉ် မတွေ့ပါဘူး။");
        return new Response("OK");
      }
      
      const stmt = env.DB.prepare(`
        INSERT OR REPLACE INTO matches
        (fixture_id, date, timestamp, league_id, league_name, country, tier, season, round, status,
         home_id, home, away_id, away, ft_home, ft_away, ht_home, ht_away,
         ahh, b365ahh, b365aha, b365o25, b365u25, fetched_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `);
      
      const batch = rows.map(r => stmt.bind(
        r.fixture_id, r.date, r.timestamp, r.league_id, r.league_name,
        r.country, r.tier, r.season, r.round, r.status,
        r.home_id, r.home, r.away_id, r.away,
        r.ft_home, r.ft_away, r.ht_home, r.ht_away,
        r.ahh, r.b365ahh, r.b365aha, r.b365o25, r.b365u25,
        new Date().toISOString()
      ));
      
      await env.DB.batch(batch);
      await send(env, chatId, `✅ ${info.name} ထဲက ပွဲစဉ် ${rows.length} ပွဲ ထည့်ပြီးပါပြီ။`);
      return new Response("OK");
    }
  }

  return new Response("OK");
}

async function onCallback(q, env) {
  const chatId = String(q.message.chat.id);
  if (chatId !== OWNER_ID) return new Response("OK");
  await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
  return new Response("OK");
}

async function importCsv(request, env) {
  const body = await request.json();
  const rows = body.rows || [];
  if (!rows.length) return new Response(JSON.stringify({ ok: true, inserted: 0 }), { headers: { "content-type": "application/json" } });

  const stmt = env.DB.prepare(`
    INSERT OR REPLACE INTO matches
    (fixture_id, date, timestamp, league_id, league_name, country, tier, season, round, status,
     home_id, home, away_id, away, ft_home, ft_away, ht_home, ht_away,
     ahh, b365ahh, b365aha, b365o25, b365u25, fetched_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const batch = rows.map(r => stmt.bind(
    r.fixture_id, r.date, r.timestamp, r.league_id, r.league_name,
    r.country || "", r.tier || 0, r.season, r.round || "", r.status || "FT",
    r.home_id, r.home, r.away_id, r.away,
    r.ft_home ?? null, r.ft_away ?? null,
    r.ht_home ?? null, r.ht_away ?? null,
    r.ahh ?? null, r.b365ahh ?? null, r.b365aha ?? null,
    r.b365o25 ?? null, r.b365u25 ?? null,
    r.fetched_at || new Date().toISOString()
  ));

  await env.DB.batch(batch);
  return new Response(JSON.stringify({ ok: true, inserted: rows.length }), { headers: { "content-type": "application/json" } });
}

// ============================================================
// INFER SPORTS MAPPING (Alias Matching: CSV <-> API)
// ============================================================
async function syncInferOdds(env) {
  try {
    const key = env.SaggiterX_Bot || env.INFER_KEY;
    if (!key) {
      console.log("No Infer Key");
      return;
    }

    const now = Date.now();
    const winStart = now - 3 * 24 * 3600 * 1000;
    const winEnd = now + 7 * 24 * 3600 * 1000;

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
      'lg_FA2KCTA5': 'Jupiler Pro League',
      'lg_HB26EKC0': 'Primeira Liga'
    };

    for (const [lgId, lgName] of Object.entries(INFER_LEAGUES)) {
      try {
        const res = await fetch(
          `https://api.infersports.dev/v1/events?sport=football&league=${lgId}&status=scheduled&limit=50`,
          { headers: { Authorization: `Bearer ${key}` } }
        );
        if (!res.ok) {
          console.log("Infer events error HTTP " + res.status + " for " + lgName);
          continue;
        }
        
        const data = await res.json();
        const events = data.data || [];

        for (const ev of events) {
          const ts = Date.parse(ev.scheduled_at);
          if (isNaN(ts) || ts < winStart || ts > winEnd) continue;

          const apiHome = ev.home_team?.name || "";
          const apiAway = ev.away_team?.name || "";
          if (!apiHome || !apiAway) continue;

          // 1. team_alias ထဲမှာ InferSports နာမည် (api_name) နဲ့ ရှာပြီး CSV နာမည် (csv_name) ကို ယူမယ်
          // (Table Column နာမည်တွေက api_name နဲ့ csv_name ဖြစ်တယ်လို့ ယူဆထားပါတယ်)
          const homeAlias = await env.DB.prepare("SELECT csv_name FROM team_alias WHERE LOWER(api_name) = ?").bind(apiHome.toLowerCase()).first();
          const awayAlias = await env.DB.prepare("SELECT csv_name FROM team_alias WHERE LOWER(api_name) = ?").bind(apiAway.toLowerCase()).first();
          
          // Alias မရှိရင် API နာမည်အတိုင်းပဲ သုံးမယ်
          const searchHome = homeAlias ? homeAlias.csv_name : apiHome;
          const searchAway = awayAlias ? awayAlias.csv_name : apiAway;

          // 2. Database (matches) ထဲမှာ ရှာမယ်
          const { results } = await env.DB.prepare(
            `SELECT fixture_id FROM matches 
             WHERE season = '2627' 
             AND (LOWER(home) LIKE ? OR LOWER(home) LIKE ?) 
             AND (LOWER(away) LIKE ? OR LOWER(away) LIKE ?)`
          ).bind(
            `%${searchHome.toLowerCase()}%`, `%${apiHome.toLowerCase().split(' ')[0]}%`,
            `%${searchAway.toLowerCase()}%`, `%${apiAway.toLowerCase().split(' ')[0]}%`
          ).all();

          if (results && results.length > 0) {
            const fixtureId = results[0].fixture_id;
            
            // Odds ဆွဲမယ်
            const oddsRes = await fetch("https://api.infersports.dev/v1/odds/batch", {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                event_ids: [ev.id],
                markets: "asian_handicap,totals",
                period: "full_time",
                format: "decimal"
              })
            });

            if (oddsRes.ok) {
              const oddsData = await oddsRes.json();
              const entry = oddsData.data?.[0];
              
              if (entry && entry.odds) {
                const rawOdds = entry.odds.odds || [];
                const oddsJson = JSON.stringify(rawOdds);
                
                let ahLine = null;
                let totalLine = null;

                for (const o of rawOdds) {
                  if (o.market_type === 'asian_handicap' && ahLine === null) ahLine = o.line;
                  if (o.market_type === 'totals' && totalLine === null) totalLine = o.line;
                }

                // Line ကွာခြားမှုရှိမှ သိမ်းမယ်
                const lastOdds = await env.DB.prepare(
                  "SELECT current_json FROM infer_odds WHERE event_id = ? ORDER BY fetched_at DESC LIMIT 1"
                ).bind(ev.id).first();

                if (!lastOdds || lastOdds.current_json !== oddsJson) {
                  await env.DB.prepare(`
                    INSERT INTO infer_odds
                    (event_id, league_id, league_name, home, away, scheduled_at, open_json, current_json, fetched_at)
                    VALUES (?,?,?,?,?,?,?,?,?)
                  `).bind(
                    ev.id, lgId, lgName, apiHome, apiAway, ev.scheduled_at,
                    oddsJson, oddsJson, new Date().toISOString()
                  ).run();
                }

                // matches table ကို update လုပ်မယ်
                if (ahLine !== null || totalLine !== null) {
                  await env.DB.prepare(
                    `UPDATE matches SET ahh = COALESCE(?, ahh), total_line = COALESCE(?, total_line) WHERE fixture_id = ?`
                  ).bind(ahLine, totalLine, fixtureId).run();
                }
              }
            }
          } else {
             // မကိုက်ညီတဲ့ ပွဲစဉ်တွေကို Log ထုတ်ပြမယ်
             console.log(`Unmatched: ${apiHome} vs ${apiAway}`);
          }
        }
      } catch (e) {
        console.error("Infer sync error for " + lgName + ":", e.message);
      }
    }
  } catch (e) {
    console.error("syncInferOdds error:", e.message);
  }
}
// ============================================================
// AUTO FETCH FIXTURES (Cron Job)
// ============================================================
async function fetchFixturesAuto(env) {
  try {
    console.log("Auto-fetching fixtures.csv...");
    const res = await fetch("https://www.football-data.co.uk/fixtures.csv");
    if (!res.ok) return;
    const csvText = await res.text();
    
    const lines = csvText.split("\n");
    if (lines.length < 2) return;
    
    const header = lines[0].split(",");
    const idx = {};
    header.forEach((h, i) => { if (idx[h.trim()] === undefined) idx[h.trim()] = i; });
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const c = line.split(",");
      const div = c[idx["Div"]] || "";
      const home = c[idx["HomeTeam"]] || "";
      const away = c[idx["AwayTeam"]] || "";
      if (!home || !away || !div) continue;
      
      const dateStr = c[idx["Date"]] || "";
      const timeStr = c[idx["Time"]] || "00:00";
      const dt = parseDate(dateStr);
      if (!dt) continue;
      
      try {
        const [h, m] = timeStr.split(":");
        dt.setHours(Number(h) || 0, Number(m) || 0);
      } catch(e) {}
      
      const ts = dt.getTime();
      
      rows.push({
        fixture_id: "FX-" + div + "-" + ts + "-" + home + "-" + away,
        date: fmtDate(dt),
        timestamp: ts,
        league_id: 0,
        league_name: div,
        country: "",
        tier: 0,
        season: "2627",
        round: "",
        status: "NS",
        home_id: 0,
        home: home,
        away_id: 0,
        away: away,
        ft_home: null, ft_away: null, ht_home: null, ht_away: null,
        ahh: toNum(c[idx["AHh"]]),
        b365ahh: null, b365aha: null, b365o25: null, b365u25: null
      });
    }
    
    if (rows.length === 0) return;
    
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO matches
      (fixture_id, date, timestamp, league_id, league_name, country, tier, season, round, status,
       home_id, home, away_id, away, ft_home, ft_away, ht_home, ht_away,
       ahh, b365ahh, b365aha, b365o25, b365u25, fetched_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    
    const batch = rows.map(r => stmt.bind(
      r.fixture_id, r.date, r.timestamp, r.league_id, r.league_name,
      r.country, r.tier, r.season, r.round, r.status,
      r.home_id, r.home, r.away_id, r.away,
      r.ft_home, r.ft_away, r.ht_home, r.ht_away,
      r.ahh, r.b365ahh, r.b365aha, r.b365o25, r.b365u25,
      new Date().toISOString()
    ));
    
    await env.DB.batch(batch);
    console.log(`Auto-fetched ${rows.length} fixtures.`);
  } catch (e) {
    console.error("fetchFixturesAuto error:", e.message);
  }
}

// ============================================================
// HELPERS
// ============================================================
async function tg(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function send(env, chatId, text) {
  return tg(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
}

function parseDate(s) {
  if (!s) return null;
  s = String(s).trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    if (y < 100) y += 2000;
    return new Date(y, mo - 1, d);
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  return null;
}

function fmtDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function teamId(name, code) {
  const str = code + ":" + name.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function toNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  let n = Number(v);
  return isNaN(n) ? null : n;
}
