export default async function handler(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server Configuration Error: API Key missing" });
    }

    // Parse Body
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } 
        catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }
    }
    
    if (!body || !body.prompt) {
        return res.status(400).json({ error: "Missing 'prompt'" });
    }

    const { prompt } = body;

    // FIX: Changed model to 'gemini-1.5-flash-latest' which is the current stable alias
    // If this fails, we can fallback to 'gemini-pro'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      // Determine if it's a 404 (Model not found) or something else
      return res.status(response.status).json({ error: `Gemini Error: ${response.statusText}`, details: errorText });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        return res.status(500).json({ error: "AI returned empty response" });
    }

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("CRASH REPORT:", error);
    return res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
}