export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. စမ်းသပ်ရန် လမ်းကြောင်း (Root)
    if (url.pathname === "/") {
      return new Response("Football Bot Worker is Running!", { status: 200 });
    }

    // 2. D1 Database ချိတ်ဆက်မှု စမ်းသပ်ရန်
    if (url.pathname === "/test-db") {
      try {
        const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        return new Response(JSON.stringify({
          status: "success",
          message: "Database connected!",
          tables: results
        }, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response("Database Error: " + err.message, { status: 500 });
      }
    }

    // 3. Telegram အတွက် Webhook လမ်းကြောင်း (နောက်မှ ပြင်မယ်)
    if (url.pathname === "/alert" && request.method === "POST") {
      return new Response("Alert endpoint ready", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
};
