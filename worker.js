export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    // DB Check
    if (url.pathname === "/test-db") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM raw_matches LIMIT 3").all();
        return new Response(JSON.stringify({ status: "success", sample_matches: results }, null, 2), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response("Database Error: " + err.message, { status: 500 });
      }
    }

    // ==========================================
    // SYNC ALL CSV (Batch Process)
    // ==========================================
    if (url.pathname === "/sync-all-csv") {
      try {
        const leagues = ['E0', 'E1', 'E2', 'E3', 'EC', 'SP1', 'SP2', 'I1', 'I2', 'D1', 'D2', 'F1', 'F2', 'N1', 'P1', 'B1', 'G1', 'SC0'];
        let summary = [];
        let totalInserted = 0;

        // တစ်ခါတည်း အကုန်မခေါ်ဘဲ ၄ လိဂ်စီ ခွဲခေါ်မယ် (API Limit မကျော်အောင်)
        for (let i = 0; i < leagues.length; i += 4) {
          const batch = leagues.slice(i, i + 4);
          
          await Promise.all(batch.map(async (leagueCode) => {
            try {
              const csvUrl = `https://www.football-data.co.uk/mmz4281/2627/${leagueCode}.csv`;
              const response = await fetch(csvUrl);
              if (!response.ok) return; // မရှိရင် ကျော်
              
              const csvText = await response.text();
              const lines = csvText.trim().split("\n");
              if (lines.length < 2) return;

              const headers = lines[0].split(",").map(h => h.trim());
              const getIndex = (name) => headers.indexOf(name);
              
              const idxDate = getIndex("Date");
              const idxHome = getIndex("HomeTeam");
              const idxAway = getIndex("AwayTeam");
              const idxFTHG = getIndex("FTHG");
              const idxFTAG = getIndex("FTAG");
              if (idxDate === -1 || idxHome === -1) return;

              let inserted = 0;
              for (let j = 1; j < lines.length; j++) {
                const row = lines[j].split(",");
                if (row.length < headers.length) continue;

                // Date ကို YYYY-MM-DD ပြောင်းမယ်
                const rawDate = row[idxDate];
                let formattedDate = rawDate;
                if (rawDate && rawDate.includes("/")) {
                  const parts = rawDate.split("/");
                  if (parts.length === 3) {
                    let year = parts[2];
                    if (year.length === 2) year = "20" + year;
                    formattedDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                }

                const home = row[idxHome];
                const away = row[idxAway];
                const fthg = row[idxFTHG] ? parseInt(row[idxFTHG]) : null;
                const ftag = row[idxFTAG] ? parseInt(row[idxFTAG]) : null;

                await env.DB.prepare(`
                  INSERT INTO raw_matches (league, match_date, home_team, away_team, home_goals, away_goals)
                  VALUES (?, ?, ?, ?, ?, ?)
                  ON CONFLICT(league, match_date, home_team, away_team) 
                  DO UPDATE SET home_goals = excluded.home_goals, away_goals = excluded.away_goals, updated_at = CURRENT_TIMESTAMP
                `).bind(leagueCode, formattedDate, home, away, fthg, ftag).run();
                inserted++;
              }
              summary.push({ league: leagueCode, rows: inserted });
              totalInserted += inserted;
            } catch (e) { 
              summary.push({ league: leagueCode, error: e.message }); 
            }
          }));
        }

        // Fixtures ကိုပါ တစ်ခါတည်း ဆွဲမယ်
        try {
          const fixturesUrl = "https://www.football-data.co.uk/fixtures.csv";
          const fixRes = await fetch(fixturesUrl);
          if (fixRes.ok) {
            const fixText = await fixRes.text();
            const fixLines = fixText.trim().split("\n");
            const fixHeaders = fixLines[0].split(",").map(h => h.trim());
            const fIdxDate = fixHeaders.indexOf("Date");
            const fIdxHome = fixHeaders.indexOf("HomeTeam");
            const fIdxAway = fixHeaders.indexOf("AwayTeam");
            const fIdxDiv = fixHeaders.indexOf("Div");
            
            let fixInserted = 0;
            for (let i = 1; i < fixLines.length; i++) {
              const row = fixLines[i].split(",");
              if (row.length < fixHeaders.length) continue;
              if (!leagues.includes(row[fIdxDiv])) continue;

              const rawDate = row[fIdxDate];
              let formattedDate = rawDate;
              if (rawDate && rawDate.includes("/")) {
                const parts = rawDate.split("/");
                if (parts.length === 3) {
                  let year = parts[2];
                  if (year.length === 2) year = "20" + year;
                  formattedDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }

              await env.DB.prepare(`
                INSERT INTO raw_matches (league, match_date, home_team, away_team)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(league, match_date, home_team, away_team) DO NOTHING
              `).bind(row[fIdxDiv], formattedDate, row[fIdxHome], row[fIdxAway]).run();
              fixInserted++;
            }
            summary.push({ league: "FIXTURES", rows: fixInserted });
          }
        } catch(e) {}

        return new Response(JSON.stringify({ 
          status: "success", 
          message: `Synced ${totalInserted} historical rows and fixtures.`,
          details: summary
        }, null, 2), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response("Sync Error: " + err.message, { status: 500 });
      }
    }

    // ==========================================
    // SYNC ODDS
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

    // ==========================================
    // DAILY SCAN (ယနေ့ 06:30 မှ မနက်ဖြန် 06:29 အထိ)
    // ==========================================
    if (url.pathname === "/daily-scan") {
      try {
        const now = new Date();
        const mmOffset = 6.5 * 60 * 60 * 1000; 
        const mmNow = new Date(now.getTime() + mmOffset);
        const mmStartOfDay = new Date(mmNow);
        mmStartOfDay.setUTCHours(0, 0, 0, 0);
        
        // ယနေ့ 06:30 (မြန်မာအချိန်)
        const startTimeMM = new Date(mmStartOfDay.getTime() + (6.5 * 60 * 60 * 1000));
        // မနက်ဖြန် 06:29 (မြန်မာအချိန်)
        const endTimeMM = new Date(startTimeMM.getTime() + (24 * 60 * 60 * 1000) - (60 * 1000)); 

        // Database ထဲက ရက်စွဲပုံစံ (YYYY-MM-DD)
        const fmt = (d) => {
          const day = String(d.getUTCDate()).padStart(2, '0');
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const year = d.getUTCFullYear();
          return `${year}-${month}-${day}`;
        };

        const dateToday = fmt(startTimeMM);
        const dateTomorrow = fmt(endTimeMM);

        // Database ထဲက ပွဲစဉ်တွေကို ဆွဲမယ်
        const { results: matches } = await env.DB.prepare(`
          SELECT DISTINCT id, league, match_date, home_team, away_team, total_line, ah_line
          FROM raw_matches 
          WHERE match_date IN (?, ?) AND home_goals IS NULL
          ORDER BY league, match_date
        `).bind(dateToday, dateTomorrow).all();

        let calculated = [];

        for (const match of matches) {
          // Overall Point တွက်မယ်
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

          // HA Point တွက်မယ်
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
          const overallPoints = (homeOverallGoals + awayOverallGoals) / 10;

          let homeHAPoints = homeHA.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
          let awayHAPoints = awayHA.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
          const haPoints = (homeHAPoints + awayHAPoints) / 10;

          // Y Match က Points နှစ်မျိုးလုံး 2.5 ထက် ကြီးမှ YES
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
