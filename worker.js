export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ငါတို့လိုချင်တဲ့ လိဂ်စာရင်း (အကုန်လုံး)
    const ourLeagues = [
      'E0', 'E1', 'E2', 'E3', 'EC',  // England
      'SP1', 'SP2',                 // Spain
      'I1', 'I2',                   // Italy
      'D1', 'D2',                   // Germany
      'F1', 'F2',                   // France
      'N1',                         // Netherlands
      'P1',                         // Portugal
      'B1',                         // Belgium
      'G1',                         // Greece
      'SC0',                        // Scotland 
      'SWE', 'DNK'                  // Extra Leagues
    ];

    // 1. Root Check
    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    // 2. Sync CSV (Results & Fixtures)
    if (url.pathname === "/sync-csv") {
      try {
        let totalInserted = 0;
        let summary = [];

        for (const leagueCode of ourLeagues) {
          let csvUrl = "";
          if (["SWE", "DNK"].includes(leagueCode)) {
            csvUrl = `https://www.football-data.co.uk/new/${leagueCode}.csv`;
          } else {
            csvUrl = `https://www.football-data.co.uk/mmz4281/2627/${leagueCode}.csv`;
          }
          
          const response = await fetch(csvUrl);
          if (!response.ok) continue; 
          
          const csvText = await response.text();
          const lines = csvText.trim().split("\n");
          if (lines.length < 2) continue;

          const headers = lines[0].split(",").map(h => h.trim());
          const getIndex = (name) => headers.indexOf(name);
          
          const idxDate = getIndex("Date");
          const idxHome = getIndex("HomeTeam");
          const idxAway = getIndex("AwayTeam");
          const idxFTHG = getIndex("FTHG");
          const idxFTAG = getIndex("FTAG");

          if (idxDate === -1 || idxHome === -1) continue;

          let inserted = 0;
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
            inserted++;
          }
          summary.push({ league: leagueCode, rows: inserted });
          totalInserted += inserted;
        }

        // ပြီးရင် Fixtures.csv ကိုပါ ဆွဲထည့်မယ်
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

          if (fIdxDate !== -1 && fIdxHome !== -1) {
            let fixInserted = 0;
            for (let i = 1; i < fixLines.length; i++) {
              const row = fixLines[i].split(",");
              if (row.length < fixHeaders.length) continue;
              const div = row[fIdxDiv];
              if (!ourLeagues.includes(div)) continue;

              await env.DB.prepare(`
                INSERT INTO raw_matches (league, match_date, home_team, away_team)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(league, match_date, home_team, away_team) DO NOTHING
              `).bind(div, row[fIdxDate], row[fIdxHome], row[fIdxAway]).run();
              fixInserted++;
            }
            summary.push({ league: "FIXTURES", rows: fixInserted });
          }
        }

        return new Response(JSON.stringify({ status: "success", message: "Data synced!", details: summary }, null, 2), { 
          headers: { "Content-Type": "application/json" } 
        });

      } catch (err) {
        return new Response("Sync Error: " + err.message, { status: 500 });
      }
    }

    // 5. Sync InferSports Odds (Debug Match)
if (url.pathname === "/sync-odds") {
  try {
    if (!env.INFER_API_KEY) throw new Error("INFER_API_KEY မထည့်ရသေးပါ။");

    const apiUrl = "https://api.infersports.dev/v1/events?sport=football&status=scheduled&limit=10";
    const apiRes = await fetch(apiUrl, {
      headers: { "Authorization": `Bearer ${env.INFER_API_KEY}` }
    });

    if (!apiRes.ok) throw new Error(`API Error: ${apiRes.status}`);

    const apiData = await apiRes.json();
    const events = apiData.data || apiData.events || [];
    
    let debugList = [];

    for (const event of events) {
      let apiHome = event.home_team?.name || "";
      let apiAway = event.away_team?.name || "";

      // Database ထဲမှာ ရှာတဲ့အခါ ငါတို့လိုချင်တဲ့ လိဂ်တွေထဲကပဲ ဖြစ်ရမယ်
      const { results: dbMatches } = await env.DB.prepare(`
        SELECT id, league, home_team, away_team FROM raw_matches
        WHERE league IN ('E0', 'E1', 'E2', 'E3', 'EC', 'SP1', 'SP2', 'I1', 'I2', 'D1', 'D2', 'F1', 'F2', 'N1', 'P1', 'B1', 'G1', 'SC0', 'SWE', 'DNK')
        AND (home_team LIKE ? OR away_team LIKE ?)
      `).bind(`%${apiHome.split(' ')[0]}%`, `%${apiAway.split(' ')[0]}%`).all();

      debugList.push({
        api_match: `${apiHome} vs ${apiAway}`,
        db_candidates: dbMatches.map(m => `${m.home_team} vs ${m.away_team} (${m.league})`)
      });
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      debug_data: debugList
    }, null, 2), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message }, null, 2), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
}

    // 4. Calculate Logic (Y Match & HA Points)
    if (url.pathname === "/calc-y-match") {
      try {
        const { results: matches } = await env.DB.prepare(
          "SELECT * FROM raw_matches WHERE home_goals IS NOT NULL ORDER BY match_date DESC LIMIT 5"
        ).all();

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

          const totalYGoals = homeOverallGoals + awayOverallGoals;
          const yMatchAvg = totalYGoals / 10;
          const yMatchStatus = yMatchAvg > 2.5 ? "YES" : "NO";

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
        return new Response(JSON.stringify({ status: "error", message: err.message }, null, 2), { 
          status: 500,
          headers: { "Content-Type": "application/json" } 
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
