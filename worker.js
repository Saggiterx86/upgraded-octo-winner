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

    // 3. CSV Sync
    if (url.pathname === "/sync-csv") {
      try {
        const leagueCode = url.searchParams.get("league") || "E0"; 
        const csvUrl = `https://www.football-data.co.uk/mmz4281/2627/${leagueCode}.csv`;
        
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error("CSV ဆွဲလို့မရပါ");
        
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

        if (idxDate === -1 || idxHome === -1) throw new Error("ကော်လံနာမည်တွေ မတွေ့ပါ");

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

        return new Response(JSON.stringify({ 
          status: "success", 
          league: leagueCode,
          total_rows: insertedCount,
          message: "Data synced to D1 successfully!"
        }), { headers: { "Content-Type": "application/json" } });

      } catch (err) {
        return new Response("Sync Error: " + err.message, { status: 500 });
      }
    }

    // 4. Alert Endpoint
    if (url.pathname === "/alert" && request.method === "POST") {
      return new Response("Alert endpoint ready", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
};
