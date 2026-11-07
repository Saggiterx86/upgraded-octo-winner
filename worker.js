export default {
  async scheduled(event, env, ctx) {
    const baseUrl = "https://proud-violet-6126.wayne-rooney-mdy86.workers.dev";
    ctx.waitUntil((async () => {
      try {
        await fetch(`${baseUrl}/daily-scan`);
      } catch (e) {
        console.error("Cron Job Error:", e);
      }
    })());
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    if (url.pathname === "/check-db") {
      try {
        const { results: count } = await env.DB.prepare(`SELECT COUNT(*) as total FROM raw_matches`).all();
        const { results: latest } = await env.DB.prepare(`SELECT * FROM raw_matches ORDER BY id DESC LIMIT 3`).all();
        return json({ total_rows: count[0].total, latest_data: latest });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/debug-data") {
      try {
        const team = url.searchParams.get("team") || "Mainz";
        const beforeDate = url.searchParams.get("date") || "2026-11-07";
        const league = url.searchParams.get("league") || null;
        const homeOverall = await lastN(env, "home_team", team, beforeDate, 5, league);
        const homeHA = await lastN(env, "home_team_home", team, beforeDate, 5, league);
        const overallSum = sumGoals(homeOverall);
        const haSum = sumGoals(homeHA);
        return json({
          team: team, league: league, before_date: beforeDate,
          overall_matches_found: homeOverall.length, overall_matches_data: homeOverall,
          overall_sum_goals: overallSum, overall_point_calculated: overallSum / 10,
          ha_matches_found: homeHA.length, ha_matches_data: homeHA,
          ha_sum_goals: haSum, ha_point_calculated: haSum / 10
        });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/sync-csv") {
      try {
        const single = url.searchParams.get("league");
        const leagues = single ? [single] : ['E0','E1','E2','E3','EC','SP1','SP2','I1','I2','D1','D2','F1','F2','N1','P1','B1','G1','SC0'];
        let totalRows = 0;
        for (const leagueCode of leagues) {
          try {
            const csvUrl = `https://www.football-data.co.uk/mmz4281/2627/${leagueCode}.csv`;
            const res = await fetch(csvUrl);
            if (res.ok) {
              const text = await res.text();
              const rows = parseCSV(text);
              if (rows.length > 1) {
                const headers = rows[0].map(h => h.trim());
                const ix = {
                  date: headers.indexOf("Date"), time: headers.indexOf("Time"),
                  home: headers.indexOf("HomeTeam"), away: headers.indexOf("AwayTeam"),
                  fthg: headers.indexOf("FTHG"), ftag: headers.indexOf("FTAG"),
                  hthg: headers.indexOf("HTHG"), htag: headers.indexOf("HTAG"),
                  b365h: headers.indexOf("B365H"), b365a: headers.indexOf("B365A"),
                };
                if (ix.date !== -1 && ix.home !== -1 && ix.away !== -1) {
                  for (let i = 1; i < rows.length; i += 50) {
                    const stmts = [];
                    for (let j = i; j < Math.min(i + 50, rows.length); j++) {
                      const r = rows[j];
                      if (!r || r.length < headers.length) continue;
                      const formattedDate = formatDate(r[ix.date]);
                      if (!formattedDate) continue;
                      const hg = ix.fthg !== -1 && r[ix.fthg] !== "" ? parseInt(r[ix.fthg]) : null;
                      const ag = ix.ftag !== -1 && r[ix.ftag] !== "" ? parseInt(r[ix.ftag]) : null;
                      const hthg = ix.hthg !== -1 && r[ix.hthg] !== "" ? parseInt(r[ix.hthg]) : null;
                      const htag = ix.htag !== -1 && r[ix.htag] !== "" ? parseInt(r[ix.htag]) : null;
                      const mTime = ix.time !== -1 && r[ix.time] ? r[ix.time] : null;
                      const bH = ix.b365h !== -1 && r[ix.b365h] ? parseFloat(r[ix.b365h]) : null;
                      const bA = ix.b365a !== -1 && r[ix.b365a] ? parseFloat(r[ix.b365a]) : null;

                      stmts.push(env.DB.prepare(`
                        INSERT INTO raw_matches (league, match_date, match_time, home_team, away_team, home_goals, away_goals, ht_home_goals, ht_away_goals, b365h, b365a)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(league, match_date, home_team, away_team)
                        DO UPDATE SET home_goals = excluded.home_goals, away_goals = excluded.away_goals,
                                      ht_home_goals = excluded.ht_home_goals, ht_away_goals = excluded.ht_away_goals,
                                      match_time = COALESCE(excluded.match_time, raw_matches.match_time),
                                      b365h = COALESCE(excluded.b365h, raw_matches.b365h), b365a = COALESCE(excluded.b365a, raw_matches.b365a),
                                      updated_at = CURRENT_TIMESTAMP
                      `).bind(leagueCode, formattedDate, mTime, r[ix.home], r[ix.away], hg, ag, hthg, htag, bH, bA));
                    }
                    if (stmts.length) { await env.DB.batch(stmts); totalRows += stmts.length; }
                  }
                }
              }
            }
          } catch (e) {}
        }
        return json({ status: "success", rows_processed: totalRows, leagues_synced: leagues.length });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/sync-fixtures") {
      try {
        const res = await fetch("https://www.football-data.co.uk/fixtures.csv");
        if (!res.ok) throw new Error("fixtures.csv fetch failed");
        const text = await res.text();
        const rows = parseCSV(text);
        if (rows.length < 2) return json({ status: "success", rows_processed: 0 });
        const headers = rows[0].map(h => h.trim());
        const ix = { div: headers.indexOf("Div"), date: headers.indexOf("Date"), time: headers.indexOf("Time"), home: headers.indexOf("HomeTeam"), away: headers.indexOf("AwayTeam") };
        const leagues = ['E0','E1','E2','E3','EC','SP1','SP2','I1','I2','D1','D2','F1','F2','N1','P1','B1','G1','SC0'];
        let totalRows = 0;
        for (let i = 1; i < rows.length; i += 50) {
          const stmts = [];
          for (let j = i; j < Math.min(i + 50, rows.length); j++) {
            const r = rows[j];
            if (!r || r.length < headers.length) continue;
            if (!leagues.includes(r[ix.div])) continue;
            const formattedDate = formatDate(r[ix.date]);
            if (!formattedDate) continue;
            stmts.push(env.DB.prepare(`
              INSERT INTO raw_matches (league, match_date, match_time, home_team, away_team)
              VALUES (?, ?, ?, ?, ?) ON CONFLICT(league, match_date, home_team, away_team) DO NOTHING
            `).bind(r[ix.div], formattedDate, (ix.time !== -1 && r[ix.time]) ? r[ix.time] : null, r[ix.home], r[ix.away]));
          }
          if (stmts.length) { await env.DB.batch(stmts); totalRows += stmts.length; }
        }
        return json({ status: "success", rows_processed: totalRows });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/find-match") {
      try {
        const home = url.searchParams.get("home");
        const away = url.searchParams.get("away");
        if (!home || !away) return json({ status: "error", message: "Missing params" }, 400);
        const { results: dbMatches } = await env.DB.prepare(`
          SELECT id FROM raw_matches WHERE home_goals IS NULL AND (home_team LIKE ? AND away_team LIKE ?) LIMIT 5
        `).bind(`%${home}%`, `%${away}%`).all();
        let foundId = null;
        for (const dbMatch of dbMatches) { foundId = dbMatch.id; break; }
        return json({ match_id: foundId });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/update-odds" && request.method === "POST") {
      try {
        const body = await request.json();
        const oddsData = body.odds;
        if (!oddsData || !Array.isArray(oddsData)) return json({ status: "error", message: "Invalid data format" }, 400);
        let updatedCount = 0;
        for (const item of oddsData) {
          try {
            await env.DB.prepare(`
              UPDATE raw_matches SET total_line = ?, ah_line = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(item.total_line, item.ah_line, item.match_id).run();
            updatedCount++;
          } catch (e) {}
        }
        return json({ status: "success", updated_count: updatedCount });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/calculate") {
      try {
        const now = new Date(); const mmOffsetMs = 6.5 * 60 * 60 * 1000; const mmNow = new Date(now.getTime() + mmOffsetMs);
        const mmStart = new Date(Date.UTC(mmNow.getUTCFullYear(), mmNow.getUTCMonth(), mmNow.getUTCDate()));
        const windowStart = new Date(mmStart.getTime() + mmOffsetMs); const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000 - 60 * 1000);
        const dateToday = toYMD(windowStart); const dateTomorrow = toYMD(windowEnd);

        const { results: matches } = await env.DB.prepare(`
          SELECT id, league, match_date, home_team, away_team, total_line, ah_line
          FROM raw_matches WHERE match_date IN (?, ?) AND home_goals IS NULL ORDER BY league, match_date
        `).bind(dateToday, dateTomorrow).all();

        let calculated = [];
        for (const match of matches) {
          const homeOverall = await lastN(env, "home_team", match.home_team, match.match_date, 5, match.league);
          const awayOverall = await lastN(env, "away_team", match.away_team, match.match_date, 5, match.league);
          const homeHA = await lastN(env, "home_team_home", match.home_team, match.match_date, 5, match.league);
          const awayHA = await lastN(env, "away_team_away", match.away_team, match.match_date, 5, match.league);

          let overallPoints = 0; let haPoints = 0;
          if (homeOverall.length === 5 && awayOverall.length === 5) overallPoints = (sumGoals(homeOverall) + sumGoals(awayOverall)) / 10;
          if (homeHA.length === 5 && awayHA.length === 5) haPoints = (sumGoals(homeHA) + sumGoals(awayHA)) / 10;

          const yMatch = (overallPoints > 2.5 && haPoints > 2.5) ? "YES" : "NO";
          const rulesHit = (overallPoints > 2.5 && haPoints > 2.5) ? "BOTH" : (overallPoints > 2.5 ? "OVERALL_ONLY" : (haPoints > 2.5 ? "HA_ONLY" : "NONE"));

         await env.DB.prepare(`
            INSERT INTO bot_analysis (match_id, y_match_status, overall_points, ha_points, rules_hit, day_theory_hit)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(match_id) DO UPDATE SET y_match_status = excluded.y_match_status, overall_points = excluded.overall_points, ha_points = excluded.ha_points, rules_hit = excluded.rules_hit, created_at = CURRENT_TIMESTAMP
          `).bind(match.id, yMatch, overallPoints, haPoints, rulesHit, null).run();

          calculated.push({
            match_id: match.id, league: match.league, match: `${match.home_team} vs ${match.away_team}`, date: match.match_date,
            y_match: yMatch, overall_point: Number(overallPoints.toFixed(2)), ha_point: Number(haPoints.toFixed(2)), total_line: match.total_line, ah_line: match.ah_line,
          });
        }
        return json({ status: "success", date_range: `${dateToday} → ${dateTomorrow}`, total_matches: calculated.length, yes_matches: calculated.filter(m => m.y_match === "YES").length, matches: calculated });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/send-telegram") {
      try {
        const token = "8925005543:AAHTLmna7_yU7L3sFPWaEei7-FpCyny-E0s";
        const chatId = "1821028384";
        const { results: matches } = await env.DB.prepare(`
          SELECT b.match_id, r.league, r.match_date, r.home_team, r.away_team, r.total_line, r.ah_line, b.y_match_status, b.overall_points, b.ha_points, b.rules_hit
          FROM bot_analysis b JOIN raw_matches r ON r.id = b.match_id WHERE b.y_match_status = 'YES' AND b.ha_points > 0 ORDER BY r.match_date, r.league LIMIT 20
        `).all();
        if (matches.length === 0) return json({ status: "success", message: "YES ပွဲစဉ် မရှိပါ။" });

        let msg = "🔥 <b>Football Y-Match Scanner</b> 🔥\n\n";
        for (const m of matches) {
          msg += `⚽ <b>${m.home_team} vs ${m.away_team}</b>\n🏆 လိဂ်: ${m.league} | 📅 ရက်: ${m.match_date}\n`;
          msg += `📊 Overall: <b>${Number(m.overall_points).toFixed(2)}</b> | HA: <b>${Number(m.ha_points).toFixed(2)}</b>\n`;
          if (m.total_line) msg += `🎯 Total Line: ${m.total_line}\n`; if (m.ah_line) msg += `📏 AH Line: ${m.ah_line}\n\n`;
        }
        const replyMarkup = { inline_keyboard: [[{ text: "📊 အားလုံးကြည့်ရန်", url: "https://proud-violet-6126.wayne-rooney-mdy86.workers.dev/calculate" }, { text: "🔄 ပြန်စစ်ရန်", url: "https://proud-violet-6126.wayne-rooney-mdy86.workers.dev/daily-scan" }]] };
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML", reply_markup: replyMarkup }) });
        if (!tgRes.ok) throw new Error("Telegram Error: " + await tgRes.text());
        return json({ status: "success", sent_matches: matches.length });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    if (url.pathname === "/daily-scan") {
      try {
        const base = url.origin; const leagues = ['E0','E1','E2','E3','EC','SP1','SP2','I1','I2','D1','D2','F1','F2','N1','P1','B1','G1','SC0'];
        let csvResult = 0;
        for (const lg of leagues) { try { const r = await fetch(`${base}/sync-csv?league=${lg}`); const j = await r.json(); csvResult += (j.rows_processed || 0); } catch (e) {} }
        let fixResult = 0; try { const r = await fetch(`${base}/sync-fixtures`); const j = await r.json(); fixResult = j.rows_processed || 0; } catch (e) {}
        let oddsResult = { matched: 0 }; try { const r = await fetch(`${base}/sync-odds`); oddsResult = await r.json(); } catch (e) {}
        let calcResult = { total_matches: 0, yes_matches: 0 }; try { const r = await fetch(`${base}/calculate`); calcResult = await r.json(); } catch (e) {}
        let tgResult = { sent_matches: 0 }; try { const r = await fetch(`${base}/send-telegram`); tgResult = await r.json(); } catch (e) {}
        return json({ status: "success", csv_rows: csvResult, fixture_rows: fixResult, odds_matched: oddsResult.matched || 0, calculated: calcResult.total_matches || 0, yes_matches: calcResult.yes_matches || 0, telegram_sent: tgResult.sent_matches || 0 });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    // ✅ Telegram Webhook (Menu စနစ်အတွက်)
    if (url.pathname === "/webhook" && request.method === "POST") {
      try {
        const update = await request.json();
        const token = "8925005543:AAHTLmna7_yU7L3sFPWaEei7-FpCyny-E0s";

        if (update.message && update.message.text === "/start") {
          const chatId = update.message.chat.id;
          await sendTelegram(token, chatId, "🤖 <b>Football Bot Menu</b>\n\nအောက်က Menu ကို ရွေးချယ်ပါ —", {
            inline_keyboard: [[{ text: "🏆 All Leagues", callback_data: "menu_all_leagues" }], [{ text: "🔥 Y-League (YES)", callback_data: "menu_y_league" }], [{ text: "📈 Streaks (Coming Soon)", callback_data: "menu_streaks" }]]
          });
          return new Response("OK", { status: 200 });
        }

        if (update.callback_query) {
          const chatId = update.callback_query.message.chat.id;
          const messageId = update.callback_query.message.message_id;
          const data = update.callback_query.data;

          if (data === "menu_main") {
            await editTelegram(token, chatId, messageId, "🤖 <b>Football Bot Menu</b>\n\nအောက်က Menu ကို ရွေးချယ်ပါ —", {
              inline_keyboard: [[{ text: "🏆 All Leagues", callback_data: "menu_all_leagues" }], [{ text: "🔥 Y-League (YES)", callback_data: "menu_y_league" }], [{ text: "📈 Streaks (Coming Soon)", callback_data: "menu_streaks" }]]
            });
          }

          if (data === "menu_all_leagues") {
            const leagues = ['E0','E1','E2','E3','EC','SP1','SP2','I1','I2','D1','D2','F1','F2','N1','P1','B1','G1','SC0'];
            const keyboard = [];
            for (let i = 0; i < leagues.length; i += 2) {
              const row = [{ text: leagues[i], callback_data: `league_${leagues[i]}` }];
              if (leagues[i + 1]) row.push({ text: leagues[i + 1], callback_data: `league_${leagues[i + 1]}` });
              keyboard.push(row);
            }
            keyboard.push([{ text: "⬅️ နောက်သို့", callback_data: "menu_main" }]);
            await editTelegram(token, chatId, messageId, "🏆 <b>လိဂ်တစ်ခု ရွေးချယ်ပါ —</b>", { inline_keyboard: keyboard });
          }

          if (data.startsWith("league_")) {
            const leagueCode = data.replace("league_", "");
            const now = new Date(); const mmOffsetMs = 6.5 * 60 * 60 * 1000; const mmNow = new Date(now.getTime() + mmOffsetMs);
            const mmStart = new Date(Date.UTC(mmNow.getUTCFullYear(), mmNow.getUTCMonth(), mmNow.getUTCDate()));
            const windowStart = new Date(mmStart.getTime() + mmOffsetMs); const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000 - 60 * 1000);
            const dateToday = toYMD(windowStart); const dateTomorrow = toYMD(windowEnd);

            const { results: matches } = await env.DB.prepare(`
              SELECT r.id, r.home_team, r.away_team, b.y_match_status FROM raw_matches r
              LEFT JOIN bot_analysis b ON r.id = b.match_id
              WHERE r.league = ? AND r.match_date IN (?, ?) AND r.home_goals IS NULL ORDER BY r.match_date
            `).bind(leagueCode, dateToday, dateTomorrow).all();

            if (matches.length === 0) {
              await editTelegram(token, chatId, messageId, `🏆 <b>${leagueCode}</b>\n\nဒီနေ့အတွက် ပွဲစဉ် မရှိပါ။`, { inline_keyboard: [[{ text: "⬅️ နောက်သို့", callback_data: "menu_all_leagues" }]] });
            } else {
              const keyboard = [];
              for (const m of matches) { const yIcon = m.y_match_status === "YES" ? "🔥 " : ""; keyboard.push([{ text: `${yIcon}${m.home_team} vs ${m.away_team}`, callback_data: `match_${m.id}` }]); }
              keyboard.push([{ text: "⬅️ နောက်သို့", callback_data: "menu_all_leagues" }]);
              await editTelegram(token, chatId, messageId, `🏆 <b>${leagueCode} - ပွဲစဉ်များ</b>\n\nကြည့်ချင်တဲ့ ပွဲစဉ်ကို ရွေးပါ —`, { inline_keyboard: keyboard });
            }
          }

          if (data.startsWith("match_")) {
            const matchId = data.replace("match_", "");
            const { results: matchData } = await env.DB.prepare(`
              SELECT id, home_team, away_team, match_date, match_time, league, total_line, ah_line, b.overall_points, b.ha_points, b.y_match_status
              FROM raw_matches r LEFT JOIN bot_analysis b ON r.id = b.match_id WHERE r.id = ?
            `).bind(matchId).all();

            if (matchData.length > 0) {
              const m = matchData[0];
              const hOverall = await lastN(env, "home_team", m.home_team, m.match_date, 1, m.league);
              const aOverall = await lastN(env, "away_team", m.away_team, m.match_date, 1, m.league);
              const hHA = await lastN(env, "home_team_home", m.home_team, m.match_date, 1, m.league);
              const aHA = await lastN(env, "away_team_away", m.away_team, m.match_date, 1, m.league);

              const formatResult = (arr) => { if (arr.length === 0) return "မရှိပါ"; const r = arr[0]; return `(HT ${r.ht_home_goals || 0}-${r.ht_away_goals || 0}) FT ${r.home_goals}-${r.away_goals}`; };
              const overall = m.overall_points ? Number(m.overall_points).toFixed(2) : "မရှိပါ";
              const ha = m.ha_points ? Number(m.ha_points).toFixed(2) : "မရှိပါ";
              const yStatus = m.y_match_status === "YES" ? "🔥 YES" : "NO";
              const totalLine = m.total_line || "မရှိပါ"; const ahLine = m.ah_line || "မရှိပါ"; const matchTime = m.match_time || "မရှိပါ";

              const msg = `⚽ <b>${m.home_team} vs ${m.away_team}</b>\n\n🏆 လိဂ်: ${m.league} | 📅 ရက်: ${m.match_date}\n⏰ အချိန်: <b>${matchTime}</b>\n\n📊 Overall: <b>${overall}</b>\n↳ အိမ်ရှင်: ${formatResult(hOverall)}\n↳ ဧည့်သည်: ${formatResult(aOverall)}\n\n📊 HA: <b>${ha}</b>\n↳ အိမ်ကွင်း: ${formatResult(hHA)}\n↳ အဝေးကွင်း: ${formatResult(aHA)}\n\n🎯 Total Line: ${totalLine}\n📏 AH Line: ${ahLine}\n🔥 Y-Match: <b>${yStatus}</b>`;
              await editTelegram(token, chatId, messageId, msg, { inline_keyboard: [[{ text: "⬅️ နောက်သို့", callback_data: `league_${m.league}` }]] });
            }
          }

          if (data === "menu_y_league") {
            const { results: yesMatches } = await env.DB.prepare(`
              SELECT r.id, r.home_team, r.away_team, r.league FROM bot_analysis b JOIN raw_matches r ON r.id = b.match_id WHERE b.y_match_status = 'YES' AND b.ha_points > 0 ORDER BY r.match_date LIMIT 20
            `).all();

            if (yesMatches.length === 0) {
              await editTelegram(token, chatId, messageId, "🔥 <b>Y-Match မရှိပါ။</b>", { inline_keyboard: [[{ text: "⬅️ နောက်သို့", callback_data: "menu_main" }]] });
            } else {
              const keyboard = [];
              for (const m of yesMatches) { keyboard.push([{ text: `🔥 ${m.home_team} vs ${m.away_team}`, callback_data: `match_${m.id}` }]); }
              keyboard.push([{ text: "⬅️ နောက်သို့", callback_data: "menu_main" }]);
              await editTelegram(token, chatId, messageId, "🔥 <b>Y-Match (YES) ပွဲစဉ်များ</b>\n\nကြည့်ချင်တဲ့ ပွဲစဉ်ကို ရွေးပါ —", { inline_keyboard: keyboard });
            }
          }

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: update.callback_query.id }) });
        }
        return new Response("OK", { status: 200 });
      } catch (err) { return json({ status: "error", message: err.message }, 500); }
    }

    return new Response("Not Found", { status: 404 });
  }
};

function json(obj, status = 200) { return new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json" } }); }
function parseCSV(text) { const rows = []; let cur = [], field = "", inQuotes = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (inQuotes) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') { inQuotes = false; } else { field += c; } } else { if (c === '"') inQuotes = true; else if (c === ',') { cur.push(field); field = ""; } else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ""; } else if (c !== '\r') { field += c; } } } if (field !== "" || cur.length) { cur.push(field); rows.push(cur); } return rows.filter(r => r.length && r.some(x => x !== "")); }
function formatDate(raw) { if (!raw) return null; raw = raw.trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; const parts = raw.split("/"); if (parts.length !== 3) return null; let [d, m, y] = parts; if (y.length === 2) y = "20" + y; return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; }
function toYMD(d) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; }
function sumGoals(rows) { return rows.reduce((s, r) => s + (r.home_goals || 0) + (r.away_goals || 0), 0); }

async function lastN(env, mode, team, beforeDate, n, league = null) {
  let sql, bind;
  const leagueClause = league ? " AND league = ?" : "";
  const leagueBind = league ? [league] : [];
  if (mode === "home_team" || mode === "away_team") {
    sql = `SELECT league, home_goals, away_goals, ht_home_goals, ht_away_goals FROM raw_matches WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL${leagueClause} ORDER BY match_date DESC LIMIT ?`;
    bind = [team, team, beforeDate, ...leagueBind, n];
  } else if (mode === "home_team_home") {
    sql = `SELECT league, home_goals, away_goals, ht_home_goals, ht_away_goals FROM raw_matches WHERE home_team = ? AND match_date < ? AND home_goals IS NOT NULL${leagueClause} ORDER BY match_date DESC LIMIT ?`;
    bind = [team, beforeDate, ...leagueBind, n];
  } else if (mode === "away_team_away") {
    sql = `SELECT league, home_goals, away_goals, ht_home_goals, ht_away_goals FROM raw_matches WHERE away_team = ? AND match_date < ? AND home_goals IS NOT NULL${leagueClause} ORDER BY match_date DESC LIMIT ?`;
    bind = [team, beforeDate, ...leagueBind, n];
  } else { return []; }
  const { results } = await env.DB.prepare(sql).bind(...bind).all();
  return results;
}

async function sendTelegram(token, chatId, text, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "HTML", reply_markup: replyMarkup }) });
}

async function editTelegram(token, chatId, messageId, text, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text, parse_mode: "HTML", reply_markup: replyMarkup }) });
                                  }
