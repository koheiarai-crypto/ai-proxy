// api/openai.js
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is missing" });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(500).json({ error: `proxy error: ${e.message || e}` });
  }
};
