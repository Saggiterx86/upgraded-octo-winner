/**
 * FB2_10 — doGet + Team + Streaks + RoundStats + Y_Log
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'default';

  try {
    if (action === 'archivewrite') return fb2_out_(FB2_ARCHIVE_WRITE(e.parameter));
    if (action === 'archiveresolve') return fb2_out_(FB2_ARCHIVE_RESOLVE());
    if (action === 'archivemanual') {
      return fb2_out_(FB2_ARCHIVE_MANUAL_RESULT(e.parameter.id, e.parameter.h, e.parameter.a));
    }
    if (action === 'inferalias') return fb2_out_(getInferAliasData_());
    if (action === 'audit') return fb2_out_(getAuditData_());
    if (action === 'apiusage') return fb2_out_(getApiUsageData_());
    if (action === 'streaks') return fb2_out_(getStreaksData_(e.parameter.season));
    if (action === 'teamsearch') return fb2_out_(getTeamSearch_(e.parameter.name));
    if (action === 'team') return fb2_out_(getTeamData_(e.parameter.id, e.parameter.name, e.parameter.season));
    if (action === 'roundstats') return fb2_out_(getRoundStatsData_());
    if (action === 'ylog') return fb2_out_(getYLogData_(e.parameter.date));

    return fb2_out_(fb2_defaultAnalysis_());
  } catch (err) {
    return fb2_out_({ ok: false, err: String(err) });
  }
}

function fb2_out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function fb2_defaultAnalysis_() {
  var sh = fb2_ss_().getSheetByName(FB2_SH.ANALYSIS);
  if (!sh) return { ok: true, count: 0, matches: [] };

  var data = sh.getDataRange().getValues();
  if (data.length < 2) return { ok: true, count: 0, matches: [] };

  var matches = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;

    matches.push({
      date: String(r[0] || ''),
      league: String(r[1] || ''),
      home: String(r[2] || ''),
      away: String(r[3] || ''),
      o25: String(r[4] || ''),
      overallFair: r[5],
      haFair: r[6],
      htRatio: String(r[7] || ''),
      htStars: r[8],
      htLatest3: String(r[9] || ''),
      ownOU: String(r[10] || ''),
      ownHA: String(r[11] || ''),
      ownAH: String(r[12] || ''),
      ovOU: String(r[13] || ''),
      ovHA: String(r[14] || ''),
      ovAH: String(r[15] || ''),
      hOU: String(r[16] || ''),
      hHA: String(r[17] || ''),
      hAH: String(r[18] || ''),
      aOU: String(r[19] || ''),
      aHA: String(r[20] || ''),
      aAH: String(r[21] || ''),
      h2hOU: String(r[22] || ''),
      h2hHA: String(r[23] || ''),
      h2hAH: String(r[24] || ''),
      id: String(r[25] || ''),
      note: String(r[26] || '')
    });
  }

  return { ok: true, count: matches.length, matches: matches };
}

function getAuditData_() {
  var sh = fb2_ss_().getSheetByName(FB2_SH.AUDIT);
  if (!sh) return { ok: true, audit: {} };

  var data = sh.getDataRange().getValues();
  var out = {};
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    out[String(data[i][0])] = {
      value: data[i][1],
      note: String(data[i][2] || '')
    };
  }
  return { ok: true, updated: fb2_fmtDt_(new Date()), audit: out };
}

function getApiUsageData_() {
  return {
    ok: true,
    updated: fb2_fmtDt_(new Date()),
    today: fb2_apiDay_(),
    today_calls: fb2_apiCallsToday_(),
    last_run_calls: fb2_num_(fb2_getP_('API_LAST_RUN_CALLS', '0'), 0),
    last_remaining: fb2_num_(fb2_getP_('API_LAST_REMAINING', '0'), 0),
    last_limit: fb2_num_(fb2_getP_('API_LAST_LIMIT', '0'), 0),
    last_run_at: fb2_getP_('API_LAST_RUN_AT', ''),
    last_day: fb2_getP_('API_LAST_DAY', '')
  };
}

function getInferAliasData_() {
  var sh = fb2_ss_().getSheetByName(FB2_SH.INFER_ALIAS);
  if (!sh) return { ok: true, count: 0, aliases: {} };

  var data = sh.getDataRange().getValues();
  var aliases = {};
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][0] || '').trim();
    if (!k) continue;
    aliases[k] = String(data[i][1] || '').trim();
  }

  return { ok: true, count: Object.keys(aliases).length, aliases: aliases };
}

// ============================================================
// Y_LOG — GET
// ============================================================

function getYLogData_(dateParam) {
  var sh = fb2_ss_().getSheetByName('FB_Y_Log');
  if (!sh) return { ok: true, count: 0, rows: [] };

  var data = sh.getDataRange().getValues();
  if (data.length < 2) return { ok: true, count: 0, rows: [] };

  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];

    var dateRaw = r[0];
    var dateStr = '';
    if (dateRaw instanceof Date) {
      dateStr = fb2_fmtDt_(dateRaw);
    } else {
      dateStr = String(dateRaw || '');
    }
    if (!dateStr) continue;

    if (dateParam && dateStr.indexOf(dateParam) < 0) continue;

    rows.push({
      date: dateStr,
      fixture_id: String(r[1] || ''),
      league: String(r[2] || ''),
      home: String(r[3] || ''),
      away: String(r[4] || ''),
      ft_home: r[5],
      ft_away: r[6],
      result: String(r[7] || '')
    });
  }

  rows.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });

  return { ok: true, count: rows.length, rows: rows };
}

// ============================================================
// SEASON HELPERS
// ============================================================

function fb2_normalizeSeason_(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (/^20\d{2}$/.test(s)) {
    var y = parseInt(s, 10);
    var a = String(y).slice(2);
    var b = String(y + 1).slice(2);
    if (b.length === 1) b = '0' + b;
    return a + b;
  }
  return s;
}

function fb2_findCurrentSeason_(deduped) {
  var maxTs = 0;
  var currentSeason = '';
  for (var k = 0; k < deduped.length; k++) {
    var ts = fb2_ts_(deduped[k].timestamp);
    var s = fb2_normalizeSeason_(deduped[k].season);
    if (ts > maxTs && s) {
      maxTs = ts;
      currentSeason = s;
    }
  }
  return currentSeason;
}

// ============================================================
// STREAKS
// ============================================================

function getStreaksData_(seasonParam) {
  var cache = fb2_loadCache_();
  var deduped = fb2_dedupeRows_(cache.rows);
  var idx = fb2_buildIndex_(deduped);

  var currentSeason = fb2_normalizeSeason_(seasonParam);
  if (!currentSeason) currentSeason = fb2_findCurrentSeason_(deduped);

  var MIN_STREAK = 4;

  var teams = [];
  for (var tid in idx) {
    var list = idx[tid];
    if (!list.length) continue;

    var teamName = '';
    var teamLeague = '';
    for (var i = 0; i < deduped.length; i++) {
      var r = deduped[i];
      if (currentSeason && fb2_normalizeSeason_(r.season) !== currentSeason) continue;
      if (String(r.home_id) === String(tid)) { teamName = r.home; teamLeague = r.league_name; break; }
      if (String(r.away_id) === String(tid)) { teamName = r.away; teamLeague = r.league_name; break; }
    }

    var ovOU = [], ovAH = [], ovHA = [];
    var hOU = [], hAH = [], hHA = [];
    var aOU = [], aAH = [], aHA = [];

    for (var j = 0; j < list.length; j++) {
      var m = list[j];
      if (m.gf === null || m.ga === null) continue;
      if (currentSeason && fb2_normalizeSeason_(m.row.season) !== currentSeason) continue;

      var ahh = m.row ? m.row.ahh : '';
      var ou = fb2_ouResult_(m.gf, m.ga);
      var ah = fb2_ahResult_(m.gf, m.ga, ahh);
      var ha = fb2_haResult_(m.gf, m.ga);

      ovOU.push(ou); ovAH.push(ah); ovHA.push(ha);

      if (m.side === 'H') {
        hOU.push(ou); hAH.push(ah); hHA.push(ha);
      } else {
        aOU.push(ou); aAH.push(ah); aHA.push(ha);
      }

      if (ovOU.length >= 10) break;
    }

    var teamEntry = { id: tid, name: teamName, league: teamLeague, streaks: {} };

    var sOv = getStreaksFromSeqs_({ ou: ovOU, ah: ovAH, ha: ovHA }, MIN_STREAK);
    var sH = getStreaksFromSeqs_({ ou: hOU, ah: hAH, ha: hHA }, MIN_STREAK);
    var sA = getStreaksFromSeqs_({ ou: aOU, ah: aAH, ha: aHA }, MIN_STREAK);

    if (Object.keys(sOv).length) teamEntry.streaks.overall = sOv;
    if (Object.keys(sH).length) teamEntry.streaks.home = sH;
    if (Object.keys(sA).length) teamEntry.streaks.away = sA;

    if (Object.keys(teamEntry.streaks).length) teams.push(teamEntry);
  }

  var byLeague = {};
  for (var k = 0; k < deduped.length; k++) {
    var rr = deduped[k];
    var lid = String(rr.league_id || '');
    if (!lid) continue;
    if (currentSeason && fb2_normalizeSeason_(rr.season) !== currentSeason) continue;
    if (!byLeague[lid]) byLeague[lid] = { name: rr.league_name, rows: [] };
    byLeague[lid].rows.push(rr);
  }

  var leagues = [];
  for (var lid2 in byLeague) {
    var info = byLeague[lid2];
    info.rows.sort(function(a, b) { return fb2_ts_(a.timestamp) - fb2_ts_(b.timestamp); });

    var recent = info.rows.slice(-10).reverse();
    var lOU = [], lAH = [], lHA = [];

    for (var q = 0; q < recent.length; q++) {
      var rx = recent[q];
      if (rx.ft_home === null || rx.ft_home === '' || rx.ft_away === null || rx.ft_away === '') continue;
      lOU.push(fb2_ouResult_(rx.ft_home, rx.ft_away));
      lAH.push(fb2_ahResult_(rx.ft_home, rx.ft_away, rx.ahh));
      lHA.push(fb2_haResult_(rx.ft_home, rx.ft_away));
    }

    var lgStreak = getStreaksFromSeqs_({ ou: lOU, ah: lAH, ha: lHA }, MIN_STREAK);
    if (Object.keys(lgStreak).length) {
      leagues.push({ id: lid2, name: info.name, streaks: lgStreak });
    }
  }

  return {
    ok: true,
    updated: fb2_fmtDt_(new Date()),
    minStreak: MIN_STREAK,
    totalRows: deduped.length,
    season: currentSeason,
    teams: teams,
    leagues: leagues
  };
}

function getStreaksFromSeqs_(seqs, minN) {
  var out = {};
  var keys = ['ou', 'ah', 'ha'];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var seq = seqs[k] || [];
    if (!seq.length) continue;
    var first = seq[0];
    var cnt = 0;
    for (var j = 0; j < seq.length; j++) {
      if (seq[j] === first) cnt++;
      else break;
    }
    if (cnt >= minN) {
      out[k] = { value: first, count: cnt };
    }
  }
  return out;
}

// ============================================================
// ROUND STATS — Round အလိုက် FT (6 League)
// ============================================================

function getRoundStatsData_() {
  var cache = fb2_loadCache_();
  var deduped = fb2_dedupeRows_(cache.rows);

  var SIX_LEAGUE_IDS = [39, 40, 140, 78, 135, 61];

  var rows = [];
  for (var i = 0; i < deduped.length; i++) {
    var r = deduped[i];
    if (SIX_LEAGUE_IDS.indexOf(Number(r.league_id)) < 0) continue;
    if (r.ft_home === null || r.ft_home === '' || r.ft_away === null || r.ft_away === '') continue;
    var ts = fb2_ts_(r.timestamp);
    if (!ts) continue;
    rows.push(r);
  }

  var byKey = {};
  for (var j = 0; j < rows.length; j++) {
    var r2 = rows[j];
    var round = String(r2.round || '').trim();
    if (!round) continue;
    var key = String(r2.league_id) + '|' + round;
    if (!byKey[key]) byKey[key] = { league_id: r2.league_id, league_name: r2.league_name, round: round, rows: [] };
    byKey[key].rows.push(r2);
  }

  var leagues = [];
  var sixTotal = { ou: [], ah: [], ha: [] };

  for (var key2 in byKey) {
    var info = byKey[key2];
    info.rows.sort(function(a, b) { return fb2_ts_(a.timestamp) - fb2_ts_(b.timestamp); });

    var ouArr = [], ahArr = [], haArr = [];
    for (var q = 0; q < info.rows.length; q++) {
      var rx = info.rows[q];
      var ou = fb2_ouResult_(rx.ft_home, rx.ft_away);
      var ah = fb2_ahResult_(rx.ft_home, rx.ft_away, rx.ahh);
      var ha = fb2_haResult_(rx.ft_home, rx.ft_away);
      ouArr.push(ou || '?');
      ahArr.push(ah || '?');
      haArr.push(ha || '?');
      sixTotal.ou.push(ou || '?');
      sixTotal.ah.push(ah || '?');
      sixTotal.ha.push(ha || '?');
    }

    leagues.push({
      league_id: info.league_id,
      name: info.league_name,
      round: info.round,
      count: info.rows.length,
      ou: ouArr.join(''),
      ah: ahArr.join(''),
      ha: haArr.join('')
    });
  }

  leagues.sort(function(a, b) {
    var ai = SIX_LEAGUE_IDS.indexOf(Number(a.league_id));
    var bi = SIX_LEAGUE_IDS.indexOf(Number(b.league_id));
    return ai - bi;
  });

  return {
    ok: true,
    updated: fb2_fmtDt_(new Date()),
    six: {
      ou: sixTotal.ou.join(''),
      ah: sixTotal.ah.join(''),
      ha: sixTotal.ha.join(''),
      count: sixTotal.ou.length
    },
    leagues: leagues
  };
}

// ============================================================
// TEAM SEARCH + TEAM DATA
// ============================================================

function getTeamSearch_(name) {
  if (!name) return { ok: false, err: 'no name' };

  var key = fb2_nameKey_(name);
  var cache = fb2_loadCache_();
  var map = {};

  for (var i = 0; i < cache.rows.length; i++) {
    var r = cache.rows[i];
    if (r.home_id && r.home) {
      var k1 = fb2_nameKey_(r.home);
      if (!map[k1]) map[k1] = { id: r.home_id, name: r.home, league: r.league_name };
    }
    if (r.away_id && r.away) {
      var k2 = fb2_nameKey_(r.away);
      if (!map[k2]) map[k2] = { id: r.away_id, name: r.away, league: r.league_name };
    }
  }

  var hits = [];
  for (var k in map) {
    if (k === key || k.indexOf(key) >= 0 || key.indexOf(k) >= 0) {
      hits.push(map[k]);
    }
  }

  hits.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return { ok: true, count: hits.length, teams: hits.slice(0, 20) };
}

function getTeamData_(id, name, seasonParam) {
  id = fb2_num_(id, 0);

  var cache = fb2_loadCache_();
  var deduped = fb2_dedupeRows_(cache.rows);
  var idx = fb2_buildIndex_(deduped);

  var currentSeason = fb2_normalizeSeason_(seasonParam);
  if (!currentSeason) currentSeason = fb2_findCurrentSeason_(deduped);

  var teamId = id;
  var teamName = name || '';

  var nameMap = {};
  for (var i = 0; i < deduped.length; i++) {
    var r = deduped[i];
    if (r.home_id && r.home) {
      var k1 = fb2_nameKey_(r.home);
      if (!nameMap[k1]) nameMap[k1] = { id: r.home_id, name: r.home };
    }
    if (r.away_id && r.away) {
      var k2 = fb2_nameKey_(r.away);
      if (!nameMap[k2]) nameMap[k2] = { id: r.away_id, name: r.away };
    }
  }

  if (teamId) {
    for (var i2 = 0; i2 < deduped.length; i2++) {
      var r2 = deduped[i2];
      if (String(r2.home_id) === String(teamId)) { teamName = r2.home; break; }
      if (String(r2.away_id) === String(teamId)) { teamName = r2.away; break; }
    }
  } else if (teamName) {
    var k = fb2_nameKey_(teamName);
    if (nameMap[k]) {
      teamId = nameMap[k].id;
      teamName = nameMap[k].name;
    }
  }

  if (!teamId) return { ok: false, err: 'no team' };

  var all = idx[teamId] || [];
  if (!all.length) return { ok: false, err: 'no matches' };

  var recent = [];
  var homeL5 = [];
  var awayL5 = [];

  for (var i3 = 0; i3 < all.length; i3++) {
    var m = all[i3];
    var rec = {
      date: fb2_fmtDate_(m.row.timestamp),
      home: m.row.home,
      away: m.row.away,
      fth: m.row.ft_home,
      fta: m.row.ft_away,
      hth: m.row.ht_home,
      hta: m.row.ht_away,
      side: m.side,
      ou: fb2_ouResult_(m.gf, m.ga),
      ah: fb2_ahResult_(m.gf, m.ga, m.row.ahh),
      ha: fb2_haResult_(m.gf, m.ga)
    };
    recent.push(rec);
    if (recent.length >= 5) break;
  }

  for (var j = 0; j < all.length; j++) {
    var mj = all[j];
    if (mj.side === 'H' && homeL5.length < 5) {
      homeL5.push({
        date: fb2_fmtDate_(mj.row.timestamp),
        home: mj.row.home, away: mj.row.away,
        fth: mj.row.ft_home, fta: mj.row.ft_away,
        hth: mj.row.ht_home, hta: mj.row.ht_away,
        ou: fb2_ouResult_(mj.gf, mj.ga),
        ah: fb2_ahResult_(mj.gf, mj.ga, mj.row.ahh),
        ha: fb2_haResult_(mj.gf, mj.ga)
      });
    }
    if (mj.side === 'A' && awayL5.length < 5) {
      awayL5.push({
        date: fb2_fmtDate_(mj.row.timestamp),
        home: mj.row.home, away: mj.row.away,
        fth: mj.row.ft_home, fta: mj.row.ft_away,
        hth: mj.row.ht_home, hta: mj.row.ht_away,
        ou: fb2_ouResult_(mj.gf, mj.ga),
        ah: fb2_ahResult_(mj.gf, mj.ga, mj.row.ahh),
        ha: fb2_haResult_(mj.gf, mj.ga)
      });
    }
    if (homeL5.length >= 5 && awayL5.length >= 5) break;
  }

  var ouSeq = [], haSeq = [], ahSeq = [];
  for (var s = 0; s < all.length; s++) {
    var ms = all[s];
    if (ms.gf === null || ms.ga === null) continue;
    if (currentSeason && fb2_normalizeSeason_(ms.row.season) !== currentSeason) continue;
    ouSeq.push(fb2_ouResult_(ms.gf, ms.ga));
    haSeq.push(fb2_haResult_(ms.gf, ms.ga));
    ahSeq.push(fb2_ahResult_(ms.gf, ms.ga, ms.row ? ms.row.ahh : ''));
    if (ouSeq.length >= 10) break;
  }

  var teamLeague = '';
  for (var t2 = 0; t2 < all.length; t2++) {
    var mt = all[t2];
    if (currentSeason && fb2_normalizeSeason_(mt.row.season) !== currentSeason) continue;
    teamLeague = mt.row.league_name || '';
    break;
  }
  if (!teamLeague) teamLeague = all[0].row.league_name || '';

  return {
    ok: true,
    name: teamName,
    id: teamId,
    league: teamLeague,
    leagueId: all[0].row.league_id,
    season: currentSeason,
    streaks: {
      ou: fb2_streakFromSeq_(ouSeq, 4),
      ha: fb2_streakFromSeq_(haSeq, 4),
      ah: fb2_streakFromSeq_(ahSeq, 4)
    },
    recent: recent,
    homeL5: homeL5,
    awayL5: awayL5,
    totalMatches: all.length
  };
}

function fb2_streakFromSeq_(seq, minN) {
  if (!seq || !seq.length) return { value: '', count: 0 };
  minN = minN || 1;
  var first = seq[0];
  var cnt = 0;
  for (var i = 0; i < seq.length; i++) {
    if (seq[i] === first) cnt++;
    else break;
  }
  if (cnt < minN) return { value: '', count: 0 };
  return { value: first, count: cnt, seq: seq.join('') };
}
