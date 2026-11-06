export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    // ==========================================
    // CHECK DB
    // ==========================================
    if (url.pathname === "/check-db") {
      try {
        const { results: count } = await env.DB.prepare(`SELECT COUNT(*) as total FROM raw_matches`).all();
        const { results: latest } = await env.DB.prepare(`SELECT * FROM raw_matches ORDER BY id DESC LIMIT 3`).all();
        return json({ total_rows: count[0].total, latest_data: latest });
      } catch (err) {
        return json({ status: "error", message: err.message }, 500);
      }
    }

    // ==========================================
    // STEP 1: SYNC CSV (လိဂ်တစ်ခုချင်း)
    // ==========================================
    if (url.pathname === "/sync-csv") {
      try {
        const single = url.searchParams.get("league");
        const leagues = single
          ? [single]
          : ['E0','E1','E2','E3','EC','SP1','SP2','I1','I2','D1','D2','F1','F2','N1','P1','B1','G1','SC0'];

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
                  date: headers.indexOf("Date"),
                  home: headers.indexOf("HomeTeam"),
                  away: headers.indexOf("AwayTeam"),
                  fthg: headers.indexOf("FTHG"),
                  ftag: headers.indexOf("FTAG"),
                  b365h: headers.indexOf("B365H"),
                  b365a: headers.indexOf("B365A"),
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
                      const bH = ix.b365h !== -1 && r[ix.b365h] ? parseFloat(r[ix.b365h]) : null;
                      const bA = ix.b365a !== -1 && r[ix.b365a] ? parseFloat(r[ix.b365a]) : null;

                      stmts.push(env.DB.prepare(`
                        INSERT INTO raw_matches (league, match_date, home_team, away_team, home_goals, away_goals, b365h, b365a)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(league, match_date, home_team, away_team)
                        DO UPDATE SET home_goals = excluded.home_goals,
                                      away_goals = excluded.away_goals,
                                      b365h = COALESCE(excluded.b365h, raw_matches.b365h),
                                      b365a = COALESCE(excluded.b365a, raw_matches.b365a),
                                      updated_at = CURRENT_TIMESTAMP
                      `).bind(leagueCode, formattedDate, r[ix.home], r[ix.away], hg, ag, bH, bA));
                    }
                    if (stmts.length) {
                      await env.DB.batch(stmts);
                      totalRows += stmts.length;
                    }
                  }
                }
              }
            }
          } catch (e) {}
        }
        return json({ status: "success", rows_processed: totalRows, leagues_synced: leagues.length });
      } catch (err) {
        return json({ status: "error", message: err.message }, 500);
      }
    }

    // ==========================================
    // STEP 2: SYNC FIXTURES (အနာဂတ်ပွဲစဉ်)
    // ==========================================
    if (url.pathname === "/sync-fixtures") {
      try {
        const res = await fetch("https://www.football-data.co.uk/fixtures.csv");
        if (!res.ok) throw new Error("fixtures.csv fetch failed");
        const text = await res.text();
        const rows = parseCSV(text);
        if (rows.length < 2) return json({ status: "success", rows_processed: 0 });

        const headers = rows[0].map(h => h.trim());
        const ix = {
          div: headers.indexOf("Div"),
          date: headers.indexOf("Date"),
          home: headers.indexOf("HomeTeam"),
          away: headers.indexOf("AwayTeam"),
        };
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
              INSERT INTO raw_matches (league, match_date, home_team, away_team)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(league, match_date, home_team, away_team) DO NOTHING
            `).bind(r[ix.div], formattedDate, r[ix.home], r[ix.away]));
          }
          if (stmts.length) {
            await env.DB.batch(stmts);
            totalRows += stmts.length;
          }
        }
        return json({ status: "success", rows_processed: totalRows });
      } catch (err) {
        return json({ status: "error", message: err.message }, 500);
      }
    }

    // ==========================================
    // STEP 3: SYNC ODDS (API)
    // ==========================================
    if (url.pathname === "/sync-odds") {
      try {
        if (!env.INFER_API_KEY) throw new Error("INFER_API_KEY မထည့်ရသေးပါ။");
        const manualMap = {
          "Man Utd": "Man United", "Nott'm Forest": "Nottm Forest", "Sheffield Weds": "Sheffield Wednesday",
          "West Brom": "West Bromwich Albion", "Spurs": "Tottenham", "Newcastle": "Newcastle United",
          "B.Munchen": "Bayern Munich", "W.Bremen": "Werder Bremen", "M'gladbach": "Borussia Monchengladbach",
          "Ein Frankfurt": "Eintracht Frankfurt", "Paris SG": "Paris Saint Germain", "Inter": "Inter Milan", "Milan": "AC Milan"
        };

        const apiRes = await fetch("https://api.infersports.dev/v1/events?sport=football&status=scheduled&limit=100", {
          headers: { "Authorization": `Bearer ${env.INFER_API_KEY}` }
        });
        if (!apiRes.ok) throw new Error(`API Error: ${apiRes.status}`);
        const apiData = await apiRes.json();
        const events = apiData.data || apiData.events || [];

        let matchedCount = 0;
        for (const event of events) {
          try {
            const mappedApiHome = manualMap[event.home_team?.name] || event.home_team?.name || "";
            const mappedApiAway = manualMap[event.away_team?.name] || event.away_team?.name || "";
            if (!mappedApiHome || !mappedApiAway) continue;

            const { results: dbMatches } = await env.DB.prepare(`
              SELECT id, home_team, away_team FROM raw_matches
              WHERE home_goals IS NULL AND (home_team LIKE ? AND away_team LIKE ?)
              LIMIT 5
            `).bind(`%${mappedApiHome}%`, `%${mappedApiAway}%`).all();

            let foundMatch = null;
            for (const dbMatch of dbMatches) {
              const dbH = dbMatch.home_team.toLowerCase();
              const dbA = dbMatch.away_team.toLowerCase();
              const apiH = mappedApiHome.toLowerCase();
              const apiA = mappedApiAway.toLowerCase();
              if ((apiH.includes(dbH) || dbH.includes(apiH)) && (apiA.includes(dbA) || dbA.includes(apiA))) {
                foundMatch = dbMatch;
                break;
              }
            }
            if (!foundMatch) continue;

            const oddsRes = await fetch(
              `https://api.infersports.dev/v1/events/${event.id}/odds?markets=totals,asian_handicap`,
              { headers: { "Authorization": `Bearer ${env.INFER_API_KEY}` } }
            );
            let totalLine = null, ahLine = null;
            if (oddsRes.ok) {
              const oddsData = await oddsRes.json();
              const markets = oddsData.markets || [];
              const totals = markets.find(m => m.name === "totals");
              const ah = markets.find(m => m.name === "asian_handicap");
              if (totals?.outcomes) {
                const over = totals.outcomes.find(o => o.name === "Over" || o.type === "over");
                if (over) totalLine = parseFloat(over.line || over.handicap);
              }
              if (ah?.outcomes) {
                const homeAh = ah.outcomes.find(o => o.name === "Home" || o.type === "home");
                if (homeAh) ahLine = parseFloat(homeAh.line || homeAh.handicap);
              }
            }
            await env.DB.prepare(`
              UPDATE raw_matches SET total_line = ?, ah_line = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(totalLine, ahLine, foundMatch.id).run();
            matchedCount++;
          } catch (e) {}
        }
        return json({ status: "success", events_checked: events.length, matched: matchedCount });
      } catch (err) {
        return json({ status: "error", message: err.message }, 500);
      }
    }

    // ==========================================
    // STEP 4: CALCULATE (Y Match တွက်ချက်)
    // ==========================================
    if (url.pathname === "/calculate") {
      try {
        const now = new Date();
        const mmOffsetMs = 6.5 * 60 * 60 * 1000;
        const mmNow = new Date(now.getTime() + mmOffsetMs);
        const mmStart = new Date(Date.UTC(mmNow.getUTCFullYear(), mmNow.getUTCMonth(), mmNow.getUTCDate()));
        const windowStart = new Date(mmStart.getTime() + mmOffsetMs);
        const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000 - 60 * 1000);

        const dateToday = toYMD(windowStart);
        const dateTomorrow = toYMD(windowEnd);

        const { results: matches } = await env.DB.prepare(`
          SELECT id, league, match_date, home_team, away_team, total_line, ah_line
          FROM raw_matches
          WHERE match_date IN (?, ?) AND home_goals IS NULL
          ORDER BY league, match_date
        `).bind(dateToday, dateTomorrow).all();

        let calculated = [];
for (const match of matches) {
  // 1. Overall (အိမ်ကွင်း ၅ ပွဲ + အဝေးကွင်း ၅ ပွဲ = စုစုပေါင်း ၁၀ ပွဲ ရှိမရှိ စစ်မယ်)
  const homeOverall = await lastN(env, "home_team", match.home_team, match.match_date, 5);
  const awayOverall = await lastN(env, "away_team", match.away_team, match.match_date, 5);
  
  // 2. HA (အိမ်ကွင်း ၅ ပွဲ + အဝေးကွင်း ၅ ပွဲ)
  const homeHA = await lastN(env, "home_team_home", match.home_team, match.match_date, 5);
  const awayHA = await lastN(env, "away_team_away", match.away_team, match.match_date, 5);

  let overallPoints = 0;
  let haPoints = 0;

  // ပွဲအရေအတွက် ၁၀ ပွဲ ပြည့်မှသာ တွက်မယ် (မပြည့်ရင် 0 ပေးမယ်)
  
  if (homeOverall.length === 5 && awayOverall.length === 5) {
  overallPoints = (sumGoals(homeOverall) + sumGoals(awayOverall)) / 10;
  }
  if (homeHA.length === 5 && awayHA.length === 5) {
  haPoints = (sumGoals(homeHA) + sumGoals(awayHA)) / 10;
  }

  const yMatch = (overallPoints > 2.5 && haPoints > 2.5) ? "YES" : "NO";
  const rulesHit = (overallPoints > 2.5 && haPoints > 2.5) ? "BOTH" : (overallPoints > 2.5 ? "OVERALL_ONLY" : (haPoints > 2.5 ? "HA_ONLY" : "NONE"));

          await env.DB.prepare(`
            INSERT INTO bot_analysis (match_id, y_match_status, ha_points, rules_hit, day_theory_hit)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(match_id) DO UPDATE SET
              y_match_status = excluded.y_match_status,
              ha_points = excluded.ha_points,
              rules_hit = excluded.rules_hit,
              day_theory_hit = excluded.day_theory_hit,
              created_at = CURRENT_TIMESTAMP
          `).bind(match.id, yMatch, haPoints, rulesHit, null).run();

          calculated.push({
            match_id: match.id,
            league: match.league,
            match: `${match.home_team} vs ${match.away_team}`,
            date: match.match_date,
            y_match: yMatch,
            overall_point: Number(overallPoints.toFixed(2)),
            ha_point: Number(haPoints.toFixed(2)),
            total_line: match.total_line,
            ah_line: match.ah_line,
          });
        }

        return json({
          status: "success",
          date_range: `${dateToday} → ${dateTomorrow}`,
          total_matches: calculated.length,
          yes_matches: calculated.filter(m => m.y_match === "YES").length,
          matches: calculated
        });
      } catch (err) {
        return json({ status: "error", message: err.message }, 500);
      }
    }

    // ==========================================
    // NEW: SEND TELEGRAM
    // ==========================================
    if (url.pathname === "/send-telegram") {
      try {
        const token = "8925005543:AAHTLmna7_yU7L3sFPWaEei7-FpCyny-E0s";
        const chatId = "1821028384";

        const { results: matches } = await env.DB.prepare(`
          SELECT b.match_id, r.league, r.match_date, r.home_team, r.away_team,
                 r.total_line, r.ah_line, b.y_match_status, b.ha_points, b.rules_hit
          FROM bot_analysis b
          JOIN raw_matches r ON r.id = b.match_id
          WHERE b.y_match_status = 'YES'
          ORDER BY r.match_date, r.league
          LIMIT 20
        `).all();

        if (matches.length === 0) {
          return json({ status: "success", message: "YES ပွဲစဉ် မရှိပါ။" });
        }

        let msg = "🔥 <b>Football Y-Match Scanner</b> 🔥\n\n";
        for (const m of matches) {
  // Overall ကို DB ကနေ ပြန်တွက်မယ်
  const ho = await lastN(env, "home_team", m.home_team, m.match_date, 5);
  const ao = await lastN(env, "away_team", m.away_team, m.match_date, 5);
  const ov = (sumGoals(ho) + sumGoals(ao)) / 10;

  msg += `⚽ <b>${m.home_team} vs ${m.away_team}</b>\n`;
  msg += `🏆 လိဂ်: ${m.league} | 📅 ရက်: ${m.match_date}\n`;
  msg += `📊 Overall: ${ov.toFixed(2)} | HA: ${m.ha_points.toFixed(2)}\n`;
          if (m.total_line) msg += `🎯 Total Line: ${m.total_line}\n`;
          if (m.ah_line) msg += `📏 AH Line: ${m.ah_line}\n`;
          msg += `\n`;
        }

        const replyMarkup = {
          inline_keyboard: [
            [{ text: "📊 အားလုံးကြည့်ရန်", url: "https://proud-violet-6126.wayne-rooney-mdy86.workers.dev/calculate" }],
            [{ text: "🔄 ပြန်စစ်ရန်", url: "https://proud-violet-6126.wayne-rooney-mdy86.workers.dev/daily-scan" }]
          ]
        };

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "HTML",
            reply_markup: replyMarkup
          })
        });

        if (!tgRes.ok) {
          const err = await tgRes.text();
          throw new Error("Telegram Error: " + err);
        }

        return json({ status: "success", sent_matches: matches.length });
      } catch (err) {
        return json({ status: "error", message: err.message }, 500);
      }
    }

    // ==========================================
    // MASTER /daily-scan
    // ==========================================
    if (url.pathname === "/daily-scan") {
      try {
        const base = url.origin;
        const leagues = ['E0','E1','E2','E3','EC','SP1','SP2','I1','I2','D1','D2','F1','F2','N1','P1','B1','G1','SC0'];
        let csvResult = 0;

        for (const lg of leagues) {
          try {
            const r = await fetch(`${base}/sync-csv?league=${lg}`);
            const j = await r.json();
            csvResult += (j.rows_processed || 0);
          } catch (e) {}
        }

        let fixResult = 0;
        try {
          const r = await fetch(`${base}/sync-fixtures`);
          const j = await r.json();
          fixResult = j.rows_processed || 0;
        } catch (e) {}

        let oddsResult = { matched: 0 };
        try {
          const r = await fetch(`${base}/sync-odds`);
          oddsResult = await r.json();
        } catch (e) {}

        let calcResult = { total_matches: 0, yes_matches: 0 };
        try {
          const r = await fetch(`${base}/calculate`);
          calcResult = await r.json();
        } catch (e) {}

        return json({
          status: "success",
          csv_rows: csvResult,
          fixture_rows: fixResult,
          odds_matched: oddsResult.matched || 0,
          calculated: calcResult.total_matches || 0,
          yes_matches: calcResult.yes_matches || 0,
        });
      } catch (err) {
        return json({ status: "error", message: err.message }, 500);
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

// ==========================================
// HELPERS
// ==========================================
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function parseCSV(text) {
  const rows = [];
  let cur = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(field); field = ""; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === '\r') {}
      else { field += c; }
    }
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.length && r.some(x => x !== ""));
}

function formatDate(raw) {
  if (!raw) return null;
  raw = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split("/");
  if (parts.length !== 3) return null;
  let [d, m, y] = parts;
  if (y.length === 2) y = "20" + y;
  d = d.padStart(2, "0");
  m = m.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toYMD(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sumGoals(rows) {
  return rows.reduce((s, r) => s + (r.home_goals || 0) + (r.away_goals || 0), 0);
}

async function lastN(env, mode, team, beforeDate, n) {
  let sql, bind;
  if (mode === "home_team" || mode === "away_team") {
    sql = `SELECT home_goals, away_goals FROM raw_matches
           WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL
           ORDER BY match_date DESC LIMIT ?`;
    bind = [team, team, beforeDate, n];
  } else if (mode === "home_team_home") {
    sql = `SELECT home_goals, away_goals FROM raw_matches
           WHERE home_team = ? AND match_date < ? AND home_goals IS NOT NULL
           ORDER BY match_date DESC LIMIT ?`;
    bind = [team, beforeDate, n];
  } else if (mode === "away_team_away") {
    sql = `SELECT home_goals, away_goals FROM raw_matches
           WHERE away_team = ? AND match_date < ? AND home_goals IS NOT NULL
           ORDER BY match_date DESC LIMIT ?`;
    bind = [team, beforeDate, n];
  } else {
    return [];
  }
  const { results } = await env.DB.prepare(sql).bind(...bind).all();
  return results;
          }
