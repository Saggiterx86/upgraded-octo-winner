const BOT_TOKEN = '8925005543:AAHTLmna7_yU7L3sFPWaEei7-FpCyny-E0s';
const APPS_URL = 'https://script.google.com/macros/s/AKfycbwSI4kwHraeeXtNXjyujo6fG4jsZ4Q7J1DBcUC-pDlPoybNUOfCJR91Men3D1XZvrJR/exec';
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default {
  async fetch(req) {
    if (req.method === 'POST') {
      const u = await req.json();
      if (u.message) await onMessage(u.message);
      else if (u.callback_query) await onCallback(u.callback_query);
    }
    return new Response('OK');
  }
};

async function onMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  if (text === '/start') {
    await send(chatId, 'Fixture HT Bot\n\nY ဖြစ်တဲ့ပွဲတွေ ကြည့်ဖို့ အောက်က button နှိပ်ပါ', [
      [{ text: '✅ Y Leagues', callback_data: 'yleagues' }]
    ]);
  }
}

async function onCallback(cb) {
  const chatId = cb.message.chat.id;
  const data = cb.data;
  await answer(cb.id);

  if (data === 'yleagues') {
    await send(chatId, 'ခဏစောင့်ပါ... Y ပွဲတွေ ရှာနေပါတယ်');
    const res = await callApi('getYFixtures', {});
    if (!res || !res.total) {
      await send(chatId, 'Y ဖြစ်တဲ့ပွဲ မရှိပါ');
      return;
    }
    const leagues = Object.keys(res.byLeague);
    const keyboard = leagues.map(lg => ([{
      text: `${lg} (${res.byLeague[lg].length})`,
      callback_data: `lg|${lg}`
    }]));
    await send(chatId, `Y ဖြစ်တဲ့ လိဂ် ${leagues.length} ခု`, keyboard);
  }
  else if (data.startsWith('lg|')) {
    const lg = data.slice(3);
    const res = await callApi('getYFixtures', {});
    const list = res.byLeague[lg] || [];
    const keyboard = list.map((f, i) => ([{
      text: `${f.Home} vs ${f.Away}`,
      callback_data: `fx|${lg}|${i}`
    }]));
    keyboard.push([{ text: '⬅️ နောက်သို့', callback_data: 'yleagues' }]);
    await send(chatId, `${lg} - Y ပွဲ ${list.length} ပွဲ`, keyboard);
  }
  else if (data.startsWith('fx|')) {
    const parts = data.split('|');
    const lg = parts[1];
    const idx = Number(parts[2]);
    const res = await callApi('getYFixtures', {});
    const f = (res.byLeague[lg] || [])[idx];
    if (!f) { await send(chatId, 'မတွေ့ပါ'); return; }
    const text =
      `📅 ${f.Date}\n` +
      `🏆 ${f.League}\n` +
      `${f.Home} vs ${f.Away}\n\n` +
      `Overall: ${f.overallPoint} (>2.5 ${f.overallPoint > 2.5 ? '✅' : '❌'})\n` +
      `HA: ${f.haPoint} (>2.5 ${f.haPoint > 2.5 ? '✅' : '❌'})\n` +
      `HT Ratio: ${f.htRatioHome} _ ${f.htRatioAway}`;
    await send(chatId, text);
  }
}

async function callApi(action, params) {
  const r = await fetch(APPS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params })
  });
  return await r.json();
}

async function send(chatId, text, keyboard) {
  const body = { chat_id: chatId, text };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answer(id) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id })
  });
}
