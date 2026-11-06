export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Root Check
    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    // 2. DB Check
    if (url.pathname === "/test-db") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM raw_matches LIMIT 3").all();
        return new Response(JSON.stringify({ status: "success", sample_matches: results }, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response("Database Error: " + err.message, { status: 500 });
      }
    }

    // 3. Sync CSV (One League at a Time)
    if (url.pathname === "/sync-csv") {
      try {
        const leagueCode = url.searchParams.get("league") || "E0";
        let csvUrl = ["SWE", "DNK"].includes(leagueCode) 
          ? `https://www.football-data.co.uk/new/${leagueCode}.csv`
          : `https://www.football-data.co.uk/mmz4281/2627/${leagueCode}.csv`;
        
        const response = await fetch(csvUrl);
        if (!response.ok) return new Response(`League ${leagueCode} CSV not found.`, { status: 404 });
        
        const csvText = await response.text();
        const lines = csvText.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim());
        const getIndex = (name) => headers.indexOf(name);
        
        const idxDate = getIndex("Date");
        const idxHome = getIndex("HomeTeam");
        const idxAway = getIndex("AwayTeam");
        const idxFTHG = getIndex("FTHG");
        const idxFTAG = getIndex("FTAG");

        if (idxDate === -1 || idxHome === -1) return new Response(`Invalid CSV structure for ${leagueCode}`, { status: 400 });

        let insertedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",");
          if (row.length < headers.length) continue;

          const date = row[idxDate];
          const home = row[idxHome];
          const away = row[idxAway];
          const fthg = row[idxFTHG] ? parseInt(row[idxFTHG]) : null;
          const ftag = row[idxFTAG] ? parseInt(row[idxFTAG]) : null;

          await env.DB.prepare(`
            INSERT INTO raw_matches (league, match_date, home_team, away_team, home_goals, away_goals)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(league, match_date, home_team, away_team) 
            DO UPDATE SET 
              home_goals = excluded.home_goals,
              away_goals = excluded.away_goals,
              updated_at = CURRENT_TIMESTAMP
          `).bind(leagueCode, date, home, away, fthg, ftag).run();
          insertedCount++;
        }

        return new Response(JSON.stringify({ status: "success", league: leagueCode, rows_inserted: insertedCount }, null, 2), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response("Sync Error: " + err.message, { status: 500 });
      }
    }

    // 4. Sync Fixtures
    if (url.pathname === "/sync-fixtures") {
      try {
        const fixturesUrl = "https://www.football-data.co.uk/fixtures.csv";
        const response = await fetch(fixturesUrl);
        if (!response.ok) throw new Error("Fixtures CSV ဆွဲလို့မရပါ");

        const csvText = await response.text();
        const lines = csvText.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim());
        const idxDate = headers.indexOf("Date");
        const idxHome = headers.indexOf("HomeTeam");
        const idxAway = headers.indexOf("AwayTeam");
        const idxDiv = headers.indexOf("Div");

        const ourLeagues = ['E0', 'E1', 'E2', 'E3', 'EC', 'SP1', 'SP2', 'I1', 'I2', 'D1', 'D2', 'F1', 'F2', 'N1', 'P1', 'B1', 'G1', 'SC0', 'SWE', 'DNK'];
        let insertedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",");
          if (row.length < headers.length) continue;

          const div = row[idxDiv];
          if (!ourLeagues.includes(div)) continue;

          await env.DB.prepare(`
            INSERT INTO raw_matches (league, match_date, home_team, away_team)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(league, match_date, home_team, away_team) DO NOTHING
          `).bind(div, row[idxDate], row[idxHome], row[idxAway]).run();
          insertedCount++;
        }

        return new Response(JSON.stringify({ status: "success", message: `Fixtures synced: ${insertedCount} rows added.` }, null, 2), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response("Sync Error: " + err.message, { status: 500 });
      }
    }

    // 5. Sync InferSports Odds (Fuzzy Match V2)
    if (url.pathname === "/sync-odds") {
      try {
        if (!env.INFER_API_KEY) throw new Error("INFER_API_KEY မထည့်ရသေးပါ။");

        const manualMap = {
          "Man Utd": "Man United", "Nott'm Forest": "Nottm Forest", "Sheffield Weds": "Sheffield Wednesday",
          "West Brom": "West Bromwich Albion", "Spurs": "Tottenham", "Newcastle": "Newcastle United",
          "B.Munchen": "Bayern Munich", "W.Bremen": "Werder Bremen", "M'gladbach": "Borussia Monchengladbach",
          "Ein Frankfurt": "Eintracht Frankfurt", "Paris SG": "Paris Saint Germain", "Inter": "Inter Milan", "Milan": "AC Milan"
        };

        const apiUrl = "https://api.infersports.dev/v1/events?sport=football&status=scheduled&limit=100";
        const apiRes = await fetch(apiUrl, { headers: { "Authorization": `Bearer ${env.INFER_API_KEY}` } });
        if (!apiRes.ok) throw new Error(`API Error: ${apiRes.status}`);

        const apiData = await apiRes.json();
        const events = apiData.data || apiData.events || [];
        
        let matchedCount = 0;
        let matchedList = [];

        for (const event of events) {
          let apiHome = event.home_team?.name || "";
          let apiAway = event.away_team?.name || "";
          let mappedApiHome = manualMap[apiHome] || apiHome;
          let mappedApiAway = manualMap[apiAway] || apiAway;

          const { results: dbMatches } = await env.DB.prepare(`
            SELECT id, league, home_team, away_team FROM raw_matches
            WHERE home_team LIKE ? AND away_team LIKE ?
          `).bind(`%${mappedApiHome}%`, `%${mappedApiAway}%`).all();

          let foundMatch = null;
          for (const dbMatch of dbMatches) {
            const dbHome = dbMatch.home_team.toLowerCase();
            const dbAway = dbMatch.away_team.toLowerCase();
            const apiH = mappedApiHome.toLowerCase();
            const apiA = mappedApiAway.toLowerCase();

            if ((apiH.includes(dbHome) || dbHome.includes(apiH)) && (apiA.includes(dbAway) || dbAway.includes(apiA))) {
              foundMatch = dbMatch;
              break;
            }
          }

          if (!foundMatch) {
            const { results: looseMatches } = await env.DB.prepare(`
              SELECT id, league, home_team, away_team FROM raw_matches WHERE home_team LIKE ? OR away_team LIKE ?
            `).bind(`%${mappedApiHome.split(' ')[0]}%`, `%${mappedApiAway.split(' ')[0]}%`).all();

            for (const dbMatch of looseMatches) {
              if (dbMatch.home_team.toLowerCase().includes(mappedApiHome.split(' ')[0].toLowerCase()) && 
                  dbMatch.away_team.toLowerCase().includes(mappedApiAway.split(' ')[0].toLowerCase())) {
                 foundMatch = dbMatch;
                 break;
              }
            }
          }

          if (foundMatch) {
            const oddsUrl = `https://api.infersports.dev/v1/events/${event.id}/odds?markets=totals,asian_handicap`;
            const oddsRes = await fetch(oddsUrl, { headers: { "Authorization": `Bearer ${env.INFER_API_KEY}` } });

            let totalLine = null;
            let ahLine = null;

            if (oddsRes.ok) {
              const oddsData = await oddsRes.json();
              const markets = oddsData.markets || [];
              const totals = markets.find(m => m.name === "totals");
              const ah = markets.find(m => m.name === "asian_handicap");
              
              if (totals && totals.outcomes) {
                const over = totals.outcomes.find(o => o.name === "Over" || o.type === "over");
                if (over) totalLine = parseFloat(over.line || over.handicap);
              }
              if (ah && ah.outcomes) {
                const homeAh = ah.outcomes.find(o => o.name === "Home" || o.type === "home");
                if (homeAh) ahLine = parseFloat(homeAh.line || homeAh.handicap);
              }
            }

            await env.DB.prepare(`
              UPDATE raw_matches SET total_line = ?, ah_line = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(totalLine, ahLine, foundMatch.id).run();

            matchedCount++;
            matchedList.push({ league: foundMatch.league, csv_match: `${foundMatch.home_team} vs ${foundMatch.away_team}`, total_line: totalLine, ah_line: ahLine });
          }
        }

        return new Response(JSON.stringify({ status: "success", message: `Matched ${matchedCount} events.`, matched_data: matchedList }, null, 2), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ status: "error", message: err.message }, null, 2), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // 6. Daily Scan (ယနေ့ 06:30 မှ မနက်ဖြန် 06:29 အထိ)
    if (url.pathname === "/daily-scan") {
      try {
        const now = new Date();
        const mmOffset = 6.5 * 60 * 60 * 1000; 
        const mmNow = new Date(now.getTime() + mmOffset);

        const todayStart = new Date(mmNow);
        todayStart.setUTCHours(0, 0, 0, 0); 
        const startTimeMM = new Date(todayStart.getTime() + (6.5 * 60 * 60 * 1000)); 
        const endTimeMM = new Date(startTimeMM.getTime() + (24 * 60 * 60 * 1000) - (60 * 1000)); 

        const fmt = (d) => {
          const day = String(d.getUTCDate()).padStart(2, '0');
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const year = d.getUTCFullYear();
          return `${day}/${month}/${year}`;
        };

        const dateToday = fmt(startTimeMM);
        const dateTomorrow = fmt(endTimeMM);

        const { results: matches } = await env.DB.prepare(`
          SELECT * FROM raw_matches 
          WHERE match_date IN (?, ?) AND home_goals IS NULL
          ORDER BY league, match_date
        `).bind(dateToday, dateTomorrow).all();

        let calculated = [];

        for (const match of matches) {
          const { results: homeOverall } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.home_team, match.home_team, match.match_date).all();

          const { results: awayOverall } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.away_team, match.away_team, match.match_date).all();

          const { results: homeHA } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE home_team = ? AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.home_team, match.match_date).all();

          const { results: awayHA } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE away_team = ? AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.away_team, match.match_date).all();

          let homeOverallGoals = homeOverall.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
          let awayOverallGoals = awayOverall.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);

          // Overall Point တွက်မယ် (၁၀ ပွဲစာ ဂိုးပေါင်း / 10)
let homeOverallGoals = homeOverall.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
let awayOverallGoals = awayOverall.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
const overallPoints = (homeOverallGoals + awayOverallGoals) / 10;

// HA Point တွက်မယ် (အိမ်ကွင်း ၅ ပွဲ + အဝေးကွင်း ၅ ပွဲ ဂိုးပေါင်း / 10)
let homeHAPoints = homeHA.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
let awayHAPoints = awayHA.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
const haPoints = (homeHAPoints + awayHAPoints) / 10;

// Y Match က Points နှစ်မျိုးလုံး 2.5 ထက် ကြီးမှ YES ပေးမယ်
const yMatchStatus = (overallPoints > 2.5 && haPoints > 2.5) ? "YES" : "NO";

calculated.push({
  league: match.league,
  match: `${match.home_team} vs ${match.away_team}`,
  date: match.match_date,
  total_line: match.total_line,
  ah_line: match.ah_line,
  y_match: yMatchStatus,
  overall_point: overallPoints.toFixed(2),
  ha_point: haPoints.toFixed(2)
});
        }

        return new Response(JSON.stringify({ 
          status: "success", 
          date_range: `${dateToday} to ${dateTomorrow}`,
          total_matches_found: calculated.length,
          matches: calculated
        }, null, 2), { headers: { "Content-Type": "application/json" } });

      } catch (err) {
        return new Response(JSON.stringify({ status: "error", message: err.message }, null, 2), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
