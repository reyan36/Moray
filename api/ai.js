export default async function handler(req, res) {
  // 1. Get Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing API Key" });

  // 2. Parse Body safely
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }

  const { prompt } = body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  try {
    // 3. Use Stable V1 URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    // 4. Handle Google Errors
    if (!response.ok) {
        console.error("Gemini Error:", JSON.stringify(data));
        return res.status(response.status).json({ 
            error: data.error?.message || "Gemini API Error" 
        });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json({ result: text || "No text returned" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}