// api/gemini.js
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST" });
    return;
  }

  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GOOGLE_AI_STUDIO_API_KEY is missing" });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent",
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(500).json({ error: `proxy error: ${e.message || e}` });
  }
};
