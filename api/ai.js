export default async function handler(req, res) {
  // 1. Block GET requests (Fixes the log issue you saw)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  // 2. Get Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server Error: Missing API Key" });

  try {
    // 3. Parse Body (Handles both string and object)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }
    }

    const { prompt } = body || {};
    if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in request body." });

    // 4. Call Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Gemini Error:", JSON.stringify(data));
        return res.status(response.status).json({ error: data.error?.message || "Gemini API Error" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json({ result: text || "No response text." });

  } catch (error) {
    console.error("Server Crash:", error);
    return res.status(500).json({ error: error.message });
  }
}