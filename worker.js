export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Root Check
    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    // 2. Database Check (Sample Data)
if (url.pathname === "/test-db") {
  try {
    const { results: matches } = await env.DB.prepare("SELECT * FROM raw_matches LIMIT 3").all();
    return new Response(JSON.stringify({ 
      status: "success", 
      sample_matches: matches 
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response("Database Error: " + err.message, { status: 500 });
  }
}

    // 3. CSV Sync
    if (url.pathname === "/sync-csv") {
      try {
        const leagues = ["E0", "E1", "D1", "F1", "SP1", "I1", "SWE", "DNK"];
        let summary = [];

        for (const leagueCode of leagues) {
          let csvUrl = "";
          if (["SWE", "DNK"].includes(leagueCode)) {
            csvUrl = `https://www.football-data.co.uk/new/${leagueCode}.csv`;
          } else {
            csvUrl = `https://www.football-data.co.uk/mmz4281/2627/${leagueCode}.csv`;
          }
          
          const response = await fetch(csvUrl);
          if (!response.ok) {
            summary.push({ league: leagueCode, status: "not found", rows: 0 });
            continue; 
          }
          
          const csvText = await response.text();
          const lines = csvText.trim().split("\n");
          const headers = lines[0].split(",").map(h => h.trim());
          const getIndex = (name) => headers.indexOf(name);
          
          const idxDate = getIndex("Date");
          const idxHome = getIndex("HomeTeam");
          const idxAway = getIndex("AwayTeam");
          const idxFTHG = getIndex("FTHG");
          const idxFTAG = getIndex("FTAG");
          const idxB365H = getIndex("B365H");
          const idxB365A = getIndex("B365A");
          const idxB365CH = getIndex("B365CH");
          const idxB365CA = getIndex("B365CA");

          if (idxDate === -1 || idxHome === -1) continue;

          let insertedCount = 0;

          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(",");
            if (row.length < headers.length) continue;

            const date = row[idxDate];
            const home = row[idxHome];
            const away = row[idxAway];
            
            const fthg = row[idxFTHG] ? parseInt(row[idxFTHG]) : null;
            const ftag = row[idxFTAG] ? parseInt(row[idxFTAG]) : null;
            const b365h = row[idxB365H] ? parseFloat(row[idxB365H]) : null;
            const b365a = row[idxB365A] ? parseFloat(row[idxB365A]) : null;
            const b365ch = row[idxB365CH] ? parseFloat(row[idxB365CH]) : null;
            const b365ca = row[idxB365CA] ? parseFloat(row[idxB365CA]) : null;

            await env.DB.prepare(`
              INSERT INTO raw_matches (league, match_date, home_team, away_team, home_goals, away_goals, b365h, b365a, b365ch, b365ca)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(league, match_date, home_team, away_team) 
              DO UPDATE SET 
                home_goals = excluded.home_goals,
                away_goals = excluded.away_goals,
                b365h = excluded.b365h,
                b365a = excluded.b365a,
                b365ch = excluded.b365ch,
                b365ca = excluded.b365ca,
                updated_at = CURRENT_TIMESTAMP
            `).bind(leagueCode, date, home, away, fthg, ftag, b365h, b365a, b365ch, b365ca).run();
            
            insertedCount++;
          }
          summary.push({ league: leagueCode, status: "success", rows: insertedCount });
        }

        return new Response(JSON.stringify({ status: "success", message: "All leagues synced!", details: summary }, null, 2), { 
          headers: { "Content-Type": "application/json" } 
        });

      } catch (err) {
        return new Response("Sync Error: " + err.message, { status: 500 });
      }
    }

    // 4. Calculate Y Match & HA Points
    if (url.pathname === "/calc-y-match") {
      try {
        const { results: matches } = await env.DB.prepare(
          "SELECT * FROM raw_matches WHERE home_goals IS NOT NULL ORDER BY match_date DESC LIMIT 5"
        ).all();

        let calculated = [];

        for (const match of matches) {
          // 1. အိမ်ရှင်ရဲ့ နောက်ဆုံး ၅ ပွဲ
          const { results: homeOverall } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.home_team, match.home_team, match.match_date).all();

          // 2. ဧည့်သည်ရဲ့ နောက်ဆုံး ၅ ပွဲ
          const { results: awayOverall } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.away_team, match.away_team, match.match_date).all();

          // 3. အိမ်ရှင်ရဲ့ အိမ်ကွင်း ၅ ပွဲ
          const { results: homeHA } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE home_team = ? AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.home_team, match.match_date).all();

          // 4. ဧည့်သည်ရဲ့ အဝေးကွင်း ၅ ပွဲ
          const { results: awayHA } = await env.DB.prepare(`
            SELECT home_goals, away_goals FROM raw_matches 
            WHERE away_team = ? AND match_date < ? AND home_goals IS NOT NULL
            ORDER BY match_date DESC LIMIT 5
          `).bind(match.away_team, match.match_date).all();

          // Y Match အတွက် ရဂိုး + ပေးဂိုး ပေါင်းမယ်
          let homeOverallGoals = homeOverall.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
          let awayOverallGoals = awayOverall.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);

          const totalYGoals = homeOverallGoals + awayOverallGoals;
          const yMatchAvg = totalYGoals / 10;
          const yMatchStatus = yMatchAvg > 2.5 ? "YES" : "NO";

          // HA Points အတွက်လည်း ရဂိုး + ပေးဂိုး ပေါင်းမယ်
          let homeHAPoints = homeHA.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
          let awayHAPoints = awayHA.reduce((sum, m) => sum + m.home_goals + m.away_goals, 0);
          
          const haCount = homeHA.length + awayHA.length;
          const haPointsAvg = haCount > 0 ? ((homeHAPoints + awayHAPoints) / haCount) : 0;

          calculated.push({
            match: `${match.home_team} vs ${match.away_team}`,
            league: match.league,
            date: match.match_date,
            y_match: yMatchStatus,
            y_avg: yMatchAvg.toFixed(2),
            ha_points: haPointsAvg.toFixed(2)
          });
        }

        return new Response(JSON.stringify({ 
          status: "success", 
          message: `Calculated ${calculated.length} matches`,
          data: calculated
        }, null, 2), { headers: { "Content-Type": "application/json" } });

      } catch (err) {
        return new Response(JSON.stringify({ 
          status: "error", 
          message: err.message 
        }, null, 2), { 
          status: 500,
          headers: { "Content-Type": "application/json" } 
        });
      }
    }
    // 5. Sync InferSports Odds (Fuzzy Match without Date)
if (url.pathname === "/sync-odds") {
  try {
    if (!env.INFER_API_KEY) {
      throw new Error("INFER_API_KEY မထည့်ရသေးပါ။");
    }

    const manualMap = {
      "Man Utd": "Man United",
      "Nott'm Forest": "Nottm Forest",
      "Sheffield Weds": "Sheffield Wednesday",
      "West Brom": "West Bromwich Albion",
      "Spurs": "Tottenham",
      "Newcastle": "Newcastle United"
    };

    const apiUrl = "https://api.infersports.dev/v1/events?sport=football&status=scheduled&limit=50";
    const apiRes = await fetch(apiUrl, {
      headers: { "Authorization": `Bearer ${env.INFER_API_KEY}` }
    });

    if (!apiRes.ok) throw new Error(`API Error: ${apiRes.status}`);

    const apiData = await apiRes.json();
    const events = apiData.data || apiData.events || [];
    
    let matchedCount = 0;
    let matchedList = [];

    for (const event of events) {
      let apiHome = event.home_team?.name || "";
      let apiAway = event.away_team?.name || "";

      // DB ထဲက CSV Data တွေကို ဆွဲမယ် (ရက်စွဲ မစစ်တော့ဘူး)
      const { results: dbMatches } = await env.DB.prepare(`
        SELECT id, league, home_team, away_team FROM raw_matches
        WHERE home_team LIKE ? AND away_team LIKE ?
      `).bind(`%${apiHome.split(' ')[0]}%`, `%${apiAway.split(' ')[0]}%`).all();

      let foundMatch = null;

      for (const dbMatch of dbMatches) {
        let mappedApiHome = manualMap[apiHome] || apiHome;
        let mappedApiAway = manualMap[apiAway] || apiAway;

        // စာလုံးအစ လောက် ကိုက်ညီရင် ယူမယ်
        const isHomeMatch = mappedApiHome.toLowerCase().includes(dbMatch.home_team.toLowerCase()) || 
                            dbMatch.home_team.toLowerCase().includes(mappedApiHome.toLowerCase());
        
        const isAwayMatch = mappedApiAway.toLowerCase().includes(dbMatch.away_team.toLowerCase()) || 
                            dbMatch.away_team.toLowerCase().includes(mappedApiAway.toLowerCase());

        if (isHomeMatch && isAwayMatch) {
          foundMatch = dbMatch;
          break;
        }
      }

      // ကိုက်ညီတဲ့ ပွဲတွေ့ရင် Odds ကို ခေါ်ပြီး Update လုပ်မယ်
      if (foundMatch) {
        const oddsUrl = `https://api.infersports.dev/v1/events/${event.id}/odds?markets=totals,asian_handicap`;
        const oddsRes = await fetch(oddsUrl, {
          headers: { "Authorization": `Bearer ${env.INFER_API_KEY}` }
        });

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

        // D1 ထဲကို Update လုပ်မယ်
        await env.DB.prepare(`
          UPDATE raw_matches SET total_line = ?, ah_line = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(totalLine, ahLine, foundMatch.id).run();

        matchedCount++;
        matchedList.push({
          db_id: foundMatch.id,
          league: foundMatch.league,
          csv_match: `${foundMatch.home_team} vs ${foundMatch.away_team}`,
          api_match: `${apiHome} vs ${apiAway}`,
          total_line: totalLine,
          ah_line: ahLine
        });
      }
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      message: `Successfully matched and updated odds for ${matchedCount} events.`,
      matched_data: matchedList
    }, null, 2), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message }, null, 2), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
}
    // 6. Alert Endpoint
    if (url.pathname === "/alert" && request.method === "POST") {
      return new Response("Alert endpoint ready", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
};
