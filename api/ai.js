export default async function handler(req, res) {
  // 1. Get Key
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return res.status(500).json({ error: "Server Config Error: Missing Key" });
  }

  // 2. Parse Body (The fix for 500 Error)
  // Vercel sometimes auto-parses, sometimes gives a string. This handles both.
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const { prompt } = body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    // 3. Call Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
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
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 4. Safety Check for empty responses
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error("Gemini returned empty structure", JSON.stringify(data));
      return res.status(500).json({ error: "AI returned no text" });
    }

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}