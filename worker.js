export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Root Check
    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    // 2. Database Check
    if (url.pathname === "/test-db") {
      try {
        const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        return new Response(JSON.stringify({ status: "success", tables: results }, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response("Database Error: " + err.message, { status: 500 });
      }
    }

    // 3. CSV Sync (All Leagues)
if (url.pathname === "/sync-csv") {
  try {
    // ဆွဲမယ့် လိဂ်စာရင်း
    const leagues = ["E0", "E1", "D1", "F1", "SP1", "I1", "SWE", "DNK"];
    let summary = [];

    for (const leagueCode of leagues) {
      let csvUrl = "";
      
      // Extra Leagues တွေအတွက် URL ပြောင်းရမယ်
      if (["SWE", "DNK"].includes(leagueCode)) {
        csvUrl = `https://www.football-data.co.uk/new/${leagueCode}.csv`;
      } else {
        csvUrl = `https://www.football-data.co.uk/mmz4281/2627/${leagueCode}.csv`;
      }
      
      const response = await fetch(csvUrl);
      
      // တကယ်လို့ CSV မရှိရင် (Error တက်ရင်) ကျော်သွားမယ်
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

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "All leagues synced!",
      details: summary
    }, null, 2), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response("Sync Error: " + err.message, { status: 500 });
  }
}
// 4. Calculate Logic (Y Match & HA Points)
if (url.pathname === "/calc-y-match") {
  try {
    // ပွဲစဉ်တွေကို ဆွဲမယ် (မကစားရသေးတဲ့ ပွဲတွေ ဒါမှမဟုတ် ရလာဒ်မရှိသေးတဲ့ ပွဲတွေ)
    const { results: matches } = await env.DB.prepare(SELECT * FROM raw_matches WHERE home_goals IS NOT NULL ORDER BY league, match_date DESC LIMIT 5
    ).all();

    let calculated = [];

    for (const match of matches) {
      // 1. အိမ်ရှင်ရဲ့ နောက်ဆုံး ၅ ပွဲ (Overall) ကို ရှာမယ်
      const { results: homeOverall } = await env.DB.prepare(`
        SELECT home_goals, away_goals FROM raw_matches 
        WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL
        ORDER BY match_date DESC LIMIT 5
      `).bind(match.home_team, match.home_team, match.match_date).all();

      // 2. ဧည့်သည်ရဲ့ နောက်ဆုံး ၅ ပွဲ (Overall) ကို ရှာမယ်
      const { results: awayOverall } = await env.DB.prepare(`
        SELECT home_goals, away_goals FROM raw_matches 
        WHERE (home_team = ? OR away_team = ?) AND match_date < ? AND home_goals IS NOT NULL
        ORDER BY match_date DESC LIMIT 5
      `).bind(match.away_team, match.away_team, match.match_date).all();

      // 3. အိမ်ရှင်ရဲ့ အိမ်ကွင်း ၅ ပွဲ (Home Only) ကို ရှာမယ်
      const { results: homeHA } = await env.DB.prepare(`
        SELECT home_goals, away_goals FROM raw_matches 
        WHERE home_team = ? AND match_date < ? AND home_goals IS NOT NULL
        ORDER BY match_date DESC LIMIT 5
      `).bind(match.home_team, match.match_date).all();

      // 4. ဧည့်သည်ရဲ့ အဝေးကွင်း ၅ ပွဲ (Away Only) ကို ရှာမယ်
      const { results: awayHA } = await env.DB.prepare(`
        SELECT home_goals, away_goals FROM raw_matches 
        WHERE away_team = ? AND match_date < ? AND home_goals IS NOT NULL
        ORDER BY match_date DESC LIMIT 5
      `).bind(match.away_team, match.match_date).all();

      // တွက်ချက်မှု Function လေးတွေ
      const calcOverall = (arr, isHome) => arr.reduce((sum, m) => sum + (isHome ? m.home_goals : m.away_goals), 0);
      
      // အိမ်ရှင်ရဲ့ Overall ဂိုး (အိမ်ကွင်းဖြစ်ရင် home_goals, အဝေးကွင်းဖြစ်ရင် away_goals ယူမယ်)
      let homeOverallGoals = homeOverall.reduce((sum, m) => sum + (m.home_team === match.home_team ? m.home_goals : m.away_goals), 0);
      let awayOverallGoals = awayOverall.reduce((sum, m) => sum + (m.home_team === match.away_team ? m.home_goals : m.away_goals), 0);

      // Y Match ဂိုးပေါင်း (10 ပွဲစာ)
      const totalYGoals = homeOverallGoals + awayOverallGoals;
      const yMatchAvg = totalYGoals / 10;
      const yMatchStatus = yMatchAvg > 2.5 ? "YES" : "NO";

      // HA Points တွက်ချက်မှု (အိမ်ရှင် အိမ်ကွင်း + ဧည့်သည် အဝေးကွင်း)
      let homeHAPoints = homeHA.reduce((sum, m) => sum + m.home_goals, 0);
      let awayHAPoints = awayHA.reduce((sum, m) => sum + m.away_goals, 0);
      
      // တကယ်လို့ 5 ပွဲ မပြည့်သေးရင် ပျမ်းမျှ အတွက် အရေအတွက်ကို ယူမယ်
      const haCount = homeHA.length + awayHA.length;
      const haPointsAvg = haCount > 0 ? ((homeHAPoints + awayHAPoints) / haCount) : 0;

      // D1 ထဲ သိမ်းမယ်
      await env.DB.prepare(`
        INSERT INTO bot_analysis (match_id, y_match_status, ha_points, rules_hit, day_theory_hit)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(match_id) DO UPDATE SET
          y_match_status = excluded.y_match_status,
          ha_points = excluded.ha_points,
          created_at = CURRENT_TIMESTAMP
      `).bind(match.id, yMatchStatus, haPointsAvg.toFixed(2), "R0", "NONE").run();

      calculated.push({
        match: `${match.home_team} vs ${match.away_team}`,
        league: match.league,
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
    return new Response("Calc Error: " + err.message, { status: 500 });
  }
}
    // 4. Alert Endpoint
    if (url.pathname === "/alert" && request.method === "POST") {
      return new Response("Alert endpoint ready", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
};
