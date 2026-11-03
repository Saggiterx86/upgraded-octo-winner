// ============================================================
// SaggiterX Bot — Worker Core (Clean)
// CSV 2627 + D1 + 17 Leagues
// ============================================================

const OWNER_ID = "1821028384";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      // 1. CSV လက်ခံမယ့် Route
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
        return new Response(JSON.stringify({ matches: m.n }), { headers: { "content-type": "application/json" } });
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
  }
};

// ============================================================
// CSV IMPORT
// ============================================================
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
// MESSAGE HANDLER
// ============================================================
async function onMessage(msg, env) {
  const chatId = String(msg.chat.id);
  if (chatId !== OWNER_ID) return new Response("OK");
  const text = msg.text || "";

  if (text === "/start") {
    await send(env, chatId, "⚽ SaggiterX Bot\n\n/stats — Database စစ်ရန်");
    return new Response("OK");
  }

  if (text === "/stats") {
    const m = await env.DB.prepare("SELECT COUNT(*) n FROM matches").first();
    await send(env, chatId, `📊 လက်ရှိ Database ထဲမှာ ပွဲစဉ် ${m.n} ပွဲ ရှိပါတယ်။`);
    return new Response("OK");
  }

  return new Response("OK");
}

async function onCallback(q, env) {
  const chatId = String(q.message.chat.id);
  if (chatId !== OWNER_ID) return new Response("OK");
  await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
  return new Response("OK");
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
