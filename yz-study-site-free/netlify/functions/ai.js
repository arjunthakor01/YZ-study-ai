// Secure bridge between the website and a free-tier AI (Gemini) or Claude. Keys stay on the server.
const hits = new Map();
let day = { d: "", n: 0 };
const J = (statusCode, o) => ({ statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return J(405, { error: "POST only" });
  const gk = process.env.GEMINI_API_KEY, ak = process.env.ANTHROPIC_API_KEY;
  if (!gk && !ak) return J(500, { error: "Server is not configured" });
  const ip = String(event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const now = Date.now(), LIM = Number(process.env.HOURLY_LIMIT) || 20, DAILY = Number(process.env.DAILY_LIMIT) || 300;
  const today = new Date().toISOString().slice(0, 10);
  if (day.d !== today) day = { d: today, n: 0 };
  if (day.n >= DAILY) return J(429, { error: "Today's free AI limit is finished. Please come back tomorrow." });
  const recent = (hits.get(ip) || []).filter(t => now - t < 36e5);
  if (recent.length >= LIM) return J(429, { error: "Hourly limit reached. Please try again later." });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return J(400, { error: "Bad request" }); }
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-6)
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 40000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return J(400, { error: "Bad request" });
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const imgs = (Array.isArray(b.images) ? b.images : []).slice(0, 2)
    .filter(i => i && ok.includes(i.type) && typeof i.data === "string" && i.data.length < 2.5e6);
  recent.push(now); hits.set(ip, recent); day.n++;
  const last = msgs[msgs.length - 1].content, earlier = msgs.slice(0, -1);
  try {
    let text = "";
    if (gk) {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const contents = earlier.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
        .concat([{ role: "user", parts: [...imgs.map(i => ({ inlineData: { mimeType: i.type, data: i.data } })), { text: last }] }]);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": gk },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 4000 } })
      });
      const d = await r.json();
      if (!r.ok) return J(r.status === 429 ? 429 : 502, { error: r.status === 429 ? "The free AI is busy right now. Please try again in a minute." : "AI is unavailable. Please try again." });
      text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    } else {
      const m2 = earlier.concat([{ role: "user", content: imgs.length ? [...imgs.map(i => ({ type: "image", source: { type: "base64", media_type: i.type, data: i.data } })), { type: "text", text: last }] : last }]);
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": ak, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: process.env.MODEL || "claude-sonnet-5-5", max_tokens: 2000, messages: m2 })
      });
      const d = await r.json();
      if (!r.ok) return J(r.status === 429 ? 429 : 502, { error: "AI is busy. Please try again." });
      text = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    }
    if (!text) return J(502, { error: "No answer came back. Please try rephrasing." });
    return J(200, { text });
  } catch (e) { return J(502, { error: "AI is unavailable. Please try again." }); }
};
